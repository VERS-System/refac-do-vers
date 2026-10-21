# Orçamento durável da Viber (etapa 4 do roadmap Viber, lote B3a).
#
# Este módulo controla a trava financeira de US$10 da Viber usando
# inteiros em milionésimos de dólar, sem float monetário. O estado vive
# em um arquivo JSON em volume persistente (env VIBER_BUDGET_PATH),
# escrito de forma atômica; gerações exigem reserva prévia gravada e o
# fechamento converte a reserva em consumo conservador com o usage real
# do provedor. Nenhum texto de conversa é persistido — somente IDs
# técnicos, valores e metadados de custo. O módulo não conhece HTTP,
# FastAPI nem a OpenAI; a integração com a rota fica no B3b.
#
# Atalho consciente (regra de shortcut do repositório): o limitador
# pressupõe um único processo/worker do ai-service. Não escalar réplicas
# ou workers sem trocar este arquivo por coordenação transacional
# compartilhada.
import json
import math
import os
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path

from src.viber import MODELO_VIBER, PAUSA_SEGUNDOS, MAX_TOKENS_SAIDA

# Versão do formato do arquivo; versões diferentes bloqueiam a geração.
VERSAO_FORMATO = 1
# Teto total em milionésimos de dólar (US$10) e tarifas por token do
# Gemini gemini-3-flash-preview (entrada US$0,50/milhão, saída
# US$3,00/milhão — plano 09-migracao-gemini). A entrada 0,5 não é
# inteira em milionésimos: arredondada para cima (1) por ser conservador
# (bloqueia antes, nunca excede); sem desconto de cache.
TETO_PADRAO_MICROS = 10_000_000
PRECO_ENTRADA_MICROS = 1
PRECO_SAIDA_MICROS = 3
# Margem técnica por reserva em milionésimos (US$0,001).
MARGEM_TECNICA_MICROS = 1_000
# Teto proposto de tokens de entrada já com base e instruções; acima
# disso a entrada é rejeitada sem truncar a base silenciosamente.
MAX_ENTRADA_TOKENS = 12_000
# Caminho padrão no container; sobrescrito pela env VIBER_BUDGET_PATH.
CAMINHO_PADRAO = "/var/lib/vers-viber/budget.json"
# Quantidade de IDs de tentativas encerradas guardadas por apresentação;
# acima disso, as mais antigas são descartadas (só IDs, nunca textos).
MAX_TENTATIVAS_GUARDADAS = 1_000

# Bloqueio de memória: falha de gravação não pode ser persistida (o disco
# está falhando), mas precisa bloquear novas gerações até a reinicialização
# e reconciliação pelo operador. Reset automático é proibido pela etapa 4.
_BLOQUEIO_MEMORIA: str | None = None


class OrcamentoError(Exception):
    """Erro genérico do domínio de orçamento."""


class OrcamentoIndisponivelError(OrcamentoError):
    """Arquivo ausente/corrompido, formato inválido ou bloqueio ativo."""


class SaldoInsuficienteError(OrcamentoError):
    """Nova reserva excederia o teto; nenhuma geração é aberta."""

    def __init__(self, faltante_micros: int):
        super().__init__(f"Saldo insuficiente; faltam {faltante_micros} micros")
        self.faltante_micros = faltante_micros


class PausaAtivaError(OrcamentoError):
    """Pausa obrigatória após a última geração ainda não expirou."""

    def __init__(self, segundos: int):
        super().__init__(f"Pausa ativa por {segundos} segundos")
        self.segundos = segundos


class TentativaRepetidaError(OrcamentoError):
    """UUID de tentativa já encerrada nesta apresentação (sem replay)."""


class ReservaExcedidaError(OrcamentoError):
    """Usage real superou a reserva; exige reconciliação do operador."""


class GravacaoFalhouError(OrcamentoError):
    """Falha ao gravar o arquivo durável de orçamento."""


@dataclass
class Orcamento:
    """Estado durável do orçamento de uma apresentação."""

    apresentacao: str
    modelo: str
    teto: int
    consumo: int = 0
    reservas: dict[str, int] = field(default_factory=dict)
    proxima_admissao: float | None = None
    tentativas_encerradas: list[str] = field(default_factory=list)
    bloqueio: str | None = None

    def para_dict(self) -> dict:
        # Serializa o estado no formato versionado do arquivo.
        return {
            "versao": VERSAO_FORMATO,
            "apresentacao": self.apresentacao,
            "modelo": self.modelo,
            "tarifas": {
                "entrada": PRECO_ENTRADA_MICROS,
                "saida": PRECO_SAIDA_MICROS,
            },
            "teto": self.teto,
            "consumo": self.consumo,
            "reservas": dict(self.reservas),
            "proxima_admissao": self.proxima_admissao,
            "tentativas_encerradas": list(self.tentativas_encerradas),
            "bloqueio": self.bloqueio,
        }


def caminho_orcamento(caminho: str | Path | None = None) -> Path:
    # Resolve o caminho do arquivo: argumento explícito, env do processo
    # ou default do container. Nunca vem de requisição HTTP.
    if caminho is not None:
        return Path(caminho)
    return Path(os.getenv("VIBER_BUDGET_PATH", CAMINHO_PADRAO))


def calcular_custo_micros(tokens_entrada: int, tokens_saida: int) -> int:
    # Custo exato em milionésimos com tarifas inteiras, sem float.
    return tokens_entrada * PRECO_ENTRADA_MICROS + tokens_saida * PRECO_SAIDA_MICROS


def calcular_reserva_micros(tokens_entrada: int) -> int:
    # Reserva conservadora: entrada contada + saída no teto inteiro +
    # margem técnica. Nunca abaixo do pior caso da geração.
    return (
        tokens_entrada * PRECO_ENTRADA_MICROS
        + MAX_TOKENS_SAIDA * PRECO_SAIDA_MICROS
        + MARGEM_TECNICA_MICROS
    )


def inicializar(
    caminho: Path | str,
    apresentacao: str | None = None,
    teto: int = TETO_PADRAO_MICROS,
) -> Orcamento:
    # Inicialização explícita do operador: cria o arquivo zerado apenas
    # se ainda não existir. Segunda inicialização falha — não existe reset
    # automático de orçamento (etapa 4). Grava já de forma durável.
    destino = Path(caminho)
    if destino.exists():
        raise OrcamentoIndisponivelError(
            "Orçamento já inicializado; reset não é automático"
        )
    orcamento = Orcamento(
        apresentacao=apresentacao or str(uuid.uuid4()),
        modelo=MODELO_VIBER,
        teto=teto,
    )
    _validar(orcamento)
    salvar(destino, orcamento)
    return orcamento


def carregar(caminho: Path | str) -> Orcamento:
    # Lê e valida o arquivo durável. Qualquer problema (ausente, lixo,
    # versão nova, inteiro negativo) bloqueia gerações em vez de criar
    # US$10 novos.
    destino = Path(caminho)
    try:
        bruto = destino.read_text(encoding="utf-8")
        dados = json.loads(bruto)
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise OrcamentoIndisponivelError("Orçamento ilegível") from exc
    orcamento = _de_dict(dados)
    _validar(orcamento)
    return orcamento


def salvar(caminho: Path | str, orcamento: Orcamento) -> None:
    # Gravação atômica e durável: arquivo temporário no mesmo diretório,
    # flush + fsync e os.replace. Falha vira GravacaoFalhouError sem
    # deixar arquivo parcial no lugar do anterior.
    destino = Path(caminho)
    _validar(orcamento)
    temporario = destino.with_name(destino.name + ".tmp")
    try:
        destino.parent.mkdir(parents=True, exist_ok=True)
        with open(temporario, "w", encoding="utf-8") as arquivo:
            arquivo.write(
                json.dumps(orcamento.para_dict(), ensure_ascii=False, indent=2)
            )
            arquivo.flush()
            os.fsync(arquivo.fileno())
        os.replace(temporario, destino)
    except OSError as exc:
        temporario.unlink(missing_ok=True)
        raise GravacaoFalhouError("Falha ao gravar o orçamento") from exc


def verificar_admissao(
    orcamento: Orcamento, tentativa_id: str, agora: float | None = None
) -> None:
    # Checagens de admissão antes de contar tokens ou gerar: bloqueio
    # (persistido ou de memória), replay de UUID encerrado e pausa ativa.
    momento = time.time() if agora is None else agora
    if _BLOQUEIO_MEMORIA is not None:
        raise OrcamentoIndisponivelError(f"Bloqueio ativo: {_BLOQUEIO_MEMORIA}")
    if orcamento.bloqueio is not None:
        raise OrcamentoIndisponivelError(f"Bloqueio ativo: {orcamento.bloqueio}")
    if tentativa_id in orcamento.tentativas_encerradas:
        raise TentativaRepetidaError("Tentativa já encerrada nesta apresentação")
    if orcamento.proxima_admissao is not None and momento < orcamento.proxima_admissao:
        restantes = orcamento.proxima_admissao - momento
        raise PausaAtivaError(math.ceil(restantes))


def reservar(orcamento: Orcamento, tentativa_id: str, tokens_entrada: int) -> int:
    # Reserva o pior caso da geração em memória; a gravação durável antes
    # de chamar o provedor é responsabilidade do chamador (rota B3b).
    if tentativa_id in orcamento.reservas:
        raise OrcamentoError("Reserva ativa duplicada para o mesmo UUID")
    valor = calcular_reserva_micros(tokens_entrada)
    comprometido = orcamento.consumo + sum(orcamento.reservas.values())
    if comprometido + valor > orcamento.teto:
        raise SaldoInsuficienteError(comprometido + valor - orcamento.teto)
    orcamento.reservas[tentativa_id] = valor
    return valor


def fechar_reserva(
    orcamento: Orcamento,
    tentativa_id: str,
    usage: tuple[int, int] | None = None,
    agora: float | None = None,
) -> None:
    # Converte a reserva em consumo após a geração. Com usage confiável,
    # cobra o custo real e libera a diferença; sem usage (falha, cancelou
    # ou resposta sem métricas), conserva a reserva inteira como despesa
    # potencial. Usage acima da reserva bloqueia novas gerações e exige
    # reconciliação. Sempre marca a pausa e registra o UUID encerrado.
    momento = time.time() if agora is None else agora
    if tentativa_id not in orcamento.reservas:
        raise OrcamentoError("Reserva inexistente para fechamento")
    reserva = orcamento.reservas.pop(tentativa_id)
    orcamento.tentativas_encerradas.append(tentativa_id)
    if len(orcamento.tentativas_encerradas) > MAX_TENTATIVAS_GUARDADAS:
        excedente = len(orcamento.tentativas_encerradas) - MAX_TENTATIVAS_GUARDADAS
        del orcamento.tentativas_encerradas[:excedente]
    orcamento.proxima_admissao = momento + PAUSA_SEGUNDOS
    if usage is None:
        orcamento.consumo += reserva
        return
    custo = calcular_custo_micros(usage[0], usage[1])
    if custo > reserva:
        orcamento.consumo += reserva
        orcamento.bloqueio = (
            "usage real superou a reserva; reconciliação do operador necessária"
        )
        raise ReservaExcedidaError("Usage superou a reserva")
    orcamento.consumo += custo


def liberar(orcamento: Orcamento, tentativa_id: str) -> None:
    # Libera reserva de geração que falhou comprovadamente antes de ser
    # enviada ao provedor; não cobra nem avança a pausa.
    if tentativa_id not in orcamento.reservas:
        raise OrcamentoError("Reserva inexistente para liberação")
    del orcamento.reservas[tentativa_id]


def marcar_bloqueio_memoria(motivo: str) -> None:
    # Registra bloqueio em memória quando a gravação durável falhou;
    # vale até o processo reiniciar, sem desbloqueio automático.
    global _BLOQUEIO_MEMORIA
    _BLOQUEIO_MEMORIA = motivo


def _de_dict(dados: object) -> Orcamento:
    # Converte o JSON lido em Orcamento, com validação estrita de tipos
    # (bool não passa por int) e dos campos mínimos do formato.
    if not isinstance(dados, dict):
        raise OrcamentoIndisponivelError("Orçamento não é um objeto")
    if dados.get("versao") != VERSAO_FORMATO:
        raise OrcamentoIndisponivelError("Versão do formato não suportada")
    tarifas = dados.get("tarifas")
    if not isinstance(tarifas, dict):
        raise OrcamentoIndisponivelError("Tarifas ausentes")
    reservas = dados.get("reservas")
    tentativas = dados.get("tentativas_encerradas")
    proxima = dados.get("proxima_admissao")
    if not isinstance(reservas, dict) or not all(
        isinstance(chave, str) and _inteiro_positivo(valor)
        for chave, valor in reservas.items()
    ):
        raise OrcamentoIndisponivelError("Reservas inválidas")
    if not isinstance(tentativas, list) or not all(
        isinstance(item, str) for item in tentativas
    ):
        raise OrcamentoIndisponivelError("Tentativas inválidas")
    if proxima is not None and not isinstance(proxima, (int, float)):
        raise OrcamentoIndisponivelError("Próxima admissão inválida")
    bloqueio = dados.get("bloqueio")
    if bloqueio is not None and not isinstance(bloqueio, str):
        raise OrcamentoIndisponivelError("Bloqueio inválido")
    orcamento = Orcamento(
        apresentacao=str(dados.get("apresentacao") or ""),
        modelo=str(dados.get("modelo") or ""),
        teto=dados.get("teto"),
        consumo=dados.get("consumo"),
        reservas={chave: int(valor) for chave, valor in reservas.items()},
        proxima_admissao=float(proxima) if proxima is not None else None,
        tentativas_encerradas=list(tentativas),
        bloqueio=bloqueio,
    )
    if not orcamento.apresentacao or not orcamento.modelo:
        raise OrcamentoIndisponivelError("Metadados ausentes")
    return orcamento


def _validar(orcamento: Orcamento) -> None:
    # Valida os invariantes numéricos e de sinal antes de gravar ou
    # admitir: inteiros de verdade, sem negativos, teto coerente.
    if not _inteiro_nao_negativo(orcamento.consumo):
        raise OrcamentoIndisponivelError("Consumo inválido")
    if not _inteiro_positivo(orcamento.teto):
        raise OrcamentoIndisponivelError("Teto inválido")
    if not orcamento.apresentacao or not orcamento.modelo:
        raise OrcamentoIndisponivelError("Metadados ausentes")
    if not all(_inteiro_positivo(valor) for valor in orcamento.reservas.values()):
        raise OrcamentoIndisponivelError("Reserva inválida")


def _inteiro_positivo(valor: object) -> bool:
    return type(valor) is int and valor > 0


def _inteiro_nao_negativo(valor: object) -> bool:
    return type(valor) is int and valor >= 0

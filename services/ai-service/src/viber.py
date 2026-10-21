# Montagem do contexto da Viber e consumo do stream do Gemini.
#
# Este módulo monta a lista de mensagens a partir da base empacotada, do
# histórico temporário e da pergunta atual, converte essas mensagens para
# o formato de entrada do Gemini (papéis user/model + system_instruction)
# e normaliza os chunks do SDK do Gemini para o contrato SSE público da
# Viber. Regras da etapa 3 do roadmap: instruções e base vêm somente do
# servidor; o histórico aceita apenas papéis user/assistant em pares
# completos, com limites de tamanho; nada de perfil, cookies ou dados de
# conta entra aqui. A rota HTTP e a autenticação interna ficam em
# src/api/viber.py; este módulo não conhece request nem headers.
from src.knowledge.carregador import BaseConhecimento

# Limites do contrato (etapa 3): pergunta única, histórico em pares e
# total de caracteres do histórico conjunto.
MAX_PERGUNTA_CHARS = 2000
MAX_HISTORICO_PARES = 3
MAX_HISTORICO_CHARS = 6000
# Limite do corpo bruto da requisição interna em bytes (32 KiB), além
# dos limites semânticos de pergunta/histórico.
LIMITE_CORPO_BYTES = 32 * 1024
# Parâmetros fixos do servidor: o cliente nunca envia modelo, tokens nem
# orçamento. Pausa obrigatória entre tentativas (etapa 4) reaparece como
# retryAfterSeconds nos eventos terminais e no header Retry-After do 429.
# Modelo do Gemini escolhido no plano 09-migracao-gemini (ID real
# devolvido por models.list; "gemini-3-flash" puro não existe).
MODELO_VIBER = "gemini-3-flash-preview"
MAX_TOKENS_SAIDA = 400
PAUSA_SEGUNDOS = 10
# Prazos da etapa 4: limite total da tentativa e prazo para o primeiro
# texto; timeout encerra a falha e conserva a reserva (sem retomar).
TEMPO_TOTAL_SEG = 45
TEMPO_TEXTO_INICIAL_SEG = 20
# Código de erro do contrato de stream Viber; não ampliar o enum global
# ApiErrorCode do núcleo (etapa 3 do roadmap).
CODIGO_ERRO_UPSTREAM = "UPSTREAM_UNAVAILABLE"
MENSAGEM_ERRO_FIXA = "Não foi possível concluir a resposta."
_PAPEIS_PERMITIDOS = ("user", "assistant")
_CAMPOS_PERMITIDOS = frozenset({"role", "content"})

# Instruções de sistema fixas do servidor; o cliente jamais as substitui.
_INSTRUCOES_BASE = (
    "Você é a Viber, assistente do projeto VERS. Responda em português, "
    "de forma direta e breve, começando pela resposta à pergunta. Não "
    "acesso dados individuais de usuários, veículos ou testes e não executo "
    "ações. Para assuntos fora do escopo, ofereça ajuda sobre o VERS. "
    "Distinga conhecimento confirmado, proposta do projeto e hipótese."
)
_INSTRUCAO_EXPLICAR = (
    " Quando solicitado, inclua ao final da resposta uma justificativa breve "
    "dos fundamentos e limites, sem apresentar raciocínio interno privado."
)


class ContextoInvalidoError(Exception):
    """Pergunta ou histórico do cliente viola o contrato de contexto."""


class SlotGeracao:
    """Slot global único de geração da Viber (1 geração por vez)."""

    def __init__(self):
        # Flag simples em vez de asyncio.Semaphore: o teste HTTP síncrono
        # do FastAPI executa cada requisição num loop próprio, e a flag
        # não fica presa a nenhum loop. A rota sempre libera o slot no
        # fim do stream ou ao devolver erro.
        self._ocupado = False

    def ocupar(self) -> bool:
        # Tenta ocupar o slot; devolve False quando já está em uso.
        if self._ocupado:
            return False
        self._ocupado = True
        return True

    def liberar(self) -> None:
        # Libera o slot; chamada idempotente para simplificar cleanup.
        self._ocupado = False


# Instância única do slot, compartilhada entre requisições do serviço.
slot_geracao = SlotGeracao()


def montar_contexto(
    pergunta: str,
    historico: list[dict],
    base: BaseConhecimento,
    explicar: bool = False,
) -> list[dict]:
    # Monta a lista final de mensagens para o modelo.
    # Por que existe: centralizar as regras de validação e limites num único
    # ponto testável antes de qualquer chamada paga. Como funciona: valida a
    # pergunta e o histórico segundo o contrato, monta a mensagem de sistema
    # com as instruções fixas + base empacotada (e o pedido de fundamentos,
    # se houver), interpola o histórico validado e finaliza com a pergunta.
    pergunta_validada = _validar_pergunta(pergunta)
    historico_validado = _validar_historico(historico)
    instrucoes = _INSTRUCOES_BASE + (_INSTRUCAO_EXPLICAR if explicar else "")
    system = {"role": "system", "content": f"{instrucoes}\n\n{base.conteudo}"}
    return [system, *historico_validado, {"role": "user", "content": pergunta_validada}]


def preparar_entrada(mensagens: list[dict]) -> tuple[str | None, list[dict]]:
    # Converte as mensagens do contrato interno para a entrada do Gemini.
    # Por que existe: isolar a conversão num único ponto, usado tanto pela
    # contagem oficial quanto pela geração — os dois precisam espelhar o
    # mesmo conteúdo para a contagem casar com o custo real. Como funciona:
    # mensagens role=system viram system_instruction (uma string, fora do
    # conteúdo); assistant vira papel "model"; user mantém "user"; cada
    # texto vira parts [{"text": ...}]. Devolve (system_instruction|None,
    # contents).
    system_parts = [m["content"] for m in mensagens if m["role"] == "system"]
    system = "\n\n".join(system_parts) if system_parts else None
    contents = []
    for mensagem in mensagens:
        if mensagem["role"] == "system":
            continue
        papel = "model" if mensagem["role"] == "assistant" else "user"
        contents.append(
            {"role": papel, "parts": [{"text": mensagem["content"]}]}
        )
    return system, contents


def _validar_pergunta(pergunta: object) -> str:
    # Valida a pergunta atual: string não vazia (após strip) e dentro do
    # teto de caracteres. Rejeita qualquer tipo não textual.
    if not isinstance(pergunta, str):
        raise ContextoInvalidoError("Pergunta deve ser texto")
    texto = pergunta.strip()
    if not texto:
        raise ContextoInvalidoError("Pergunta vazia")
    if len(texto) > MAX_PERGUNTA_CHARS:
        raise ContextoInvalidoError(
            f"Pergunta acima de {MAX_PERGUNTA_CHARS} caracteres"
        )
    return texto


def _validar_historico(historico: object) -> list[dict]:
    # Valida o histórico temporário: lista vazia ou até 3 pares completos
    # user/assistant, sem campos extras, com conteúdo não vazio e total de
    # caracteres limitado. Rejeita papéis privilegiados (system/developer)
    # para que texto do cliente nunca substitua instruções do servidor.
    if historico is None:
        return []
    if not isinstance(historico, list):
        raise ContextoInvalidoError("Histórico deve ser uma lista")
    if not historico:
        return []
    if len(historico) > MAX_HISTORICO_PARES * 2:
        raise ContextoInvalidoError(
            f"Histórico acima de {MAX_HISTORICO_PARES} pares"
        )
    if len(historico) % 2 != 0:
        raise ContextoInvalidoError("Histórico precisa de pares completos")
    total_chars = 0
    for indice, item in enumerate(historico):
        if not isinstance(item, dict):
            raise ContextoInvalidoError("Mensagem do histórico deve ser objeto")
        if set(item.keys()) != _CAMPOS_PERMITIDOS:
            raise ContextoInvalidoError("Mensagem do histórico tem campos extras")
        papel = item["role"]
        if papel not in _PAPEIS_PERMITIDOS:
            raise ContextoInvalidoError("Papel de histórico não permitido")
        esperado = _PAPEIS_PERMITIDOS[indice % 2]
        if papel != esperado:
            raise ContextoInvalidoError(
                "Histórico precisa alternar user/assistant começando em user"
            )
        conteudo = item["content"]
        if not isinstance(conteudo, str) or not conteudo.strip():
            raise ContextoInvalidoError("Conteúdo do histórico vazio")
        total_chars += len(conteudo)
    if total_chars > MAX_HISTORICO_CHARS:
        raise ContextoInvalidoError(
            f"Histórico acima de {MAX_HISTORICO_CHARS} caracteres"
        )
    return list(historico)


def normalizar_evento_sdk(chunk: object) -> list[dict]:
    # Converte um chunk bruto do SDK do Gemini no formato do contrato de
    # stream da Viber. Por que existe: isolar a interface do provedor para
    # que o resto do serviço (e os testes) não dependam do formato cru do
    # Gemini. Como funciona: um chunk pode carregar texto parcial, usage e
    # finish ao mesmo tempo — cada pedaço vira um evento da lista:
    # texto não vazio vira {"type": "delta"}; finishReason vira
    # {"type": "completed"} com "output_limit" quando MAX_TOKENS e
    # "completed" nos demais motivos (bloqueio de segurança vindo sem
    # candidato termina em EOF e vira error fixo na rota); usage de
    # usage_metadata anexa (entrada, saída) para o fechamento de orçamento
    # e nunca aparece no SSE público. Chunks sem texto e sem finish
    # devolvem lista vazia e não viram texto do bot.
    eventos: list[dict] = []
    texto = _extrair_texto(chunk)
    if texto:
        eventos.append({"type": "delta", "text": texto})
    finalizado = _extrair_final(chunk)
    if finalizado is not None:
        finish_reason = "output_limit" if finalizado == "MAX_TOKENS" else "completed"
        evento: dict = {"type": "completed", "finishReason": finish_reason}
        usage = _extrair_usage(chunk)
        if usage is not None:
            evento["usage"] = usage
        eventos.append(evento)
    return eventos


def _extrair_texto(chunk: object) -> str | None:
    # Lê o texto parcial do chunk; .text do SDK pode levantar erro para
    # partes não textuais — nesse caso o chunk é ignorado com segurança.
    try:
        texto = getattr(chunk, "text", None)
    except Exception:
        return None
    if isinstance(texto, str) and texto:
        return texto
    return None


def _extrair_final(chunk: object) -> str | None:
    # Devolve o nome do finish_reason do primeiro candidato (ex. "STOP",
    # "MAX_TOKENS") ou None quando o chunk não é terminal.
    candidatos = getattr(chunk, "candidates", None) or []
    if not candidatos:
        return None
    motivo = getattr(candidatos[0], "finish_reason", None)
    if motivo is None:
        return None
    nome = getattr(motivo, "name", None)
    if isinstance(nome, str):
        return nome
    return str(motivo).rsplit(".", 1)[-1]


def _extrair_usage(chunk: object) -> tuple[int, int] | None:
    # Extrai (entrada, saída) do usage_metadata do chunk; saída é o total
    # menos a entrada, cobrindo candidatos e thinking numa conta só.
    uso = getattr(chunk, "usage_metadata", None)
    entrada = getattr(uso, "prompt_token_count", None)
    total = getattr(uso, "total_token_count", None)
    if type(entrada) is not int or type(total) is not int:
        return None
    if entrada < 0 or total < 0:
        return None
    return (entrada, max(0, total - entrada))

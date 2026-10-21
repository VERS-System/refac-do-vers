# Montagem do contexto da Viber e consumo do stream da OpenAI.
#
# Este módulo monta a lista de mensagens a partir da base empacotada, do
# histórico temporário e da pergunta atual, e normaliza os eventos do SDK
# da OpenAI para o contrato SSE público da Viber. Regras da etapa 3 do
# roadmap: instruções e base vêm somente do servidor; o histórico aceita
# apenas papéis user/assistant em pares completos, com limites de tamanho;
# nada de perfil, cookies ou dados de conta entra aqui. A rota HTTP e a
# autenticação interna ficam em src/api/viber.py; este módulo não conhece
# request nem headers.
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
MODELO_VIBER = "gpt-5.5"
MAX_TOKENS_SAIDA = 400
ESFORCO_RACIOCINIO = "none"
PAUSA_SEGUNDOS = 10
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


class FalhaUpstreamError(Exception):
    """O provedor reportou falha (response.failed) durante o stream."""


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


def normalizar_evento_sdk(evento: object) -> dict | None:
    # Converte um evento bruto do SDK da OpenAI no formato do contrato
    # de stream da Viber. Por que existe: isolar a interface do provedor
    # para que o resto do serviço (e os testes) não dependam do formato
    # cru da OpenAI. Como funciona: verifica o tipo do evento; deltas de
    # texto viram {"type": "delta", "text": ...} (deltas vazios são
    # ignorados); response.completed vira completed normal; incomplete
    # por max_output_tokens vira completed com finishReason output_limit;
    # response.failed levanta FalhaUpstreamError para virar evento error;
    # qualquer outro tipo é ignorado e não vira texto do bot.
    tipo = getattr(evento, "type", None)
    if tipo == "response.output_text.delta":
        texto = getattr(evento, "delta", "")
        if not isinstance(texto, str) or not texto:
            return None
        return {"type": "delta", "text": texto}
    if tipo == "response.completed":
        return {"type": "completed", "finishReason": "completed"}
    if tipo == "response.incomplete":
        resposta = getattr(evento, "response", None)
        detalhes = getattr(resposta, "incomplete_details", None)
        motivo = getattr(detalhes, "reason", None)
        if motivo == "max_output_tokens":
            return {"type": "completed", "finishReason": "output_limit"}
        return {"type": "completed", "finishReason": "completed"}
    if tipo == "response.failed":
        raise FalhaUpstreamError("Provedor reportou falha no stream")
    return None

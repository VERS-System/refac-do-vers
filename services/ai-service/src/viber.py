# Montagem do contexto da Viber enviado ao modelo.
#
# Este módulo monta a lista de mensagens a partir da base empacotada, do
# histórico temporário e da pergunta atual. Regras da etapa 2/3 do roadmap:
# instruções e base vêm somente do servidor; o histórico aceita apenas
# papéis user/assistant em pares completos, com limites de tamanho; nada
# de perfil, cookies ou dados de conta entra aqui. Sem chamadas à OpenAI
# neste módulo — o consumo do SDK é responsabilidade da etapa seguinte.

from src.knowledge.carregador import BaseConhecimento

# Limites do contrato (etapa 3): pergunta única, histórico em pares e
# total de caracteres do histórico conjunto.
MAX_PERGUNTA_CHARS = 2000
MAX_HISTORICO_PARES = 3
MAX_HISTORICO_CHARS = 6000
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

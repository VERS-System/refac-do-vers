# Contagem oficial de tokens de entrada da Viber (etapa 4 do roadmap).
#
# A trava financeira exige contar a entrada com o endpoint oficial da
# OpenAI usando o mesmo modelo e o mesmo conteúdo que será enviado;
# aproximação tipo "quatro caracteres por token" é proibida como trava.
# O SDK instalado não expõe recurso de contagem, então a chamada usa o
# próprio cliente autenticado (sem retry) no endpoint /v1/tokenizer.
# Contrato do endpoint confirmado apenas em teste com resposta simulada:
# a verificação com chamada real (custo mínimo) é do programador antes
# de declarar o teto ativo; enquanto a contagem não for confiável, a
# geração é bloqueada (503) — nunca se gera "no escuro".
from src.viber import MODELO_VIBER


class ContagemIndisponivelError(Exception):
    """Contagem de tokens indisponível ou com formato não reconhecido."""


async def contar_tokens_entrada(cliente, mensagens, modelo: str = MODELO_VIBER) -> int:
    # Conta os tokens de entrada do contexto completo (instruções + base
    # + histórico + pergunta) no endpoint oficial de tokenização.
    # Por que existe: única forma permitida de dimensionar a reserva
    # financeira. Como funciona: envia model e a lista de mensagens ao
    # /v1/tokenizer; aceita a lista de tokens ou usage.total_tokens; tudo
    # mais (rede, status != 200, JSON inesperado) vira
    # ContagemIndisponivelError e a rota responde 503 sem gerar.
    try:
        resposta = await cliente.post(
            "/v1/tokenizer",
            json={"model": modelo, "input": mensagens},
        )
    except Exception as exc:
        raise ContagemIndisponivelError("Falha ao chamar a contagem") from exc
    if getattr(resposta, "status_code", None) != 200:
        raise ContagemIndisponivelError(
            f"Contagem respondeu {getattr(resposta, 'status_code', '?')}"
        )
    try:
        dados = resposta.json()
    except Exception as exc:
        raise ContagemIndisponivelError("Resposta da contagem não é JSON") from exc
    if isinstance(dados, dict):
        tokens = dados.get("tokens")
        if isinstance(tokens, list) and tokens:
            return len(tokens)
        usage = dados.get("usage")
        if isinstance(usage, dict) and type(usage.get("total_tokens")) is int:
            return usage["total_tokens"]
    raise ContagemIndisponivelError("Formato da contagem não reconhecido")

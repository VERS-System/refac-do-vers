# Contagem oficial de tokens de entrada da Viber (etapa 4 do roadmap).
#
# A trava financeira exige contar a entrada com o endpoint oficial de
# tokenização do Gemini, usando o mesmo modelo e o mesmo conteúdo que
# será enviado; aproximação tipo "quatro caracteres por token" é proibida
# como trava. O SDK google-genai expõe a chamada assíncrona
# cliente.aio.models.count_tokens(...), que devolve total_tokens.
# Descoberta na verificação real (20/10/2026): a Gemini Developer API
# recusa CountTokensConfig.system_instruction (recurso só do modo
# Enterprise Agent Platform) — a instrução de sistema entra então como
# uma mensagem de usuário antes das demais, sem config. Papéis e textos
# são os mesmos da geração; a diferença de tokenização na fronteira é de
# poucos tokens e é coberta pela margem técnica da reserva. Qualquer
# falha ou formato inesperado vira ContagemIndisponivelError e a rota
# responde 503 sem gerar — nunca se gera "no escuro".
from src.viber import MODELO_VIBER, preparar_entrada


class ContagemIndisponivelError(Exception):
    """Contagem de tokens indisponível ou com formato não reconhecido."""


async def contar_tokens_entrada(cliente, mensagens, modelo: str = MODELO_VIBER) -> int:
    # Conta os tokens de entrada do contexto completo (instruções + base
    # + histórico + pergunta) no endpoint oficial de contagem do Gemini.
    # Por que existe: única forma permitida de dimensionar a reserva
    # financeira. Como funciona: espelha a geração com preparar_entrada
    # (assistant → "model"); o system vira mensagem de usuário inicial
    # (limitação da Developer API); aceita apenas total_tokens inteiro
    # ≥ 0; rede, exceções do SDK e formato inesperado viram
    # ContagemIndisponivelError e a rota responde 503 sem gerar.
    system, contents = preparar_entrada(mensagens)
    if system:
        contents = [{"role": "user", "parts": [{"text": system}]}, *contents]
    try:
        resposta = await cliente.aio.models.count_tokens(
            model=modelo, contents=contents
        )
    except Exception as exc:
        raise ContagemIndisponivelError("Falha ao chamar a contagem") from exc
    total = getattr(resposta, "total_tokens", None)
    if type(total) is not int or total < 0:
        raise ContagemIndisponivelError("Formato da contagem não reconhecido")
    return total

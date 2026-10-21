# Contagem oficial de tokens de entrada da Viber (etapa 4 do roadmap).
#
# A trava financeira exige contar a entrada com o endpoint oficial de
# tokenização do Gemini, usando o mesmo modelo e o mesmo conteúdo que
# será enviado; aproximação tipo "quatro caracteres por token" é proibida
# como trava. O SDK google-genai expõe a chamada assíncrona
# cliente.aio.models.count_tokens(...), que devolve total_tokens. A
# verificação com chamada real foi executada pelo programador em
# 20/10/2026 (COUNT_OK no plano 09-migracao-gemini); qualquer falha ou
# formato inesperado vira ContagemIndisponivelError e a rota responde
# 503 sem gerar — nunca se gera "no escuro".
from google.genai.types import CountTokensConfig

from src.viber import MODELO_VIBER, preparar_entrada


class ContagemIndisponivelError(Exception):
    """Contagem de tokens indisponível ou com formato não reconhecido."""


async def contar_tokens_entrada(cliente, mensagens, modelo: str = MODELO_VIBER) -> int:
    # Conta os tokens de entrada do contexto completo (instruções + base
    # + histórico + pergunta) no endpoint oficial de contagem do Gemini.
    # Por que existe: única forma permitida de dimensionar a reserva
    # financeira. Como funciona: espelha a geração com preparar_entrada
    # (system_instruction separado e papéis user/model) e chama
    # count_tokens; aceita apenas total_tokens inteiro ≥ 0; rede,
    # exceções do SDK e formato inesperado viram
    # ContagemIndisponivelError e a rota responde 503 sem gerar.
    system, contents = preparar_entrada(mensagens)
    config = CountTokensConfig(system_instruction=system) if system else None
    try:
        resposta = await cliente.aio.models.count_tokens(
            model=modelo, contents=contents, config=config
        )
    except Exception as exc:
        raise ContagemIndisponivelError("Falha ao chamar a contagem") from exc
    total = getattr(resposta, "total_tokens", None)
    if type(total) is not int or total < 0:
        raise ContagemIndisponivelError("Formato da contagem não reconhecido")
    return total

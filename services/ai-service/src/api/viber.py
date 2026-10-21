# Rota interna de streaming da Viber no ai-service (etapas 3 e 4).
#
# Este módulo expõe POST /internal/v1/viber/responses, chamada apenas pelo
# backend autenticado por token compartilhado (header X-Viber-Internal-Token).
# Antes dos headers SSE, falhas viram HTTP fixo (400/401/403/409/429/503);
# depois de admitida a tentativa — com reserva de orçamento durável gravada
# — a resposta vira text/event-stream com eventos started/delta/completed/
# error. O fechamento converte a reserva em consumo com o usage real do
# provedor (sem usage, conserva a reserva inteira). Nenhum dado de usuário,
# cookie, CSRF ou perfil atravessa esta rota. O provedor é o Gemini via
# SDK google-genai (plano 09-migracao-gemini), com uma única tentativa
# por requisição (sem retry pago automático).
import asyncio
import json
import os
import secrets
import uuid

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from google import genai
from google.genai import types
from google.genai.errors import APIError
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from typing import Literal

from src.contagem import ContagemIndisponivelError, contar_tokens_entrada
from src.knowledge.carregador import (
    KNOWLEDGE_VERSION,
    BaseInvalidaError,
    carregar_base,
)
from src.orcamento import (
    MAX_ENTRADA_TOKENS,
    GravacaoFalhouError,
    Orcamento,
    OrcamentoError,
    OrcamentoIndisponivelError,
    PausaAtivaError,
    ReservaExcedidaError,
    SaldoInsuficienteError,
    TentativaRepetidaError,
    caminho_orcamento,
    carregar,
    fechar_reserva,
    liberar,
    marcar_bloqueio_memoria,
    reservar,
    salvar,
    verificar_admissao,
)
from src.viber import (
    CODIGO_ERRO_UPSTREAM,
    LIMITE_CORPO_BYTES,
    MAX_TOKENS_SAIDA,
    MENSAGEM_ERRO_FIXA,
    MODELO_VIBER,
    PAUSA_SEGUNDOS,
    TEMPO_TEXTO_INICIAL_SEG,
    TEMPO_TOTAL_SEG,
    ContextoInvalidoError,
    montar_contexto,
    normalizar_evento_sdk,
    preparar_entrada,
    slot_geracao,
)

router = APIRouter()


class ConfigIndisponivelError(Exception):
    """Configuração do serviço ausente (token interno ou chave Gemini)."""


class HistoricoItem(BaseModel):
    """Uma mensagem do histórico temporário segundo o contrato."""

    model_config = ConfigDict(extra="forbid")

    role: Literal["user", "assistant"]
    content: str = Field(min_length=1)


class PayloadViber(BaseModel):
    """Corpo da requisição interna; campos extras do cliente são rejeitados."""

    model_config = ConfigDict(extra="forbid")

    clientRequestId: uuid.UUID
    message: str = Field(min_length=1, max_length=2000)
    history: list[HistoricoItem] = Field(default_factory=list)
    explain: bool = False


def obter_token_interno() -> str | None:
    # Lê o token interno configurado no ambiente do processo; nunca de .env
    # versionado nem de corpo de requisição.
    return os.getenv("VIBER_INTERNAL_TOKEN")


def _obter_cliente():
    # Constrói o cliente do Gemini com uma única tentativa por requisição:
    # o contrato de orçamento da etapa 4 não paga tentativas silenciosas
    # (HttpRetryOptions attempts=1 equivale ao antigo max_retries=0).
    chave = os.getenv("GEMINI_API_KEY")
    if not chave:
        raise ConfigIndisponivelError("GEMINI_API_KEY ausente")
    return genai.Client(
        api_key=chave,
        http_options=types.HttpOptions(
            retry_options=types.HttpRetryOptions(attempts=1)
        ),
    )


async def _fechar_cliente(cliente) -> None:
    # Fecha o transporte assíncrono do cliente do Gemini após o uso;
    # falha de fechamento nunca interrompe o stream do cliente.
    fechar = getattr(getattr(cliente, "aio", None), "close", None)
    if fechar is None:
        return
    try:
        await fechar()
    except Exception:
        pass


def _formatar_evento_sse(nome: str, dados: dict) -> str:
    # Serializa um evento no formato SSE do contrato: nome fixo + data JSON.
    return f"event: {nome}\ndata: {json.dumps(dados, ensure_ascii=False)}\n\n"


def _fechar_com_seguranca(
    orcamento: Orcamento,
    caminho,
    tentativa_id: str,
    usage: tuple[int, int] | None,
) -> None:
    # Fecha a reserva e persiste o estado; falhas nunca quebram o stream
    # que o cliente já está recebendo, mas bloqueiam gerações futuras.
    try:
        fechar_reserva(orcamento, tentativa_id, usage=usage)
    except ReservaExcedidaError:
        # Usage superou a reserva: o bloqueio já está marcado no objeto;
        # a tentativa atual foi entregue, as próximas exigem operador.
        pass
    except OrcamentoError:
        # Estado inesperado da reserva; preserva o stream do cliente.
        return
    try:
        salvar(caminho, orcamento)
    except GravacaoFalhouError:
        marcar_bloqueio_memoria("falha ao gravar o fechamento da reserva")


async def _abortar_stream(stream) -> None:
    # Aborta o stream upstream quando a tentativa encerra por timeout ou
    # desconexão; o provedor pararia de gerar mesmo sem consumir a UI.
    fechar = getattr(stream, "close", None)
    if fechar is None:
        return
    try:
        await fechar()
    except Exception:
        pass


async def _gerar_sse(
    stream, tentativa_id: str, orcamento: Orcamento, caminho, cliente
):
    # Consome o stream do provedor e emite os eventos do contrato sob os
    # prazos da etapa 4. Por que existe: orquestrar textos incrementais,
    # fechamento financeiro e timeouts num único gerador testável. Como
    # funciona: envia started; espera o primeiro texto em 20s e o total
    # em 45s; cada chunk do Gemini pode render um ou mais eventos
    # (delta/completed) via normalizar_evento_sdk; qualquer falha, EOF
    # sem terminal ou timeout vira evento error fixo; a reserva é fechada
    # com usage quando houver e conservada integralmente nos demais casos;
    # desconexão do cliente também fecha a reserva no finally; o cliente
    # do SDK é fechado no fim em todos os caminhos.
    fechado = False
    try:
        yield _formatar_evento_sse(
            "started",
            {
                "clientRequestId": tentativa_id,
                "knowledgeVersion": KNOWLEDGE_VERSION,
            },
        )
        async with asyncio.timeout(TEMPO_TOTAL_SEG):
            iterator = stream.__aiter__()
            primeiro_texto = False
            terminal_enviado = False
            while True:
                try:
                    if primeiro_texto:
                        chunk = await iterator.__anext__()
                    else:
                        chunk = await asyncio.wait_for(
                            iterator.__anext__(), TEMPO_TEXTO_INICIAL_SEG
                        )
                except StopAsyncIteration:
                    break
                for normalizado in normalizar_evento_sdk(chunk):
                    if normalizado["type"] == "delta":
                        primeiro_texto = True
                        yield _formatar_evento_sse(
                            "delta",
                            {
                                "clientRequestId": tentativa_id,
                                "text": normalizado["text"],
                            },
                        )
                    elif normalizado["type"] == "completed":
                        terminal_enviado = True
                        _fechar_com_seguranca(
                            orcamento,
                            caminho,
                            tentativa_id,
                            normalizado.get("usage"),
                        )
                        fechado = True
                        yield _formatar_evento_sse(
                            "completed",
                            {
                                "clientRequestId": tentativa_id,
                                "finishReason": normalizado["finishReason"],
                                "retryAfterSeconds": PAUSA_SEGUNDOS,
                            },
                        )
            if not terminal_enviado:
                _fechar_com_seguranca(orcamento, caminho, tentativa_id, None)
                fechado = True
                yield _formatar_evento_sse(
                    "error",
                    {
                        "clientRequestId": tentativa_id,
                        "code": CODIGO_ERRO_UPSTREAM,
                        "message": MENSAGEM_ERRO_FIXA,
                        "retryAfterSeconds": PAUSA_SEGUNDOS,
                    },
                )
    except Exception:
        # Qualquer falha do provedor no meio do stream (APIError do
        # Gemini, timeout, EOF inesperado) vira o evento error fixo sem
        # vazar detalhe técnico ao cliente público.
        if not fechado:
            _fechar_com_seguranca(orcamento, caminho, tentativa_id, None)
            fechado = True
            yield _formatar_evento_sse(
                "error",
                {
                    "clientRequestId": tentativa_id,
                    "code": CODIGO_ERRO_UPSTREAM,
                    "message": MENSAGEM_ERRO_FIXA,
                    "retryAfterSeconds": PAUSA_SEGUNDOS,
                },
            )
    finally:
        if not fechado:
            # Cancelamento/desconexão depois do envio: sem usage final
            # confiável, a reserva inteira vira despesa potencial.
            _fechar_com_seguranca(orcamento, caminho, tentativa_id, None)
        await _abortar_stream(stream)
        await _fechar_cliente(cliente)
        slot_geracao.liberar()


@router.post("/internal/v1/viber/responses")
async def respostas_viber(request: Request):
    # Endpoint interno de geração streaming da Viber.
    # Por que existe: único ponto de entrada do backend para o modelo,
    # com autenticação entre serviços, contrato SSE próprio e trava
    # financeira da etapa 4. Como funciona: valida token, corpo e
    # contexto; ocupa o slot; carrega o orçamento durável e verifica
    # bloqueio/replay/pausa; conta a entrada no endpoint oficial; grava
    # a reserva antes de abrir geração; emite o stream; fecha a reserva
    # com usage real ou conservador.
    token_configurado = obter_token_interno()
    if not token_configurado:
        raise HTTPException(503, "Recurso indisponível")
    token_recebido = request.headers.get("X-Viber-Internal-Token")
    if not token_recebido:
        raise HTTPException(401, "Token interno ausente")
    if not secrets.compare_digest(token_recebido, token_configurado):
        raise HTTPException(403, "Token interno inválido")
    corpo = await request.body()
    if len(corpo) > LIMITE_CORPO_BYTES:
        raise HTTPException(400, "Corpo da requisição acima do limite")
    try:
        payload = PayloadViber.model_validate_json(corpo)
    except ValidationError as exc:
        raise HTTPException(400, "Payload inválido") from exc
    try:
        base = carregar_base()
    except BaseInvalidaError as exc:
        raise HTTPException(503, "Recurso indisponível") from exc
    try:
        mensagens = montar_contexto(
            pergunta=payload.message,
            historico=[item.model_dump() for item in payload.history],
            base=base,
            explicar=payload.explain,
        )
    except ContextoInvalidoError as exc:
        raise HTTPException(400, "Payload inválido") from exc
    if not slot_geracao.ocupar():
        raise HTTPException(
            429,
            "Geração em andamento",
            headers={"Retry-After": str(PAUSA_SEGUNDOS)},
        )
    caminho = caminho_orcamento()
    tentativa_id = str(payload.clientRequestId)
    cliente = None
    try:
        try:
            orcamento = carregar(caminho)
        except OrcamentoIndisponivelError as exc:
            raise HTTPException(503, "Recurso indisponível") from exc
        try:
            verificar_admissao(orcamento, tentativa_id)
        except PausaAtivaError as exc:
            raise HTTPException(
                429,
                "Pausa ativa",
                headers={"Retry-After": str(exc.segundos)},
            ) from exc
        except TentativaRepetidaError as exc:
            raise HTTPException(409, "Tentativa já encerrada") from exc
        except OrcamentoIndisponivelError as exc:
            raise HTTPException(503, "Recurso indisponível") from exc
        try:
            cliente = _obter_cliente()
        except ConfigIndisponivelError as exc:
            raise HTTPException(503, "Recurso indisponível") from exc
        try:
            tokens_entrada = await contar_tokens_entrada(cliente, mensagens)
        except ContagemIndisponivelError as exc:
            raise HTTPException(503, "Recurso indisponível") from exc
        if tokens_entrada > MAX_ENTRADA_TOKENS:
            raise HTTPException(400, "Entrada acima do limite de tokens")
        try:
            reservar(orcamento, tentativa_id, tokens_entrada)
            salvar(caminho, orcamento)
        except SaldoInsuficienteError as exc:
            raise HTTPException(503, "Recurso indisponível") from exc
        except GravacaoFalhouError as exc:
            marcar_bloqueio_memoria("falha ao gravar a reserva")
            raise HTTPException(503, "Recurso indisponível") from exc
        # Entrada espelhada para o Gemini: system_instruction separado e
        # papéis user/model, idênticos ao que a contagem oficial mediu.
        system, contents = preparar_entrada(mensagens)
        try:
            stream = await cliente.aio.models.generate_content_stream(
                model=MODELO_VIBER,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    max_output_tokens=MAX_TOKENS_SAIDA,
                    thinking_config=types.ThinkingConfig(thinking_budget=0),
                ),
            )
        except (ConfigIndisponivelError, APIError) as exc:
            # Falha comprovada antes de enviar geração: libera a reserva.
            try:
                liberar(orcamento, tentativa_id)
                salvar(caminho, orcamento)
            except (OrcamentoError, GravacaoFalhouError):
                marcar_bloqueio_memoria("falha ao liberar a reserva")
            raise HTTPException(503, "Não foi possível concluir a resposta.") from exc
        except Exception:
            try:
                liberar(orcamento, tentativa_id)
                salvar(caminho, orcamento)
            except (OrcamentoError, GravacaoFalhouError):
                marcar_bloqueio_memoria("falha ao liberar a reserva")
            raise
    except HTTPException:
        if cliente is not None:
            await _fechar_cliente(cliente)
        slot_geracao.liberar()
        raise
    return StreamingResponse(
        _gerar_sse(stream, tentativa_id, orcamento, caminho, cliente),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-store"},
    )

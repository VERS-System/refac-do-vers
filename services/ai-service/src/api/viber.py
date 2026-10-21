# Rota interna de streaming da Viber no ai-service (etapa 3 do roadmap).
#
# Este módulo expõe POST /internal/v1/viber/responses, chamada apenas pelo
# backend autenticado por token compartilhado (header X-Viber-Internal-Token).
# Antes dos headers SSE, falhas viram HTTP fixo (400/401/403/429/503); depois
# de admitida a tentativa, a resposta vira text/event-stream com eventos
# started/delta/completed/error normalizados em src/viber.py. Nenhum dado de
# usuário, cookie, CSRF ou perfil atravessa esta rota.
import json
import os
import secrets
import uuid

import openai
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from typing import Literal

from src.knowledge.carregador import (
    KNOWLEDGE_VERSION,
    BaseInvalidaError,
    carregar_base,
)
from src.viber import (
    CODIGO_ERRO_UPSTREAM,
    ESFORCO_RACIOCINIO,
    LIMITE_CORPO_BYTES,
    MAX_TOKENS_SAIDA,
    MENSAGEM_ERRO_FIXA,
    MODELO_VIBER,
    PAUSA_SEGUNDOS,
    ContextoInvalidoError,
    FalhaUpstreamError,
    montar_contexto,
    normalizar_evento_sdk,
    slot_geracao,
)

router = APIRouter()


class ConfigIndisponivelError(Exception):
    """Configuração do serviço ausente (token interno ou chave OpenAI)."""


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


def _obter_cliente() -> AsyncOpenAI:
    # Constrói o cliente da OpenAI com retry automático desativado: o
    # contrato de orçamento da etapa 4 não paga tentativas silenciosas.
    chave = os.getenv("OPENAI_API_KEY")
    if not chave:
        raise ConfigIndisponivelError("OPENAI_API_KEY ausente")
    return AsyncOpenAI(api_key=chave, max_retries=0)


def _formatar_evento_sse(nome: str, dados: dict) -> str:
    # Serializa um evento no formato SSE do contrato: nome fixo + data JSON.
    return f"event: {nome}\ndata: {json.dumps(dados, ensure_ascii=False)}\n\n"


async def _gerar_sse(stream, client_request_id: str):
    # Consome o stream do provedor e emite os eventos do contrato.
    # Por que existe: separar o ciclo de vida do slot e o mapeamento de
    # falhas do corpo da rota. Como funciona: envia started; para cada
    # evento normalizado emite delta ou completed; falha do provedor ou
    # EOF sem terminal viram evento error fixo; o slot é liberado sempre
    # no fim, inclusive quando o cliente desconecta.
    terminal_enviado = False
    try:
        yield _formatar_evento_sse(
            "started",
            {
                "clientRequestId": client_request_id,
                "knowledgeVersion": KNOWLEDGE_VERSION,
            },
        )
        async for evento in stream:
            normalizado = normalizar_evento_sdk(evento)
            if normalizado is None:
                continue
            if normalizado["type"] == "delta":
                yield _formatar_evento_sse(
                    "delta",
                    {
                        "clientRequestId": client_request_id,
                        "text": normalizado["text"],
                    },
                )
            elif normalizado["type"] == "completed":
                terminal_enviado = True
                yield _formatar_evento_sse(
                    "completed",
                    {
                        "clientRequestId": client_request_id,
                        "finishReason": normalizado["finishReason"],
                        "retryAfterSeconds": PAUSA_SEGUNDOS,
                    },
                )
        if not terminal_enviado:
            yield _formatar_evento_sse(
                "error",
                {
                    "clientRequestId": client_request_id,
                    "code": CODIGO_ERRO_UPSTREAM,
                    "message": MENSAGEM_ERRO_FIXA,
                    "retryAfterSeconds": PAUSA_SEGUNDOS,
                },
            )
    except (FalhaUpstreamError, openai.OpenAIError):
        yield _formatar_evento_sse(
            "error",
            {
                "clientRequestId": client_request_id,
                "code": CODIGO_ERRO_UPSTREAM,
                "message": MENSAGEM_ERRO_FIXA,
                "retryAfterSeconds": PAUSA_SEGUNDOS,
            },
        )
    finally:
        slot_geracao.liberar()


@router.post("/internal/v1/viber/responses")
async def respostas_viber(request: Request):
    # Endpoint interno de geração streaming da Viber.
    # Por que existe: único ponto de entrada do backend para o modelo,
    # com autenticação entre serviços e contrato SSE próprio. Como
    # funciona: valida token, corpo e contexto (erros antes dos headers
    # viram HTTP fixo); ocupa o slot global (429 se ocupado); abre o
    # stream com parâmetros fixos do servidor; devolve text/event-stream.
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
    try:
        cliente = _obter_cliente()
        stream = await cliente.responses.create(
            model=MODELO_VIBER,
            input=mensagens,
            stream=True,
            store=False,
            max_output_tokens=MAX_TOKENS_SAIDA,
            reasoning={"effort": ESFORCO_RACIOCINIO},
        )
    except (ConfigIndisponivelError, openai.OpenAIError) as exc:
        slot_geracao.liberar()
        raise HTTPException(503, "Não foi possível concluir a resposta.") from exc
    except Exception:
        slot_geracao.liberar()
        raise
    return StreamingResponse(
        _gerar_sse(stream, str(payload.clientRequestId)),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-store"},
    )

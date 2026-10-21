# 09 — Migração do provedor da Viber: OpenAI → Gemini

Plano aprovado pelo programador em 20/10/2026 (regras 8 e 11 de `.AIs/AGENTS.MD`).

## Contexto

A chave disponível para o programador é do Google, não da OpenAI (a tentativa
com `OPENAI_API_KEY` retornou 401 `invalid_api_key`). Decisão do programador:

- **Provedor**: Google Gemini via SDK oficial `google-genai` (2.32.0).
- **Modelo**: `gemini-3-flash-preview` (o ID real retornado por
  `models.list` para a chave; `gemini-3-flash` puro não existe).
- **Verificação prévia executada com sucesso** pelo programador
  (`/v1/tokenizer`-equivalente substituído por `countTokens`):
  - `count_tokens` OK (12 tokens no trecho de teste);
  - geração com `thinking_budget=0` aceita e executada com
    `thoughts_token_count=None` (thinking realmente desligado);
  - usage de entrada: `prompt_token_count`; total: `total_token_count`.

O contrato SSE com o Electron (etapa 3), a aritmética de orçamento em
milionésimos (etapa 4), o slot único de geração e o teto US$10 **não mudam**.

## Tarifas (milionésimos de dólar, inteiros — regra de conservadorismo)

| Item | Preço real (por 1M) | Usado no código | Motivo |
|---|---|---|---|
| Entrada | US$ 0,50 | `PRECO_ENTRADA_MICROS = 1` | 0,5 não é inteiro → arredonda para cima (trava antes de exceder) |
| Saída | US$ 3,00 | `PRECO_SAIDA_MICROS = 3` | já inteiro; cobre thinking + candidatos |

Teto inalterado: `LIMITE_TOTAL_MICROS = 10_000_000` (US$ 10).
Reserva padrão = entrada×1 + 400×3 + margem 1.000 = **2.300 micros**.

## Escopo por arquivo

### Código (services/ai-service)

- `src/viber.py`
  - `MODELO_VIBER = "gemini-3-flash-preview"`; remover `ESFORCO_RACIOCINIO`.
  - Nova função `preparar_entrada(mensagens) -> (system_instruction, contents)`:
    mensagens `role=system` viram `system_instruction`; demais viram
    `{"role": "user"|"model", "parts": [{"text": ...}]}` (assistant → `model`).
    Única fonte de conversão, usada por contagem **e** geração (espelhamento
    obrigatório para a contagem casar com o custo real).
  - `normalizar_evento_sdk(chunk) -> list[dict]`: um chunk do Gemini pode
    carregar texto **e** finish/usage juntos; retorna lista com eventos
    `delta` (texto não vazio de `chunk.text`, protegido por try/except) e
    `completed` (finish de `candidates[0].finish_reason`: `STOP` →
    `completed`, `MAX_TOKENS` → `output_limit`; usage de
    `usage_metadata`: entrada=`prompt_token_count`,
    saída=`max(0, total_token_count - prompt_token_count)` — conservador,
    cobre thinking+candidatos).
- `src/contagem.py`
  - Troca `cliente.post("/v1/tokenizer")` por
    `await cliente.aio.models.count_tokens(model=MODELO_VIBER, contents=..., config=CountTokensConfig(system_instruction=...))`
    usando `preparar_entrada`; continua convertendo qualquer falha em
    `ContagemIndisponivelError`.
- `src/api/viber.py`
  - `_obter_cliente`: `genai.Client(api_key=os.getenv("GEMINI_API_KEY"),
    http_options=HttpOptions(retry_options=HttpRetryOptions(attempts=1)))`
    — `attempts=1` é o equivalente a `max_retries=0` (nenhuma repetição
    automática, regra de orçamento). Chave ausente → `ConfigIndisponivelError`.
  - Abertura do stream: `await cliente.aio.models.generate_content_stream(...)`
    com `GenerateContentConfig(system_instruction=..., max_output_tokens=400,
    thinking_config=ThinkingConfig(thinking_budget=0))`.
  - Erro da API **antes** do primeiro evento → libera reserva → 503 (pós-409
    e pós-429 preservados; falha vira `APIError` do google.genai ou
    exceção genérica — captura ampla após nossas exceções).
  - Loop consome a lista devolvida por `normalizar_evento_sdk` (delta e/ou
    completed por chunk); falha no meio do stream → evento `error`
    `UPSTREAM_UNAVAILABLE`; fim do iterador **sem** evento terminal → `error`.
  - Fechamento do cliente (`close` síncrono/assíncrono do SDK) preservado.
- `src/orcamento.py`: apenas constantes `PRECO_ENTRADA_MICROS = 1`,
  `PRECO_SAIDA_MICROS = 3` (fórmulas idênticas). `MODELO_VIBER` entra sozinho
  no campo `modelo` do JSON na inicialização.
- `src/orcamento_cli.py`: sem mudança funcional (usa `MODELO_VIBER`).

### Infra/configuração

- `requirements.txt`: remover `openai>=1.66.0`; adicionar `google-genai>=2.32.0`.
- `.env.example`: trocar `OPENAI_API_KEY` por `GEMINI_API_KEY`
  (`VIBER_INTERNAL_TOKEN` e `VIBER_BUDGET_PATH` ficam).
- `docker-compose.yml`: env `OPENAI_API_KEY` → `GEMINI_API_KEY: ${GEMINI_API_KEY:-}`.
- Não mexer em `.env` real (regra 2); programador adiciona
  `GEMINI_API_KEY` nos seus `.env` (raiz p/ compose e `ai-service/.env`).

### Documentos

- Este plano (`.AIs/docs/plans/viber-roadmap/09-migracao-gemini.md`).
- Addendum datado em `01-escopo-e-decisoes.md` (providor/modelo/tarifas novos).
- Registro em `.AIs/docs/contexts/Context_20_10_2026.md`.
- `04-orcamento-e-limites.md` §9 ganha nota cruzada p/ §10 deste plano.

## Testes (TDD — RED primeiro, fakes viram Gemini)

- `tests/test_viber.py`: fakes de rota `_evento_sdk(...)` → `_chunk(texto=...,
  usage=..., finish=...)`; fakes de cliente passam a expor
  `cliente.aio.models.generate_content_stream/count_tokens` e `close`;
  teste de "sem retry automático" migra para captura de kwargs de
  `genai.Client` (patch em `src.api.viber.genai.Client`) verificando
  `HttpRetryOptions(attempts=1)`; asserções de modelo/kwargs de geração
  atualizadas (`gemini-3-flash-preview`, thinking 0, `max_output_tokens=400`,
  `system_instruction`, papéis `user`/`model`).
- `tests/test_viber_orcamento.py`: mock de contagem migra de
  `cliente.post` para `cliente.aio.models.count_tokens` (retorno com
  `total_tokens`); asserções de custo com tarifas novas (ver tabela);
  casca de `APIError` do google.genai nos testes de erro pós-abertura e
  pré-abertura (ou exceção genérica equivalente).
- `tests/test_orcamento.py`: constantes de contrato (5/30 → 1/3) e valores
  calculados de referência atualizados (ex.: custo 2000+200 → 2.600;
  reserva 100 tokens → 2.300).
- Base B1 (contexto/conhecimento) e regras de 400/401/403/409/429/503
  **inalteradas**.

## Critérios de aceite

1. `python -m unittest discover -s tests` verde (base 106 + ajustes).
2. Nenhuma importação `openai` restante em código/testes.
3. `git diff --check` limpo; comentários em português; zero segredos.
4. Programador executa verificação real ao vivo (contagem → stream SSE
   de verdade) antes de o teto US$10 ser declarado ativo.
5. Commits feitos pelo programador (regra 7).

## Riscos e pendências

- `gemini-3-flash-preview` é pré-lançamento: pode mudar de preço ou sumir;
  troca é a constante `MODELO_VIBER` + tarifas.
- `docker-compose.yml` tem cache de imagem antiga (openai): `docker compose up -d --build`
  após aprovação do lote.
- `budget.json` eventual já criado com `modelo: "gpt-5.5"`: recriar via CLI.
- Contagem vs custo real podem divergir (tokenização); a margem de 1.000
  micros e o fechamento com usage real cobrem a diferença.

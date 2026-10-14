<!-- Plano executável, em lotes revisáveis, da fundação REST do backend VERS. -->

# Fase 03 do backend — plano executável de APIs e rotas

## Objetivo e estado

**Estado em 26/09/2026: concluída, com revisão aprovada pelo programador.** Os lotes executados estão registrados no
[plano de correções](backend-f03-correcoes-lote-a-lote-26-09-2026.md). A Fase 02 entregou o schema e a primeira
migration. Esta fase prepara o backend NestJS para receber autenticação e
recursos de domínio: bootstrap consistente, roteamento `/api/v1`, entrada
validada, respostas e erros uniformes, correlação, logs seguros e health checks.
Cada lote deve produzir uma mudança pequena, revisável e comprovada por testes.
Nenhum lote deste plano implementa cadastro, login, CRUD de veículos, ciclo de
testes, MQTT, WebSocket ou IA. Esses fluxos pertencem às fases 04–08.

## Baseline a conferir antes do lote 01

- `AppModule` registra `ConfigModule`, `ThrottlerModule` e `PrismaModule`, sem
  módulos de negócio; `PrismaService` conecta no início e desconecta no fim.
- `main.ts` já configura Helmet, CORS, `ValidationPipe` com allowlist, prefixo
  configurável e shutdown hooks. O padrão atual do prefixo é `api`, enquanto
  o contrato público usa `/api/v1`.
- Há scaffolds de filters, interceptors, DTOs, guards e controllers antigos.
  A existência do arquivo não comprova compatibilidade com o OpenAPI 3.1.
- A Fase 02 registrou 23 testes unitários aprovados, lint e build. Reexecutar
  baseline local com dependências sintéticas antes de mudar código; registrar
  falhas preexistentes sem mascará-las.
- `.AIs/docs/Api/endpoints.md`, `.AIs/docs/Api/openapi.yaml` e
  `packages/shared-types` são os contratos públicos. Consultar também o
  [dicionário de dados](backend-schema-phase-2-data-dictionary.md), sem expor
  tipos Prisma nas respostas.

## Regras de execução

1. Um lote de cada vez. Antes de editar, informar arquivos e mudança; o
   programador revisa a entrega. A IA não cria commits.
2. Planejar testes de comportamento antes da implementação, comprovar a falha
   inicial e implementar o mínimo. Executar `pnpm --filter @vers/backend
   test:unit` em todo lote de código; lint e build nos marcos indicados. Testes
   que apenas procuram texto em arquivos não bastam.
3. Fixtures e dependências dos testes são sintéticas. Não ler `.env`, não usar
   banco compartilhado nem serviços externos sem autorização específica.
4. Registrar decisões de operação antes de aplicá-las. Em especial, não fixar
   por conta própria domínios de cookies, política `SameSite`, mecanismo CSRF,
   limites de rate limit em produção, exigência de Redis para prontidão ou
   destino/retenção de logs.
5. Rotas temporárias só podem existir em harness de teste. Não publicar
   endpoints de domínio vazios, mocks de sucesso ou schemas Prisma.
6. Cada lote termina com diff revisável, evidência de testes e atualização do
   contexto diário. A conclusão da fase exige lint, build, documentação e
   critérios de saída abaixo.

## Lotes

| Lote | Estado | Entrega revisável | Evidência mínima |
| --- | --- | --- | --- |
| 01 — Baseline da API | Concluído | Inventário dos scaffolds, rotas registradas, configuração e comandos; matriz contrato × implementação. | `test:unit`, lint e build atuais; relatório de falhas e decisões abertas. |
| 02 — Bootstrap e prefixo | Concluído | Configuração testável de `/api/v1`, ordem de middleware e módulos; nenhuma rota de negócio ligada antes de estar pronta. | Testes de inicialização/roteamento e configuração inválida; `test:unit`, lint, build. |
| 03 — Entrada e paginação | Concluído | `ValidationPipe`, DTOs base para UUID, datas UTC, filtros e paginação com allowlist e limites dos contratos. | Testes HTTP de campo extra, valor inválido, bordas e transformação; `test:unit`. |
| 04 — Envelope e catálogo de erros | Concluído | Resposta `data`/`meta`/`requestId`, erro `error`/`requestId`/`timestamp` e mapeamento estável sem stack trace. | Testes HTTP de sucesso, validação, 404 e falha inesperada; `test:unit`, lint, build. |
| 05 — Correlação e logs | Concluído | Request ID único, propagação à resposta e logs estruturados com redaction; política para ID de entrada não confiável. | Testes de correlação, concorrência e ausência de segredo/payload pessoal; `test:unit`. |
| 06 — Limites HTTP e CORS | Concluído | Consolidar Helmet, CORS allowlist com credenciais e throttling existentes; tratamento consistente de 429. | Testes de origem permitida/negada, headers, preflight e limite; `test:unit`, lint, build. |
| 07 — Auditoria mínima | Concluído | Interface e política allowlist para eventos auditáveis; integração persistente somente onde houver ação de domínio real. | Testes de redaction, evento permitido e falha de persistência sem vazar dados; `test:unit`. |
| 08 — Liveness e readiness | Concluído | `/health/live` e `/health/ready`, probe de banco com timeout, política documentada para Redis e shutdown idempotente. | Testes de processo vivo, banco indisponível/recuperado, timeout e encerramento; `test:unit`, lint, build. |
| 09 — Contrato e entrega | Concluído | Conferência OpenAPI × rotas efetivas, exemplos sintéticos, documentação operacional e contexto; remover alegações de rotas ainda não implementadas. | `test:unit`, lint, build, testes HTTP de integração sem Neon e diff de contrato revisado. |

### 01 — Baseline da API

Inventariar `main.ts`, `AppModule`, `prisma`, `config`, `common` e módulos
antigos. Para cada controller/scaffold, marcar ausente, parcial ou utilizável;
apontar divergências em prefixo, envelope, erros, autenticação e documentação.
Registrar comandos e resultados em documento curto do lote. Nenhuma alteração
funcional. Saída: lista objetiva de arquivos a reaproveitar e de decisões
pendentes; o lote 02 pode começar sem presumir que scaffolds estejam prontos.

### 02 — Bootstrap e prefixo

Escrever primeiro testes do caminho `/api/v1` e de inicialização com mocks,
incluindo rejeição de configuração inválida. Implementar prefixo/versionamento
coerente com o contrato, sem duplicar `/api` nos controllers. Preservar módulos
de negócio fora do `AppModule` até seus testes e contratos estarem prontos.
Saída: app inicializa e a única base pública versionada é `/api/v1`; mudança
de prefixo é explícita em configuração e documentação.

### 03 — Entrada e paginação

Testar chamadas HTTP no harness com propriedades extras, UUIDs inválidos,
datas não UTC, intervalo invertido, páginas zero/negativas e `pageSize` acima
do limite contratado. Reutilizar DTOs comuns sem antecipar regras de domínio.
Definir defaults e máximo de paginação exatamente conforme tipos/OpenAPI;
divergência entre fontes é decisão a resolver antes da implementação. Saída:
entradas desconhecidas rejeitadas, validação retorna detalhe seguro e
paginação não permite consulta sem limite.

### 04 — Envelope e catálogo de erros

Testar o JSON público contra tipos compartilhados: sucesso, lista vazia,
paginação, 400, 404, 409, 429 e 500. Distinguir erro de validação, HTTP
conhecido e falha inesperada; log interno não vira resposta. Evitar embrulhar
duas vezes respostas já no formato público e não alterar status HTTP.
Mapear apenas códigos documentados, sem prometer semântica de domínio ainda
não implementada. Saída: `requestId` em toda resposta e erro sem stack trace,
cookie, token ou SQL.

### 05 — Correlação e logs

Definir geração e escopo do request ID por requisição. Se aceitar header de
entrada, validar tamanho e caracteres antes de reutilizá-lo; registrar a
política. Produzir logs estruturados de método, rota normalizada, status,
duração e ID, sem corpo, query sensível, cookies, autorização, placa ou email.
Testar requisições paralelas para não misturar IDs. Saída: o mesmo ID aparece
em resposta e log, inclusive nos erros.

### 06 — Limites HTTP e CORS

Revisar código existente antes de adicionar providers. Testar origens da
allowlist, preflight com credenciais, headers de segurança e 429 no mesmo
formato de erro. Registrar limites efetivos de desenvolvimento e decidir os de
produção com o programador. A política CSRF vinculada a cookies depende dos
domínios finais e deve estar definida antes de habilitar mutações autenticadas
na Fase 04; esta fase pode preparar o ponto de integração e testes de contrato.
Saída: superfície HTTP consistente sem configuração permissiva implícita.

### 07 — Auditoria mínima

Definir ações, resultados e IDs permitidos conforme `AuditEvent`; não guardar
payload, credenciais ou metadados livres. Testar a transformação de eventos
sem ligar um interceptor que grave toda requisição indiscriminadamente. A
persistência auditável de cadastro, login, veículo e testes pertence aos lotes
de domínio correspondentes. Saída: política e componente reutilizável testado,
sem alegar auditoria completa antes desses fluxos.

### 08 — Liveness e readiness

Testar `live` sem conexão a dependências e `ready` com probe de banco que
expira; registrar resposta degradada e recuperação. Decidir com o programador
se Redis é obrigatório para o processo REST neste estágio; se não for, sua
falha não pode derrubar readiness por engano. Health checks não devem revelar
URL, host, credenciais ou detalhes internos. Confirmar shutdown idempotente
com Prisma e servidor HTTP. Saída: vida e prontidão têm semânticas diferentes,
testadas em falha e recuperação.

### 09 — Contrato e entrega

Conferir endpoints efetivamente registrados contra `.AIs/docs/Api/openapi.yaml`
e `.AIs/docs/Api/endpoints.md`. Estes documentos podem especificar rotas
futuras; marcar o estado de implementação sem apagar contratos aprovados.
Executar validação final, registrar comandos/resultados, riscos e decisões no
contexto diário. Saída: base REST pronta para receber autenticação da Fase 04,
sem depender de regras de domínio ainda ausentes.

## Dependências e decisões de escopo

```text
F02 concluída → 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → F04
```

Os lotes 03–05 podem compartilhar harness de teste, mas permanecem entregas
separadas. O lote 06 exige decisão sobre cookies/CSRF antes de ativar qualquer
mutação autenticada; o 08 exige decisão sobre dependências de readiness. Essas
decisões são operacionais e pertencem ao programador. Preparar evidência e
opções técnicas sem escolher por ele.

## Critério de conclusão da Fase 03

- `/api/v1` e health checks respondem conforme contratos da fase, com entrada
  validada, envelope e catálogo de erros testados em HTTP.
- Correlação, logs, CORS, headers, rate limit e política de auditoria têm testes
  de casos normais e adversos; respostas e logs não expõem segredos.
- Liveness e readiness distinguem processo vivo de dependência indisponível.
- `pnpm --filter @vers/backend test:unit`, lint e build passam; testes HTTP
  relevantes passam sem Neon nem serviços externos.
- Documentação registra o que está efetivamente implementado, decisões
  operacionais, limitações e próximos passos da Fase 04.

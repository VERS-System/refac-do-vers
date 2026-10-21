<!-- Planeja o módulo NestJS exclusivo da Viber e seu encaminhamento autenticado ao FastAPI. -->
# Etapa 5 — integração no backend

## 1. Responsabilidade

Gabriel implementa o módulo próprio da Viber e seus testes. A outra frente
continua dona da integração do núcleo com o Electron. Conexões no módulo raiz,
configuração e documentação pública são combinadas antes do merge.

O backend garante identidade e validação, encaminha a pergunta e devolve o
stream. Não monta contexto de carro e não faz cálculo de telemetria para a IA.

## 2. Arquivos candidatos

| Novo/alterado | Caminho e escopo |
| --- | --- |
| Novo | `services/backend/src/modules/viber/viber.module.ts`: módulo isolado. |
| Novo | `services/backend/src/modules/viber/viber.controller.ts`: POST público protegido. |
| Novo | `services/backend/src/modules/viber/viber.dto.ts`: corpo e histórico limitados. |
| Novo | `services/backend/src/modules/viber/viber.service.ts`: cliente do ai-service e ciclo do stream. |
| Novos | `*.spec.ts` no mesmo módulo, conforme convenção atual. |
| Novo se necessário | `viber.config.ts` no módulo: validação de configuração específica. |
| Alteração coordenada | `services/backend/src/app.module.ts`: importar módulo uma vez. |
| Alteração coordenada | `services/backend/.env.example`: configuração documentada sem valores reais. |
| Alteração coordenada | `.AIs/docs/Api/openapi.yaml` e `endpoints.md`: rota e exceção SSE. |

Não alterar Prisma, migrations, cálculos, APIs de dados ou enums globais para
o chat. Preferir validação de configuração local ao módulo, deixando a Viber
desabilitada por padrão para não exigir segredos novos de toda a equipe.

## 3. Sessão e fronteira de acesso

1. Proteger a rota com `JwtAuthGuard` e padrão de roles já usado nos controllers.
2. Não exigir ADMIN: usuário autenticado e autorizado pelo estado da sessão basta.
3. Manter o `CsrfGuard` global e o Origin atual do main Electron.
4. A identidade vem do guard, nunca de `userId` enviado pelo cliente.
5. Chamadas sem autenticação/CSRF não podem alcançar o ai-service.
6. O ai-service recebe somente corpo técnico validado e credencial interna.
7. Não criar login próprio da Viber nem repassar o JWT ao Python.

A autenticação pode ler o banco existente para validar conta/sessão. Isso não
contradiz a proibição de usar dados individuais como contexto da IA. Não retirar
checagens de sessão para afirmar “zero acesso ao banco” no sentido literal.

## 4. Encaminhamento do stream

- Construir URL a partir de configuração do servidor, com caminho fixo.
- Validar host/esquema para a rede local do serviço; sem URLs no payload e
  sem redirecionamentos. A rota não é proxy HTTP genérico.
- Usar `fetch`/streams disponíveis no runtime do backend antes de adicionar
  cliente HTTP novo. Confirmar a versão efetiva do Node no ensaio.
- Validar status e tipo de conteúdo upstream antes de abrir headers públicos.
- Traduzir apenas eventos Viber conhecidos ou transportar framing validado;
  nunca devolver token de serviço ou erro bruto.
- Impor limite de bytes e abortar se upstream violar contrato/tamanho.
- Respeitar backpressure de `response.write`; não acumular saída sem limite
  caso o cliente pare de ler.
- Desconexão do cliente encerra upstream; retirar listeners/timers no finally.
- Não repetir POST depois de timeout, 401 tardio ou queda da conexão.

## 5. Interceptadores e filtros atuais

O backend aplica envelope REST global e filtro de exceções. SSE não pode virar
`{ data: stream }` e erros após `headersSent` não podem tentar enviar novo JSON.

Proposta mínima: usar resposta HTTP controlada **somente neste controller**,
mantendo validação e guards normais. Fazer validações/admissão antes de abrir
headers; depois, tratar falhas dentro do ciclo do stream e terminar a conexão.
Testar o caminho pelo bootstrap real e provar que o interceptor não serializa
o SSE. Não modificar globalmente filtros/interceptors para acomodar uma rota.

Se a implementação escolhida demonstrar que precisa de adaptação global,
registrar a evidência e alinhar com a outra frente antes de editar. Não usar
`@Sse()` por hábito se isso transformar a operação em GET sem CSRF apropriado.

Logs atuais já evitam corpos e credenciais. Conservar esse comportamento.
Metadados úteis: requestId, estado terminal, duração e código seguro.
Não registrar pergunta, histórico, resposta, headers privados ou perfil.

## 6. Configuração proposta

| Nome | Serviço | Finalidade |
| --- | --- | --- |
| `VIBER_ENABLED` | Backend | Padrão false; rota indisponível sem derrubar núcleo. |
| `VIBER_AI_URL` | Backend | Endpoint base do ai-service definido pelo operador. |
| `VIBER_INTERNAL_TOKEN` | Backend e ai-service | Credencial exclusiva entre serviços. |
| `OPENAI_API_KEY` | Somente ai-service | Credencial do provedor. |
| `OPENAI_MODEL` | ai-service | Exigir gpt-5.5 para esta apresentação. |
| `VIBER_BUDGET_PATH` | ai-service | Caminho fixo dentro do volume de orçamento. |

Teto, saída e pausa podem começar como constantes documentadas no módulo;
não criar dezenas de opções. Se forem configuráveis, validar intervalos e
impedir aumento automático do teto autorizado por variável permissiva.

## 7. Infraestrutura local

O Compose principal já tem ai-service e usa `docker/Dockerfile.ai`.
Fazer um único patch combinado para:

1. Passar URL interna/token ao backend e configuração mínima ao ai-service.
2. Montar volume persistente do orçamento.
3. Empacotar `src/knowledge/vers.md`, já dentro da pasta `src` copiada na imagem.
4. Rodar ai-service com um processo/worker, requisito do registro local.
5. Remover credenciais de banco do ambiente do ai-service nesta execução.
   Hoje ele herda `.env` no Compose: retirar essa herança do serviço de IA e
   fornecer somente as variáveis necessárias, sem ler ou editar o arquivo real.
6. Não publicar o ai-service na rede externa. Preferir acesso somente pela rede
   Docker; se precisar de diagnóstico no host, vincular a porta a loopback.
7. Se backend estiver no host em vez do container, documentar URL alternativa
   de loopback e testar essa topologia separadamente.

Não criar segundo serviço de IA duplicado nem reconstruir serviços de medições
sem necessidade. Rebuildar somente alvos alterados e reaplicar a composição
após conferir que não fará leitura de `.env` por ferramentas do agente.

## 8. TDD e critérios de saída

- [ ] 401/403/400 não chegam ao cliente interno.
- [ ] USER autorizado consegue gerar; ADMIN não é obrigatório.
- [ ] Nenhum serviço de veículos/testes/telemetria é injetado ou chamado.
- [ ] Token interno não sai para o cliente nem aparece em logs.
- [ ] SSE não recebe envelope JSON global.
- [ ] Recusas de pausa/orçamento têm mensagem e status seguros.
- [ ] Cancelamento e timeout encerram upstream sem replay.
- [ ] EOF sem terminal e erro pós-headers não acionam escrita JSON duplicada.
- [ ] Viber desabilitada não impede boot, login ou operações do núcleo.

Rodar `npm run test:unit`, `npm run lint` e `npm run build` no backend.
Depois provar stream real passando pelo bootstrap usado na bancada.
Commit sugerido: `feat: expor Viber autenticada pelo backend`.

## 9. Execução em lotes (decisões aprovadas em 20/10/2026)

| Lote | Escopo | Situação |
| --- | --- | --- |
| C1 | Config Joi (`VIBER_ENABLED` padrão **false**, `VIBER_AI_URL`/`VIBER_INTERNAL_TOKEN` exigidas só ao habilitar) + `.env.example`; módulo `src/modules/viber/` (module/dto/controller/service) com `JwtAuthGuard`+`RolesGuard` sem ADMIN; DTO do contrato da etapa 3; rota 503 quando desabilitada; specs TDD. | Aprovado e concluído. |
| C2 | `fetch` do Node ao ai-service, parser/encaminhamento SSE validado, resposta crua `@Res()` somente neste controller, mapeamento seguro de status upstream, abort na desconexão, pós-headers sem JSON novo; specs com upstream falso. | Pendente. |
| C3 | Patch único do Compose (env do backend) + docs (`openapi.yaml`, `endpoints.md`); linhas prontas das três variáveis para o programador habilitar na bancada. | Pendente. |

Decisões do programador: lote C1 aprovado em separado (não C1+C2 juntos) e
habilitar em dev com `VIBER_ENABLED=false` por padrão — o `.env` real é
preenchido pelo programador apenas quando for testar o fluxo completo (C3).

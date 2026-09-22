<!-- Plano da primeira entrega da Fase 1 dos contratos de API do backend VERS. -->

# Fase 1 — Contratos iniciais da API

## Objetivo

Definir contratos estáveis e compartilhados para autenticação, perfil do usuário
e veículos antes de alterar o banco de dados ou implementar controllers NestJS.
O recorte deve permitir que mobile e dashboard desenvolvam integrações com
fixtures tipadas enquanto a persistência ainda não existe.

## Escopo

- padronizar envelopes de sucesso, erro e paginação;
- definir códigos de erro estáveis para os fluxos deste recorte;
- definir requests e responses de cadastro, login, renovação e logout;
- definir o perfil autenticado e sua atualização;
- definir listagem, cadastro, consulta e atualização de veículos;
- publicar fixtures sintéticas, sem dados pessoais reais;
- documentar rotas em formato humano e OpenAPI 3.1;
- validar os contratos com testes de compilação TypeScript.

## Fora do escopo

- controllers, services, guards ou persistência NestJS;
- alteração do schema Prisma ou criação de migration;
- login Google, recuperação de senha e administração de usuários;
- armazenamento de CPF, CRLV, RENAVAM ou arquivos de documentos;
- integração ou consulta automática aos sistemas do DETRAN;
- instalações VERS, testes experimentais, telemetria, MQTT e WebSocket.

## Arquivos previstos

- `packages/shared-types/src/api.ts`;
- `packages/shared-types/src/auth.ts`;
- `packages/shared-types/src/users.ts`;
- `packages/shared-types/src/vehicles.ts`;
- `packages/shared-types/src/fixtures.ts`;
- `packages/shared-types/src/index.ts`;
- `packages/shared-types/test/contracts.type-test.ts`;
- `packages/shared-types/tsconfig.test.json`;
- `packages/shared-types/package.json`;
- `.AIs/docs/Api/endpoints.md`;
- `.AIs/docs/Api/openapi.yaml`;
- `.AIs/docs/contexts/Context_21_09_2026.md`.

## Sequência TDD

1. Criar testes de compilação importando os contratos planejados.
2. Executar `test:unit` e confirmar a falha por símbolos inexistentes.
3. Implementar o menor conjunto de tipos e fixtures que satisfaça os testes.
4. Documentar os mesmos contratos em `endpoints.md` e `openapi.yaml`.
5. Executar `test:unit`, lint e build do pacote compartilhado.
6. Executar os testes, lint e build do backend sem implementar endpoints.

## Entregas sugeridas em pequenos commits

Os commits abaixo serão realizados pelo programador. A IA deve manter os lotes
separados conceitualmente, validar cada um e informar os arquivos correspondentes.

### Commit 1 — Planejamento da Fase 1

- adicionar este plano;
- registrar escopo, limites, decisões e critérios de conclusão.

### Commit 2 — Infraestrutura de testes dos contratos

- adicionar `test:unit`, lint e build ao pacote compartilhado;
- criar a configuração TypeScript exclusiva dos testes;
- adicionar os testes de compilação e registrar a falha inicial esperada.

### Commit 3 — Envelopes comuns da API

- implementar sucesso, erro, detalhes de erro e paginação;
- exportar os novos contratos pelo ponto de entrada do pacote;
- validar o lote com os testes de compilação.

### Commit 4 — Autenticação e perfil

- implementar requests e responses de autenticação;
- implementar perfil, papéis e status de usuário;
- adicionar fixtures sintéticas correspondentes.

### Commit 5 — Veículos

- implementar contratos de listagem, cadastro e atualização;
- adicionar fixtures sintéticas de veículo e paginação.

### Commit 6 — Documentação dos endpoints

- preencher `.AIs/docs/Api/endpoints.md`;
- adicionar a especificação `.AIs/docs/Api/openapi.yaml`;
- conferir manualmente a equivalência entre documentação e tipos.

### Commit 7 — Registro e validação da entrega

- executar testes, lint e build aplicáveis;
- registrar resultados e pendências no contexto diário.

## Decisões

- todos os campos JSON usam inglês e `camelCase`;
- datas trafegam como strings ISO 8601 em UTC;
- IDs são strings opacas no contrato e serão UUIDs na persistência;
- access e refresh tokens trafegam somente em cookies `HttpOnly` e nunca são
  expostos no JSON ou ao JavaScript;
- cookies de autenticação usam `Secure` fora do desenvolvimento local e a API
  de produção aceita autenticação somente por HTTPS;
- refresh e logout recebem a sessão pelos cookies e não aceitam tokens no body;
- a API usa `/api/v1` e um envelope uniforme com `requestId`;
- documentos pessoais não fazem parte deste contrato;
- a placa é obrigatória e normalizada no cadastro, torna-se imutável depois e
  deve ser única; para trocar a placa, o usuário cadastra outro veículo;
- uma futura validação no DETRAN depende de viabilidade técnica, burocrática,
  financeira e jurídica e não condiciona este contrato;
- `USER` é o papel global padrão da conta; o cadastro de veículo cria um vínculo
  `UserVehicle` com FKs para usuário e veículo e relacionamento `OWNER`;
- o primeiro veículo da conta é principal; promover outro remove o principal
  anterior atomicamente;
- o último veículo da conta pode ser desvinculado; outras contas vinculadas
  mantêm o veículo, e o registro físico só é removido quando não restar
  nenhum vínculo; testes e telemetria permanecem com snapshot sem placa;
- ao excluir o principal, o único veículo restante é promovido automaticamente;
  com múltiplos candidatos, o usuário informa o `replacementVehicleId`;
- clientes dependem dos contratos compartilhados, não dos tipos gerados pelo
  Prisma.

## Critério de conclusão

- testes de contrato falham antes e passam após a implementação;
- tipos públicos são exportados por `@vers/shared-types`;
- fixtures compilam contra os próprios contratos;
- documentação humana e OpenAPI descrevem o mesmo recorte;
- nenhuma funcionalidade ou migration é criada antecipadamente.

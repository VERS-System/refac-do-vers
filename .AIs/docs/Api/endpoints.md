<!-- Contrato humano das APIs iniciais de autenticação, perfil e veículos do VERS. -->

# Contratos REST iniciais — VERS

## Convenções

- Base URL: `/api/v1`.
- Produção aceita autenticação somente por HTTPS.
- Datas usam ISO 8601 em UTC.
- Campos JSON usam inglês e `camelCase`.
- Entradas seguem allowlist; campos extras são rejeitados.
- Respostas incluem `requestId` para correlação.
- Nenhuma resposta contém senha, access token ou refresh token.

**Estado em 13/10/2026:** health, auth, perfil, veículos, leituras de instalações/configurações,
planejamento/ciclo de testes e criação/consultas próprias de suporte estão registrados
no backend (F05 lotes 1–7). Telemetria, resumos e comparação permanecem contratos futuros.

As operações da fundação incluem `GET /users/me`, `PATCH /users/me`, `GET /health/live`, `GET /health/ready`,
`GET /auth/csrf`, `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`,
`POST /auth/logout` e `POST /auth/logout-all`.

Conferência final da F05 em 13/10/2026, após pull do mobile: 32 operações
contratadas, 28 implementadas (2 health, 6 auth e 20 de domínio). As quatro
consultas futuras são telemetria por teste, resumos por instalação/teste e
comparação. Metadados dos controllers compilados conferidos com status de
sucesso e Origin/CSRF nas mutações de domínio; referências OpenAPI válidas.
Backend: 378 testes, lint/build aprovados; shared-types: testes de contrato,
lint/build aprovados. Essa evidência usa banco simulado, sem ensaio SQL real.

### Auditoria mínima de autenticação

As cinco mutações de auth tentam persistir `auth.register`, `auth.login`,
`auth.refresh`, `auth.logout` e `auth.logout-all`, com resultado SUCCESS/FAILURE
e requestId. Não são copiados entrada, saída, senha, email, cookies ou tokens.
Neste incremento actorId/resourceId ficam nulos. Cadastro novo e duplicado
mantêm o mesmo evento de sucesso. GET csrf não gera evento.

Por decisão do programador em 05/10/2026, falha de auditoria não bloqueia auth
nem desfaz revogação. Gera log `audit_persistence_failed` com ação/requestId,
sem causa interna. Não há retentativa ou garantia de entrega se o banco falhar.
Recusas nos guards (CSRF e rate limit global) não passam pelo interceptor;
validação de DTO e falhas do controller/service geram FAILURE. Nos handlers que
finalizam a resposta 202/204 diretamente, a gravação pode terminar após o envio.

## Health checks

| Método | Rota | Acesso | Resultado |
| --- | --- | --- | --- |
| `GET` | `/health/live` | Público | Confirma que o processo HTTP está vivo, sem consultar banco, Redis ou serviços externos. |
| `GET` | `/health/ready` | Público | Confirma que PostgreSQL e Redis estão disponíveis. |

`ready` exige PostgreSQL e Redis por decisão do programador em 26/09/2026. Falhas de dependência
retornam `SERVICE_UNAVAILABLE` sem expor URL, host, credenciais ou detalhes
internos.

### Autenticação por cookies

Access e refresh tokens são JWT próprios emitidos apenas por `Set-Cookie`.
Ambos usam `HttpOnly` e, em produção, `Secure`; portanto, não ficam disponíveis
ao JavaScript. O access token autentica recursos protegidos. O refresh token é
aceito apenas na renovação e no encerramento da sessão.

Clientes devem enviar credenciais/cookies nas requisições. CORS aceitará
credenciais somente das origens permitidas. Cookies usam `SameSite=Lax`;
mutações exigem `Origin` permitido e token CSRF em cookie e header. A integração
de clientes nativos depende da definição de `Origin`.

## Envelopes

Sucesso:

```json
{
  "data": {},
  "requestId": "request-001"
}
```

Lista paginada:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 0,
    "totalPages": 0
  },
  "requestId": "request-001"
}
```

Erro:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Não foi possível processar a solicitação.",
    "details": []
  },
  "requestId": "request-001",
  "timestamp": "2026-09-21T12:00:00.000Z"
}
```

## Autenticação

| Método | Rota | Acesso | Resultado |
| --- | --- | --- | --- |
| `GET` | `/auth/csrf` | Público | Emite token CSRF e cookie vinculado para mutações. |
| `POST` | `/auth/register` | Público | Aceita o cadastro sem iniciar sessão; responde igual para email novo ou já cadastrado. |
| `POST` | `/auth/login` | Público | Inicia a sessão e retorna o perfil. |
| `POST` | `/auth/refresh` | Refresh cookie | Rotaciona a sessão; body vazio. |
| `POST` | `/auth/logout` | Refresh cookie | Revoga a sessão atual e limpa os cookies; body vazio. |
| `POST` | `/auth/logout-all` | Access cookie | Revoga todas as sessões do usuário e limpa os cookies atuais. |

`GET /auth/csrf` retorna `data.csrfToken` e define o cookie de vínculo. O
cliente envia o token em `X-CSRF-Token` nas mutações; o backend valida também
`Origin`. O token CSRF não é um token de autenticação. Access JWT dura 15
minutos e refresh JWT sete dias, com chaves distintas configuráveis. O access
cookie usa `Path=/` e o refresh cookie usa `Path=/api/v1/auth`. Cookies
de auth são `HttpOnly`, host-only e `SameSite=Lax`; `Secure` é obrigatório sob
HTTPS. Domínios finais de produção seguem pendentes.
Após o login, o cliente deve chamar novamente `GET /auth/csrf`: o novo token
fica vinculado ao cookie de sessão. O token obtido antes do login deixa de
servir para mutações autenticadas.
Após `POST /auth/refresh`, o cliente também deve renovar o token CSRF antes
da próxima mutação, pois os cookies de sessão foram trocados.

Os cookies de autenticação se chamam `vers_access` e `vers_refresh`.
Logout valida o refresh JWT e seu hash antes de revogar a sessão e seus
sucessores. Repetir a chamada com o mesmo refresh ainda não expirado responde
`204`; cookie ausente, token inválido/expirado ou sessão alheia responde `401`.
Logout-all exige access JWT de conta ativa e sessão não revogada, e encerra as
sessões dessa conta, incluindo sucessores de rotações concorrentes. Um novo
login iniciado em paralelo não pertence necessariamente a esse conjunto.
Ambas as rotas exigem Origin/CSRF e respondem `204` sem corpo, expirando
os cookies com os mesmos paths e atributos da emissão. Falha de persistência
não confirma logout nem emite cookies de limpeza. A verificação de revogação
nas futuras rotas protegidas será ligada pelos guards do lote 07.

### Cadastro

```json
{
  "email": "ana@example.com",
  "password": "Senha@123",
  "displayName": "Ana Silva"
}
```

A senha deve possuir no mínimo oito caracteres, uma letra maiúscula, um
caractere especial e nenhum espaço. A resposta é `202` sem corpo e sem cookies
de sessão, tanto para email novo quanto para email já cadastrado. Uma conta
nova permanece `PENDING_VERIFICATION` e não pode fazer login nem acessar rotas
autenticadas; a ativação será
definida em fase futura. Nenhum email pode ser inferido pela resposta pública.

### Login

```json
{
  "email": "ana@example.com",
  "password": "Senha@123"
}
```

Credenciais inválidas usam uma mensagem genérica e não confirmam se o email
existe.
Contas `PENDING_VERIFICATION` ou `BLOCKED` também não recebem sessão e usam
erro público genérico. Após 8 senhas erradas, o login espera 15 minutos;
após mais 4, espera 1 hora; após mais 2, bloqueia por 24 horas e libera
automaticamente. Um login correto zera a contagem. Durante a espera, a API
retorna `429`; se Redis estiver indisponível, retorna `503` sem iniciar sessão.

## Perfil

### Proteção preparada na F04 — lote 07

O `AuthModule` exporta `JwtAuthGuard`, `RolesGuard` e `ResourceAccessService`
para as futuras rotas de domínio. Aplicar `@UseGuards(JwtAuthGuard, RolesGuard)`
explicitamente; `@Roles('ADMIN')` exige papel global atual do banco e
`@CurrentUser()` fornece apenas `id`, `sessionId` e `roles` internos.
`@Public()` dispensa ambos os guards onde houver exceção pública explícita.
A composição de estratégia e guards usa a integração documentada de
[Passport no NestJS](https://docs.nestjs.com/recipes/passport).

O guard aceita exclusivamente um `vers_access` com assinatura HS256, tipo
access, UUIDs e expiração. A cada requisição verifica sessão persistida não
revogada, não substituída e não expirada, além de conta `ACTIVE`. Refresh,
bearer, query e claims de papel não concedem acesso. Falhas de autenticação
retornam `401` com `AUTH_UNAUTHORIZED`; papel insuficiente retorna `403` com
esse mesmo código existente. Os controllers de teste não são publicados.

Veículos e instalações exigem vínculo da conta, inclusive para ADMIN global.
Testes permitem o criador histórico ou vínculo atual pela instalação.
Ausência e falta de acesso retornam o mesmo `404` de domínio. Os helpers
preparam consultas de acesso; as F05–F06 devem verificar vínculos na própria
consulta de dados e, nas escritas, dentro da transação para impedir corridas.
Este lote não registra `/users`, `/vehicles`, `/installations` ou `/tests`.

| Método | Rota | Acesso | Resultado |
| --- | --- | --- | --- |
| `GET` | `/users/me` | Access cookie | Retorna o perfil autenticado. |
| `PATCH` | `/users/me` | Access cookie | Atualiza nome e/ou avatar. |

Payload de atualização:

GET/PATCH estão registrados na F05. PATCH exige Origin permitido e
X-CSRF-Token vinculado à sessão, aceita pelo menos um dos campos abaixo e
rejeita campos extras. Ausência preserva o campo; null o limpa. Nome tem até
120 caracteres e avatar exige URI absoluta sem espaços; não há busca remota
do avatar. Email, papéis e status não são editáveis. Perfil removido entre
autenticação e consulta/escrita retorna USER_NOT_FOUND (404).

```json
{
  "displayName": "Ana Souza",
  "avatarUrl": null
}
```

`USER` é o papel global padrão da conta. `USER` e `ADMIN` podem coexistir no
mesmo perfil. `OWNER`, `DRIVER` e `ADMIN` descrevem o vínculo com um veículo
específico e não substituem os papéis globais. `TECHNICIAN` não integra o
contrato inicial.

## Veículos

F05 lotes 2–3 implementam as cinco rotas abaixo.
POST, PATCH e DELETE exigem Origin permitido e token CSRF.
Listagem usa página 1/tamanho 20, máximo 100, ordenada por criação decrescente
e ID como desempate. Ausência de vínculo retorna `VEHICLE_NOT_FOUND`, inclusive
para ADMIN. Cadastro serializa escritas por conta antes de definir o principal.

Todas as operações exigem access cookie e verificam o vínculo do usuário com o
objeto solicitado.

| Método | Rota | Resultado |
| --- | --- | --- |
| `GET` | `/vehicles?page=1&pageSize=20` | Lista paginada dos veículos vinculados. |
| `POST` | `/vehicles` | Cadastra um veículo e cria vínculo `OWNER`. |
| `GET` | `/vehicles/{vehicleId}` | Consulta um veículo autorizado. |
| `PATCH` | `/vehicles/{vehicleId}` | Atualiza dados permitidos ou troca o principal. |
| `DELETE` | `/vehicles/{vehicleId}` | Desvincula da conta; remove o veículo físico após o último vínculo, preservando testes. |

### Cadastro

```json
{
  "licensePlate": "ABC1D23",
  "brand": "Marca Exemplo",
  "model": "Modelo Exemplo",
  "modelYear": 2026
}
```

Regras:

- a placa é normalizada, obrigatória, única e imutável após o cadastro;
- CPF, CRLV, RENAVAM e arquivos de documentos não são aceitos;
- o usuário autenticado recebe vínculo `OWNER` na tabela associativa
  `UserVehicle`; `Vehicle` não recebe `userId` direto;
- o primeiro veículo da conta torna-se principal automaticamente;
- veículos posteriores iniciam como não principais;
- integração com DETRAN não faz parte deste contrato.

### Atualização e troca do principal

O payload permite apenas `brand`, `model`, `modelYear` e `isPrimary`. Enviar
`isPrimary: true` promove o veículo e remove o estado principal do anterior na
mesma transação. Placa, relacionamento e identificadores de usuário não são
alteráveis por este endpoint.
`null` limpa marca/modelo/ano; campos ausentes são preservados. Body vazio é
inválido. `isPrimary: false` não desmarca o principal existente.

### Exclusão

- o último veículo da conta pode ser desvinculado; a conta fica sem veículo principal;
- um veículo não principal pode ser desvinculado;
- ao excluir o principal com apenas um veículo restante, o restante é promovido
  automaticamente;
- ao excluir o principal com dois ou mais candidatos restantes, o cliente deve
  informar `replacementVehicleId` na query string;
- desvinculação, eventual promoção e remoção física são atômicas;
- o substituto deve pertencer ao mesmo usuário e não pode ser o veículo excluído;
- se houver outras contas vinculadas, `Vehicle`, placa e instalação permanecem
  disponíveis a elas;
- após o último vínculo ativo, o registro do veículo, placa e demais
  identificadores específicos são removidos; testes e telemetria permanecem
  com snapshot de modelo, local informado, piezos e condições do experimento,
  sem placa.
- mensagens MQTT brutas dos dispositivos são apagadas na mesma transação após
  o último vínculo, conforme autorização do programador; amostras normalizadas
  e resumos permanecem, com referências removidas pelas FKs existentes;
- substituto inválido, alheio ou obrigatório ausente retorna `VALIDATION_ERROR`.

## Instalações e configurações

As quatro rotas abaixo estão implementadas na F05 lote 4. Listagem de
instalações ordena por criação decrescente e ID como desempate; filtros de
veículo alheio retornam lista vazia. Listas usam página 1/tamanho 20, máximo 100.
Dispositivo ativo é o não revogado (revokedAt null e status diferente de REVOKED).
Listagem de configurações verifica instalação e paginação no mesmo snapshot.

As rotas deste recorte são somente de leitura e exigem access cookie. A API
retorna apenas instalações vinculadas a veículos acessíveis ao usuário.
Recursos inexistentes ou sem autorização recebem `404`, sem revelar a existência
de instalações de outra conta.

| Método | Rota | Resultado |
| --- | --- | --- |
| `GET` | `/installations?page=1&pageSize=20&vehicleId={vehicleId}&status=ACTIVE` | Lista paginada de instalações autorizadas. Filtros opcionais. |
| `GET` | `/installations/{installationId}` | Consulta instalação autorizada. |
| `GET` | `/installations/{installationId}/configurations?page=1&pageSize=20` | Lista versões da montagem da instalação. |
| `GET` | `/installations/{installationId}/configurations/{configurationId}` | Consulta uma versão da montagem. |

`Installation` contém `id`, `vehicleId`, `systemModel`, `status`,
`installedAt`, `activeDevice`, `createdAt` e `updatedAt`. O dispositivo público
contém apenas `id`, `name`, `firmwareVersion`, `status` e `lastSeenAt`;
`activeDevice` é `null` se não houver ESP32 ativo. Não retornamos `deviceUid`,
credenciais MQTT, tópicos privados ou número de série da instalação.

`Configuration` contém `id`, `installationId`, `name`, `version`,
`activePiezoCount`, `piezoAssociation`, `installationPoint`, `storageType`,
`notes` e `createdAt`. Cada versão é um retrato imutável da montagem. A listagem
é paginada e ordenada por `version` decrescente, com `id` como desempate.
`configurationId` de outra instalação recebe `404`.

Estados públicos: instalação `ACTIVE`, `MAINTENANCE`, `INACTIVE` ou `FAULT`;
dispositivo `PROVISIONING`, `ONLINE`, `OFFLINE`, `REVOKED` ou `FAULT`;
associação dos piezos `SERIES`, `PARALLEL` ou `MIXED`; armazenamento `BATTERY`,
`SUPERCAPACITOR`, `CAPACITOR` ou `NONE`. Todas as datas são UTC.

As rotas de leitura não alteram estado e, portanto, não retornam conflito de
estado. `INSTALLATION_STATE_CONFLICT` fica no catálogo para futuras operações
de alteração; usar `409` quando uma transição for impedida pelo estado atual.
`INSTALLATION_NOT_FOUND` e `CONFIGURATION_NOT_FOUND` cobrem ausência e falta de
acesso. Parâmetros ou filtros inválidos retornam `VALIDATION_ERROR`.

## Testes experimentais

F05 lotes 5–6 implementam GET/POST `/tests`, GET `/tests/{testId}` e
POST start/finish/cancel. POST exige Origin permitido e CSRF.
Instalação ausente/alheia usa `INSTALLATION_NOT_FOUND`; configuração ausente
ou de outra instalação usa `CONFIGURATION_NOT_FOUND`. Instalação não ativa
retorna `INSTALLATION_STATE_CONFLICT` (409). Conta, veículo e instalação são
bloqueados antes de criar o snapshot. Texto vazio ou só espaços é inválido.

As rotas exigem access cookie. O usuário pode criar testes para uma instalação
de veículo a que tem acesso e consultar os testes que criou ou aos quais ainda
tem acesso pela instalação. Após excluir um veículo, os testes criados continuam
disponíveis ao criador sem reexpor placa ou identificadores específicos. Recurso
inexistente ou sem acesso retorna `TEST_NOT_FOUND` (`404`).

| Método | Rota | Resultado |
| --- | --- | --- |
| `GET` | `/tests?page=1&pageSize=20&installationId={id}&status=COMPLETED&startedFrom={utc}&startedTo={utc}` | Lista paginada; filtros opcionais. |
| `POST` | `/tests` | Cria teste em `PLANNED`. |
| `GET` | `/tests/{testId}` | Consulta teste autorizado. |
| `POST` | `/tests/{testId}/start` | Inicia teste planejado; body vazio. |
| `POST` | `/tests/{testId}/finish` | Finaliza teste em `COMPLETED` ou `FAILED`. |
| `POST` | `/tests/{testId}/cancel` | Cancela teste planejado ou em execução. |

Na criação, o cliente informa `installationId`, `configurationId`, `name`,
`terrain`, `testLocation` e, se conhecido, `vehicleWeightKg` e `notes`. A
configuração precisa pertencer à instalação, que deve estar ativa. O servidor
atribui `createdById`, `status`, `createdAt` e o snapshot da montagem: modelo
do veículo, local informado, quantidade de piezos e versão da configuração.
Placa, CPF, documentos e identificadores específicos não entram no snapshot.
Se a conta criadora for excluída, `createdById` passa a `null` e o teste permanece.

`TestRecord` contém contexto, estado, snapshot, referências opcionais à
instalação e configuração, horários, peso no teste, RPM e velocidade médios,
inclinação, resultado e observações. As referências podem se tornar `null`
quando a exclusão do veículo remover seus identificadores. Medições de tensão,
corrente, potência e energia não pertencem a esse contrato. O peso é informado
ou medido no teste, nunca inferido apenas do modelo do veículo.

### Estados e concorrência

```text
PLANNED -> RUNNING -> COMPLETED | FAILED
    |          |
    +----------+-> CANCELLED
```

`start` aceita body vazio e atribui `startedAt` pelo relógio do servidor.
`finish` exige `status` igual a `COMPLETED` ou `FAILED`, aceita `outcome`,
`averageEngineRpm`, `averageSpeedKph`, `inclineDegrees`, `vehicleWeightKg` e
`notes`, e atribui `endedAt` pelo servidor. `cancel` aceita `reason` opcional e
atribui `endedAt` somente se o teste estava em execução. Toda transição ocorre
atomicamente; duas transições concorrentes não podem ter sucesso sobre o mesmo
estado anterior. Repetição ou transição inválida retorna
`TEST_STATE_CONFLICT` (`409`) com o estado atual consultável por `GET`.

As transições retornam 200 com o teste atualizado e exigem o mesmo acesso por
criador ou vínculo atual, inclusive ADMIN. Campos extras são rejeitados;
horários e snapshot não podem ser enviados. Escrita condicionada ao estado
anterior e acesso ocorre na mesma transação que a leitura da resposta.
Campos opcionais ausentes em finish são preservados; null limpa o campo.
RPM/velocidade devem ser finitos e não negativos; peso finito positivo;
inclinação finita. Se o relógio recuar, endedAt não fica anterior a startedAt.
O motivo de cancelamento (até 500 caracteres) é acrescentado às notes, separado
por uma quebra de linha quando houver texto anterior. Combinação acima de
1000 caracteres retorna VALIDATION_ERROR sem cancelar nem truncar. Sem motivo,
notes são preservadas. Cancelamento PLANNED mantém horários nulos.

`startedFrom` é inclusivo e `startedTo` é exclusivo; ambos usam ISO 8601 UTC.
O intervalo deve ter início anterior ao fim. Resultados são ordenados por
`createdAt` decrescente, com `id` como desempate. Filtros inválidos retornam
`VALIDATION_ERROR` (`400`).

## Telemetria, resumos e comparação

Estas rotas de consulta exigem access cookie e seguem as mesmas regras de acesso
dos testes e instalações. Um teste histórico permanece consultável por seu
criador depois da exclusão do veículo. Ausência ou falta de acesso retorna
`404`, sem confirmar a existência de dados de outra conta.

| Método | Rota | Resultado |
| --- | --- | --- |
| `GET` | `/tests/{testId}/telemetry?page=1&pageSize=20&capturedFrom={utc}&capturedTo={utc}&quality=VALID` | Amostras validadas do teste, paginadas. |
| `GET` | `/installations/{installationId}/energy-summaries?page=1&pageSize=20&periodType=DAY&periodFrom={utc}&periodTo={utc}` | Série de resumos da instalação. |
| `GET` | `/tests/{testId}/energy-summaries?page=1&pageSize=20&periodType=TEST&periodFrom={utc}&periodTo={utc}` | Resumos do teste, inclusive histórico preservado. |
| `GET` | `/test-comparisons?testIds={id1}&testIds={id2}` | Compara os resumos `TEST` dos testes autorizados. |

`TelemetrySample` contém `capturedAt`, qualidade e medições normalizadas com
unidades explícitas: `voltageV`, `currentA`, `powerW`, `devicePowerW`,
`accumulatedEnergyWh`, aceleração por eixo em `Ms2`, `vibrationRmsMs2`,
`temperatureC` e `activePiezoCount`. Medição ausente é `null`, nunca zero
inventado. Qualidade usa `VALID`, `PARTIAL`, `SUSPECT` ou `INVALID`.
`powerW` é calculada no backend; `devicePowerW` preserva o valor reportado pelo
ESP32 para comparação, sem substituir o cálculo do backend.

`EnergySummary` contém período `TEST`, `HOUR`, `DAY` ou `MONTH`, intervalo
`[periodStart, periodEnd)`, `recoveredEnergyWh`, potência média e pico,
`sampleCount`, qualidade (`GOOD`, `PARTIAL` ou `INVALID`) e `calculatedAt`.
`vehicleEnergyUsedWh` permanece `null` sem fonte confiável. `moneySaved` e
`energyTariffPerKwh` são decimais serializados como strings e permanecem
`null` sem tarifa e premissas documentadas. A ausência de dados não produz
resumo artificial.

Na comparação, `testIds` é repetido de 2 a 5 vezes na query string, sem IDs
duplicados. O resultado contém `items` na mesma ordem, cada um com `testId` e
`summary` `TEST` ou `null` quando o teste autorizado não possui resumo válido.
Se algum teste for inacessível, a operação inteira retorna `404`. Resumos
inválidos não entram como energia recuperada válida.

Os intervalos UTC são inclusivos no início e exclusivos no fim; início deve
ser anterior ao fim. Amostras são ordenadas por `capturedAt` e resumos por
`periodStart`, ambos em ordem crescente com `id` como desempate. Filtros,
intervalos ou lista de IDs inválidos retornam `VALIDATION_ERROR` (`400`).

## Solicitações de revisão

As três rotas estão implementadas na F05 lote 7. POST exige Origin permitido e
CSRF vinculado à sessão. A criação verifica vínculo e instalação na transação,
bloqueando conta e veículo contra exclusão; estado OPEN e solicitante vêm do servidor.
Leituras filtram o solicitante da sessão, inclusive ADMIN, mantendo seu histórico
quando veículo/instalação forem excluídos. Paginação 1/20, máximo 100; lista e
contagem usam RepeatableRead. UUIDs, filtros extras e campos extras são rejeitados.

Motivo precisa ser string não vazia, até 1000 caracteres. Verificação rejeita
padrões de CPF (inclusive inválido), placa brasileira, JWT, chaves privadas e
prefixos reconhecíveis de chaves de API; também recusa termos CPF/CRLV/RENAVAM,
senha/password/token/credencial/authorization/API key/secret e caracteres de
controle, preservando tabulação/quebras de linha. Responde VALIDATION_ERROR sem
repetir o conteúdo. O filtro é conservador e não garante detectar todo segredo
arbitrário em texto livre; padrões adicionais exigem exemplos e testes.

O usuário autenticado pode abrir e acompanhar solicitações próprias de revisão
do sistema VERS. As rotas exigem access cookie. Não há contrato público para
alterar o estado da solicitação neste lote.

| Método | Rota | Resultado |
| --- | --- | --- |
| `GET` | `/support-requests?page=1&pageSize=20&status=OPEN` | Lista paginada das solicitações do usuário. |
| `POST` | `/support-requests` | Abre solicitação em `OPEN`. |
| `GET` | `/support-requests/{supportRequestId}` | Consulta solicitação própria. |

O cadastro exige `vehicleId` e `reason`; `installationId` é opcional, mas,
quando informado, deve pertencer ao veículo e estar acessível ao usuário.
O servidor define o solicitante, `status`, `createdAt` e `updatedAt`. O motivo
tem até 1000 caracteres e não deve conter CPF, placa, documentos, tokens ou
segredos. O contrato não aceita upload ou campos de documentos pessoais.

`SupportRequest` retorna `id`, `vehicleId`, `installationId`, `reason`,
`status`, `createdAt` e `updatedAt`. As referências ao veículo e à instalação
podem se tornar `null` após a exclusão do veículo. Os estados de leitura são
`OPEN`, `IN_REVIEW`, `SCHEDULED`, `RESOLVED` e `CANCELLED`. A lista é ordenada
por `createdAt` decrescente, com `id` como desempate. A forma de transição
entre estados depende da operação de suporte a ser contratada futuramente.

Solicitação inexistente ou de outra conta retorna `SUPPORT_REQUEST_NOT_FOUND`
(`404`). Veículo ou instalação inacessível também retorna `404`, sem revelar a
existência de recursos de outra conta. Motivo ou filtro inválido retorna
`VALIDATION_ERROR` (`400`).

## Códigos iniciais de erro

| Código | Uso |
| --- | --- |
| `AUTH_EMAIL_ALREADY_REGISTERED` | Reservado para contratos futuros; o cadastro público não expõe esse erro. |
| `AUTH_INVALID_CREDENTIALS` | Login inválido sem enumerar usuários. |
| `AUTH_INVALID_REFRESH_TOKEN` | Refresh cookie ausente, inválido ou expirado. |
| `AUTH_SESSION_REVOKED` | Sessão já revogada. |
| `AUTH_UNAUTHORIZED` | Autenticação ausente/inválida (401) ou autorização/CSRF recusado (403). |
| `CONFIGURATION_NOT_FOUND` | Configuração inexistente ou inacessível dentro da instalação. |
| `CONFLICT` | Conflito transversal sem código de domínio mais específico. |
| `INSTALLATION_NOT_FOUND` | Instalação inexistente ou não acessível ao usuário. |
| `INSTALLATION_STATE_CONFLICT` | Transição futura incompatível com o estado atual da instalação. |
| `INTERNAL_SERVER_ERROR` | Falha inesperada sem detalhes internos na resposta. |
| `RATE_LIMIT_EXCEEDED` | Limite de requisições excedido. |
| `RESOURCE_NOT_FOUND` | Rota ou recurso transversal inexistente. |
| `SERVICE_UNAVAILABLE` | Dependência obrigatória indisponível no readiness. |
| `SUPPORT_REQUEST_NOT_FOUND` | Solicitação de revisão inexistente ou não acessível ao usuário. |
| `TEST_NOT_FOUND` | Teste inexistente ou não acessível ao usuário. |
| `TEST_STATE_CONFLICT` | Transição solicitada incompatível ou concorrente com o estado atual. |
| `USER_NOT_FOUND` | Perfil autenticado indisponível. |
| `VEHICLE_LICENSE_PLATE_ALREADY_REGISTERED` | Placa já cadastrada. |
| `VEHICLE_NOT_FOUND` | Veículo inexistente ou não acessível ao usuário. |
| `VALIDATION_ERROR` | Payload, paginação ou regra de substituição inválida. |

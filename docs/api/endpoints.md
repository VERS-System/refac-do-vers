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

### Autenticação por cookies

Access e refresh tokens são JWT próprios emitidos apenas por `Set-Cookie`.
Ambos usam `HttpOnly` e, em produção, `Secure`; portanto, não ficam disponíveis
ao JavaScript. O access token autentica recursos protegidos. O refresh token é
aceito apenas na renovação e no encerramento da sessão.

Clientes devem enviar credenciais/cookies nas requisições. CORS aceitará
credenciais somente das origens permitidas. A política `SameSite` e o mecanismo
exato de proteção CSRF permanecem pendentes até a definição dos domínios finais.

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
| `POST` | `/auth/register` | Público | Cria a conta, inicia a sessão e retorna o perfil. |
| `POST` | `/auth/login` | Público | Inicia a sessão e retorna o perfil. |
| `POST` | `/auth/refresh` | Refresh cookie | Rotaciona a sessão; body vazio. |
| `POST` | `/auth/logout` | Refresh cookie | Revoga a sessão atual e limpa os cookies; body vazio. |
| `POST` | `/auth/logout-all` | Access cookie | Revoga todas as sessões do usuário e limpa os cookies atuais. |

### Cadastro

```json
{
  "email": "ana@example.com",
  "password": "Senha@123",
  "displayName": "Ana Silva"
}
```

A senha deve possuir no mínimo oito caracteres, uma letra maiúscula, um
caractere especial e nenhum espaço. A resposta contém somente `UserProfile`;
os tokens são enviados exclusivamente nos cookies.

### Login

```json
{
  "email": "ana@example.com",
  "password": "Senha@123"
}
```

Credenciais inválidas usam uma mensagem genérica e não confirmam se o email
existe.

## Perfil

| Método | Rota | Acesso | Resultado |
| --- | --- | --- | --- |
| `GET` | `/users/me` | Access cookie | Retorna o perfil autenticado. |
| `PATCH` | `/users/me` | Access cookie | Atualiza nome e/ou avatar. |

Payload de atualização:

```json
{
  "displayName": "Ana Souza",
  "avatarUrl": null
}
```

`USER` é o papel global padrão da conta. `OWNER`, `DRIVER` e `ADMIN` descrevem
o vínculo com um veículo específico e não substituem os papéis globais.

## Veículos

Todas as operações exigem access cookie e verificam o vínculo do usuário com o
objeto solicitado.

| Método | Rota | Resultado |
| --- | --- | --- |
| `GET` | `/vehicles?page=1&pageSize=20` | Lista paginada dos veículos vinculados. |
| `POST` | `/vehicles` | Cadastra um veículo e cria vínculo `OWNER`. |
| `GET` | `/vehicles/{vehicleId}` | Consulta um veículo autorizado. |
| `PATCH` | `/vehicles/{vehicleId}` | Atualiza dados permitidos ou troca o principal. |
| `DELETE` | `/vehicles/{vehicleId}` | Exclui quando existe substituto elegível. |

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

### Exclusão

- o último veículo da conta não pode ser excluído;
- um veículo não principal pode ser excluído quando outro veículo existe;
- ao excluir o principal com apenas um veículo restante, o restante é promovido
  automaticamente;
- ao excluir o principal com dois ou mais candidatos restantes, o cliente deve
  informar `replacementVehicleId` na query string;
- exclusão e promoção são atômicas;
- o substituto deve pertencer ao mesmo usuário e não pode ser o veículo excluído.

## Códigos iniciais de erro

| Código | Uso |
| --- | --- |
| `AUTH_EMAIL_ALREADY_REGISTERED` | Email já vinculado a uma conta. |
| `AUTH_INVALID_CREDENTIALS` | Login inválido sem enumerar usuários. |
| `AUTH_INVALID_REFRESH_TOKEN` | Refresh cookie ausente, inválido ou expirado. |
| `AUTH_SESSION_REVOKED` | Sessão já revogada. |
| `AUTH_UNAUTHORIZED` | Recurso exige autenticação válida. |
| `USER_NOT_FOUND` | Perfil autenticado indisponível. |
| `VEHICLE_LICENSE_PLATE_ALREADY_REGISTERED` | Placa já cadastrada. |
| `VEHICLE_NOT_FOUND` | Veículo inexistente ou não acessível ao usuário. |
| `VALIDATION_ERROR` | Payload, paginação ou regra de substituição inválida. |

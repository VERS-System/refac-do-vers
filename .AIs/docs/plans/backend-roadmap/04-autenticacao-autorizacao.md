<!-- Fase 04 do roadmap executável do backend VERS. -->

# Fase 04 — Autenticação e autorização

## Objetivo

Implementar identidade, sessões e proteção por recurso usando JWT próprio.

## Etapa A — Cadastro e senha

- normalizar email e impedir duplicidade;
- validar regras de senha do contrato;
- persistir somente hash seguro com salt;
- evitar enumeração de contas nos erros.

## Etapa B — Login e cookies

- validar credenciais com estratégia local;
- emitir access e refresh JWT somente em cookies `HttpOnly`;
- usar HTTPS e `Secure` em produção;
- fechar `SameSite`, domínio, path e mecanismo CSRF antes do código;
- nunca retornar ou logar token/cookie.

## Etapa C — Refresh e revogação

- persistir apenas hash da sessão;
- rotacionar refresh token a cada uso;
- detectar reutilização e revogar cadeia comprometida;
- implementar logout atual e logout de todas as sessões;
- limpar cookies de forma consistente.

## Etapa D — Guards e autorização

- separar rotas públicas, autenticadas e administrativas;
- validar papéis globais;
- autorizar por propriedade/vínculo do recurso;
- proteger handshake e canais WebSocket;
- manter identidade MQTT separada da identidade humana.

## Testes de abuso

- enumeração de email;
- senha incorreta e conta bloqueada;
- refresh expirado, revogado, repetido ou concorrente;
- CSRF nas rotas mutáveis;
- escalada de papel e acesso a recurso de outro usuário;
- cookies indisponíveis ao JavaScript.

## Saída

Usuário autentica e opera somente recursos permitidos, com sessões rotativas e
revogáveis.

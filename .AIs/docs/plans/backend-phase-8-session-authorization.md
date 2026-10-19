<!-- Planeja a autorização reutilizável antes de abrir o gateway Socket.IO. -->
# F08.4 — sessão e autorização

Pedido `nxt` autoriza este recorte em 15/10/2026. Implementar serviço passivo
RealtimeAuthorizationService/spec, registrá-lo/exportá-lo no RealtimeModule e
exportar AuthService/JwtModule do AuthModule para reutilizar a autenticação.
Sem gateway, timers, conexões, migração, dependências ou mudança no REST.

Origin obrigatório e pertencente à lista CORS atual foi aprovado pelo
programador. Reutilizar createCorsConfig, sem aceitar ausência, null ou wildcard.
Ler somente cookie único vers_access; verificar assinatura HS256/prazo com
JwtService e consultar sessão/conta via AuthService em toda autorização.
Não aceitar token por query, bearer ou auth. Validar comando estrito
{version:1,resource:{type:test|installation,id:UUIDv4}} antes de consultar banco.
Reutilizar ResourceAccessService sem exceção ADMIN. Ausente/alheio devem gerar
RESOURCE_UNAVAILABLE; credenciais inválidas UNAUTHENTICATED; falha operacional
REALTIME_UNAVAILABLE. Não incluir conteúdo, tokens ou erro original no retorno.

TDD: primeiro spec falha sem implementação; usar JWT real e persistência
sintética para assinatura/expiração/claims/sessão revogada/conta/vínculos.
Cobrir cookie ausente/duplicado, Origin, comandos malformados, falha de banco e
revalidação após mudança de sessão/acesso. Validar unidade/lint/build/diff.
Rebuild somente backend e conferir live/readiness.

Programador aprovou revalidação em cada assinatura/aviso e sessão ociosa a cada
30 segundos, até 5 conexões por sessão e 20 recursos por conexão por instância.
Este serviço não implementa contadores nem agenda entrega; a aplicação dessas
políticas será feita no gateway F08.5. Não prometer quota global entre réplicas.
Atualizar contrato, roadmap, índice e contexto ao terminar. Socket.IO continua
sem endpoint ativo e ensaio Redis/Socket.IO real requer autorização própria.

## Evidência local

TDD RED por serviço ausente; corrigida também ordem de injeção no fixture.
GREEN final: 44 suítes/920 testes (39 novos), incluindo JWT real, nbf, falta de
exp, sessão revogada/substituída, conta, reconsulta de vínculo e falhas fechadas.
Na primeira suíte completa o fixture de JWT sem exp usou expiresIn undefined,
recusado pela biblioteca; corrigido omitindo a opção e repetida a suíte completa.
Lint e build aprovados. Persistência sintética; sem teste de rede Socket.IO.
Rebuild concluído, somente backend recriado, imagem cb7d7c678395 em execução.
Live ok; primeira readiness 503 e repetição ok com database/redis ok e MQTT
disabled. Container não define Healthcheck Docker; saúde conferida pelas rotas.
Lint final e git diff --check aprovados. Recorte 8.4 entregue para revisão;
gateway e aplicação das políticas aprovadas ficam no próximo lote.

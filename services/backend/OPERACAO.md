<!-- Orienta a entrega manual e o diagnóstico da demonstração local sintética. -->
# Operação da demonstração local

Escopo confirmado em 20/10/2026: backend local com dados exclusivamente
sintéticos. Não inserir dados pessoais reais. Este guia complementa o
[preparo e início](README.md) e não autoriza alterações no banco remoto.

## Entrega e retorno

1. Registrar revisão Git, tag/ID da imagem anterior, versões Node/pnpm e
   resultado das verificações do README. Não atualizar dependências no deploy.
2. Construir imagem separada, preservando a anterior:
   `docker build -f docker/Dockerfile.backend -t vers-backend:<revisao> .`.
   A instalação usa lockfile congelado. O contexto exclui .env, dependências
   locais e output conforme .dockerignore. Não passar segredos em build args.
3. Antes de migration, parar publicação sintética e copiar o banco autorizado
   com pg_dump -Fc. Registrar local, data, versão PostgreSQL e revisão. Conferir
   saída zero e restaurar em banco vazio com pg_restore --exit-on-error antes
   de considerar a cópia recuperável. Não salvar dump no Git.
4. Aplicar prisma:migrate:deploy somente com DATABASE_URL local conferida e
   configuração explícita. Seguir o [runbook de migrations](../../.AIs/docs/plans/backend-schema-phase-2-runbook.md).
   Não usar migrate reset, db push ou resolve para esconder divergências.
5. Iniciar somente o backend alvo com configuração pelo ambiente. Conferir
   live/ready, login sintético, leitura REST autorizada e recusa sem sessão.
   Se MQTT estiver habilitado, conferir também dependencies.mqtt=ok: ready
   pode retornar HTTP 200 com MQTT indisponível.
6. Executar o [ensaio integrado](../../.AIs/docs/plans/backend-phase-9-integrated-flow.md)
   na bancada isolada para validar MQTT/TLS, REST, Socket.IO, duplicata e
   revogação. Não executá-lo contra o banco da demonstração ou remoto.
7. Em falha, parar o backend novo e retomar a imagem anterior apenas se o
   schema for compatível. Caso contrário, restaurar backup em outro banco
   vazio, validar e apontar a versão anterior para essa cópia. Nunca aplicar
   SQL reverso improvisado nem sobrescrever a única cópia do banco.

## Diagnóstico acompanhado pelo operador

Durante a demonstração, manter terminal de logs e consultar live/ready antes
de iniciar e após qualquer falha. Os sinais abaixo orientam diagnóstico manual;
não existe coletor de métricas ou alerta automático implementado.

| Sinal | Verificação e resposta |
| --- | --- |
| live falha | Conferir estado/saída do processo e porta; não reiniciar outros serviços. |
| ready 503 | Conferir PostgreSQL e Redis nas URLs/portas autorizadas; resposta pública omite detalhes internos. |
| MQTT unavailable quando habilitado | Conferir broker, certificado, conectividade e credencial; preservar TLS. |
| http_request_failed | Usar requestId, rota, status e durationMs; não copiar corpo/cookies para diagnóstico. |
| mqtt_rejections | Conferir motivo agregado e identidade/configuração do simulador; não desativar autorização. |
| mqtt_processing_failed / mqtt_recovery_failed | Conferir disponibilidade do banco/Redis e estado da mensagem; não apagar bruto para forçar repetição. |
| REST atualizado e tela parada | Conferir autorização da assinatura e reconexão; recuperar por REST, sem prometer replay Socket.IO. |

Logs HTTP existentes registram duração e requestId, sem corpo, query, cookies
ou Authorization. MQTT conserva captured_at, received_at e processed_at nos
brutos: diferenças permitem investigar atraso de captura/recepção e
processamento, mas dependem do relógio sintético e não constituem métricas
exportadas. Correlação MQTT usa identidade e sequência; requestId HTTP não é
um trace distribuído de MQTT. Evitar exportar payload bruto para chamados.

## Dados sintéticos e incidente

As suítes limpam seus próprios IDs e contadores; não usar DELETE global,
FLUSHDB ou docker compose down -v como rotina de limpeza. No banco da
demonstração, preservar dados e backups até o responsável autorizar descarte.
Não foi definida retenção temporal automática. Acesso é restrito ao operador
local autorizado; não compartilhar credenciais, volumes ou logs brutos.

Se surgir dado real ou suspeita de exposição: interromper publicação e acesso
à demonstração, registrar horário/revisão/IDs de correlação sem dados pessoais,
preservar evidências em local restrito e comunicar ao responsável do projeto.
Revogar credenciais expostas e só retomar após corrigir a causa e validar o
fluxo sintético. O responsável decide obrigações legais e comunicação externa.

## Limites para produção

Sem implantação remota, integração Electron/API comprovada, alertas automáticos,
SLO, trace distribuído, retenção automática, RPO/RTO acordados ou guarda externa
de backup. Esses pontos exigem decisões próprias antes de usar dados reais.
Auditoria de dependências possui avisos pendentes; ensaios funcionais não
certificam ausência de vulnerabilidades. A imagem deve ser identificada pelo
digest para repetição exata: tag Node 24 e pacotes apt podem mudar no futuro.

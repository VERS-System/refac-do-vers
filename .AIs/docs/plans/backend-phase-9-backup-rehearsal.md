<!-- Planeja e registra ensaio descartável de migration, backup e restauração. -->
# F09 — Migration e recuperação locais

## Plano anterior à execução

Criar somente container vers-f09-recovery, PostgreSQL 16, sem volume e com
porta 55433 ligada a 127.0.0.1. Credenciais exclusivamente sintéticas.
Aplicar migrations versionadas com Prisma migrate deploy, ambiente explícito
e config que não carrega .env. Repetir deploy para comprovar ausência de
reaplicação. Inserir sentinela sintética, gerar pg_dump custom dentro do
container e restaurar em outro banco vazio com pg_restore --exit-on-error.
Comparar sentinela, catálogo e histórico Prisma nos dois bancos.

Executar testes unitários; remover somente o container criado neste ensaio
após conferência. Não tocar containers/volumes existentes ou Neon. Atualizar
este plano, runbook, roadmap e contexto com resultados e limites. Sem código
de produção, dependências, CI/CD ou política de backup inferida.

Falha em qualquer etapa impede declarar recuperação aprovada. Este teste não
valida retenção, criptografia, guarda externa, RPO/RTO ou recuperação do Neon.

## Resultado em 19/10/2026

Deploy aplicou 20260923000100_initial_schema; segunda execução sem migrations
pendentes. Prisma confirmou que não carregou arquivos de ambiente. Status
aprovado na origem e no banco restaurado. Conta sentinela f09@example.invalid
com UUID fixo e hash fictício inserida somente no banco descartável.

pg_dump -Fc e pg_restore --exit-on-error aprovados. Ambos os bancos possuem
15 tabelas (14 de domínio e histórico Prisma), 16 enums, sete triggers não
internos, 46 índices, uma migration concluída, sentinela e citext. A primeira
asserção esperava incorretamente 47 índices; catálogo confirmou apenas a PK
adicional do histórico. Não houve divergência entre bancos.

Dumps completos de schema e dados idênticos, excluindo somente tokens
aleatórios de proteção de sessão do pg_dump. 46 suítes/962 testes unitários
aprovados. Container vers-f09-recovery parado e removido, sem volume persistente;
backup sintético interno descartado. Nenhuma mudança de produção ou Neon.

## Comandos de backup no container isolado

Após deploy e criação da sentinela, conferir código de saída em cada comando:

```powershell
docker exec vers-f09-recovery pg_dump -U vers_test -d vers_test -Fc -f /tmp/vers-f09.dump
docker exec vers-f09-recovery createdb -U vers_test vers_restored
docker exec vers-f09-recovery pg_restore -U vers_test -d vers_restored --exit-on-error /tmp/vers-f09.dump
```

Comparar dumps completos, ignorando somente tokens aleatórios de sessão, e
executar Prisma migrate status contra vers_restored com URL sintética explícita.
Este ensaio mínimo não valida fluxos relacionais completos ou backup operacional.

<!-- Planeja corrigir a dependencia do carregador Prisma sem migrar ORM ou banco. -->
# F09 — Prisma e deepmerge-ts

## Escopo e decisão técnica

NXT após bcrypt6. Prisma6 atual6.19.3 fixa deepmerge-ts7.1.5 exato; registro
não oferece patch na linha6. Versão corrigida deepmerge-ts8.0.0 mantém export
deepmerge/CJS/ESM e suporta Node>=16. Usar override específico
@prisma/config@6.19.3>deepmerge-ts=8.0.0, documentado, sem alterar outros pais.
Não migrar Prisma7, Client, schema ou migrations para trocar só esse merger.

Arquivos previstos: pnpm-workspace.yaml (override), pnpm-lock.yaml,
src/config/prisma-cli.config.spec.ts, este plano, roadmap F09 e contexto.
Não mudar allowBuilds, manifest backend, API ou configuração de produto.

## Alcance e compatibilidade

@prisma/config carrega deepmerge dinamicamente em loadConfigTsOrJs e passa ao
c12 como merger. Fonte instalada desativa dotenv, RC, config remota, extends e
packageJson. Único caller próprio é prisma.config.ts versionado, composto por
schema/migrations de strings; nenhum DTO HTTP fornece objetos ao carregador.
Não comprovada exploração remota VERS. Imagem atual conserva CLI/devDependencies;
não alegar que ausência de chamada HTTP remove o pacote da imagem.

Major8 altera merge de Maps e tipos de helpers; configuração atual não usa
Maps nem helpers alterados. Testar o carregamento real pelo mesmo c12/Prisma,
não somente um objeto artificial. Remover/reavaliar override quando Prisma
adotar versão corrigida; pin do pai faz a exceção deixar de casar após upgrade.

## TDD e validação

Antes do override, testes unitários em subprocessos sem rede e sem ambiente
herdado sensível: config real deve carregar; dois objetos circulares no merger
do Prisma não devem esgotar pilha. RED esperado no segundo caso com7.1.5.
Depois: GREEN, Prisma validate/generate com URL sintética explícita, unitários,
lint/build/tipos, instalação congelada e auditoria filtrada por caminhos backend.
Confirmar resolução efetiva do pai e diff restrito. Imagem Linux nova e testes
do carregador sem rede; nenhum deploy, banco remoto ou restart de uso.
Smoke e bancos descartáveis finais seguem o plano de fechamento local.

## Referências primárias

- https://github.com/advisories/GHSA-ggr8-5vv4-36mx
- https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0
- Metadados npm e código instalado @prisma/config6.19.3 consultados20/10/2026.

## Resultado — 20/10/2026

RED comprovado no merger7.1.5: RangeError com dois objetos circulares. Teste
do config real passou antes da troca. Primeira tentativa de teste usou export
não público de prisma/config; corrigida para resolver @prisma/config pelo pai,
antes de alterar dependência. Não contar esse erro do teste como vulnerabilidade.

Override específico e lockfile trocam somente deepmerge-ts7.1.5→8.0.0;
resoluções alheias geradas pelo pnpm retiradas. Install geral congelado sem
scripts passou em9s, sem recriar workspace ou mudar allowBuilds.
GREEN2/2,47 suítes/969 unitários, lint/tipos aprovados. Prisma validate passou
sem carregar ambiente. Generate paralelo aos testes sofreu EPERM na DLL;
repetição sequencial após testes passou, seguida de build aprovado.

Audit produção filtrado backend1→0, sem ignorar advisory ou alterar severidade.
Não equivale a auditoria integral do workspace, de devDependencies ou da imagem.
O input circular é reproduzível na biblioteca, mas não foi demonstrado por rota
VERS; fonte própria do CLI é configuração estática versionada.

Imagem vers-backend:f09-final-20261020 construída com instalação Linux nova
congelada, Prisma generate e build aprovados; dois testes do carregador também
passaram no runtime Linux sem rede em3,574s. Smoke/migration/backup finais e
ID da imagem registrados no [fechamento](backend-phase-9-closure-20-10-2026.md).
Nenhuma alteração Client/schema/migration, deploy remoto, commit ou push.

<!-- Baseline verificável do backend antes da implementação das APIs dos aplicativos. -->

# Baseline do backend — 03/09/2026

## Resultado

O backend compila e os testes existentes passam, mas a maior parte da estrutura
de negócio é composta por arquivos vazios. Portanto, nomes de módulos presentes
no repositório não representam funcionalidades implementadas.

## Estado verificado

- `AppModule` integra configuração, rate limit global e Prisma;
- configurações de ambiente, CORS, autenticação, Helmet e rate limit possuem
  testes unitários;
- o lifecycle do Prisma possui testes unitários;
- há 48 arquivos vazios em `src/common` e `src/modules`;
- auth, data, MQTT, roles, tokens, WebSocket, AI e os componentes comuns são
  scaffolds vazios;
- `services/backend/src` é a única árvore canônica da aplicação NestJS;
- as árvores vazias `services/backend/mobile`, `dashboard`, `general` e `web`
  são legadas e não devem receber implementação nova;
- o schema Prisma atual é experimental e não atende ao roadmap novo;
- não há migrations versionadas no diretório `prisma/migrations`;
- Prisma Client 6.19.3 gerado e carregado com sucesso;
- schema Prisma validado com URL PostgreSQL sintética, sem conexão externa;
- `prisma.config.ts` impede carregamento implícito de `.env` pelo CLI;
- `postinstall` regenera o Prisma Client sem depender de conexão com o banco;
- build NestJS aprovado pelo script do workspace;
- 7 suítes e 23 testes preexistentes aprovados;
- execução com `--detectOpenHandles` não identificou handle aberto;
- lint configurado com ESLint 9 e aprovado sem autofix.

## Limitação do gerenciador de pacotes

O monorepo foi fixado em pnpm 11.21.0. A configuração duplicada e obsoleta
`pnpm.onlyBuiltDependencies` foi removida do `package.json`; `allowBuilds` no
`pnpm-workspace.yaml` permanece como fonte de verdade. As dependências foram
reconciliadas com o lockfile sem atualização de versões de produção.

## Limite da validação Prisma

O mecanismo de geração foi validado com uma cópia temporária do schema e uma URL
PostgreSQL sintética. Isso confirma o CLI e o Client, mas não aprova o schema
experimental, não valida conectividade com o Neon e não cria migrations.

## Pendências fora do backend

`pnpm peers check` identifica incompatibilidades preexistentes de React entre os
workspaces mobile/web. Elas não impedem o baseline do backend e devem ser
tratadas pelo responsável pelos clientes sem alterar versões nesta entrega.

## Próximas ações

1. concluir os contratos compartilhados pelas aplicações mobile e desktop;
2. revisar o schema experimental somente após os contratos;
3. implementar cada recurso verticalmente com TDD, sem preencher scaffolds em
   massa.

Uma implementação prematura do envelope comum de respostas foi revertida para
que nenhum código das fases posteriores permaneça antes dos contratos.

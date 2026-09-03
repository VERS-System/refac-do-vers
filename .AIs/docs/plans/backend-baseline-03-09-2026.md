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
- o schema Prisma atual é experimental e não atende ao roadmap novo;
- build NestJS aprovado usando o binário local;
- 7 suítes e 23 testes preexistentes aprovados;
- Jest mantém um handle aberto após a suíte e precisa de investigação;
- lint não executa porque ESLint não está instalado no workspace atual.

## Limitação do gerenciador de pacotes

O comando por `pnpm.cmd --filter` tentou reconciliar `node_modules`, acessar o
registry e remover módulos sem TTY. Como a rede não estava disponível, a
validação foi executada com os binários locais de Jest e Nest. A configuração
legada `pnpm.onlyBuiltDependencies` da raiz também gera aviso porque a versão
atual do pnpm espera essa configuração no workspace.

## Primeira entrega iniciada

Foi escolhido o contrato comum de respostas e erros HTTP, porque todas as APIs
de mobile e desktop dependerão dele. O teste foi escrito e executado antes da
implementação.

## Próximas ações

1. estabilizar o comando pnpm e instalar/configurar ESLint de forma versionada;
2. investigar o handle aberto do Jest;
3. concluir os contratos das APIs dos aplicativos;
4. implementar cada recurso verticalmente com TDD, sem preencher scaffolds em
   massa.

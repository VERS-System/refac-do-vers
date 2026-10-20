<!-- Corrige entrada do backend compilado e documenta operação local sem CI/CD. -->
# F09 — Início local e demonstração simulada

## Escopo autorizado em 19/10/2026

Programador solicitou continuidade sem CI/CD. Revisão encontrou start apontando
para dist/main, inexistente no build atual. Dockerfile e ensaio real já usam
dist/services/backend/src/main.js. Corrigir somente services/backend/package.json
e acrescentar teste em src/main.spec.ts para manter início local e Docker
alinhados. Sem wrapper, novo comando, dependência ou mudança do pipeline.

Criar services/backend/README.md com configuração pelo ambiente do processo,
build/start, probes de saúde, modo passivo e simulação usando ferramentas
existentes. Vincular na documentação/roadmap e atualizar contexto.

## Verificação

TDD: teste lê scripts.start e comando JSON do Dockerfile; deve falhar com
dist/main e passar com a entrada correta. Executar test:unit, lint, TypeScript
incluindo testes e build. Conferir existência do artefato e sintaxe JS da entrada
compilada, sem iniciar banco/broker. Não repetir ensaio real já aprovado somente
para trocar o caminho do script. Não ler .env; aplicação recebe variáveis pelo
ambiente, e Prisma usa config que evita dotenv.

## Limites

Start não passa a executar build, provisionar dados ou aplicar migrations.
Nenhum Docker necessário: CMD já usa entrada correta. Demonstração integrada
reutiliza a bancada/fixtures F08; geração de JSON isolada não publica no broker.
Integração real Electron/API e operação/backup/migrations continuam separados.

## Resultado em 19/10/2026

Teste novo falhou primeiro: Docker esperava node
dist/services/backend/src/main.js, mas start usava node dist/main. Após corrigir
o script, passaram 46 suítes/962 testes, lint, TypeScript e build. A entrada
gerada existe e passou em node --check; git diff --check sem erros.
Não foi necessário iniciar serviços ou repetir o ensaio integrado.

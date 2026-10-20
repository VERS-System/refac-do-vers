<!-- Planeja reduzir avisos transitivos sem alterar contratos ou versões principais. -->
# F09 — Transitivas restantes

## Escopo autorizado

Continuidade NXT após solicitação de fechar demonstração local. Primeiro lote:
atualizar apenas resoluções compatíveis ip-address10.3.1→10.7.4 e
brace-expansion1.1.17→1.1.21, após consultar metadados do registro e faixas dos pais.
Arquivos previstos: pnpm-lock.yaml, este plano, roadmap F09 e contexto diário.
Não adicionar dependências diretas ou overrides. Não alterar contratos,
autenticação, banco, migrations, .env ou serviços em execução. Sem deploy.

## Callers e risco

Multer chega por Nest/platform-express; não há interceptor de upload ou
MulterModule no código do backend. IP-address chega por MQTT/socks; MqttService
configura conexão TLS direta sem proxy SOCKS. Brace-expansion1 chega por
ferramentas transitivas (bcrypt/node-pre-gyp e glob/minimatch), não por API
própria. Atualização afeta também outros importers que compartilham essas
resoluções no lockfile; não alterar arestas das outras versões principais.
Não foi demonstrada exploração desses avisos no VERS.

Multer excluído deste lote: @nestjs/platform-express11.1.28 fixa2.2.0 exato.
Não substituir resolução contra a faixa declarada pelo pai. Registro já tem
Nest12.2.0 com Multer2.4.0; avaliar patch disponível da linha11 antes de major.
Socks2.8.9 aceita ip-address^10.1.1; minimatch3.1.5 aceita brace-expansion^1.1.7.

Tar permanece ligado ao instalador bcrypt5 e deepmerge-ts ao Prisma config
com dependência exata7.1.5; não forçar majors incompatíveis neste lote.

## Validação

Baseline imediatamente anterior, sem alteração posterior de produção:
46 suítes/964 testes, lint/build e tipos aprovados. Conferir diff restrito,
instalação congelada com scripts ignorados (sem mudar allowBuilds), resolução
efetiva dos pais, unitários, lint/build/tipos e auditoria somente caminhos
backend. Antes/depois por advisory, sem alegar ausência de vulnerabilidades.
Rebuild isolado só se o lote passar; preservar containers de uso.

## Resultado do lote

Lockfile contém somente oito linhas substituídas: dois blocos de integridade,
dois snapshots e duas arestas dos pais (com cabeçalhos correspondentes).
Metadados npm confirmaram dependências internas inalteradas. Manifests,
allowBuilds e versões principais preservados. Resolução manual restrita foi
confirmada por instalação congelada e builds, sem re-resolver pacotes alheios.

Instalação inicial geral tentou recriar node_modules e sofreu falha de rede
no sandbox; interrompida antes de repetição autorizada. Repetição terminou em
EPERM no Electron aberto. Instalação filtrada backend aprovada com1.058 pacotes,
scripts ignorados. Bcrypt e engines Prisma recompostos pelos scripts já
permitidos; generate passou com URL sintética, sem carregar .env ou acessar
banco. Nenhuma alteração persistente nas regras de aprovação de scripts.

46 suítes/964 testes, lint/build/TypeScript noEmit passaram. Assert temporário
confirmou resoluções efetivas via minimatch3/socks2.8.9, expansão de chaves,
IPv4/IPv6 válidos e rejeição IPv4 inválido. Sem implementação ou teste de
produto novos; controles funcionais existentes preservados.

Audit backend26→18: tar12, deepmerge-ts1, multer5;1 crítico/12 altos/4 moderados/
1 baixo. Zero advisories restantes de ip-address/brace-expansion no caminho
backend, sem afirmar ausência de exploração ou auditoria global aprovada.

Imagem isolada vers-backend:f09-transitives-20261020 construída com instalação
Linux nova congelada/scripts permitidos e build aprovados; ID
sha256:32b90ac899711458a09f8504f866600f9ef1687a423ac664ca9c837e0656a17e.
Sem iniciar ou substituir container, sem deploy ou teste de banco/realtime novo.

## Restauração local concluída

Instalação filtrada deixou links dos demais importers ausentes. Reinstalação
geral congelada adicionou455/456 pacotes e voltou a falhar na pasta Electron
bloqueada. Programador fechou o dashboard e avisou; nova instalação geral
congelada sem scripts passou em29,1s e restaurou links dos demais importers.
Nenhum processo de usuário encerrado pela IA.

Rebuild explícito restaurou esbuild; Electron foi pulado pela lista de builds.
Instalador individual Electron executado com autorização da ferramenta, sem
mudar allowBuilds. Assert confirmou executável Electron e transformação esbuild
resolvido pelo Vite. Primeiro assert tentou esbuild direto, que não é dependência
direta do dashboard; corrigido para resolução via pai, sem alterar manifest.
Typecheck dashboard/mobile aprovados; bcrypt/Prisma do backend conferidos após
restauração. Sem abrir aplicativo ou carregar .env. Diff --check aprovado.

Próximo lote de segurança: avaliar Nest11.2.7, que fixa Multer2.4.0 e mantém
peers^11, sem migrar major. Bcrypt/tar e Prisma/deepmerge permanecem separados.

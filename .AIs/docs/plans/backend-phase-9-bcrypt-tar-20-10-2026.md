<!-- Planeja trocar o instalador bcrypt sem invalidar hashes ou mudar autenticação. -->
# F09 — bcrypt e cadeia tar

## Escopo autorizado

NXT após Nest/Multer. Atualizar bcrypt5.1.1→6.0.0 e tipos correspondentes,
preservando API hash/compare, custo12 e hashes já persistidos. Bcrypt6 troca
node-pre-gyp por node-gyp-build e binários distribuídos no pacote, removendo
a cadeia tar do caminho de produção do backend. Node>=18 compatível com24.
Sem algoritmo novo, rehash em massa, migração ou alteração da política de senha.

Arquivos previstos: manifest backend, lockfile, auth.service.spec.ts, este
plano, roadmap F09 e contexto. Callers conferidos: AuthService.register/login,
app.foundation e fixture do bootstrap real; demais passwordHash não usam bcrypt.
JWT, guards, cookies e DTOs permanecem iguais. Não ler .env ou acessar remoto.

## Teste antes da atualização

Gerados hashes ASCII/Unicode com bcrypt5.1.1 instalado e custo4 exclusivamente
para fixtures. Adicionar ao login existente casos de hash legado2b e2a,
incluindo recusa de senha incorreta sem criar outra sessão. Executar baseline
com bcrypt5 antes de trocar pacote. Testes protegem compatibilidade; não
inventar falha funcional vermelha numa atualização de dependências.

## Verificações

Resolver candidato pelo pnpm com scripts ignorados; retirar deltas alheios,
preservando pacotes órfãos que outros importers ainda precisam. Instalação
geral congelada sem scripts, binário bcrypt6 Windows e tipos conferidos.
Unitários/lint/build/tipos; auditoria filtrada por caminhos backend. Instalação
Linux limpa e imagem isolada, sem deploy ou alterar containers de uso.
Ensaio HTTP real de login/refresh/logout e auditoria em bancada sintética;
inventariar portas/containers, limpar apenas IDs próprios e parar ao concluir.
Não repetir MQTT sem mudança adicional ou falha que justifique.

## Referências consultadas

- https://github.com/kelektiv/node.bcrypt.js/releases/tag/v6.0.0
- https://github.com/kelektiv/node.bcrypt.js#compatibility-note
- Metadados npm bcrypt6.0.0 e @types/bcrypt6.0.0 em20/10/2026.

Avisos tar referem-se à cadeia de instalação; exploração por endpoints VERS
não comprovada. Resultado deve distinguir remoção do grafo de segurança global.

## Resultado local

Árvore inicialmente limpa. Testes escritos antes da atualização: AuthService
21/21 com bcrypt5, incluindo três casos novos legados ASCII2b/Unicode2b/ASCII2a
e recusa de senha incorreta. Após bcrypt6,46 suítes/967 testes, lint/build e
TypeScript incluindo testes aprovados. Hash/compare nativos Windows e tipos6
conferidos sem executar novo script de instalação no host.

Manifest bcrypt e @types/bcrypt passam a^6.0.0. Pnpm gerou candidato com deltas
de Metro/tipos Node/sourcemap e outros; removidos. Lock final remove nove
pacotes exclusivos da cadeia antiga e adiciona quatro do bcrypt/tipos novos.
Tipos Node22 e demais resoluções preservados. Tar6 continua no workspace por
outros importers, sem aresta bcrypt/backend; não apagado indiscriminadamente.
Install geral congelado sem scripts passou em9,6s, sem purge do workspace ou
mudança allowBuilds. Diff de produção limitado ao manifest/lockfile.

Audit backend13→1, removidos os12 avisos tar; resta deepmerge-ts, alto,
GHSA-ggr8-5vv4-36mx. Sem afirmar auditoria global aprovada ou exploração provada.

Inventário preservou seis containers de uso, quatro portas da bancada livres.
Iniciados somente db-test/redis-test no projeto sintético existente, sem MQTT.
Dois cenários reais de auth passaram em25,001s: login/401/cadastro duplicado,
refresh/rotação, logout e logout-all, cookies/revogação e auditoria SQL mínima.
Outros quatro casos bootstrap filtrados, sem alegar execução neste lote.
SQL final12 tabelas vazias e SCAN auth:login:* vazio; só esses dois serviços
parados ao fim, volumes preservados. Sem .env, migration ou banco remoto.

Imagem isolada vers-backend:f09-bcrypt-20261020 construída com1.035 pacotes
em instalação Linux nova congelada, node-gyp-build bcrypt6, Prisma generate
sem .env e build aprovados. ID
sha256:346a576ee50eae66892bff6a7f8ea99377d7c0752b99ce3c141a7c408b149cb1.
Três testes legados também passaram no runtime Linux sem rede em8,641s,
18 casos dessa suíte filtrados; não alegar suíte Linux completa.
Sem deploy, restart de uso ou commit/push. Diff --check aprovado.
F09 segue aberta pelo aviso Prisma/deepmerge-ts e demais critérios locais.

<!-- Planeja atualizar Nest na linha 11 para remover dependência Multer afetada. -->
# F09 — Nest 11 e Multer

## Escopo autorizado

NXT após lote ip-address/brace-expansion. Árvore inicialmente limpa.
Atualizar conjuntamente common, core, platform-express, platform-socket.io,
websockets e testing de11.1.28 para11.2.7. Manifest do backend passa a exigir
^11.2.7 nesses seis pacotes, preservando major11 e peers compatíveis. CLI,
schematics, jwt, passport, config e throttler mantêm versões próprias.
Platform-express11.2.7 fixa Multer2.4.0; não usar override contra pai antigo.
Arquivos previstos: services/backend/package.json, pnpm-lock.yaml, este plano,
roadmap F09 e contexto. Sem mudança de API, upload novo ou implementação.

## Riscos e callers

Todo bootstrap/controller/guard/interceptor depende do Nest; adaptadores HTTP
e Socket.IO também. Atualização do pai pode trazer Express e transitivas novas;
inspecionar lock e metadados, preservando resoluções alheias quando possível.
Backend não expõe FileInterceptor/FilesInterceptor/MulterModule; avisos de
Multer no grafo não comprovam exploração por endpoint existente.
Não migrar Nest12 nem Prisma/bcrypt neste lote. Não ler .env.

## Validação e limites

Baseline anterior ainda válida:46 suítes/964 testes, lint/build/tipos aprovados.
Gerar resolução por pnpm com scripts ignorados e inspecionar diff antes de
instalar. Instalar workspace congelado sem scripts e sem recriar dependências
por filtro. Não modificar allowBuilds. Conferir versões e peers efetivos,
unitários, lint, tipos e build. Audit deve separar backend do workspace.
Rebuild de imagem isolada após gates, sem deploy ou substituir serviços ativos.
Conferir bancada e portas antes de ensaio HTTP/Socket.IO real; somente dados
sintéticos e alvos isolados dos planos existentes, com limpeza e parada ao fim.
Não acessar banco remoto, aplicar migration externa, criar commit ou push.

## Fontes

Metadados npm dos pacotes e peers consultados em20/10/2026; peers Nest^11,
Socket.IO4.8.3 preservado no platform-socket.io. Tag oficial:
https://github.com/nestjs/nest/releases/tag/v11.2.7. Página de comparação GitHub
indisponível nesta consulta; não alegar revisão integral do diff upstream.

## Resolução e gates locais

pnpm update gerou o candidato e mudou apenas as seis faixas do manifest, mas
re-resolveu transitivas alheias (Metro, tipos Node, sourcemap, qs e outras).
Lock final conserva baseline fora de Nest/Multer: importador backend e peers
atualizados, sete blocos de integridade oficiais, Multer sem concat-stream.
Express5.2.1, Socket.IO4.8.3 e patches transitivos anteriores preservados.
Não manter snapshots colaterais só porque o resolvedor os propôs.

Instalação geral congelada sem scripts passou em11,2s, sem recriar workspace
ou perder Electron; assert do executável existente aprovado. Nenhuma regra de
build persistente alterada. Resoluções efetivas dos seis pacotes e do Multer
confirmadas via require e resolução do adaptador.

46 suítes/964 unitários, lint, TypeScript incluindo testes e build aprovados.
Audit backend18→13, zero avisos Multer: tar12 e deepmerge-ts1 permanecem,
1 crítico/9 altos/3 moderados. Não declarar auditoria global aprovada.

Imagem vers-backend:f09-nest-20261020 construída com instalação Linux nova
congelada, scripts permitidos, Prisma generate sem .env e build aprovados.
ID sha256:cebe50bc03afffaa08de14227408edb323bfdd3ee59f71f0cdee80a5b655c589.
Nenhum container de uso substituído; não equivale a smoke dessa imagem.

## Bancada

Inventário preservou seis containers VERS em uso; portas de ensaio livres.
Iniciada somente vers-realtime-rehearsal. Schema existente14 tabelas, constraint
de auditoria com auth.login, users/audit_events vazios. Certificado público
renovado e copiado ao output ignorado, sem copiar chave ou projeto.

Primeiro ensaio abortou antes de fixtures: Prisma não alcançou55432. Docker
mostrou HostConfig com binding correto e NetworkSettings sem publicação.
Reiniciar somente db-test não resolveu. Recriação somente db-test restaurou
binding127.0.0.1:55432, reutilizando volume
e163fd7f28e65406e8ab9f225ddedab6af9002009406d9b4e27b55e2a87581c6.
Sem alteração Compose/schema/migration. Referência do comportamento de volumes:
https://docs.docker.com/reference/cli/docker/compose/up/.

Reexecução aprovada:6/6 cenários bootstrap em92,699s, incluindo sessão HTTP,
auditoria SQL, criação/ciclo HTTP, MQTT/TLS, REST e recálculo após finish sem
outro lote. Transportes reais polling/websocket:2/2 em7,689s, outros cinco
cenários dessa suíte filtrados, sem alegar execução deles neste lote.
Conferência final:12 tabelas usadas vazias e SCAN auth:login:* vazio. Sem
limpeza manual/global. Bancada parada ao fim, volumes preservados; seis
containers de uso mantidos. Diff --check aprovado.

Entrega restrita a manifest, lockfile e docs. Nenhuma implementação nova,
regra de upload, migration, banco remoto, .env, commit ou push. F09 permanece
aberta por tar/bcrypt, deepmerge-ts/Prisma e demais critérios de fechamento.

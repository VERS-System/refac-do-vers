<!-- Planeja consolidar verificações locais sem deploy nem alteração de dependências. -->
# F09 — Contratos, Prisma e dependências

## Escopo autorizado

Continuidade NXT. Executar comandos existentes de shared-types (test:unit,
lint/build) e Prisma validate/generate com URL sintética explícita, sem conectar
banco nem carregar .env. Build backend antes da inspeção dos controllers.
Comparar rotas/métodos/status compilados com OpenAPI e validar referências
internas e unicidade de IDs de operação, quando presentes. Artefatos de inspeção
no diretório temporário vers-f09-validation do sistema, fora do Git; nenhuma
ferramenta ou dependência nova.

Consultar auditoria pnpm de produção em modo read-only, sem --fix/update ou
reinstalar dependências. O comando pode abranger workspace inteiro; distinguir
isso de impacto confirmado no backend. Registrar falhas de rede/ferramenta
sem declarar auditoria aprovada. Não imprimir segredos ou conteúdo de .env.

Somente plano/roadmap/contexto previstos como alterações versionadas. Corrigir
contrato apenas se divergência comprovada, documentando antes. Sem Docker,
serviços externos de aplicação, migrations, instalação, commit/push. Não
repetir ensaios reais anteriores por mudança documental. Secret scanning
completo e instalação limpa congelada não serão alegados sem evidência própria.

## Resultado — 19/10/2026

Shared-types: test:unit (asserções de compilação), lint e build aprovados.
Prisma validate e generate aprovados com URL sintética explícita; CLI confirmou
que não carregou arquivos de ambiente. Prisma Client gerado 6.19.3. Backend
build aprovado, sem iniciar aplicação ou consultar banco.

Inspeção temporária por metadados Nest dos oito controllers compilados encontrou
32 operações REST. Comparação com OpenAPI: 32/32 rotas/métodos/status alinhados,
242 referências internas resolvidas e parâmetros de caminho obrigatórios
definidos. OpenAPI não possui operationId: não foram inventados nem exigidos.
Primeira comparação confundiu nomes internos id com vehicleId/testId públicos;
comparador corrigido para normalizar nomes das posições parametrizadas. Sem
divergência funcional de rota demonstrada. Esta checagem não valida todos os
DTOs/campos/respostas nem substitui validador integral OpenAPI 3.1.

Scripts de inspeção e JSON de auditoria ficaram no diretório temporário
vers-f09-validation do sistema, fora do repositório. Usados Node/reflect-metadata
já instalados e PyYAML disponível no ambiente, sem adicionar dependências.

## Auditoria de dependências — pendências reais

`pnpm --filter @vers/backend audit --prod --json` falhou inicialmente por rede;
repetição autorizada retornou relatório e exit 1 por avisos. O filtro não
restringiu o relatório ao backend: workspace total reportou 87 avisos
(3 críticos/56 altos/25 moderados/3 baixos). Após filtrar caminhos que começam
com services__backend>, há 34 advisories em nove pacotes: 2 críticos, 17 altos,
12 moderados e 3 baixos. Contagem é por advisory, não por exploração comprovada.

| Pacote | Avisos no caminho backend | Origem principal |
| --- | ---: | --- |
| tar | 12 | bcrypt → @mapbox/node-pre-gyp |
| brace-expansion | 4 | bcrypt → node-pre-gyp → rimraf/glob/minimatch |
| deepmerge-ts | 1 | @prisma/client → prisma → @prisma/config |
| qs | 2 | Nest/Express/body-parser |
| joi | 4 | Dependência direta, instalada 18.2.3 |
| multer | 5 | @nestjs/platform-express |
| ip-address | 4 | mqtt → socks |
| engine.io | 1 | socket.io |
| proxy-addr | 1 | Express |

Avisos críticos reportados: tar
[GHSA-23hp-3jrh-7fpw](https://github.com/advisories/GHSA-23hp-3jrh-7fpw) e
proxy-addr [GHSA-jqcg-44mw-7w3h](https://github.com/advisories/GHSA-jqcg-44mw-7w3h).
Também conferido aviso Engine.IO
[GHSA-2gc4-cqfq-p2gv](https://github.com/advisories/GHSA-2gc4-cqfq-p2gv).
Fonte oficial do proxy-addr condiciona o problema à configuração de sub-rede
de proxy confiável; busca no src não encontrou trust proxy/trustProxy. Não
concluir exploração no VERS nem reclassificar toda a aplicação por essa contagem.
Busca tampouco encontrou interceptores de upload/MulterModule; instalação e
runtime precisam ser avaliados por pacote no recorte de correção.

Inventário instalado confirmou Nest 11.1.28, Socket.IO 4.8.3, bcrypt 5.1.1,
Prisma Client 6.19.3, Joi 18.2.3 e MQTT 5.15.2. pnpm list precisou de leitura
autorizada do store SQLite após bloqueio local. Não houve update, --fix,
override, instalação ou alteração de lockfile. Próximo recorte deve priorizar
árvores alcançáveis no runtime e separar dependências de instalação, verificando
compatibilidade e testes antes de mudar versões. Auditoria não está aprovada.

## Limites de fechamento

Somente documentação versionada alterada. Sem Docker, Neon, migration, .env,
commit/push ou repetição dos ensaios reais/unitários do backend, pois nenhum
código de produção/teste foi alterado. Build foi executado; verificações do
shared-types e Prisma são novas evidências deste lote. Instalação limpa com
lockfile congelado e secret scanning dedicado continuam pendentes; não havia
gitleaks/trufflehog disponível. Não transformar busca textual parcial em selo
de ausência de segredos. F09 permanece aberta, com avisos de dependência a tratar.

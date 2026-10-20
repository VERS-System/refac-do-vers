<!-- Planeja atualização isolada da dependência Joi sem alterar regras de configuração. -->
# F09 — Atualização isolada do Joi

## Escopo — 20/10/2026

Continuidade NXT após auditoria. Joi 18.2.3 é dependência direta usada somente
em config/env.config.ts. Quatro avisos reportados na árvore do backend. Patch
18.2.9 consultado no registro cobre as faixas corrigidas; versão mais recente
18.3.0 não é necessária neste lote. Node mínimo >=20 já atendido pelo backend.

Alterar apenas mínimo declarado do Joi para ^18.2.9 e resolução correspondente
no lockfile com pnpm, scripts de instalação desabilitados. Inspecionar diff e
impedir atualização colateral de outras dependências/importers. Não mudar
schema de configuração, validações, DTOs, contratos ou testes de produto sem
regressão demonstrada. Plano, roadmap e contexto recebem evidências/limites.

## Verificação

Revisão de boundary/callers e revisão independente previstas pela skill de
correção de achados. Os avisos são presença de versão afetada, não exploração
comprovada no VERS: não encontrado isoDate nem mensagens vindas do cliente.
Baseline: auditoria de 19/10 com quatro avisos Joi. Usar auditoria pós-atualização
como substituto focado, preservando cobertura legítima por env.config.spec e
test:unit completo. Sem introduzir teste que só espelha versão do pacote.

Executar lint, tipos, build e 962 testes existentes; nova consulta audit read-only
de produção, filtrando caminhos do backend. Não alegar correção de todos os
avisos da F09 nem vulnerabilidade explorável sem evidência. Sem .env, banco,
Neon, migration ou Docker neste lote: build da imagem ficará pendente até uso
em container, com aviso prévio conforme orientação do programador.

## Resultado — 20/10/2026

Outcome: fixed para presença de versão afetada na árvore de dependências; não
foi demonstrada exploração na aplicação. Manifest agora ^18.2.9, resolução e
integridade do pacote no lockfile correspondem a 18.2.9; nenhum alias antigo
Joi remanescente. Demais dependências e regras de configuração preservadas.

Investigação read-only independente confirmou ambiente do processo →
ConfigModule.forRoot(ignoreEnvFile:true) → envValidationSchema, antes de listen.
Nenhuma fonte HTTP/WS encontrada alcançando Joi. Schema usa tipos primitivos,
pattern/when/custom e mensagens constantes; não usa isoDate. Node local e
Docker atendem >=20. Revisão independente do candidato não encontrou bypass
concreto ou regressão; nenhum reviewer executou testes ou editou arquivos.

Fontes consultadas: registro npm (18.2.9 e engines/dependências) e avisos
[isoDate](https://github.com/advisories/GHSA-6h2x-m376-mqjq) e
[messages](https://github.com/advisories/GHSA-wr44-6hxh-3jwq). Não transportar
severidade do pacote para o VERS sem comprovar entrada controlada pelo atacante.

### Gates executados

- Baseline legítima: env.config.spec, 16/16 aprovados antes da atualização.
- Instalação inicial: add joi@18.2.9 --ignore-scripts terminou exit 1 por
  ERR_PNPM_IGNORED_BUILDS de Electron. Pnpm re-resolveu snapshots não relacionados
  e inseriu placeholder allowBuilds. Todas essas mudanças geradas foram retiradas;
  lock original preservado exceto importer/Joi/integridade/snapshot, e workspace
  ficou byte-normalizado sem diff. Nenhum build de dependência aprovado.
- Reconciliação: install --frozen-lockfile --ignore-scripts
  --config.strictDepBuilds=false passou, sem resolução/versão adicional e com
  política de supply chain aprovada. Flag temporária só evita erro pelos scripts
  ignorados; não executa scripts e não foi persistida na configuração.
- Diff final: somente package.json e três blocos Joi do lockfile, sem novo código
  de produto ou teste que espelhe versão. Lint, TypeScript noEmit, build e
  46 suítes/962 unitários aprovados. Regras válidas/inválidas continuam cobertas.
- Substituto focado da reprodução: auditoria antes tinha quatro avisos Joi;
  consulta read-only posterior tem joi_advisories=0. Total backend caiu de 34
  para 30: 2 críticos, 16 altos, 11 moderados e 1 baixo. Exit global audit ainda
  é 1 por outras dependências; não declarar segurança global aprovada.
- git diff --check aprovado; Node resolveu Joi instalado 18.2.9.

Sem PoC de exploração no VERS, banco, .env, migrations, Neon, Docker, commit/push.
Imagem container não reconstruída neste lote; precisa rebuild antes de usar o
lock atualizado em container. Sem instalação limpa em diretório vazio: o gate
congelado reconciliou node_modules existente. F09 segue aberta com 30 avisos.

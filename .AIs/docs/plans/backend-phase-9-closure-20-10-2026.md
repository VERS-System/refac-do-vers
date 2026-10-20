<!-- Organiza o fechamento da F09 com evidências e decisões operacionais explícitas. -->
# F09 — Plano de fechamento

## Autorização e alvo

Programador solicitou terminar a F09 em 20/10/2026. Não significa autorizar
acesso ao banco remoto, exclusão de dados ou escolher políticas operacionais.
Programador definiu demonstração local com dados sintéticos e registro dos
limites de produção. Implantação remota não integra este fechamento.
CI/CD continua fora do escopo. Não ler arquivos .env nem executar commit/push.

## Ordem de execução

1. Conferir checklist e evidências anteriores; preservar ensaios aprovados.
2. Executar baseline unitário, lint e build; atualizar inventário de dependências.
3. Tratar pacotes restantes em lotes mínimos com compatibilidade comprovada,
   testes e auditoria posterior. Não interpretar advisory como exploração.
4. Validar instalação congelada em ambiente limpo e imagem Docker atualizada.
   Inventariar serviços antes de iniciar bancada; não afetar outros projetos.
5. Completar runbook de rollout, smoke, rollback, diagnóstico e incidente,
   reutilizando saúde, logs e ensaios existentes; registrar métricas ausentes.
6. Registrar decisões de retenção, backups, alertas e ambiente com o responsável.
   Implementação dependente dessas decisões aguarda resposta explícita.
7. Reconciliar critérios A–F, índices e contexto com evidências verificáveis.
   Manter fase aberta se algum critério obrigatório permanecer sem atendimento.

## Arquivos previstos e impactos

Este plano, roadmap F09, README do backend e contexto diário. Manifests,
lockfile, Dockerfile e testes somente nos lotes que comprovarem necessidade,
com escopo anunciado antes da edição. Sem mudança de contrato REST/MQTT,
modelo de dados, política de descarte ou integração Electron implícita.

## Evidências deste lote

- Árvore inicialmente limpa. Baseline: 46 suítes/964 testes, lint, build e
  TypeScript noEmit aprovados. Nenhuma implementação de produto alterada.
- Docker inventariado: seis containers VERS ativos, todos preservados.
  Construída somente imagem vers-backend:f09-local-20261020,
  ID sha256:3c8700d6876cf7be87e513f3c91da4b0687741d5f20f3976b1627b2d7861bbd2.
  Sem deploy, substituição de container ou acesso a banco remoto.
- Builder Linux baixou 1.058 pacotes em instalação congelada nova, sem
  node_modules do host; scripts permitidos, bcrypt e Prisma executados.
  Prisma confirmou ausência de carregamento de ambiente. Build aprovado.
- Autoteste sem rede da imagem confirmou hash/compare bcrypt real, export do
  Prisma Client, entrada compilada e migration posterior de auditoria presente.
  Primeira tentativa falhou por aspas PowerShell; repetição por stdin passou.
  Não equivale a smoke HTTP ou ensaio completo dentro dessa imagem.
- Auditoria atual manteve 26 avisos backend: tar12, brace-expansion4,
  deepmerge-ts1, multer5 e ip-address4 (cinco nomes de pacotes).
  Correção versus pendência explícita na demonstração consultada ao programador.
  Nenhuma dependência alterada neste lote; auditoria não aprovada.
- Gitleaks oficial, digest
  sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f,
  analisou cópia de 858 arquivos correntes sem .env ou variantes, inclusive
  .env.example. Sem rede no scanner. Um achado generic-api-key na linha9 de
  login-attempts.service.spec.ts: segredo fictício em config mockada, Redis
  mockado. Resultado bruto exit1, triagem: fixture de teste; não alegar zero
  achados nem cobertura do histórico Git/arquivos de ambiente.
- Cópia temporária output/f09-secret-scan removida após análise e reclamação
  do programador. Primeira seleção teve um nome Unicode mal interpretado;
  repetida com core.quotepath=false e 858 cópias confirmadas antes da análise final.
- Criado services/backend/OPERACAO.md e vinculado no README: entrega manual,
  retorno seguro, diagnóstico acompanhado, dados sintéticos e incidente.

F09 ainda aberta: decisão dos avisos pendente; smoke da imagem e critérios
restantes devem ser reconciliados antes de declarar fechamento local.

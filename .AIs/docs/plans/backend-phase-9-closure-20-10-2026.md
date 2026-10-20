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

## Evidências preliminares — histórico

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

Naquele lote, F09 ainda estava aberta. Os avisos e o smoke foram tratados nas
continuações; o estado final está na matriz de fechamento abaixo.

## Recorte final autorizado — continuação NXT

Depois dos lotes de dependências, conferir imagem final sem substituir stack
de uso: temporário vers-f09-image-smoke, porta exclusiva127.0.0.1:53001,
rede da bancada sintética, apenas db-test/redis-test ativos, MQTTfalse e
credenciais exclusivamente sintéticas pelo ambiente explícito. Conferir saúde,
envelope/requestId, CSRF e recusa de rota protegida sem sessão. Nenhum login
ou usuário novo necessário no smoke; auth/MQTT já possuem ensaios próprios.
Remover somente o temporário criado e parar a bancada, preservando volumes.

Consolidar matriz A–F para o alvo aprovado: demonstração local assistida,
sem dados reais. Alertas/retenção/backup remoto e Electron/API permanecem
limites explícitos; não declarar conclusão de implantação de produção.

Para validar também migrate deploy com o merger corrigido, reensaiar as duas
migrations em banco descartável f09_final_migrations_20261020 da bancada e
restaurar dump em f09_final_restore_20261020. Conferir ausência dos dois nomes
antes de criar. Inserir só sentinela sintética, comparar dumps schema/dados e
histórico, repetir deploy sem pendências; remover somente esses dois bancos
criados nesta execução ao terminar. Nunca usar banco de aplicação ou remoto.

## Fechamento — demonstração local sintética

**Concluído em 20/10/2026 para o alvo escolhido pelo programador.** Não é
aceite de implantação remota nem declaração de implementação dos requisitos
de produção. A matriz abaixo delimita o que foi entregue e o que ficou fora.

| Etapa | Evidência local e limite |
| --- | --- |
| A — Ponta a ponta | Seis cenários bootstrap com HTTP/CSRF, auditoria SQL, MQTT/TLS, ciclo de teste, energia e recuperação sem novo lote; polling/websocket2/2 no lote Nest. Dois casos auth repetidos após bcrypt6. Contas ativas e montagem são fixtures; Electron/API permanece separado. |
| B — Validação |47 suítes/969 testes, lint/tipos/build, Prisma validate/generate e instalação congelada aprovados. Audit produção dos caminhos backend zero. Contratos32 operações/242 referências conferidos no lote anterior, sem mudança de controller/schema. Gitleaks: um achado triado como fixture fictícia; arquivos de ambiente e histórico excluídos. Não é auditoria global. |
| C — Imagem e recuperação | Imagem final com instalação Linux nova, testes do carregador2/2 e smoke HTTP real. Duas migrations aplicadas em banco vazio, segunda execução sem pendências; pg_dump custom restaurado, sentinela e dois históricos recuperados, migrate status atualizado. Rollout/retorno documentados, sem deploy de uso. |
| D — Operação assistida | Health banco/Redis/MQTT, logs HTTP com duração/requestId e sinais MQTT existentes descritos no runbook. Smoke validou envelope/requestId. Sem coletor, alerta automático, trace distribuído ou SLO; operador acompanha demonstração. |
| E — Dados sintéticos | Sem dados pessoais reais. Limpeza própria por IDs nos ensaios; preservação dos volumes, runbook de incidente e proibição de limpeza global. Retenção temporal automática, direitos de titulares reais e políticas jurídicas de produção não implementados neste recorte. |
| F — Documentação | README e OPERACAO do backend, runbook do banco, planos de ensaio e esta matriz versionados. CI/CD fora do escopo; comandos continuam manuais. |

### Imagem final e smoke

Tag `vers-backend:f09-final-20261020`, ID
`sha256:6fc03ce2622e9484e803189bc8cdff41a04780860dfac670de9b6ee2a8fa47f4`.
Node24/pnpm11.21.0, Prisma6.19.3, Nest11.2.7, bcrypt6.0.0 e Socket.IO4.8.3.
Override restrito do merger registrado no plano Prisma/deepmerge. A imagem
preserva tooling/devDependencies pelo Dockerfile atual; zero avisos de produção
do backend não significa varredura integral da imagem ou do workspace.

Temporário vers-f09-image-smoke usou somente rede da bancada, porta
127.0.0.1:53001, ambiente sintético explícito e MQTTfalse. Verificados HTTP200
live/ready com database/redis ok, MQTTdisabled, envelope/header requestId,
CSRF/token/cookie e401 em users/me sem sessão. Nenhum login ou registro criado.
Stop encerrou com exit0; temporário removido, sem substituir stack de uso.

### Recuperação final

Bancos novos f09_final_migrations_20261020/f09_final_restore_20261020 tiveram
nomes conferidos livres antes da criação. Aplicadas as duas migrations atuais
com Prisma corrigido, deploy repetido sem pendências. Sentinela fictícia
recuperada via pg_dump-Fc/pg_restore --exit-on-error; migrate status aprovado.

Comparação inicial dos dumps não foi byte-idêntica: PostgreSQL deparsing mudou
somente o cast de arrays da constraint audit_events_codes_valid. As demais
linhas de schema/dados eram idênticas após retirar tokens aleatórios do dump.
Ambos os bancos aceitaram78 combinações válidas e rejeitaram quatro inválidas
sob rollback, confirmando esse comportamento da constraint; não alegar prova
formal de toda semântica SQL. Sentinela e duas migrations conferidas no restore.

Os dois bancos e dump temporário removidos; consulta final confirmou zero
bancos com esses nomes. No vers_test,12 tabelas de ensaio continuaram vazias e
SCAN auth:login:* vazio. Bancada parada, volumes preservados e seis containers
de uso mantidos. Sem .env, banco remoto, commit/push ou implantação.

### Pendências externas ao fechamento local

Integração Electron/API, ativação de conta/montagem sem fixtures, produção com
dados reais, backups externos/retencão/RPO/RTO, alertas e métricas exportadas,
deploy/recuperação remotos e hardening da imagem exigem recortes próprios.
Não transportar o aceite da demonstração local para esses cenários.

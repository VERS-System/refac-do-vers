<!-- Planeja a integração incremental do dashboard Electron com o backend real e dados sintéticos. -->
# Integração Electron ↔ backend VERS

> **20/10/2026 — lote 0 concluído:** [matriz dos37 métodos e lacunas](desktop-backend-contract-matrix-20-10-2026.md).
> Programador confirmou API local da demonstração e área demonstrativa
> identificada para campos sem contrato. Sem fallback silencioso em falha real.
> Lote1 implementado: [prova de sessão dev/build e persistência](desktop-backend-session-lot1.md).
> Sessão permanece ao reabrir até expirar ou encerrar, conforme decisão do programador.
> Lote2 implementado: [autenticação real da interface](desktop-backend-auth-lot2.md).
> Lote3 concluído: [cadastro real e seleção de instalação](desktop-backend-cadastro-lot3.md).
> Próximo lote: testes/telemetria/energia/exportação (lote4).

## Objetivo e limites

Planejamento solicitado em 19/10/2026. Conectar o dashboard Electron ao NestJS
existente, mantendo os dados de demonstração simulados e persistidos no backend.
Não depende de ESP32, sistema elétrico, CI/CD ou GitHub Actions. Este documento
não inicia implementação nem autoriza operações no Neon.

Continuidade NXT em20/10 autorizou o inventário após fechar F09 local; decisões
da primeira entrega: API local e lacunas em demonstração identificada. As
demais decisões abaixo continuam pendentes antes do lote correspondente.

Entrega em lotes pequenos, revisáveis e testados; commits/push pelo programador.
Uma tela integrada deve mostrar os dados persistidos ou um estado explícito de
indisponibilidade, sem cair silenciosamente nos exemplos quando a API falhar.

## Estado encontrado

- `services/dashboard/src/renderer/App.tsx` cria `criarRepositorioMock` por padrão.
  `data/repositorio.tsx` já define RepositorioVers e permite injeção nos testes;
  `hooks/useDados.ts` já concentra TanStack Query. Reutilizar essas peças.
- `renderer/services/api.ts` usa Axios, credenciais e `/api/v1`; proxy do Vite
  aponta a localhost:3000. Esse caminho relativo não resolve a API no app
  empacotado, que abre HTML local via `loadFile` em `src/main/index.ts`.
- Main mantém sandbox e contextIsolation ativados, nodeIntegration desativada;
  preload expõe apenas plataforma. CSP permite API/socket em localhost:3000.
- `renderer/services/mqtt.ts` usa auth.token, namespace raiz e evento telemetry;
  não corresponde ao backend atual. O desktop não deve acessar o broker MQTT.
- Backend usa cookies HttpOnly, SameSite=Lax, Secure em produção, CSRF e validação
  de Origin. Socket.IO usa `/realtime`, sessão em cookie, subscribe/unsubscribe
  com ACK e evento `data.updated`; valores vêm do REST autorizado.
- REST oferece auth, usuário, veículos, instalações/configurações, testes,
  telemetria por teste, resumos por teste/instalação, comparação e suporte.
  A interface do repositório também pede recursos sem equivalência direta.

Referências: [OpenAPI](../Api/openapi.yaml), [contrato de tempo real](../Api/realtime-contract-v1.md),
[roadmap desktop](desktop-frontend-roadmap.md), [F09](backend-roadmap/09-operacao-entrega.md).
Trechos históricos desses documentos podem ter status antigo; na implementação,
conferir controllers, DTOs, shared-types e testes atuais antes de alterar contratos.

## Ordem dos lotes

### 0 — Matriz de contratos e decisões de dados

Inventariar todos os métodos RepositorioVers, consumidores e tipos de tela.
Para cada método, registrar rota/método, DTO, resposta, permissão, unidade,
paginação/filtros, nulabilidade e lacuna. Não fazer um adaptador genérico antes
de conhecer as diferenças. Atualizar OpenAPI/shared-types somente quando houver
mudança real aprovada de contrato.

| Área da interface | Base REST existente | Conferência ou lacuna |
| --- | --- | --- |
| Login/cadastro/perfil/sessões | auth e users/me | Cadastro aceita solicitação, sem sessão automática; confirmar ativação da conta de demonstração. |
| Veículos e veículo ativo | vehicles | Conferir regra de principal/substituto e IDs reais; não selecionar primeiro item silenciosamente. |
| Instalação/configuração | installations e configurations | Resolver vínculo pelo veículo e acesso; representar ausência de instalação. |
| Testes e transições | tests, start, finish, cancel | Mapear estados, payloads e conflitos; não antecipar sucesso na interface. |
| Telemetria e exportação | tests/:id/telemetry | Paginação completa, filtros, qualidade, UTC e conversão de unidades. |
| Energia/comparação | energy-summaries e test-comparisons | Conferir períodos, agregações, tarifa, nulos e cobertura dos gráficos. |
| Suporte/revisões | support-requests | Revisão da tela não equivale automaticamente a chamado; mapear semântica antes. |
| Bateria/cadeia/celular/logs/dispositivo | Sem correspondência garantida para todos os campos | Medições, percentuais e curvas podem não existir no contrato; decisão necessária. |
| Viber, conversas e mensagens | Sem rotas equivalentes no core inspecionado | Integração separada com ai-service; não bloqueia o núcleo. |

Aceite: nenhum método usado pelas telas tratado como integrado sem mapeamento.
Lacunas podem ficar indisponíveis, continuar em demonstração claramente separada
ou ganhar contrato próprio, conforme decisão do programador.

### 1 — Prova de transporte e sessão no Electron

Antes de migrar telas, provar login → users/me → refresh → logout no Electron
em desenvolvimento e executando build local. Investigar Origin, cookies,
SameSite/Secure, CORS, CSRF, CSP e compartilhamento de sessão REST/Socket.IO.
O teste em navegador ou Axios isolado não comprova o app empacotado.

Proposta inicial: manter renderer e repositório; testar origem estável para o
conteúdo empacotado. Comparar protocolo próprio com eventual transporte pelo
main somente se necessário, documentando evidência e decisão antes da mudança.
Protocolo próprio não garante por si só envio de cookies SameSite=Lax.
Não aceitar Origin null genericamente, desativar webSecurity, ampliar CORS para
* ou transformar IPC em proxy arbitrário de URLs/headers.

Configurar endereço público da API sem segredos, validar esquema/host e manter
CSP coerente. HTTP local apenas para bancada; destino de distribuição/HTTPS
depende de definição do programador. Não escolher hospedagem neste lote.

Arquivos candidatos: main/index.ts, main/seguranca.ts, preload/index.ts e tipos
da ponte se necessária, electron.vite.config.ts, renderer/services/api.ts e
testes correspondentes; config de backend somente se demonstrada necessidade.

Transporte validado: net.request no main, origin fixo localhost5174 e partição
persistente exclusiva da API. Configuração HTTP aceita somente localhost,
mantendo o mesmo site da origem. Seis instâncias Electron reais passaram nos
modos dev e loadFile/build, incluindo reabertura e encerramento.

Aceite: cookies HttpOnly inacessíveis ao renderer, CSRF/Origin válidos,
renovação/encerramento reais e nenhum enfraquecimento dos controles existentes.
Falha neste lote bloqueia a adoção do transporte nas telas seguintes.

### 2 — Cliente HTTP e autenticação da interface

Implementação local registrada no plano do lote2: autenticação/perfil reais,
cadastro pendente, rotas privadas, renovação limitada, logout e isolamento de
cache. Demais métodos ainda demonstrativos e identificados até seus lotes.

Implementar cliente e repositório real sobre a interface existente; extrair
data/meta/requestId e tratar respostas sem body (202/204), timeout, rede e
erros de domínio. Nunca persistir JWT em localStorage ou retornar cookies ao JS.
Obter CSRF antes das mutações e renovar conforme o contrato após troca de sessão.

Uma renovação em andamento atende requisições concorrentes; sem loops de 401.
Não repetir mutação automaticamente após timeout nem cadastrar duas vezes.
Repetição após falha de auth precisa respeitar se a operação chegou a executar.
Erros 403/409/422/429/503 recebem mensagens e estados adequados, sem vazamento
de corpo bruto ou credenciais. Usar códigos efetivamente definidos no contrato.

Consultar users/me ao abrir app; distinguir carregamento, sessão ausente e
backend indisponível. Proteger navegação interna da interface sem substituir
guards do backend. Logout limpa cache/dados da conta e desconecta socket;
troca de usuário não pode reutilizar consultas anteriores.

Aceite: login/cadastro/perfil/logout-all reais; rejeição, expiração, concorrência,
reinício do app e isolamento entre duas contas cobertos. Decidir persistência
da sessão ao fechar o app com o programador; não presumir requisito.

### 3 — Veículos, instalação e configurações

Concluído no escopo local: CRUD, principal/substituto, leituras autorizadas,
seleção explícita entre instalações, estados nulos e primeiro veículo por conta.
602 testes e ensaio Electron real dev/build aprovados; evidências no plano do lote3.

Implementar leitura e mutações suportadas; onboarding sem veículo/instalação,
validações de campos, principal/substituto e estados sem vínculo. Invalidar
somente consultas afetadas após confirmação do servidor. IDs do backend nas
rotas e chaves de cache; seleção de recurso integra essas chaves.

Aceite: criar/editar/remover veículo respeita contrato, recarregar mantém dados,
conta sem acesso não lê nem altera veículo de outra conta. Configurações sem
endpoint equivalente ficam explicitamente pendentes.

### 4 — Testes, telemetria, energia e exportação

Integrar testes/transições, consulta de amostras, resumos e comparação. Reutilizar
adaptadores puros pequenos para DTO → modelo de tela, sem duplicar cálculos
oficiais de energia. Backend entrega Wh/W/V/A; converter unidades apenas na
apresentação conforme campo real. Diferenciar zero, sem amostras e valor nulo.

Conferir UTC/fuso, limites dos períodos e compatibilidade dos buckets existentes
com Hora/Dia/Semana/Mês da interface. Não somar resumos sobrepostos nem usar
média simples de médias. Ausência de endpoint para uma curva pode exigir
decisão própria; não baixar toda a telemetria para simular uma API de agregação.
Exportação respeita filtros e todas as páginas necessárias, com limite explícito.

Aceite: lista paginada, estados vazios, transições conflitantes, resumo e CSV
coerentes com fixture conhecida. Percentual para bateria/celular só entra quando
origem, denominador e regra estiverem definidos; nunca inventar eficiência fixa.

### 5 — Tempo real e recuperação

Substituir ou remover cliente legado mqtt.ts após localizar todos os callers.
Conectar /realtime por cookie; listener antes da assinatura; subscribe com ACK
do teste/instalação selecionado; após ACK buscar snapshot REST. Em data.updated,
invalidar chaves afetadas, inclusive comparação, agrupando avisos em rajada.
Não usar occurredAt como cursor nem ignorar dados tardios.

Na reconexão, reassinar e buscar snapshot novamente; no unmount/troca de recurso,
remover listener e assinatura antigos. Refetch autorizado também em retorno de
foco e estratégia limitada de reconciliação a definir no lote: eventos podem
se perder entre commit e publicação, mesmo sem desconexão percebida.

Aceite: dois clientes, recurso não autorizado, duplicata, rajada, queda de
rede/Redis, sessão revogada e troca de conta sem vazamento. MQTT desativado
mantém consultas REST; distinguir falta de eventos de erro de autenticação.

### 6 — Ensaio completo e entrega manual

Usar bancada local autorizada e contas sintéticas com vínculos conhecidos.
Testar pelo Electron: login → veículo/instalação → teste iniciado → publicação
simulada MQTT/TLS → persistência → aviso → atualização REST na tela → término
e consulta do resumo. Provar que duplicata não soma energia e outra conta não
acessa o recurso. Fechar/reabrir app e interromper dependências durante o ensaio.

Validar build local e pacote instalável Windows; registrar versão, comandos,
evidências, limites e limpeza somente dos dados criados. Sem push automático.
Aceite final do núcleo: nenhum mock silencioso nas telas integradas, nenhum
segredo no renderer/pacote, fluxo demonstrável sem hardware e sessão funcional
também fora do servidor Vite. Recursos adiados ficam identificados no plano.

## Validação por lote

TDD para comportamento novo: primeiro teste que falha, depois implementação.
Unidade: cliente/envelopes/CSRF/renovação, mapeamentos, cache e reconexão.
Interface: loading/erro/vazio/autorização, formulários e navegação com repositório
injetado. Integração: backend real e Electron real para cookies/Origin; não
substituir essa evidência por JSDOM. Rodar test:unit e typecheck do dashboard,
build dos três alvos Electron; backend test:unit/lint/build se houver mudança.

Respeitar proibição de ler .env inclusive no carregamento automático de Vite.
Usar configuração de testes/build sem envDir e ambiente sintético explícito,
como no ensaio anterior. Não executar ferramentas que carreguem .env por padrão.
Sem alteração funcional neste planejamento: não foi necessário repetir testes.

## Decisões a fechar antes do lote correspondente

1. Distribuição: API local na demonstração ou destino HTTPS para distribuição?
2. Sessão: decidido manter até expirar/encerrar; reabertura validada com cookie real no lote1.
3. Lacunas de dados: qual tratamento desejado para bateria/celular, logs e Viber?
4. Períodos: fuso e definição de semana dos gráficos ao comparar com os buckets?
5. Conta de demonstração: provisionamento/ativação sintéticos, sem criar fluxo
   falso de confirmação de email ou serviço externo não existente.

Essas decisões não impedem o inventário do lote 0. Primeira entrega proposta:
matriz completa + prova de sessão no Electron, antes de migrar todas as telas.

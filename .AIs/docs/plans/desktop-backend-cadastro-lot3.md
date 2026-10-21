<!-- Planeja o cadastro real e leituras autorizadas de instalação no desktop. -->
# Lote3 — veículos, instalação e configurações

NXT autorizado; programador decidiu exigir escolha explícita quando houver
mais de uma instalação, inclusive se apenas uma estiver ACTIVE. Uma instalação
única pode ser exibida; nenhuma retorna estado vazio, sem selecionar dados mock.

Ampliar main/preload/shared com operações fixas de veículos (CRUD), instalações
e configurações. Sem proxy IPC arbitrário. Mesma partição de cookies e fila
para sessão/cadastro; validar payload, UUID, paginação e respostas públicas,
CSRF antes de mutação e renovação em leituras. Não repetir mutações.

Criar adaptador cadastro para os modelos existentes, lendo todas as páginas
com limite explícito e falhando se incompletas. Sem principal retorna null;
sem instalação/dispositivo retorna null. Preservar nulos e não inventar SOC,
topologia, hardware, plataforma ou protocolo. Campos ausentes serão indicados
na tela; restante demonstrativo deve ficar claramente separado do veículo real.

Atualizar interface/hook e consumidores afetados: nullable veículo/dispositivo,
seleção de instalação compartilhada por veículo e limpa entre contas, cache
por recurso selecionado, configuração somente leitura. Reativar primeiro veículo,
CRUD e substituto do principal; erros não podem virar ausência/sucesso fictício.
Ajustar cards/sidebar e desabilitar logs sem contrato do dispositivo real.

Arquivos: main/index e novo cadastro/testes, preload, shared/cadastro e sessao;
renderer adaptador/testes, repositório/tipos, hooks, seleção e consumidores;
AplicacaoConectada/App, cards de veículo/instalação/dispositivo, scripts, docs.
Sem backend, migração, dependência, deploy ou operações no banco da API3000.

TDD: limites IPC, paginação, mapeamentos, nulos, seleção, cache e erros antes
da implementação. Suíte completa, typecheck/build e Electron dev/build com
API/Postgres/Redis isolados, duas contas e fixtures conhecidas de instalação.
Confirmar CRUD persistido, principal/substituto, acesso alheio404, escolha entre
duas instalações, versões, vazios e limpeza exclusiva dos registros do ensaio.

## Resultado e validação

Ponte fixa cadastro (shared/preload/main) implementada, com saneamento de
respostas públicas e validação de UUID/payload/meta. Sessão e cadastro usam
fila única; autorizar/refresh não se intercalam com mutações. Listas são
paginadas de100 em100, limite explícito de10 mil itens, sem truncamento
silencioso ou repetição automática de mutações. Total/duplicatas inconsistentes
produzem erro e pedem atualização da consulta.

Adaptador traduz campos/enums, omite null ao criar e preserva null ao editar.
Sem principal retorna null. Seleção de instalação fica em memória por veículo,
limpa ao trocar conta; mais de uma exige escolha mesmo com única ACTIVE.
Hooks compartilham a mesma lista autorizada e derivam dela o dispositivo,
evitando cache de hardware divergente. Versões têm cache por installationId.

Cadastro/primeiro veículo, edição, promoção e remoção com substituto reais.
Primeiro veículo lê rascunho somente após confirmar email da conta; não apaga
rascunho de outra pessoa. Remoção com instalação exige confirmação avisando
do efeito ao excluir o último vínculo. Nenhuma seleção implícita do primeiro
veículo foi mantida nas fichas/principal.

Nulos e vazios explícitos; falhas404/rede não viram ausência. Topologia, total
de piezos, porcentagem, circuito LTC3588/TP4056 e química/capacidade não são
inventados na instalação real. Todas as versões públicas são listadas, sem
afirmar qual é ativa. Dispositivo usa nome/status públicos e informa campos
ausentes; logs reais ficam indisponíveis. Medições, testes, revisões e Viber
permanecem demonstração sem vínculo com veículo real, identificados no shell
e nos painéis compostos. Revisões/suporte não foram integrados neste lote.

TDD: fronteira IPC, paginação/mapeamento, seleção compartilhada, painel real,
erro versus vazio e isolamento do rascunho. Suíte completa:602 testes aprovados;
typecheck e build main/preload/renderer aprovados. Avisos conhecidos de Canvas
no jsdom, sem falhas. Corrigida remontagem prematura do formulário mock após
carregamento do perfil; casos existentes e novo isolamento entre contas passaram.

Ensaio Electron real ampliado, seis processos dev/build/loadFile aprovados:
login/perfil; duas instalações (ACTIVE e MAINTENANCE) exigindo escolha;
configuração acompanha troca sem manter a versão anterior; criação/edição de
veículos pelo formulário; principal e remoção com substituto explícito;
persistência após reabrir; refresh único; segunda conta sem veículo; PATCH de
veículo e leitura de configuração alheios retornando404; primeiro veículo
persistido como principal e logout. Banco confirmou principal esperado,
veículo original inalterado, cadastros pendentes e sessões revogadas.

Uma execução inicial parou na limpeza por FK Restrict; ordem corrigida para
remover vínculos antes dos veículos, com transação e finally para recursos.
Três contas/veículos do ensaio interrompido foram identificados e removidos
por IDs após conferir ausência de vínculos externos; pasta temporária exata
também removida. Repetição completa passou com a limpeza corrigida.

Sem mudanças no backend, schema, .env, dependências, API3000 ou seus dados.
Sem deploy, commit/push. Uso cotidiano ainda requer conta ativa provida pelo
responsável pela bancada. Foto/upload, chatbot real, tempo real e pacote
Windows continuam pendentes nos seus escopos.

Status: lote3 concluído para demonstração local. Próximo lote4: testes,
telemetria, energia e exportação, sujeito às decisões de período/fuso.

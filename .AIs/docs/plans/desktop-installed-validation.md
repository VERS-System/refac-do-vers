<!-- Planeja a instalação NSIS autorizada e a validação do executável instalado. -->
# Validação da instalação Windows — 20/10/2026

Concluída: NSIS executado e aplicação instalada validada nos cinco estágios.

Responsável autorizou executar o próximo passo: instalar/conferir o pacote,
deixando Viber para depois. Preservar perfis e processos existentes.

1. Conferir hash do NSIS e registros HKCU/HKLM antes de instalar. Se houver
   instalação VERS existente, não sobrescrever. Destino dedicado no workspace:
   output/desktop-installed; somente usuário atual e sem elevação do instalador.
   Na execução o NSIS truncou esse caminho no primeiro espaço e instalou em
   C:/Users/pantv/Documents/repositories/refac. Todos os arquivos foram comparados
   por hash ao pacote antes de executar somente seu desinstalador (exit0).
   Destino corrigido, sem espaços: %LOCALAPPDATA%/Programs/VERS-Dashboard.
2. Executar NSIS em modo silencioso, pois o controle nativo Windows/node_repl
   não está disponível nesta sessão. Registrar exit code, arquivos e registro
   de instalação. Não aceitar alertas/permissões de segurança automaticamente.
3. Iniciar executável instalado com perfil de teste isolado e API da bancada;
   validar aplicação real, sessão e fluxo simulado. Usar automação/debug de
   desenvolvimento somente no processo criado para este teste, sem editar o
   conteúdo instalado nem encerrar Electron do usuário.
4. Limpar fixtures/serviços próprios e documentar evidências, limitações e
   localização da instalação. Não desinstalar automaticamente a entrega.

Antes de alterações de código: ampliar somente scripts de ensaio se necessário
para alcançar o executável instalado. Nenhuma mudança prevista no produto,
schema, dependências, Viber ou instalador já gerado. O hash deve permanecer igual.

## Resultado da instalação e correções locais

Não existia instalação VERS registrada antes do ensaio. Após conferir SHA256 do
instalador, executado /S /currentuser /D=destino. O caminho com espaços foi
truncado pelo instalador em C:/Users/pantv/Documents/repositories/refac. Antes
de corrigir, todos os arquivos desse destino foram enumerados e comparados por
hash com win-unpacked, aceitando somente o desinstalador como arquivo adicional.
Desinstalador próprio executou com exit0; pasta final vazia removida com caminho
literal, sem exclusão recursiva de conteúdo alheio.

Instalação corrigida em C:/Users/pantv/AppData/Local/Programs/VERS-Dashboard,
sem espaços. NSIS exit0; registro HKCU exibe VERS Dashboard0.1.0 e desinstalador
nesse destino. Instalador preservado:
SHA256 f08eae701b2b0233e54f93115f867eeeb0d703289a09570f13cb8b9a13eb60f0.
EXE instalado e win-unpacked iguais:
0b797111931410e6df629ff0f5c5c88d2aa102872c7007d858d326612792e060.
ASAR instalado e win-unpacked iguais:
eb2114aa34edb1a560c674f0a3b584613c2ec874cc89e1307c68aef5f9d0349a.

Primeiro startup instalado encontrou falha fatal install_dir_access: ACL herdada
continha SIDs AppContainer específicos do ambiente Codex, sem ALL APPLICATION
PACKAGES. Após leitura da ACL e autorização pela execução escalada, concedido
somente RX herdável a S-1-15-2-1 na pasta VERS-Dashboard. Não alterados perfis,
API, Windows global ou permissões de outros diretórios. Sandbox mantido ativo.
Esse é ajuste do ambiente local; não modifica o instalador ou o conteúdo dos
arquivos. Não afirma que outra máquina precise desse mesmo ajuste.

## Prova do executável instalado

Session-rehearsal.mjs recebeu --instalado executavel. Novo installed-inspector.mjs
reserva porta53101 local e conecta ao inspector do processo recém-criado com
--inspect-brk. Antes de ready, verifica o estado e injeta apenas o helper de
ensaio: perfil temporário, janela oculta, listener e auditoria próprios. O main
que inicia é o do executável instalado; não reimporta main do checkout/ASAR
externo. Inspector desconectado após retomar; nenhuma mudança no código instalado.

Cinco estágios aprovados: instalado/login, realtime, mqtt, resume, logged-out.
Login/cadastro/perfil, CRUD/instalação explícita, energia/CSV, cookies HttpOnly,
dois clientes, rajadas, quedaRedis, snapshot perdido e revogação passaram.
Simulador MQTT/TLS produziu10 amostras2W na tela; duplicata mantém10; término
gerou resumo GOOD0,005Wh (18/3600) pelo ciclo normal. Reabertura/refresh e contaB
negada no recursoA passaram. No estágio MQTT, controlador termina apenas o PID
próprio depois de todos os asserts, conforme limite já registrado no lote6.

Sintaxe dos scripts e diff conferidos. Binário e aplicação de produto não
alterados; base de686 testes do lote6 permanece aplicável. Viber não alterado.
Sem novo build/dependências/schema, leitura de .env, deploy ou commit/push.

Validação na máquina atual com API53000 da bancada e simuladores; não é prova
em outro computador ou do assistente gráfico interativo. Instalação mantida para
uso; API padrão do app é localhost:3000/api/v1 e precisa estar disponível.

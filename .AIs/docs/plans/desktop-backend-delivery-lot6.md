<!-- Planeja a prova ponta a ponta exclusivamente simulada e o pacote desktop local. -->
# Lote 6 — simulador MQTT/TLS e entrega Windows

Concluído em20/10/2026 para a demonstração local com simuladores e entrega manual.

Escopo autorizado: demonstração local, somente simuladores. Sem hardware,
deploy, migração, commit/push ou operações em serviços externos de produção.

1. Reutilizar simulador MQTT compilado, contrato e bancada Mosquitto TLS já
   existentes. Renovar certificado público, sem expor chave privada.
2. Ampliar session-rehearsal/session-electron com opção MQTT explícita: backend
   normal compilado, MQTT_ENABLED=true, credenciais sintéticas e CA local.
   Fixtures próprias, sequência persistida entre modos, limpeza de mensagens
   antes de remover dispositivos. Não modificar containers de uso.
3. Electron dev/build: sessão restaurada, instalação/configuração explícitas,
   teste iniciado, dez amostras2W do simulador por MQTT/TLS, persistência e aviso
   real até a tela. Duplicata não acrescenta amostras/energia; término gera
   resumo TEST conhecido (18/3600Wh). Outra conta continua sem acesso.
4. Revisar configuração electron-builder, gerar Windows x64/NSIS local sem
   publicação nem assinatura paga. Arquivos permitidos: out, package.json e
   dependências de execução; conferir ausência de .env/segredos no pacote.
5. Validar suíte dashboard/typecheck/build, ensaio real e conteúdo do pacote.
   Registrar hash/localização do instalador e limites da validação. Instalação
   no perfil habitual do usuário não será executada automaticamente.

Arquivos: scripts session-rehearsal.mjs/session-electron.cjs, novo helper
mqtt-electron.cjs, electron-builder.yml e testes de configuração se necessário.
Reutilizar código de produto; novas rotas, abstrações de transporte e dependências
não são previstas. Fechar somente após provas; impedimentos ficam documentados.

## Execução e validações já concluídas

Configuração Windows x64 NSIS usa output/desktop-delivery (ignorado no Git),
sem rebuild de módulos nativos opcionais e sem assinatura. Referências a ícones
inexistentes removidas; ícone padrão nesta demonstração. Instalador gerado por
`pnpm.cmd --filter @vers/dashboard exec electron-builder --win nsis --x64 --publish never`.
Nenhum segredo de assinatura ou publicação foi configurado.

Artefato: `output/desktop-delivery/VERS Dashboard Setup 0.1.0.exe`,120151705 bytes.
SHA256: `f08eae701b2b0233e54f93115f867eeeb0d703289a09570f13cb8b9a13eb60f0`.
package-check.mjs confere8634 entradas, main/preload/renderer, ausência de .env,
chaves/certificados privados e credenciais conhecidas de ensaio; main/preload
iguais ao build atual. SHA256SUMS.txt gerado ao lado do instalador. Ajustados
separadores Windows na leitura ASAR e resolução da ferramenta pnpm já instalada.

Regressão:95 arquivos/686 testes passaram em68,54s; typecheck/build atuais
aprovados. Produção/backend/schema/dependências não alterados neste lote.

Ensaio MQTT usa bootstrap compilado normal (não realtime-backend.cjs), CA pública
local e MQTT_ENABLED=true. DeviceUid vers-sim-001 reservado somente se livre;
estado do simulador preserva sequência entre modos. Limpeza inclui mqtt_messages
antes de remover dispositivo. Perfis Electron são temporários e separados.

Comprovados até aqui no dev: lote de10 capturas4V/0,5A por TLS, potência2W,
duplicata sem ampliar10 amostras e TEST persistido GOOD,10 amostras,0,005Wh
(18/3600). Resumo após término é assíncrono: recuperação periódica60s, sem forçar
recomputação pelo ensaio. Espera ampliada somente nesse cenário contratual.
O encerramento do processo de ensaio permaneceu preso após os asserts do MQTT.
O controlador agora aguarda PROVA_OK mqtt, emitido somente após amostras,
duplicata, resumo e restauração do principal, e encerra exclusivamente esse PID.
Timeout/erro anterior à confirmação continua falhando. É término forçado da
bancada, não evidência de shutdown gracioso Windows. Dev/build concluíram os
cinco estágios cada. Recursos ASAR também concluíram login/realtime/mqtt/resume/
logged-out em execução independente. São15 estágios aprovados no total.
Nome do perfil de teste diferencia Dev/Build/Pacote para não tentar salvar
novamente o mesmo nome e encontrar o botão corretamente desabilitado.

## Limites de entrega

O instalador contém apenas o desktop. Backend local/Redis/broker e simulador
precisam estar disponíveis; não são instalados pelo NSIS. API padrão é
http://localhost:3000/api/v1; bancada usa53000 por variável de ambiente explícita.
Teste original do ASAR reutilizou Electron44.7.0 com os recursos reais do pacote.
Posteriormente o responsável autorizou a instalação NSIS e a validação do
executável instalado: [evidências e correções locais](desktop-installed-validation.md).
NSIS silencioso e cinco estágios no executável instalado aprovados, com perfil
de teste temporário. O perfil habitual da aplicação foi preservado.
Sem certificado de assinatura de código e sem validação em outro computador.

## Fechamento

Ensaio final ASAR aprovado, inclusive resumo sem recomputação manual e negação
à contaB do teste MQTT da contaA. Banco final0 usuários, veículos, dispositivos,
testes, mensagens MQTT, amostras, resumos e sessões. Somente broker/db-test/
redis-test parados; inicializadores já encerrados e volumes preservados. Não se
afirma remoção dos estados persistentes internos do broker, que permanece no
volume sintético da bancada. Sem alterações nos seis containers de uso.

Scripts conferidos por node --check; diff --check aprovado. Artefatos ignorados
pelo Git; commits/push ficam com o programador. Núcleo da integração desktop
dos lotes0–6 encerrado neste escopo. Viber e outras frentes têm roadmap próprio.

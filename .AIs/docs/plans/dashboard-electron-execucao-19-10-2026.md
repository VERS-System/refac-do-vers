<!-- Alinha execução do dashboard ao aplicativo Electron autorizado pelo programador. -->
# Dashboard Electron — execução consistente

## Escopo autorizado em 19/10/2026

Após revisão do merge c102acf, programador pediu ajustar para Electron em vez
de web. Manter app desktop existente; remover serviço dashboard do Compose,
docker/Dockerfile.dashboard, script dev:web e vite.web.config.ts. Fixar servidor
interno do renderer em localhost:5174 com strictPort, origem já permitida na API.
Manter build, preview e empacotamento Electron existentes.

Arquivos adicionais: teste de configuração/infraestrutura do desktop, README do
dashboard, documentação ativa de arquitetura/infraestrutura/índice e contexto.
Nenhuma alteração de backend, contrato REST/MQTT, schema, credenciais ou UI.

## Verificação

TDD: teste confirma Electron como comando principal, ausência de dev:web e
serviço Docker dashboard, e porta fixa do renderer sem fallback silencioso.
Executar test:unit, typecheck e build do dashboard, usando dependências já
declaradas; instalar lockfile congelado caso ainda não vinculadas localmente.
Validar Compose sem carregar .env real. Sem necessidade de rebuild Docker:
dashboard passa a rodar exclusivamente no host. Não iniciar aplicativo GUI.

Dependências do dashboard não estavam vinculadas neste checkout. Instalação
congelada do workspace autorizada pelo escopo, sem mudar versões. Instalar o
executável pelo comando install-electron fornecido pelo pacote declarado;
documentar esse passo no README, sem liberar scripts globais de dependências.
Validação usa configs temporárias com envDir vazio (há .env local, não lido);
remover esses configs ao fim. Não alterar configuração real de variáveis.

## Limites

Empacotamento loadFile e isolamento Electron preservados. Dashboard ainda usa
repositorioMock; integração real de cookies/CSRF/Socket.IO no app empacotado
exige lote próprio. Não permitir Origin null/file no backend para contornar
isso. Não gerar instaladores ou definir domínio de produção neste lote.

## Entrega e validação

Removidos serviço/porta/volume dashboard do Compose, Dockerfile.dashboard,
dev:web e vite.web.config.ts. Electron permanece nos comandos dev/build/preview/
build:electron; renderer fixa localhost:5174 e strictPort. Criado README desktop;
arquitetura, infraestrutura, índice e roadmap web histórico atualizados.

Self-check Node RED pelo dev:web ainda existente antes da alteração; GREEN após
remoção e alinhamento da porta. Primeiro Vitest aprovou 552 testes existentes,
mas teste novo falhou porque import.meta.url no jsdom não é file. Ajustado teste
para cwd do pacote, compatível com os scripts npm/pnpm. Execução final:
78 arquivos/554 testes aprovados, dois novos; typecheck e build dos três alvos
main/preload/renderer aprovados. YAML do Compose analisado com parser instalado:
sem serviço dashboard e sem dependências apontando a serviços inexistentes.

Instalação congelada do workspace concluída após retomar fora do sandbox;
lockfile/versões preservados. Executável Electron instalado pelo install.js
do pacote declarado, sem abrir GUI. Nenhuma lib nova ou liberação permanente
de scripts. Configs temporárias com envDir vazio usadas para não carregar .env
local, depois removidas. Build/testes precisaram sair do sandbox porque esbuild
foi impedido de resolver diretórios; não houve falha de código nessa etapa.

Sem comando Docker, rebuild de imagem, backend, migration, serviço externo,
commit/push ou instalador. Execução visual e autenticação/Socket.IO no app
empacotado não validados neste lote.

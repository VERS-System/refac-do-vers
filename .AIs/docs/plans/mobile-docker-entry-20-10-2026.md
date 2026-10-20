<!-- Planeja execução Expo em container isolado e diagnóstico da entrada no monorepo. -->
# Mobile — entrada Expo e container de desenvolvimento

## Escopo autorizado

Programador pediu container mobile após erro Expo57.0.12/AppEntry buscando
../../App dentro de node_modules. Mobile já declara main=index.js e registra
./App; raiz tem outro Expo. Conferir entrada resolvida do projeto mobile, não
alterar raiz ou versões para mascarar execução fora do projeto correto.

Criar teste da entrada antes da configuração. Atualizar docker/Dockerfile.mobile
para pnpm11.21.0/Node24 e instalação congelada filtrada sem scripts. Servidor
Expo executado no diretório mobile com porta8080/LAN. Criar Compose dedicado
somente mobile e reutilizá-lo por extends no principal; sem env_file de outros
serviços. Montar somente src/App/entrada para não carregar node_modules Windows.
Manter configurações/manifests na imagem, exigindo rebuild ao alterá-los.
README explica EXPO_HOST IP do host, Expo Go e entrada correta no host.

## Verificação

Unitários antes/depois e TypeScript. Com EXPO_NO_DOTENV=1, conferir resolvedor
Expo para iOS/Android. Avisar antes de Docker; inventariar portas e containers.
Build e início somente mobile pelo Compose dedicado com --env-file .env.example,
sem ler .env nem iniciar backend/Neon. Bundle iOS/Android por Metro e manifesto
com IP/porta corretos; não alegar teste visual em aparelho sem dispositivo.
Preservar mudanças pendentes do backend e serviços de terceiros. Sem atualizar
pacotes, lockfile, backend, telas, firmware ou decisões de produto. Se falhar,
corrigir somente causa demonstrada. Registrar limites e forma de parar.

Baseline encontrou invalid hook call: bibliotecas de teste carregam React19.2.8
do grafo da raiz, renderer/mobile usam19.2.3. Acrescentar moduleNameMapper React
no Jest do mobile para manter instância única, sem mudar versões/lock. Verificar
Metro separadamente no bundle real, sem presumir que erro do Jest é erro de app.

## Resultado — 20/10/2026

Resolvedor Expo confirmou index.js do mobile em iOS/Android; entrada já estava
correta, sem mudar App ou main. A invocação inicial do script de resolução como
arquivo confundiu argv; corrigida para node -e require conforme uso do script.
Erro relatado aponta para Expo57.0.12 da raiz; mobile resolve57.0.28.

Baseline:35 suítes/334 testes,29 suítes falharam por React duplicado. Mapper de
React no Jest fixou cópia mobile19.2.3; GREEN35/334 e TypeScript aprovados. Teste
novo confirma registro do App local. Nenhuma versão/dependência alterada, nem
Metro customizado para esconder falha; sourcemap real foi conferido depois.

Dockerfile com Node24/pnpm11.21.0 e instalação congelada sem scripts passou:
imagem refacdovers-mobile d98dfa9eba05423f2763deb7a3edc6bd43e70ab74487a6ed681b3a99fcc43629.
Compose dedicado e principal validaram (principal com --no-env-resolution).
Servidor inicia em /app/services/mobile com8080→8080 e anuncia IP Wi-Fi do host.
Montagens limitadas a src/App/index preservam node_modules Linux.

Aviso antes de Docker; inventário mostrou outros serviços ativos, todos
preservados. Porta8080 livre. Consulta de rede precisou autorização após acesso
CIM negado no sandbox. Vers-mobile iniciado com EXPO_HOST10.5.15.57 e arquivo
de exemplo explícito; sem carregar .env nem tocar backend/Neon. Compose emitiu
aviso de containers órfãos por usar arquivo dedicado no mesmo projeto; nenhum
container órfão removido. Certificados/chaves de outros serviços não acessados.

Manifesto iOS:HTTP200,SDK57.0.0,projectRoot=/app/services/mobile e launchAsset
/services/mobile/index.bundle no endereço10.5.15.57:8080. Bundles completos
(lazy=false,bytecode0) responderam200: iOS6.036.202 bytes/Android6.037.054 bytes.
URLs padrão de lançamento com parâmetros do manifesto também200 nas duas
plataformas. Sourcemap iOS mostrou somente React19.2.3. Windows acessou /status
pela porta publicada comHTTP200. Sem resolução de ../../App em node_modules.

Container mantido ativo para o programador usar Expo Go em exp://10.5.15.57:8080.
QR disponível por docker logs -f vers-mobile. README registra início, rebuild,
hot reload, parada e comando correto no host com --filter @vers/mobile.
Pacotes/configurações na imagem requerem rebuild; fontes montadas têm hot reload.

Limites: não aberto em celular/emulador, sem verificação visual ou conectividade
de outro aparelho/restrições da rede Wi-Fi. API ainda não integrada. Sem .env,
atualização de versões/lockfile, commit/push ou alteração dos recortes pendentes
de backend/documentação elétrica. Diff --check aprovado.

### Retorno do erro AppEntry na sessão
Log repetido identificado no host: processo Expo PID5680, versão57.0.12,
iniciado por npx expo start na raiz e ouvindo8081. A entrada mobile permanece
index.js com App local; nenhum arquivo App artificial criado na raiz.
Container mobile estava parado na nova conferência; retomado isoladamente
pelo Compose dedicado, sem rebuild ou intervenção nos demais processos.
Abrir no Expo Go exp://10.5.15.57:8080; encerrar o terminal Expo da raiz com
Ctrl+C. Alternativa no host: pnpm.cmd --filter @vers/mobile exec expo start --clear.
Sem novo código ou testes unitários; diagnóstico operacional. Celular não testado.

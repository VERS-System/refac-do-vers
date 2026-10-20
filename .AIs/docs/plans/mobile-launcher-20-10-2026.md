<!-- Plano do atalho Windows para iniciar o Expo no projeto correto. -->
# Atalho mobile na raiz

Criar rodar-mobile.bat, independente do diretório atual, que entra no serviço
mobile, desativa leitura automática de .env e chama pnpm exec expo start --clear.
Encaminhar argumentos e preservar o código de saída. Não iniciar outros serviços.
Documentar no README e registrar no contexto. Validar com pnpm substituto em
diretório temporário (pasta com espaços, argumentos, ambiente e saída), sem abrir
outro Metro. Executar os testes unitários do mobile.

### Atalho Windows do mobile
Criado rodar-mobile.bat na raiz: resolve sua propria pasta com pushd, executa
pnpm.cmd exec expo start --clear dentro de services/mobile, desativa dotenv,
encaminha argumentos e preserva codigo de saida. README atualizado e plano em
mobile-launcher-20-10-2026.md. Teste isolado com pnpm substituto confirmou pasta
com espacos, chamada de outro diretorio, --android, EXPO_NO_DOTENV=1 e saida7.
35 suites/334 testes mobile aprovados; git diff --check aprovado. Sem iniciar
outro Metro, alterar dependencias, encerrar processos ou testar aparelho fisico.

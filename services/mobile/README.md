<!-- README do serviço mobile: execução local, builds previstos e checklist de aparelho. -->

# Mobile VERS — execução local e entrega visual

App Expo + React Native do VERS (MVP visual: 12 telas navegáveis com fixtures
sintéticas, sem integração com o backend — ver `mobile-roadmap/README.md`).

## Pré-requisitos

- Docker Desktop com containers Linux para o servidor em container; ou Node 24
  e pnpm 11.21.0 para execução no host. No PowerShell, use `pnpm.cmd`.
- App **Expo Go** no aparelho físico (mesma rede Wi-Fi do PC) ou emulador
  Android / simulador iOS.

## Rodar pelo Docker

O container fornece o Expo/Metro. O app abre no Expo Go do celular ou emulador.
Na raiz do monorepo, use o IP Wi-Fi do computador mostrado por `ipconfig`:

```powershell
$env:EXPO_HOST = '192.168.0.10' # troque pelo IP real do computador
docker compose --env-file .env.example -f docker-compose.mobile.yml up -d --build
docker compose --env-file .env.example -f docker-compose.mobile.yml logs -f mobile
```

Leia o QR com o Expo Go, ou abra `exp://192.168.0.10:8080` usando seu IP real.
Computador e celular precisam alcançar um ao outro na mesma rede. A porta é
`8080` tanto no host quanto no container; `localhost` no celular é o próprio
celular. O Compose dedicado não inicia backend, banco ou outro serviço e usa
somente o arquivo de exemplo para interpolação. `EXPO_HOST` do processo tem
precedência. O container não carrega arquivos `.env` do projeto.

`src/`, `App.tsx` e `index.js` têm hot reload; dependências Linux ficam na imagem.
Após mudar dependências, app.json, Metro ou Babel, repita o comando com `--build`.
O Compose principal reutiliza a mesma definição de serviço.

Para parar somente o mobile:

```powershell
docker compose --env-file .env.example -f docker-compose.mobile.yml stop mobile
```

## Rodar no host e erro de entrada

No Windows, dê dois cliques em `rodar-mobile.bat` na raiz do repositório ou
execute `.\rodar-mobile.bat` no PowerShell. O atalho
inicia somente o Expo mobile, limpa o cache e mostra o QR para o Expo Go.
Requer Node e pnpm instalados e as dependências do projeto disponíveis.
Aceita argumentos, por exemplo: `.\rodar-mobile.bat --android`.
Para encerrar, use Ctrl+C. Não precisa iniciar o container mobile nesse modo.

Na raiz do monorepo:

```powershell
pnpm.cmd --filter @vers/mobile exec expo start --clear
```

Para Android/iOS, acrescente `--android`/`--ios` (simulador iOS exige macOS).
Não execute `expo start` na raiz: existe outro Expo no pacote raiz. O erro
`expo/AppEntry.js` procurando `../../App` pode indicar o servidor do projeto
errado. Feche esse terminal e abra o endereço/QR do servidor mobile novo.
O projeto mobile usa `main: index.js`, que registra seu `./App` local.

## Validação de código

```bash
pnpm.cmd --filter @vers/mobile test:unit --silent
pnpm.cmd --filter @vers/mobile exec tsc --noEmit
git diff --check
```

Em 20/10/2026: 35 suítes/334 testes aprovados. O Jest resolve React pela cópia
do mobile para evitar conflito com a cópia do monorepo.

## Builds previstos

Identidades já reservadas em `app.json` (`br.edu.ucb.vers`, versão `0.1.0`,
retrato, tema escuro). Caminho previsto, ainda fora do MVP visual:

1. `npx expo prebuild` para gerar os projetos nativos;
2. `npx expo run:android` / `run:ios` para builds locais de homologação;
3. EAS Build para distribuição — sem `eas.json` neste MVP.

## Checklist de aparelho (programador executa)

- [ ] Splash → Login ↔ Cadastro → Home navegam com volta previsível.
- [ ] Abas Início/Bateria/VERS/Perfil trocam sem perder estado.
- [ ] Rotas internas abrem e voltam: Histórico, Testes, Veículos, Viber,
      Suporte (pelos dois atalhos).
- [ ] Cada tela exibe vazio/carregamento/erro/indisponível/expirada conforme
      aplicável, sem dado inventado.
- [ ] Selo `DADOS DE AMOSTRA` visível nas telas com fixtures.
- [ ] Tela estreita (320px) + fonte ampliada: sem estouro, com rolagem.
- [ ] Contraste, foco e alvos de toque conferidos em Android e iOS.
- [ ] Teclado não cobre composer (Viber) nem campos (Login/Cadastro/Suporte).

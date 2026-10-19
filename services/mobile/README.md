<!-- README do serviço mobile: execução local, builds previstos e checklist de aparelho. -->

# Mobile VERS — execução local e entrega visual

App Expo + React Native do VERS (MVP visual: 12 telas navegáveis com fixtures
sintéticas, sem integração com o backend — ver `mobile-roadmap/README.md`).

## Pré-requisitos

- Node 22 + `npm` (comandos abaixo usam `npm.cmd` no Windows por causa da
  política de execução do PowerShell contra `*.ps1`).
- App **Expo Go** no aparelho físico (mesma rede Wi-Fi do PC) ou emulador
  Android / simulador iOS.

## Configuração

```bash
cd services/mobile
copy .env.example .env
```

Ajuste no `.env`:

| Variável       | Uso                                            |
| -------------- | ---------------------------------------------- |
| `EXPO_HOST`    | IP da máquina na rede local (ex. `192.168.0.10`) para o aparelho conectar |
| `EXPO_API_URL` | Base da API no futuro integrado (hoje sem uso em tela) |
| `EXPO_WS_URL`  | Base do WebSocket no futuro integrado (hoje sem uso em tela) |

Sem `.env`, o padrão é `localhost` (só emulador no próprio PC).

## Rodar

```bash
cd services/mobile
npm.cmd run start     # Metro + QR para o Expo Go
npm.cmd run android   # abre no Android conectado
npm.cmd run ios       # abre no simulador iOS (só macOS)
```

Via Docker (Metro em `localhost:8080`, hot reload do volume):

```bash
docker compose up -d mobile
```

`REACT_NATIVE_PACKAGER_HOSTNAME` usa `${EXPO_HOST}` do `.env` da raiz.

## Validação de código

```bash
cd services/mobile
npm.cmd run test:unit   # 34 suítes / 333 testes no fechamento do MVP visual
npx.cmd tsc --noEmit
git diff --check
```

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

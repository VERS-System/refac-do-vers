<!-- Plano para entregar o dashboard como aplicação web Vite com Tailwind. -->

# Dashboard Vite sem Electron — 26/09/2026

## Decisão e objetivo

O programador decidiu retirar Electron. `services/dashboard` será aplicação web
React/Vite/Tailwind, acessada pelo navegador. A F04 deve tratá-lo como cliente
web para cookies e CSRF. Este plano não implementa telas novas.

## Estado encontrado

- Vite já serve `src/renderer`; `build` já executa `tsc -b && vite build`.
- Há scripts/dependências de Electron em `package.json`, arquivos em
  `electron/`, `electron-builder.yml`, entrada `src/main/index.ts`, referências
  no workspace, Dockerfile e documentação vigente.
- Tailwind e PostCSS já estão instalados, mas nenhuma folha CSS é importada;
  utilitários de `App.tsx` não chegam ao bundle.
- O cliente de API usa `http://localhost:3000/api`, sem credenciais. A correção
  de `/api/v1`, cookies e CSRF pertence à integração da F04; este lote mantém
  apenas o frontend compilável.

## Lotes pequenos

| Lote | Mudança | Verificação |
| --- | --- | --- |
| D01 — Web e estilo | Remover entrada, scripts e dependências exclusivos de Electron; importar CSS Tailwind; alinhar porta Vite ao Compose. | `pnpm --filter @vers/dashboard build`; conferir HTML/CSS de saída. |
| D02 — Lockfile e infraestrutura | Atualizar lockfile, allowBuilds e Dockerfile; manter Compose como servidor Vite. | Instalação com lockfile congelado quando disponível; `docker compose config` sem acessar `.env`. |
| D03 — Documentação | Atualizar arquitetura, infraestrutura e roadmap vigente para dashboard web; preservar contextos históricos. | Busca sem referência ativa a empacotamento Electron e `git diff --check`. |

## Critério de saída

`@vers/dashboard` compila e entrega HTML/CSS pelo Vite sem dependência ou
processo Electron. O lockfile corresponde aos manifests. A integração real de
cookies/CSRF será verificada na F04, após o backend expor essas rotas.

## Execução em 26/09/2026

- D01 concluído: scripts, dependências e arquivos de Electron removidos;
  Tailwind importado no entrypoint; Vite usa porta 5174; cliente API usa
  `/api/v1` relativo com credenciais. `npm.cmd run build` passou e o CSS
  contém os utilitários da tela.
- D02 parcial: `allowBuilds` e Dockerfile atualizados; importer do dashboard no
  lockfile alinhado ao manifesto. A regeneração integral do lockfile por `pnpm`
  falhou porque o workspace mobile exige `expo-font@~57.0.4`, indisponível no
  registro consultado. Entradas transitivas órfãs do Electron podem permanecer
  no lockfile até a resolução desse bloqueio externo ao dashboard.
- D03 concluído: documentação vigente de arquitetura, infraestrutura e roadmap
  atualizada para dashboard web. Contextos históricos foram preservados.
- `docker compose config` não foi executado, pois o Compose lê arquivos `.env`,
  proibidos pelas regras do repositório.

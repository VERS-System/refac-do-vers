<!-- Orienta execução e build do dashboard como aplicativo Electron no host. -->
# VERS Dashboard — Electron

Na raiz do monorepo, instale as dependências declaradas com
`pnpm install --frozen-lockfile`. Instale o executável da versão Electron
declarada e execute no host:

```powershell
pnpm --filter @vers/dashboard exec install-electron
pnpm --filter @vers/dashboard dev
```

O comando abre a janela Electron. Seu servidor interno de desenvolvimento usa
`http://localhost:5174`; a porta deve estar livre. O proxy `/api` aponta para
`http://localhost:3000`. Backend e serviços de apoio podem rodar em Docker;
dashboard não pertence ao Compose e não exige container gráfico.

## Verificação e distribuição

```powershell
pnpm --filter @vers/dashboard test:unit
pnpm --filter @vers/dashboard typecheck
pnpm --filter @vers/dashboard build
pnpm --filter @vers/dashboard preview
pnpm --filter @vers/dashboard build:electron
```

`build` gera main/preload/renderer em `out/`; `preview` abre o build no Electron.
`build:electron` gera a distribuição conforme electron-builder.yml e exige os
recursos da plataforma de destino. Não usar `dev:web`, servidor web ou imagem
Docker para distribuir o dashboard.

As telas ainda usam repositório de exemplo. O app empacotado abre arquivos
locais com isolamento do Node; integração real de autenticação por cookies,
CSRF e Socket.IO precisa de lote próprio. Não habilitar Origin null/file na API
como atalho. API de produção ainda não configurada; nenhuma credencial vai no
renderer.

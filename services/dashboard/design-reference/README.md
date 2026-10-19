<!-- Referências visuais das telas desktop aprovadas no Stitch, usadas para conferir a implementação em React. -->

# Referências de design (Stitch)

Cópia das 9 telas aprovadas no projeto Stitch **VERS Desktop**
(`projects/4712366981044729161`), exportadas em 13/10/2026.

- `NN-nome.html`: HTML gerado pelo Stitch (Tailwind via CDN), só para consulta.
- `NN-nome.png`: render do HTML em 1280 px de largura, a largura dos frames
  no Stitch.

| Arquivo | Tela | ID no Stitch |
|---|---|---|
| `01-visao-geral` | Visão geral | `d74c5942ca3e4e62ab3d962e505d999a` |
| `02-telemetria` | Telemetria | `84480fa611564ca197fcac3d04481f6d` |
| `03-energia` | Energia | `c4cad262178a41368ec78c5e7094684f` |
| `04-testes` | Testes | `19f5b8107de04db7b574d540e80c79af` |
| `05-veiculo-instalacao` | Veículo e instalação | `a60c006f118d425486218829233a7ffb` |
| `06-viber-ia` | Viber IA | `baa94bdb810f40fa98cf017217216cd3` |
| `07-configuracoes` | Configurações | `3a04e33ebeef4fc2b16dda300f5012df` |
| `08-login` | Login | `1a8444f07f6f40fb80417eb5d5d842aa` |
| `09-criar-conta` | Criar conta | `b1a95755ae0849f7b6f11481550c6b32` |

## Como usar

- A estrutura, o conteúdo e os números das telas vêm destas referências.
- Cores, fontes e raios vêm dos tokens em `src/renderer/styles/global.css`,
  que seguem o DESIGN.md. O Stitch renderizou as telas com um fundo mais escuro
  (`#131313`) e sem borda nos cards; a implementação segue o DESIGN.md
  (`#242423` e borda `#323231`).
- Os ícones das referências são Material Symbols; a implementação usa Lucide.
- Estes arquivos não entram no build do app.

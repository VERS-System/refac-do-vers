<!-- Índice operacional das telas planejadas para o dashboard desktop VERS. -->

# Roadmap de telas do front desktop VERS

Este diretório organiza a interface React/Vite empacotada com Electron. Cada
task representa uma tela ou fluxo visual. Regras de negócio, segurança,
autorização, persistência, MQTT e cálculos permanecem no backend.

## Ordem e estado

| Ordem | Task | Estado | Dependência visual |
| --- | --- | --- | --- |
| 00 | [Shell Electron, base visual e navegação](00-shell-base-navegacao.md) | Em andamento | — |
| 01 | [Inicialização e sessão](01-tela-inicializacao.md) | Planejada | D00 |
| 02 | [Login e cadastro](02-telas-autenticacao.md) | Planejada | D00–D01 |
| 03 | [Visão geral](03-tela-visao-geral.md) | Planejada | D00–D02 |
| 04 | [Energia e indicadores](04-tela-energia-indicadores.md) | Planejada | D03 |
| 05 | [Telemetria ao vivo](05-tela-telemetria-tempo-real.md) | Planejada | D03–D04 |
| 06 | [Calendário e histórico](06-tela-calendario-historico.md) | Planejada | D04 |
| 07 | [Sistema VERS](07-telas-sistema-vers.md) | Planejada | D03 |
| 08 | [Testes experimentais](08-telas-testes.md) | Planejada | D04–D07 |
| 09 | [Perfil e veículos](09-telas-perfil-veiculos.md) | Planejada | D02–D03 |
| 10 | [Suporte e revisão](10-telas-suporte.md) | Planejada | D07 e D09 |
| 11 | [Viber](11-tela-viber.md) | Planejada | D03 |
| 12 | [Área administrativa](12-telas-administracao.md) | Planejada | D02 + contrato backend |
| 13 | [Estados globais e entrega Electron](13-estados-entrega-electron.md) | Planejada | D00–D12 |

```text
Shell → Inicialização → Autenticação → Visão geral
                                      ├─ Energia → Histórico
                                      ├─ Telemetria ao vivo
                                      ├─ Sistema VERS → Testes
                                      ├─ Perfil → Veículos
                                      ├─ Suporte
                                      ├─ Viber
                                      └─ Administração autorizada
```

## Decisões fixadas

- desktop usa React, Vite, Tailwind e Electron;
- Zustand controla somente estado de interface;
- TanStack Query controla dados vindos da API;
- Socket.IO recebe eventos autorizados do backend, nunca do broker diretamente;
- processo renderer não acessa Node.js diretamente;
- APIs nativas passam por preload mínimo, tipado e allowlist;
- diagnóstico do veículo está fora do escopo;
- as features de usuário devem corresponder às do mobile e aos contratos do
  backend.

## Estado atual observado

- `App.tsx` contém apenas uma apresentação mínima;
- `DashboardPage`, `TelemetryPage` e `ConfigPage` estão vazias;
- tabela de telemetria e gráfico de energia são parciais;
- API usa URL fixa e caminho ainda não alinhado a `/api/v1`;
- o cliente Socket.IO envia token em `auth`, incompatível com a decisão de usar
  cookies `HttpOnly`;
- não há scripts de teste unitário ou lint no workspace do dashboard;
- componentes de `packages/ui` ainda usam identidade genérica azul/cinza.

## Critério final

O desktop estará pronto quando todas as telas forem navegáveis, acessíveis,
responsivas à janela, testadas com fixtures e compatíveis com os contratos do
backend, incluindo recuperação após desconexão e empacotamento Electron
reproduzível.

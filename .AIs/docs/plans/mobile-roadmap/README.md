<!-- Índice operacional das telas planejadas para o aplicativo mobile do VERS. -->

# Roadmap de telas do aplicativo mobile VERS

Este diretório organiza a construção integral da interface mobile em tasks
independentes. O roadmap descreve telas, navegação e estados visuais. Regras de
negócio, segurança, persistência, cálculos e autorização pertencem ao backend.

## Ordem e estado

| Ordem | Task | Estado | Dependência visual |
| --- | --- | --- | --- |
| 00 | [Base visual e navegação](00-base-visual-navegacao.md) | Concluída | — |
| 01 | [Splash](01-tela-splash.md) | Implementada | Task 00 |
| 02 | [Login](02-tela-login.md) | Concluída | Tasks 00–01 |
| 03 | [Cadastro](03-tela-cadastro.md) | Concluída | Task 02 |
| 04 | [Home](04-tela-home.md) | Concluída | Tasks 00–03 |
| 05 | [Bateria e energia](05-tela-bateria-energia.md) | Concluída | Task 04 |
| 06 | [Calendário e histórico](06-tela-calendario-historico.md) | Concluída | Task 05 |
| 07 | [Sistema VERS](07-tela-sistema-vers.md) | Concluída | Task 04 |
| 08 | [Testes experimentais](08-telas-testes.md) | Planejada | Tasks 05 e 07 |
| 09 | [Perfil](09-tela-perfil.md) | Planejada | Task 04 |
| 10 | [Veículos](10-telas-veiculos.md) | Planejada | Task 09 |
| 11 | [Suporte e revisão](11-telas-suporte-revisao.md) | Planejada | Tasks 07 e 09 |
| 12 | [Viber](12-tela-viber.md) | Planejada | Task 04 |
| 13 | [Estados globais e entrega visual](13-estados-globais-entrega.md) | Planejada | Tasks 01–12 |

```text
Base → Splash → Login → Cadastro → Home
                                  ├─ Bateria → Calendário → Testes
                                  ├─ Sistema VERS ─────────┘
                                  ├─ Perfil → Veículos
                                  ├─ Suporte e revisão
                                  └─ Viber
```

## Regras deste roadmap

1. Cada task representa uma tela ou um fluxo visual coeso.
2. A interface pode usar fixtures sintéticas enquanto o contrato do backend não
   estiver disponível.
3. O mobile não implementa regras de autorização, cálculos energéticos,
   persistência ou validações de domínio.
4. Cada tela deve representar carregamento, vazio, erro, indisponibilidade e
   sucesso quando esses estados forem aplicáveis.
5. Os nomes e campos exibidos devem vir dos contratos compartilhados e nunca do
   schema interno do banco.
6. Alterações seguem TDD e exigem `test:unit`, lint e build quando esses comandos
   existirem no serviço.
7. O diagnóstico do veículo está fora do escopo e deve ser removido dos atalhos,
   tipos de navegação, Home e testes existentes.
8. Login Google, recuperação de senha e outras telas sem contrato aprovado
   permanecem fora do MVP.

## Mapa de rotas

Estados, pilhas, abas e rotas futuras em [route-map.md](route-map.md).

## Encaixe com o backend
| Grupo de telas | Contrato esperado |
| --- | --- |
| Login e cadastro | Backend F01 e F04 |
| Perfil e veículos | Backend F01 e F05 |
| Sistema VERS e testes | Backend F01 e F05 |
| Energia, calendário e histórico | Backend F01 e F06 |
| Atualizações ao vivo | Backend F08 |
| Suporte | Backend F01 e F05 |
| Viber | Contrato futuro do serviço de IA, sem acesso direto a dados brutos |

## Critério final

O mobile estará visualmente completo quando todas as telas planejadas estiverem
navegáveis, responsivas, acessíveis e testadas com fixtures e quando seus estados
forem compatíveis com os contratos públicos do backend.

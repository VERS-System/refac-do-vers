<!-- Guia de navegação e convenções para a documentação técnica do VERS. -->

# Documentação técnica — VERS

Este diretório concentra a documentação do **VERS (Vibration Energy Recovery System)**, um projeto acadêmico para estudar a recuperação de uma parcela da energia mecânica das vibrações veiculares por meio de materiais piezoelétricos.

## Documentos principais

| Documento                                                         | Finalidade                                                               |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [01 — Visão geral](01_visao-geral-vers.md)                        | Contexto, objetivo, escopo e funcionamento do projeto.                   |
| [02 — Arquitetura](02_arquitetura-do-sistema.md)                  | Componentes físicos, fluxo de energia, telemetria e fronteiras técnicas. |
| [03 — Dados e indicadores](03_dados-e-indicadores.md)             | Informações de testes, métricas e modelo conceitual de armazenamento.    |
| [04 — Infraestrutura](04-infraestrutura.md)                       | Docker, variáveis de ambiente, core backend e fluxo de dados.           |
| [Roadmap do core](plans/core-roadmap.md)                          | Fases, dependências, critérios de aceite e ordem de implementação.      |
| [Roadmap do frontend desktop](plans/desktop-frontend-roadmap.md)  | Fases para implementar em React as telas desktop desenhadas no Stitch.  |

## Organização

- `contexts/`: registros resumidos de cada sessão de trabalho com IA.
- `plans/`: planos aprovados para evolução do projeto.
- `problems/`: problemas identificados, causas, impactos e soluções.

## Convenções

- Informações confirmadas pelo escopo do TCC são descritas como requisitos ou definições do projeto.
- Decisões ainda não validadas em protótipo são identificadas como **propostas** ou **a validar**.
- Novos documentos devem ser escritos em português e vinculados a partir deste guia ou do índice principal.

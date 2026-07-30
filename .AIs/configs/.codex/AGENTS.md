# Espelho de contexto para Codex

Este diretório é a camada de compatibilidade do Codex para a configuração do
OpenCode localizada em `.AIs/configs/.opencode`. Os documentos permanecem em seu
local original para evitar versões divergentes.

## Mapeamento

| Conteúdo Codex          | Fonte canônica OpenCode                                                    |
| ----------------------- | -------------------------------------------------------------------------- |
| Instruções operacionais | `.AIs/configs/.opencode/Rules.md` e `.AIs/configs/.opencode/docs/Rules.md` |
| Contexto do sistema     | `.AIs/configs/.opencode/docs/Context.md`                                   |
| Planos                  | `.AIs/configs/.opencode/plans/`                                            |
| Problemas e bugs        | `.AIs/configs/.opencode/problems/`                                         |
| Contextos diários       | `.AIs/configs/.opencode/contexts/`                                         |
| Documentação técnica    | `.AIs/configs/.opencode/docs/`                                             |
| Configuração original   | `.AIs/configs/.opencode/opencode.json`                                     |

## Uso

Leia `.codex/AGENTS.md` como resumo operacional. Para tarefas que envolvam
planejamento, bugs, arquitetura ou o estado recente do projeto, consulte o
diretório correspondente acima — ele contém todo o acervo existente do
OpenCode, inclusive históricos.

### Equivalências de permissões

O arquivo `opencode.json` restringe edições e comandos por confirmação. No
Codex, aplique o mesmo princípio para edições e siga as proteções de ambiente
da sessão para comandos. Nunca acesse `.env`.

# Regras globais para agentes de IA

Estas regras valem para qualquer IA que trabalhe neste repositório, inclusive
Codex e OpenCode.

1. Antes de editar, informe os arquivos afetados e a natureza da mudança.
   Aguarde a aprovação explícita do usuário, exceto quando o pedido do usuário
   já autorizar inequivocamente a edição.
2. Nunca leia, edite, exponha ou versiona arquivos `.env`. Consulte apenas os
   respectivos `.env.example`.
3. Arquivos e funções novas devem ter comentários em português: no topo do
   arquivo, explique seu propósito; em cada função ou método, descreva o que
   faz, por que existe e como funciona.
4. Use TDD: escreva testes unitários antes da implementação. Uma funcionalidade
   só está completa após passar em `npm run test:unit` no serviço aplicável.
5. Ao fim de cada sessão de IA, atualize ou crie
   `.agents/docs/contexts/Context_dd_mm_aaaa.md` com o que foi feito, arquivos
   alterados e pendências.
6. `git log` é permitido.
7. O formato de entrega se encaixa em pequenos commits que serao feitos pelo  programador e nao pela IA, e separados por pushs que serao as entregas de features prontas
8. o desenvolvimento tem que ser planejado antes de aplicado, todo o plano de mudanca tem que estar em um MD de documentacao que sera criado em `.agents\docs\plans`
9. RDA - relatorio diario de atividades. quando o programador falar que quer o RDA voce deve fazer uma mensagem em texto corrido de no maximo 10 linhas descrevendo tudo que foi feito naquela sessao, esse rda deve ser feito quando o limite de tokens do usuario se aproximar dos 10% restantes ou quando pedido
10. Sempre que necessario, rebuildar e rerodar o docker.

Consulte `.AIs/docs/README.md` para a documentação do projeto e
`.AIs/configs/README.md` para as configurações específicas de cada IA.

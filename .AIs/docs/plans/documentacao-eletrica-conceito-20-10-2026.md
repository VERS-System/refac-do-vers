<!-- Plano da documentação elétrica e conceitual solicitada pelo programador. -->
# Documentação elétrica e conceito — 20/10/2026

## Escopo autorizado
Criar dois documentos em português, específicos do VERS, sem alterar software ou hardware.

## Sequência
1. Consultar arquitetura, indicadores, roadmap elétrico e contrato MQTT existentes.
2. Escrever `../05_esquema-eletrico.md`: esquema funcional proposto, redes,
   instrumentação, dimensionamento, proteções e validação de bancada.
3. Escrever `../06_conceito-de-funcionamento.md`: física, balanço energético,
   indicadores, fluxo de dados e interpretação experimental.
4. Vincular ambos no índice e registrar a sessão no contexto de 20/10/2026.
5. Conferir links, coerência de unidades e distinção entre definição e proposta.

## Limites e verificação
Não escolher operacionalmente componentes, valores ou GPIOs ainda não aprovados.
Não tratar exemplos do dashboard como evidência física. Consultar fontes primárias
para características de componentes. Sem alteração de código, testes unitários e
rebuild Docker não se aplicam; revisão documental e exemplos numéricos bastam.
Preservar alterações existentes no diretório de trabalho e no contexto diário.

## Exportação em PDF
Gerar duas versões em `output/pdf/`, preservando conteúdo, com tabelas ajustadas,
fluxo conceitual desenhado e paginação. Conferir texto e renderização antes da entrega.

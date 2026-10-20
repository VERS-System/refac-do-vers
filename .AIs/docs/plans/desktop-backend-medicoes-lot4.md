<!-- Planeja a integração das medições reais e registra decisões do programador. -->
# Lote 4 — testes, telemetria, energia e CSV

## Decisões confirmadas em 20/10/2026

- API local da demonstração, com dados sintéticos.
- Fuso de apresentação e filtros: `America/Sao_Paulo`.
- Semana: última semana completa, de segunda a domingo; intervalo UTC
  correspondente com início inclusivo e fim exclusivo.
- Energia real: somente blocos horários completos, com cobertura visível.
  Curvas sem contrato continuam em área de demonstração identificada.
- Usar resumos oficiais `HOUR`, sem somar períodos sobrepostos ou calcular
  média simples de médias. Ausência de bloco não equivale a energia zero.
- A cobertura informa blocos disponíveis e sua qualidade; não comprova
  aquisição contínua durante cada hora.

## Execução

1. Proteger exportação paginada: preservar filtros, limitar a 10.000 amostras,
   rejeitar total variável, IDs repetidos, página truncada ou metadados inválidos.
   Exibir erro na tela sem baixar arquivo parcial. Testes antes da implementação.
2. Adicionar operações IPC específicas para testes, transições, amostras,
   resumos e comparação; reutilizar autenticação e validação do remetente.
3. Adaptar contratos reais, unidades e nulabilidade. Seleção explícita de
   instalação/configuração ao criar teste; comparação de dois a cinco testes.
4. Integrar telas, ordem global das amostras, consultas por recurso e CSV.
   Não chamar contador acumulado do dispositivo de energia oficial recuperada.
5. Integrar energia com intervalos horários completos e cobertura, mantendo
   os gráficos sem contrato separados. Conferir limites de dia/mês existentes
   durante implementação, registrando a janela exata na interface.
6. Rodar unidade completa, typecheck, build e ensaio Electron dev/build com
   fixtures conhecidas. Atualizar matriz, roadmap e contexto com evidências.

## Escopo da primeira alteração

`renderer/data/consultasTelemetria.ts` e seus testes;
`renderer/pages/TelemetriaPage.tsx` e seus testes para falhas de exportação;
este plano, roadmap da integração e contexto diário.

Não muda contratos do backend, banco, infraestrutura ou implantação.
Paginação não oferece snapshot: a verificação de total e IDs detecta várias
mudanças concorrentes, mas não garante identidade do conjunto se o total ficar
igual. Snapshot/cursor consistente exige evolução do contrato.

## Estado

Em andamento. Operações REST de medições e telas reais ainda não concluídas.

Primeira alteração concluída: proteção do CSV e erro recuperável na tela.
Validação: 86 arquivos/616 testes unitários aprovados, typecheck aprovado e
build dos três alvos Electron aprovado. Testes cobrem truncamento, duplicação,
mudança do total, vínculo, limites, filtros e nova tentativa após falha.
Não repetido ensaio Electron com API real nesta alteração.

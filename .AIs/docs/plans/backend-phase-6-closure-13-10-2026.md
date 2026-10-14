<!-- Planeja e registra a revisão local da F06, separando evidência simulada de ensaio real. -->
# F06 — Fechamento local e revisão — 13/10/2026

## Escopo autorizado

Programador solicitou o próximo lote (6.8). Conferir implementação, contratos,
tipos e cobertura existente; executar regressão, lint/build e validação OpenAPI.
Criar telemetry-volume.spec.ts no módulo data para o ensaio acordado de 10 mil
amostras em memória. Não implementar recurso novo ou duplicar testes HTTP já
existentes. Atualizar plano F06, roadmap/índice, guia de documentação e contexto.
Sem .env, schema, migration, dependências, serviços externos, Docker ou commits.

O ensaio usa origem sintética, potência constante, contador linear e timestamps
com deslocamento de 250 ms para cruzar fronteiras horárias entre leituras.
Conferir série inteira, inversão da ordem, duplicatas e três recortes UTC;
energia principal e estimativa continuam distintas. Comparar com oracles
analíticos independentes, sem limite arbitrário de tempo no teste. Registrar
tempo observado como evidência local, sem prometer capacidade em produção.

## Matriz conferida

| Lote | Entrega | Evidência local |
| --- | --- | --- |
| 6.1 | Regras, chaves e decisões | Plano, constraints versionadas e exemplos; SQL sem execução |
| 6.2 | Dez fixtures determinísticas | 13 testes de restrição dev/test, isolamento e oracles |
| 6.3 | Telemetria autorizada | 32 casos HTTP/JWT de DTO, acesso/histórico e paginação |
| 6.4 | Potência/contador/estimativa | 30 casos de oracles, ausência, reinício, conflito e origens |
| 6.5 | Resumos/recomputação | 10 casos adicionais de recorte e 21 de serviço; SQL real pendente |
| 6.6 | Consultas de resumos | 67 casos HTTP/JWT de Decimal, versão ativa e autorização |
| 6.7 | Comparação | 27 casos de ordem, 2–5 IDs, acesso completo e qualidade |
| 6.8 | Revisão/volume | 1 caso de 10 mil amostras, regressão final e contratos |

## Resultados — 13/10/2026

Baseline do checkout: branch backend-mqtt, HEAD db7a657; checkout inicialmente
limpo. A revisão local adicionou somente teste de volume e documentação.

| Verificação | Resultado |
| --- | --- |
| Backend test:unit | 32 suítes / 579 testes aprovados |
| Backend lint / build | Aprovados |
| Backend tsc --noEmit, incluindo test/db | Aprovado, sem executar SQL |
| Shared-types test:unit / lint / build | Aprovados |
| OpenAPI / referências locais | YAML válido e referências resolvidas |
| Controllers compilados / contratos | 32 métodos/caminhos/status compatíveis |
| Guards do DataController | JwtAuthGuard / RolesGuard conferidos |
| Campos das fixtures compartilhadas | TelemetrySample / EnergySummary / TestComparison compatíveis com OpenAPI |
| Ensaio de volume | 10 mil amostras, ordem/duplicatas e conservação em três horas UTC aprovados |
| Diff / artefatos | git diff --check aprovado; teste novo sem espaços finais e relatório presente |

O ensaio isolado mediu 414,8 ms; na regressão mediu 457,3 ms. É o tempo do bloco
com cinco cálculos/recortes e assertions, sem geração das amostras ou startup
do Jest. Não representa latência REST, consultas SQL, rede ou capacidade de
ingestão. Não existe SLA arbitrário baseado nesses números.

Oracles: 9,999 Wh pelo contador e 5,555 Wh pela potência constante de 2 W em
9999 segundos; média/pico 2 W, 10 mil amostras distintas. Recortes em três horas
conservam ambos os totais e contam 3600/3600/2800 amostras. A fronteira entre
leituras recebe PARTIAL por repartição estimada; duplicatas não somam novamente.

## Limites que permanecem reais

- PostgreSQL: suíte de concorrência/chegada tardia/rollback preparada na 6.5,
  ainda sem execução em ambiente isolado autorizado. Mocks não comprovam locks,
  unicidade concorrente, plano de consultas ou desempenho do banco.
- Recomposição é serviço interno exportado, sem job ou disparo em GET. F07
  deverá chamá-la e compartilhar locks antes de escrever telemetria.
- Tarifa/moeda não têm entrada contratada; economia e consumo permanecem null.
- Cadência, faixas, contador real/reboot e atraso dependem do marco MQTT.
- Clientes não foram integrados nesta fase; cookies/Origin/CSRF mobile e origens
  de produção continuam pendências da integração, não resolvidas por testes HTTP.
- Paginação mantém page/pageSize e limite 100; cursor/exportação e novas métricas
  de cobertura/qualidade exigem contrato. Qualidade existente não prova cobertura.

## Critério de revisão

Recorte implementado e validado localmente pronto para revisão do programador.
As pendências acima não são declaradas concluídas. Não há encerramento automático
da F06 ou início da F07: seu marco exige hardware ou simulador aprovado,
contrato MQTT e broker de teste. Revisão/aceite e ensaios reais continuam separados.

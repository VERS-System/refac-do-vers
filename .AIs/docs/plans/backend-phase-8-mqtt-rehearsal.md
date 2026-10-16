<!-- Estende a bancada F08.7 para o caminho MQTT/TLS até cliente e pausa real sob queda Redis. -->
# F08.7 — Coordenação MQTT real

Pedido `nxt` após entrega dos seis cenários autoriza avançar na pendência
MQTT/Redis do mesmo ensaio isolado. Reutilizar projeto vers-realtime-rehearsal,
PostgreSQL 55432 e Redis 56379, acrescentando a composição MQTT já existente
com Mosquitto TLS 58883 e volumes exclusivos desse projeto. Antes de executar,
conferir portas e propriedade dos containers; não tocar o projeto habitual.
Certificado público em output/realtime-rehearsal/server.crt, chave só no volume.
Execução inclui iniciar/parar somente serviços da bancada e fixtures próprias,
sem Neon, .env, migração remota, limpeza global ou remoção de volumes.

## Arquivos e sequência

Alterar test/realtime/realtime-rehearsal.e2e-spec.ts para iniciar serviços sob
demanda e adicionar caso integrado. Reutilizar serviços reais de MQTT,
recepção/processamento, resumos, coordenador, ponte, Pub/Sub e gateway.
Sem nova dependência ou mudança de produção prevista. Atualizar planos F08,
contrato, índices e contexto com evidências, preservando limites anteriores.
Acrescentar output/realtime-rehearsal/ ao .gitignore, como no ensaio MQTT
anterior, para não versionar o certificado público temporário.

1. TLS→commit→ponte→Redis→aviso autorizado, com três capturas e oracle 4/3600 Wh.
2. Retransmissão idêntica: mesma identidade, três amostras e energia inalterada.
3. Parar somente Redis; aguardar pausa e fechamento MQTT, sem desfazer histórico.
4. Publicar lote seguinte com assinante offline; broker aceita QoS 1, banco
   permanece sem esse bruto durante a pausa. Não simular disponibilidade.
5. Iniciar Redis, aguardar retomada MQTT e consumo da sessão persistente;
   novo socket exige assinatura. Conferir seis amostras e oracle 10/3600 Wh.
6. Novo lote após assinatura: aviso real, nove amostras, oracle 16/3600 Wh.

Este caso não segura artificialmente uma transação já iniciada: drenagem e
rollback concorrentes continuam com evidências unitárias/F07, sem alegar
novo ensaio real de commit durante a queda. Não comprova retenção ilimitada,
snapshot de UI, HiveMQ, hardware, produção ou frescor garantido.

## Comandos da bancada

Na raiz, base:
`docker compose -p vers-realtime-rehearsal --env-file docker/mqtt-test/compose.env.example -f docker-compose.test-db.yml -f docker-compose.test-realtime.yml -f docker-compose.test-mqtt.yml`.
Usar `up -d --wait`, copiar somente certificado público de mqtt-test:/tls/server.crt
para output/realtime-rehearsal/server.crt e preparar schema conforme F08.7
(cwd temporário somente com schema/constraints). Certificado gerado por imagem
local refacdovers-backend, credenciais exclusivamente sintéticas existentes.

No backend, novo processo com VERS_REALTIME_REHEARSAL=authorized-local-only e
NODE_EXTRA_CA_CERTS apontando ao caminho absoluto do certificado público:
`node node_modules/jest/bin/jest.js --config test/jest.realtime.config.cjs --runInBand`.
Os testes só param/iniciam redis-test do projeto fixo; broker permanece online.
No fim, verificar fixtures por contagens e usar mesma base Compose com `stop`.

## Verificação

Testes antes de qualquer correção funcional; se passarem, registrar cobertura
do código existente sem inventar RED. TypeScript noEmit/test:unit/lint/build,
diff --check e inspeção do shutdown, sem rebuild do backend se só mudar teste.
## Resultado — 16/10/2026

Primeira execução: sete cenários reais aprovados sobre produção existente;
nenhuma falha funcional, sem RED inventado ou mudança no runtime. Acrescentada
barreira observável de avisos por teste no Pub/Sub antes da nova assinatura,
para aviso recuperado não satisfazer a expectativa do terceiro lote. Repetição
final: sete testes/código zero, sem aviso de handles abertos.

Evidência do caso novo: três amostras e 4/3600 Wh antes da queda; retransmissão
idêntica reconhecida sem novas amostras/aviso. Parada real somente do Redis
encerrou socket e concluiu pausa do pipeline/transporte. Publicação QoS 1 do
segundo lote com consumidor offline não gravou bruto nem amostras durante pausa.
Retorno Redis reabriu sessão MQTT e processou esse lote: seis amostras e
10/3600 Wh. Após nova assinatura, terceiro lote gerou aviso pela ponte real:
três brutos, nove amostras e 16/3600 Wh. Tolerância de energia 1e-12 conforme
contrato; PUBLISH ou PUBACK sozinhos não foram tratados como prova de entrega.

TypeScript noEmit, lint, build e 46 suítes/942 testes unitários aprovados.
SQL final confirmou zero em usuários/sessões/vínculos/veículos/testes/
dispositivos/brutos/amostras/resumos; limpeza por IDs feita pela suíte.
Todos os cinco containers do projeto confirmados Exited (0), volumes mantidos.
Certificado público ignorado pelo Git, chave só no volume; validade de dois
dias exige regeneração/cópia antes de reprodução futura após expirar.

Sem .env, Neon, migrations, dependências, frontend, commit/push, ativação do
backend habitual ou rebuild por mudança de runtime. Recorte local entregue
para revisão. Permanecem os limites da transação em voo, snapshot/UI e origem
de aviso TEST sem MQTT; não declarar F08 inteira concluída.

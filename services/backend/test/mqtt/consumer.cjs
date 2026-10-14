// Executa consumidor real em processo separado, restrito ao banco/broker sintéticos locais.
const { resolve } = require('node:path');
const { ConfigService } = require('@nestjs/config');
const base = resolve(__dirname, '../../dist/services/backend/src');
const { PrismaService } = require(resolve(base, 'prisma/prisma.service'));
const { EnergySummaryService } = require(resolve(base, 'modules/data/energy-summary.service'));
const { MqttReceptionService } = require(resolve(base, 'modules/mqtt/mqtt-reception.service'));
const { MqttService } = require(resolve(base, 'modules/mqtt/mqtt.service'));
const { MqttPipelineService } = require(resolve(base, 'modules/mqtt/mqtt-pipeline.service'));
const localUrl = 'postgresql://vers_test:vers_test_local_only@127.0.0.1:55432/vers_test?schema=public';
if (process.env.NODE_ENV !== 'test' || process.env.DATABASE_URL !== localUrl || !process.send) {
  throw new Error('Consumidor exige processo IPC do ensaio isolado.');
}
const prisma = new PrismaService();
const summaries = new EnergySummaryService(prisma);
const reception = new MqttReceptionService(prisma, summaries);
const transport = new MqttService(new ConfigService({ MQTT_ENABLED: true,
  MQTT_URL: 'mqtts://localhost:58883', MQTT_USERNAME: 'backend-test', MQTT_PASSWORD: 'backend-test-only',
  MQTT_CLIENT_ID: 'vers-rehearsal-backend' }));
const pipeline = new MqttPipelineService(prisma, reception, summaries, transport);
let closing;

// Fecha exatamente uma vez, permitindo reiniciar o processo sem abandonar conexões/timers.
function shutdown() {
  if (!closing) closing = (async () => {
    await pipeline.onModuleDestroy(); reception.onModuleDestroy(); await prisma.$disconnect();
    if (process.connected) process.disconnect();
  })();
  return closing;
}

// Inicia pipeline e sinaliza prontidão somente após assinatura TLS efetivamente concedida.
async function main() {
  await pipeline.start();
  const deadline = Date.now() + 15000;
  while (transport.status !== 'ok') {
    if (Date.now() >= deadline) throw new Error('MQTT de ensaio não ficou pronto.');
    await new Promise((resolveTimer) => setTimeout(resolveTimer, 50));
  }
  process.send({ event: 'ready' });
}

process.on('message', (message) => { if (message === 'stop') void shutdown(); });
process.on('disconnect', () => { void shutdown(); });
void main().catch(async () => {
  if (process.connected) process.send({ event: 'failed' });
  await shutdown(); process.exitCode = 1;
});

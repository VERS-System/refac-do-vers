/** Inicia o backend compilado com tempo real explícito, sem ingestão MQTT, só na bancada. */
const { createRequire } = require('node:module');
const { resolve } = require('node:path');
if (process.env.NODE_ENV !== 'test' || process.env.PORT !== '53000' || process.env.MQTT_ENABLED !== 'false' ||
  process.env.DATABASE_URL !== 'postgresql://vers_test:vers_test_local_only@127.0.0.1:55432/vers_test?schema=public') {
  throw new Error('Backend restrito à bancada sintética local');
}
const backend = resolve(__dirname, '../../backend');
const carregar = createRequire(resolve(backend, 'package.json'));
const { NestFactory } = carregar('@nestjs/core');
const { ConfigService } = carregar('@nestjs/config');
const { AppModule } = carregar(resolve(backend, 'dist/services/backend/src/app.module.js'));
const { configureApplication } = carregar(resolve(backend, 'dist/services/backend/src/main.js'));
const { RealtimeGateway } = carregar(resolve(backend, 'dist/services/backend/src/modules/realtime/realtime.gateway.js'));
const { RealtimePubSubService } = carregar(resolve(backend, 'dist/services/backend/src/modules/realtime/realtime-pubsub.service.js'));
const { RealtimeNotificationService } = carregar(resolve(backend, 'dist/services/backend/src/modules/realtime/realtime-notification.service.js'));

/** Reutiliza módulos/configuração reais e ativa apenas os componentes verificados neste lote. */
async function iniciar() {
  const app = await NestFactory.create(AppModule, { logger: false });
  try {
    await app.listen(configureApplication(app, app.get(ConfigService)));
    app.get(RealtimeGateway).start(); app.get(RealtimePubSubService).start(); app.get(RealtimeNotificationService).start();
  } catch { await app.close(); throw new Error('Bancada de tempo real indisponível'); }
}
void iniciar();

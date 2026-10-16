<!-- Define alvos, comandos e evidências do ensaio isolado F07.7 sem acessar produção. -->
# F07.7 — Ensaio isolado da ingestão

Estado: execução isolada autorizada explicitamente pelo programador em
14/10/2026: criar/limpar dados sintéticos, aplicar schema/constraints no vers_test,
reiniciar/recarregar somente broker do projeto e parar serviços ao terminar,
preservando volumes. Neon e containers atuais excluídos do alvo.

## Escopo e isolamento

Reutilizar PostgreSQL 16 de docker-compose.test-db.yml, exclusivamente
127.0.0.1:55432/vers_test, usuário/senha sintéticos já fixados no setup da suíte.
Adicionar docker-compose.test-mqtt.yml, configurações em docker/mqtt-test e
testes em services/backend/test/db e test/mqtt. Projeto Compose dedicado
vers-mqtt-rehearsal; broker somente 127.0.0.1:58883, nenhum env_file real.
CLI usa compose.env.example vazio para não carregar configuração real da raiz.

Certificado de ensaio gerado com OpenSSL da imagem local refacdovers-backend,
sem instalar dependências ou gravar chaves no repositório. Volume dedicado TLS,
senha sintética por dispositivo e credencial consumidora somente leitura.
Porta TLS, certificado confiado apenas no processo de testes via
NODE_EXTRA_CA_CERTS, ACL por tópico e limite de pacote no broker. Mosquitto
local não comprova configuração/isolamento/limites do HiveMQ Cloud.

Não iniciar pipeline do vers-backend atual nem acessar seu banco. As únicas
gravações e alterações de recursos previstas são nas entidades sintéticas e
containers/volumes deste projeto de ensaio. Testes limpam somente seus IDs;
não apagar volumes ou dados existentes automaticamente.

## Matriz de evidências

- PostgreSQL: duas recepções simultâneas e dois processamentos simultâneos,
  uma mensagem/um lote/uma chave de resumo; bruto imutável.
- Falha após amostra/resumo/estado dentro da transação: rollback real, bruto
  RECEIVED e posterior recuperação sem duplicação.
- Captura tardia na fronteira UTC, contadores conhecidos, null/zero/SUSPECT e
  leitura fora do teste; oracle independente preservando energia.
- Broker TLS: envio pelo simulador, QoS 1, duplicata, reconexão após restart,
  retomada por nova instância consumidora e sessão offline.
- ACL: dispositivo não publica em outro tópico; backend não publica; conexão
  sem confiança TLS e senha inválida falham.
- Revogação: backend recusa dispositivo revogado, broker impede nova conexão
  após remoção da credencial. Password file não prova encerramento de clientes
  já autenticados: política de revogação de sessões HiveMQ segue pendente.

## Sequência de execução após autorização

1. Criar projeto Compose isolado com PostgreSQL e Mosquitto TLS.
2. Copiar somente certificado público para output/mqtt-rehearsal/server.crt.
3. Executar npm run test:db no backend (setup fixa URL local e aplica somente
   schema/constraints de teste), incluindo a nova suíte da ingestão.
4. Iniciar novo Node/Jest com NODE_EXTRA_CA_CERTS apontando ao certificado,
   usando test/jest.mqtt.config.cjs; nenhum segredo real é consultado.
5. Registrar resultados e limites; parar somente serviços do projeto de ensaio.
   Não remover volumes sem solicitação específica.

Comando-base Compose (raiz): docker compose -p vers-mqtt-rehearsal --env-file
docker/mqtt-test/compose.env.example -f docker-compose.test-db.yml -f
docker-compose.test-mqtt.yml. Testes podem reiniciar/recarregar somente mqtt-test
desse projeto para verificar reconexão/credenciais.

## Fechamento

### Correção necessária encontrada no ensaio PostgreSQL

Recepção concorrente retornou RECEIVED/REJECTED para retransmissão idêntica.
Diagnóstico local revertido confirmou Prisma 6.19.3 arredondando JSON numérico
na gravação: 10.000555555555556 tornou-se 10.00055555555556; filtro JSON do
mesmo Prisma também confundiu valor adjacente. Não usar tolerância ou somente
filtro equals como solução, pois conteúdo divergente deve continuar conflito.

Escopo adicional informado: mqtt-reception.service.ts/spec.ts,
mqtt-processing.service.spec.ts, mqtt-contract.ts e testes de regressão SQL.
Gravar envelope com JSON.stringify passado como parâmetro textual ::jsonb em
INSERT estático; ler payload::text antes de JSON.parse para deduplicação e
normalização. Extrair validação de objeto já decodificado para reutilizar no
bruto persistido, preservando limite de bytes/UTF-8 na entrada de rede. JSONB
pode expandir números/whitespace, portanto não reaplicar limite dos bytes MQTT
à representação textual gerada pelo banco. Sem migration, coluna ou tolerância.
TDD já RED com duas falhas PostgreSQL; acrescentar caso de doubles adjacentes
para comprovar que não se aceita conflito nem se altera precisão do bruto.
Diagnóstico também confirmou aproximação no caminho Float do Prisma. O teste
exige igualdade exata no JSONB bruto e distinção de doubles adjacentes na
deduplicação; amostras/derivações Float continuam verificadas pela tolerância
1e-12 do contrato, sem promessa de igualdade binária ou migração de tipos.

Testes unitários/lint/build continuam obrigatórios. Registrar contagens,
falhas corrigidas, rollback/concorrência reais e recursos deixados ativos.
Não declarar F07/HiveMQ/firmware ou implantação de produção completos com
ensaio apenas local. ESP32 segue sem firmware integrado; retenção de produção,
ACL/credenciais e revogação de sessões reais exigem decisões/ensaio próprios.

### Resultado em 14/10/2026

- 39 suítes/809 testes unitários aprovados; lint, build e TypeScript noEmit
  incluindo testes aprovados. Sem dependência ou migration nova.
- 9 suítes/33 testes PostgreSQL aprovados, dez específicos da ingestão:
  concorrência, colisão global com SQLSTATE 23505/reconsulta em transação nova,
  rollback após resumos e antes do commit, recuperação em nova instância,
  imutabilidade, precisão do JSONB, fronteiras UTC e autorização revalidada.
- Sete cenários TLS aprovados: simulador completo/retransmissão, sessão offline
  retomada em outro processo, restart do broker, certificado não confiado/senha
  inválida, pacote excessivo, ACL e revogação de nova conexão.
- Pacote de payload 66.049 bytes encerrou conexão com MQTT 5 reason 149,
  sem bruto gravado. Broker limita pacote a 66.048 bytes e payload a 65.536;
  parser mantém limite próprio de 65.536 bytes. Não é ensaio de carga.
- Mosquitto pode aceitar assinatura sem direito de leitura: o teste verifica
  ausência de entrega ao dispositivo e entrega ao consumidor autorizado.
- Recursos vers-mqtt-rehearsal parados ao concluir; volumes preservados.
  Fixtures removidas por IDs, sem limpeza global do banco. Certificado público
  em output/mqtt-rehearsal ignorado pelo Git; chave somente no volume TLS.
- Backend habitual reconstruído/reiniciado com a correção. Live ok; readiness
  inicialmente indisponível e depois ok com database/redis ok e MQTT disabled.
  Nenhum início automático do pipeline ou publicação no broker real.

Reprodução: a partir da raiz, usar comando-base acima com `up -d --wait`;
copiar certificado com `cp mqtt-test:/tls/server.crt output/mqtt-rehearsal/server.crt`.
No backend executar `npm.cmd run test:db` para preparar schema/constraints
locais, `npm.cmd run build`, e então em novo processo PowerShell:

```powershell
$env:NODE_EXTRA_CA_CERTS = [IO.Path]::GetFullPath('../../output/mqtt-rehearsal/server.crt')
node node_modules/jest/bin/jest.js --config test/jest.mqtt.config.cjs --runInBand
```

Ao terminar usar comando-base com `stop`; nunca `down -v` automaticamente.
Certificado de bancada expira em dois dias: em execução futura será necessário
renová-lo pelo inicializador e recopiá-lo antes dos testes. As credenciais dos
exemplos são exclusivamente sintéticas e não devem ser usadas fora do ensaio.

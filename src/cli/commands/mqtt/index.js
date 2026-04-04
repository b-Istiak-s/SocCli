import { MqttWsClient } from '../../../core/mqtt/client.js';
import { parseHeaders, parseKeyValues } from '../../../utils/headers.js';
import { printIncoming, safeJsonParse } from '../../../utils/output.js';
import { startInteractivePrompt } from '../../../utils/prompts.js';

function buildEndpoint(url, options) {
  return {
    url,
    host: options.host,
    port: options.port,
    secure: options.secure,
    path: options.path,
    query: parseKeyValues(options.query),
    headers: parseHeaders(options.header)
  };
}

async function connectClient(url, options, context) {
  const client = new MqttWsClient({ logger: context.logger, rawFrames: context.opts.rawFrames });
  const wsUrl = await client.connect(buildEndpoint(url, options));
  context.logger.info(`Connected: ${wsUrl}`);

  client.onMessage((payload) => printIncoming('mqtt', payload, context.opts.rawFrames));
  client.onUnexpectedClose((error) => {
    context.logger.error(error.message);
    process.exit(1);
  });

  client.init({
    clientId: options.clientId,
    username: options.username,
    password: options.password,
    keepAlive: options.keepAlive,
    cleanSession: options.cleanSession
  });

  return client;
}

function registerSessionOptions(command) {
  return command
    .option('--client-id <id>', 'MQTT client id')
    .option('--username <username>', 'MQTT username')
    .option('--password <password>', 'MQTT password')
    .option('--keep-alive <seconds>', 'MQTT keep alive in seconds', Number, 30)
    .option('--clean-session', 'Enable MQTT clean session', true);
}

export function registerMqttCommands(mqttCmd, context) {
  const baseConnect = registerSessionOptions(
    mqttCmd
      .command('connect [url]')
      .description('Connect to MQTT over WebSocket endpoint.')
      .option('--host <host>')
      .option('--port <port>', undefined, Number)
      .option('--secure')
      .option('--path <path>', '/mqtt')
      .option('--query <key=value...>', 'Extra query', (value, prev) => [...prev, value], [])
      .option('-H, --header <name:value...>', 'WebSocket header', (value, prev) => [...prev, value], [])
  );

  baseConnect.action(async (url, options) => {
    const client = await connectClient(url, options, context);

    startInteractivePrompt({
      onLine: async (line) => {
        const payload = safeJsonParse(line);
        if (typeof payload === 'object' && payload?.action === 'subscribe' && payload.topic) {
          const id = client.subscribe({ topic: payload.topic, qos: payload.qos ?? 0 });
          context.logger.info(`Subscribed to ${payload.topic} with id=${id}`);
          return;
        }

        if (typeof payload === 'object' && payload?.action === 'publish' && payload.topic) {
          client.publish({ topic: payload.topic, payload: payload.payload ?? '' });
          return;
        }

        if (typeof payload === 'object' && payload?.action === 'ping') {
          client.ping();
          return;
        }

        client.sendRaw(line);
      },
      onClose: () => {
        client.disconnect();
        client.close();
      },
      promptText: 'mqtt> '
    });
  });

  const sub = registerSessionOptions(
    mqttCmd
      .command('subscribe [url]')
      .description('Connect, initialize MQTT session and subscribe to a topic.')
      .requiredOption('--topic <topic>', 'Topic filter')
      .option('--qos <qos>', 'QoS (0 only currently supported by send path)', Number, 0)
      .option('--publish <message>', 'Optional publish message after subscribe')
      .option('--host <host>')
      .option('--port <port>', undefined, Number)
      .option('--secure')
      .option('--path <path>', '/mqtt')
      .option('--query <key=value...>', 'Extra query', (value, prev) => [...prev, value], [])
      .option('-H, --header <name:value...>', 'WebSocket header', (value, prev) => [...prev, value], [])
  );

  sub.action(async (url, options) => {
    const client = await connectClient(url, options, context);
    const id = client.subscribe({ topic: options.topic, qos: options.qos });
    context.logger.info(`Subscribed to ${options.topic} with id=${id}`);

    if (options.publish) {
      client.publish({ topic: options.topic, payload: options.publish, qos: 0 });
      context.logger.info(`Published message to ${options.topic}`);
    }

    startInteractivePrompt({
      onLine: async (line) => client.publish({ topic: options.topic, payload: line, qos: 0 }),
      onClose: () => {
        client.disconnect();
        client.close();
      },
      promptText: 'mqtt> '
    });
  });
}

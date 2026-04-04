import { StompWsClient } from '../../../core/stomp/client.js';
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
  const client = new StompWsClient({ logger: context.logger, rawFrames: context.opts.rawFrames });
  const wsUrl = await client.connect(buildEndpoint(url, options));
  context.logger.info(`Connected: ${wsUrl}`);

  client.onMessage((payload) => printIncoming('stomp', payload, context.opts.rawFrames));
  client.onUnexpectedClose((error) => {
    context.logger.error(error.message);
    process.exit(1);
  });

  client.connectFrame({
    host: options.vhost,
    login: options.login,
    passcode: options.passcode,
    heartBeat: options.heartbeat
  });

  return client;
}

export function registerStompCommands(stompCmd, context) {
  stompCmd
    .command('connect [url]')
    .description('Connect to a STOMP over WebSocket endpoint.')
    .option('--host <host>')
    .option('--port <port>', undefined, Number)
    .option('--secure')
    .option('--path <path>', '/ws')
    .option('--query <key=value...>', 'Extra query', (value, prev) => [...prev, value], [])
    .option('--vhost <host>', 'STOMP host header', '/')
    .option('--login <login>', 'STOMP login')
    .option('--passcode <passcode>', 'STOMP passcode')
    .option('--heartbeat <heartbeat>', 'heart-beat header', '0,0')
    .option('-H, --header <name:value...>', 'WebSocket header', (value, prev) => [...prev, value], [])
    .action(async (url, options) => {
      const client = await connectClient(url, options, context);
      startInteractivePrompt({
        onLine: async (line) => {
          const payload = safeJsonParse(line);
          if (typeof payload === 'object' && payload?.destination) {
            client.send({ destination: payload.destination, body: JSON.stringify(payload.body ?? {}) });
            return;
          }
          client.sendRaw(line);
        },
        onClose: () => client.close(),
        promptText: 'stomp> '
      });
    });

  stompCmd
    .command('subscribe [url]')
    .description('Connect to STOMP and subscribe to a destination.')
    .requiredOption('--destination <destination>', 'Destination queue/topic')
    .option('--send-body <jsonOrText>', 'Optional SEND payload after subscribe')
    .option('--send-content-type <mime>', 'Content type for --send-body', 'application/json')
    .option('--host <host>')
    .option('--port <port>', undefined, Number)
    .option('--secure')
    .option('--path <path>', '/ws')
    .option('--query <key=value...>', 'Extra query', (value, prev) => [...prev, value], [])
    .option('--vhost <host>', 'STOMP host header', '/')
    .option('--login <login>', 'STOMP login')
    .option('--passcode <passcode>', 'STOMP passcode')
    .option('--heartbeat <heartbeat>', 'heart-beat header', '0,0')
    .option('--ack <mode>', 'Ack mode', 'auto')
    .option('--id <id>', 'Subscription id')
    .option('-H, --header <name:value...>', 'WebSocket header', (value, prev) => [...prev, value], [])
    .action(async (url, options) => {
      const client = await connectClient(url, options, context);
      const id = client.subscribe({ destination: options.destination, id: options.id, ack: options.ack });
      context.logger.info(`Subscribed to ${options.destination} with id=${id}`);

      if (options.sendBody) {
        const parsed = safeJsonParse(options.sendBody);
        const body = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
        client.send({ destination: options.destination, body, contentType: options.sendContentType });
      }

      startInteractivePrompt({
        onLine: async (line) => {
          const payload = safeJsonParse(line);
          if (typeof payload === 'object' && payload?.id) {
            client.ack({ id: payload.id, transaction: payload.transaction });
            return;
          }
          client.send({ destination: options.destination, body: line, contentType: 'text/plain' });
        },
        onClose: () => client.close(),
        promptText: 'stomp> '
      });
    });
}

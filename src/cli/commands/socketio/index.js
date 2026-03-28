import { SocketIoClient } from '../../../core/socketio/client.js';
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
  const client = new SocketIoClient({ logger: context.logger, rawFrames: context.opts.rawFrames });
  const wsUrl = await client.connect(buildEndpoint(url, options));
  context.logger.info(`Connected: ${wsUrl}`);

  client.onMessage((payload) => printIncoming('socketio', payload, context.opts.rawFrames));
  client.onUnexpectedClose((error) => {
    context.logger.error(error.message);
    process.exit(1);
  });

  client.initNamespace(options.namespace);
  return client;
}

export function registerSocketIoCommands(socketioCmd, context) {
  socketioCmd
    .command('connect [url]')
    .description('Connect to Socket.IO over Engine.IO WebSocket transport.')
    .option('--host <host>')
    .option('--port <port>', undefined, Number)
    .option('--secure')
    .option('--path <path>', '/socket.io/')
    .option('--namespace <ns>', 'Namespace', '/')
    .option('--query <key=value...>', 'Extra query', (value, prev) => [...prev, value], [])
    .option('-H, --header <name:value...>', 'WebSocket header', (value, prev) => [...prev, value], [])
    .action(async (url, options) => {
      const client = await connectClient(url, options, context);
      startInteractivePrompt({
        onLine: async (line) => client.sendRaw(line),
        onClose: () => client.close(),
        promptText: 'socketio> '
      });
    });

  socketioCmd
    .command('emit [url]')
    .description('Connect and emit a Socket.IO event.')
    .requiredOption('--event <event>', 'Event name')
    .option('--data <jsonOrText>', 'Event payload', '{}')
    .option('--host <host>')
    .option('--port <port>', undefined, Number)
    .option('--secure')
    .option('--path <path>', '/socket.io/')
    .option('--namespace <ns>', 'Namespace', '/')
    .option('--query <key=value...>', 'Extra query', (value, prev) => [...prev, value], [])
    .option('-H, --header <name:value...>', 'WebSocket header', (value, prev) => [...prev, value], [])
    .action(async (url, options) => {
      const client = await connectClient(url, options, context);
      client.emit({ namespace: options.namespace, event: options.event, data: safeJsonParse(options.data) });
      context.logger.info(`Emitted ${options.event} on namespace ${options.namespace}`);

      startInteractivePrompt({
        onLine: async (line) => {
          const payload = safeJsonParse(line);
          if (Array.isArray(payload) && payload.length >= 2) {
            client.emit({ namespace: options.namespace, event: payload[0], data: payload[1] });
            return;
          }
          client.sendRaw(line);
        },
        onClose: () => client.close(),
        promptText: 'socketio> '
      });
    });
}

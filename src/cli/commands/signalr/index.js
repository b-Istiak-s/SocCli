import { SignalRClient } from '../../../core/signalr/client.js';
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
  const client = new SignalRClient({ logger: context.logger, rawFrames: context.opts.rawFrames });
  const wsUrl = await client.connect(buildEndpoint(url, options));
  context.logger.info(`Connected: ${wsUrl}`);

  client.onMessage((payload) => printIncoming('signalr', payload, context.opts.rawFrames));
  client.onUnexpectedClose((error) => {
    context.logger.error(error.message);
    process.exit(1);
  });

  client.handshake();
  return client;
}

function parseArguments(value) {
  if (!value) return [];
  const parsed = safeJsonParse(value);
  return Array.isArray(parsed) ? parsed : [parsed];
}

export function registerSignalRCommands(signalrCmd, context) {
  signalrCmd
    .command('connect [url]')
    .description('Connect to SignalR over WebSocket and send handshake.')
    .option('--host <host>')
    .option('--port <port>', undefined, Number)
    .option('--secure')
    .option('--path <path>', '/hub')
    .option('--query <key=value...>', 'Extra query', (value, prev) => [...prev, value], [])
    .option('-H, --header <name:value...>', 'WebSocket header', (value, prev) => [...prev, value], [])
    .action(async (url, options) => {
      const client = await connectClient(url, options, context);
      startInteractivePrompt({
        onLine: async (line) => {
          const payload = safeJsonParse(line);
          if (typeof payload === 'object' && payload?.target) {
            if (payload.invocationId) {
              client.invoke({ target: payload.target, invocationId: payload.invocationId, argumentsList: payload.arguments ?? [] });
              return;
            }
            client.send({ target: payload.target, argumentsList: payload.arguments ?? [] });
            return;
          }
          client.sendRaw(line);
        },
        onClose: () => client.close(),
        promptText: 'signalr> '
      });
    });

  signalrCmd
    .command('invoke [url]')
    .description('Connect to SignalR and invoke a hub method.')
    .requiredOption('--target <name>', 'Hub method name')
    .option('--args <json>', 'Invocation args JSON array')
    .option('--id <id>', 'Invocation id')
    .option('--host <host>')
    .option('--port <port>', undefined, Number)
    .option('--secure')
    .option('--path <path>', '/hub')
    .option('--query <key=value...>', 'Extra query', (value, prev) => [...prev, value], [])
    .option('-H, --header <name:value...>', 'WebSocket header', (value, prev) => [...prev, value], [])
    .action(async (url, options) => {
      const client = await connectClient(url, options, context);
      const invocationId = client.invoke({
        target: options.target,
        argumentsList: parseArguments(options.args),
        invocationId: options.id
      });
      context.logger.info(`Invoked target=${options.target} id=${invocationId}`);

      startInteractivePrompt({
        onLine: async (line) => client.sendRaw(line),
        onClose: () => client.close(),
        promptText: 'signalr> '
      });
    });
}

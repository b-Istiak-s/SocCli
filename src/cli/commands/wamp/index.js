import { WampWsClient } from '../../../core/wamp/client.js';
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
  const client = new WampWsClient({ logger: context.logger, rawFrames: context.opts.rawFrames });
  const wsUrl = await client.connect(buildEndpoint(url, options));
  context.logger.info(`Connected: ${wsUrl}`);

  client.onMessage((payload) => printIncoming('wamp', payload, context.opts.rawFrames));
  client.onUnexpectedClose((error) => {
    context.logger.error(error.message);
    process.exit(1);
  });

  client.hello({ realm: options.realm });
  return client;
}

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  const parsed = safeJsonParse(value);
  return typeof parsed === 'object' ? parsed : fallback;
}

export function registerWampCommands(wampCmd, context) {
  wampCmd
    .command('connect [url]')
    .description('Connect to WAMP over WebSocket and send HELLO.')
    .option('--realm <realm>', 'WAMP realm', 'realm1')
    .option('--host <host>')
    .option('--port <port>', undefined, Number)
    .option('--secure')
    .option('--path <path>', '/')
    .option('--query <key=value...>', 'Extra query', (value, prev) => [...prev, value], [])
    .option('-H, --header <name:value...>', 'WebSocket header', (value, prev) => [...prev, value], [])
    .action(async (url, options) => {
      const client = await connectClient(url, options, context);
      startInteractivePrompt({
        onLine: async (line) => {
          const payload = safeJsonParse(line);
          if (typeof payload === 'object' && payload?.action === 'subscribe' && payload.topic) {
            const requestId = client.subscribe({ topic: payload.topic, options: payload.options ?? {} });
            context.logger.info(`SUBSCRIBE request=${requestId} topic=${payload.topic}`);
            return;
          }

          if (typeof payload === 'object' && payload?.action === 'publish' && payload.topic) {
            const requestId = client.publish({
              topic: payload.topic,
              args: payload.args ?? [],
              kwargs: payload.kwargs ?? {},
              options: payload.options ?? {}
            });
            context.logger.info(`PUBLISH request=${requestId} topic=${payload.topic}`);
            return;
          }

          if (typeof payload === 'object' && payload?.action === 'call' && payload.procedure) {
            const requestId = client.call({
              procedure: payload.procedure,
              args: payload.args ?? [],
              kwargs: payload.kwargs ?? {},
              options: payload.options ?? {}
            });
            context.logger.info(`CALL request=${requestId} procedure=${payload.procedure}`);
            return;
          }

          client.sendRaw(line);
        },
        onClose: () => {
          client.goodbye();
          client.close();
        },
        promptText: 'wamp> '
      });
    });

  wampCmd
    .command('subscribe [url]')
    .description('Connect to WAMP and subscribe to a topic.')
    .requiredOption('--topic <topic>', 'Topic URI')
    .option('--realm <realm>', 'WAMP realm', 'realm1')
    .option('--publish-args <json>', 'Optional publish args array')
    .option('--publish-kwargs <json>', 'Optional publish kwargs object')
    .option('--host <host>')
    .option('--port <port>', undefined, Number)
    .option('--secure')
    .option('--path <path>', '/')
    .option('--query <key=value...>', 'Extra query', (value, prev) => [...prev, value], [])
    .option('-H, --header <name:value...>', 'WebSocket header', (value, prev) => [...prev, value], [])
    .action(async (url, options) => {
      const client = await connectClient(url, options, context);
      const requestId = client.subscribe({ topic: options.topic });
      context.logger.info(`SUBSCRIBE request=${requestId} topic=${options.topic}`);

      if (options.publishArgs || options.publishKwargs) {
        client.publish({
          topic: options.topic,
          args: Array.isArray(safeJsonParse(options.publishArgs)) ? safeJsonParse(options.publishArgs) : [],
          kwargs: parseJson(options.publishKwargs)
        });
      }

      startInteractivePrompt({
        onLine: async (line) => client.publish({ topic: options.topic, args: [line] }),
        onClose: () => {
          client.goodbye();
          client.close();
        },
        promptText: 'wamp> '
      });
    });

  wampCmd
    .command('call [url]')
    .description('Connect to WAMP and call a procedure.')
    .requiredOption('--procedure <uri>', 'Procedure URI')
    .option('--args <json>', 'Args array JSON')
    .option('--kwargs <json>', 'Kwargs object JSON')
    .option('--realm <realm>', 'WAMP realm', 'realm1')
    .option('--host <host>')
    .option('--port <port>', undefined, Number)
    .option('--secure')
    .option('--path <path>', '/')
    .option('--query <key=value...>', 'Extra query', (value, prev) => [...prev, value], [])
    .option('-H, --header <name:value...>', 'WebSocket header', (value, prev) => [...prev, value], [])
    .action(async (url, options) => {
      const client = await connectClient(url, options, context);
      const args = safeJsonParse(options.args);
      const requestId = client.call({
        procedure: options.procedure,
        args: Array.isArray(args) ? args : [],
        kwargs: parseJson(options.kwargs)
      });
      context.logger.info(`CALL request=${requestId} procedure=${options.procedure}`);

      startInteractivePrompt({
        onLine: async (line) => client.sendRaw(line),
        onClose: () => {
          client.goodbye();
          client.close();
        },
        promptText: 'wamp> '
      });
    });
}

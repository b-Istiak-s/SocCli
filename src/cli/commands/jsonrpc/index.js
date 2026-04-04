import { JsonRpcWsClient } from '../../../core/jsonrpc/client.js';
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
  const client = new JsonRpcWsClient({ logger: context.logger, rawFrames: context.opts.rawFrames });
  const wsUrl = await client.connect(buildEndpoint(url, options));
  context.logger.info(`Connected: ${wsUrl}`);

  client.onMessage((payload) => printIncoming('jsonrpc', payload, context.opts.rawFrames));
  client.onUnexpectedClose((error) => {
    context.logger.error(error.message);
    process.exit(1);
  });

  return client;
}

export function registerJsonRpcCommands(jsonrpcCmd, context) {
  jsonrpcCmd
    .command('connect [url]')
    .description('Connect to a JSON-RPC 2.0 endpoint over WebSocket.')
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
          if (typeof payload === 'object' && payload?.method) {
            if (payload.id === null || payload.id === undefined) {
              client.notify({ method: payload.method, params: payload.params });
              return;
            }
            client.call(payload);
            return;
          }
          client.sendRaw(line);
        },
        onClose: () => client.close(),
        promptText: 'jsonrpc> '
      });
    });

  jsonrpcCmd
    .command('call [url]')
    .description('Connect and send a JSON-RPC request.')
    .requiredOption('--method <name>', 'JSON-RPC method name')
    .option('--params <json>', 'JSON encoded params')
    .option('--id <id>', 'Request id (string or number)')
    .option('--host <host>')
    .option('--port <port>', undefined, Number)
    .option('--secure')
    .option('--path <path>', '/')
    .option('--query <key=value...>', 'Extra query', (value, prev) => [...prev, value], [])
    .option('-H, --header <name:value...>', 'WebSocket header', (value, prev) => [...prev, value], [])
    .action(async (url, options) => {
      const client = await connectClient(url, options, context);
      const resolvedId = options.id ? safeJsonParse(options.id) : undefined;
      const requestId = client.call({ method: options.method, params: safeJsonParse(options.params), id: resolvedId });
      context.logger.info(`Sent JSON-RPC request id=${requestId}`);

      startInteractivePrompt({
        onLine: async (line) => client.sendRaw(line),
        onClose: () => client.close(),
        promptText: 'jsonrpc> '
      });
    });
}

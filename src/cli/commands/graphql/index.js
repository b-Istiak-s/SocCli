import { GraphqlWsClient } from '../../../core/graphql/client.js';
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
    query: parseKeyValues(options.urlQuery ?? []),
    headers: parseHeaders(options.header)
  };
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  return JSON.parse(value);
}

async function connectAndInit(url, options, context) {
  const client = new GraphqlWsClient({ logger: context.logger, rawFrames: context.opts.rawFrames });
  const wsUrl = await client.connect(buildEndpoint(url, options));
  context.logger.info(`Connected: ${wsUrl}`);

  client.onMessage((payload) => printIncoming('graphql', payload, context.opts.rawFrames));
  client.onUnexpectedClose((error) => {
    context.logger.error(error.message);
    process.exit(1);
  });

  await client.init(parseJson(options.initPayload, {}));
  context.logger.info('Received connection_ack');
  return client;
}

export function registerGraphqlCommands(graphqlCmd, context) {
  graphqlCmd
    .command('connect [url]')
    .description('Connect to graphql-transport-ws and initialize the connection.')
    .option('--host <host>')
    .option('--port <port>', undefined, Number)
    .option('--secure')
    .option('--path <path>', '/graphql')
    .option('--init-payload <json>', 'connection_init payload JSON')
    .option('--url-query <key=value...>', 'Extra URL query params', (value, prev) => [...prev, value], [])
    .option('-H, --header <name:value...>', 'WebSocket header', (value, prev) => [...prev, value], [])
    .action(async (url, options) => {
      const client = await connectAndInit(url, options, context);
      startInteractivePrompt({
        onLine: async (line) => client.subscribe({ query: line }),
        onClose: () => client.close(),
        promptText: 'graphql> '
      });
    });

  graphqlCmd
    .command('subscribe [url]')
    .description('Connect, init, and create a GraphQL subscription.')
    .requiredOption('--query <graphql>', 'Subscription query')
    .option('--variables <json>', 'Variables JSON')
    .option('--operation-name <name>', 'Operation name')
    .option('--id <id>', 'Subscription id')
    .option('--host <host>')
    .option('--port <port>', undefined, Number)
    .option('--secure')
    .option('--path <path>', '/graphql')
    .option('--init-payload <json>', 'connection_init payload JSON')
    .option('--url-query <key=value...>', 'Extra URL query params', (value, prev) => [...prev, value], [])
    .option('-H, --header <name:value...>', 'WebSocket header', (value, prev) => [...prev, value], [])
    .action(async (url, options) => {
      const client = await connectAndInit(url, options, context);
      const id = client.subscribe({
        id: options.id,
        query: options.query,
        variables: parseJson(options.variables),
        operationName: options.operationName
      });
      context.logger.info(`Subscribed with id=${id}`);

      startInteractivePrompt({
        onLine: async (line) => {
          const parsed = safeJsonParse(line);
          if (typeof parsed === 'object' && parsed?.type === 'complete' && parsed.id) {
            client.complete(parsed.id);
            return;
          }
          if (typeof parsed === 'object' && parsed?.query) {
            client.subscribe(parsed);
            return;
          }
          client.subscribe({ query: line });
        },
        onClose: () => client.close(),
        promptText: 'graphql> '
      });
    });
}

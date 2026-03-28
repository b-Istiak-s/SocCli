import { Command } from 'commander';
import { GraphqlWsClient } from '../../../core/graphql/client.js';
import { buildUrlFromOptions, parseHeaders, parseJsonOrThrow } from '../../../utils/headers.js';
import { startInteractiveSession } from '../../../utils/prompts.js';
import { printSystem } from '../../../utils/output.js';

function collect(value, previous = []) {
  previous.push(value);
  return previous;
}

function withConnectionOptions(cmd) {
  return cmd
    .option('--host <host>', 'Host for advanced mode')
    .option('--port <port>', 'Port for advanced mode')
    .option('--secure', 'Use wss:// in advanced mode')
    .option('--path <path>', 'Path for advanced mode', '/graphql')
    .option('--query <key=value>', 'Query parameter', collect, [])
    .option('-H, --header <header>', 'Socket header', collect, [])
    .option('--init-payload <json>', 'connection_init payload as JSON')
    .option('--raw-frames', 'Print raw frames')
    .option('--verbose', 'Verbose logs')
    .option('--debug', 'Debug logs');
}

export function registerGraphqlCommands(program, makeLogger) {
  const graphql = new Command('graphql').description('GraphQL subscriptions over graphql-transport-ws');

  withConnectionOptions(graphql.command('connect [url]').description('Connect to GraphQL WS transport')).action(async (url, options) => {
    options.url = url;
    const logger = makeLogger(options);
    const endpoint = buildUrlFromOptions(options, { path: '/graphql' });

    const client = new GraphqlWsClient({
      url: endpoint,
      headers: parseHeaders(options.header),
      logger,
      initPayload: parseJsonOrThrow(options.initPayload, 'connection init payload'),
      rawFrames: options.rawFrames
    });
    client.transport.on('close', ({ code, reason }) => {
      if (code !== 1000) {
        printSystem(`Unexpected disconnect: code=${code} reason=${reason || 'n/a'}`);
        process.exitCode = 1;
        process.stdin.pause();
      }
    });
    await client.connect();

    await startInteractiveSession({
      onLine: async (line) => client.transport.send(line),
      onClose: async () => client.close(),
      prompt: 'graphql> '
    });
  });

  withConnectionOptions(graphql.command('subscribe [url]').description('Connect and start GraphQL subscription'))
    .requiredOption('--query <query>', 'GraphQL subscription query')
    .option('--variables <json>', 'GraphQL variables JSON')
    .option('--operation-name <name>', 'Operation name')
    .action(async (url, options) => {
      options.url = url;
      const logger = makeLogger(options);
      const endpoint = buildUrlFromOptions(options, { path: '/graphql' });

      const client = new GraphqlWsClient({
        url: endpoint,
        headers: parseHeaders(options.header),
        logger,
        initPayload: parseJsonOrThrow(options.initPayload, 'connection init payload'),
        rawFrames: options.rawFrames
      });
      client.transport.on('close', ({ code, reason }) => {
        if (code !== 1000) {
          printSystem(`Unexpected disconnect: code=${code} reason=${reason || 'n/a'}`);
          process.exitCode = 1;
          process.stdin.pause();
        }
      });
      await client.connect();
      const id = client.subscribe({
        query: options.query,
        variables: parseJsonOrThrow(options.variables, 'variables'),
        operationName: options.operationName
      });

      await startInteractiveSession({
        onLine: async (line) => {
          if (line === '/complete') {
            client.complete(id);
            return;
          }
          client.transport.send(line);
        },
        onClose: async () => {
          client.complete(id);
          client.close();
        },
        prompt: 'graphql-sub> ',
        intro: 'Interactive mode. Type /complete to end subscription.'
      });
    });

  program.addCommand(graphql);
}

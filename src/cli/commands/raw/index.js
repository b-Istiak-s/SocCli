import { RawClient } from '../../../core/raw/client.js';
import { parseHeaders, parseKeyValues } from '../../../utils/headers.js';
import { printIncoming } from '../../../utils/output.js';
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

export function registerRawCommands(rawCmd, context) {
  rawCmd
    .command('connect [url]')
    .description('Connect to a raw WebSocket endpoint.')
    .option('--host <host>', 'Host for advanced mode')
    .option('--port <port>', 'Port for advanced mode', Number)
    .option('--secure', 'Use wss:// in advanced mode')
    .option('--path <path>', 'Path in advanced mode', '/')
    .option('--query <key=value...>', 'Query param in advanced mode', (value, prev) => [...prev, value], [])
    .option('-H, --header <name:value...>', 'Request header', (value, prev) => [...prev, value], [])
    .action(async (url, options) => {
      const client = new RawClient({ logger: context.logger, rawFrames: context.opts.rawFrames });
      const endpoint = buildEndpoint(url, options);
      const wsUrl = await client.connect(endpoint);
      context.logger.info(`Connected: ${wsUrl}`);

      client.onMessage((payload) => printIncoming('raw', payload, context.opts.rawFrames));
      client.onUnexpectedClose((error) => {
        context.logger.error(error.message);
        process.exit(1);
      });

      startInteractivePrompt({
        onLine: async (line) => client.send(line),
        onClose: () => client.close(),
        promptText: 'raw> '
      });
    });
}

import { PusherClient } from '../../../core/pusher/client.js';
import { parseHeaders, parseKeyValues } from '../../../utils/headers.js';
import { printIncoming, safeJsonParse } from '../../../utils/output.js';
import { startInteractivePrompt } from '../../../utils/prompts.js';

function buildEndpoint(url, options) {
  const query = {
    protocol: options.protocol,
    client: 'soccli',
    version: options.version,
    ...parseKeyValues(options.query)
  };

  return {
    url,
    host: options.host,
    port: options.port,
    secure: options.secure,
    path: options.path,
    query,
    headers: parseHeaders(options.header)
  };
}

async function runSubscribe(url, options, context) {
  const client = new PusherClient({ logger: context.logger, rawFrames: context.opts.rawFrames });
  const wsUrl = await client.connect(buildEndpoint(url, options));
  context.logger.info(`Connected: ${wsUrl}`);

  client.onMessage((payload) => printIncoming('pusher', payload, context.opts.rawFrames));
  client.onUnexpectedClose((error) => {
    context.logger.error(error.message);
    process.exit(1);
  });

  await client.subscribe({
    channel: options.channel,
    authEndpoint: options.authEndpoint,
    authHeaders: parseHeaders(options.authHeader),
    authPayload: options.authPayload,
    appKey: options.appKey,
    appSecret: options.appSecret,
    channelData: options.channelData
  });

  context.logger.info(`Subscribed to ${options.channel}`);

  startInteractivePrompt({
    onLine: async (line) => {
      const payload = safeJsonParse(line);
      if (typeof payload === 'object' && payload?.event) {
        client.sendEvent(payload);
      } else {
        client.sendEvent({
          event: options.defaultEvent,
          channel: options.channel,
          data: line
        });
      }
    },
    onClose: () => client.close(),
    promptText: 'pusher> '
  });
}

export function registerPusherCommands(pusherCmd, context) {
  pusherCmd
    .command('connect [url]')
    .description('Connect to a Pusher/Reverb endpoint without subscribing.')
    .option('--host <host>')
    .option('--port <port>', undefined, Number)
    .option('--secure')
    .option('--path <path>', '/app')
    .option('--app-key <appKey>', 'Pusher app key for advanced mode path composition')
    .option('--protocol <version>', 'Pusher protocol version', '7')
    .option('--version <clientVersion>', 'Client version advertised in query', '0.1.0')
    .option('--query <key=value...>', 'Extra query', (value, prev) => [...prev, value], [])
    .option('-H, --header <name:value...>', 'WebSocket header', (value, prev) => [...prev, value], [])
    .action(async (url, options) => {
      if (!url && options.appKey && options.path === '/app') {
        options.path = `/app/${options.appKey}`;
      }
      const client = new PusherClient({ logger: context.logger, rawFrames: context.opts.rawFrames });
      const wsUrl = await client.connect(buildEndpoint(url, options));
      context.logger.info(`Connected: ${wsUrl}`);
      client.onMessage((payload) => printIncoming('pusher', payload, context.opts.rawFrames));
      client.onUnexpectedClose((error) => {
        context.logger.error(error.message);
        process.exit(1);
      });
      startInteractivePrompt({ onLine: async (line) => client.sendEvent({ event: 'client-message', data: line }), onClose: () => client.close(), promptText: 'pusher> ' });
    });

  pusherCmd
    .command('subscribe [url]')
    .description('Connect and subscribe to a Pusher/Reverb channel.')
    .requiredOption('--channel <name>', 'Channel name')
    .option('--host <host>')
    .option('--port <port>', undefined, Number)
    .option('--secure')
    .option('--path <path>', '/app')
    .option('--app-key <appKey>', 'Pusher app key (also used for manual signing)')
    .option('--app-secret <secret>', 'App secret for manual auth signature')
    .option('--channel-data <json>', 'Presence channel_data JSON for manual signing')
    .option('--auth-endpoint <url>', 'HTTP auth endpoint for private/presence channels')
    .option('--auth-payload <json>', 'Manual auth response JSON override')
    .option('--auth-header <name:value...>', 'Auth request header', (value, prev) => [...prev, value], [])
    .option('--default-event <event>', 'Default event name for interactive send', 'client-message')
    .option('--protocol <version>', 'Pusher protocol version', '7')
    .option('--version <clientVersion>', 'Client version advertised in query', '0.1.0')
    .option('--query <key=value...>', 'Extra query', (value, prev) => [...prev, value], [])
    .option('-H, --header <name:value...>', 'WebSocket header', (value, prev) => [...prev, value], [])
    .action(async (url, options) => {
      if (!url && options.appKey && options.path === '/app') {
        options.path = `/app/${options.appKey}`;
      }
      await runSubscribe(url, options, context);
    });
}

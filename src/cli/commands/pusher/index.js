import { Command } from 'commander';
import { PusherClient } from '../../../core/pusher/client.js';
import { buildUrlFromOptions, parseHeaders } from '../../../utils/headers.js';
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
    .option('--path <path>', 'Path for advanced mode')
    .option('--query <key=value>', 'Query parameter for advanced mode', collect, [])
    .option('-H, --header <header>', 'Socket header', collect, [])
    .option('--auth-endpoint <url>', 'Private/presence auth endpoint')
    .option('--auth-header <header>', 'Auth endpoint header', collect, [])
    .option('--app-key <key>', 'Pusher app key (for auth signature fallback)')
    .option('--app-secret <secret>', 'Pusher app secret for local auth signature')
    .option('--raw-frames', 'Print raw frames')
    .option('--verbose', 'Verbose logs')
    .option('--debug', 'Debug logs');
}

export function registerPusherCommands(program, makeLogger) {
  const pusher = new Command('pusher').description('Pusher/Reverb protocol commands');

  withConnectionOptions(pusher.command('connect [url]').description('Connect to pusher/reverb endpoint')).action(async (url, options) => {
    options.url = url;
    const logger = makeLogger(options);
    const endpoint = buildUrlFromOptions(options);
    const client = new PusherClient({
      url: endpoint,
      headers: parseHeaders(options.header),
      logger,
      authEndpoint: options.authEndpoint,
      authHeaders: parseHeaders(options.authHeader),
      appKey: options.appKey,
      appSecret: options.appSecret,
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
      onLine: async (line) => {
        if (line.startsWith('/trigger ')) {
          const [, event, channel, ...rest] = line.split(' ');
          client.trigger(event, rest.join(' '), channel);
        } else {
          client.transport.send(line);
        }
      },
      onClose: async () => client.close(),
      prompt: 'pusher> ',
      intro: 'Interactive mode. Use /trigger <event> <channel> <data> or raw JSON frames.'
    });
  });

  withConnectionOptions(pusher.command('subscribe [url]').description('Connect and subscribe to a channel'))
    .requiredOption('--channel <name>', 'Channel name to subscribe')
    .option('--channel-data <json>', 'Presence channel_data JSON string')
    .option('--auth <value>', 'Manual auth override (authorizer result)')
    .option('--listen-event <event>', 'Optional event hint for logs')
    .action(async (url, options) => {
      options.url = url;
      const logger = makeLogger(options);
      const endpoint = buildUrlFromOptions(options, {
        path: options.appKey ? `/app/${options.appKey}` : options.path,
        query: { protocol: '7', client: 'soccli', version: '0.1.0' }
      });

      const client = new PusherClient({
        url: endpoint,
        headers: parseHeaders(options.header),
        logger,
        authEndpoint: options.authEndpoint,
        authHeaders: parseHeaders(options.authHeader),
        appKey: options.appKey,
        appSecret: options.appSecret,
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

      const waitForSocket = async () => {
        const maxMs = 5000;
        const started = Date.now();
        while (!client.socketId && Date.now() - started < maxMs) {
          await new Promise((r) => setTimeout(r, 100));
        }
        if (!client.socketId) throw new Error('Timed out waiting for pusher:connection_established frame.');
      };
      await waitForSocket();

      await client.subscribe({
        channel: options.channel,
        channelData: options.channelData,
        auth: options.auth,
        listenEvent: options.listenEvent
      });

      await startInteractiveSession({
        onLine: async (line) => {
          if (line.startsWith('/trigger ')) {
            const [, event, ...rest] = line.split(' ');
            client.trigger(event, rest.join(' '), options.channel);
          } else {
            client.transport.send(line);
          }
        },
        onClose: async () => client.close(),
        prompt: 'pusher-sub> '
      });
    });

  program.addCommand(pusher);
}

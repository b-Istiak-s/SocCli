import { Command } from 'commander';
import { SocketIoClient } from '../../../core/socketio/client.js';
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
    .option('--path <path>', 'Engine.IO path', '/socket.io/')
    .option('--query <key=value>', 'Query parameter', collect, [])
    .option('--namespace <namespace>', 'Socket.IO namespace', '/')
    .option('-H, --header <header>', 'Socket header', collect, [])
    .option('--raw-frames', 'Print raw frames')
    .option('--verbose', 'Verbose logs')
    .option('--debug', 'Debug logs');
}

export function registerSocketIoCommands(program, makeLogger) {
  const socketio = new Command('socketio').description('Socket.IO protocol commands');

  withConnectionOptions(socketio.command('connect [url]').description('Connect interactively to Socket.IO endpoint')).action(async (url, options) => {
    options.url = url;
    const logger = makeLogger(options);
    const endpoint = buildUrlFromOptions(options, {
      path: '/socket.io/',
      query: { EIO: '4', transport: 'websocket' }
    });

    const client = new SocketIoClient({
      url: endpoint,
      headers: parseHeaders(options.header),
      logger,
      namespace: options.namespace,
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
        if (line.startsWith('/emit ')) {
          const [, event, ...rest] = line.split(' ');
          client.emit(event, rest.join(' '), options.namespace);
        } else {
          client.transport.send(line);
        }
      },
      onClose: async () => client.close(),
      prompt: 'socketio> ',
      intro: 'Interactive mode. Use /emit <event> <data> or raw frames.'
    });
  });

  withConnectionOptions(socketio.command('emit [url]').description('Connect and emit one event, then continue interactive mode'))
    .requiredOption('--event <name>', 'Event name')
    .option('--data <json>', 'JSON payload')
    .action(async (url, options) => {
      options.url = url;
      const logger = makeLogger(options);
      const endpoint = buildUrlFromOptions(options, {
        path: '/socket.io/',
        query: { EIO: '4', transport: 'websocket' }
      });

      const client = new SocketIoClient({
        url: endpoint,
        headers: parseHeaders(options.header),
        logger,
        namespace: options.namespace,
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
      const payload = options.data ? parseJsonOrThrow(options.data, 'Socket.IO event data') : null;
      client.emit(options.event, payload, options.namespace);

      await startInteractiveSession({
        onLine: async (line) => client.transport.send(line),
        onClose: async () => client.close(),
        prompt: 'socketio-emit> '
      });
    });

  program.addCommand(socketio);
}

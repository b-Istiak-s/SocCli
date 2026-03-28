import { Command } from 'commander';
import { RawClient } from '../../../core/raw/client.js';
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
    .option('--path <path>', 'Path for advanced mode', '/')
    .option('--query <key=value>', 'Query parameter for advanced mode', collect, [])
    .option('-H, --header <header>', 'HTTP header', collect, [])
    .option('--raw-frames', 'Print raw frames')
    .option('--verbose', 'Verbose logs')
    .option('--debug', 'Debug logs');
}

export function registerRawCommands(program, makeLogger) {
  const raw = new Command('raw').description('Raw WebSocket commands');

  withConnectionOptions(raw.command('connect [url]').description('Connect to a raw websocket endpoint')).action(async (url, options) => {
    options.url = url;
    const logger = makeLogger(options);
    const headers = parseHeaders(options.header);
    const endpoint = buildUrlFromOptions(options);
    const client = new RawClient({ url: endpoint, headers, logger, rawFrames: options.rawFrames });

    let unexpectedDisconnect = false;
    client.transport.on('close', ({ code, reason }) => {
      if (code !== 1000) {
        unexpectedDisconnect = true;
        printSystem(`Unexpected disconnect: code=${code} reason=${reason || 'n/a'}`);
        process.exitCode = 1;
        process.stdin.pause();
      }
    });

    await client.connect();
    await startInteractiveSession({
      onLine: async (line) => client.send(line),
      onClose: async () => client.close(),
      prompt: 'raw> '
    });

    if (unexpectedDisconnect) process.exitCode = 1;
  });

  program.addCommand(raw);
}

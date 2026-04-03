import { Command } from 'commander';
import { registerRawCommands } from './commands/raw/index.js';
import { registerPusherCommands } from './commands/pusher/index.js';
import { registerSocketIoCommands } from './commands/socketio/index.js';
import { registerGraphqlCommands } from './commands/graphql/index.js';
import { createLogger } from '../utils/logger.js';

export async function run(argv) {
  const program = new Command();

  program
    .name('soccli')
    .description('Terminal-first real-time protocol CLI (raw WebSocket, Pusher/Reverb, Socket.IO, GraphQL subscriptions)')
    .option('-v, --verbose', 'Verbose logs')
    .option('--debug', 'Debug logs')
    .option('--raw-frames', 'Print payloads as raw frames')
    .showHelpAfterError('(add --help for additional usage)');

  const raw = program.command('raw').description('Raw WebSocket protocol');
  const pusher = program.command('pusher').description('Pusher / Laravel Reverb protocol');
  const socketio = program.command('socketio').description('Socket.IO over Engine.IO protocol');
  const graphql = program.command('graphql').description('GraphQL subscriptions over graphql-transport-ws');

  const context = {
    get opts() {
      return program.opts();
    },
    get logger() {
      return createLogger(program.opts());
    }
  };

  registerRawCommands(raw, context);
  registerPusherCommands(pusher, context);
  registerSocketIoCommands(socketio, context);
  registerGraphqlCommands(graphql, context);

  await program.parseAsync(argv);
}

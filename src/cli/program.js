import { Command } from 'commander';
import { createLogger } from '../utils/logger.js';
import { registerRawCommands } from './commands/raw/index.js';
import { registerPusherCommands } from './commands/pusher/index.js';
import { registerSocketIoCommands } from './commands/socketio/index.js';
import { registerGraphqlCommands } from './commands/graphql/index.js';

function makeLogger(opts) {
  return createLogger({ verbose: opts.verbose, debug: opts.debug });
}

export async function run(argv) {
  const program = new Command();

  program
    .name('soccli')
    .description('curl for real-time systems: WebSocket, Pusher/Reverb, Socket.IO, GraphQL subscriptions')
    .version('0.1.0');

  registerRawCommands(program, makeLogger);
  registerPusherCommands(program, makeLogger);
  registerSocketIoCommands(program, makeLogger);
  registerGraphqlCommands(program, makeLogger);

  await program.parseAsync(argv);
}

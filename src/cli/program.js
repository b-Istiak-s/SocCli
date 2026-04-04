import { Command } from 'commander';
import { registerRawCommands } from './commands/raw/index.js';
import { registerPusherCommands } from './commands/pusher/index.js';
import { registerSocketIoCommands } from './commands/socketio/index.js';
import { registerGraphqlCommands } from './commands/graphql/index.js';
import { registerJsonRpcCommands } from './commands/jsonrpc/index.js';
import { registerStompCommands } from './commands/stomp/index.js';
import { registerSignalRCommands } from './commands/signalr/index.js';
import { registerMqttCommands } from './commands/mqtt/index.js';
import { registerWampCommands } from './commands/wamp/index.js';
import { createLogger } from '../utils/logger.js';

export async function run(argv) {
  const program = new Command();

  program
    .name('soccli')
    .description('Terminal-first real-time protocol CLI (WebSocket + WebSocket protocol ecosystems)')
    .option('-v, --verbose', 'Verbose logs')
    .option('--debug', 'Debug logs')
    .option('--raw-frames', 'Print payloads as raw frames')
    .showHelpAfterError('(add --help for additional usage)');

  const raw = program.command('raw').description('Raw WebSocket protocol');
  const pusher = program.command('pusher').description('Pusher / Laravel Reverb protocol');
  const socketio = program.command('socketio').description('Socket.IO over Engine.IO protocol');
  const graphql = program.command('graphql').description('GraphQL subscriptions over graphql-transport-ws');
  const jsonrpc = program.command('jsonrpc').description('JSON-RPC 2.0 over WebSocket');
  const stomp = program.command('stomp').description('STOMP over WebSocket');
  const signalr = program.command('signalr').description('ASP.NET SignalR over WebSocket');
  const mqtt = program.command('mqtt').description('MQTT over WebSocket');
  const wamp = program.command('wamp').description('WAMP over WebSocket');

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
  registerJsonRpcCommands(jsonrpc, context);
  registerStompCommands(stomp, context);
  registerSignalRCommands(signalr, context);
  registerMqttCommands(mqtt, context);
  registerWampCommands(wamp, context);

  await program.parseAsync(argv);
}

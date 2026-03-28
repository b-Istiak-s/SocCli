import { WebSocketTransport } from '../transport/websocket.js';
import { printIncoming, printOutgoing, printSystem } from '../../utils/output.js';

export class RawClient {
  constructor({ url, headers, logger, rawFrames = false }) {
    this.transport = new WebSocketTransport({ url, headers, logger });
    this.logger = logger;
    this.rawFrames = rawFrames;
  }

  async connect() {
    this.transport.on('message', (payload) => {
      printIncoming('raw', this.rawFrames ? JSON.stringify(payload) : String(payload));
    });
    this.transport.on('disconnect_error', (err) => {
      throw err;
    });
    await this.transport.connect();
    printSystem('Raw WebSocket connected.');
  }

  send(data) {
    printOutgoing('raw', data);
    this.transport.send(data);
  }

  close() {
    this.transport.close();
  }
}

import { WebSocketTransport, buildWebSocketUrl } from '../transport/websocket.js';

export class RawClient {
  constructor({ logger, rawFrames = false } = {}) {
    this.transport = new WebSocketTransport({ logger, rawFrames });
  }

  async connect(options) {
    const wsUrl = buildWebSocketUrl(options);
    await this.transport.connect({ url: wsUrl, headers: options.headers });
    return wsUrl;
  }

  onMessage(handler) {
    this.transport.onMessage((payload) => handler(payload));
  }

  onUnexpectedClose(handler) {
    this.transport.onUnexpectedClose(handler);
  }

  send(message) {
    this.transport.send(message);
  }

  close() {
    this.transport.close();
  }
}

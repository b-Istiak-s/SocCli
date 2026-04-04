import { WebSocketTransport, buildWebSocketUrl } from '../transport/websocket.js';

export class JsonRpcWsClient {
  constructor({ logger, rawFrames = false } = {}) {
    this.transport = new WebSocketTransport({ logger, rawFrames });
    this.counter = 1;
  }

  async connect(options) {
    const wsUrl = buildWebSocketUrl(options);
    await this.transport.connect({ url: wsUrl, headers: options.headers });
    return wsUrl;
  }

  call({ method, params, id }) {
    const requestId = id ?? this.counter++;
    this.transport.send(JSON.stringify({ jsonrpc: '2.0', id: requestId, method, params }));
    return requestId;
  }

  notify({ method, params }) {
    this.transport.send(JSON.stringify({ jsonrpc: '2.0', method, params }));
  }

  sendRaw(payload) {
    this.transport.send(payload);
  }

  onMessage(handler) {
    this.transport.onMessage((payload) => {
      try {
        handler(JSON.parse(payload));
      } catch {
        handler(payload);
      }
    });
  }

  onUnexpectedClose(handler) {
    this.transport.onUnexpectedClose(handler);
  }

  close() {
    this.transport.close();
  }
}

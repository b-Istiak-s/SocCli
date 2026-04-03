import { WebSocketTransport, buildWebSocketUrl } from '../transport/websocket.js';
import { buildConnectPacket, buildEventPacket } from './namespaces.js';
import { parseSocketIoFrame } from './engine.js';

export class SocketIoClient {
  constructor({ logger, rawFrames = false } = {}) {
    this.logger = logger;
    this.transport = new WebSocketTransport({ logger, rawFrames });
  }

  async connect(options) {
    const query = { EIO: '4', transport: 'websocket', ...(options.query ?? {}) };
    const wsUrl = buildWebSocketUrl({ ...options, query });
    await this.transport.connect({ url: wsUrl, headers: options.headers });
    return wsUrl;
  }

  initNamespace(namespace = '/') {
    this.transport.send(buildConnectPacket(namespace));
  }

  onMessage(handler) {
    this.transport.onMessage((payload) => {
      const frame = parseSocketIoFrame(payload);

      if (frame.layer === 'engine' && frame.type === '2') {
        this.transport.send('3');
        return;
      }

      handler(frame);
    });
  }

  onUnexpectedClose(handler) {
    this.transport.onUnexpectedClose(handler);
  }

  emit({ namespace = '/', event, data }) {
    this.transport.send(buildEventPacket({ namespace, event, data }));
  }

  sendRaw(payload) {
    this.transport.send(payload);
  }

  close() {
    this.transport.close();
  }
}

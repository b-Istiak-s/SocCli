import { WebSocketTransport, buildWebSocketUrl } from '../transport/websocket.js';
import { buildStompFrame, parseStompFrames } from './frames.js';

export const STOMP_WS_PROTOCOLS = ['v12.stomp', 'v11.stomp', 'v10.stomp'];

export class StompWsClient {
  constructor({ logger, rawFrames = false } = {}) {
    this.transport = new WebSocketTransport({ logger, rawFrames });
    this.counter = 1;
  }

  async connect(options) {
    const wsUrl = buildWebSocketUrl(options);
    await this.transport.connect({
      url: wsUrl,
      headers: options.headers,
      protocols: options.protocols ?? STOMP_WS_PROTOCOLS
    });

    return wsUrl;
  }

  connectFrame({ host = '/', login, passcode, heartBeat = '0,0' } = {}) {
    this.transport.send(buildStompFrame('CONNECT', {
      host,
      login,
      passcode,
      'heart-beat': heartBeat,
      'accept-version': '1.2,1.1,1.0'
    }));
  }

  subscribe({ destination, id, ack = 'auto' }) {
    const subId = id ?? `sub-${this.counter++}`;
    this.transport.send(buildStompFrame('SUBSCRIBE', { id: subId, destination, ack }));
    return subId;
  }

  send({ destination, body, contentType = 'application/json' }) {
    this.transport.send(buildStompFrame('SEND', {
      destination,
      'content-type': contentType,
      'content-length': Buffer.byteLength(body).toString()
    }, body));
  }

  ack({ id, transaction }) {
    this.transport.send(buildStompFrame('ACK', { id, transaction }));
  }

  sendRaw(payload) {
    this.transport.send(payload);
  }

  onMessage(handler) {
    this.transport.onMessage((payload) => {
      const frames = parseStompFrames(payload);
      if (!frames.length) {
        handler(payload);
        return;
      }

      frames.forEach((frame) => {
        if (frame.command === 'PING') {
          this.transport.send('\n');
          return;
        }
        handler(frame);
      });
    });
  }

  onUnexpectedClose(handler) {
    this.transport.onUnexpectedClose(handler);
  }

  close() {
    this.transport.close();
  }
}

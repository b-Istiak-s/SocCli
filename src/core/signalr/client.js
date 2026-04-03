import { WebSocketTransport, buildWebSocketUrl } from '../transport/websocket.js';

const RECORD_SEPARATOR = '\u001e';

function splitSignalrFrames(payload) {
  return payload
    .toString()
    .split(RECORD_SEPARATOR)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export class SignalRClient {
  constructor({ logger, rawFrames = false } = {}) {
    this.transport = new WebSocketTransport({ logger, rawFrames });
    this.counter = 1;
  }

  async connect(options) {
    const wsUrl = buildWebSocketUrl(options);
    await this.transport.connect({ url: wsUrl, headers: options.headers });
    return wsUrl;
  }

  handshake({ protocol = 'json', version = 1 } = {}) {
    this.transport.send(`${JSON.stringify({ protocol, version })}${RECORD_SEPARATOR}`);
  }

  invoke({ target, argumentsList = [], invocationId }) {
    const id = invocationId ?? String(this.counter++);
    this.transport.send(`${JSON.stringify({ type: 1, invocationId: id, target, arguments: argumentsList })}${RECORD_SEPARATOR}`);
    return id;
  }

  send({ target, argumentsList = [] }) {
    this.transport.send(`${JSON.stringify({ type: 1, target, arguments: argumentsList })}${RECORD_SEPARATOR}`);
  }

  sendRaw(payload) {
    const text = payload.endsWith(RECORD_SEPARATOR) ? payload : `${payload}${RECORD_SEPARATOR}`;
    this.transport.send(text);
  }

  onMessage(handler) {
    this.transport.onMessage((payload) => {
      const frames = splitSignalrFrames(payload);
      if (!frames.length) {
        handler(payload);
        return;
      }

      frames.forEach((frame) => {
        try {
          handler(JSON.parse(frame));
        } catch {
          handler(frame);
        }
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

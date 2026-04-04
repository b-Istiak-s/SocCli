import { randomUUID } from 'node:crypto';
import { WebSocketTransport, buildWebSocketUrl } from '../transport/websocket.js';

export const WAMP_WS_PROTOCOLS = ['wamp.2.json'];

const TYPES = {
  HELLO: 1,
  WELCOME: 2,
  ABORT: 3,
  CHALLENGE: 4,
  AUTHENTICATE: 5,
  GOODBYE: 6,
  ERROR: 8,
  PUBLISH: 16,
  PUBLISHED: 17,
  SUBSCRIBE: 32,
  SUBSCRIBED: 33,
  EVENT: 36,
  CALL: 48,
  RESULT: 50
};

function parseFrame(payload) {
  try {
    const frame = JSON.parse(payload);
    return {
      type: frame?.[0],
      typeName: Object.entries(TYPES).find(([, code]) => code === frame?.[0])?.[0] ?? 'UNKNOWN',
      data: frame
    };
  } catch {
    return payload;
  }
}

export class WampWsClient {
  constructor({ logger, rawFrames = false } = {}) {
    this.transport = new WebSocketTransport({ logger, rawFrames });
  }

  async connect(options) {
    const wsUrl = buildWebSocketUrl(options);
    await this.transport.connect({
      url: wsUrl,
      headers: options.headers,
      protocols: options.protocols ?? WAMP_WS_PROTOCOLS
    });

    return wsUrl;
  }

  hello({ realm = 'realm1', details = { roles: { subscriber: {}, publisher: {}, caller: {}, callee: {} } } } = {}) {
    this.transport.send(JSON.stringify([TYPES.HELLO, realm, details]));
  }

  subscribe({ topic, options = {} }) {
    const requestId = Math.floor(Math.random() * 1000000000);
    this.transport.send(JSON.stringify([TYPES.SUBSCRIBE, requestId, options, topic]));
    return requestId;
  }

  publish({ topic, args = [], kwargs = {}, options = {} }) {
    const requestId = Math.floor(Math.random() * 1000000000);
    this.transport.send(JSON.stringify([TYPES.PUBLISH, requestId, options, topic, args, kwargs]));
    return requestId;
  }

  call({ procedure, args = [], kwargs = {}, options = {}, requestId = randomUUID() }) {
    this.transport.send(JSON.stringify([TYPES.CALL, requestId, options, procedure, args, kwargs]));
    return requestId;
  }

  goodbye(reason = 'wamp.close.normal') {
    this.transport.send(JSON.stringify([TYPES.GOODBYE, {}, reason]));
  }

  sendRaw(payload) {
    this.transport.send(payload);
  }

  onMessage(handler) {
    this.transport.onMessage((payload) => handler(parseFrame(payload)));
  }

  onUnexpectedClose(handler) {
    this.transport.onUnexpectedClose(handler);
  }

  close() {
    this.transport.close();
  }
}

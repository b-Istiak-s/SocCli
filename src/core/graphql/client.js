import { WebSocketTransport, buildWebSocketUrl } from '../transport/websocket.js';
import { GRAPHQL_TRANSPORT_WS, createConnectionInit, createSubscribe } from './protocols.js';
import { parseGraphqlFrame } from './subscriptions.js';
import { SoccliError } from '../../utils/errors.js';

export class GraphqlWsClient {
  constructor({ logger, rawFrames = false } = {}) {
    this.logger = logger;
    this.transport = new WebSocketTransport({ logger, rawFrames });
    this.counter = 1;
  }

  async connect(options) {
    const wsUrl = buildWebSocketUrl(options);
    await this.transport.connect({
      url: wsUrl,
      headers: options.headers,
      protocols: [GRAPHQL_TRANSPORT_WS]
    });

    return wsUrl;
  }

  async init(payload) {
    this.transport.send(JSON.stringify(createConnectionInit(payload)));

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new SoccliError('Timed out waiting for connection_ack')), 10000);
      const handler = (raw) => {
        const msg = parseGraphqlFrame(raw);
        if (msg?.type === 'connection_ack') {
          clearTimeout(timeout);
          resolve();
        }
      };
      this.transport.onMessage(handler);
    });
  }

  subscribe({ query, variables, operationName, id }) {
    const subId = id ?? String(this.counter++);
    this.transport.send(JSON.stringify(createSubscribe({ id: subId, query, variables, operationName })));
    return subId;
  }

  complete(id) {
    this.transport.send(JSON.stringify({ id, type: 'complete' }));
  }

  onMessage(handler) {
    this.transport.onMessage((payload) => handler(parseGraphqlFrame(payload)));
  }

  onUnexpectedClose(handler) {
    this.transport.onUnexpectedClose(handler);
  }

  close() {
    this.transport.close();
  }
}

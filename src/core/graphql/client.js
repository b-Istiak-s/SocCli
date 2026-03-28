import { WebSocketTransport } from '../transport/websocket.js';
import { printIncoming, printOutgoing, printSystem } from '../../utils/output.js';
import { connectionInit, GRAPHQL_TRANSPORT_WS, subscribeMessage } from './protocols.js';
import { nextSubscriptionId } from './subscriptions.js';

export class GraphqlWsClient {
  constructor({ url, headers, logger, initPayload, rawFrames = false }) {
    this.transport = new WebSocketTransport({
      url,
      headers,
      logger,
      protocols: [GRAPHQL_TRANSPORT_WS]
    });
    this.logger = logger;
    this.initPayload = initPayload;
    this.rawFrames = rawFrames;
  }

  async connect() {
    this.transport.on('message', (payload) => this.#onMessage(payload));
    await this.transport.connect();
    const init = JSON.stringify(connectionInit(this.initPayload));
    printOutgoing('graphql:connection_init', init);
    this.transport.send(init);
  }

  #onMessage(payload) {
    const text = String(payload);
    if (this.rawFrames) printIncoming('graphql:frame', text);

    let msg;
    try {
      msg = JSON.parse(text);
    } catch {
      printIncoming('graphql:raw', text);
      return;
    }

    if (msg.type === 'connection_ack') {
      printSystem('GraphQL WS acknowledged.');
      return;
    }

    if (msg.type === 'next') {
      printIncoming('graphql:next', JSON.stringify(msg.payload));
      return;
    }

    if (msg.type === 'error') {
      printIncoming('graphql:error', JSON.stringify(msg.payload));
      return;
    }

    if (msg.type === 'complete') {
      printIncoming('graphql:complete', msg.id || '');
      return;
    }

    printIncoming(`graphql:${msg.type || 'message'}`, JSON.stringify(msg.payload || msg));
  }

  subscribe({ query, variables, operationName }) {
    const id = nextSubscriptionId();
    const msg = subscribeMessage(id, query, variables, operationName);
    const payload = JSON.stringify(msg);
    printOutgoing('graphql:subscribe', payload);
    this.transport.send(payload);
    return id;
  }

  complete(id) {
    const payload = JSON.stringify({ id, type: 'complete' });
    printOutgoing('graphql:complete', payload);
    this.transport.send(payload);
  }

  close() {
    this.transport.close();
  }
}

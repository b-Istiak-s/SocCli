import { WebSocketTransport } from '../transport/websocket.js';
import { printIncoming, printOutgoing, printSystem } from '../../utils/output.js';
import { encodeNamespaceConnect, encodeSocketIoEvent, parseEngineFrame } from './engine.js';
import { normalizeNamespace } from './namespaces.js';

export class SocketIoClient {
  constructor({ url, headers, logger, namespace = '/', rawFrames = false }) {
    this.transport = new WebSocketTransport({ url, headers, logger });
    this.logger = logger;
    this.namespace = normalizeNamespace(namespace);
    this.rawFrames = rawFrames;
  }

  async connect() {
    this.transport.on('message', (payload) => this.#onMessage(payload));
    await this.transport.connect();
    this.transport.send(encodeNamespaceConnect(this.namespace));
    printSystem(`Socket.IO connected to namespace ${this.namespace}`);
  }

  #onMessage(payload) {
    const frame = parseEngineFrame(payload);
    if (this.rawFrames) printIncoming('socketio:frame', frame.text);

    switch (frame.type) {
      case '0':
        printSystem('Engine.IO open handshake received.');
        break;
      case '2':
        this.transport.send('3');
        printOutgoing('engine:pong', '3');
        break;
      case '4':
        this.#handleSocketIoPacket(frame.text.slice(1));
        break;
      default:
        printIncoming('engine:unknown', frame.text);
    }
  }

  #handleSocketIoPacket(packet) {
    if (packet.startsWith('0')) {
      printSystem('Socket.IO namespace acknowledged.');
      return;
    }
    if (packet.startsWith('2')) {
      const content = packet.slice(1);
      printIncoming('socketio:event', content);
      return;
    }
    printIncoming('socketio:packet', packet);
  }

  emit(event, data, namespace = this.namespace) {
    const frame = encodeSocketIoEvent(normalizeNamespace(namespace), event, data);
    printOutgoing('socketio:emit', frame);
    this.transport.send(frame);
  }

  close() {
    this.transport.close();
  }
}

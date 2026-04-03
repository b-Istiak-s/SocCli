import { WebSocketTransport, buildWebSocketUrl } from '../transport/websocket.js';
import {
  decodePacket,
  encodeConnect,
  encodeDisconnect,
  encodePingReq,
  encodePublish,
  encodeSubscribe,
  splitPackets
} from './codec.js';

export const MQTT_WS_PROTOCOLS = ['mqtt'];

export class MqttWsClient {
  constructor({ logger, rawFrames = false } = {}) {
    this.transport = new WebSocketTransport({ logger, rawFrames });
    this.messageId = 1;
  }

  async connect(options) {
    const wsUrl = buildWebSocketUrl(options);
    await this.transport.connect({
      url: wsUrl,
      headers: options.headers,
      protocols: options.protocols ?? MQTT_WS_PROTOCOLS
    });

    return wsUrl;
  }

  init(sessionOptions) {
    this.transport.send(encodeConnect(sessionOptions));
  }

  subscribe({ topic, qos = 0 }) {
    const id = this.messageId++;
    this.transport.send(encodeSubscribe({ topic, messageId: id, qos }));
    return id;
  }

  publish({ topic, payload, qos = 0 }) {
    this.transport.send(encodePublish({ topic, payload, qos }));
  }

  ping() {
    this.transport.send(encodePingReq());
  }

  disconnect() {
    this.transport.send(encodeDisconnect());
  }

  sendRaw(payload) {
    this.transport.send(payload);
  }

  onMessage(handler) {
    this.transport.onMessage((payload, meta) => {
      if (!meta.isBinary) {
        handler(payload);
        return;
      }

      const binary = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
      const packets = splitPackets(binary);
      if (!packets.length) {
        handler({ type: 'UNKNOWN_BINARY', payloadHex: binary.toString('hex') });
        return;
      }

      packets.forEach((packet) => handler(decodePacket(packet)));
    });
  }

  onUnexpectedClose(handler) {
    this.transport.onUnexpectedClose(handler);
  }

  close() {
    this.transport.close();
  }
}

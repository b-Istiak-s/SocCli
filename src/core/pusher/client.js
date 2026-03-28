import { WebSocketTransport } from '../transport/websocket.js';
import { printIncoming, printOutgoing, printSystem } from '../../utils/output.js';
import { subscriptionMessage } from './channels.js';
import { authorizePusherChannel } from './auth.js';
import { SoccliError } from '../../utils/errors.js';

export class PusherClient {
  constructor({ url, headers, logger, authEndpoint, authHeaders, appKey, appSecret, rawFrames = false }) {
    this.transport = new WebSocketTransport({ url, headers, logger });
    this.logger = logger;
    this.authEndpoint = authEndpoint;
    this.authHeaders = authHeaders;
    this.socketId = null;
    this.appKey = appKey;
    this.appSecret = appSecret;
    this.rawFrames = rawFrames;
  }

  async connect() {
    this.transport.on('message', (payload) => this.#onMessage(payload));
    await this.transport.connect();
    printSystem('Pusher/Reverb transport connected. Waiting for connection_established...');
  }

  #onMessage(payload) {
    const text = String(payload);
    if (this.rawFrames) printIncoming('pusher:frame', text);
    let packet;
    try {
      packet = JSON.parse(text);
    } catch {
      printIncoming('pusher:raw', text);
      return;
    }

    if (packet.event === 'pusher:connection_established') {
      const data = typeof packet.data === 'string' ? JSON.parse(packet.data) : packet.data;
      this.socketId = data.socket_id;
      printSystem(`Pusher connected. socket_id=${this.socketId}`);
      return;
    }

    printIncoming(packet.event || 'pusher:event', JSON.stringify(packet.data));
  }

  async subscribe({ channel, channelData, auth, listenEvent }) {
    if (!this.socketId) {
      throw new SoccliError('Socket ID not available yet. Wait for connection established frame.');
    }

    let finalAuth = auth;
    if (!finalAuth && (channel.startsWith('private-') || channel.startsWith('presence-'))) {
      finalAuth = await authorizePusherChannel({
        socketId: this.socketId,
        channel,
        authEndpoint: this.authEndpoint,
        authHeaders: this.authHeaders,
        channelData,
        appSecret: this.appSecret,
        appKey: this.appKey
      });
    }

    const msg = subscriptionMessage(channel, finalAuth, channelData);
    const payload = JSON.stringify(msg);
    printOutgoing('pusher:subscribe', payload);
    this.transport.send(payload);

    if (listenEvent) {
      printSystem(`Listening for event filter: ${listenEvent}`);
    }
  }

  trigger(event, data, channel) {
    const payload = JSON.stringify({ event, data, channel });
    printOutgoing('pusher:trigger', payload);
    this.transport.send(payload);
  }

  close() {
    this.transport.close();
  }
}

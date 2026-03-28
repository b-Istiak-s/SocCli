import { WebSocketTransport, buildWebSocketUrl } from '../transport/websocket.js';
import { authorizeChannel, buildManualAuthorizer } from './auth.js';
import { buildSubscribeFrame, parsePusherFrame } from './channels.js';
import { SoccliError } from '../../utils/errors.js';

export class PusherClient {
  constructor({ logger, rawFrames = false } = {}) {
    this.logger = logger;
    this.transport = new WebSocketTransport({ logger, rawFrames });
    this.socketId = null;
  }

  async connect(options) {
    const wsUrl = buildWebSocketUrl(options);
    await this.transport.connect({ url: wsUrl, headers: options.headers });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new SoccliError('Timed out waiting for pusher:connection_established')), 10000);

      this.transport.onMessage((payload) => {
        const frame = parsePusherFrame(payload);
        if (frame?.event === 'pusher:connection_established') {
          clearTimeout(timeout);
          this.socketId = frame.data?.socket_id;
          resolve();
        }
      });
    });

    return wsUrl;
  }

  async subscribe({ channel, authEndpoint, authHeaders, authPayload, appKey, appSecret, channelData }) {
    if (!channel) throw new SoccliError('Missing --channel for pusher subscribe.');

    let authData = {};
    if (channel.startsWith('private-') || channel.startsWith('presence-')) {
      authData = appSecret
        ? buildManualAuthorizer({ appSecret, appKey, socketId: this.socketId, channel, channelData })
        : await authorizeChannel({ authEndpoint, headers: authHeaders, socketId: this.socketId, channel, authPayload });
    }

    this.transport.send(JSON.stringify(buildSubscribeFrame(channel, authData)));
  }

  onMessage(handler) {
    this.transport.onMessage((payload) => handler(parsePusherFrame(payload)));
  }

  onUnexpectedClose(handler) {
    this.transport.onUnexpectedClose(handler);
  }

  sendEvent({ event, channel, data }) {
    const frame = { event, data: typeof data === 'string' ? data : JSON.stringify(data) };
    if (channel) frame.channel = channel;
    this.transport.send(JSON.stringify(frame));
  }

  close() {
    this.transport.close();
  }
}

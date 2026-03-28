import { WebSocket } from 'ws';
import { ConnectionClosedUnexpectedlyError, SoccliError } from '../../utils/errors.js';

export class WebSocketTransport {
  constructor({ logger, rawFrames = false } = {}) {
    this.logger = logger;
    this.rawFrames = rawFrames;
    this.socket = null;
    this.wasClosedByClient = false;
  }

  connect({ url, headers = {}, protocols = undefined }) {
    return new Promise((resolve, reject) => {
      this.wasClosedByClient = false;
      this.socket = new WebSocket(url, protocols, { headers });

      this.socket.once('open', () => resolve(this.socket));
      this.socket.once('error', (err) => reject(new SoccliError(`Failed to connect to ${url}`, { cause: err })));
      this.socket.on('close', (code, reasonBuffer) => {
        const reason = reasonBuffer?.toString() ?? '';
        this.logger?.debug?.('socket close', { code, reason });
        if (!this.wasClosedByClient && code !== 1000) {
          this.socket?.emit('soccli_unexpected_close', new ConnectionClosedUnexpectedlyError(code, reason));
        }
      });
    });
  }

  onMessage(handler) {
    this.socket?.on('message', (data, isBinary) => {
      const payload = isBinary ? data : data.toString();
      handler(payload, { isBinary });
    });
  }

  onUnexpectedClose(handler) {
    this.socket?.on('soccli_unexpected_close', handler);
  }

  send(payload) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new SoccliError('Cannot send message: socket is not open.');
    }

    this.socket.send(payload);
  }

  close(code = 1000, reason = 'bye') {
    this.wasClosedByClient = true;
    if (this.socket) this.socket.close(code, reason);
  }
}

export function buildWebSocketUrl({
  url,
  host,
  port,
  secure,
  path = '/',
  query = {}
}) {
  if (url) {
    return new URL(url).toString();
  }

  if (!host) {
    throw new SoccliError('Missing endpoint. Provide a full URL or --host.');
  }

  const scheme = secure ? 'wss' : 'ws';
  const wsUrl = new URL(`${scheme}://${host}`);

  if (port) wsUrl.port = String(port);
  wsUrl.pathname = path.startsWith('/') ? path : `/${path}`;

  Object.entries(query).forEach(([key, value]) => wsUrl.searchParams.set(key, value));

  return wsUrl.toString();
}

import WebSocket from 'ws';
import { EventEmitter } from 'node:events';
import { DisconnectError, SoccliError } from '../../utils/errors.js';

export class WebSocketTransport extends EventEmitter {
  #ws;
  #connected = false;

  constructor({ url, headers = {}, protocols, rejectUnauthorized = true, logger }) {
    super();
    this.url = typeof url === 'string' ? new URL(url) : url;
    this.headers = headers;
    this.protocols = protocols;
    this.rejectUnauthorized = rejectUnauthorized;
    this.logger = logger;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url, this.protocols, {
        headers: this.headers,
        rejectUnauthorized: this.rejectUnauthorized
      });
      this.#ws = ws;

      ws.on('open', () => {
        this.#connected = true;
        this.logger?.verbose(`Connected: ${this.url.toString()}`);
        this.emit('open');
        resolve();
      });

      ws.on('message', (data, isBinary) => {
        const payload = isBinary ? data : data.toString('utf8');
        this.emit('message', payload, { isBinary });
      });

      ws.on('error', (error) => {
        this.emit('error', error);
        if (!this.#connected) {
          reject(new SoccliError(`Connection failed: ${error.message}`, { cause: error }));
        }
      });

      ws.on('close', (code, reasonBuffer) => {
        const reason = reasonBuffer?.toString?.() || '';
        const wasConnected = this.#connected;
        this.#connected = false;
        this.emit('close', { code, reason });
        if (wasConnected && code !== 1000) {
          this.emit('disconnect_error', new DisconnectError(`Disconnected unexpectedly (code=${code}, reason=${reason || 'n/a'})`));
        }
      });
    });
  }

  send(payload) {
    if (!this.#ws || this.#ws.readyState !== WebSocket.OPEN) {
      throw new SoccliError('Cannot send data: WebSocket is not open.');
    }
    this.#ws.send(payload);
  }

  close(code = 1000, reason = 'client closing') {
    if (this.#ws && this.#ws.readyState === WebSocket.OPEN) {
      this.#ws.close(code, reason);
    }
  }
}

export class SoccliError extends Error {
  constructor(message, { cause, code } = {}) {
    super(message, { cause });
    this.name = 'SoccliError';
    this.code = code;
  }
}

export class ConnectionClosedUnexpectedlyError extends SoccliError {
  constructor(code, reason) {
    super(`Connection closed unexpectedly (code=${code}, reason=${reason || 'n/a'})`, {
      code: 'ERR_UNEXPECTED_CLOSE'
    });
    this.closeCode = code;
    this.closeReason = reason;
  }
}

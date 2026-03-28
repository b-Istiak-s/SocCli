export class SoccliError extends Error {
  constructor(message, { code = 'SOCCLI_ERROR', cause } = {}) {
    super(message);
    this.name = 'SoccliError';
    this.code = code;
    this.cause = cause;
  }
}

export class DisconnectError extends SoccliError {
  constructor(message, details = {}) {
    super(message, { code: 'UNEXPECTED_DISCONNECT', cause: details });
  }
}

function ts() {
  return new Date().toISOString();
}

export function printIncoming(type, payload) {
  process.stdout.write(`[${ts()}] <= (${type}) ${payload}\n`);
}

export function printOutgoing(type, payload) {
  process.stdout.write(`[${ts()}] => (${type}) ${payload}\n`);
}

export function printSystem(message) {
  process.stdout.write(`[${ts()}] [system] ${message}\n`);
}

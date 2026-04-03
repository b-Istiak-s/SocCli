export function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function formatIncoming(label, payload, rawFrames = false) {
  const ts = new Date().toISOString();

  if (rawFrames) {
    return `[${ts}] <${label}> ${String(payload)}`;
  }

  if (typeof payload === 'string') {
    const maybeJson = safeJsonParse(payload);
    if (typeof maybeJson === 'string') {
      return `[${ts}] <${label}> ${payload}`;
    }

    return `[${ts}] <${label}> ${JSON.stringify(maybeJson, null, 2)}`;
  }

  return `[${ts}] <${label}> ${JSON.stringify(payload, null, 2)}`;
}

export function printIncoming(label, payload, rawFrames = false) {
  console.log(formatIncoming(label, payload, rawFrames));
}

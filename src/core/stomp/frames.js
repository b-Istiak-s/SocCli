const FRAME_TERMINATOR = '\u0000';

export function buildStompFrame(command, headers = {}, body = '') {
  const headerLines = Object.entries(headers)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}:${value}`)
    .join('\n');

  const bodyText = body ? `${body}` : '';
  const headerBlock = headerLines ? `${headerLines}\n` : '';

  return `${command}\n${headerBlock}\n${bodyText}${FRAME_TERMINATOR}`;
}

export function parseStompFrames(rawPayload) {
  const payload = rawPayload.toString();
  return payload
    .split(FRAME_TERMINATOR)
    .map((frame) => frame.trim())
    .filter(Boolean)
    .map((frame) => {
      const [head, ...bodyParts] = frame.split('\n\n');
      const lines = head.split('\n');
      const command = lines[0]?.trim();
      const headers = {};

      lines.slice(1).forEach((line) => {
        const sep = line.indexOf(':');
        if (sep === -1) return;
        const key = line.slice(0, sep).trim();
        const value = line.slice(sep + 1).trim();
        headers[key] = value;
      });

      return {
        command,
        headers,
        body: bodyParts.join('\n\n')
      };
    });
}

import { SoccliError } from './errors.js';

export function parseHeaders(headerValues = []) {
  const headers = {};
  for (const raw of headerValues || []) {
    const idx = raw.indexOf(':');
    if (idx <= 0) {
      throw new SoccliError(`Invalid header format: "${raw}". Use "Key: Value".`);
    }
    const key = raw.slice(0, idx).trim();
    const value = raw.slice(idx + 1).trim();
    headers[key] = value;
  }
  return headers;
}

export function parseJsonOrThrow(value, label = 'JSON value') {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    throw new SoccliError(`Invalid ${label}: expected valid JSON.`);
  }
}

export function parseKeyValuePairs(values = []) {
  const result = {};
  for (const entry of values || []) {
    const idx = entry.indexOf('=');
    if (idx <= 0) {
      throw new SoccliError(`Invalid query segment "${entry}". Use "key=value".`);
    }
    const key = entry.slice(0, idx);
    const value = entry.slice(idx + 1);
    result[key] = value;
  }
  return result;
}

export function buildUrlFromOptions(options, defaults = {}) {
  if (options.url) {
    return new URL(options.url);
  }

  const secure = Boolean(options.secure ?? defaults.secure ?? true);
  const protocol = secure ? 'wss:' : 'ws:';
  const host = options.host || defaults.host;
  if (!host) {
    throw new SoccliError('Missing host. Provide a full URL or --host.');
  }

  const port = options.port || defaults.port;
  const path = options.path || defaults.path || '/';
  const url = new URL(`${protocol}//${host}${port ? `:${port}` : ''}${path}`);
  const query = { ...(defaults.query || {}), ...parseKeyValuePairs(options.query || []) };
  for (const [k, v] of Object.entries(query)) {
    url.searchParams.set(k, v);
  }
  return url;
}

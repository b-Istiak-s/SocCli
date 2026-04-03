import { SoccliError } from './errors.js';

export function parseHeaders(headerValues = []) {
  const headers = {};

  for (const headerValue of headerValues) {
    const separatorIndex = headerValue.indexOf(':');
    if (separatorIndex < 1) {
      throw new SoccliError(`Invalid header format: "${headerValue}". Expected "Name: value".`);
    }

    const name = headerValue.slice(0, separatorIndex).trim();
    const value = headerValue.slice(separatorIndex + 1).trim();

    if (!name || !value) {
      throw new SoccliError(`Invalid header format: "${headerValue}". Expected non-empty name and value.`);
    }

    headers[name] = value;
  }

  return headers;
}

export function parseKeyValues(entries = []) {
  const result = {};
  for (const entry of entries) {
    const separatorIndex = entry.indexOf('=');
    if (separatorIndex < 1) {
      throw new SoccliError(`Invalid key-value format: "${entry}". Expected "key=value".`);
    }

    const key = entry.slice(0, separatorIndex);
    const value = entry.slice(separatorIndex + 1);
    result[key] = value;
  }

  return result;
}

export function encodeSocketIoEvent(namespace, event, data) {
  const nsp = namespace && namespace !== '/' ? `${namespace},` : '';
  return `42${nsp}${JSON.stringify([event, data])}`;
}

export function encodeNamespaceConnect(namespace) {
  if (!namespace || namespace === '/') return '40';
  return `40${namespace},`;
}

export function parseEngineFrame(frame) {
  const text = String(frame);
  const type = text[0];
  return { type, text };
}

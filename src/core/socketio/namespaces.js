export function normalizeNamespace(ns = '/') {
  if (!ns.startsWith('/')) return `/${ns}`;
  return ns;
}

export function buildConnectPacket(namespace = '/') {
  const ns = normalizeNamespace(namespace);
  return ns === '/' ? '40' : `40${ns},`;
}

export function buildEventPacket({ namespace = '/', event, data }) {
  const ns = normalizeNamespace(namespace);
  const payload = JSON.stringify([event, data]);
  return ns === '/' ? `42${payload}` : `42${ns},${payload}`;
}

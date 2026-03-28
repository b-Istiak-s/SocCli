export function normalizeNamespace(namespace) {
  if (!namespace || namespace === '/') return '/';
  return namespace.startsWith('/') ? namespace : `/${namespace}`;
}

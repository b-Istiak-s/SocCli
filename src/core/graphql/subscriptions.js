export function parseGraphqlFrame(payload) {
  if (typeof payload !== 'string') return payload;

  try {
    return JSON.parse(payload);
  } catch {
    return payload;
  }
}

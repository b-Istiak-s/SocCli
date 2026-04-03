export function parseEngineFrame(payload) {
  if (typeof payload !== 'string') return { type: 'binary', payload };

  const type = payload[0];
  return { type, payload: payload.slice(1), raw: payload };
}

export function parseSocketIoFrame(payload) {
  const engine = parseEngineFrame(payload);
  if (engine.type !== '4') return { layer: 'engine', ...engine };

  const packetType = engine.payload[0];
  const packetBody = engine.payload.slice(1);

  return {
    layer: 'socket.io',
    engineType: engine.type,
    packetType,
    packetBody,
    raw: payload
  };
}

export function buildSubscribeFrame(channel, authData) {
  return {
    event: 'pusher:subscribe',
    data: {
      channel,
      ...authData
    }
  };
}

export function parsePusherFrame(payload) {
  if (typeof payload !== 'string') return payload;

  try {
    const frame = JSON.parse(payload);
    if (frame?.data && typeof frame.data === 'string') {
      try {
        frame.data = JSON.parse(frame.data);
      } catch {
        // leave as-is
      }
    }
    return frame;
  } catch {
    return payload;
  }
}

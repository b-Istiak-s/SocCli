import crypto from 'node:crypto';
import { SoccliError } from '../../utils/errors.js';

export async function authorizeChannel({
  authEndpoint,
  headers = {},
  socketId,
  channel,
  authPayload
}) {
  if (!authEndpoint) {
    if (authPayload) {
      const parsed = typeof authPayload === 'string' ? JSON.parse(authPayload) : authPayload;
      return parsed;
    }

    throw new SoccliError('Private channels require --auth-endpoint or --auth-payload.');
  }

  const body = new URLSearchParams({
    socket_id: socketId,
    channel_name: channel
  });

  const response = await fetch(authEndpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      ...headers
    },
    body
  });

  if (!response.ok) {
    throw new SoccliError(`Channel auth failed (${response.status} ${response.statusText}).`);
  }

  return response.json();
}

export function buildManualAuthorizer({ appSecret, appKey, socketId, channel, channelData }) {
  if (!appSecret || !appKey) {
    throw new SoccliError('Manual signing requires --app-key and --app-secret.');
  }

  const stringToSign = channelData
    ? `${socketId}:${channel}:${channelData}`
    : `${socketId}:${channel}`;

  const signature = crypto
    .createHmac('sha256', appSecret)
    .update(stringToSign)
    .digest('hex');

  const auth = `${appKey}:${signature}`;
  const result = { auth };
  if (channelData) result.channel_data = channelData;

  return result;
}

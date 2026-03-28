import crypto from 'node:crypto';
import { SoccliError } from '../../utils/errors.js';

export async function authorizePusherChannel({
  socketId,
  channel,
  authEndpoint,
  authHeaders = {},
  channelData,
  appSecret,
  appKey
}) {
  if (appSecret && appKey) {
    const base = `${socketId}:${channel}${channelData ? `:${channelData}` : ''}`;
    const signature = crypto.createHmac('sha256', appSecret).update(base).digest('hex');
    return `${appKey}:${signature}`;
  }

  if (!authEndpoint) {
    throw new SoccliError('Private/presence channels require --auth-endpoint or --app-secret with --app-key.');
  }

  const body = new URLSearchParams({ socket_id: socketId, channel_name: channel });
  if (channelData) body.set('channel_data', channelData);

  const response = await fetch(authEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...authHeaders },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new SoccliError(`Auth endpoint failed (${response.status}): ${text}`);
  }

  const json = await response.json();
  if (!json.auth) {
    throw new SoccliError('Auth response missing "auth" field.');
  }
  return json.auth;
}

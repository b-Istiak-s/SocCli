export function subscriptionMessage(channel, auth, channelData) {
  const data = { channel };
  if (auth) data.auth = auth;
  if (channelData) data.channel_data = channelData;
  return {
    event: 'pusher:subscribe',
    data
  };
}

import { SoccliError } from '../../utils/errors.js';

const PACKET_TYPES = {
  1: 'CONNECT',
  2: 'CONNACK',
  3: 'PUBLISH',
  8: 'SUBSCRIBE',
  9: 'SUBACK',
  12: 'PINGREQ',
  13: 'PINGRESP',
  14: 'DISCONNECT'
};

function encodeString(value) {
  const text = value ?? '';
  const buffer = Buffer.from(text, 'utf8');
  const prefix = Buffer.alloc(2);
  prefix.writeUInt16BE(buffer.length, 0);
  return Buffer.concat([prefix, buffer]);
}

function encodeLength(length) {
  const bytes = [];
  let value = length;

  do {
    let encoded = value % 128;
    value = Math.floor(value / 128);
    if (value > 0) encoded |= 128;
    bytes.push(encoded);
  } while (value > 0);

  return Buffer.from(bytes);
}

function createPacket(type, flags, payload) {
  const fixedHeader = Buffer.from([(type << 4) | flags]);
  const remainingLength = encodeLength(payload.length);
  return Buffer.concat([fixedHeader, remainingLength, payload]);
}

function decodeLength(payload, offset = 1) {
  let multiplier = 1;
  let value = 0;
  let index = offset;
  let encoded;

  do {
    encoded = payload[index++];
    value += (encoded & 127) * multiplier;
    multiplier *= 128;

    if (index >= payload.length && (encoded & 128) !== 0) {
      throw new SoccliError('Invalid MQTT remaining length encoding');
    }
  } while ((encoded & 128) !== 0);

  return { value, bytesUsed: index - offset };
}

export function splitPackets(buffer) {
  const packets = [];
  let cursor = 0;

  while (cursor < buffer.length) {
    const typeAndFlags = buffer[cursor];
    const { value: remainingLength, bytesUsed } = decodeLength(buffer, cursor + 1);
    const start = cursor;
    const headerLength = 1 + bytesUsed;
    const totalLength = headerLength + remainingLength;
    const end = start + totalLength;

    if (end > buffer.length) break;

    packets.push(buffer.slice(start, end));
    cursor = end;
    if (typeAndFlags === undefined) break;
  }

  return packets;
}

export function encodeConnect({ clientId, username, password, keepAlive = 30, cleanSession = true } = {}) {
  const protocolName = encodeString('MQTT');
  const protocolLevel = Buffer.from([0x04]);
  let connectFlags = cleanSession ? 0x02 : 0x00;

  if (username) connectFlags |= 0x80;
  if (password) connectFlags |= 0x40;

  const keepAliveBuffer = Buffer.alloc(2);
  keepAliveBuffer.writeUInt16BE(keepAlive, 0);

  const variableHeader = Buffer.concat([protocolName, protocolLevel, Buffer.from([connectFlags]), keepAliveBuffer]);

  const payloadParts = [encodeString(clientId || `soccli-${Date.now()}`)];
  if (username) payloadParts.push(encodeString(username));
  if (password) payloadParts.push(encodeString(password));

  const payload = Buffer.concat([...payloadParts]);
  return createPacket(1, 0, Buffer.concat([variableHeader, payload]));
}

export function encodeSubscribe({ topic, messageId, qos = 0 }) {
  const idBuffer = Buffer.alloc(2);
  idBuffer.writeUInt16BE(messageId, 0);
  const payload = Buffer.concat([idBuffer, encodeString(topic), Buffer.from([qos])]);
  return createPacket(8, 2, payload);
}

export function encodePublish({ topic, payload, qos = 0 }) {
  if (qos !== 0) {
    throw new SoccliError('MQTT QoS > 0 is not yet supported in soccli mqtt module.');
  }

  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload ?? ''), 'utf8');
  const packetPayload = Buffer.concat([encodeString(topic), body]);
  return createPacket(3, 0, packetPayload);
}

export function encodePingReq() {
  return Buffer.from([0b11000000, 0x00]);
}

export function encodeDisconnect() {
  return Buffer.from([0b11100000, 0x00]);
}

export function decodePacket(packet) {
  const firstByte = packet[0];
  const type = firstByte >> 4;
  const flags = firstByte & 0x0f;
  const { value: remainingLength, bytesUsed } = decodeLength(packet, 1);
  const headerSize = 1 + bytesUsed;
  const body = packet.slice(headerSize, headerSize + remainingLength);

  if (type === 2) {
    return {
      type: PACKET_TYPES[type],
      flags,
      sessionPresent: (body[0] & 0x01) === 1,
      returnCode: body[1]
    };
  }

  if (type === 9) {
    return {
      type: PACKET_TYPES[type],
      flags,
      messageId: body.readUInt16BE(0),
      grantedQos: body.slice(2).toJSON().data
    };
  }

  if (type === 3) {
    const topicLength = body.readUInt16BE(0);
    const topic = body.slice(2, 2 + topicLength).toString('utf8');
    const payload = body.slice(2 + topicLength).toString('utf8');
    return { type: PACKET_TYPES[type], flags, topic, payload };
  }

  return {
    type: PACKET_TYPES[type] ?? `TYPE_${type}`,
    flags,
    payloadHex: body.toString('hex')
  };
}

import dgram from 'node:dgram';
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual
} from 'node:crypto';

const MAGIC_COOKIE = 0x2112a442;
const ALLOCATE_METHOD = 0x003;
const REQUEST_CLASS = 0;
const SUCCESS_CLASS = 2;
const ERROR_CLASS = 3;

const ATTRIBUTE = Object.freeze({
  USERNAME: 0x0006,
  MESSAGE_INTEGRITY: 0x0008,
  ERROR_CODE: 0x0009,
  REALM: 0x0014,
  NONCE: 0x0015,
  XOR_RELAYED_ADDRESS: 0x0016,
  REQUESTED_TRANSPORT: 0x0019
});

const host = process.argv[2] || '127.0.0.1';
const port = Number(process.argv[3] || 3478);
const sharedSecret = process.env.SYLORA_TURN_SHARED_SECRET || '';

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('TURN smoke port must be an integer from 1 to 65535');
}
if (sharedSecret.length < 32) {
  throw new Error('SYLORA_TURN_SHARED_SECRET is required for authenticated TURN smoke');
}

function stunType(method, messageClass) {
  return (method & 0x000f)
    | ((method & 0x0070) << 1)
    | ((method & 0x0f80) << 2)
    | ((messageClass & 0x1) << 4)
    | ((messageClass & 0x2) << 7);
}

function stunMethod(type) {
  return (type & 0x000f)
    | ((type & 0x00e0) >> 1)
    | ((type & 0x3e00) >> 2);
}

function stunClass(type) {
  return ((type >> 4) & 0x1) | ((type >> 7) & 0x2);
}

function encodeAttribute(type, rawValue) {
  const value = Buffer.isBuffer(rawValue) ? rawValue : Buffer.from(rawValue);
  const padding = Buffer.alloc((4 - (value.length % 4)) % 4);
  const header = Buffer.alloc(4);
  header.writeUInt16BE(type, 0);
  header.writeUInt16BE(value.length, 2);
  return Buffer.concat([header, value, padding]);
}

function encodeHeader(type, bodyLength, transactionId) {
  const header = Buffer.alloc(20);
  header.writeUInt16BE(type, 0);
  header.writeUInt16BE(bodyLength, 2);
  header.writeUInt32BE(MAGIC_COOKIE, 4);
  transactionId.copy(header, 8);
  return header;
}

function buildRequest(attributes, { transactionId = randomBytes(12), integrityKey } = {}) {
  const body = Buffer.concat(attributes);
  const messageType = stunType(ALLOCATE_METHOD, REQUEST_CLASS);
  if (!integrityKey) {
    return {
      transactionId,
      packet: Buffer.concat([encodeHeader(messageType, body.length, transactionId), body])
    };
  }

  const integrityLength = 24;
  const header = encodeHeader(messageType, body.length + integrityLength, transactionId);
  const digest = createHmac('sha1', integrityKey)
    .update(Buffer.concat([header, body]))
    .digest();
  const integrity = encodeAttribute(ATTRIBUTE.MESSAGE_INTEGRITY, digest);
  return { transactionId, packet: Buffer.concat([header, body, integrity]) };
}

function parseMessage(packet) {
  if (packet.length < 20 || packet.readUInt32BE(4) !== MAGIC_COOKIE) {
    throw new Error('TURN smoke received a malformed STUN response');
  }
  const bodyLength = packet.readUInt16BE(2);
  const end = 20 + bodyLength;
  if (end > packet.length) {
    throw new Error('TURN smoke received a truncated STUN response');
  }

  const attributes = [];
  for (let offset = 20; offset < end;) {
    if (offset + 4 > end) throw new Error('TURN response contains a truncated attribute');
    const type = packet.readUInt16BE(offset);
    const length = packet.readUInt16BE(offset + 2);
    const valueStart = offset + 4;
    const valueEnd = valueStart + length;
    if (valueEnd > end) throw new Error('TURN response contains an invalid attribute length');
    attributes.push({ type, offset, value: packet.subarray(valueStart, valueEnd) });
    offset = valueStart + Math.ceil(length / 4) * 4;
  }

  const type = packet.readUInt16BE(0);
  return {
    type,
    method: stunMethod(type),
    messageClass: stunClass(type),
    transactionId: packet.subarray(8, 20),
    attributes
  };
}

function attribute(message, type) {
  return message.attributes.find(item => item.type === type);
}

function verifyMessageIntegrity(packet, message, integrityKey) {
  const integrity = attribute(message, ATTRIBUTE.MESSAGE_INTEGRITY);
  if (!integrity || integrity.value.length !== 20) return false;

  const adjustedHeader = Buffer.from(packet.subarray(0, 20));
  adjustedHeader.writeUInt16BE(integrity.offset + 24 - 20, 2);
  const expected = createHmac('sha1', integrityKey)
    .update(Buffer.concat([adjustedHeader, packet.subarray(20, integrity.offset)]))
    .digest();
  return timingSafeEqual(integrity.value, expected);
}

function errorCode(message) {
  const error = attribute(message, ATTRIBUTE.ERROR_CODE)?.value;
  if (!error || error.length < 4) return null;
  return (error[2] & 0x7) * 100 + error[3];
}

const requestedTransport = Buffer.from([17, 0, 0, 0]);
const socket = dgram.createSocket('udp4');

function exchange(request, timeoutMs = 3_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`TURN smoke timed out contacting ${host}:${port}`));
    }, timeoutMs);
    const onError = error => {
      cleanup();
      reject(error);
    };
    const onMessage = packet => {
      try {
        const message = parseMessage(packet);
        if (!timingSafeEqual(message.transactionId, request.transactionId)) return;
        cleanup();
        resolve({ packet, message });
      } catch (error) {
        cleanup();
        reject(error);
      }
    };
    const cleanup = () => {
      clearTimeout(timer);
      socket.off('error', onError);
      socket.off('message', onMessage);
    };

    socket.on('error', onError);
    socket.on('message', onMessage);
    socket.send(request.packet, port, host, error => {
      if (error) onError(error);
    });
  });
}

try {
  const challengeRequest = buildRequest([
    encodeAttribute(ATTRIBUTE.REQUESTED_TRANSPORT, requestedTransport)
  ]);
  const challenge = await exchange(challengeRequest);
  if (challenge.message.method !== ALLOCATE_METHOD
      || challenge.message.messageClass !== ERROR_CLASS
      || errorCode(challenge.message) !== 401) {
    throw new Error('TURN server did not require long-term authentication for Allocate');
  }

  const realm = attribute(challenge.message, ATTRIBUTE.REALM)?.value;
  const nonce = attribute(challenge.message, ATTRIBUTE.NONCE)?.value;
  if (!realm?.length || !nonce?.length) {
    throw new Error('TURN 401 challenge omitted REALM or NONCE');
  }

  const username = `${Math.floor(Date.now() / 1000) + 600}:ci-smoke`;
  const password = createHmac('sha1', sharedSecret).update(username).digest('base64');
  const integrityKey = createHash('md5')
    .update(`${username}:${realm.toString('utf8')}:${password}`)
    .digest();
  const allocateRequest = buildRequest([
    encodeAttribute(ATTRIBUTE.USERNAME, username),
    encodeAttribute(ATTRIBUTE.REALM, realm),
    encodeAttribute(ATTRIBUTE.NONCE, nonce),
    encodeAttribute(ATTRIBUTE.REQUESTED_TRANSPORT, requestedTransport)
  ], { integrityKey });
  const allocation = await exchange(allocateRequest);

  if (allocation.message.method !== ALLOCATE_METHOD
      || allocation.message.messageClass !== SUCCESS_CLASS) {
    throw new Error(`Authenticated TURN Allocate failed with code ${errorCode(allocation.message) ?? 'unknown'}`);
  }
  if (!verifyMessageIntegrity(allocation.packet, allocation.message, integrityKey)) {
    throw new Error('TURN Allocate success response failed MESSAGE-INTEGRITY validation');
  }
  if (!attribute(allocation.message, ATTRIBUTE.XOR_RELAYED_ADDRESS)) {
    throw new Error('TURN Allocate success response omitted XOR-RELAYED-ADDRESS');
  }

  console.log('Authenticated TURN allocation smoke test passed');
} finally {
  socket.close();
}

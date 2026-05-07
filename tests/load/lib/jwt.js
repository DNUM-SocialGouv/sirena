import { hmac } from 'k6/crypto';
import encoding from 'k6/encoding';

const base64UrlEncode = (input) => encoding.b64encode(input, 'rawurl');

export function signAuthToken({ userId, roleId, secret, expiresInSeconds }) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    id: userId,
    roleId,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const headerSegment = base64UrlEncode(JSON.stringify(header));
  const payloadSegment = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerSegment}.${payloadSegment}`;
  const signature = hmac('sha256', secret, signingInput, 'base64rawurl');

  return `${signingInput}.${signature}`;
}

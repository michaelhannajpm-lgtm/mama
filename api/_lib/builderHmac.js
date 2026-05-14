// HMAC-SHA256 sign/verify for the builder webhook.
// Constant-time compare, length-guarded so a bad client can't crash us.
import { createHmac, timingSafeEqual } from 'node:crypto';

export const sign = (body, secret) =>
  createHmac('sha256', secret).update(body, 'utf8').digest('hex');

export const verify = (body, sigHex, secret) => {
  if (typeof sigHex !== 'string' || sigHex.length !== 64) return false;
  const expected = sign(body, secret);
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sigHex, 'hex'));
  } catch {
    return false;
  }
};

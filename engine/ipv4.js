// IPv4 address and CIDR helpers using unsigned 32-bit integers (research.md R2).
// Pure functions; no DOM or global state.

const OCTET = /^(0|[1-9]\d{0,2})$/;

export function parseIPv4(text) {
  if (typeof text !== 'string') throw new Error(`Invalid IPv4 address: ${text}`);
  const parts = text.split('.');
  if (parts.length !== 4) throw new Error(`Invalid IPv4 address: ${text}`);
  let value = 0;
  for (const part of parts) {
    if (!OCTET.test(part)) throw new Error(`Invalid IPv4 address: ${text}`);
    const n = Number(part);
    if (n > 255) throw new Error(`Invalid IPv4 address: ${text}`);
    value = value * 256 + n;
  }
  return value >>> 0;
}

export function formatIPv4(value) {
  const v = value >>> 0;
  return [v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255, v & 255].join('.');
}

export function maskFor(length) {
  return length === 0 ? 0 : ((~0 << (32 - length)) >>> 0);
}

// Returns { prefix, network, length, mask }. Rejects lengths outside /8–/32 and host bits.
export function parseCIDR(text) {
  if (typeof text !== 'string' || !text.includes('/')) throw new Error(`Invalid CIDR prefix: ${text}`);
  const [addr, lenText] = text.split('/');
  if (!/^\d{1,2}$/.test(lenText)) throw new Error(`Invalid prefix length in ${text}`);
  const length = Number(lenText);
  if (length < 8 || length > 32) throw new Error(`Prefix length must be /8–/32 in ${text}`);
  const network = parseIPv4(addr);
  const mask = maskFor(length);
  if (((network & ~mask) >>> 0) !== 0) throw new Error(`Host bits set in ${text}`);
  return { prefix: text, network, length, mask };
}

export function contains(cidr, address) {
  const c = typeof cidr === 'string' ? parseCIDR(cidr) : cidr;
  const a = typeof address === 'string' ? parseIPv4(address) : address >>> 0;
  return ((a & c.mask) >>> 0) === c.network;
}

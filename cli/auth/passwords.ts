import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const KEYLEN = 64;

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(plain, salt, KEYLEN)) as Buffer;
  return `$scrypt$${salt}$${hash.toString('hex')}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  // format: $scrypt$<salt>$<hash>  → parts = ['', 'scrypt', salt, hash]
  if (parts.length !== 4 || parts[1] !== 'scrypt') return false;
  const [, , salt, hashHex] = parts;
  const storedHash = Buffer.from(hashHex, 'hex');
  const derived = (await scryptAsync(plain, salt, KEYLEN)) as Buffer;
  if (derived.length !== storedHash.length) return false;
  return timingSafeEqual(derived, storedHash);
}

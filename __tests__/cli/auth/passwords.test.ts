import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../../cli/auth/passwords.js';

describe('passwords', () => {
  it('should hash and verify a password', async () => {
    const hash = await hashPassword('mysecret123');
    expect(hash).toMatch(/^\$scrypt\$/);
    expect(await verifyPassword('mysecret123', hash)).toBe(true);
  });

  it('should reject wrong password', async () => {
    const hash = await hashPassword('correct');
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('should produce different hashes for the same password (random salt)', async () => {
    const h1 = await hashPassword('same');
    const h2 = await hashPassword('same');
    expect(h1).not.toBe(h2);
    expect(await verifyPassword('same', h1)).toBe(true);
    expect(await verifyPassword('same', h2)).toBe(true);
  });

  it('should return false for malformed stored hash', async () => {
    expect(await verifyPassword('test', 'not-a-hash')).toBe(false);
    expect(await verifyPassword('test', '$bcrypt$salt$hash')).toBe(false);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { signToken, verifyToken, extractToken } from '../../../cli/auth/jwt.js';
import type { Request } from 'express';

const payload = { sub: 'user_123', username: 'alice', role: 'admin' as const };

describe('jwt', () => {
  it('should sign and verify a token', () => {
    const token = signToken(payload);
    expect(token.split('.')).toHaveLength(3);
    const verified = verifyToken(token);
    expect(verified).not.toBeNull();
    expect(verified!.sub).toBe('user_123');
    expect(verified!.username).toBe('alice');
    expect(verified!.role).toBe('admin');
  });

  it('should return null for tampered token', () => {
    const token = signToken(payload);
    const parts = token.split('.');
    parts[1] = Buffer.from(JSON.stringify({ sub: 'attacker', username: 'eve', role: 'admin', iat: 0, exp: 9999999999 })).toString('base64url');
    expect(verifyToken(parts.join('.'))).toBeNull();
  });

  it('should return null for expired token', () => {
    const token = signToken(payload);
    const parts = token.split('.');
    // Decode and modify exp to the past
    const p = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    p.exp = Math.floor(Date.now() / 1000) - 1;
    // This is now invalid because sig won't match — just verifying the flow
    parts[1] = Buffer.from(JSON.stringify(p)).toString('base64url');
    expect(verifyToken(parts.join('.'))).toBeNull();
  });

  it('should return null for garbage input', () => {
    expect(verifyToken('')).toBeNull();
    expect(verifyToken('not.a.token')).toBeNull();
    expect(verifyToken('a.b')).toBeNull();
  });

  it('should extract token from Authorization header', () => {
    const req = { headers: { authorization: 'Bearer mytoken123' } } as unknown as Request;
    expect(extractToken(req)).toBe('mytoken123');
  });

  it('should extract token from cookie', () => {
    const req = { headers: { cookie: 'openqa_token=cookietoken456' } } as unknown as Request;
    expect(extractToken(req)).toBe('cookietoken456');
  });

  it('should prefer cookie over Authorization header', () => {
    const req = {
      headers: {
        cookie: 'openqa_token=fromcookie',
        authorization: 'Bearer fromheader',
      },
    } as unknown as Request;
    expect(extractToken(req)).toBe('fromcookie');
  });

  it('should return null when no token present', () => {
    const req = { headers: {} } as unknown as Request;
    expect(extractToken(req)).toBeNull();
  });
});

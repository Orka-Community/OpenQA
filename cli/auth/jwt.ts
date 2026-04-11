import { createHmac, randomBytes } from 'node:crypto';
import { parse as parseCookies } from 'cookie';
import type { Request, Response } from 'express';
import type { JwtPayload } from './types.js';

const TTL_MS = 24 * 60 * 60 * 1000; // 24h
const COOKIE_NAME = 'openqa_token';

let _secret: string | null = null;

function getSecret(): string {
  if (_secret) return _secret;
  _secret = process.env.OPENQA_JWT_SECRET ?? null;
  if (!_secret) {
    _secret = randomBytes(32).toString('hex');
    console.warn('[OpenQA] OPENQA_JWT_SECRET not set — using a volatile secret. All sessions will be invalidated on restart.');
  }
  return _secret;
}

function b64url(input: string): string {
  return Buffer.from(input).toString('base64url');
}

function fromB64url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const now = Math.floor(Date.now() / 1000);
  const full: JwtPayload = { ...payload, iat: now, exp: now + Math.floor(TTL_MS / 1000) };
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(full));
  const sig = createHmac('sha256', getSecret()).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const [header, body, sig] = token.split('.');
    if (!header || !body || !sig) return null;
    const expected = createHmac('sha256', getSecret()).update(`${header}.${body}`).digest('base64url');
    if (expected !== sig) return null;
    const payload = JSON.parse(fromB64url(body)) as JwtPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: TTL_MS,
    path: '/',
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

export function extractToken(req: Request): string | null {
  // 1. httpOnly cookie
  const cookieHeader = req.headers.cookie ?? '';
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    if (cookies[COOKIE_NAME]) return cookies[COOKIE_NAME];
  }
  // 2. Authorization: Bearer <token>
  const auth = req.headers.authorization ?? '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

import type { Request, Response, NextFunction } from 'express';
import { verifyToken, extractToken } from './jwt.js';
import type { AuthedRequest, JwtPayload } from './types.js';
import type { OpenQADatabase } from '../../database/index.js';

export const AUTH_DISABLED = process.env.OPENQA_AUTH_DISABLED === 'true';

/** API routes: return 401 JSON if not authenticated */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (AUTH_DISABLED) { (req as AuthedRequest).user = { sub: 'dev', username: 'dev', role: 'admin', iat: 0, exp: 0 }; return next(); }
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  (req as AuthedRequest).user = payload;
  next();
}

/** After requireAuth: return 403 if not admin */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as AuthedRequest).user;
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden — admin only' });
    return;
  }
  next();
}

/** HTML pages: redirect to /login (or /setup on first run) if not authenticated */
export function authOrRedirect(db: OpenQADatabase) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (AUTH_DISABLED) return next();
    const token = extractToken(req);
    const payload = token ? verifyToken(token) : null;
    if (payload) {
      (req as AuthedRequest).user = payload;
      return next();
    }
    // No valid session — check if setup is needed
    const count = await db.countUsers();
    if (count === 0) {
      res.redirect('/setup');
    } else {
      res.redirect('/login');
    }
  };
}

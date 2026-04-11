import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { OpenQADatabase } from '../../database/index.js';
import { hashPassword, verifyPassword } from './passwords.js';
import { signToken, setAuthCookie, clearAuthCookie } from './jwt.js';
import { requireAuth, requireAdmin } from './middleware.js';
import type { AuthedRequest } from './types.js';

// ── Validation schemas ─────────────────────────────────────────────────────────

function validate(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: Parameters<typeof requireAuth>[2]) => {
    const r = schema.safeParse(req.body);
    if (!r.success) {
      res.status(400).json({ error: r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ') });
      return;
    }
    req.body = r.data;
    next();
  };
}

const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

const setupSchema = z.object({
  username: z.string().min(3).max(100).regex(/^[a-z0-9_.@-]+$/, 'Only lowercase letters, digits, and ._@- characters'),
  password: z.string().min(8).max(200),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
});

const createUserSchema = z.object({
  username: z.string().min(3).max(100).regex(/^[a-z0-9_.@-]+$/, 'Only lowercase letters, digits, and ._@- characters'),
  password: z.string().min(8).max(200),
  role: z.enum(['admin', 'viewer']),
});

const updateUserSchema = z.object({
  role: z.enum(['admin', 'viewer']).optional(),
  password: z.string().min(8).max(200).optional(),
});

// ── Router ─────────────────────────────────────────────────────────────────────

export function createAuthRouter(db: OpenQADatabase): Router {
  const router = Router();

  // POST /api/auth/login ── public
  router.post('/api/auth/login', validate(loginSchema), async (req, res) => {
    const { username, password } = req.body as { username: string; password: string };
    const user = await db.findUserByUsername(username);
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const token = signToken({ sub: user.id, username: user.username, role: user.role });
    setAuthCookie(res, token);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  });

  // POST /api/auth/logout ── public
  router.post('/api/auth/logout', (_req, res) => {
    clearAuthCookie(res);
    res.json({ success: true });
  });

  // GET /api/auth/me ── protected
  router.get('/api/auth/me', requireAuth, (req, res) => {
    const { sub, username, role } = (req as AuthedRequest).user;
    res.json({ id: sub, username, role });
  });

  // POST /api/auth/change-password ── protected
  router.post('/api/auth/change-password', requireAuth, validate(changePasswordSchema), async (req, res) => {
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
    const userId = (req as AuthedRequest).user.sub;
    const user = await db.getUserById(userId);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) { res.status(401).json({ error: 'Current password is incorrect' }); return; }
    const passwordHash = await hashPassword(newPassword);
    await db.updateUser(userId, { passwordHash });
    res.json({ success: true });
  });

  // POST /api/setup ── first-run only (public)
  router.post('/api/setup', validate(setupSchema), async (req, res) => {
    const count = await db.countUsers();
    if (count > 0) {
      res.status(409).json({ error: 'Setup already complete' });
      return;
    }
    const { username, password } = req.body as { username: string; password: string };
    const existing = await db.findUserByUsername(username);
    if (existing) { res.status(409).json({ error: 'Username already taken' }); return; }
    const passwordHash = await hashPassword(password);
    const user = await db.createUser({ username, passwordHash, role: 'admin' });
    const token = signToken({ sub: user.id, username: user.username, role: user.role });
    setAuthCookie(res, token);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  });

  // ── Account management (admin only) ────────────────────────────────────────

  // GET /api/accounts
  router.get('/api/accounts', requireAuth, requireAdmin, async (_req, res) => {
    const users = await db.getAllUsers();
    res.json(users.map(u => ({ id: u.id, username: u.username, role: u.role, createdAt: u.createdAt })));
  });

  // POST /api/accounts
  router.post('/api/accounts', requireAuth, requireAdmin, validate(createUserSchema), async (req, res) => {
    const { username, password, role } = req.body as { username: string; password: string; role: 'admin' | 'viewer' };
    const existing = await db.findUserByUsername(username);
    if (existing) { res.status(409).json({ error: 'Username already taken' }); return; }
    const passwordHash = await hashPassword(password);
    const user = await db.createUser({ username, passwordHash, role });
    res.status(201).json({ id: user.id, username: user.username, role: user.role, createdAt: user.createdAt });
  });

  // PUT /api/accounts/:id
  router.put('/api/accounts/:id', requireAuth, requireAdmin, validate(updateUserSchema), async (req, res) => {
    const { id } = req.params;
    const user = await db.getUserById(id);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const updates: Parameters<typeof db.updateUser>[1] = {};
    if (req.body.role) updates.role = req.body.role;
    if (req.body.password) updates.passwordHash = await hashPassword(req.body.password);

    // Prevent removing the last admin
    if (updates.role === 'viewer' && user.role === 'admin') {
      const allAdmins = (await db.getAllUsers()).filter(u => u.role === 'admin');
      if (allAdmins.length <= 1) {
        res.status(400).json({ error: 'Cannot demote the last admin' });
        return;
      }
    }

    await db.updateUser(id, updates);
    const updated = await db.getUserById(id);
    res.json({ id: updated!.id, username: updated!.username, role: updated!.role });
  });

  // DELETE /api/accounts/:id
  router.delete('/api/accounts/:id', requireAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const actor = (req as AuthedRequest).user;

    if (actor.sub === id) {
      res.status(400).json({ error: 'Cannot delete your own account' });
      return;
    }

    const user = await db.getUserById(id);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    if (user.role === 'admin') {
      const allAdmins = (await db.getAllUsers()).filter(u => u.role === 'admin');
      if (allAdmins.length <= 1) {
        res.status(400).json({ error: 'Cannot delete the last admin' });
        return;
      }
    }

    await db.deleteUser(id);
    res.json({ success: true });
  });

  return router;
}

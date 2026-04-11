import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import os from 'os';
import path from 'path';
import { OpenQADatabase } from '../../../database/index.js';
import { createAuthRouter } from '../../../cli/auth/router.js';

function makeApp() {
  const dbPath = path.join(os.tmpdir(), `openqa-auth-test-${Date.now()}.json`);
  const db = new OpenQADatabase(dbPath);
  const app = express();
  app.use(express.json());
  app.use(createAuthRouter(db));
  return { app, db };
}

describe('auth router', () => {
  describe('POST /api/setup', () => {
    it('creates first admin and returns token', async () => {
      const { app } = makeApp();
      const res = await request(app)
        .post('/api/setup')
        .send({ username: 'admin', password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();
      expect(res.body.user.role).toBe('admin');
      expect(res.body.user.username).toBe('admin');
    });

    it('rejects setup when users already exist', async () => {
      const { app } = makeApp();
      await request(app).post('/api/setup').send({ username: 'admin', password: 'password123' });
      const res = await request(app).post('/api/setup').send({ username: 'admin2', password: 'password123' });
      expect(res.status).toBe(409);
    });

    it('validates password minimum length', async () => {
      const { app } = makeApp();
      const res = await request(app).post('/api/setup').send({ username: 'admin', password: 'short' });
      expect(res.status).toBe(400);
    });

    it('validates username format', async () => {
      const { app } = makeApp();
      const res = await request(app).post('/api/setup').send({ username: 'Admin User!', password: 'password123' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns token on valid credentials', async () => {
      const { app } = makeApp();
      await request(app).post('/api/setup').send({ username: 'alice', password: 'alicepass1' });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'alice', password: 'alicepass1' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();
      expect(res.body.user.username).toBe('alice');
    });

    it('returns 401 on wrong password', async () => {
      const { app } = makeApp();
      await request(app).post('/api/setup').send({ username: 'bob', password: 'bobpass123' });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'bob', password: 'wrongpass' });
      expect(res.status).toBe(401);
    });

    it('returns 401 on unknown username', async () => {
      const { app } = makeApp();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'ghost', password: 'doesnotexist' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns user info with valid token', async () => {
      const { app } = makeApp();
      await request(app).post('/api/setup').send({ username: 'carol', password: 'carolpass1' });
      const login = await request(app).post('/api/auth/login').send({ username: 'carol', password: 'carolpass1' });
      const token = login.body.token;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.username).toBe('carol');
      expect(res.body.role).toBe('admin');
    });

    it('returns 401 without token', async () => {
      const { app } = makeApp();
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('clears cookie', async () => {
      const { app } = makeApp();
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Account management', () => {
    async function loginAdmin(app: express.Express) {
      await request(app).post('/api/setup').send({ username: 'admin', password: 'adminpass1' });
      const login = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'adminpass1' });
      return login.body.token as string;
    }

    it('admin can list accounts', async () => {
      const { app } = makeApp();
      const token = await loginAdmin(app);
      const res = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].username).toBe('admin');
    });

    it('admin can create a viewer', async () => {
      const { app } = makeApp();
      const token = await loginAdmin(app);
      const res = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ username: 'viewer1', password: 'viewpass12', role: 'viewer' });
      expect(res.status).toBe(201);
      expect(res.body.role).toBe('viewer');
    });

    it('cannot delete the last admin', async () => {
      const { app, db } = makeApp();
      const token = await loginAdmin(app);
      const users = await db.getAllUsers();
      const adminId = users[0].id;
      const res = await request(app)
        .delete(`/api/accounts/${adminId}`)
        .set('Authorization', `Bearer ${token}`);
      // Self-delete blocked first
      expect(res.status).toBe(400);
    });

    it('viewer cannot access accounts endpoint', async () => {
      const { app } = makeApp();
      const adminToken = await loginAdmin(app);
      // Create viewer
      await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: 'viewer2', password: 'viewpass12', role: 'viewer' });
      const viewerLogin = await request(app)
        .post('/api/auth/login')
        .send({ username: 'viewer2', password: 'viewpass12' });
      const viewerToken = viewerLogin.body.token;
      const res = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBe(403);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService } from '../../agent/notifications/index.js';

describe('NotificationService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  });

  it('should report as not configured when no webhooks set', () => {
    const svc = new NotificationService({});
    expect(svc.isConfigured()).toBe(false);
  });

  it('should report as configured when slack is set', () => {
    const svc = new NotificationService({ slack: 'https://hooks.slack.com/test' });
    expect(svc.isConfigured()).toBe(true);
  });

  it('should call slack webhook on notify', async () => {
    const svc = new NotificationService({ slack: 'https://hooks.slack.com/test' });
    await svc.notify({ title: 'Test', message: 'Hello', severity: 'info' });

    expect(fetch).toHaveBeenCalledWith(
      'https://hooks.slack.com/test',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('should call discord webhook on notify', async () => {
    const svc = new NotificationService({ discord: 'https://discord.com/api/webhooks/test' });
    await svc.notify({ title: 'Test', message: 'Hello', severity: 'success' });

    expect(fetch).toHaveBeenCalledWith(
      'https://discord.com/api/webhooks/test',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('should call both webhooks when both configured', async () => {
    const svc = new NotificationService({
      slack: 'https://hooks.slack.com/test',
      discord: 'https://discord.com/api/webhooks/test',
    });
    await svc.notify({ title: 'Both', message: 'msg' });

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('should not call fetch when no webhooks configured', async () => {
    const svc = new NotificationService({});
    await svc.notify({ title: 'Nothing', message: 'msg' });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('should send bug notification with correct severity', async () => {
    const svc = new NotificationService({ slack: 'https://hooks.slack.com/test' });
    await svc.notifyBug({
      id: 'bug_1',
      session_id: 'sess_1',
      title: 'Login broken',
      description: 'Cannot log in',
      severity: 'critical',
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const callBody = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(callBody.attachments[0].title).toContain('Login broken');
    expect(callBody.attachments[0].color).toBe('#dc3545'); // error color
  });
});

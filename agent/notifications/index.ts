import { Bug } from '../../database/index.js';

export interface NotificationConfig {
  slack?: string;
  discord?: string;
}

export interface NotificationPayload {
  title: string;
  message: string;
  severity?: 'info' | 'warning' | 'error' | 'success';
  fields?: Array<{ name: string; value: string }>;
}

export class NotificationService {
  constructor(private config: NotificationConfig) {}

  async notify(payload: NotificationPayload): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.config.slack) {
      promises.push(this.sendSlack(payload));
    }
    if (this.config.discord) {
      promises.push(this.sendDiscord(payload));
    }

    await Promise.allSettled(promises);
  }

  async notifyBug(bug: Bug): Promise<void> {
    const severityEmoji: Record<string, string> = {
      critical: '🔴', high: '🟠', medium: '🟡', low: '🟢',
    };

    await this.notify({
      title: `${severityEmoji[bug.severity] || '⚠️'} Bug Found: ${bug.title}`,
      message: bug.description,
      severity: bug.severity === 'critical' || bug.severity === 'high' ? 'error' : 'warning',
      fields: [
        { name: 'Severity', value: bug.severity },
        { name: 'Status', value: bug.status },
        ...(bug.github_issue_url ? [{ name: 'GitHub Issue', value: bug.github_issue_url }] : []),
      ],
    });
  }

  async notifySessionComplete(stats: { testsGenerated: number; agentsCreated: number; sessionId: string }): Promise<void> {
    await this.notify({
      title: '✅ OpenQA Session Complete',
      message: `Session ${stats.sessionId} finished.`,
      severity: 'success',
      fields: [
        { name: 'Tests Generated', value: String(stats.testsGenerated) },
        { name: 'Agents Created', value: String(stats.agentsCreated) },
      ],
    });
  }

  private async sendSlack(payload: NotificationPayload): Promise<void> {
    const colorMap: Record<string, string> = {
      info: '#36a64f', warning: '#ff9800', error: '#dc3545', success: '#28a745',
    };
    const color = colorMap[payload.severity || 'info'];

    const body = {
      attachments: [{
        color,
        title: payload.title,
        text: payload.message,
        fields: payload.fields?.map(f => ({ title: f.name, value: f.value, short: true })) || [],
        footer: 'OpenQA',
        ts: Math.floor(Date.now() / 1000),
      }],
    };

    const res = await fetch(this.config.slack!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Slack notification failed: ${res.status} ${res.statusText}`);
    }
  }

  private async sendDiscord(payload: NotificationPayload): Promise<void> {
    const colorMap: Record<string, number> = {
      info: 0x36a64f, warning: 0xff9800, error: 0xdc3545, success: 0x28a745,
    };
    const color = colorMap[payload.severity || 'info'];

    const body = {
      embeds: [{
        title: payload.title,
        description: payload.message,
        color,
        fields: payload.fields?.map(f => ({ name: f.name, value: f.value, inline: true })) || [],
        footer: { text: 'OpenQA' },
        timestamp: new Date().toISOString(),
      }],
    };

    const res = await fetch(this.config.discord!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Discord notification failed: ${res.status} ${res.statusText}`);
    }
  }

  isConfigured(): boolean {
    return !!(this.config.slack || this.config.discord);
  }
}

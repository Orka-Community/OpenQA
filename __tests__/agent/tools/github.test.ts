import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OpenQADatabase } from '../../../database/index.js';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock Octokit before importing GitHubTools
vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    rest: {
      issues: {
        create: vi.fn().mockResolvedValue({
          data: {
            html_url: 'https://github.com/test/repo/issues/42',
            number: 42,
          },
        }),
      },
    },
  })),
}));

describe('GitHubTools', () => {
  let db: OpenQADatabase;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = join(tmpdir(), `openqa-github-test-${Date.now()}.json`);
    db = new OpenQADatabase(dbPath);
    // SQLite FK constraint: session must exist before actions/bugs are inserted
    await db.createSession('test_session');
  });

  afterEach(() => {
    for (const suffix of ['', '-wal', '-shm']) {
      const f = dbPath + suffix;
      if (existsSync(f)) try { unlinkSync(f); } catch {}
    }
  });

  it('should return error when GitHub is not configured', async () => {
    const { GitHubTools } = await import('../../../agent/tools/github.js');
    const tools = new GitHubTools(db, 'test_session', {});
    const toolDefs = tools.getTools();
    const createIssueTool = toolDefs[0];

    const result = await createIssueTool.execute({
      title: 'Bug',
      body: 'Description',
      severity: 'high',
    });

    expect(result.output).toContain('GitHub not configured');
  });

  it('should create an issue when configured', async () => {
    const { GitHubTools } = await import('../../../agent/tools/github.js');
    const tools = new GitHubTools(db, 'test_session', {
      token: 'fake-token',
      owner: 'test-owner',
      repo: 'test-repo',
    });

    const toolDefs = tools.getTools();
    const createIssueTool = toolDefs[0];

    const result = await createIssueTool.execute({
      title: 'Critical Bug',
      body: 'Steps to reproduce...',
      severity: 'critical',
      labels: ['frontend'],
    });

    expect(result.output).toContain('GitHub issue created successfully');
    expect(result.output).toContain('#42');

    // Verify bug was stored in DB
    const bugs = await db.getAllBugs();
    expect(bugs).toHaveLength(1);
    expect(bugs[0].title).toBe('Critical Bug');
    expect(bugs[0].severity).toBe('critical');
    expect(bugs[0].github_issue_url).toBe('https://github.com/test/repo/issues/42');
  });
});

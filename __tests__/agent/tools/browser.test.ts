import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OpenQADatabase } from '../../../database/index.js';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const mockPage = {
  goto: vi.fn().mockResolvedValue(undefined),
  title: vi.fn().mockResolvedValue('Test Page'),
  click: vi.fn().mockResolvedValue(undefined),
  fill: vi.fn().mockResolvedValue(undefined),
  screenshot: vi.fn().mockResolvedValue(undefined),
  textContent: vi.fn().mockResolvedValue('Hello World'),
  waitForTimeout: vi.fn().mockResolvedValue(undefined),
  url: vi.fn().mockReturnValue('https://example.com'),
  on: vi.fn(),
  evaluate: vi.fn().mockImplementation((fn: Function) => {
    // Return sensible defaults for all evaluate calls
    return Promise.resolve([]);
  }),
  waitForSelector: vi.fn().mockResolvedValue({}),
};

const mockContext = {
  newPage: vi.fn().mockResolvedValue(mockPage),
};

const mockBrowser = {
  newContext: vi.fn().mockResolvedValue(mockContext),
  close: vi.fn().mockResolvedValue(undefined),
};

vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue(mockBrowser),
  },
}));

describe('BrowserTools', () => {
  let db: OpenQADatabase;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = join(tmpdir(), `openqa-browser-test-${Date.now()}.json`);
    db = new OpenQADatabase(dbPath);
    // SQLite FK constraint: session must exist before actions are inserted
    await db.createSession('test_session');
    vi.clearAllMocks();
  });

  afterEach(() => {
    for (const suffix of ['', '-wal', '-shm']) {
      const f = dbPath + suffix;
      if (existsSync(f)) try { unlinkSync(f); } catch {}
    }
  });

  it('should return 8 tools', async () => {
    const { BrowserTools } = await import('../../../agent/tools/browser.js');
    const tools = new BrowserTools(db, 'test_session');
    const toolDefs = tools.getTools();
    expect(toolDefs).toHaveLength(8);
    expect(toolDefs.map(t => t.name)).toEqual([
      'navigate_to_page',
      'click_element',
      'fill_input',
      'take_screenshot',
      'get_page_content',
      'find_element_by_text',
      'wait_for_element',
      'check_console_errors',
    ]);
  });

  it('should navigate to a page', async () => {
    const { BrowserTools } = await import('../../../agent/tools/browser.js');
    const tools = new BrowserTools(db, 'test_session');
    const toolDefs = tools.getTools();
    const navigateTool = toolDefs.find(t => t.name === 'navigate_to_page')!;

    const result = await navigateTool.execute({ url: 'https://example.com' } as never);

    expect((result as { output: string }).output).toContain('Successfully navigated');
    expect((result as { output: string }).output).toContain('Test Page');
    expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', { waitUntil: 'networkidle' });
  });

  it('should click an element', async () => {
    const { BrowserTools } = await import('../../../agent/tools/browser.js');
    const tools = new BrowserTools(db, 'test_session');
    const toolDefs = tools.getTools();

    // Initialize browser first
    await toolDefs.find(t => t.name === 'navigate_to_page')!.execute({ url: 'https://example.com' } as never);

    const clickTool = toolDefs.find(t => t.name === 'click_element')!;
    const result = await clickTool.execute({ selector: '#submit' } as never);

    expect((result as { output: string }).output).toContain('Successfully clicked');
    expect(mockPage.click).toHaveBeenCalledWith('#submit', { timeout: 5000 });
  });

  it('should return error when browser not initialized for click', async () => {
    const { BrowserTools } = await import('../../../agent/tools/browser.js');
    const tools = new BrowserTools(db, 'test_session');
    const toolDefs = tools.getTools();
    const clickTool = toolDefs.find(t => t.name === 'click_element')!;

    const result = await clickTool.execute({ selector: '#btn' } as never);
    expect((result as { output: string }).output).toContain('Browser not initialized');
  });

  it('should get page content', async () => {
    const { BrowserTools } = await import('../../../agent/tools/browser.js');
    const tools = new BrowserTools(db, 'test_session');
    const toolDefs = tools.getTools();

    // Initialize
    await toolDefs.find(t => t.name === 'navigate_to_page')!.execute({ url: 'https://example.com' } as never);

    const contentTool = toolDefs.find(t => t.name === 'get_page_content')!;
    const result = await contentTool.execute({} as never);
    const output = (result as { output: string }).output;

    // get_page_content returns structured JSON with title, url, textSample, links, forms, buttons, inputs
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('title', 'Test Page');
    expect(parsed).toHaveProperty('url', 'https://example.com');
    expect(parsed).toHaveProperty('textSample');
    expect(parsed).toHaveProperty('links');
    expect(parsed).toHaveProperty('forms');
  });

  it('should close browser', async () => {
    const { BrowserTools } = await import('../../../agent/tools/browser.js');
    const tools = new BrowserTools(db, 'test_session');
    const toolDefs = tools.getTools();

    // Initialize
    await toolDefs.find(t => t.name === 'navigate_to_page')!.execute({ url: 'https://example.com' } as never);

    await tools.close();
    expect(mockBrowser.close).toHaveBeenCalled();
  });
});

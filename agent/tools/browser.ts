import { chromium, Browser, Page } from 'playwright';
import { OpenQADatabase } from '../../database/index.js';
import { mkdirSync } from 'fs';
import { join } from 'path';

export class BrowserTools {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private db: OpenQADatabase;
  private sessionId: string;
  private screenshotDir: string = './data/screenshots';

  constructor(db: OpenQADatabase, sessionId: string) {
    this.db = db;
    this.sessionId = sessionId;
    mkdirSync(this.screenshotDir, { recursive: true });
  }

  async initialize() {
    this.browser = await chromium.launch({ headless: true });
    const context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'OpenQA/1.0 (Automated Testing Agent)'
    });
    this.page = await context.newPage();
  }

  getTools() {
    return [
      {
        name: 'navigate_to_page',
        description: 'Navigate to a specific URL in the application',
        parameters: [
          { name: 'url', type: 'string' as const, description: 'The URL to navigate to', required: true }
        ],
        execute: async ({ url }: { url: string }) => {
          if (!this.page) await this.initialize();
          
          try {
            await this.page!.goto(url, { waitUntil: 'networkidle' });
            const title = await this.page!.title();
            
            this.db.createAction({
              session_id: this.sessionId,
              type: 'navigate',
              description: `Navigated to ${url}`,
              input: url,
              output: `Page title: ${title}`
            });
            
            // Track coverage
            this.db.trackPageVisit(this.sessionId, url, 'visit');
            
            return { output: `Successfully navigated to ${url}. Page title: "${title}"` };
          } catch (error: unknown) {
            return { output: `Failed to navigate: ${error instanceof Error ? error.message : String(error)}`, error: error instanceof Error ? error.message : String(error) };
          }
        }
      },
      {
        name: 'click_element',
        description: 'Click on an element using a CSS selector',
        parameters: [
          { name: 'selector', type: 'string' as const, description: 'CSS selector of the element to click', required: true }
        ],
        execute: async ({ selector }: { selector: string }) => {
          if (!this.page) return { output: 'Browser not initialized. Navigate to a page first.', error: 'Browser not initialized' };
          
          try {
            await this.page.click(selector, { timeout: 5000 });
            
            this.db.createAction({
              session_id: this.sessionId,
              type: 'click',
              description: `Clicked element: ${selector}`,
              input: selector
            });
            
            // Track coverage - action on current page
            const currentUrl = this.page.url();
            this.db.trackPageVisit(this.sessionId, currentUrl, 'action');
            
            return { output: `Successfully clicked element: ${selector}` };
          } catch (error: unknown) {
            return { output: `Failed to click element: ${error instanceof Error ? error.message : String(error)}`, error: error instanceof Error ? error.message : String(error) };
          }
        }
      },
      {
        name: 'fill_input',
        description: 'Fill an input field with text',
        parameters: [
          { name: 'selector', type: 'string' as const, description: 'CSS selector of the input field', required: true },
          { name: 'text', type: 'string' as const, description: 'Text to fill in the input', required: true }
        ],
        execute: async ({ selector, text }: { selector: string; text: string }) => {
          if (!this.page) return { output: 'Browser not initialized. Navigate to a page first.', error: 'Browser not initialized' };
          
          try {
            await this.page.fill(selector, text);
            
            this.db.createAction({
              session_id: this.sessionId,
              type: 'fill',
              description: `Filled input ${selector}`,
              input: `${selector} = ${text}`
            });
            
            // Track coverage - form interaction
            const currentUrl = this.page.url();
            this.db.trackPageVisit(this.sessionId, currentUrl, 'form');
            
            return { output: `Successfully filled input ${selector} with text` };
          } catch (error: unknown) {
            return { output: `Failed to fill input: ${error instanceof Error ? error.message : String(error)}`, error: error instanceof Error ? error.message : String(error) };
          }
        }
      },
      {
        name: 'take_screenshot',
        description: 'Take a screenshot of the current page for evidence',
        parameters: [
          { name: 'name', type: 'string' as const, description: 'Name for the screenshot file', required: true }
        ],
        execute: async ({ name }: { name: string }) => {
          if (!this.page) return { output: 'Browser not initialized. Navigate to a page first.', error: 'Browser not initialized' };
          
          try {
            const filename = `${Date.now()}_${name}.png`;
            const path = join(this.screenshotDir, filename);
            await this.page.screenshot({ path, fullPage: true });
            
            this.db.createAction({
              session_id: this.sessionId,
              type: 'screenshot',
              description: `Screenshot: ${name}`,
              screenshot_path: path
            });
            
            return { output: `Screenshot saved: ${path}` };
          } catch (error: unknown) {
            return { output: `Failed to take screenshot: ${error instanceof Error ? error.message : String(error)}`, error: error instanceof Error ? error.message : String(error) };
          }
        }
      },
      {
        name: 'get_page_content',
        description: 'Get the text content of the current page',
        parameters: [],
        execute: async () => {
          if (!this.page) return { output: 'Browser not initialized. Navigate to a page first.', error: 'Browser not initialized' };
          
          try {
            const content = await this.page.textContent('body');
            return { output: content?.slice(0, 1000) || 'No content found' };
          } catch (error: unknown) {
            return { output: `Failed to get content: ${error instanceof Error ? error.message : String(error)}`, error: error instanceof Error ? error.message : String(error) };
          }
        }
      },
      {
        name: 'check_console_errors',
        description: 'Check for JavaScript console errors on the page',
        parameters: [],
        execute: async () => {
          if (!this.page) return { output: 'Browser not initialized. Navigate to a page first.', error: 'Browser not initialized' };
          
          const errors: string[] = [];
          this.page.on('console', msg => {
            if (msg.type() === 'error') {
              errors.push(msg.text());
            }
          });
          
          await this.page.waitForTimeout(2000);
          
          if (errors.length > 0) {
            return { output: `Found ${errors.length} console errors:\n${errors.join('\n')}` };
          }
          return { output: 'No console errors detected' };
        }
      }
    ];
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

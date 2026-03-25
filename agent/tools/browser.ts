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
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'The URL to navigate to' }
          },
          required: ['url']
        },
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
            
            return `Successfully navigated to ${url}. Page title: "${title}"`;
          } catch (error: any) {
            return `Failed to navigate: ${error.message}`;
          }
        }
      },
      {
        name: 'click_element',
        description: 'Click on an element using a CSS selector',
        parameters: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS selector of the element to click' }
          },
          required: ['selector']
        },
        execute: async ({ selector }: { selector: string }) => {
          if (!this.page) return 'Browser not initialized. Navigate to a page first.';
          
          try {
            await this.page.click(selector, { timeout: 5000 });
            
            this.db.createAction({
              session_id: this.sessionId,
              type: 'click',
              description: `Clicked element: ${selector}`,
              input: selector
            });
            
            return `Successfully clicked element: ${selector}`;
          } catch (error: any) {
            return `Failed to click element: ${error.message}`;
          }
        }
      },
      {
        name: 'fill_input',
        description: 'Fill an input field with text',
        parameters: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS selector of the input field' },
            text: { type: 'string', description: 'Text to fill in the input' }
          },
          required: ['selector', 'text']
        },
        execute: async ({ selector, text }: { selector: string; text: string }) => {
          if (!this.page) return 'Browser not initialized. Navigate to a page first.';
          
          try {
            await this.page.fill(selector, text);
            
            this.db.createAction({
              session_id: this.sessionId,
              type: 'fill',
              description: `Filled input ${selector}`,
              input: `${selector} = ${text}`
            });
            
            return `Successfully filled input ${selector} with text`;
          } catch (error: any) {
            return `Failed to fill input: ${error.message}`;
          }
        }
      },
      {
        name: 'take_screenshot',
        description: 'Take a screenshot of the current page for evidence',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name for the screenshot file' }
          },
          required: ['name']
        },
        execute: async ({ name }: { name: string }) => {
          if (!this.page) return 'Browser not initialized. Navigate to a page first.';
          
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
            
            return `Screenshot saved: ${path}`;
          } catch (error: any) {
            return `Failed to take screenshot: ${error.message}`;
          }
        }
      },
      {
        name: 'get_page_content',
        description: 'Get the text content of the current page',
        parameters: {
          type: 'object',
          properties: {}
        },
        execute: async () => {
          if (!this.page) return 'Browser not initialized. Navigate to a page first.';
          
          try {
            const content = await this.page.textContent('body');
            return content?.slice(0, 1000) || 'No content found';
          } catch (error: any) {
            return `Failed to get content: ${error.message}`;
          }
        }
      },
      {
        name: 'check_console_errors',
        description: 'Check for JavaScript console errors on the page',
        parameters: {
          type: 'object',
          properties: {}
        },
        execute: async () => {
          if (!this.page) return 'Browser not initialized. Navigate to a page first.';
          
          const errors: string[] = [];
          this.page.on('console', msg => {
            if (msg.type() === 'error') {
              errors.push(msg.text());
            }
          });
          
          await this.page.waitForTimeout(2000);
          
          if (errors.length > 0) {
            return `Found ${errors.length} console errors:\n${errors.join('\n')}`;
          }
          return 'No console errors detected';
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

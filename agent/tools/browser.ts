import { chromium, Browser, Page } from 'playwright';
import { OpenQADatabase } from '../../database/index.js';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

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
    try {
      this.browser = await chromium.launch({ headless: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Playwright browsers not downloaded → auto-install and retry once
      if (msg.includes('Executable') || msg.includes('playwright install') || msg.includes('not found')) {
        try {
          execSync('npx playwright install chromium --with-deps', { stdio: 'pipe', timeout: 120_000 });
          this.browser = await chromium.launch({ headless: true });
        } catch (installErr) {
          throw new Error(
            `Playwright browser not available and auto-install failed. ` +
            `Run: npx playwright install chromium\n` +
            `Original error: ${msg}`
          );
        }
      } else {
        throw err;
      }
    }
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
        description: 'Get full structured content of the current page: title, visible text, all links, forms with their fields, buttons, and inputs. Use this FIRST to understand the page structure before interacting with elements.',
        parameters: [],
        execute: async () => {
          if (!this.page) return { output: 'Browser not initialized. Navigate to a page first.', error: 'Browser not initialized' };
          try {
            const [title, url, text, links, forms, buttons, inputs] = await Promise.all([
              this.page.title(),
              Promise.resolve(this.page.url()),
              // Visible text (3000 chars) — enough to understand the page without token overload
              this.page.evaluate(() => (document.body as HTMLElement).innerText?.slice(0, 3000) || ''),
              // All anchor links
              this.page.evaluate(() =>
                Array.from(document.querySelectorAll('a[href]')).slice(0, 40).map(a => ({
                  text: a.textContent?.trim().slice(0, 60) || '',
                  href: (a as HTMLAnchorElement).getAttribute('href') || '',
                }))
              ),
              // All forms with their fields
              this.page.evaluate(() =>
                Array.from(document.querySelectorAll('form')).map(f => ({
                  action: (f as HTMLFormElement).action || '',
                  method: (f as HTMLFormElement).method || 'GET',
                  fields: Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
                    tag: el.tagName.toLowerCase(),
                    type: (el as HTMLInputElement).type || '',
                    name: el.getAttribute('name') || el.getAttribute('id') || '',
                    placeholder: el.getAttribute('placeholder') || '',
                    required: el.hasAttribute('required'),
                  })).filter(f => f.type !== 'hidden'),
                }))
              ),
              // Clickable buttons
              this.page.evaluate(() =>
                Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]'))
                  .slice(0, 25).map(b => ({
                    text: b.textContent?.trim().slice(0, 60) || (b as HTMLInputElement).value || '',
                    id: b.id || '',
                    type: (b as HTMLButtonElement).type || '',
                  }))
              ),
              // Standalone inputs (not inside a form)
              this.page.evaluate(() =>
                Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'))
                  .slice(0, 25).map(i => ({
                    type: (i as HTMLInputElement).type || i.tagName.toLowerCase(),
                    name: i.getAttribute('name') || i.getAttribute('id') || '',
                    placeholder: i.getAttribute('placeholder') || '',
                    required: i.hasAttribute('required'),
                  }))
              ),
            ]);

            this.db.trackPageVisit(this.sessionId, url, 'visit');
            return {
              output: JSON.stringify({ title, url, textSample: text, links, forms, buttons, inputs }, null, 2)
            };
          } catch (error: unknown) {
            return { output: `Failed to get page content: ${error instanceof Error ? error.message : String(error)}` };
          }
        }
      },

      {
        name: 'find_element_by_text',
        description: 'Find and click an element by its visible text content. More robust than CSS selectors for dynamic or React/Vue pages where class names are unstable.',
        parameters: [
          { name: 'text', type: 'string' as const, description: 'Visible text of the element (exact or partial match)', required: true },
          { name: 'element_type', type: 'string' as const, description: 'Element role: button | link | any (default: any)', required: false },
        ],
        execute: async ({ text, element_type = 'any' }: { text: string; element_type?: string }) => {
          if (!this.page) return { output: 'Browser not initialized. Navigate to a page first.' };
          try {
            let locator;
            if (element_type === 'button') {
              locator = this.page.getByRole('button', { name: text, exact: false });
            } else if (element_type === 'link') {
              locator = this.page.getByRole('link', { name: text, exact: false });
            } else {
              locator = this.page.getByText(text, { exact: false });
            }
            await locator.first().click({ timeout: 5000 });

            const currentUrl = this.page.url();
            this.db.createAction({
              session_id: this.sessionId,
              type: 'click_text',
              description: `Clicked element with text: "${text}"`,
              input: text,
            });
            this.db.trackPageVisit(this.sessionId, currentUrl, 'action');
            return { output: `Clicked element with text: "${text}"` };
          } catch (error: unknown) {
            return { output: `Element with text "${text}" not found or not clickable: ${error instanceof Error ? error.message : String(error)}` };
          }
        }
      },

      {
        name: 'wait_for_element',
        description: 'Wait for an element to appear on the page. Essential for SPAs and dynamic pages where content loads asynchronously after navigation.',
        parameters: [
          { name: 'selector', type: 'string' as const, description: 'CSS selector to wait for', required: true },
          { name: 'timeout_ms', type: 'number' as const, description: 'Max wait in ms (default: 5000, max: 10000)', required: false },
        ],
        execute: async ({ selector, timeout_ms = 5000 }: { selector: string; timeout_ms?: number }) => {
          if (!this.page) return { output: 'Browser not initialized. Navigate to a page first.' };
          try {
            await this.page.waitForSelector(selector, { timeout: Math.min(timeout_ms, 10_000) });
            return { output: `Element "${selector}" is present on the page.` };
          } catch {
            return { output: `Element "${selector}" did not appear within ${timeout_ms}ms. The page may not have this element, or it may require interaction to show.` };
          }
        }
      },

      {
        name: 'check_console_errors',
        description: 'Capture JavaScript console errors on the current page. Useful to detect runtime crashes and failed API calls.',
        parameters: [],
        execute: async () => {
          if (!this.page) return { output: 'Browser not initialized. Navigate to a page first.', error: 'Browser not initialized' };
          const errors: string[] = [];
          const handler = (msg: import('playwright').ConsoleMessage) => {
            if (msg.type() === 'error') errors.push(msg.text());
          };
          this.page.on('console', handler);
          await this.page.waitForTimeout(2000);
          this.page.off('console', handler);
          if (errors.length > 0) {
            return { output: `Found ${errors.length} console error(s):\n${errors.join('\n')}` };
          }
          return { output: 'No console errors detected.' };
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

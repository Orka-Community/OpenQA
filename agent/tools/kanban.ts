import { OpenQADatabase, KanbanTicket } from '../../database/index.js';
import { FindingDeduplicator } from '../dedup/index.js';
import { ConfidenceScorer } from '../confidence/index.js';

export class KanbanTools {
  private db: OpenQADatabase;
  private sessionId: string;
  private dedup: FindingDeduplicator;
  private confidence: ConfidenceScorer;

  constructor(db: OpenQADatabase, sessionId: string) {
    this.db = db;
    this.sessionId = sessionId;
    this.dedup = new FindingDeduplicator(db);
    this.confidence = new ConfidenceScorer();
  }

  getTools() {
    return [
      {
        name: 'create_kanban_ticket',
        description: 'Create a ticket on the internal Kanban board for QA tracking. Use this for bugs, improvements, or test findings.',
        parameters: [
          { name: 'title', type: 'string' as const, description: 'Ticket title', required: true },
          { name: 'description', type: 'string' as const, description: 'Detailed description', required: true },
          { name: 'priority', type: 'string' as const, description: 'Ticket priority (low, medium, high, critical)', required: true },
          { name: 'column', type: 'string' as const, description: 'Kanban column (backlog, to-do, in-progress, done)', required: false },
          { name: 'tags', type: 'string' as const, description: 'Comma-separated tags for categorization', required: false },
          { name: 'screenshot_path', type: 'string' as const, description: 'Path to screenshot evidence', required: false },
          { name: 'url', type: 'string' as const, description: 'URL where the finding was discovered', required: false },
          { name: 'category', type: 'string' as const, description: 'Finding category (e.g. security, ui, performance)', required: false },
          { name: 'specialist_type', type: 'string' as const, description: 'Specialist that found this (e.g. security-scanner)', required: false }
        ],
        execute: async ({
          title,
          description,
          priority,
          column = 'backlog',
          tags,
          screenshot_path,
          url = '',
          category = 'general',
          specialist_type,
        }: {
          title: string;
          description: string;
          priority: KanbanTicket['priority'];
          column?: KanbanTicket['column'];
          tags?: string | string[];
          screenshot_path?: string;
          url?: string;
          category?: string;
          specialist_type?: string;
        }) => {
          try {
            // ── 1. Duplicate check ──────────────────────────────────────────
            const { isDuplicate, fingerprint } = this.dedup.checkAndRegister(title, url, category);
            if (isDuplicate) {
              return { output: `⚠️ Duplicate finding skipped (already reported): "${title}" [fp: ${fingerprint}]` };
            }

            // ── 2. Confidence scoring ───────────────────────────────────────
            const result = this.confidence.score({
              title,
              description,
              severity: priority as 'low' | 'medium' | 'high' | 'critical',
              evidence: screenshot_path,
              specialist_type,
              category,
            });

            if (result.verdict === 'discard') {
              return {
                output: `🗑️ Finding discarded (low confidence ${result.score}/100): "${title}"\nReasons: ${result.reasons.join(', ')}`
              };
            }

            if (result.verdict === 'needs-review') {
              // Queue for human approval instead of creating ticket immediately
              this.db.createProposedFinding({
                session_id: this.sessionId,
                title,
                description,
                severity: priority as 'low' | 'medium' | 'high' | 'critical',
                category,
                confidence: result.score,
                confidence_reasons: result.reasons,
                evidence: screenshot_path,
                url,
                specialist_type,
              });
              return {
                output: `🔍 Finding queued for human review (confidence ${result.score}/100): "${title}"\nGo to /approvals to review.\nReasons: ${result.reasons.join(', ')}`
              };
            }

            // ── 3. Auto-approve: create kanban ticket ───────────────────────
            const tagsArray: string[] = Array.isArray(tags) ? tags : (tags ? [tags] : []);
            const allTags = ['automated-qa', ...tagsArray];

            const ticket = await this.db.createKanbanTicket({
              title,
              description,
              priority,
              column,
              tags: JSON.stringify(allTags),
              screenshot_url: screenshot_path
            });

            // Also persist to bugs table for high/critical findings so Issues page is populated
            if (priority === 'high' || priority === 'critical') {
              try {
                await this.db.createBug({
                  session_id: this.sessionId,
                  title,
                  description,
                  severity: priority as 'high' | 'critical',
                  status: 'open',
                  screenshot_path,
                });
              } catch (_) { /* non-fatal — kanban ticket already created */ }
            }

            await this.db.createAction({
              session_id: this.sessionId,
              type: 'kanban_ticket',
              description: `Created Kanban ticket: ${title}`,
              input: JSON.stringify({ title, priority, column }),
              output: ticket.id
            });

            return {
              output: `✅ Kanban ticket created (confidence ${result.score}/100, auto-approved)!\nID: ${ticket.id}\nColumn: ${column}\nPriority: ${priority}`
            };
          } catch (error: unknown) {
            return {
              output: `❌ Failed to create Kanban ticket: ${error instanceof Error ? error.message : String(error)}`,
              error: error instanceof Error ? error.message : String(error)
            };
          }
        }
      },
      {
        name: 'update_kanban_ticket',
        description: 'Update an existing Kanban ticket (move columns, change priority, etc.)',
        parameters: [
          { name: 'ticket_id', type: 'string' as const, description: 'ID of the ticket to update', required: true },
          { name: 'column', type: 'string' as const, description: 'New column (backlog, to-do, in-progress, done)', required: false },
          { name: 'priority', type: 'string' as const, description: 'New priority (low, medium, high, critical)', required: false }
        ],
        execute: async ({ ticket_id, column, priority }: { ticket_id: string; column?: KanbanTicket['column']; priority?: KanbanTicket['priority'] }) => {
          try {
            const updates: Partial<KanbanTicket> = {};
            if (column) updates.column = column;
            if (priority) updates.priority = priority;

            await this.db.updateKanbanTicket(ticket_id, updates);

            return { output: `✅ Kanban ticket ${ticket_id} updated successfully!` };
          } catch (error: unknown) {
            return { output: `❌ Failed to update Kanban ticket: ${error instanceof Error ? error.message : String(error)}`, error: error instanceof Error ? error.message : String(error) };
          }
        }
      },
      {
        name: 'get_kanban_board',
        description: 'Get all tickets from the Kanban board to see current status',
        parameters: [],
        execute: async () => {
          try {
            const tickets = await this.db.getKanbanTickets();

            const byColumn = {
              backlog: tickets.filter((t) => t.column === 'backlog'),
              'to-do': tickets.filter((t) => t.column === 'to-do'),
              'in-progress': tickets.filter((t) => t.column === 'in-progress'),
              done: tickets.filter((t) => t.column === 'done')
            };

            const summary = `
📊 Kanban Board Status:
- Backlog: ${byColumn.backlog.length} tickets
- To Do: ${byColumn['to-do'].length} tickets
- In Progress: ${byColumn['in-progress'].length} tickets
- Done: ${byColumn.done.length} tickets

Total: ${tickets.length} tickets
            `.trim();

            return { output: summary };
          } catch (error: unknown) {
            return { output: `❌ Failed to get Kanban board: ${error instanceof Error ? error.message : String(error)}`, error: error instanceof Error ? error.message : String(error) };
          }
        }
      }
    ];
  }
}

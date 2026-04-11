import { OpenQADatabase, KanbanTicket } from '../../database/index.js';

export class KanbanTools {
  private db: OpenQADatabase;
  private sessionId: string;

  constructor(db: OpenQADatabase, sessionId: string) {
    this.db = db;
    this.sessionId = sessionId;
  }

  getTools() {
    return [
      {
        name: 'create_kanban_ticket',
        description: 'Create a ticket on the internal Kanban board for QA tracking. Use this for bugs, improvements, or test findings.',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Ticket title' },
            description: { type: 'string', description: 'Detailed description' },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Ticket priority' },
            column: { type: 'string', enum: ['backlog', 'to-do', 'in-progress', 'done'], description: 'Kanban column' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Tags for categorization' },
            screenshot_path: { type: 'string', description: 'Path to screenshot evidence' }
          },
          required: ['title', 'description', 'priority']
        },
        execute: async ({ title, description, priority, column = 'to-do', tags = [], screenshot_path }: { title: string; description: string; priority: KanbanTicket['priority']; column?: KanbanTicket['column']; tags?: string[]; screenshot_path?: string }) => {
          try {
            const allTags = ['automated-qa', ...tags];

            const ticket = await this.db.createKanbanTicket({
              title,
              description,
              priority,
              column,
              tags: JSON.stringify(allTags),
              screenshot_url: screenshot_path
            });

            await this.db.createAction({
              session_id: this.sessionId,
              type: 'kanban_ticket',
              description: `Created Kanban ticket: ${title}`,
              input: JSON.stringify({ title, priority, column }),
              output: ticket.id
            });

            return `✅ Kanban ticket created successfully!\nID: ${ticket.id}\nColumn: ${column}\nPriority: ${priority}`;
          } catch (error: unknown) {
            return `❌ Failed to create Kanban ticket: ${error instanceof Error ? error.message : String(error)}`;
          }
        }
      },
      {
        name: 'update_kanban_ticket',
        description: 'Update an existing Kanban ticket (move columns, change priority, etc.)',
        parameters: {
          type: 'object',
          properties: {
            ticket_id: { type: 'string', description: 'ID of the ticket to update' },
            column: { type: 'string', enum: ['backlog', 'to-do', 'in-progress', 'done'], description: 'New column' },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'New priority' }
          },
          required: ['ticket_id']
        },
        execute: async ({ ticket_id, column, priority }: { ticket_id: string; column?: KanbanTicket['column']; priority?: KanbanTicket['priority'] }) => {
          try {
            const updates: Partial<KanbanTicket> = {};
            if (column) updates.column = column;
            if (priority) updates.priority = priority;

            await this.db.updateKanbanTicket(ticket_id, updates);

            return `✅ Kanban ticket ${ticket_id} updated successfully!`;
          } catch (error: unknown) {
            return `❌ Failed to update Kanban ticket: ${error instanceof Error ? error.message : String(error)}`;
          }
        }
      },
      {
        name: 'get_kanban_board',
        description: 'Get all tickets from the Kanban board to see current status',
        parameters: {
          type: 'object',
          properties: {}
        },
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

            return summary;
          } catch (error: unknown) {
            return `❌ Failed to get Kanban board: ${error instanceof Error ? error.message : String(error)}`;
          }
        }
      }
    ];
  }
}

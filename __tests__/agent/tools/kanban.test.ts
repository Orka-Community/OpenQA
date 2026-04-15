import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { KanbanTools } from '../../../agent/tools/kanban.js';
import { OpenQADatabase } from '../../../database/index.js';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('KanbanTools', () => {
  let db: OpenQADatabase;
  let tools: KanbanTools;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = join(tmpdir(), `openqa-kanban-test-${Date.now()}.json`);
    db = new OpenQADatabase(dbPath);
    // SQLite FK constraint: session must exist before actions/tickets are inserted
    await db.createSession('test_session_1');
    tools = new KanbanTools(db, 'test_session_1');
  });

  afterEach(() => {
    for (const suffix of ['', '-wal', '-shm']) {
      const f = dbPath + suffix;
      if (existsSync(f)) try { unlinkSync(f); } catch {}
    }
  });

  it('should return 3 tools', () => {
    const toolDefs = tools.getTools();
    expect(toolDefs).toHaveLength(3);
    expect(toolDefs.map(t => t.name)).toEqual([
      'create_kanban_ticket',
      'update_kanban_ticket',
      'get_kanban_board',
    ]);
  });

  it('should create a ticket via tool', async () => {
    const toolDefs = tools.getTools();
    const createTool = toolDefs.find(t => t.name === 'create_kanban_ticket')!;

    const result = await createTool.execute({
      title: 'Test Bug',
      description: 'Found a bug',
      priority: 'high',
      column: 'to-do',
      tags: ['ui'],
    } as never);

    expect((result as { output: string }).output).toContain('Kanban ticket created successfully');
    expect((result as { output: string }).output).toContain('Column: to-do');

    const tickets = await db.getKanbanTickets();
    expect(tickets).toHaveLength(1);
    expect(tickets[0].title).toBe('Test Bug');
  });

  it('should update a ticket via tool', async () => {
    const ticket = await db.createKanbanTicket({
      title: 'Move me',
      description: '',
      priority: 'low',
      column: 'backlog',
    });

    const toolDefs = tools.getTools();
    const updateTool = toolDefs.find(t => t.name === 'update_kanban_ticket')!;

    const result = await updateTool.execute({
      ticket_id: ticket.id,
      column: 'in-progress',
    } as never);

    expect((result as { output: string }).output).toContain('updated successfully');

    const updated = (await db.getKanbanTickets()).find(t => t.id === ticket.id);
    expect(updated!.column).toBe('in-progress');
  });

  it('should get kanban board summary via tool', async () => {
    await db.createKanbanTicket({ title: 'A', description: '', priority: 'low', column: 'backlog' });
    await db.createKanbanTicket({ title: 'B', description: '', priority: 'low', column: 'to-do' });
    await db.createKanbanTicket({ title: 'C', description: '', priority: 'low', column: 'to-do' });

    const toolDefs = tools.getTools();
    const boardTool = toolDefs.find(t => t.name === 'get_kanban_board')!;

    const result = await boardTool.execute({} as never);

    expect((result as { output: string }).output).toContain('Backlog: 1 tickets');
    expect((result as { output: string }).output).toContain('To Do: 2 tickets');
    expect((result as { output: string }).output).toContain('Total: 3 tickets');
  });
});

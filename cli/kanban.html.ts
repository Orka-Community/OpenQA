// Kanban HTML template - Professional design with dark/light theme
export function getKanbanHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenQA — Task Board</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    /* Light Theme (default) */
    :root, [data-theme="light"] {
      --bg: #f5f6f8; --bg-2: #eef0f2; --white: #fff; --border: #e1e4e8;
      --text: #1a1a2e; --text-2: #6b7280; --text-3: #9ca3af;
      --red: #ef4444; --red-bg: #fef2f2;
      --orange: #f97316; --orange-bg: #fff7ed;
      --blue: #3b82f6; --blue-bg: #eff6ff;
      --green: #22c55e; --green-bg: #f0fdf4;
      --purple: #8b5cf6; --purple-bg: #f5f3ff;
      --yellow: #eab308;
      --shadow: 0 1px 3px rgba(0,0,0,0.1);
      --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1);
      --modal-bg: rgba(0,0,0,0.5);
    }
    
    /* Dark Theme */
    [data-theme="dark"] {
      --bg: #0f172a; --bg-2: #1e293b; --white: #1e293b; --border: #334155;
      --text: #f1f5f9; --text-2: #94a3b8; --text-3: #64748b;
      --red-bg: rgba(239,68,68,0.15);
      --orange-bg: rgba(249,115,22,0.15);
      --blue-bg: rgba(59,130,246,0.15);
      --green-bg: rgba(34,197,94,0.15);
      --purple-bg: rgba(139,92,246,0.15);
      --shadow: 0 1px 3px rgba(0,0,0,0.3);
      --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.4);
      --modal-bg: rgba(0,0,0,0.7);
    }
    
    body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; font-size: 14px; transition: background 0.3s, color 0.3s; }
    
    .header { background: var(--white); border-bottom: 1px solid var(--border); padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
    .header-left { display: flex; align-items: center; gap: 24px; }
    .logo { display: flex; align-items: center; gap: 10px; text-decoration: none; color: var(--text); }
    .logo-icon { width: 36px; height: 36px; background: transparent; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
    .logo-text { font-weight: 700; font-size: 20px; }
    .nav-tabs { display: flex; gap: 4px; }
    .nav-tab { padding: 8px 16px; border-radius: 8px; color: var(--text-2); text-decoration: none; font-weight: 500; transition: all 0.15s; }
    .nav-tab:hover { background: var(--bg); color: var(--text); }
    .nav-tab.active { background: var(--orange-bg); color: var(--orange); }
    .header-right { display: flex; align-items: center; gap: 12px; }
    
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: all 0.15s; }
    .btn-ghost { background: transparent; color: var(--text-2); }
    .btn-ghost:hover { background: var(--bg); color: var(--text); }
    .btn-primary { background: var(--orange); color: white; }
    .btn-primary:hover { background: #ea580c; }
    .btn-secondary { background: var(--white); color: var(--text); border: 1px solid var(--border); }
    .btn-secondary:hover { background: var(--bg); }
    .btn-danger { background: var(--red); color: white; }
    .btn-danger:hover { background: #dc2626; }
    .btn-icon { width: 36px; height: 36px; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: var(--bg-2); border: 1px solid var(--border); color: var(--text-2); cursor: pointer; font-size: 18px; }
    .btn-icon:hover { background: var(--border); color: var(--text); }
    
    .toolbar { background: var(--white); border-bottom: 1px solid var(--border); padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; }
    .toolbar-left { display: flex; align-items: center; gap: 16px; }
    .board-title { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 600; }
    .filter-group { display: flex; align-items: center; gap: 8px; }
    .filter-label { font-size: 13px; color: var(--text-3); }
    .filter-select { padding: 6px 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 13px; background: var(--white); color: var(--text); cursor: pointer; }
    .toolbar-right { display: flex; align-items: center; gap: 12px; }
    .view-toggle { display: flex; background: var(--bg); border-radius: 8px; padding: 3px; }
    .view-btn { padding: 6px 14px; border: none; background: transparent; border-radius: 6px; font-size: 12px; font-weight: 500; color: var(--text-2); cursor: pointer; transition: all 0.15s; }
    .view-btn.active { background: var(--white); color: var(--text); box-shadow: var(--shadow); }
    
    /* Board View */
    .board { display: flex; gap: 16px; padding: 24px; overflow-x: auto; min-height: calc(100vh - 130px); }
    .board.hidden { display: none; }
    
    .column { flex: 0 0 300px; display: flex; flex-direction: column; max-height: calc(100vh - 170px); }
    .column-header { padding: 12px 16px; border-radius: 12px 12px 0 0; display: flex; align-items: center; justify-content: space-between; color: white; font-weight: 600; font-size: 13px; }
    .column-header.not-started { background: var(--red); }
    .column-header.in-progress { background: var(--orange); }
    .column-header.in-review { background: var(--blue); }
    .column-header.completed { background: var(--green); }
    .column-title { display: flex; align-items: center; gap: 8px; }
    .column-count { background: rgba(255,255,255,0.25); padding: 2px 8px; border-radius: 10px; font-size: 12px; }
    .column-menu { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; cursor: pointer; opacity: 0.8; }
    .column-menu:hover { background: rgba(255,255,255,0.2); opacity: 1; }
    
    .column-body { flex: 1; background: var(--white); border-left: 1px solid var(--border); border-right: 1px solid var(--border); padding: 8px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; min-height: 200px; }
    .column-body.drag-over { background: var(--orange-bg); }
    .column-footer { background: var(--white); border: 1px solid var(--border); border-top: none; border-radius: 0 0 12px 12px; padding: 8px; }
    
    .add-task-btn { width: 100%; padding: 10px; background: transparent; border: 1px dashed var(--border); border-radius: 8px; color: var(--text-3); font-size: 13px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.15s; }
    .add-task-btn:hover { border-color: var(--orange); color: var(--orange); background: var(--orange-bg); }
    
    /* Task Card */
    .task-card { background: var(--white); border: 1px solid var(--border); border-radius: 8px; padding: 12px; cursor: grab; transition: all 0.15s; position: relative; }
    .task-card:hover { border-color: var(--orange); box-shadow: var(--shadow-md); }
    .task-card.dragging { opacity: 0.5; transform: rotate(2deg); }
    
    .task-actions { position: absolute; top: 8px; right: 8px; display: none; gap: 4px; }
    .task-card:hover .task-actions { display: flex; }
    .task-action-btn { width: 28px; height: 28px; border: none; background: var(--bg); border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; color: var(--text-2); transition: all 0.15s; }
    .task-action-btn:hover { background: var(--border); color: var(--text); }
    .task-action-btn.delete:hover { background: var(--red-bg); color: var(--red); }
    
    .task-type-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-bottom: 8px; }
    .task-type-badge.bug { background: var(--red-bg); color: var(--red); }
    .task-type-badge.task { background: var(--blue-bg); color: var(--blue); }
    .task-type-badge.feature { background: var(--green-bg); color: var(--green); }
    .task-type-badge.improvement { background: var(--purple-bg); color: var(--purple); }
    
    .task-title { font-size: 14px; font-weight: 500; margin-bottom: 8px; line-height: 1.4; padding-right: 60px; }
    .task-dates { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-3); margin-bottom: 12px; }
    .task-footer { display: flex; align-items: center; justify-content: space-between; }
    
    .priority-indicator { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text-3); }
    .priority-dot { width: 8px; height: 8px; border-radius: 50%; }
    .priority-dot.critical { background: var(--red); }
    .priority-dot.high { background: var(--orange); }
    .priority-dot.medium { background: var(--yellow); }
    .priority-dot.low { background: var(--green); }
    
    .task-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; color: white; background: var(--orange); }
    
    .empty-state { padding: 32px 16px; text-align: center; color: var(--text-3); }
    .empty-state-icon { font-size: 32px; margin-bottom: 8px; opacity: 0.5; }
    
    /* List View */
    .list-view { padding: 24px; display: none; }
    .list-view.active { display: block; }
    
    .list-table { width: 100%; background: var(--white); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
    .list-header { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 100px; gap: 16px; padding: 12px 16px; background: var(--bg); border-bottom: 1px solid var(--border); font-weight: 600; font-size: 12px; color: var(--text-2); text-transform: uppercase; }
    .list-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 100px; gap: 16px; padding: 12px 16px; border-bottom: 1px solid var(--border); align-items: center; transition: background 0.15s; }
    .list-row:last-child { border-bottom: none; }
    .list-row:hover { background: var(--bg); }
    .list-title { font-weight: 500; }
    .list-actions { display: flex; gap: 8px; justify-content: flex-end; }
    
    /* Modal */
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: var(--modal-bg); display: none; align-items: center; justify-content: center; z-index: 1000; }
    .modal-overlay.active { display: flex; }
    .modal { background: var(--white); border-radius: 12px; width: 520px; max-width: 90vw; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
    .modal-header { padding: 20px 24px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
    .modal-title { font-size: 18px; font-weight: 700; }
    .modal-close { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; color: var(--text-3); cursor: pointer; background: none; border: none; font-size: 20px; }
    .modal-close:hover { background: var(--bg); color: var(--text); }
    .modal-body { padding: 24px; }
    .form-group { margin-bottom: 20px; }
    .form-label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 8px; color: var(--text); }
    .form-input, .form-select, .form-textarea { width: 100%; padding: 10px 14px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; font-family: inherit; background: var(--white); color: var(--text); }
    .form-input:focus, .form-select:focus, .form-textarea:focus { outline: none; border-color: var(--orange); box-shadow: 0 0 0 3px rgba(249,115,22,0.1); }
    .form-textarea { resize: vertical; min-height: 100px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .modal-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; gap: 12px; background: var(--bg); border-radius: 0 0 12px 12px; }
    .modal-footer-left { display: flex; gap: 12px; }
    .modal-footer-right { display: flex; gap: 12px; }
    
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
  </style>
</head>
<body data-theme="light">

<header class="header">
  <div class="header-left">
    <a href="/" class="logo">
      <div class="logo-icon">
       <img src="https://openqa.orkajs.com/_next/image?url=https%3A%2F%2Forkajs.com%2Floutre-orka-qa.png&w=256&q=75" alt="OpenQA Logo" style="width: 40px; height: 40px;">
      </div>
    </a>
    <nav class="nav-tabs">
      <a href="/" class="nav-tab">Dashboard</a>
      <a href="/kanban" class="nav-tab active">Board</a>
      <a href="/config" class="nav-tab">Config</a>
    </nav>
  </div>
  <div class="header-right">
    <button class="btn-icon" onclick="toggleTheme()" title="Toggle theme" id="theme-btn">🌙</button>
    <button class="btn btn-ghost" onclick="location.reload()">↻ Refresh</button>
    <button class="btn btn-primary" onclick="openCreateModal()">+ Add New</button>
  </div>
</header>

<div class="toolbar">
  <div class="toolbar-left">
    <div class="board-title">📋 Task Board</div>
    <div class="filter-group">
      <span class="filter-label">Show:</span>
      <select class="filter-select" id="filter-type" onchange="applyFilters()">
        <option value="all">All</option>
        <option value="bug">Bugs</option>
        <option value="task">Tasks</option>
        <option value="feature">Features</option>
      </select>
    </div>
  </div>
  <div class="toolbar-right">
    <div class="view-toggle">
      <button class="view-btn active" id="view-board-btn" onclick="setView('board')">Board</button>
      <button class="view-btn" id="view-list-btn" onclick="setView('list')">List</button>
    </div>
  </div>
</div>

<div class="board" id="board-view">
  <div class="column">
    <div class="column-header not-started">
      <div class="column-title">Not Started <span class="column-count" id="count-backlog">0</span></div>
      <div class="column-menu">⋮</div>
    </div>
    <div class="column-body" id="col-backlog"></div>
    <div class="column-footer">
      <button class="add-task-btn" onclick="openCreateModal('backlog')">+ Add New Task</button>
    </div>
  </div>

  <div class="column">
    <div class="column-header in-progress">
      <div class="column-title">In Progress <span class="column-count" id="count-in-progress">0</span></div>
      <div class="column-menu">⋮</div>
    </div>
    <div class="column-body" id="col-in-progress"></div>
    <div class="column-footer">
      <button class="add-task-btn" onclick="openCreateModal('in-progress')">+ Add New Task</button>
    </div>
  </div>

  <div class="column">
    <div class="column-header in-review">
      <div class="column-title">In Review <span class="column-count" id="count-to-do">0</span></div>
      <div class="column-menu">⋮</div>
    </div>
    <div class="column-body" id="col-to-do"></div>
    <div class="column-footer">
      <button class="add-task-btn" onclick="openCreateModal('to-do')">+ Add New Task</button>
    </div>
  </div>

  <div class="column">
    <div class="column-header completed">
      <div class="column-title">Completed <span class="column-count" id="count-done">0</span></div>
      <div class="column-menu">⋮</div>
    </div>
    <div class="column-body" id="col-done"></div>
  </div>
</div>

<div class="list-view" id="list-view">
  <div class="list-table">
    <div class="list-header">
      <div>Title</div>
      <div>Type</div>
      <div>Status</div>
      <div>Priority</div>
      <div>Actions</div>
    </div>
    <div id="list-body"></div>
  </div>
</div>

<!-- Create/Edit Modal -->
<div class="modal-overlay" id="task-modal">
  <div class="modal">
    <div class="modal-header">
      <h2 class="modal-title" id="modal-title">Create New Task</h2>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <input type="hidden" id="ticket-id" value="">
      <div class="form-group">
        <label class="form-label">Task Title *</label>
        <input type="text" class="form-input" id="ticket-title" placeholder="Enter task title">
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-textarea" id="ticket-description" placeholder="Describe the task..."></textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Type</label>
          <select class="form-select" id="ticket-type">
            <option value="bug">🐛 Bug</option>
            <option value="task">📌 Task</option>
            <option value="feature">✨ Feature</option>
            <option value="improvement">🔧 Improvement</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Priority</label>
          <select class="form-select" id="ticket-priority">
            <option value="low">Low</option>
            <option value="medium" selected>Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-select" id="ticket-column">
          <option value="backlog">Not Started</option>
          <option value="in-progress">In Progress</option>
          <option value="to-do">In Review</option>
          <option value="done">Completed</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <div class="modal-footer-left">
        <button class="btn btn-danger" id="delete-btn" onclick="deleteTicket()" style="display:none">Delete</button>
      </div>
      <div class="modal-footer-right">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" id="save-btn" onclick="saveTicket()">Create Task</button>
      </div>
    </div>
  </div>
</div>

<script>
let tickets = [];
let currentFilter = 'all';
let currentView = 'board';
let editingId = null;

// Theme
function toggleTheme() {
  const body = document.body;
  const btn = document.getElementById('theme-btn');
  if (body.dataset.theme === 'dark') {
    body.dataset.theme = 'light';
    btn.textContent = '🌙';
    localStorage.setItem('theme', 'light');
  } else {
    body.dataset.theme = 'dark';
    btn.textContent = '☀️';
    localStorage.setItem('theme', 'dark');
  }
}

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'light';
document.body.dataset.theme = savedTheme;
document.getElementById('theme-btn').textContent = savedTheme === 'dark' ? '☀️' : '🌙';

// View toggle
function setView(view) {
  currentView = view;
  document.getElementById('view-board-btn').classList.toggle('active', view === 'board');
  document.getElementById('view-list-btn').classList.toggle('active', view === 'list');
  document.getElementById('board-view').classList.toggle('hidden', view !== 'board');
  document.getElementById('list-view').classList.toggle('active', view === 'list');
  renderBoard();
}

async function loadTickets() {
  try {
    const res = await fetch('/api/kanban', { credentials: 'include' });
    tickets = await res.json();
    renderBoard();
  } catch (e) { console.error(e); }
}

function getTypeIcon(type) {
  return { bug: '🐛', task: '📌', feature: '✨', improvement: '🔧' }[type] || '🐛';
}

function getStatusLabel(col) {
  return { backlog: 'Not Started', 'in-progress': 'In Progress', 'to-do': 'In Review', done: 'Completed' }[col] || col;
}

function renderBoard() {
  if (currentView === 'board') {
    renderBoardView();
  } else {
    renderListView();
  }
}

function renderBoardView() {
  const cols = ['backlog', 'in-progress', 'to-do', 'done'];
  cols.forEach(col => {
    const container = document.getElementById('col-' + col);
    let items = tickets.filter(t => t.column === col);
    if (currentFilter !== 'all') items = items.filter(t => (t.type || 'bug') === currentFilter);
    
    document.getElementById('count-' + col).textContent = items.length;
    
    if (!items.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div>No tasks</div></div>';
    } else {
      container.innerHTML = items.map(t => \`
        <div class="task-card" draggable="true" data-id="\${t.id}" ondragstart="dragStart(event)" ondragend="dragEnd(event)">
          <div class="task-actions">
            <button class="task-action-btn" onclick="event.stopPropagation(); openEditModal('\${t.id}')" title="Edit">✏️</button>
            <button class="task-action-btn delete" onclick="event.stopPropagation(); confirmDelete('\${t.id}')" title="Delete">🗑️</button>
          </div>
          <div class="task-type-badge \${t.type || 'bug'}">\${getTypeIcon(t.type)} \${(t.type || 'bug').charAt(0).toUpperCase() + (t.type || 'bug').slice(1)}</div>
          <div class="task-title">\${t.title}</div>
          <div class="task-dates">📅 \${new Date(t.created_at).toLocaleDateString()}</div>
          <div class="task-footer">
            <div class="priority-indicator">
              <span class="priority-dot \${t.priority}"></span>
              \${t.priority}
            </div>
            <div class="task-avatar">QA</div>
          </div>
        </div>
      \`).join('');
    }
  });
}

function renderListView() {
  let items = [...tickets];
  if (currentFilter !== 'all') items = items.filter(t => (t.type || 'bug') === currentFilter);
  
  const listBody = document.getElementById('list-body');
  if (!items.length) {
    listBody.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div>No tasks</div></div>';
  } else {
    listBody.innerHTML = items.map(t => \`
      <div class="list-row">
        <div class="list-title">\${t.title}</div>
        <div><span class="task-type-badge \${t.type || 'bug'}">\${getTypeIcon(t.type)} \${(t.type || 'bug').charAt(0).toUpperCase() + (t.type || 'bug').slice(1)}</span></div>
        <div>\${getStatusLabel(t.column)}</div>
        <div class="priority-indicator"><span class="priority-dot \${t.priority}"></span> \${t.priority}</div>
        <div class="list-actions">
          <button class="task-action-btn" onclick="openEditModal('\${t.id}')" title="Edit">✏️</button>
          <button class="task-action-btn delete" onclick="confirmDelete('\${t.id}')" title="Delete">🗑️</button>
        </div>
      </div>
    \`).join('');
  }
}

function applyFilters() {
  currentFilter = document.getElementById('filter-type').value;
  renderBoard();
}

// Drag & Drop
function dragStart(e) {
  e.target.classList.add('dragging');
  e.dataTransfer.setData('text/plain', e.target.dataset.id);
}

function dragEnd(e) {
  e.target.classList.remove('dragging');
  document.querySelectorAll('.column-body').forEach(c => c.classList.remove('drag-over'));
}

document.querySelectorAll('.column-body').forEach(col => {
  col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('drag-over'); });
  col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
  col.addEventListener('drop', async e => {
    e.preventDefault();
    col.classList.remove('drag-over');
    const id = e.dataTransfer.getData('text/plain');
    const newCol = col.id.replace('col-', '');
    await fetch('/api/kanban/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ column: newCol })
    });
    const t = tickets.find(x => x.id === id);
    if (t) t.column = newCol;
    renderBoard();
  });
});

// Modal
function openCreateModal(col = 'backlog') {
  editingId = null;
  document.getElementById('modal-title').textContent = 'Create New Task';
  document.getElementById('save-btn').textContent = 'Create Task';
  document.getElementById('delete-btn').style.display = 'none';
  document.getElementById('ticket-id').value = '';
  document.getElementById('ticket-title').value = '';
  document.getElementById('ticket-description').value = '';
  document.getElementById('ticket-type').value = 'bug';
  document.getElementById('ticket-priority').value = 'medium';
  document.getElementById('ticket-column').value = col;
  document.getElementById('task-modal').classList.add('active');
  document.getElementById('ticket-title').focus();
}

function openEditModal(id) {
  const ticket = tickets.find(t => t.id === id);
  if (!ticket) return;
  
  editingId = id;
  document.getElementById('modal-title').textContent = 'Edit Task';
  document.getElementById('save-btn').textContent = 'Save Changes';
  document.getElementById('delete-btn').style.display = 'block';
  document.getElementById('ticket-id').value = id;
  document.getElementById('ticket-title').value = ticket.title;
  document.getElementById('ticket-description').value = ticket.description || '';
  document.getElementById('ticket-type').value = ticket.type || 'bug';
  document.getElementById('ticket-priority').value = ticket.priority || 'medium';
  document.getElementById('ticket-column').value = ticket.column;
  document.getElementById('task-modal').classList.add('active');
}

function closeModal() {
  document.getElementById('task-modal').classList.remove('active');
  editingId = null;
}

async function saveTicket() {
  const title = document.getElementById('ticket-title').value.trim();
  if (!title) return alert('Please enter a title');
  
  const data = {
    title,
    description: document.getElementById('ticket-description').value,
    type: document.getElementById('ticket-type').value,
    priority: document.getElementById('ticket-priority').value,
    column: document.getElementById('ticket-column').value
  };
  
  if (editingId) {
    await fetch('/api/kanban/' + editingId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
  } else {
    await fetch('/api/kanban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
  }
  
  closeModal();
  loadTickets();
}

function confirmDelete(id) {
  if (confirm('Are you sure you want to delete this task?')) {
    deleteTicketById(id);
  }
}

async function deleteTicket() {
  if (!editingId) return;
  if (confirm('Are you sure you want to delete this task?')) {
    await deleteTicketById(editingId);
    closeModal();
  }
}

async function deleteTicketById(id) {
  await fetch('/api/kanban/' + id, { method: 'DELETE', credentials: 'include' });
  loadTickets();
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
loadTickets();
</script>

</body>
</html>`;
}

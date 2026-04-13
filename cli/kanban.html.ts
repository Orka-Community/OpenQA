import { getFontsLink } from './components/styles.js';

export function getKanbanHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenQA — Kanban</title>
  ${getFontsLink()}
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #080b10;
      --surface: #0d1117;
      --panel: #111720;
      --border: rgba(255,255,255,0.06);
      --border-hi: rgba(255,255,255,0.12);
      --accent: #f97316;
      --accent-lo: rgba(249,115,22,0.08);
      --accent-md: rgba(249,115,22,0.18);
      --green: #22c55e;
      --green-lo: rgba(34,197,94,0.08);
      --red: #ef4444;
      --red-lo: rgba(239,68,68,0.08);
      --amber: #f59e0b;
      --amber-lo: rgba(245,158,11,0.08);
      --blue: #38bdf8;
      --blue-lo: rgba(56,189,248,0.08);
      --purple: #a78bfa;
      --purple-lo: rgba(167,139,250,0.08);
      --yellow: #eab308;
      --text-1: #f1f5f9;
      --text-2: #8b98a8;
      --text-3: #4b5563;
      --mono: 'DM Mono', monospace;
      --sans: 'Syne', sans-serif;
      --radius: 10px;
    }

    html, body {
      height: 100%;
      background: var(--bg);
      font-family: var(--sans);
      color: var(--text-1);
      font-size: 14px;
    }

    /* ── Header ── */
    .header {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 0 24px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .header-left { display: flex; align-items: center; gap: 24px; }
    .logo { display: flex; align-items: center; gap: 10px; text-decoration: none; color: var(--text-1); }
    .logo-mark { width: 34px; height: 34px; display: grid; place-items: center; }
    .logo-name { font-weight: 800; font-size: 17px; letter-spacing: -0.4px; }

    .nav-tabs { display: flex; gap: 2px; }
    .nav-tab {
      padding: 7px 14px;
      border-radius: 8px;
      color: var(--text-2);
      text-decoration: none;
      font-weight: 600;
      font-size: 13px;
      transition: all 0.15s;
    }
    .nav-tab:hover { color: var(--text-1); background: var(--panel); }
    .nav-tab.active { background: var(--accent-lo); color: var(--accent); }

    .header-right { display: flex; align-items: center; gap: 10px; }

    /* ── Buttons ── */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s;
      font-family: var(--sans);
    }
    .btn-ghost {
      background: var(--panel);
      color: var(--text-2);
      border: 1px solid var(--border-hi);
    }
    .btn-ghost:hover { color: var(--text-1); background: var(--border-hi); }
    .btn-primary { background: var(--accent); color: white; }
    .btn-primary:hover { filter: brightness(1.1); }
    .btn-danger { background: var(--red); color: white; }
    .btn-danger:hover { filter: brightness(1.1); }

    /* ── Toolbar ── */
    .toolbar {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 10px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .toolbar-left { display: flex; align-items: center; gap: 16px; }
    .board-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      font-weight: 700;
      color: var(--text-1);
    }
    .board-title svg { color: var(--accent); }

    .filter-group { display: flex; align-items: center; gap: 8px; }
    .filter-label { font-size: 12px; color: var(--text-3); font-family: var(--mono); }
    .filter-select {
      padding: 6px 12px;
      border: 1px solid var(--border-hi);
      border-radius: 8px;
      font-size: 12px;
      background: var(--panel);
      color: var(--text-1);
      cursor: pointer;
      font-family: var(--sans);
    }
    .filter-select:focus { outline: none; border-color: var(--accent); }

    .toolbar-right { display: flex; align-items: center; gap: 12px; }
    .view-toggle { display: flex; background: var(--panel); border-radius: 8px; padding: 3px; border: 1px solid var(--border); }
    .view-btn {
      padding: 5px 14px;
      border: none;
      background: transparent;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-2);
      cursor: pointer;
      transition: all 0.15s;
      font-family: var(--sans);
    }
    .view-btn.active { background: var(--accent); color: white; }

    /* ── Board ── */
    .board {
      display: flex;
      gap: 16px;
      padding: 20px 24px;
      overflow-x: auto;
      min-height: calc(100vh - 110px);
      align-items: flex-start;
    }
    .board.hidden { display: none; }

    .column { flex: 0 0 290px; display: flex; flex-direction: column; max-height: calc(100vh - 150px); }
    .column-header {
      padding: 11px 14px;
      border-radius: 10px 10px 0 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-weight: 700;
      font-size: 12px;
      letter-spacing: 0.02em;
      color: white;
    }
    .column-header.not-started { background: var(--red); }
    .column-header.in-progress { background: var(--accent); }
    .column-header.in-review { background: var(--blue); color: #0d1117; }
    .column-header.completed { background: var(--green); color: #0d1117; }

    .column-title { display: flex; align-items: center; gap: 8px; }
    .column-count { background: rgba(255,255,255,0.25); padding: 2px 7px; border-radius: 10px; font-size: 11px; }
    .column-menu {
      width: 22px; height: 22px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 4px; cursor: pointer; opacity: 0.8;
    }
    .column-menu:hover { background: rgba(255,255,255,0.2); opacity: 1; }

    .column-body {
      flex: 1;
      background: var(--panel);
      border-left: 1px solid var(--border);
      border-right: 1px solid var(--border);
      padding: 8px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-height: 200px;
    }
    .column-body.drag-over { background: var(--accent-lo); outline: 1px dashed var(--accent); }

    .column-footer {
      background: var(--panel);
      border: 1px solid var(--border);
      border-top: none;
      border-radius: 0 0 10px 10px;
      padding: 8px;
    }
    .add-task-btn {
      width: 100%;
      padding: 9px;
      background: transparent;
      border: 1px dashed var(--border-hi);
      border-radius: 8px;
      color: var(--text-3);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.15s;
      font-family: var(--sans);
    }
    .add-task-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-lo); }

    /* ── Task Card ── */
    .task-card {
      background: var(--surface);
      border: 1px solid var(--border-hi);
      border-radius: 8px;
      padding: 12px;
      cursor: grab;
      transition: all 0.15s;
      position: relative;
    }
    .task-card:hover { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent-md); }
    .task-card.dragging { opacity: 0.45; transform: rotate(1.5deg); }

    .task-actions { position: absolute; top: 8px; right: 8px; display: none; gap: 4px; }
    .task-card:hover .task-actions { display: flex; }
    .task-action-btn {
      width: 28px; height: 28px;
      border: none;
      background: var(--panel);
      border-radius: 6px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: var(--text-2);
      transition: all 0.15s;
    }
    .task-action-btn svg { width: 14px; height: 14px; }
    .task-action-btn:hover { background: var(--border-hi); color: var(--text-1); }
    .task-action-btn.delete:hover { background: var(--red-lo); color: var(--red); }

    .task-type-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 5px;
      font-size: 11px;
      font-weight: 700;
      margin-bottom: 8px;
      font-family: var(--mono);
    }
    .task-type-badge svg { width: 11px; height: 11px; flex-shrink: 0; }
    .task-type-badge.bug { background: var(--red-lo); color: var(--red); }
    .task-type-badge.task { background: var(--blue-lo); color: var(--blue); }
    .task-type-badge.feature { background: var(--amber-lo); color: var(--amber); }
    .task-type-badge.improvement { background: var(--purple-lo); color: var(--purple); }

    .task-title { font-size: 13px; font-weight: 600; margin-bottom: 8px; line-height: 1.45; padding-right: 56px; color: var(--text-1); }
    .task-dates {
      display: flex; align-items: center; gap: 5px;
      font-size: 11px; color: var(--text-3); margin-bottom: 10px;
      font-family: var(--mono);
    }
    .task-dates svg { width: 11px; height: 11px; }

    .task-footer { display: flex; align-items: center; justify-content: space-between; }
    .priority-indicator { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-3); font-family: var(--mono); }
    .priority-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .priority-dot.critical { background: var(--red); box-shadow: 0 0 6px var(--red); }
    .priority-dot.high { background: var(--accent); box-shadow: 0 0 6px var(--accent); }
    .priority-dot.medium { background: var(--yellow); }
    .priority-dot.low { background: var(--green); }

    .task-avatar {
      width: 26px; height: 26px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 700;
      color: white;
      background: var(--accent);
      font-family: var(--mono);
    }

    /* ── Empty State ── */
    .empty-state {
      padding: 32px 16px;
      text-align: center;
      color: var(--text-3);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .empty-state svg { width: 32px; height: 32px; opacity: 0.35; }

    /* ── List View ── */
    .list-view { padding: 20px 24px; display: none; }
    .list-view.active { display: block; }

    .list-table {
      width: 100%;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
    }
    .list-header {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr 100px;
      gap: 16px;
      padding: 12px 16px;
      background: var(--panel);
      border-bottom: 1px solid var(--border);
      font-weight: 700;
      font-size: 11px;
      color: var(--text-3);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-family: var(--mono);
    }
    .list-row {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr 100px;
      gap: 16px;
      padding: 13px 16px;
      border-bottom: 1px solid var(--border);
      align-items: center;
      transition: background 0.15s;
      font-size: 13px;
    }
    .list-row:last-child { border-bottom: none; }
    .list-row:hover { background: var(--panel); }
    .list-title { font-weight: 600; color: var(--text-1); }
    .list-actions { display: flex; gap: 6px; justify-content: flex-end; }

    /* ── Modal ── */
    .modal-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.7);
      display: none;
      align-items: center; justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(2px);
    }
    .modal-overlay.active { display: flex; }
    .modal {
      background: var(--surface);
      border: 1px solid var(--border-hi);
      border-radius: 14px;
      width: 520px;
      max-width: 90vw;
      box-shadow: 0 24px 60px rgba(0,0,0,0.5);
    }
    .modal-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
    }
    .modal-title { font-size: 17px; font-weight: 700; }
    .modal-close {
      width: 30px; height: 30px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 8px;
      color: var(--text-3);
      cursor: pointer;
      background: none;
      border: none;
      font-size: 18px;
      transition: all 0.15s;
    }
    .modal-close:hover { background: var(--panel); color: var(--text-1); }
    .modal-body { padding: 24px; }
    .form-group { margin-bottom: 18px; }
    .form-label { display: block; font-size: 12px; font-weight: 700; margin-bottom: 7px; color: var(--text-2); text-transform: uppercase; letter-spacing: 0.04em; font-family: var(--mono); }
    .form-input, .form-select, .form-textarea {
      width: 100%;
      padding: 10px 13px;
      border: 1px solid var(--border-hi);
      border-radius: 8px;
      font-size: 13px;
      font-family: var(--sans);
      background: var(--panel);
      color: var(--text-1);
      transition: border-color 0.15s;
    }
    .form-input:focus, .form-select:focus, .form-textarea:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-lo);
    }
    .form-textarea { resize: vertical; min-height: 90px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid var(--border);
      display: flex; justify-content: space-between; gap: 12px;
      background: var(--panel);
      border-radius: 0 0 14px 14px;
    }
    .modal-footer-left { display: flex; gap: 10px; }
    .modal-footer-right { display: flex; gap: 10px; }

    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border-hi); border-radius: 3px; }
  </style>
</head>
<body>

<header class="header">
  <div class="header-left">
    <a href="/" class="logo">
      <div class="logo-mark">
        <img src="https://openqa.orkajs.com/_next/image?url=https%3A%2F%2Forkajs.com%2Floutre-orka-qa.png&w=256&q=75" alt="OpenQA" style="width:34px;height:34px;">
      </div>
      <span class="logo-name">OpenQA</span>
    </a>
    <nav class="nav-tabs">
      <a href="/" class="nav-tab">Dashboard</a>
      <a href="/kanban" class="nav-tab active">Kanban</a>
      <a href="/sessions" class="nav-tab">Sessions</a>
      <a href="/config" class="nav-tab">Config</a>
    </nav>
  </div>
  <div class="header-right">
    <button class="btn btn-ghost" onclick="location.reload()">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
      Refresh
    </button>
    <button class="btn btn-primary" onclick="openCreateModal()">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
      New Task
    </button>
  </div>
</header>

<div class="toolbar">
  <div class="toolbar-left">
    <div class="board-title">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7v7"/><path d="M12 7v4"/><path d="M16 7v9"/><path d="M5 3a2 2 0 0 0-2 2"/><path d="M9 3h1"/><path d="M14 3h1"/><path d="M19 3a2 2 0 0 1 2 2"/><path d="M21 9v1"/><path d="M21 14v1"/><path d="M21 19a2 2 0 0 1-2 2"/><path d="M14 21h1"/><path d="M9 21h1"/><path d="M5 21a2 2 0 0 1-2-2"/><path d="M3 14v1"/><path d="M3 9v1"/></svg>
      Task Board
    </div>
    <div class="filter-group">
      <span class="filter-label">Show:</span>
      <select class="filter-select" id="filter-type" onchange="applyFilters()">
        <option value="all">All types</option>
        <option value="bug">Bugs</option>
        <option value="task">Tasks</option>
        <option value="feature">Features</option>
        <option value="improvement">Improvements</option>
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
      <div class="column-menu">⋯</div>
    </div>
    <div class="column-body" id="col-backlog"></div>
    <div class="column-footer">
      <button class="add-task-btn" onclick="openCreateModal('backlog')">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        Add Task
      </button>
    </div>
  </div>

  <div class="column">
    <div class="column-header in-progress">
      <div class="column-title">In Progress <span class="column-count" id="count-in-progress">0</span></div>
      <div class="column-menu">⋯</div>
    </div>
    <div class="column-body" id="col-in-progress"></div>
    <div class="column-footer">
      <button class="add-task-btn" onclick="openCreateModal('in-progress')">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        Add Task
      </button>
    </div>
  </div>

  <div class="column">
    <div class="column-header in-review">
      <div class="column-title">In Review <span class="column-count" id="count-to-do">0</span></div>
      <div class="column-menu">⋯</div>
    </div>
    <div class="column-body" id="col-to-do"></div>
    <div class="column-footer">
      <button class="add-task-btn" onclick="openCreateModal('to-do')">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        Add Task
      </button>
    </div>
  </div>

  <div class="column">
    <div class="column-header completed">
      <div class="column-title">Completed <span class="column-count" id="count-done">0</span></div>
      <div class="column-menu">⋯</div>
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
      <button class="modal-close" onclick="closeModal()">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    </div>
    <div class="modal-body">
      <input type="hidden" id="ticket-id" value="">
      <div class="form-group">
        <label class="form-label">Title</label>
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
            <option value="bug">Bug</option>
            <option value="task">Task</option>
            <option value="feature">Feature</option>
            <option value="improvement">Improvement</option>
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
        <label class="form-label">Column</label>
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
        <button class="btn btn-danger" id="delete-btn" onclick="deleteTicket()" style="display:none">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          Delete
        </button>
      </div>
      <div class="modal-footer-right">
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
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

// Prevent "undefined" strings from rendering
function safe(val) {
  return (!val || val === 'undefined' || val === 'null') ? '' : val;
}

// SVG icons for type badges (inline, no emoji)
const TYPE_ICONS = {
  bug: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3 3 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 4-4"/><path d="M17.47 9c1.93-.2 3.53-1.9 3.53-4"/><path d="M18 13h4"/><path d="M20.53 21c0-2.1-1.7-3.9-4-4"/></svg>',
  task: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  feature: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  improvement: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
};

const EDIT_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
const DELETE_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>';
const CALENDAR_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>';
const EMPTY_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7v7"/><path d="M12 7v4"/><path d="M16 7v9"/><path d="M5 3a2 2 0 0 0-2 2"/><path d="M9 3h1"/><path d="M14 3h1"/><path d="M19 3a2 2 0 0 1 2 2"/><path d="M21 9v1"/><path d="M21 14v1"/><path d="M21 19a2 2 0 0 1-2 2"/><path d="M14 21h1"/><path d="M9 21h1"/><path d="M5 21a2 2 0 0 1-2-2"/><path d="M3 14v1"/><path d="M3 9v1"/></svg>';

function getTypeIcon(type) {
  return TYPE_ICONS[type] || TYPE_ICONS.bug;
}

function getTypeLabel(type) {
  return { bug: 'Bug', task: 'Task', feature: 'Feature', improvement: 'Improvement' }[type] || 'Bug';
}

function getStatusLabel(col) {
  return { backlog: 'Not Started', 'in-progress': 'In Progress', 'to-do': 'In Review', done: 'Completed' }[col] || col;
}

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

function renderBoard() {
  currentView === 'board' ? renderBoardView() : renderListView();
}

function renderBoardView() {
  const cols = ['backlog', 'in-progress', 'to-do', 'done'];
  cols.forEach(col => {
    const container = document.getElementById('col-' + col);
    let items = tickets.filter(t => t.column === col);
    if (currentFilter !== 'all') items = items.filter(t => (t.type || 'bug') === currentFilter);

    document.getElementById('count-' + col).textContent = items.length;

    if (!items.length) {
      container.innerHTML = \`<div class="empty-state">\${EMPTY_ICON}<span>No tasks</span></div>\`;
      return;
    }

    container.innerHTML = items.map(t => {
      const type = t.type || 'bug';
      const title = safe(t.title) || 'Untitled';
      const priority = safe(t.priority) || 'medium';
      const dateStr = t.created_at ? new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
      return \`
        <div class="task-card" draggable="true" data-id="\${t.id}" ondragstart="dragStart(event)" ondragend="dragEnd(event)">
          <div class="task-actions">
            <button class="task-action-btn" onclick="event.stopPropagation();openEditModal('\${t.id}')" title="Edit">\${EDIT_ICON}</button>
            <button class="task-action-btn delete" onclick="event.stopPropagation();confirmDelete('\${t.id}')" title="Delete">\${DELETE_ICON}</button>
          </div>
          <div class="task-type-badge \${type}">\${getTypeIcon(type)}\${getTypeLabel(type)}</div>
          <div class="task-title">\${title}</div>
          \${dateStr ? \`<div class="task-dates">\${CALENDAR_ICON}\${dateStr}</div>\` : ''}
          <div class="task-footer">
            <div class="priority-indicator"><span class="priority-dot \${priority}"></span>\${priority}</div>
            <div class="task-avatar">QA</div>
          </div>
        </div>
      \`;
    }).join('');
  });
}

function renderListView() {
  let items = [...tickets];
  if (currentFilter !== 'all') items = items.filter(t => (t.type || 'bug') === currentFilter);

  const listBody = document.getElementById('list-body');
  if (!items.length) {
    listBody.innerHTML = \`<div class="empty-state" style="padding:48px">\${EMPTY_ICON}<span>No tasks</span></div>\`;
    return;
  }
  listBody.innerHTML = items.map(t => {
    const type = t.type || 'bug';
    const priority = safe(t.priority) || 'medium';
    return \`
      <div class="list-row">
        <div class="list-title">\${safe(t.title) || 'Untitled'}</div>
        <div><span class="task-type-badge \${type}">\${getTypeIcon(type)}\${getTypeLabel(type)}</span></div>
        <div style="color:var(--text-2);font-size:12px">\${getStatusLabel(t.column)}</div>
        <div class="priority-indicator"><span class="priority-dot \${priority}"></span>\${priority}</div>
        <div class="list-actions">
          <button class="task-action-btn" onclick="openEditModal('\${t.id}')" title="Edit">\${EDIT_ICON}</button>
          <button class="task-action-btn delete" onclick="confirmDelete('\${t.id}')" title="Delete">\${DELETE_ICON}</button>
        </div>
      </div>
    \`;
  }).join('');
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
  document.getElementById('modal-title').textContent = 'Create Task';
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
  document.getElementById('delete-btn').style.display = 'inline-flex';
  document.getElementById('ticket-id').value = id;
  document.getElementById('ticket-title').value = safe(ticket.title);
  document.getElementById('ticket-description').value = safe(ticket.description);
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
  if (!title) { document.getElementById('ticket-title').focus(); return; }

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
  if (confirm('Delete this task?')) deleteTicketById(id);
}

async function deleteTicket() {
  if (!editingId) return;
  if (confirm('Delete this task?')) {
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

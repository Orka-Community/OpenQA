// Dashboard HTML template - Modern design matching the reference screenshot
export function getDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenQA — Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
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
      --blue: #38bdf8;
      --text-1: #f1f5f9;
      --text-2: #8b98a8;
      --text-3: #4b5563;
      --mono: 'DM Mono', monospace;
      font-weight: 300;
      --sans: 'Syne', sans-serif;
      --radius: 10px;
      --radius-lg: 16px;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--sans);
      background: var(--bg);
      color: var(--text-1);
      min-height: 100vh;
      overflow-x: hidden;
    }

    /* Layout */
    .shell {
      display: grid;
      grid-template-columns: 220px 1fr;
      min-height: 100vh;
    }

    /* Sidebar */
    aside {
      background: var(--surface);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      padding: 28px 0;
      position: sticky;
      top: 0;
      height: 100vh;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 24px 32px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 12px;
    }

    .logo-mark {
      width: 34px;
      height: 34px;
      background: transparent;
      border-radius: 8px;
      display: grid;
      place-items: center;
      font-size: 16px;
    }

    .logo-name {
      font-weight: 800;
      font-size: 18px;
      letter-spacing: -0.5px;
    }

    .logo-version {
      font-family: var(--mono);
      font-size: 10px;
      color: var(--text-3);
    }

    .nav-section { padding: 8px 12px; flex: 1; }

    .nav-label {
      font-family: var(--mono);
      font-size: 10px;
      color: var(--text-3);
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding: 0 12px;
      margin: 16px 0 6px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 12px;
      border-radius: var(--radius);
      color: var(--text-2);
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.15s ease;
      cursor: pointer;
    }

    .nav-item:hover { color: var(--text-1); background: var(--panel); }
    .nav-item.active { color: var(--accent); background: var(--accent-lo); }
    .nav-item .icon { font-size: 15px; width: 20px; text-align: center; }
    .nav-item .badge {
      margin-left: auto;
      background: var(--accent);
      color: white;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 10px;
      font-weight: 700;
    }

    .sidebar-footer {
      padding: 12px 16px;
      border-top: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .user-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      border-radius: 8px;
      background: var(--panel);
      border: 1px solid var(--border);
    }
    .user-avatar {
      width: 26px; height: 26px;
      border-radius: 50%;
      background: var(--accent-md);
      color: var(--accent);
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700;
    }
    .user-info { flex: 1; min-width: 0; }
    .user-name { font-size: 12px; font-weight: 600; color: var(--text-1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .user-role { font-size: 10px; color: var(--text-2); text-transform: uppercase; letter-spacing: 0.5px; }
    .btn-logout {
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-2);
      font-size: 11px;
      cursor: pointer;
      white-space: nowrap;
      transition: color 0.15s, background 0.15s;
    }
    .btn-logout:hover { background: var(--red-lo); color: var(--red); border-color: var(--red); }

    .btn-user-mgmt {
      display: flex; align-items: center; gap: 6px;
      padding: 5px 8px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-2);
      font-size: 11px;
      cursor: pointer;
      width: 100%;
      text-align: left;
      transition: color 0.15s, background 0.15s;
    }
    .btn-user-mgmt:hover { background: var(--panel); color: var(--text-1); }

    /* User management modal */
    .modal-backdrop {
      display: none;
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.7);
      z-index: 1000;
      align-items: center; justify-content: center;
    }
    .modal-backdrop.open { display: flex; }
    .modal {
      background: var(--surface);
      border: 1px solid var(--border-hi);
      border-radius: var(--radius-lg);
      width: 480px; max-width: 95vw;
      padding: 28px;
    }
    .modal h3 { font-size: 16px; font-weight: 700; margin-bottom: 20px; }
    .modal-field { margin-bottom: 14px; }
    .modal-field label { display: block; font-size: 11px; color: var(--text-2); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .modal-field input, .modal-field select {
      width: 100%; padding: 8px 12px;
      background: var(--panel); border: 1px solid var(--border); border-radius: 8px;
      color: var(--text-1); font-size: 13px;
    }
    .modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
    .modal-row { display: flex; gap: 10px; }
    .modal-row .modal-field { flex: 1; }

    .user-list { margin-top: 16px; }
    .user-list-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 0; border-bottom: 1px solid var(--border);
      font-size: 13px;
    }
    .user-list-item:last-child { border-bottom: none; }
    .role-badge {
      padding: 2px 7px; border-radius: 4px;
      font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
    }
    .role-badge.admin { background: var(--accent-md); color: var(--accent); }
    .role-badge.viewer { background: rgba(56,189,248,0.12); color: var(--blue); }
    .btn-del { margin-left: auto; padding: 3px 8px; border-radius: 5px; border: 1px solid var(--border); background: transparent; color: var(--text-2); font-size: 11px; cursor: pointer; }
    .btn-del:hover { background: var(--red-lo); color: var(--red); }

    .status-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: var(--mono);
      font-size: 11px;
      color: var(--text-2);
    }

    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--green);
      box-shadow: 0 0 8px var(--green);
    }
    .dot.disconnected { background: var(--red); box-shadow: 0 0 8px var(--red); }

    /* Main */
    main {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      overflow-y: auto;
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 32px;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .page-title { font-size: 15px; font-weight: 700; letter-spacing: -0.2px; }
    .page-breadcrumb { font-family: var(--mono); font-size: 11px; color: var(--text-3); margin-top: 2px; }

    .topbar-actions { display: flex; align-items: center; gap: 12px; }

    .btn-sm {
      font-family: var(--sans);
      font-weight: 700;
      font-size: 12px;
      padding: 8px 16px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-ghost {
      background: var(--panel);
      color: var(--text-2);
      border: 1px solid var(--border);
    }
    .btn-ghost:hover { border-color: var(--border-hi); color: var(--text-1); }

    .btn-primary {
      background: var(--accent);
      color: #fff;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-primary:hover { background: #ea580c; box-shadow: 0 0 20px rgba(249,115,22,0.35); }

    /* Content */
    .content {
      padding: 28px 32px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }

    .metric-card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 20px;
      position: relative;
    }

    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .metric-label {
      font-family: var(--mono);
      font-size: 11px;
      color: var(--text-3);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .metric-icon {
      width: 32px;
      height: 32px;
      background: var(--accent-lo);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }

    .metric-value {
      font-size: 36px;
      font-weight: 600;
      color: var(--text-1);
      line-height: 1;
      margin-bottom: 8px;
    }

    .metric-change {
      font-family: var(--mono);
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .metric-change.positive { color: var(--green); }
    .metric-change.negative { color: var(--red); }

    /* Main Grid */
    .main-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 24px;
    }

    /* Panel */
    .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
    }

    .panel-title {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: -0.1px;
    }

    .panel-badge {
      font-family: var(--mono);
      font-size: 10px;
      color: var(--text-3);
      background: var(--surface);
      padding: 4px 8px;
      border-radius: 6px;
    }

    .panel-body { padding: 20px; }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 4px;
      background: var(--surface);
      padding: 4px;
      border-radius: 8px;
    }

    .tab {
      padding: 6px 14px;
      background: transparent;
      border: none;
      border-radius: 6px;
      color: var(--text-3);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .tab.active { background: var(--panel); color: var(--text-1); }
    .tab:hover:not(.active) { color: var(--text-2); }

    /* Chart */
    .chart-container {
      height: 220px;
      position: relative;
    }

    /* Agent Hierarchy */
    .hierarchy-container {
      height: 300px;
      position: relative;
      background: var(--surface);
      border-radius: var(--radius);
      overflow: hidden;
    }

    .hierarchy-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      font-family: var(--mono);
      font-size: 10px;
      color: var(--green);
      background: var(--green-lo);
      padding: 4px 8px;
      border-radius: 6px;
    }

    /* Agent Node */
    .agent-node {
      position: absolute;
      z-index: 2;   /* must be above the SVG lines (z-index:1) */
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .agent-node:hover { transform: scale(1.05); box-shadow: 0 6px 20px rgba(0,0,0,0.4); }

    .agent-node.main { background: var(--accent); color: white; }
    .agent-node.browser { background: var(--green); color: white; }
    .agent-node.api { background: var(--amber); color: white; }
    .agent-node.auth { background: var(--red); color: white; }
    .agent-node.ui { background: #8b5cf6; color: white; }
    .agent-node.perf { background: #06b6d4; color: white; }
    .agent-node.security { background: #ec4899; color: white; }

    /* Bottom Grid */
    .bottom-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    /* Table */
    .table-header {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr;
      gap: 16px;
      padding: 12px 20px;
      font-family: var(--mono);
      font-size: 10px;
      color: var(--text-3);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--border);
    }

    .table-row {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr;
      gap: 16px;
      padding: 14px 20px;
      font-size: 13px;
      border-bottom: 1px solid var(--border);
      transition: background 0.15s ease;
    }
    .table-row:hover { background: var(--surface); }
    .table-row:last-child { border-bottom: none; }

    .agent-name { font-weight: 600; }

    .status-badge {
      font-family: var(--mono);
      font-size: 10px;
      padding: 4px 8px;
      border-radius: 6px;
      text-transform: uppercase;
      font-weight: 600;
    }
    .status-badge.running { background: var(--green-lo); color: var(--green); }
    .status-badge.idle { background: var(--accent-lo); color: var(--amber); }

    .empty-state {
      padding: 40px 20px;
      text-align: center;
      color: var(--text-3);
      font-size: 13px;
    }

    /* Activity */
    .activity-list { max-height: 280px; overflow-y: auto; }

    .activity-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 20px;
      border-bottom: 1px solid var(--border);
      transition: background 0.15s ease;
    }
    .activity-item:hover { background: var(--surface); }
    .activity-item:last-child { border-bottom: none; }

    .activity-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-top: 6px;
      flex-shrink: 0;
    }
    .activity-dot.info { background: var(--blue); }
    .activity-dot.success { background: var(--green); }
    .activity-dot.warning { background: var(--amber); }
    .activity-dot.error { background: var(--red); }

    .activity-content { flex: 1; }
    .activity-message { font-size: 13px; font-weight: 500; margin-bottom: 4px; }
    .activity-time { font-family: var(--mono); font-size: 11px; color: var(--text-3); }

    /* Triple Grid */
    .triple-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
    }

    /* Task List */
    .task-list, .issue-list, .intervention-list {
      max-height: 250px;
      overflow-y: auto;
    }

    .task-item, .issue-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 20px;
      border-bottom: 1px solid var(--border);
      transition: background 0.15s ease;
    }
    .task-item:hover, .issue-item:hover { background: var(--surface); }
    .task-item:last-child, .issue-item:last-child { border-bottom: none; }

    .task-icon, .issue-icon {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      flex-shrink: 0;
    }
    .task-icon { background: var(--accent-lo); }
    .issue-icon.critical { background: var(--red-lo); }
    .issue-icon.high { background: rgba(249,115,22,0.15); }
    .issue-icon.medium { background: rgba(245,158,11,0.15); }
    .issue-icon.low { background: var(--green-lo); }

    .task-content, .issue-content { flex: 1; min-width: 0; }
    .task-name, .issue-title { 
      font-size: 13px; 
      font-weight: 600; 
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .task-meta, .issue-meta { 
      font-family: var(--mono); 
      font-size: 11px; 
      color: var(--text-3);
      display: flex;
      gap: 12px;
    }

    .task-progress {
      width: 60px;
      height: 6px;
      background: var(--surface);
      border-radius: 3px;
      overflow: hidden;
    }
    .task-progress-fill {
      height: 100%;
      background: var(--accent);
      transition: width 0.3s ease;
    }

    .severity-badge {
      font-family: var(--mono);
      font-size: 9px;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      font-weight: 700;
    }
    .severity-badge.critical { background: var(--red); color: white; }
    .severity-badge.high { background: var(--accent); color: white; }
    .severity-badge.medium { background: var(--amber); color: white; }
    .severity-badge.low { background: var(--green); color: white; }

    /* Intervention */
    .intervention-item {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      background: linear-gradient(135deg, rgba(239,68,68,0.05), transparent);
    }
    .intervention-item:last-child { border-bottom: none; }

    .intervention-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .intervention-icon {
      width: 32px;
      height: 32px;
      background: var(--red-lo);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }
    .intervention-title {
      font-size: 14px;
      font-weight: 700;
      flex: 1;
    }
    .intervention-desc {
      font-size: 13px;
      color: var(--text-2);
      margin-bottom: 12px;
      line-height: 1.5;
    }
    .intervention-actions {
      display: flex;
      gap: 8px;
    }
    .intervention-badge {
      background: var(--red) !important;
      animation: pulse-red 2s infinite;
    }
    @keyframes pulse-red {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    /* Session Footer */
    .session-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      margin-top: 8px;
    }

    .session-info {
      display: flex;
      gap: 32px;
    }

    .session-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .session-label {
      font-family: var(--mono);
      font-size: 10px;
      color: var(--text-3);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .session-value {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-1);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .status-indicator {
      font-size: 10px;
    }
    .status-indicator.running { color: var(--green); animation: blink 1s infinite; }
    .status-indicator.idle { color: var(--amber); }
    .status-indicator.error { color: var(--red); }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .session-actions {
      display: flex;
      gap: 8px;
    }

    .btn-danger {
      background: var(--red);
      color: white;
    }
    .btn-danger:hover:not(:disabled) { background: #dc2626; }
    .btn-danger:disabled, .btn-ghost:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Responsive */
    @media (max-width: 1400px) {
      .triple-grid { grid-template-columns: 1fr 1fr; }
    }

    @media (max-width: 1200px) {
      .metrics-grid { grid-template-columns: repeat(2, 1fr); }
      .main-grid { grid-template-columns: 1fr; }
      .bottom-grid { grid-template-columns: 1fr; }
      .triple-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 900px) {
      .shell { grid-template-columns: 1fr; }
      aside { display: none; }
      .session-footer { flex-direction: column; gap: 16px; }
      .session-info { flex-wrap: wrap; gap: 16px; }
    }
  </style>
</head>
<body>

<div class="shell">
  <!-- Sidebar -->
  <aside>
    <div class="logo">
      <div class="logo-mark">
       <img src="https://openqa.orkajs.com/_next/image?url=https%3A%2F%2Forkajs.com%2Floutre-orka-qa.png&w=256&q=75" alt="OpenQA Logo" style="width: 40px; height: 40px;">
      </div>
      <div>
        <div class="logo-name">OpenQA</div>
        <div class="logo-version">v2.1.0 · OSS</div>
      </div>
    </div>

    <div class="nav-section">
      <div class="nav-label">Overview</div>
      <a class="nav-item active" href="/">
        <span class="icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-gauge-icon lucide-gauge"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>
        </span> Dashboard
      </a>
      <a class="nav-item" href="/kanban">
        <span class="icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-dashed-kanban-icon lucide-square-dashed-kanban"><path d="M8 7v7"/><path d="M12 7v4"/><path d="M16 7v9"/><path d="M5 3a2 2 0 0 0-2 2"/><path d="M9 3h1"/><path d="M14 3h1"/><path d="M19 3a2 2 0 0 1 2 2"/><path d="M21 9v1"/><path d="M21 14v1"/><path d="M21 19a2 2 0 0 1-2 2"/><path d="M14 21h1"/><path d="M9 21h1"/><path d="M5 21a2 2 0 0 1-2-2"/><path d="M3 14v1"/><path d="M3 9v1"/></svg>
        </span> Kanban
        <span class="badge" id="kanban-count">0</span>
      </a>

      <div class="nav-label">Agents</div>
      <a class="nav-item" href="javascript:void(0)" onclick="scrollToSection('agents-table')">
        <span class="icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-activity-icon lucide-activity"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>
        </span> Active Agents
      </a>
      <a class="nav-item" href="javascript:void(0)" onclick="switchAgentTab('specialists'); scrollToSection('agents-table')">
        <span class="icon">
         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-hat-glasses-icon lucide-hat-glasses"><path d="M14 18a2 2 0 0 0-4 0"/><path d="m19 11-2.11-6.657a2 2 0 0 0-2.752-1.148l-1.276.61A2 2 0 0 1 12 4H8.5a2 2 0 0 0-1.925 1.456L5 11"/><path d="M2 11h20"/><circle cx="17" cy="18" r="3"/><circle cx="7" cy="18" r="3"/></svg>
        </span> Specialists
      </a>
      <a class="nav-item" href="javascript:void(0)" onclick="scrollToSection('interventions-panel')">
        <span class="icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-cog-icon lucide-user-cog"><path d="M10 15H6a4 4 0 0 0-4 4v2"/><path d="m14.305 16.53.923-.382"/><path d="m15.228 13.852-.923-.383"/><path d="m16.852 12.228-.383-.923"/><path d="m16.852 17.772-.383.924"/><path d="m19.148 12.228.383-.923"/><path d="m19.53 18.696-.382-.924"/><path d="m20.772 13.852.924-.383"/><path d="m20.772 16.148.924.383"/><circle cx="18" cy="15" r="3"/><circle cx="9" cy="7" r="4"/></svg>
        </span> Interventions
        <span class="badge" id="intervention-count" style="background: var(--red);">0</span>
      </a>


      <div class="nav-label">Testing</div>
      <a class="nav-item" href="/sessions">
        <span class="icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/></svg>
        </span> Sessions
      </a>
      <a class="nav-item" href="/issues">
        <span class="icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
        </span> Issues
      </a>
      <a class="nav-item" href="/tests">
        <span class="icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bug-play-icon lucide-bug-play"><path d="M10 19.655A6 6 0 0 1 6 14v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 3.97"/><path d="M14 15.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997a1 1 0 0 1-1.517-.86z"/><path d="M14.12 3.88 16 2"/><path d="M21 5a4 4 0 0 1-3.55 3.97"/><path d="M3 21a4 4 0 0 1 3.81-4"/><path d="M3 5a4 4 0 0 0 3.55 3.97"/><path d="M6 13H2"/><path d="m8 2 1.88 1.88"/><path d="M9 7.13V6a3 3 0 1 1 6 0v1.13"/></svg>
        </span> Actions
      </a>
      <a class="nav-item" href="/coverage">
        <span class="icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/></svg>
        </span> Coverage
      </a>
      <a class="nav-item" href="/approvals">
        <span class="icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </span> Approvals
        <span class="badge" id="approvals-count" style="background:var(--amber);display:none">0</span>
      </a>
      <a class="nav-item" href="/logs">
        <span class="icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 12h8"/><path d="M13 18h8"/><path d="M13 6h8"/><path d="M3 12h1"/><path d="M3 18h1"/><path d="M3 6h1"/><path d="M8 12h1"/><path d="M8 18h1"/><path d="M8 6h1"/></svg>
        </span> Logs
      </a>


      <div class="nav-label">System</div>
      <a class="nav-item" href="/config">
        <span class="icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-monitor-cog-icon lucide-monitor-cog"><path d="M12 17v4"/><path d="m14.305 7.53.923-.382"/><path d="m15.228 4.852-.923-.383"/><path d="m16.852 3.228-.383-.924"/><path d="m16.852 8.772-.383.923"/><path d="m19.148 3.228.383-.924"/><path d="m19.53 9.696-.382-.924"/><path d="m20.772 4.852.924-.383"/><path d="m20.772 7.148.924.383"/><path d="M22 13v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><path d="M8 21h8"/><circle cx="18" cy="6" r="3"/></svg>
        </span> Config
      </a>
      <a class="nav-item" href="/config/env">
        <span class="icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-columns3-cog-icon lucide-columns-3-cog"><path d="M10.5 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5.5"/><path d="m14.3 19.6 1-.4"/><path d="M15 3v7.5"/><path d="m15.2 16.9-.9-.3"/><path d="m16.6 21.7.3-.9"/><path d="m16.8 15.3-.4-1"/><path d="m19.1 15.2.3-.9"/><path d="m19.6 21.7-.4-1"/><path d="m20.7 16.8 1-.4"/><path d="m21.7 19.4-.9-.3"/><path d="M9 3v18"/><circle cx="18" cy="18" r="3"/></svg>
        </span> Environment
      </a>
    </div>

    <div class="sidebar-footer">
      <!-- Connection status -->
      <div class="status-pill">
        <div class="dot" id="connection-dot"></div>
        <span id="connection-text">Connected</span>
      </div>
      <!-- Current user -->
      <div class="user-pill">
        <div class="user-avatar" id="user-avatar">?</div>
        <div class="user-info">
          <div class="user-name" id="user-name">Loading…</div>
          <div class="user-role" id="user-role">—</div>
        </div>
        <button class="btn-logout" onclick="logout()" title="Sign out">⎋ Out</button>
      </div>
      <!-- User management (admin only) -->
      <button class="btn-user-mgmt" id="btn-user-mgmt" style="display:none" onclick="openUserModal()">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
        Manage Users
      </button>
    </div>
  </aside>

  <!-- User Management Modal -->
  <div class="modal-backdrop" id="user-modal" onclick="if(event.target===this)closeUserModal()">
    <div class="modal">
      <h3>👥 User Management</h3>

      <!-- Existing users list -->
      <div id="user-list" class="user-list"></div>

      <hr style="border:none;border-top:1px solid var(--border);margin:20px 0">

      <!-- Create new user -->
      <div style="font-size:12px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:1px;margin-bottom:14px">Add User</div>
      <div class="modal-row">
        <div class="modal-field"><label>Username</label><input type="text" id="new-username" placeholder="username"></div>
        <div class="modal-field"><label>Role</label>
          <select id="new-role">
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
      <div class="modal-field"><label>Password</label><input type="password" id="new-password" placeholder="min 8 characters"></div>

      <div class="modal-actions">
        <button class="btn-sm btn-ghost" onclick="closeUserModal()">Cancel</button>
        <button class="btn-sm btn-primary" onclick="createUser()">Create User</button>
      </div>
      <div id="user-modal-msg" style="margin-top:10px;font-size:12px;color:var(--accent)"></div>
    </div>
  </div>

  <!-- Main -->
  <main>
    <div class="topbar">
      <div>
        <div class="page-title">Dashboard</div>
        <div class="page-breadcrumb">openqa / overview / today</div>
      </div>
      <div class="topbar-actions">
        <button class="btn-sm btn-ghost">Export</button>
        <button class="btn-sm btn-ghost" onclick="location.reload()">↻ Refresh</button>
        <button class="btn-sm btn-primary" id="run-session-btn" onclick="toggleSession()">▶ Run Session</button>
      </div>
    </div>

    <div class="content">
      <!-- Metrics -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-header">
            <div class="metric-label">Active Agents</div>
            <div class="metric-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-terminal-icon lucide-square-terminal"><path d="m7 11 2-2-2-2"/><path d="M11 13h4"/><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/></svg>
            </div>
          </div>
          <div class="metric-value" id="active-agents">0</div>
          <div class="metric-change positive" id="agents-change">↑ 0 from last hour</div>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <div class="metric-label">Total Actions</div>
            <div class="metric-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-todo-icon lucide-list-todo"><path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/><path d="m3 17 2 2 4-4"/><rect x="3" y="4" width="6" height="6" rx="1"/></svg>
            </div>
          </div>
          <div class="metric-value" id="total-actions">0</div>
          <div class="metric-change positive" id="actions-change">↑ 0% this session</div>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <div class="metric-label">Bugs Found</div>
            <div class="metric-icon">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-todo-icon lucide-list-todo"><path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/><path d="m3 17 2 2 4-4"/><rect x="3" y="4" width="6" height="6" rx="1"/></svg>
            </div>
          </div>
          <div class="metric-value" id="bugs-found">0</div>
          <div class="metric-change negative" id="bugs-change">↓ 0 from yesterday</div>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <div class="metric-label">Success Rate</div>
            <div class="metric-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-cloud-check-icon lucide-cloud-check"><path d="m17 15-5.5 5.5L9 18"/><path d="M5.516 16.07A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 3.501 7.327"/></svg>
            </div>
          </div>
          <div class="metric-value" id="success-rate">—</div>
          <div class="metric-change positive" id="rate-change">↑ 0 pts improvement</div>
        </div>
      </div>

      <!-- Charts & Hierarchy -->
      <div class="main-grid">
        <div class="panel">
          <div class="panel-head">
            <span class="panel-title">Performance Metrics</span>
            <div class="tabs">
              <button class="tab active" onclick="switchChartTab('performance')">Performance</button>
              <button class="tab" onclick="switchChartTab('activity')">Activity</button>
              <button class="tab" onclick="switchChartTab('errors')">Error rate</button>
            </div>
          </div>
          <div class="panel-body">
            <div class="chart-container" id="chart-performance">
              <canvas id="performanceChart"></canvas>
            </div>
            <div class="chart-container" id="chart-activity" style="display:none;">
              <canvas id="activityChart"></canvas>
            </div>
            <div class="chart-container" id="chart-errors" style="display:none;">
              <canvas id="errorChart"></canvas>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <span class="panel-title">Agent Hierarchy</span>
            <span class="panel-badge">live</span>
          </div>
          <div class="panel-body">
            <div class="hierarchy-container" id="hierarchy-container">
              <div class="hierarchy-badge">● Main Agent</div>
              <!-- SVG hierarchy will be rendered here -->
            </div>
          </div>
        </div>
      </div>

      <!-- Agents & Activity -->
      <div class="bottom-grid">
        <div class="panel">
          <div class="panel-head">
            <span class="panel-title">Active Agents</span>
            <div class="tabs">
              <button class="tab active" onclick="switchAgentTab('agents')">Agents</button>
              <button class="tab" onclick="switchAgentTab('specialists')">Specialists</button>
            </div>
          </div>
          <div id="agents-table">
            <div class="table-header">
              <div>Agent</div>
              <div>Status</div>
              <div>Tasks</div>
              <div>Perf.</div>
            </div>
            <div id="agents-list">
              <div class="empty-state">Waiting for agent data...</div>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <span class="panel-title">Recent Activity</span>
            <span class="panel-badge" id="activity-count">0 events</span>
          </div>
          <div class="activity-list" id="activity-list">
            <div class="activity-item">
              <div class="activity-dot info"></div>
              <div class="activity-content">
                <div class="activity-message">Awaiting session start</div>
                <div class="activity-time">System ready · just now</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tasks, Issues & Interventions -->
      <div class="triple-grid">
        <div class="panel" id="tasks-panel">
          <div class="panel-head">
            <span class="panel-title">📝 Current Tasks</span>
            <span class="panel-badge" id="tasks-count">0</span>
          </div>
          <div class="task-list" id="tasks-list">
            <div class="empty-state">No active tasks</div>
          </div>
        </div>

        <div class="panel" id="issues-panel">
          <div class="panel-head">
            <span class="panel-title">⚠️ Issues Found</span>
            <span class="panel-badge" id="issues-count">0</span>
          </div>
          <div class="issue-list" id="issues-list">
            <div class="empty-state">No issues detected</div>
          </div>
        </div>

        <div class="panel" id="interventions-panel">
          <div class="panel-head">
            <span class="panel-title">🚨 Human Interventions</span>
            <span class="panel-badge intervention-badge" id="interventions-count">0</span>
          </div>
          <div class="intervention-list" id="interventions-list">
            <div class="empty-state">No interventions required</div>
          </div>
        </div>
      </div>

      <!-- Session Info Footer -->
      <div class="session-footer">
        <div class="session-info">
          <div class="session-item">
            <span class="session-label">Session ID</span>
            <span class="session-value" id="session-id">—</span>
          </div>
          <div class="session-item">
            <span class="session-label">Target URL</span>
            <span class="session-value" id="target-url">Not configured</span>
          </div>
          <div class="session-item">
            <span class="session-label">Status</span>
            <span class="session-value">
              <span class="status-indicator" id="agent-status-indicator">●</span>
              <span id="agent-status-text">Idle</span>
            </span>
          </div>
        </div>
        <div class="session-actions">
          <button class="btn-sm btn-danger" onclick="stopSession()" id="stop-btn" disabled>◼ Stop</button>
          <button class="btn-sm btn-ghost" onclick="pauseSession()" id="pause-btn" disabled>⏸ Pause</button>
        </div>
      </div>
    </div>
  </main>
</div>

<script>
  let ws;
  let activities = [];
  let performanceChart, activityChart, errorChart;
  let chartData = { actions: [], successRates: [], labels: [] };
  // Track which agents sub-tab is visible so WS updates don't clobber a manual view
  let activeAgentTab = 'agents';

  // WebSocket Connection
  function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(\`\${protocol}//\${window.location.host}\`);
    
    ws.onopen = () => {
      document.getElementById('connection-dot').classList.remove('disconnected');
      document.getElementById('connection-text').textContent = 'Connected';
    };
    
    ws.onclose = () => {
      document.getElementById('connection-dot').classList.add('disconnected');
      document.getElementById('connection-text').textContent = 'Disconnected';
      setTimeout(connectWebSocket, 3000);
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleMessage(data);
    };
  }

  function handleMessage(data) {
    switch(data.type) {
      case 'status':
        updateStatus(data.data);
        break;
      case 'session':
        updateMetrics(data.data, data.data.status === 'running');
        break;
      // 'sessions' (plural) = list of TestSession records from DB
      case 'sessions':
        handleSessionsList(data.data);
        break;
      case 'agents':
        updateAgents(data.data);
        break;
      case 'activity':
        addActivity(data.data);
        break;
      case 'tasks':
        updateTasks(data.data);
        break;
      case 'issues':
        updateIssues(data.data);
        break;
      case 'intervention':
        addIntervention(data.data);
        break;
      // Kanban badge — server pushes open ticket count
      case 'kanban-stats':
        document.getElementById('kanban-count').textContent = String(data.data?.count ?? 0);
        break;
      // Live dynamic agents from the running agent instance (different shape from DB agents)
      case 'dynamic-agents':
        // No UI update needed here — DB agents handle the hierarchy/panel
        break;
      // Real-time specialist statuses pushed every 3s by the daemon
      case 'specialists':
        updateSpecialists(data.data);
        break;
    }
  }

  function handleSessionsList(sessions) {
    if (!sessions || sessions.length === 0) return;
    const latest = sessions[0];
    // Sync session footer
    if (latest.id) {
      document.getElementById('session-id').textContent = latest.id.substring(0, 12) + '...';
    }
    // Sync metrics from latest session
    updateMetrics({
      active_agents: parseInt(document.getElementById('active-agents').textContent) || 0,
      total_actions: latest.total_actions || 0,
      bugs_found: latest.bugs_found || 0,
      success_rate: latest.total_actions > 0
        ? Math.round(((latest.total_actions - (latest.bugs_found || 0)) / latest.total_actions) * 100)
        : 0,
    });
    // Refresh Activity and Error charts from full sessions history
    if (window._refreshActivityChart) window._refreshActivityChart(sessions);
    if (window._refreshErrorChart)   window._refreshErrorChart(sessions);
  }

  function updateStatus(status) {
    const isRunning = status.isRunning;
    const indicator = document.getElementById('agent-status-indicator');
    const statusText = document.getElementById('agent-status-text');
    const stopBtn = document.getElementById('stop-btn');
    const pauseBtn = document.getElementById('pause-btn');

    // ── Sync the top-bar "Run Session" button ─────────────────────────────
    updateRunButton(isRunning);

    // Update sidebar connection text
    document.getElementById('connection-text').textContent = isRunning ? 'Running' : 'Connected';

    // Update session footer status
    indicator.className = 'status-indicator ' + (isRunning ? 'running' : 'idle');
    statusText.textContent = isRunning ? 'Running' : 'Idle';

    // Update target URL — always reflect server truth
    if (status.target) {
      document.getElementById('target-url').textContent = status.target;
    }

    // Update session ID
    if (status.sessionId) {
      document.getElementById('session-id').textContent = status.sessionId.substring(0, 12) + '...';
    }

    // Enable/disable control buttons
    stopBtn.disabled = !isRunning;
    pauseBtn.disabled = !isRunning;

    // ── Sync activity feed placeholder ────────────────────────────────────
    // If no real activities yet, replace the static "Awaiting" message with truth
    if (activities.length === 0) {
      const container = document.getElementById('activity-list');
      const placeholder = container.querySelector('.activity-message');
      if (placeholder) {
        const msg = isRunning
          ? 'Session running — waiting for agent events...'
          : 'System ready — no session running';
        placeholder.textContent = msg;
      }
    }
  }

  // Track last session ID so we only add a new chart point when data changes
  let _lastChartSessionId = null;
  let _lastChartActions = -1;

  function updateMetrics(session, isRunning = false) {
    document.getElementById('active-agents').textContent = session.active_agents || 0;
    document.getElementById('total-actions').textContent = session.total_actions || 0;
    document.getElementById('bugs-found').textContent = session.bugs_found || 0;

    const rate = session.success_rate;
    document.getElementById('success-rate').textContent = rate > 0 ? rate + '%' : '—';

    // Update the live chart:
    // • If running → add a new point every tick (capped at 20 points)
    // • If just completed (isRunning=false but actions changed) → add final point once
    const actions = session.total_actions || 0;
    const sessionChanged = session.id && session.id !== _lastChartSessionId;
    const actionsChanged = actions !== _lastChartActions;

    if (!isRunning && !sessionChanged && !actionsChanged) return;

    _lastChartActions = actions;
    if (session.id) _lastChartSessionId = session.id;

    const now = new Date();
    const timeLabel = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    if (chartData.labels.length >= 20) {
      chartData.labels.shift();
      chartData.actions.shift();
      chartData.successRates.shift();
    }

    chartData.labels.push(timeLabel);
    chartData.actions.push(actions);
    chartData.successRates.push(rate || 0);

    if (performanceChart) {
      performanceChart.data.labels = chartData.labels;
      performanceChart.data.datasets[0].data = chartData.actions;
      performanceChart.data.datasets[1].data = chartData.successRates;
      performanceChart.update('none');
    }
  }

  function updateAgents(agents) {
    // Don't clobber the specialists view when the WS pushes agent data
    if (activeAgentTab === 'specialists') return;

    const container = document.getElementById('agents-list');
    const countEl = document.getElementById('active-agents');

    if (!agents || agents.length === 0) {
      container.innerHTML = '<div class="empty-state">Waiting for agent data...</div>';
      countEl.textContent = '0';
      return;
    }

    countEl.textContent = agents.length;

    container.innerHTML = agents.map(agent => \`
      <div class="table-row">
        <div class="agent-name">\${agent.name}</div>
        <div><span class="status-badge \${agent.status}">\${agent.status}</span></div>
        <div>\${agent.tasks || 0}</div>
        <div>\${agent.performance || 0}%</div>
      </div>
    \`).join('');

    // Update hierarchy
    updateHierarchy(agents);
  }

  function addActivity(activity) {
    // Deduplicate: skip if the most recent activity has the exact same message
    if (activities.length > 0 && activities[0].message === activity.message) return;
    activities.unshift(activity);
    if (activities.length > 20) activities.pop();
    
    const container = document.getElementById('activity-list');
    document.getElementById('activity-count').textContent = activities.length + ' events';
    
    container.innerHTML = activities.map(a => \`
      <div class="activity-item">
        <div class="activity-dot \${a.type || 'info'}"></div>
        <div class="activity-content">
          <div class="activity-message">\${a.message}</div>
          <div class="activity-time">\${formatTime(a.timestamp)}</div>
        </div>
      </div>
    \`).join('');
  }

  function formatTime(timestamp) {
    if (!timestamp) return 'just now';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
    return date.toLocaleTimeString();
  }

  // Charts
  function initCharts() {
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { color: '#8b98a8', font: { size: 11 } }
        }
      },
      scales: {
        x: {
          ticks: { color: '#4b5563' },
          grid: { color: 'rgba(255,255,255,0.04)' }
        },
        y: {
          ticks: { color: '#4b5563' },
          grid: { color: 'rgba(255,255,255,0.04)' },
          beginAtZero: true,
          suggestedMin: 0,
          suggestedMax: 10   // avoids the -1..1 auto-range when all data is 0
        }
      }
    };

    // Performance Chart
    const perfCtx = document.getElementById('performanceChart').getContext('2d');
    performanceChart = new Chart(perfCtx, {
      type: 'line',
      data: {
        labels: chartData.labels.length ? chartData.labels : ['—'],
        datasets: [{
          label: 'Total Actions',
          data: chartData.actions.length ? chartData.actions : [0],
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.1)',
          tension: 0.4,
          fill: true
        }, {
          label: 'Success %',
          data: chartData.successRates.length ? chartData.successRates : [0],
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: chartOptions
    });

    // Activity Chart — populate from real session history
    const actCtx = document.getElementById('activityChart').getContext('2d');
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const actionsPerDay = [0, 0, 0, 0, 0, 0, 0];
    const bugsPerDay    = [0, 0, 0, 0, 0, 0, 0];
    activityChart = new Chart(actCtx, {
      type: 'bar',
      data: {
        labels: dayLabels,
        datasets: [{
          label: 'Actions',
          data: actionsPerDay,
          backgroundColor: '#f97316'
        }, {
          label: 'Bugs',
          data: bugsPerDay,
          backgroundColor: '#ef4444'
        }]
      },
      options: chartOptions
    });
    // Seed activity chart from the sessions WS data when it arrives
    window._refreshActivityChart = function(sessions) {
      const a = [0,0,0,0,0,0,0];
      const b = [0,0,0,0,0,0,0];
      sessions.forEach(s => {
        const d = s.started_at ? new Date(s.started_at).getDay() : -1;
        if (d >= 0) { a[d] += s.total_actions || 0; b[d] += s.bugs_found || 0; }
      });
      activityChart.data.datasets[0].data = a;
      activityChart.data.datasets[1].data = b;
      activityChart.update('none');
    };

    // Error / Success Chart — populated from real session data
    const errCtx = document.getElementById('errorChart').getContext('2d');
    errorChart = new Chart(errCtx, {
      type: 'doughnut',
      data: {
        labels: ['Passed', 'Bugs'],
        datasets: [{
          data: [100, 0],
          backgroundColor: ['#22c55e', '#ef4444']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#8b98a8', font: { size: 11 } }
          },
          tooltip: {
            callbacks: {
              label: ctx => \` \${ctx.label}: \${ctx.parsed}%\`
            }
          }
        }
      }
    });
    window._refreshErrorChart = function(sessions) {
      const totalActions = sessions.reduce((s, r) => s + (r.total_actions || 0), 0);
      const totalBugs    = sessions.reduce((s, r) => s + (r.bugs_found   || 0), 0);
      const passed = totalActions > 0 ? Math.round(((totalActions - totalBugs) / totalActions) * 100) : 100;
      const bugPct = 100 - passed;
      errorChart.data.datasets[0].data = [passed, bugPct];
      errorChart.update('none');
    };
  }

  function switchChartTab(tab) {
    // Update tabs in the chart panel
    const chartTabs = document.querySelectorAll('#chart-performance, #chart-activity, #chart-errors')
      .item(0)?.closest('.panel')?.querySelectorAll('.tabs .tab');
    
    if (chartTabs) {
      chartTabs.forEach((t, i) => {
        t.classList.remove('active');
        if ((tab === 'performance' && i === 0) || 
            (tab === 'activity' && i === 1) || 
            (tab === 'errors' && i === 2)) {
          t.classList.add('active');
        }
      });
    }
    
    document.getElementById('chart-performance').style.display = tab === 'performance' ? 'block' : 'none';
    document.getElementById('chart-activity').style.display = tab === 'activity' ? 'block' : 'none';
    document.getElementById('chart-errors').style.display = tab === 'errors' ? 'block' : 'none';
  }

  // Cache of last received specialist statuses (updated every 3s via WS)
  let _cachedSpecialists = [];

  function updateSpecialists(statuses) {
    if (!statuses) return;
    _cachedSpecialists = statuses;
    // Only render if the specialists tab is currently visible
    if (activeAgentTab === 'specialists') {
      renderSpecialistsTable(statuses);
    }
  }

  function renderSpecialistsTable(statuses) {
    const container = document.getElementById('agents-list');
    if (!statuses || statuses.length === 0) {
      container.innerHTML = '<div class="empty-state">No specialists running — start a session to activate them</div>';
      return;
    }

    // Pretty-print the specialist type (strip dynamic: prefix, convert hyphens)
    function formatType(type) {
      return type
        .replace(/^dynamic:/, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
    }

    // Performance = findings / max(actions,1) * 100, capped at 100
    function calcPerf(s) {
      if (!s.actions && !s.findings) return '—';
      const pct = s.findings > 0
        ? Math.min(100, Math.round((s.findings / Math.max(s.actions, 1)) * 100))
        : (s.actions > 0 ? Math.min(100, s.actions) : 0);
      return pct + '%';
    }

    container.innerHTML = statuses.map(s => \`
      <div class="table-row">
        <div class="agent-name">\${formatType(s.type)}</div>
        <div><span class="status-badge \${s.status}">\${s.status}</span></div>
        <div>\${s.actions || 0}</div>
        <div>\${calcPerf(s)}</div>
      </div>
    \`).join('');
  }

  function switchAgentTab(tab) {
    activeAgentTab = tab; // persist so updateAgents() knows not to overwrite
    // Find tabs in the panel containing agents-table
    const panel = document.getElementById('agents-table')?.closest('.panel');
    const agentsTabs = panel?.querySelectorAll('.tabs .tab');
    if (!agentsTabs) return;
    agentsTabs.forEach(t => t.classList.remove('active'));

    if (tab === 'specialists') {
      agentsTabs[1]?.classList.add('active');
      // Render from cache (updated every 3s by WS) — or fetch if cache is empty
      if (_cachedSpecialists.length > 0) {
        renderSpecialistsTable(_cachedSpecialists);
      } else {
        document.getElementById('agents-list').innerHTML = '<div class="empty-state">No specialists running — start a session to activate them</div>';
      }
    } else {
      agentsTabs[0]?.classList.add('active');
      // Reload agents data from correct endpoint
      fetch('/api/dynamic-agents', { credentials: 'include' })
        .then(r => r.json())
        .then(updateAgents)
        .catch(() => {
          document.getElementById('agents-list').innerHTML = '<div class="empty-state">Waiting for agent data...</div>';
        });
    }
  }
  
  function scrollToSection(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Highlight effect
      element.style.boxShadow = '0 0 0 2px var(--accent)';
      setTimeout(() => {
        element.style.boxShadow = '';
      }, 2000);
    }
  }

  // Hierarchy
  function updateHierarchy(agents) {
    const container = document.getElementById('hierarchy-container');

    // Node layout — positions are the CENTER of each node
    const agentTypes = {
      'Main Agent':        { cx: 240, cy: 44,  class: 'main' },
      'Browser Specialist':{ cx: 80,  cy: 140, class: 'browser' },
      'API Tester':        { cx: 240, cy: 140, class: 'api' },
      'Auth Specialist':   { cx: 400, cy: 140, class: 'auth' },
      'UI Tester':         { cx: 80,  cy: 230, class: 'ui' },
      'Performance':       { cx: 240, cy: 230, class: 'perf' },
      'Security Scanner':  { cx: 400, cy: 230, class: 'security' },
    };

    // Build a lookup of active agents — match by keyword (partial name, case-insensitive)
    // This is resilient to the actual agent names in the DB not matching exactly.
    function findAgent(keyword) {
      const kw = keyword.toLowerCase();
      return agents.find(a => a.name && a.name.toLowerCase().includes(kw)) || null;
    }

    // SVG connection lines (z-index 1, under the nodes)
    let html = \`<svg width="100%" height="100%" style="position:absolute;top:0;left:0;z-index:1;pointer-events:none;">
      <line x1="240" y1="56"  x2="80"  y2="128" stroke="#2d3748" stroke-width="1.5" stroke-dasharray="4"/>
      <line x1="240" y1="56"  x2="240" y2="128" stroke="#2d3748" stroke-width="1.5" stroke-dasharray="4"/>
      <line x1="240" y1="56"  x2="400" y2="128" stroke="#2d3748" stroke-width="1.5" stroke-dasharray="4"/>
      <line x1="80"  y1="152" x2="80"  y2="218" stroke="#2d3748" stroke-width="1.5" stroke-dasharray="4"/>
      <line x1="240" y1="152" x2="240" y2="218" stroke="#2d3748" stroke-width="1.5" stroke-dasharray="4"/>
      <line x1="400" y1="152" x2="400" y2="218" stroke="#2d3748" stroke-width="1.5" stroke-dasharray="4"/>
    </svg>\`;

    // Draw nodes — transform(-50%,-50%) centers them on (cx,cy)
    // keyword = word to search for in agent.name (partial match)
    const nodeKeywords = {
      'Main Agent':         'main',
      'Browser Specialist': 'browser',
      'API Tester':         'api',
      'Auth Specialist':    'auth',
      'UI Tester':          'ui',
      'Performance':        'perf',
      'Security Scanner':   'security',
    };
    Object.entries(agentTypes).forEach(([name, cfg]) => {
      const kw = nodeKeywords[name] || name.split(' ')[0].toLowerCase();
      const matchedAgent = findAgent(kw);
      const isActive = matchedAgent?.status === 'running';
      // If at least one agent exists in DB, all nodes show at base opacity
      const hasAnyAgent = agents.length > 0;
      const opacity = matchedAgent
        ? (isActive ? '1' : '0.55')
        : (hasAnyAgent ? '0.3' : '0.2');
      const dot = isActive ? '●' : (matchedAgent ? '○' : '·');
      const title = matchedAgent ? \`\${matchedAgent.name} [\${matchedAgent.status}]\` : name;
      html += \`<div class="agent-node \${cfg.class}"
        style="left:\${cfg.cx}px;top:\${cfg.cy}px;transform:translate(-50%,-50%);opacity:\${opacity}"
        title="\${title}">
        \${dot} \${name.split(' ')[0]}
      </div>\`;
    });

    container.innerHTML = html;
  }

  // Tasks
  function updateTasks(tasks) {
    const container = document.getElementById('tasks-list');
    const countEl = document.getElementById('tasks-count');
    
    if (!tasks || tasks.length === 0) {
      container.innerHTML = '<div class="empty-state">No active tasks</div>';
      countEl.textContent = '0';
      return;
    }
    
    countEl.textContent = tasks.length;
    
    container.innerHTML = tasks.map(task => {
      const progressNum = parseInt(task.progress) || 0;
      return \`
        <div class="task-item">
          <div class="task-icon">\${task.status === 'running' ? '⚡' : task.status === 'completed' ? '✓' : '○'}</div>
          <div class="task-content">
            <div class="task-name">\${task.name}</div>
            <div class="task-meta">
              <span>\${task.agent}</span>
              <span>\${formatTime(task.started_at)}</span>
            </div>
          </div>
          <div class="task-progress">
            <div class="task-progress-fill" style="width: \${progressNum}%"></div>
          </div>
        </div>
      \`;
    }).join('');
  }

  // Issues
  function updateIssues(issues) {
    const container = document.getElementById('issues-list');
    const countEl = document.getElementById('issues-count');
    
    if (!issues || issues.length === 0) {
      container.innerHTML = '<div class="empty-state">No issues detected</div>';
      countEl.textContent = '0';
      return;
    }
    
    countEl.textContent = issues.length;
    
    container.innerHTML = issues.map(issue => \`
      <div class="issue-item">
        <div class="issue-icon \${issue.severity}">\${
          issue.severity === 'critical' ? '🔴' : 
          issue.severity === 'high' ? '🟠' : 
          issue.severity === 'medium' ? '🟡' : '🟢'
        }</div>
        <div class="issue-content">
          <div class="issue-title">\${issue.title}</div>
          <div class="issue-meta">
            <span class="severity-badge \${issue.severity}">\${issue.severity}</span>
            <span>\${issue.agent}</span>
          </div>
        </div>
      </div>
    \`).join('');
  }

  // Interventions
  let interventions = [];
  
  function addIntervention(intervention) {
    interventions.unshift(intervention);
    renderInterventions();
  }
  
  function renderInterventions() {
    const container = document.getElementById('interventions-list');
    const countEl = document.getElementById('interventions-count');
    const navCountEl = document.getElementById('intervention-count');
    
    countEl.textContent = interventions.length;
    navCountEl.textContent = interventions.length;
    
    if (interventions.length === 0) {
      container.innerHTML = '<div class="empty-state">No interventions required</div>';
      return;
    }
    
    container.innerHTML = interventions.map(int => \`
      <div class="intervention-item" id="intervention-\${int.id}">
        <div class="intervention-header">
          <div class="intervention-icon">🚨</div>
          <div class="intervention-title">\${int.title}</div>
        </div>
        <div class="intervention-desc">\${int.description}</div>
        <div class="intervention-actions">
          <button class="btn-sm btn-primary" onclick="respondIntervention('\${int.id}', 'approve')">✓ Approve</button>
          <button class="btn-sm btn-danger" onclick="respondIntervention('\${int.id}', 'reject')">✕ Reject</button>
          <button class="btn-sm btn-ghost" onclick="respondIntervention('\${int.id}', 'skip')">Skip</button>
        </div>
      </div>
    \`).join('');
  }
  
  async function respondIntervention(id, response) {
    try {
      await fetch('/api/brain/run-test/' + id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ response })
      });
      
      // Remove from local list
      interventions = interventions.filter(i => i.id !== id);
      renderInterventions();
      
      addActivity({ 
        type: response === 'approve' ? 'success' : 'warning', 
        message: \`Intervention \${response}ed: \${id}\`, 
        timestamp: new Date().toISOString() 
      });
    } catch (error) {
      addActivity({ type: 'error', message: 'Failed to respond to intervention', timestamp: new Date().toISOString() });
    }
  }

  // Session state
  let isSessionRunning = false;

  function updateRunButton(running) {
    const btn = document.getElementById('run-session-btn');
    if (!btn) return;
    isSessionRunning = running;
    if (running) {
      btn.textContent = '■ Stop Session';
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-danger');
      btn.style.background = '#ef4444';
    } else {
      btn.textContent = '▶ Run Session';
      btn.classList.remove('btn-danger');
      btn.classList.add('btn-primary');
      btn.style.background = '';
    }
  }

  async function toggleSession() {
    if (isSessionRunning) {
      await stopSession();
    } else {
      await startSession();
    }
  }

  // Actions
  async function startSession() {
    const btn = document.getElementById('run-session-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Starting...';
    }
    try {
      const response = await fetch('/api/agent/start', { method: 'POST', credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        updateRunButton(true);
        addActivity({ type: 'success', message: 'Session started', timestamp: new Date().toISOString() });
      } else {
        updateRunButton(false);
        addActivity({ type: 'error', message: result.error || 'Failed to start session', timestamp: new Date().toISOString() });
      }
    } catch (error) {
      updateRunButton(false);
      addActivity({ type: 'error', message: 'Failed to start session', timestamp: new Date().toISOString() });
    }
    if (btn) btn.disabled = false;
  }

  async function stopSession() {
    const btn = document.getElementById('run-session-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Stopping...';
    }
    try {
      const response = await fetch('/api/agent/stop', { method: 'POST', credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        updateRunButton(false);
      }
      addActivity({
        type: result.success ? 'warning' : 'error',
        message: result.success ? 'Session stopped' : (result.error || 'Failed to stop session'),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      addActivity({ type: 'error', message: 'Failed to stop session', timestamp: new Date().toISOString() });
    }
    if (btn) btn.disabled = false;
  }
  
  async function pauseSession() {
    addActivity({ type: 'info', message: 'Pause requested...', timestamp: new Date().toISOString() });
  }

  // Load initial data
  async function loadInitialData() {
    try {
      const creds = { credentials: 'include' };
      const [sessionsRes, bugsRes, tasksRes, issuesRes, statusRes, agentsRes, metricsRes, sessionsHistRes, kanbanRes] = await Promise.all([
        fetch('/api/sessions?limit=1', creds),
        fetch('/api/bugs', creds),
        fetch('/api/tasks', creds),
        fetch('/api/issues', creds),
        fetch('/api/status', creds),
        fetch('/api/agents', creds),          // DB-backed agents (always populated)
        fetch('/api/metrics', creds),
        fetch('/api/sessions?limit=7', creds),
        fetch('/api/kanban', creds),           // real kanban ticket count
      ]);

      const sessions = await sessionsRes.json();
      const bugs = await bugsRes.json();
      const tasks = await tasksRes.json();
      const issues = await issuesRes.json();
      const status = await statusRes.json();
      const agents = await agentsRes.json();
      const metrics = await metricsRes.json();
      const sessionsHistory = await sessionsHistRes.json();
      const kanbanTickets = await kanbanRes.json();

      // Update status indicator — also syncs run button via updateStatus()
      updateStatus(status);

      // Update metrics cards
      if (sessions.length > 0) {
        const session = sessions[0];
        const isRunning = session.status === 'running';
        updateMetrics({
          active_agents: agents.filter(a => a.status === 'running').length,
          total_actions: session.total_actions || 0,
          bugs_found: session.bugs_found || 0,
          success_rate: session.total_actions > 0
            ? Math.round(((session.total_actions - (session.bugs_found || 0)) / session.total_actions) * 100)
            : 0
        }, isRunning);
        if (session.id) {
          document.getElementById('session-id').textContent = session.id.substring(0, 12) + '...';
        }
      }

      // Update agent list and hierarchy
      if (agents && agents.length > 0) {
        updateAgents(agents);
      }

      // Populate performance chart from session history (last 7 sessions)
      if (sessionsHistory.length > 0) {
        const historicSessions = [...sessionsHistory].reverse();
        chartData.labels = historicSessions.map((s, i) => {
          const d = new Date(s.started_at);
          return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
        });
        chartData.actions = historicSessions.map(s => s.total_actions || 0);
        chartData.successRates = historicSessions.map(s =>
          s.total_actions > 0
            ? Math.round(((s.total_actions - (s.bugs_found || 0)) / s.total_actions) * 100)
            : 0
        );
        if (performanceChart) {
          performanceChart.data.labels = chartData.labels;
          performanceChart.data.datasets[0].data = chartData.actions;
          performanceChart.data.datasets[1].data = chartData.successRates;
          performanceChart.update('none');
        }

        // Weekly activity chart — group sessions by day of week
        const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const testsByDay = [0,0,0,0,0,0,0];
        const bugsByDay  = [0,0,0,0,0,0,0];
        sessionsHistory.forEach(s => {
          const day = new Date(s.started_at).getDay();
          testsByDay[day] += s.total_actions || 0;
          bugsByDay[day]  += s.bugs_found || 0;
        });
        if (activityChart) {
          activityChart.data.labels = days;
          activityChart.data.datasets[0].data = testsByDay;
          activityChart.data.datasets[1].data = bugsByDay;
          activityChart.update('none');
        }
      }

      // Error/success donut from server-side metrics counters
      if (metrics && metrics.counters) {
        const passed = metrics.counters.tests_passed || 0;
        const failed = metrics.counters.tests_failed || 0;
        const total = passed + failed;
        if (total > 0 && errorChart) {
          errorChart.data.datasets[0].data = [passed, 0, failed];
          errorChart.update('none');
        }
      }

      // Update tasks and issues
      updateTasks(tasks);
      updateIssues(issues);

      // Kanban badge = tickets not yet done
      const openTickets = Array.isArray(kanbanTickets)
        ? kanbanTickets.filter(t => t.column !== 'done').length
        : bugs.filter(b => b.status === 'open' || b.status === 'in-progress').length;
      document.getElementById('kanban-count').textContent = String(openTickets);

      // Approvals badge = pending findings needing human review
      try {
        const approvalsRes = await fetch('/api/approvals?status=pending', creds);
        const pending = await approvalsRes.json();
        const count = Array.isArray(pending) ? pending.length : 0;
        const badgeEl = document.getElementById('approvals-count');
        if (badgeEl) {
          badgeEl.textContent = String(count);
          badgeEl.style.display = count > 0 ? 'inline-flex' : 'none';
        }
      } catch (_) { /* non-critical */ }

      // Seed activity feed with recent actions from latest session
      if (sessions.length > 0) {
        try {
          const actionsRes = await fetch(\`/api/sessions/\${sessions[0].id}/actions\`, creds);
          const actions = await actionsRes.json();
          actions.slice(0, 10).forEach(a => {
            addActivity({ type: 'info', message: a.description || a.type, timestamp: a.timestamp });
          });
        } catch (_) { /* no actions yet */ }
      }

    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  }

  // ── Auth: current user + logout ─────────────────────────────────────────
  async function loadCurrentUser() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) return;
      const me = await res.json();
      const initials = (me.username || '?').slice(0, 2).toUpperCase();
      document.getElementById('user-avatar').textContent = initials;
      document.getElementById('user-name').textContent = me.username || 'Unknown';
      document.getElementById('user-role').textContent = me.role || 'viewer';
      if (me.role === 'admin') {
        document.getElementById('btn-user-mgmt').style.display = 'flex';
      }
    } catch (e) { /* ignore */ }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/login';
  }

  // ── User management modal ────────────────────────────────────────────────
  async function openUserModal() {
    document.getElementById('user-modal').classList.add('open');
    await loadUserList();
  }

  function closeUserModal() {
    document.getElementById('user-modal').classList.remove('open');
    document.getElementById('user-modal-msg').textContent = '';
  }

  async function loadUserList() {
    try {
      const res = await fetch('/api/accounts', { credentials: 'include' });
      if (!res.ok) return;
      const users = await res.json();
      const list = document.getElementById('user-list');
      list.innerHTML = users.map(u => \`
        <div class="user-list-item">
          <div class="user-avatar" style="width:28px;height:28px;font-size:10px">\${u.username.slice(0,2).toUpperCase()}</div>
          <span style="flex:1">\${u.username}</span>
          <span class="role-badge \${u.role}">\${u.role}</span>
          <button class="btn-del" onclick="deleteUser('\${u.id}', '\${u.username}')" title="Delete user">✕</button>
        </div>
      \`).join('');
    } catch (e) { /* ignore */ }
  }

  async function createUser() {
    const username = document.getElementById('new-username').value.trim();
    const password = document.getElementById('new-password').value;
    const role     = document.getElementById('new-role').value;
    const msg      = document.getElementById('user-modal-msg');

    if (!username || !password) { msg.textContent = 'Username and password are required.'; return; }
    if (password.length < 8)    { msg.textContent = 'Password must be at least 8 characters.'; return; }

    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password, role }),
      });
      const data = await res.json();
      if (res.ok) {
        msg.style.color = 'var(--green)';
        msg.textContent = \`User "\${username}" created.\`;
        document.getElementById('new-username').value = '';
        document.getElementById('new-password').value = '';
        await loadUserList();
      } else {
        msg.style.color = 'var(--red)';
        msg.textContent = data.error || 'Failed to create user.';
      }
    } catch (e) {
      msg.style.color = 'var(--red)';
      msg.textContent = 'Network error.';
    }
  }

  async function deleteUser(id, username) {
    if (!confirm(\`Delete user "\${username}"?\`)) return;
    const msg = document.getElementById('user-modal-msg');
    try {
      const res = await fetch(\`/api/accounts/\${id}\`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        msg.style.color = 'var(--green)';
        msg.textContent = \`User "\${username}" deleted.\`;
        await loadUserList();
      } else {
        msg.style.color = 'var(--red)';
        msg.textContent = data.error || 'Cannot delete user.';
      }
    } catch (e) {
      msg.style.color = 'var(--red)';
      msg.textContent = 'Network error.';
    }
  }

  // Initialize
  window.addEventListener('load', () => {
    initCharts();
    connectWebSocket();
    loadInitialData();
    loadCurrentUser();
  });
</script>

</body>
</html>`;
}

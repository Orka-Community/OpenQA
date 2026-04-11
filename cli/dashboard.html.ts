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
      background: var(--accent);
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
      padding: 16px 24px;
      border-top: 1px solid var(--border);
    }

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
      font-weight: 800;
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
      <div class="logo-mark">🔬</div>
      <div>
        <div class="logo-name">OpenQA</div>
        <div class="logo-version">v2.1.0 · OSS</div>
      </div>
    </div>

    <div class="nav-section">
      <div class="nav-label">Overview</div>
      <a class="nav-item active" href="/">
        <span class="icon">▦</span> Dashboard
      </a>
      <a class="nav-item" href="/kanban">
        <span class="icon">⊞</span> Kanban
        <span class="badge" id="kanban-count">0</span>
      </a>

      <div class="nav-label">Agents</div>
      <a class="nav-item" href="javascript:void(0)" onclick="scrollToSection('agents-table')">
        <span class="icon">◎</span> Active Agents
      </a>
      <a class="nav-item" href="javascript:void(0)" onclick="switchAgentTab('specialists'); scrollToSection('agents-table')">
        <span class="icon">◇</span> Specialists
      </a>
      <a class="nav-item" href="javascript:void(0)" onclick="scrollToSection('interventions-panel')">
        <span class="icon">⚠</span> Interventions
        <span class="badge" id="intervention-count" style="background: var(--red);">0</span>
      </a>

      <div class="nav-label">Analysis</div>
      <a class="nav-item" href="javascript:void(0)" onclick="scrollToSection('issues-panel')">
        <span class="icon">🐛</span> Bug Reports
      </a>
      <a class="nav-item" href="javascript:void(0)" onclick="switchChartTab('performance'); scrollToSection('chart-performance')">
        <span class="icon">⚡</span> Performance
      </a>
      <a class="nav-item" href="javascript:void(0)" onclick="scrollToSection('activity-list')">
        <span class="icon">📋</span> Logs
      </a>

      <div class="nav-label">System</div>
      <a class="nav-item" href="/config">
        <span class="icon">⚙</span> Config
      </a>
      <a class="nav-item" href="/config/env">
        <span class="icon">🔧</span> Environment
      </a>
    </div>

    <div class="sidebar-footer">
      <div class="status-pill">
        <div class="dot" id="connection-dot"></div>
        <span id="connection-text">Connected</span>
      </div>
    </div>
  </aside>

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
        <button class="btn-sm btn-primary" onclick="startSession()">▶ Run Session</button>
      </div>
    </div>

    <div class="content">
      <!-- Metrics -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-header">
            <div class="metric-label">Active Agents</div>
            <div class="metric-icon">🤖</div>
          </div>
          <div class="metric-value" id="active-agents">0</div>
          <div class="metric-change positive" id="agents-change">↑ 0 from last hour</div>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <div class="metric-label">Total Actions</div>
            <div class="metric-icon">⚡</div>
          </div>
          <div class="metric-value" id="total-actions">0</div>
          <div class="metric-change positive" id="actions-change">↑ 0% this session</div>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <div class="metric-label">Bugs Found</div>
            <div class="metric-icon">🐛</div>
          </div>
          <div class="metric-value" id="bugs-found">0</div>
          <div class="metric-change negative" id="bugs-change">↓ 0 from yesterday</div>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <div class="metric-label">Success Rate</div>
            <div class="metric-icon">✓</div>
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
        updateMetrics(data.data);
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
    }
  }

  function updateStatus(status) {
    const isRunning = status.isRunning;
    const indicator = document.getElementById('agent-status-indicator');
    const statusText = document.getElementById('agent-status-text');
    const stopBtn = document.getElementById('stop-btn');
    const pauseBtn = document.getElementById('pause-btn');
    
    // Update sidebar connection text
    document.getElementById('connection-text').textContent = isRunning ? 'Running' : 'Connected';
    
    // Update session footer status
    indicator.className = 'status-indicator ' + (isRunning ? 'running' : 'idle');
    statusText.textContent = isRunning ? 'Running' : 'Idle';
    
    // Update target URL
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
  }

  function updateMetrics(session) {
    document.getElementById('active-agents').textContent = session.active_agents || 0;
    document.getElementById('total-actions').textContent = session.total_actions || 0;
    document.getElementById('bugs-found').textContent = session.bugs_found || 0;
    
    const rate = session.success_rate;
    document.getElementById('success-rate').textContent = rate > 0 ? rate + '%' : '—';
    
    // Update chart data
    const now = new Date();
    const timeLabel = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    
    if (chartData.labels.length > 7) {
      chartData.labels.shift();
      chartData.actions.shift();
      chartData.successRates.shift();
    }
    
    chartData.labels.push(timeLabel);
    chartData.actions.push(session.total_actions || 0);
    chartData.successRates.push(rate || 0);
    
    if (performanceChart) {
      performanceChart.data.labels = chartData.labels;
      performanceChart.data.datasets[0].data = chartData.actions;
      performanceChart.data.datasets[1].data = chartData.successRates;
      performanceChart.update('none');
    }
  }

  function updateAgents(agents) {
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
          grid: { color: 'rgba(255,255,255,0.04)' }
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
          label: 'Actions/min',
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

    // Activity Chart
    const actCtx = document.getElementById('activityChart').getContext('2d');
    activityChart = new Chart(actCtx, {
      type: 'bar',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'Tests',
          data: [0, 0, 0, 0, 0, 0, 0],
          backgroundColor: '#f97316'
        }, {
          label: 'Bugs',
          data: [0, 0, 0, 0, 0, 0, 0],
          backgroundColor: '#ef4444'
        }]
      },
      options: chartOptions
    });

    // Error Chart
    const errCtx = document.getElementById('errorChart').getContext('2d');
    errorChart = new Chart(errCtx, {
      type: 'doughnut',
      data: {
        labels: ['Success', 'Warnings', 'Errors'],
        datasets: [{
          data: [100, 0, 0],
          backgroundColor: ['#22c55e', '#f59e0b', '#ef4444']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            position: 'right',
            labels: { color: '#8b98a8', font: { size: 11 } }
          }
        }
      }
    });
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

  function switchAgentTab(tab) {
    const agentsTabs = document.querySelectorAll('#agents-table .tabs .tab');
    agentsTabs.forEach(t => t.classList.remove('active'));
    
    if (tab === 'specialists') {
      agentsTabs[1]?.classList.add('active');
      // Show specialists data
      const container = document.getElementById('agents-list');
      container.innerHTML = \`
        <div class="table-row">
          <div class="agent-name">Browser Specialist</div>
          <div><span class="status-badge idle">idle</span></div>
          <div>0</div>
          <div>—</div>
        </div>
        <div class="table-row">
          <div class="agent-name">API Tester</div>
          <div><span class="status-badge idle">idle</span></div>
          <div>0</div>
          <div>—</div>
        </div>
        <div class="table-row">
          <div class="agent-name">Auth Specialist</div>
          <div><span class="status-badge idle">idle</span></div>
          <div>0</div>
          <div>—</div>
        </div>
        <div class="table-row">
          <div class="agent-name">UI Tester</div>
          <div><span class="status-badge idle">idle</span></div>
          <div>0</div>
          <div>—</div>
        </div>
        <div class="table-row">
          <div class="agent-name">Security Scanner</div>
          <div><span class="status-badge idle">idle</span></div>
          <div>0</div>
          <div>—</div>
        </div>
      \`;
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
    
    const agentTypes = {
      'Main Agent': { x: 200, y: 30, color: '#f97316', class: 'main' },
      'Browser Specialist': { x: 80, y: 120, color: '#22c55e', class: 'browser' },
      'API Tester': { x: 200, y: 120, color: '#f59e0b', class: 'api' },
      'Auth Specialist': { x: 320, y: 120, color: '#ef4444', class: 'auth' },
      'UI Tester': { x: 80, y: 210, color: '#8b5cf6', class: 'ui' },
      'Performance': { x: 200, y: 210, color: '#06b6d4', class: 'perf' },
      'Security Scanner': { x: 320, y: 210, color: '#ec4899', class: 'security' }
    };

    let html = '<div class="hierarchy-badge">● Main Agent</div>';
    html += '<svg width="100%" height="100%" style="position:absolute;top:0;left:0;">';
    
    // Draw connections
    html += '<line x1="240" y1="50" x2="120" y2="120" stroke="#333" stroke-width="2" stroke-dasharray="4"/>';
    html += '<line x1="240" y1="50" x2="240" y2="120" stroke="#333" stroke-width="2" stroke-dasharray="4"/>';
    html += '<line x1="240" y1="50" x2="360" y2="120" stroke="#333" stroke-width="2" stroke-dasharray="4"/>';
    html += '<line x1="120" y1="140" x2="120" y2="210" stroke="#333" stroke-width="2" stroke-dasharray="4"/>';
    html += '<line x1="240" y1="140" x2="240" y2="210" stroke="#333" stroke-width="2" stroke-dasharray="4"/>';
    html += '<line x1="360" y1="140" x2="360" y2="210" stroke="#333" stroke-width="2" stroke-dasharray="4"/>';
    
    html += '</svg>';

    // Draw nodes
    agents.forEach(agent => {
      const config = agentTypes[agent.name];
      if (config) {
        const isActive = agent.status === 'running';
        html += \`<div class="agent-node \${config.class}" style="left:\${config.x}px;top:\${config.y}px;opacity:\${isActive ? 1 : 0.5}">
          \${isActive ? '●' : '○'} \${agent.name.split(' ')[0]}
        </div>\`;
      }
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

  // Actions
  async function startSession() {
    try {
      const response = await fetch('/api/agent/start', { method: 'POST', credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        addActivity({ type: 'success', message: 'Session started', timestamp: new Date().toISOString() });
      } else {
        addActivity({ type: 'error', message: result.error || 'Failed to start session', timestamp: new Date().toISOString() });
      }
    } catch (error) {
      addActivity({ type: 'error', message: 'Failed to start session', timestamp: new Date().toISOString() });
    }
  }

  async function stopSession() {
    try {
      const response = await fetch('/api/agent/stop', { method: 'POST', credentials: 'include' });
      const result = await response.json();
      addActivity({
        type: result.success ? 'warning' : 'error',
        message: result.success ? 'Session stopped' : (result.error || 'Failed to stop session'),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      addActivity({ type: 'error', message: 'Failed to stop session', timestamp: new Date().toISOString() });
    }
  }
  
  async function pauseSession() {
    addActivity({ type: 'info', message: 'Pause requested...', timestamp: new Date().toISOString() });
  }

  // Load initial data
  async function loadInitialData() {
    try {
      const creds = { credentials: 'include' };
      const [sessionsRes, bugsRes, tasksRes, issuesRes, statusRes, agentsRes, metricsRes, sessionsHistRes] = await Promise.all([
        fetch('/api/sessions?limit=1', creds),
        fetch('/api/bugs', creds),
        fetch('/api/tasks', creds),
        fetch('/api/issues', creds),
        fetch('/api/status', creds),
        fetch('/api/dynamic-agents', creds),
        fetch('/api/metrics', creds),
        fetch('/api/sessions?limit=7', creds),
      ]);

      const sessions = await sessionsRes.json();
      const bugs = await bugsRes.json();
      const tasks = await tasksRes.json();
      const issues = await issuesRes.json();
      const status = await statusRes.json();
      const agents = await agentsRes.json();
      const metrics = await metricsRes.json();
      const sessionsHistory = await sessionsHistRes.json();

      // Update status indicator
      updateStatus(status);

      // Update metrics cards
      if (sessions.length > 0) {
        const session = sessions[0];
        updateMetrics({
          active_agents: agents.filter(a => a.status === 'running').length,
          total_actions: session.total_actions || 0,
          bugs_found: session.bugs_found || 0,
          success_rate: session.total_actions > 0
            ? Math.round(((session.total_actions - (session.bugs_found || 0)) / session.total_actions) * 100)
            : 0
        });
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

      // Kanban badge = open bugs
      const openBugs = bugs.filter(b => b.status === 'open' || b.status === 'in-progress');
      document.getElementById('kanban-count').textContent = openBugs.length || 0;

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

  // Initialize
  window.addEventListener('load', () => {
    initCharts();
    connectWebSocket();
    loadInitialData();
  });
</script>

</body>
</html>`;
}

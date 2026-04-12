/**
 * Shared CSS styles for all dashboard pages
 */

export function getBaseStyles(): string {
  return `
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

    html, body { 
      height: 100%; 
      background: var(--bg); 
      font-family: var(--sans); 
      color: var(--text-1); 
    }
    
    /* Layout - Copié du dashboard */
    .shell {
      display: grid;
      grid-template-columns: 220px 1fr;
      min-height: 100vh;
    }

    /* Sidebar - Copié du dashboard */
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

    /* Logo - Copié du dashboard */
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

    /* Navigation - Copié du dashboard */
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
    .nav-item .icon { font-size: 24px; width: 24px; text-align: center; }
    .nav-item .icon svg { width: 24px; height: 24px; }
    .nav-item .badge {
      margin-left: auto;
      background: var(--accent);
      color: white;
      font-size: 12px;
      padding: 2px 6px;
      border-radius: 10px;
      font-weight: 700;
    }

    /* Sidebar footer - Copié du dashboard */
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

    /* Main - Copié du dashboard */
    main {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      overflow-y: auto;
    }

    /* Topbar - Copié du dashboard */
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

    /* Content - Copié du dashboard */
    .content {
      padding: 28px 32px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: all 0.15s;
      font-family: var(--sans);
    }
    .btn-primary {
      background: var(--accent);
      color: white;
    }
    .btn-primary:hover { filter: brightness(1.1); }
    .btn-ghost {
      background: var(--panel);
      color: var(--text-2);
      border: 1px solid var(--border);
    }
    .btn-ghost:hover { background: var(--border-hi); color: var(--text-1); }

    /* Empty state */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      text-align: center;
      color: var(--text-3);
    }
    .empty-state svg { width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5; }
    .empty-state h3 { font-size: 16px; color: var(--text-2); margin-bottom: 8px; }

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
  `;
}

export function getFontsLink(): string {
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet">`;
}

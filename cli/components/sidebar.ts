/**
 * Shared sidebar component for all dashboard pages
 * Copié depuis dashboard.html.ts - Structure de référence
 */

export type PageId = 'dashboard' | 'kanban' | 'sessions' | 'issues' | 'tests' | 'coverage' | 'logs' | 'config' | 'env';

export interface SidebarOptions {
  activePage: PageId;
}

export function getSidebarHTML(options: SidebarOptions): string {
  const { activePage } = options;

  const isActive = (page: PageId) => activePage === page ? ' active' : '';

  return `
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
        <a class="nav-item${isActive('dashboard')}" href="/">
          <span class="icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>
          </span> Dashboard
        </a>
        <a class="nav-item${isActive('kanban')}" href="/kanban">
          <span class="icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7v7"/><path d="M12 7v4"/><path d="M16 7v9"/><path d="M5 3a2 2 0 0 0-2 2"/><path d="M9 3h1"/><path d="M14 3h1"/><path d="M19 3a2 2 0 0 1 2 2"/><path d="M21 9v1"/><path d="M21 14v1"/><path d="M21 19a2 2 0 0 1-2 2"/><path d="M14 21h1"/><path d="M9 21h1"/><path d="M5 21a2 2 0 0 1-2-2"/><path d="M3 14v1"/><path d="M3 9v1"/></svg>
          </span> Kanban
        </a>

        <div class="nav-label">Testing</div>
                <a class="nav-item${isActive('sessions')}" href="/sessions">
          <span class="icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/></svg>
          </span> Sessions
        </a>
        <a class="nav-item${isActive('issues')}" href="/issues">
          <span class="icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
          </span> Issues
        </a>
        <a class="nav-item${isActive('tests')}" href="/tests">
          <span class="icon">
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bug-play-icon lucide-bug-play"><path d="M10 19.655A6 6 0 0 1 6 14v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 3.97"/><path d="M14 15.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997a1 1 0 0 1-1.517-.86z"/><path d="M14.12 3.88 16 2"/><path d="M21 5a4 4 0 0 1-3.55 3.97"/><path d="M3 21a4 4 0 0 1 3.81-4"/><path d="M3 5a4 4 0 0 0 3.55 3.97"/><path d="M6 13H2"/><path d="m8 2 1.88 1.88"/><path d="M9 7.13V6a3 3 0 1 1 6 0v1.13"/></svg>
          </span> Tests
        </a>
        <a class="nav-item${isActive('coverage')}" href="/coverage">
          <span class="icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/></svg>
          </span> Coverage
        </a>
        <a class="nav-item${isActive('logs')}" href="/logs">
          <span class="icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 12h8"/><path d="M13 18h8"/><path d="M13 6h8"/><path d="M3 12h1"/><path d="M3 18h1"/><path d="M3 6h1"/><path d="M8 12h1"/><path d="M8 18h1"/><path d="M8 6h1"/></svg>
          </span> Logs
        </a>

        <div class="nav-label">System</div>
        <a class="nav-item${isActive('config')}" href="/config">
          <span class="icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v4"/><path d="m14.305 7.53.923-.382"/><path d="m15.228 4.852-.923-.383"/><path d="m16.852 3.228-.383-.924"/><path d="m16.852 8.772-.383.923"/><path d="m19.148 3.228.383-.924"/><path d="m19.53 9.696-.382-.924"/><path d="m20.772 4.852.924-.383"/><path d="m20.772 7.148.924.383"/><path d="M22 13v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><path d="M8 21h8"/><circle cx="18" cy="6" r="3"/></svg>
          </span> Config
        </a>
        <a class="nav-item${isActive('env')}" href="/config/env">
          <span class="icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5.5"/><path d="m14.3 19.6 1-.4"/><path d="M15 3v7.5"/><path d="m15.2 16.9-.9-.3"/><path d="m16.6 21.7.3-.9"/><path d="m16.8 15.3-.4-1"/><path d="m19.1 15.2.3-.9"/><path d="m19.6 21.7-.4-1"/><path d="m20.7 16.8 1-.4"/><path d="m21.7 19.4-.9-.3"/><path d="M9 3v18"/><circle cx="18" cy="18" r="3"/></svg>
          </span> Environment
        </a>
      </div>

      <div class="sidebar-footer">
        <div class="status-pill">
          <div class="dot" id="connection-dot"></div>
          <span id="connection-text">Connected</span>
        </div>
      </div>
    </aside>
  `;
}

export function getSidebarStyles(): string {
  return `
    aside {
      width: 240px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      position: fixed;
      height: 100vh;
      z-index: 100;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 16px;
      border-bottom: 1px solid var(--border);
    }
    .logo-mark {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
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
    .connection-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      font-size: 12px;
      color: var(--text-2);
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--green);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .nav-section {
      padding: 16px 12px;
      flex: 1;
      overflow-y: auto;
    }
    .nav-label {
      font-size: 10px;
      font-weight: 700;
      color: var(--text-3);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 8px 12px 6px;
      margin-top: 8px;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-2);
      text-decoration: none;
      transition: all 0.15s;
    }
    .nav-item:hover {
      background: var(--panel);
      color: var(--text-1);
    }
    .nav-item.active {
      background: var(--accent-lo);
      color: var(--accent);
    }
    .nav-item .icon {
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .nav-item .icon svg {
      width: 18px;
      height: 18px;
    }
    .sidebar-footer {
      padding: 16px;
      border-top: 1px solid var(--border);
    }
  `;
}

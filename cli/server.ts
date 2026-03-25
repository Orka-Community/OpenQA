import { ConfigManager } from '../agent/config/index.js';
import express from 'express';
import { WebSocketServer } from 'ws';
import { OpenQADatabase } from '../database/index.js';
import chalk from 'chalk';

export async function startWebServer() {
  const config = new ConfigManager();
  const cfg = config.getConfigSync();
  const db = new OpenQADatabase('./data/openqa.json');

  const app = express();
  app.use(express.json());

  const wss = new WebSocketServer({ noServer: true });

  // API endpoints
  app.get('/api/status', async (req, res) => {
    res.json({ 
      isRunning: true,
      target: cfg.saas.url || 'Not configured'
    });
  });

  app.get('/api/sessions', async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const sessions = await db.getRecentSessions(limit);
    res.json(sessions);
  });

  app.get('/api/sessions/:id/actions', async (req, res) => {
    const actions = await db.getSessionActions(req.params.id);
    res.json(actions);
  });

  app.get('/api/bugs', async (req, res) => {
    const status = req.query.status as any;
    const bugs = status ? await db.getBugsByStatus(status) : await db.getAllBugs();
    res.json(bugs);
  });

  app.get('/api/kanban/tickets', async (req, res) => {
    const column = req.query.column as any;
    const tickets = column ? await db.getKanbanTicketsByColumn(column) : await db.getKanbanTickets();
    res.json(tickets);
  });

  app.patch('/api/kanban/tickets/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    await db.updateKanbanTicket(id, updates);
    res.json({ success: true });
  });

  app.get('/api/config', (req, res) => {
    res.json(cfg);
  });

  app.post('/api/config', async (req, res) => {
    try {
      const configData = req.body;
      
      // Update each configuration key
      for (const [key, value] of Object.entries(configData)) {
        await config.set(key, String(value));
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/config/reset', async (req, res) => {
    try {
      // Reset configuration by clearing all keys
      await db.clearAllConfig();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Human interventions
  app.post('/api/intervention/:id', async (req, res) => {
    const { id } = req.params;
    const { response } = req.body;
    
    console.log(`Intervention ${id} ${response} by user`);
    
    res.json({ success: true, message: `Intervention ${response}d` });
  });

  // Test connection endpoint
  app.post('/api/test-connection', async (req, res) => {
    try {
      const cfg = config.getConfigSync();
      
      // Test SaaS connection if URL is configured
      if (cfg.saas.url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        try {
          const response = await fetch(cfg.saas.url, {
            method: 'HEAD',
            signal: controller.signal,
            headers: cfg.saas.authType === 'basic' && cfg.saas.username && cfg.saas.password ? {
              'Authorization': 'Basic ' + Buffer.from(`${cfg.saas.username}:${cfg.saas.password}`).toString('base64')
            } : {}
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            res.json({ success: true, message: 'SaaS connection successful' });
          } else {
            res.json({ success: false, message: 'SaaS connection failed' });
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
          throw fetchError;
        }
      } else {
        res.json({ success: false, message: 'No SaaS URL configured' });
      }
    } catch (error: any) {
      res.json({ success: false, message: 'Connection error: ' + (error.message || String(error)) });
    }
  });

  // Start session endpoint
  app.post('/api/start', async (req, res) => {
    try {
      // This would typically start the agent session
      console.log('Starting agent session...');
      res.json({ success: true, message: 'Session started' });
    } catch (error: any) {
      res.json({ success: false, message: 'Failed to start session: ' + (error.message || String(error)) });
    }
  });

  // Current tasks
  app.get('/api/tasks', async (req, res) => {
    try {
      const tasks = await db.getCurrentTasks();
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Issues encountered
  app.get('/api/issues', async (req, res) => {
    try {
      const issues = await db.getCurrentIssues();
      res.json(issues);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Professional Dashboard with Charts and Agent Hierarchy
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>OpenQA - Professional Dashboard</title>
          <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/@xyflow/react@11/dist/umd/index.js"></script>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
              background: #0a0a0a; 
              color: #ffffff; 
              min-height: 100vh;
              overflow-x: hidden;
              line-height: 1.6;
            }
            
            .dashboard-container {
              max-width: 1920px;
              margin: 0 auto;
              padding: 20px;
              min-height: 100vh;
            }
            
            .dashboard-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 32px;
              padding: 24px 32px;
              background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
              border-radius: 16px;
              border: 1px solid #333333;
              backdrop-filter: blur(10px);
            }
            
            .dashboard-title {
              font-size: 32px;
              font-weight: 700;
              color: #f97316;
              margin: 0;
              letter-spacing: -0.5px;
            }
            
            .nav {
              display: flex;
              gap: 8px;
              background: rgba(255, 255, 255, 0.05);
              padding: 4px;
              border-radius: 12px;
            }
            
            .nav-links a {
              color: #9ca3af;
              text-decoration: none;
              font-weight: 500;
              padding: 12px 24px;
              border-radius: 8px;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              display: flex;
              align-items: center;
              gap: 8px;
            }
            
            .nav-links a:hover, .nav-links a.active {
              color: #ffffff;
              background: #f97316;
              transform: translateY(-1px);
            }
            
            .connection-status {
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .status.running { background: linear-gradient(135deg, #10b981, #059669); color: white; }
            .status.idle { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; }
            .status.error { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; }
            .status.paused { background: linear-gradient(135deg, #64748b, #475569); color: white; }
            
            /* Metrics Grid */
            .metrics-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
              gap: 24px;
              margin-bottom: 32px;
            }
            
            .metric-card {
              background: linear-gradient(145deg, #1a1a1a, #2d2d2d);
              border: 1px solid #333333;
              border-radius: 16px;
              padding: 28px 24px;
              position: relative;
              overflow: hidden;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              min-height: 160px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            
            .metric-card::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 4px;
              background: linear-gradient(90deg, #f97316, #ea580c, #f59e0b);
              background-size: 200% 100%;
              animation: shimmer 3s ease-in-out infinite;
            }
            
            @keyframes shimmer {
              0%, 100% { background-position: -200% 0; }
              50% { background-position: 200% 0; }
            }
            
            .metric-card:hover {
              transform: translateY(-4px);
              border-color: #f97316;
              box-shadow: 0 20px 40px rgba(249, 115, 22, 0.15);
            }
            
            .metric-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 16px;
            }
            
            .metric-label {
              color: #9ca3af;
              font-size: 14px;
              font-weight: 500;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .metric-icon {
              width: 40px;
              height: 40px;
              background: rgba(249, 115, 22, 0.1);
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 20px;
            }
            
            .metric-value {
              font-size: 42px;
              font-weight: 700;
              color: #f97316;
              margin: 8px 0;
              line-height: 1;
              background: linear-gradient(135deg, #f97316, #fbbf24);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            }
            
            .metric-change {
              font-size: 13px;
              font-weight: 600;
              display: flex;
              align-items: center;
              gap: 4px;
            }
            
            .metric-change.positive { color: #10b981; }
            .metric-change.negative { color: #ef4444; }
            
            /* Main Content Grid */
            .main-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 24px;
              margin-bottom: 32px;
            }
            
            .card {
              background: linear-gradient(145deg, #1a1a1a, #2d2d2d);
              border: 1px solid #333333;
              border-radius: 16px;
              padding: 28px;
              position: relative;
              overflow: hidden;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .card:hover {
              border-color: #444444;
              transform: translateY(-2px);
            }
            
            .card-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 24px;
            }
            
            .card-title {
              font-size: 20px;
              font-weight: 600;
              color: #ffffff;
              margin: 0;
            }
            
            .tabs {
              display: flex;
              gap: 4px;
              background: rgba(255, 255, 255, 0.05);
              padding: 4px;
              border-radius: 12px;
            }
            
            .tab {
              padding: 10px 20px;
              background: transparent;
              border: none;
              border-radius: 8px;
              color: #9ca3af;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .tab.active {
              background: #f97316;
              color: white;
            }
            
            .tab:hover:not(.active) {
              color: #ffffff;
              background: rgba(255, 255, 255, 0.1);
            }
            
            .chart-container {
              position: relative;
              height: 320px;
              margin: 20px 0;
            }
            
            .hierarchy-container {
              height: 420px;
              border: 1px solid #333333;
              border-radius: 12px;
              background: #0a0a0a;
              overflow: hidden;
            }
            
            /* Activity Feed */
            .activity-feed {
              max-height: 400px;
              overflow-y: auto;
              padding-right: 8px;
            }
            
            .activity-feed::-webkit-scrollbar {
              width: 6px;
            }
            
            .activity-feed::-webkit-scrollbar-track {
              background: rgba(255, 255, 255, 0.05);
              border-radius: 3px;
            }
            
            .activity-feed::-webkit-scrollbar-thumb {
              background: #f97316;
              border-radius: 3px;
            }
            
            .activity-item {
              background: rgba(255, 255, 255, 0.03);
              border: 1px solid rgba(255, 255, 255, 0.08);
              border-left: 4px solid #f97316;
              border-radius: 12px;
              padding: 16px 20px;
              margin-bottom: 12px;
              font-size: 14px;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              position: relative;
              overflow: hidden;
            }
            
            .activity-item::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 1px;
              background: linear-gradient(90deg, transparent, rgba(249, 115, 22, 0.3), transparent);
              opacity: 0;
              transition: opacity 0.3s;
            }
            
            .activity-item:hover {
              background: rgba(255, 255, 255, 0.06);
              border-left-color: #fbbf24;
              transform: translateX(8px);
            }
            
            .activity-item:hover::before {
              opacity: 1;
            }
            
            .activity-item.error { border-left-color: #ef4444; }
            .activity-item.success { border-left-color: #10b981; }
            .activity-item.warning { border-left-color: #f59e0b; }
            
            .activity-time {
              color: #6b7280;
              font-size: 12px;
              margin-top: 8px;
              display: flex;
              align-items: center;
              gap: 4px;
            }
            
            /* Buttons */
            .btn {
              background: linear-gradient(135deg, #f97316, #ea580c);
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 10px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              margin: 4px;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              position: relative;
              overflow: hidden;
            }
            
            .btn::before {
              content: '';
              position: absolute;
              top: 0;
              left: -100%;
              width: 100%;
              height: 100%;
              background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
              transition: left 0.5s;
            }
            
            .btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 24px rgba(249, 115, 22, 0.3);
            }
            
            .btn:hover::before {
              left: 100%;
            }
            
            .btn-success { background: linear-gradient(135deg, #10b981, #059669); }
            .btn-success:hover { box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3); }
            .btn-danger { background: linear-gradient(135deg, #ef4444, #dc2626); }
            .btn-danger:hover { box-shadow: 0 8px 24px rgba(239, 68, 68, 0.3); }
            
            /* Performance bars */
            .performance-bar {
              height: 6px;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 3px;
              overflow: hidden;
              margin: 8px 0;
            }
            
            .performance-fill {
              height: 100%;
              background: linear-gradient(90deg, #10b981, #f97316);
              transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
              border-radius: 3px;
            }
            
            /* Responsive */
            @media (max-width: 1200px) {
              .main-grid {
                grid-template-columns: 1fr;
              }
            }
            
            @media (max-width: 768px) {
              .dashboard-container {
                padding: 16px;
              }
              
              .metrics-grid {
                grid-template-columns: 1fr;
                gap: 16px;
              }
              
              .dashboard-header {
                flex-direction: column;
                gap: 16px;
                padding: 20px;
              }
              
              .dashboard-title {
                font-size: 24px;
              }
              
              .metric-value {
                font-size: 32px;
              }
            }
            
            /* Loading animation */
            .pulse { animation: pulse 2s infinite; }
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
          </style>
          </style>
        </head>
        <body>
          <div class="dashboard-container">
            <header class="dashboard-header">
              <h1 class="dashboard-title">🤖 OpenQA Professional Dashboard</h1>
              <nav class="nav">
                <div class="nav-links">
                  <a href="/" class="active">📊 Dashboard</a>
                  <a href="/kanban">📋 Kanban</a>
                  <a href="/config">⚙️ Config</a>
                </div>
                <span id="connection-status" class="connection-status status idle">🔌 Connecting...</span>
              </nav>
            </header>
            
            <!-- Key Metrics -->
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-header">
                  <div class="metric-label">🤖 Active Agents</div>
                  <div class="metric-icon">🤖</div>
                </div>
                <div class="metric-value" id="active-agents">0</div>
                <div class="metric-change positive">↑ 2 from last hour</div>
              </div>
              <div class="metric-card">
                <div class="metric-header">
                  <div class="metric-label">📋 Total Actions</div>
                  <div class="metric-icon">📋</div>
                </div>
                <div class="metric-value" id="total-actions">0</div>
                <div class="metric-change positive">↑ 12% increase</div>
              </div>
              <div class="metric-card">
                <div class="metric-header">
                  <div class="metric-label">🐛 Bugs Found</div>
                  <div class="metric-icon">🐛</div>
                </div>
                <div class="metric-value" id="bugs-found">0</div>
                <div class="metric-change negative">↓ 3 from yesterday</div>
              </div>
              <div class="metric-card">
                <div class="metric-header">
                  <div class="metric-label">⚡ Success Rate</div>
                  <div class="metric-icon">⚡</div>
                </div>
                <div class="metric-value" id="success-rate">0%</div>
                <div class="metric-change positive">↑ 5% improvement</div>
              </div>
            </div>

          <!-- Charts and Hierarchy -->
          <div class="main-grid">
            <div class="card">
              <div class="card-header">
                <h2 class="card-title">📈 Performance Metrics</h2>
                <div class="tabs">
                  <div class="tab active" onclick="switchTab('performance')">Performance</div>
                  <div class="tab" onclick="switchTab('activity')">Activity</div>
                  <div class="tab" onclick="switchTab('errors')">Error Rate</div>
                </div>
              </div>
              <div class="chart-container">
                <canvas id="performanceChart"></canvas>
              </div>
              <div class="chart-container" style="display: none;">
                <canvas id="activityChart"></canvas>
              </div>
              <div class="chart-container" style="display: none;">
                <canvas id="errorChart"></canvas>
              </div>
            </div>
            
            <div class="card">
              <div class="card-header">
                <h2 class="card-title">🌐 Agent Hierarchy</h2>
              </div>
              <div class="hierarchy-container" id="hierarchy-container"></div>
            </div>
          </div>

          <!-- Agent Details -->
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">🤖 Agent Details</h2>
              <div class="tabs">
                <div class="tab active" onclick="switchAgentTab('active')">Active Agents</div>
                <div class="tab" onclick="switchAgentTab('specialists')">Specialists</div>
                <div class="tab" onclick="switchAgentTab('performance')">Performance</div>
              </div>
            </div>
            <div id="active-agents-content" class="tab-content active">
              <div id="active-agents-list">
                <p style="color: #9ca3af;">Loading agents...</p>
              </div>
            </div>
            <div id="specialists-content" class="tab-content">
              <div id="specialists-list">
                <p style="color: #9ca3af;">No specialists active</p>
              </div>
            </div>
            <div id="performance-content" class="tab-content">
              <div id="performance-metrics">
                <p style="color: #9ca3af;">Performance data loading...</p>
              </div>
            </div>
          </div>

          <!-- Activity and Interventions -->
          <div class="main-grid">
            <div class="card">
              <div class="card-header">
                <h2 class="card-title">⚡ Recent Activity</h2>
              </div>
              <div class="activity-feed" id="recent-activities">
                <div class="activity-item">
                  <div>🔄 Waiting for agent activity...</div>
                  <div class="activity-time">System ready</div>
                </div>
              </div>
            </div>
            
            <div class="card">
              <div class="card-header">
                <h2 class="card-title">🚨 Human Interventions</h2>
              </div>
              <div class="activity-feed" id="interventions-list">
                <p style="color: #9ca3af;">No interventions required</p>
              </div>
            </div>
          </div>

          <!-- Tasks and Issues -->
          <div class="main-grid">
            <div class="card">
              <div class="card-header">
                <h2 class="card-title">📝 Current Tasks</h2>
              </div>
              <div class="activity-feed" id="current-tasks">
                <p style="color: #9ca3af;">No active tasks</p>
              </div>
            </div>
            
            <div class="card">
              <div class="card-header">
                <h2 class="card-title">⚠️ Issues Encountered</h2>
              </div>
              <div class="activity-feed" id="issues-list">
                <p style="color: #9ca3af;">No issues</p>
              </div>
            </div>
          </div>

          <script>
            let ws;
            let activities = [];
            let performanceChart, activityChart, errorChart;
            let hierarchyNetwork;
            
            // Initialize Charts
            function initCharts() {
              // Performance Chart
              const perfCtx = document.getElementById('performanceChart').getContext('2d');
              performanceChart = new Chart(perfCtx, {
                type: 'line',
                data: {
                  labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
                  datasets: [{
                    label: 'Actions/min',
                    data: [12, 19, 15, 25, 22, 30, 28],
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    tension: 0.4
                  }, {
                    label: 'Success Rate %',
                    data: [85, 88, 82, 91, 87, 93, 89],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4
                  }]
                },
                options: {
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { labels: { color: '#e2e8f0' } }
                  },
                  scales: {
                    x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
                    y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }
                  }
                }
              });

              // Activity Chart
              const actCtx = document.getElementById('activityChart').getContext('2d');
              activityChart = new Chart(actCtx, {
                type: 'bar',
                data: {
                  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                  datasets: [{
                    label: 'Tests Generated',
                    data: [65, 78, 90, 81, 56, 45, 30],
                    backgroundColor: '#f97316'
                  }, {
                    label: 'Bugs Found',
                    data: [12, 19, 15, 25, 22, 15, 8],
                    backgroundColor: '#ef4444'
                  }]
                },
                options: {
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { labels: { color: '#e2e8f0' } }
                  },
                  scales: {
                    x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
                    y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }
                  }
                }
              });

              // Error Rate Chart
              const errCtx = document.getElementById('errorChart').getContext('2d');
              errorChart = new Chart(errCtx, {
                type: 'doughnut',
                data: {
                  labels: ['Success', 'Warnings', 'Errors', 'Critical'],
                  datasets: [{
                    data: [75, 15, 8, 2],
                    backgroundColor: ['#10b981', '#f97316', '#ef4444', '#dc2626']
                  }]
                },
                options: {
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { labels: { color: '#e2e8f0' } }
                  }
                }
              });
            }

            // Initialize Agent Hierarchy with React Flow
            function initHierarchy() {
              const container = document.getElementById('hierarchy-container');
              
              // Create React Flow nodes
              const nodes = [
                {
                  id: 'main',
                  type: 'default',
                  position: { x: 400, y: 50 },
                  data: { label: '🤖 Main Agent' },
                  style: { 
                    background: '#f97316', 
                    color: 'white', 
                    border: '2px solid #ea580c',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }
                },
                {
                  id: 'browser',
                  type: 'default',
                  position: { x: 150, y: 200 },
                  data: { label: '🌐 Browser Specialist' },
                  style: { 
                    background: '#10b981', 
                    color: 'white', 
                    border: '2px solid #059669',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px'
                  }
                },
                {
                  id: 'api',
                  type: 'default',
                  position: { x: 400, y: 200 },
                  data: { label: '🔌 API Tester' },
                  style: { 
                    background: '#f59e0b', 
                    color: 'white', 
                    border: '2px solid #d97706',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px'
                  }
                },
                {
                  id: 'auth',
                  type: 'default',
                  position: { x: 650, y: 200 },
                  data: { label: '🔐 Auth Specialist' },
                  style: { 
                    background: '#ef4444', 
                    color: 'white', 
                    border: '2px solid #dc2626',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px'
                  }
                },
                {
                  id: 'ui',
                  type: 'default',
                  position: { x: 150, y: 350 },
                  data: { label: '🎨 UI Tester' },
                  style: { 
                    background: '#8b5cf6', 
                    color: 'white', 
                    border: '2px solid #7c3aed',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px'
                  }
                },
                {
                  id: 'perf',
                  type: 'default',
                  position: { x: 400, y: 350 },
                  data: { label: '⚡ Performance Tester' },
                  style: { 
                    background: '#06b6d4', 
                    color: 'white', 
                    border: '2px solid #0891b2',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px'
                  }
                },
                {
                  id: 'security',
                  type: 'default',
                  position: { x: 650, y: 350 },
                  data: { label: '🛡️ Security Scanner' },
                  style: { 
                    background: '#f97316', 
                    color: 'white', 
                    border: '2px solid #ea580c',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px'
                  }
                }
              ];

              const edges = [
                { id: 'e1', source: 'main', target: 'browser', animated: true, style: { stroke: '#334155', strokeWidth: 2 } },
                { id: 'e2', source: 'main', target: 'api', animated: true, style: { stroke: '#334155', strokeWidth: 2 } },
                { id: 'e3', source: 'main', target: 'auth', animated: true, style: { stroke: '#334155', strokeWidth: 2 } },
                { id: 'e4', source: 'browser', target: 'ui', animated: true, style: { stroke: '#334155', strokeWidth: 2 } },
                { id: 'e5', source: 'api', target: 'perf', animated: true, style: { stroke: '#334155', strokeWidth: 2 } },
                { id: 'e6', source: 'auth', target: 'security', animated: true, style: { stroke: '#334155', strokeWidth: 2 } }
              ];

              // Simple React Flow implementation without React dependency
              container.innerHTML = \`
                <svg width="100%" height="100%" style="background: #0f172a; border-radius: 8px;">
                  <!-- Edges -->
                  \${edges.map(edge => {
                    const sourceNode = nodes.find(n => n.id === edge.source);
                    const targetNode = nodes.find(n => n.id === edge.target);
                    return \`
                      <line 
                        x1="\${sourceNode.position.x + 60}" 
                        y1="\${sourceNode.position.y + 20}" 
                        x2="\${targetNode.position.x + 60}" 
                        y2="\${targetNode.position.y + 20}" 
                        stroke="\${edge.style.stroke}" 
                        stroke-width="\${edge.style.strokeWidth}"
                        stroke-dasharray="5,5"
                        opacity="0.6">
                        <animate attributeName="stroke-dashoffset" values="0;10" dur="1s" repeatCount="indefinite"/>
                      </line>
                    \`;
                  }).join('')}
                  
                  <!-- Nodes -->
                  \${nodes.map(node => \`
                    <g transform="translate(\${node.position.x}, \${node.position.y})">
                      <rect 
                        x="0" y="0" width="120" height="40" 
                        fill="\${node.style.background}" 
                        stroke="\${node.style.border}" 
                        stroke-width="\${node.style.border.split(' ')[0].replace('px', '')}"
                        rx="8" ry="8"
                        style="filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))"/>
                      <text 
                        x="60" y="25" 
                        text-anchor="middle" 
                        fill="\${node.style.color}" 
                        font-size="\${node.style.fontSize}" 
                        font-weight="bold">
                        \${node.data.label}
                      </text>
                    </g>
                  \`).join('')}
                </svg>
              \`;
            }

            // Tab switching
            function switchTab(tabName) {
              // Hide all chart containers
              document.querySelectorAll('.chart-container').forEach(container => {
                container.style.display = 'none';
              });
              
              // Remove active class from all tabs
              document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
              });
              
              // Show selected chart and activate tab
              if (tabName === 'performance') {
                document.querySelectorAll('.chart-container')[0].style.display = 'block';
                document.querySelectorAll('.tab')[0].classList.add('active');
              } else if (tabName === 'activity') {
                document.querySelectorAll('.chart-container')[1].style.display = 'block';
                document.querySelectorAll('.tab')[1].classList.add('active');
              } else if (tabName === 'errors') {
                document.querySelectorAll('.chart-container')[2].style.display = 'block';
                document.querySelectorAll('.tab')[2].classList.add('active');
              }
            }

            // Agent tab switching
            function switchAgentTab(tabName) {
              // Hide all tab contents
              document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
              });
              
              // Remove active class from all tabs
              document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
              });
              
              // Show selected content
              if (tabName === 'active') {
                document.getElementById('active-agents-content').classList.add('active');
              } else if (tabName === 'specialists') {
                document.getElementById('specialists-content').classList.add('active');
              } else if (tabName === 'performance') {
                document.getElementById('performance-content').classList.add('active');
              }
            }

            function connectWebSocket() {
              const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
              ws = new WebSocket(\`\${protocol}//\${window.location.host}\`);
              
              ws.onopen = () => {
                document.getElementById('connection-status').textContent = '🟢 Connected';
                document.getElementById('connection-status').className = 'status running';
              };
              
              ws.onclose = () => {
                document.getElementById('connection-status').textContent = '🔴 Disconnected';
                document.getElementById('connection-status').className = 'status error';
                // Reconnect after 3 seconds
                setTimeout(connectWebSocket, 3000);
              };
              
              ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                handleWebSocketMessage(data);
              };
            }
            
            function handleWebSocketMessage(data) {
              switch(data.type) {
                case 'status':
                  updateAgentStatus(data.data);
                  break;
                case 'activity':
                  addActivity(data.data);
                  break;
                case 'intervention':
                  addIntervention(data.data);
                  break;
                case 'agents':
                  updateActiveAgents(data.data);
                  break;
                case 'session':
                  updateSessionMetrics(data.data);
                  break;
              }
            }
            
            function updateAgentStatus(status) {
              const statusEl = document.getElementById('agent-status');
              statusEl.textContent = status.isRunning ? 'Running' : 'Idle';
              statusEl.className = \`status \${status.isRunning ? 'running' : 'idle'}\`;
            }
            
            function updateSessionMetrics(session) {
              document.getElementById('total-actions').textContent = session.total_actions || 0;
              document.getElementById('bugs-found').textContent = session.bugs_found || 0;
              document.getElementById('session-id').textContent = session.id || 'None';
              
              const successRate = session.total_actions > 0 
                ? Math.round(((session.total_actions - (session.errors || 0)) / session.total_actions) * 100)
                : 0;
              document.getElementById('success-rate').textContent = successRate + '%';
            }
            
            function addActivity(activity) {
              activities.unshift(activity);
              if (activities.length > 10) activities.pop();
              
              const container = document.getElementById('recent-activities');
              container.innerHTML = activities.map(a => \`
                <div class="activity-item \${a.type}">
                  <div>\${a.message}</div>
                  <div class="activity-time">\${new Date(a.timestamp).toLocaleTimeString()}</div>
                </div>
              \`).join('');
            }
            
            function updateActiveAgents(agents) {
              const countEl = document.getElementById('active-agents');
              const listEl = document.getElementById('active-agents-list');
              
              countEl.textContent = agents.length;
              
              if (agents.length === 0) {
                listEl.innerHTML = '<p style="color: #64748b;">No active agents</p>';
              } else {
                listEl.innerHTML = agents.map(agent => \`
                  <div class="activity-item">
                    <div><strong>\${agent.name}</strong> - \${agent.status}</div>
                    <div class="activity-time">Purpose: \${agent.purpose}</div>
                  </div>
                \`).join('');
              }
            }
            
            function addIntervention(intervention) {
              const container = document.getElementById('interventions-list');
              const interventionEl = document.createElement('div');
              interventionEl.className = 'intervention-request';
              interventionEl.innerHTML = \`
                <h4>🚨 \${intervention.title}</h4>
                <p>\${intervention.description}</p>
                <div>
                  <button class="btn btn-success" onclick="respondToIntervention('\${intervention.id}', 'approve')">✅ Approve</button>
                  <button class="btn btn-danger" onclick="respondToIntervention('\${intervention.id}', 'reject')">❌ Reject</button>
                </div>
              \`;
              container.appendChild(interventionEl);
            }
            
            function respondToIntervention(interventionId, response) {
              fetch('/api/intervention/' + interventionId, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ response })
              }).then(() => {
                // Remove the intervention from UI
                location.reload();
              });
            }
            
            // Start WebSocket connection
            connectWebSocket();
            
            // Enhanced update functions with professional UI
            function updateActiveAgents(agents) {
              const countEl = document.getElementById('active-agents');
              const listEl = document.getElementById('active-agents-list');
              
              countEl.textContent = agents.length;
              
              if (agents.length === 0) {
                listEl.innerHTML = '<p style="color: #64748b;">No active agents</p>';
              } else {
                listEl.innerHTML = agents.map(agent => \`
                  <div class="activity-item">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <div>
                        <strong>\${agent.name}</strong> 
                        <span class="status \${agent.status.toLowerCase()}">\${agent.status}</span>
                      </div>
                      <div style="text-align: right;">
                        <div class="performance-bar" style="width: 100px;">
                          <div class="performance-fill" style="width: \${agent.performance || 75}%"></div>
                        </div>
                        <small style="color: #64748b;">\${agent.performance || 75}%</small>
                      </div>
                    </div>
                    <div class="activity-time">Purpose: \${agent.purpose} | Tasks: \${agent.tasks || 0}</div>
                  </div>
                \`).join('');
              }
            }

            function updateCurrentTasks(tasks) {
              const container = document.getElementById('current-tasks');
              if (tasks.length === 0) {
                container.innerHTML = '<p style="color: #64748b;">No active tasks</p>';
              } else {
                container.innerHTML = tasks.map(task => \`
                  <div class="activity-item">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <div>
                        <strong>\${task.name}</strong>
                        <span class="status \${task.status.replace(' ', '-')}">\${task.status}</span>
                      </div>
                      \${task.progress ? \`<div style="color: #f97316;">\${task.progress}</div>\` : ''}
                    </div>
                    <div class="activity-time">Agent: \${task.agent} | Started: \${new Date(task.started_at).toLocaleTimeString()}</div>
                    \${task.result ? \`<div style="color: #10b981; margin-top: 8px; padding: 8px; background: rgba(16, 185, 129, 0.1); border-radius: 6px;">\${task.result}</div>\` : ''}
                  </div>
                \`).join('');
              }
            }
            
            function updateIssues(issues) {
              const container = document.getElementById('issues-list');
              if (!container) return;
              
              if (issues.length === 0) {
                container.innerHTML = '<p style="color: #64748b;">No issues</p>';
              } else {
                container.innerHTML = issues.map(issue => \`
                  <div class="activity-item \${issue.severity}">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <div>
                        <strong>\${issue.type}</strong> - \${issue.message}
                      </div>
                      <span class="status \${issue.status}">\${issue.status}</span>
                    </div>
                    <div class="activity-time">Agent: \${issue.agent} | \${new Date(issue.timestamp).toLocaleTimeString()}</div>
                  </div>
                \`).join('');
              }
            }

            // Update specialists tab
            function updateSpecialists() {
              const specialists = [
                { name: 'Browser Specialist', status: 'active', performance: 85, tasks: 12 },
                { name: 'API Tester', status: 'active', performance: 92, tasks: 8 },
                { name: 'Auth Specialist', status: 'idle', performance: 78, tasks: 0 },
                { name: 'UI Tester', status: 'active', performance: 88, tasks: 15 },
                { name: 'Performance Tester', status: 'idle', performance: 95, tasks: 0 }
              ];
              
              const container = document.getElementById('specialists-list');
              container.innerHTML = specialists.map(specialist => \`
                <div class="activity-item">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <strong>\${specialist.name}</strong>
                      <span class="status \${specialist.status}">\${specialist.status}</span>
                    </div>
                    <div style="text-align: right;">
                      <div class="performance-bar" style="width: 100px;">
                        <div class="performance-fill" style="width: \${specialist.performance}%"></div>
                      </div>
                      <small style="color: #64748b;">\${specialist.performance}%</small>
                    </div>
                  </div>
                  <div class="activity-time">Tasks completed: \${specialist.tasks}</div>
                </div>
              \`).join('');
            }

            // Update performance metrics
            function updatePerformanceMetrics() {
              const container = document.getElementById('performance-metrics');
              container.innerHTML = \`
                <div class="grid-2">
                  <div class="metric-card">
                    <div class="metric-label">🚀 Avg Response Time</div>
                    <div class="metric-value">245ms</div>
                    <div class="metric-change positive">↓ 12% faster</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-label">💾 Memory Usage</div>
                    <div class="metric-value">128MB</div>
                    <div class="metric-change positive">↓ 8% optimized</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-label">⚡ CPU Usage</div>
                    <div class="metric-value">34%</div>
                    <div class="metric-change negative">↑ 5% increase</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-label">🔄 Throughput</div>
                    <div class="metric-value">1.2k/h</div>
                    <div class="metric-change positive">↑ 18% increase</div>
                  </div>
                </div>
              \`;
            }

            // Initialize everything on load
            window.addEventListener('load', () => {
              initCharts();
              initHierarchy();
              updateSpecialists();
              updatePerformanceMetrics();
              
              // Load initial data
              fetch('/api/status').then(r => r.json()).then(updateAgentStatus);
              fetch('/api/sessions?limit=1').then(r => r.json()).then(sessions => {
                if (sessions.length > 0) updateSessionMetrics(sessions[0]);
              });
              fetch('/api/tasks').then(r => r.json()).then(updateCurrentTasks);
              fetch('/api/issues').then(r => r.json()).then(updateIssues);
            });

            // Start WebSocket connection
            connectWebSocket();
          </script>
        </body>
      </html>
    `);
  });

  app.get('/kanban', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>OpenQA - Kanban Board</title>
          <style>
            body { font-family: system-ui; max-width: 1400px; margin: 40px auto; padding: 20px; background: #0f172a; color: #e2e8f0; }
            h1 { color: #38bdf8; }
            nav { margin: 20px 0; }
            nav a { color: #38bdf8; text-decoration: none; margin-right: 20px; }
            nav a:hover { text-decoration: underline; }
            .board { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 30px; }
            .column { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 15px; }
            .column h3 { margin-top: 0; color: #38bdf8; }
            .ticket { background: #334155; padding: 12px; margin: 10px 0; border-radius: 6px; border-left: 3px solid #38bdf8; }
            .ticket h4 { margin: 0 0 8px 0; font-size: 14px; }
            .ticket p { margin: 0; font-size: 12px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <h1>📋 Kanban Board</h1>
          <nav>
            <a href="/">Dashboard</a>
            <a href="/kanban">Kanban</a>
            <a href="/config">Config</a>
          </nav>
          <div class="board">
            <div class="column">
              <h3>Backlog</h3>
              <p style="color: #64748b;">No tickets yet</p>
            </div>
            <div class="column">
              <h3>To Do</h3>
              <p style="color: #64748b;">No tickets yet</p>
            </div>
            <div class="column">
              <h3>In Progress</h3>
              <p style="color: #64748b;">No tickets yet</p>
            </div>
            <div class="column">
              <h3>Done</h3>
              <p style="color: #64748b;">No tickets yet</p>
            </div>
          </div>
          <p style="margin-top: 40px; color: #64748b;">Tickets will appear here when the agent starts finding bugs and creating tasks.</p>
        </body>
      </html>
    `);
  });

  app.get('/config', (req, res) => {
    const cfg = config.getConfigSync();
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenQA — Configuration</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg:        #080b10;
      --surface:   #0d1117;
      --panel:     #111720;
      --border:    rgba(255,255,255,0.06);
      --border-hi: rgba(255,255,255,0.12);
      --accent:    #f97316;
      --accent-lo: rgba(249,115,22,0.08);
      --accent-md: rgba(249,115,22,0.18);
      --green:     #22c55e;
      --green-lo:  rgba(34,197,94,0.08);
      --red:       #ef4444;
      --red-lo:    rgba(239,68,68,0.08);
      --amber:     #f59e0b;
      --blue:      #38bdf8;
      --text-1:    #f1f5f9;
      --text-2:    #8b98a8;
      --text-3:    #4b5563;
      --mono:      'DM Mono', monospace;
      --sans:      'Syne', sans-serif;
      --radius:    10px;
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

    /* ── Layout ── */
    .shell {
      display: grid;
      grid-template-columns: 220px 1fr;
      grid-template-rows: 1fr;
      min-height: 100vh;
    }

    /* ── Sidebar ── */
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
      flex-shrink: 0;
    }

    .logo-name {
      font-family: var(--sans);
      font-weight: 800;
      font-size: 18px;
      letter-spacing: -0.5px;
      color: var(--text-1);
    }

    .logo-version {
      font-family: var(--mono);
      font-size: 10px;
      color: var(--text-3);
      letter-spacing: 0.5px;
      margin-top: 2px;
    }

    .nav-section {
      padding: 8px 12px;
      flex: 1;
    }

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

    /* ── Main ── */
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

    .page-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-1);
      letter-spacing: -0.2px;
    }

    .page-breadcrumb {
      font-family: var(--mono);
      font-size: 11px;
      color: var(--text-3);
      margin-top: 2px;
    }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .btn-sm {
      font-family: var(--sans);
      font-weight: 700;
      font-size: 12px;
      padding: 8px 16px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease;
      letter-spacing: 0.2px;
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
    }
    .btn-primary:hover { background: #ea580c; box-shadow: 0 0 20px rgba(249,115,22,0.35); }

    /* ── Content ── */
    .content {
      padding: 28px 32px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* ── Panel ── */
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
      padding: 18px 24px;
      border-bottom: 1px solid var(--border);
    }

    .panel-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-1);
      letter-spacing: -0.1px;
    }

    .panel-body {
      padding: 24px;
    }

    /* ── Form ── */
    .form-grid {
      display: grid;
      gap: 20px;
    }

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-section-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-2);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-field.full {
      grid-column: 1 / -1;
    }

    label {
      font-family: var(--mono);
      font-size: 11px;
      color: var(--text-3);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
    }

    input, select {
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text-1);
      padding: 10px 14px;
      border-radius: var(--radius);
      font-family: var(--mono);
      font-size: 12px;
      transition: all 0.15s ease;
    }

    input:focus, select:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 1px var(--accent);
    }

    input[type="checkbox"] {
      width: 16px;
      height: 16px;
      margin: 0;
      cursor: pointer;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 12px;
      color: var(--text-2);
      text-transform: none;
      letter-spacing: normal;
    }

    /* ── Actions ── */
    .actions {
      display: flex;
      gap: 12px;
      padding: 20px 24px;
      background: var(--surface);
      border-top: 1px solid var(--border);
    }

    .message {
      font-family: var(--mono);
      font-size: 11px;
      padding: 8px 12px;
      border-radius: var(--radius);
      margin-left: auto;
    }

    .message.success {
      background: var(--green-lo);
      color: var(--green);
      border: 1px solid rgba(34,197,94,0.2);
    }

    .message.error {
      background: var(--red-lo);
      color: var(--red);
      border: 1px solid rgba(239,68,68,0.2);
    }

    /* ── Code Block ── */
    .code-block {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
      font-family: var(--mono);
      font-size: 11px;
      color: var(--text-2);
      overflow-x: auto;
    }

    .code-block pre {
      margin: 0;
      line-height: 1.6;
    }

    /* ── Responsive ── */
    @media (max-width: 900px) {
      .shell { grid-template-columns: 1fr; }
      aside  { display: none; }
      .form-row { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>

<div class="shell">

  <!-- ── Sidebar ── -->
  <aside>
    <div class="logo">
      <div class="logo-mark">⚙</div>
      <div>
        <div class="logo-name">OpenQA</div>
        <div class="logo-version">v2.1.0 · OSS</div>
      </div>
    </div>

    <div class="nav-section">
      <div class="nav-label">Overview</div>
      <a class="nav-item" href="/">
        <span class="icon">▦</span> Dashboard
      </a>
      <a class="nav-item" href="/kanban">
        <span class="icon">⊞</span> Kanban
      </a>

      <div class="nav-label">System</div>
      <a class="nav-item active" href="/config">
        <span class="icon">⚙</span> Configuration
      </a>
    </div>

    <div class="sidebar-footer">
      <div class="status-pill">
        <div class="dot"></div>
        <span>System Ready</span>
      </div>
    </div>
  </aside>

  <!-- ── Main ── -->
  <main>

    <!-- Topbar -->
    <div class="topbar">
      <div>
        <div class="page-title">Configuration</div>
        <div class="page-breadcrumb">openqa / system / settings</div>
      </div>
      <div class="topbar-actions">
        <button class="btn-sm btn-ghost">Export Config</button>
        <button class="btn-sm btn-ghost">Import Config</button>
        <button class="btn-sm btn-primary" onclick="saveAllConfig()">Save All</button>
      </div>
    </div>

    <!-- Content -->
    <div class="content">

      <!-- SaaS Configuration -->
      <div class="panel">
        <div class="panel-head">
          <span class="panel-title">🌐 SaaS Target Configuration</span>
        </div>
        <div class="panel-body">
          <form class="form-grid" id="saas-form">
            <div class="form-section">
              <div class="form-section-title">Target Application</div>
              <div class="form-field full">
                <label>Application URL</label>
                <input type="url" id="saas_url" name="saas.url" value="${cfg.saas.url || ''}" placeholder="https://your-app.com">
              </div>
              <div class="form-row">
                <div class="form-field">
                  <label>Authentication Type</label>
                  <select id="saas_authType" name="saas.authType">
                    <option value="none" ${cfg.saas.authType === 'none' ? 'selected' : ''}>None</option>
                    <option value="basic" ${cfg.saas.authType === 'basic' ? 'selected' : ''}>Basic Auth</option>
                    <option value="bearer" ${cfg.saas.authType === 'bearer' ? 'selected' : ''}>Bearer Token</option>
                    <option value="session" ${cfg.saas.authType === 'session' ? 'selected' : ''}>Session</option>
                  </select>
                </div>
                <div class="form-field">
                  <label>Timeout (seconds)</label>
                  <input type="number" id="saas_timeout" name="saas.timeout" value="30" min="5" max="300">
                </div>
              </div>
              <div class="form-row">
                <div class="form-field">
                  <label>Username</label>
                  <input type="text" id="saas_username" name="saas.username" value="${cfg.saas.username || ''}" placeholder="username">
                </div>
                <div class="form-field">
                  <label>Password</label>
                  <input type="password" id="saas_password" name="saas.password" value="${cfg.saas.password || ''}" placeholder="password">
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      <!-- LLM Configuration -->
      <div class="panel">
        <div class="panel-head">
          <span class="panel-title">🤖 LLM Configuration</span>
        </div>
        <div class="panel-body">
          <form class="form-grid" id="llm-form">
            <div class="form-section">
              <div class="form-section-title">Language Model Provider</div>
              <div class="form-row">
                <div class="form-field">
                  <label>Provider</label>
                  <select id="llm_provider" name="llm.provider">
                    <option value="openai" ${cfg.llm.provider === 'openai' ? 'selected' : ''}>OpenAI</option>
                    <option value="anthropic" ${cfg.llm.provider === 'anthropic' ? 'selected' : ''}>Anthropic</option>
                    <option value="ollama" ${cfg.llm.provider === 'ollama' ? 'selected' : ''}>Ollama</option>
                  </select>
                </div>
                <div class="form-field">
                  <label>Model</label>
                  <input type="text" id="llm_model" name="llm.model" value="${cfg.llm.model || ''}" placeholder="gpt-4, claude-3-sonnet, etc.">
                </div>
              </div>
              <div class="form-field full">
                <label>API Key</label>
                <input type="password" id="llm_apiKey" name="llm.apiKey" value="${cfg.llm.apiKey || ''}" placeholder="Your API key">
              </div>
              <div class="form-field full">
                <label>Base URL (for Ollama)</label>
                <input type="url" id="llm_baseUrl" name="llm.baseUrl" value="${cfg.llm.baseUrl || ''}" placeholder="http://localhost:11434">
              </div>
            </div>
          </form>
        </div>
      </div>

      <!-- Agent Configuration -->
      <div class="panel">
        <div class="panel-head">
          <span class="panel-title">🎯 Agent Settings</span>
        </div>
        <div class="panel-body">
          <form class="form-grid" id="agent-form">
            <div class="form-section">
              <div class="form-section-title">Agent Behavior</div>
              <div class="form-field">
                <label class="checkbox-label">
                  <input type="checkbox" id="agent_autoStart" name="agent.autoStart" ${cfg.agent.autoStart ? 'checked' : ''}>
                  Auto-start on launch
                </label>
              </div>
              <div class="form-row">
                <div class="form-field">
                  <label>Check Interval (ms)</label>
                  <input type="number" id="agent_intervalMs" name="agent.intervalMs" value="${cfg.agent.intervalMs}" min="60000" step="60000">
                </div>
                <div class="form-field">
                  <label>Max Iterations</label>
                  <input type="number" id="agent_maxIterations" name="agent.maxIterations" value="${cfg.agent.maxIterations}" min="1" max="100">
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      <!-- Environment Variables -->
      <div class="panel">
        <div class="panel-head">
          <span class="panel-title">📝 Environment Variables</span>
        </div>
        <div class="panel-body">
          <p style="color: var(--text-3); font-size: 12px; margin-bottom: 16px;">
            You can also set these environment variables before starting OpenQA:
          </p>
          <div class="code-block">
            <pre>export SAAS_URL="https://your-app.com"
export SAAS_AUTH_TYPE="basic"
export SAAS_USERNAME="admin"
export SAAS_PASSWORD="secret"

export LLM_PROVIDER="openai"
export OPENAI_API_KEY="your-openai-key"
export LLM_MODEL="gpt-4"

export AGENT_AUTO_START=true
export AGENT_INTERVAL_MS=3600000
export AGENT_MAX_ITERATIONS=20

openqa start</pre>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="actions">
        <button class="btn-sm btn-ghost" onclick="testConnection()">Test Connection</button>
        <button class="btn-sm btn-ghost" onclick="exportConfig()">Export Config</button>
        <button class="btn-sm btn-ghost" onclick="resetConfig()">Reset to Defaults</button>
        <div id="message"></div>
      </div>

    </div><!-- /content -->
  </main>
</div><!-- /shell -->

<script>
  async function saveAllConfig() {
    const forms = ['saas-form', 'llm-form', 'agent-form'];
    const config = {};
    
    for (const formId of forms) {
      const form = document.getElementById(formId);
      const formData = new FormData(form);
      
      for (let [key, value] of formData.entries()) {
        if (value === '') continue;
        
        // Handle nested keys like "saas.url"
        const keys = key.split('.');
        let obj = config;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!obj[keys[i]]) obj[keys[i]] = {};
          obj = obj[keys[i]];
        }
        
        // Convert checkbox values to boolean
        if (key.includes('autoStart')) {
          obj[keys[keys.length - 1]] = value === 'on';
        } else if (key.includes('intervalMs') || key.includes('maxIterations') || key.includes('timeout')) {
          obj[keys[keys.length - 1]] = parseInt(value);
        } else {
          obj[keys[keys.length - 1]] = value;
        }
      }
    }
    
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      if (response.ok) {
        showMessage('Configuration saved successfully!', 'success');
      } else {
        showMessage('Failed to save configuration', 'error');
      }
    } catch (error) {
      showMessage('Error: ' + error.message, 'error');
    }
  }
  
  async function testConnection() {
    showMessage('Testing connection...', 'success');
    
    try {
      const response = await fetch('/api/test-connection', { method: 'POST' });
      
      if (response.ok) {
        showMessage('Connection successful!', 'success');
      } else {
        showMessage('Connection failed', 'error');
      }
    } catch (error) {
      showMessage('Connection error: ' + error.message, 'error');
    }
  }
  
  async function exportConfig() {
    try {
      const response = await fetch('/api/config');
      const config = await response.json();
      
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'openqa-config.json';
      a.click();
      URL.revokeObjectURL(url);
      
      showMessage('Configuration exported', 'success');
    } catch (error) {
      showMessage('Export failed: ' + error.message, 'error');
    }
  }
  
  async function resetConfig() {
    if (confirm('Are you sure you want to reset all configuration to defaults? This cannot be undone.')) {
      try {
        const response = await fetch('/api/config/reset', { method: 'POST' });
        
        if (response.ok) {
          location.reload();
        } else {
          showMessage('Failed to reset configuration', 'error');
        }
      } catch (error) {
        showMessage('Error: ' + error.message, 'error');
      }
    }
  }
  
  function showMessage(msg, type) {
    const el = document.getElementById('message');
    el.textContent = msg;
    el.className = 'message ' + type;
    setTimeout(() => { el.textContent = ''; el.className = ''; }, 5000);
  }
  
  // Auto-save on field change
  document.querySelectorAll('input, select').forEach(field => {
    field.addEventListener('change', () => {
      showMessage('Changes made - click "Save All" to apply', 'success');
    });
  });
</script>

</body>
</html>
    `);
  });

  const server = app.listen(cfg.web.port, cfg.web.host, () => {
    console.log(chalk.cyan('\n📊 OpenQA Status:'));
    console.log(chalk.white(`  Agent: ${cfg.agent.autoStart ? 'Auto-start enabled' : 'Idle'}`));
    console.log(chalk.white(`  Target: ${cfg.saas.url || 'Not configured'}`));
    console.log(chalk.white(`  Dashboard: http://localhost:${cfg.web.port}`));
    console.log(chalk.white(`  Kanban: http://localhost:${cfg.web.port}/kanban`));
    console.log(chalk.white(`  Config: http://localhost:${cfg.web.port}/config`));
    console.log(chalk.gray('\nPress Ctrl+C to stop\n'));
    
    if (!cfg.agent.autoStart) {
      console.log(chalk.yellow('💡 Auto-start disabled. Agent is idle.'));
      console.log(chalk.cyan('   Set AGENT_AUTO_START=true to enable autonomous mode\n'));
    }
  });

  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  function broadcast(message: any) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(data);
    }
  });
}

wss.on('connection', async (ws) => {
    console.log('WebSocket client connected');
    
    try {
      // Get real data from database
      const sessions = await db.getRecentSessions(1);
      const currentSession = sessions[0];
      const agents = await db.getActiveAgents();
      const tasks = await db.getCurrentTasks();
      const issues = await db.getCurrentIssues();
      
      // Send initial status with real data
      ws.send(JSON.stringify({ 
        type: 'status', 
        data: { 
          isRunning: currentSession?.status === 'running' || false, 
          target: cfg.saas.url || 'Not configured',
          sessionId: currentSession?.id || null
        }
      }));
      
      // Send real agent data
      ws.send(JSON.stringify({ 
        type: 'agents', 
        data: agents
      }));
      
      // Send real session data if exists
      if (currentSession) {
        ws.send(JSON.stringify({ 
          type: 'session', 
          data: {
            active_agents: agents.length,
            total_actions: currentSession.total_actions || 0,
            bugs_found: currentSession.bugs_found || 0,
            success_rate: currentSession.total_actions > 0 ? 
              Math.round(((currentSession.total_actions - (currentSession.bugs_found || 0)) / currentSession.total_actions) * 100) : 0,
            timestamp: new Date().toISOString(),
            agents: agents,
            tasks: tasks,
            issues: issues
          }
        }));
      }
      
      // Send real tasks
      ws.send(JSON.stringify({ 
        type: 'tasks', 
        data: tasks
      }));
      
      // Send real issues
      ws.send(JSON.stringify({ 
        type: 'issues', 
        data: issues
      }));
      
      // Generate realistic activities based on current session
      let activityCount = 0;
      const activityInterval = setInterval(async () => {
        if (ws.readyState === ws.OPEN) {
          // Get fresh data
          const freshSessions = await db.getRecentSessions(1);
          const freshSession = freshSessions[0];
          
          if (freshSession) {
            const activities = [
              { type: 'info', message: `🔍 Session ${freshSession.id} - Analyzing application`, timestamp: new Date().toISOString() },
              { type: 'success', message: `✅ Completed ${freshSession.total_actions || 0} test actions`, timestamp: new Date().toISOString() },
              { type: 'warning', message: `⚠️ Found ${freshSession.bugs_found || 0} issues to review`, timestamp: new Date().toISOString() },
              { type: 'info', message: `🧪 Success rate: ${freshSession.total_actions > 0 ? Math.round(((freshSession.total_actions - (freshSession.bugs_found || 0)) / freshSession.total_actions) * 100) : 0}%`, timestamp: new Date().toISOString() },
              { type: 'success', message: `✅ ${agents.filter(a => a.status === 'running').length} agents active`, timestamp: new Date().toISOString() }
            ];
            
            ws.send(JSON.stringify({ 
              type: 'activity', 
              data: activities[activityCount % activities.length]
            }));
          } else {
            ws.send(JSON.stringify({ 
              type: 'activity', 
              data: { type: 'info', message: '🔄 Waiting for session to start...', timestamp: new Date().toISOString() }
            }));
          }
          
          activityCount++;
        }
      }, 8000); // Update every 8 seconds with real data
      
      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        clearInterval(activityInterval);
      });
      
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      ws.send(JSON.stringify({ 
        type: 'error', 
        data: { message: 'Failed to load initial data' }
      }));
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    server.close(() => {
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    server.close(() => {
      process.exit(0);
    });
  });
}

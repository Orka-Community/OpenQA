/**
 * Environment Variables Management Page
 */

export function getEnvHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Environment Variables - OpenQA</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      padding: 20px 30px;
      border-radius: 12px;
      margin-bottom: 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header h1 {
      font-size: 24px;
      color: #1a202c;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header-actions {
      display: flex;
      gap: 10px;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover {
      background: #5568d3;
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: #e2e8f0;
      color: #4a5568;
    }

    .btn-secondary:hover {
      background: #cbd5e0;
    }

    .btn-success {
      background: #48bb78;
      color: white;
    }

    .btn-success:hover {
      background: #38a169;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .content {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 30px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 10px;
    }

    .tab {
      padding: 10px 20px;
      border: none;
      background: none;
      font-size: 14px;
      font-weight: 600;
      color: #718096;
      cursor: pointer;
      border-bottom: 3px solid transparent;
      transition: all 0.2s;
    }

    .tab.active {
      color: #667eea;
      border-bottom-color: #667eea;
    }

    .tab:hover {
      color: #667eea;
    }

    .category-section {
      display: none;
    }

    .category-section.active {
      display: block;
    }

    .category-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .category-title {
      font-size: 18px;
      font-weight: 600;
      color: #2d3748;
    }

    .env-grid {
      display: grid;
      gap: 20px;
    }

    .env-item {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      transition: all 0.2s;
    }

    .env-item:hover {
      border-color: #cbd5e0;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .env-item-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
    }

    .env-label {
      font-weight: 600;
      color: #2d3748;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .required-badge {
      background: #fc8181;
      color: white;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
    }

    .env-description {
      font-size: 13px;
      color: #718096;
      margin-bottom: 10px;
    }

    .env-input-group {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .env-input {
      flex: 1;
      padding: 10px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 14px;
      font-family: 'Monaco', 'Courier New', monospace;
      transition: all 0.2s;
    }

    .env-input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .env-input.error {
      border-color: #fc8181;
    }

    .env-actions {
      display: flex;
      gap: 5px;
    }

    .icon-btn {
      padding: 8px;
      border: none;
      background: #e2e8f0;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 16px;
    }

    .icon-btn:hover {
      background: #cbd5e0;
    }

    .icon-btn.test {
      background: #bee3f8;
      color: #2c5282;
    }

    .icon-btn.test:hover {
      background: #90cdf4;
    }

    .icon-btn.generate {
      background: #c6f6d5;
      color: #22543d;
    }

    .icon-btn.generate:hover {
      background: #9ae6b4;
    }

    .error-message {
      color: #e53e3e;
      font-size: 12px;
      margin-top: 5px;
    }

    .success-message {
      color: #38a169;
      font-size: 12px;
      margin-top: 5px;
    }

    .alert {
      padding: 15px 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .alert-warning {
      background: #fef5e7;
      border-left: 4px solid #f59e0b;
      color: #92400e;
    }

    .alert-info {
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
      color: #1e40af;
    }

    .alert-success {
      background: #f0fdf4;
      border-left: 4px solid #10b981;
      color: #065f46;
    }

    .loading {
      text-align: center;
      padding: 40px;
      color: #718096;
    }

    .spinner {
      border: 3px solid #e2e8f0;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      align-items: center;
      justify-content: center;
    }

    .modal.show {
      display: flex;
    }

    .modal-content {
      background: white;
      padding: 30px;
      border-radius: 12px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    }

    .modal-header {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 15px;
      color: #2d3748;
    }

    .modal-body {
      margin-bottom: 20px;
      color: #4a5568;
    }

    .modal-footer {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>
        <span>⚙️</span>
        Environment Variables
      </h1>
      <div class="header-actions">
        <a href="/config" class="btn btn-secondary">← Back to Config</a>
        <button id="saveBtn" class="btn btn-success" disabled>💾 Save Changes</button>
      </div>
    </div>

    <div class="content">
      <div id="loading" class="loading">
        <div class="spinner"></div>
        <div>Loading environment variables...</div>
      </div>

      <div id="main" style="display: none;">
        <div id="alerts"></div>

        <div class="tabs">
          <button class="tab active" data-category="llm">🤖 LLM</button>
          <button class="tab" data-category="security">🔒 Security</button>
          <button class="tab" data-category="target">🎯 Target App</button>
          <button class="tab" data-category="github">🐙 GitHub</button>
          <button class="tab" data-category="web">🌐 Web Server</button>
          <button class="tab" data-category="agent">🤖 Agent</button>
          <button class="tab" data-category="database">💾 Database</button>
          <button class="tab" data-category="notifications">🔔 Notifications</button>
        </div>

        <div id="categories"></div>
      </div>
    </div>
  </div>

  <!-- Test Result Modal -->
  <div id="testModal" class="modal">
    <div class="modal-content">
      <div class="modal-header">Test Result</div>
      <div class="modal-body" id="testResult"></div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeTestModal()">Close</button>
      </div>
    </div>
  </div>

  <script>
    let envVariables = [];
    let changedVariables = {};
    let restartRequired = false;

    // Load environment variables
    async function loadEnvVariables() {
      try {
        const response = await fetch('/api/env');
        if (!response.ok) throw new Error('Failed to load variables');
        
        const data = await response.json();
        envVariables = data.variables;
        
        renderCategories();
        document.getElementById('loading').style.display = 'none';
        document.getElementById('main').style.display = 'block';
      } catch (error) {
        showAlert('error', 'Failed to load environment variables: ' + error.message);
      }
    }

    // Render categories
    function renderCategories() {
      const container = document.getElementById('categories');
      const categories = [...new Set(envVariables.map(v => v.category))];
      
      categories.forEach((category, index) => {
        const section = document.createElement('div');
        section.className = 'category-section' + (index === 0 ? ' active' : '');
        section.dataset.category = category;
        
        const vars = envVariables.filter(v => v.category === category);
        
        section.innerHTML = \`
          <div class="category-header">
            <div class="category-title">\${getCategoryTitle(category)}</div>
          </div>
          <div class="env-grid">
            \${vars.map(v => renderEnvItem(v)).join('')}
          </div>
        \`;
        
        container.appendChild(section);
      });
    }

    // Render single env item
    function renderEnvItem(envVar) {
      const inputType = envVar.type === 'password' ? 'password' : 'text';
      const value = envVar.displayValue || '';
      
      return \`
        <div class="env-item" data-key="\${envVar.key}">
          <div class="env-item-header">
            <div class="env-label">
              \${envVar.key}
              \${envVar.required ? '<span class="required-badge">REQUIRED</span>' : ''}
            </div>
          </div>
          <div class="env-description">\${envVar.description}</div>
          <div class="env-input-group">
            \${envVar.type === 'select' ? 
              \`<select class="env-input" data-key="\${envVar.key}" onchange="handleChange(this)">
                <option value="">-- Select --</option>
                \${envVar.options.map(opt => 
                  \`<option value="\${opt}" \${value === opt ? 'selected' : ''}>\${opt}</option>\`
                ).join('')}
              </select>\` :
              envVar.type === 'boolean' ?
              \`<select class="env-input" data-key="\${envVar.key}" onchange="handleChange(this)">
                <option value="">-- Select --</option>
                <option value="true" \${value === 'true' ? 'selected' : ''}>true</option>
                <option value="false" \${value === 'false' ? 'selected' : ''}>false</option>
              </select>\` :
              \`<input 
                type="\${inputType}" 
                class="env-input" 
                data-key="\${envVar.key}"
                value="\${value}"
                placeholder="\${envVar.placeholder || ''}"
                onchange="handleChange(this)"
              />\`
            }
            <div class="env-actions">
              \${envVar.testable ? \`<button class="icon-btn test" onclick="testVariable('\${envVar.key}')" title="Test">🧪</button>\` : ''}
              \${envVar.key === 'OPENQA_JWT_SECRET' ? \`<button class="icon-btn generate" onclick="generateSecret('\${envVar.key}')" title="Generate">🔑</button>\` : ''}
            </div>
          </div>
          <div class="error-message" id="error-\${envVar.key}"></div>
          <div class="success-message" id="success-\${envVar.key}"></div>
        </div>
      \`;
    }

    // Handle input change
    function handleChange(input) {
      const key = input.dataset.key;
      const value = input.value;
      
      changedVariables[key] = value;
      document.getElementById('saveBtn').disabled = false;
      
      // Clear messages
      document.getElementById(\`error-\${key}\`).textContent = '';
      document.getElementById(\`success-\${key}\`).textContent = '';
    }

    // Save changes
    async function saveChanges() {
      const saveBtn = document.getElementById('saveBtn');
      saveBtn.disabled = true;
      saveBtn.textContent = '💾 Saving...';
      
      try {
        const response = await fetch('/api/env/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variables: changedVariables }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to save');
        }
        
        const result = await response.json();
        restartRequired = result.restartRequired;
        
        showAlert('success', \`✅ Saved \${result.updated} variable(s) successfully!\` + 
          (restartRequired ? ' ⚠️ Restart required for changes to take effect.' : ''));
        
        changedVariables = {};
        saveBtn.textContent = '💾 Save Changes';
        
        // Reload to show updated values
        setTimeout(() => location.reload(), 2000);
      } catch (error) {
        showAlert('error', 'Failed to save: ' + error.message);
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Save Changes';
      }
    }

    // Test variable
    async function testVariable(key) {
      const input = document.querySelector(\`[data-key="\${key}"]\`);
      const value = input.value;
      
      if (!value) {
        showAlert('warning', 'Please enter a value first');
        return;
      }
      
      try {
        const response = await fetch(\`/api/env/test/\${key}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value }),
        });
        
        const result = await response.json();
        showTestResult(result);
      } catch (error) {
        showTestResult({ success: false, message: 'Test failed: ' + error.message });
      }
    }

    // Generate secret
    async function generateSecret(key) {
      try {
        const response = await fetch(\`/api/env/generate/\${key}\`, {
          method: 'POST',
        });
        
        if (!response.ok) throw new Error('Failed to generate');
        
        const result = await response.json();
        const input = document.querySelector(\`[data-key="\${key}"]\`);
        input.value = result.value;
        handleChange(input);
        
        document.getElementById(\`success-\${key}\`).textContent = '✅ Secret generated!';
      } catch (error) {
        document.getElementById(\`error-\${key}\`).textContent = 'Failed to generate: ' + error.message;
      }
    }

    // Show test result
    function showTestResult(result) {
      const modal = document.getElementById('testModal');
      const resultDiv = document.getElementById('testResult');
      
      resultDiv.innerHTML = \`
        <div class="alert \${result.success ? 'alert-success' : 'alert-warning'}">
          \${result.success ? '✅' : '❌'} \${result.message}
        </div>
      \`;
      
      modal.classList.add('show');
    }

    function closeTestModal() {
      document.getElementById('testModal').classList.remove('show');
    }

    // Show alert
    function showAlert(type, message) {
      const alerts = document.getElementById('alerts');
      const alertClass = type === 'error' ? 'alert-warning' : 
                        type === 'success' ? 'alert-success' : 'alert-info';
      
      alerts.innerHTML = \`
        <div class="alert \${alertClass}">
          \${message}
        </div>
      \`;
      
      setTimeout(() => alerts.innerHTML = '', 5000);
    }

    // Get category title
    function getCategoryTitle(category) {
      const titles = {
        llm: '🤖 LLM Configuration',
        security: '🔒 Security Settings',
        target: '🎯 Target Application',
        github: '🐙 GitHub Integration',
        web: '🌐 Web Server',
        agent: '🤖 Agent Configuration',
        database: '💾 Database',
        notifications: '🔔 Notifications',
      };
      return titles[category] || category;
    }

    // Tab switching
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab')) {
        const category = e.target.dataset.category;
        
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        
        document.querySelectorAll('.category-section').forEach(s => s.classList.remove('active'));
        document.querySelector(\`[data-category="\${category}"]\`).classList.add('active');
      }
    });

    // Save button
    document.getElementById('saveBtn').addEventListener('click', saveChanges);

    // Load on page load
    loadEnvVariables();
  </script>
</body>
</html>`;
}

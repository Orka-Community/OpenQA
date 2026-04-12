export function getSetupHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenQA — Setup</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #080b10;
      --surface: #0d1117;
      --panel: #111720;
      --border: rgba(255,255,255,0.06);
      --border-hi: rgba(255,255,255,0.14);
      --accent: #f97316;
      --accent-lo: rgba(249,115,22,0.08);
      --text-1: #f1f5f9;
      --text-2: #8b98a8;
      --text-3: #4b5563;
      --red: #ef4444;
      --red-lo: rgba(239,68,68,0.10);
      --green: #22c55e;
      --green-lo: rgba(34,197,94,0.08);
    }
    html, body { height: 100%; }
    body {
      background: var(--bg);
      font-family: 'Syne', sans-serif;
      color: var(--text-1);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      width: 100%;
      max-width: 440px;
      background: var(--surface);
      border: 1px solid var(--border-hi);
      border-radius: 16px;
      padding: 40px 36px 36px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.6);
    }
    .logo {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 28px; justify-content: center;
    }
    .logo-mark {
      width: 36px; height: 36px;
      background: var(--accent);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; font-weight: 800; color: #fff;
    }
    .logo-text { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    h1 { font-size: 20px; font-weight: 700; text-align: center; margin-bottom: 6px; }
    .subtitle { font-size: 13px; color: var(--text-2); text-align: center; margin-bottom: 28px; }
    .badge {
      display: inline-block;
      background: var(--accent-lo);
      color: var(--accent);
      border: 1px solid rgba(249,115,22,0.25);
      border-radius: 6px;
      font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
      padding: 3px 8px; margin-bottom: 20px;
      text-align: center; width: 100%;
    }
    .field { margin-bottom: 16px; }
    label { display: block; font-size: 12px; font-weight: 600; color: var(--text-2); margin-bottom: 6px; letter-spacing: 0.04em; text-transform: uppercase; }
    input[type=text], input[type=password] {
      width: 100%;
      background: var(--panel);
      border: 1px solid var(--border-hi);
      border-radius: 8px;
      padding: 10px 14px;
      font-family: 'DM Mono', monospace;
      font-size: 14px;
      color: var(--text-1);
      outline: none;
      transition: border-color 0.15s;
    }
    input:focus { border-color: var(--accent); }
    .hint { font-size: 11px; color: var(--text-3); margin-top: 5px; font-family: 'DM Mono', monospace; }
    .msg {
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 13px;
      margin-bottom: 18px;
      display: none;
    }
    .msg.error { background: var(--red-lo); border: 1px solid rgba(239,68,68,0.3); color: var(--red); }
    .msg.success { background: var(--green-lo); border: 1px solid rgba(34,197,94,0.3); color: var(--green); }
    .btn {
      width: 100%;
      background: var(--accent);
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 12px;
      font-family: 'Syne', sans-serif;
      font-size: 15px; font-weight: 700;
      cursor: pointer; margin-top: 8px;
      transition: opacity 0.15s, transform 0.1s;
    }
    .btn:hover { opacity: 0.9; }
    .btn:active { transform: scale(0.98); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .footer { margin-top: 28px; text-align: center; font-size: 12px; color: var(--text-3); font-family: 'DM Mono', monospace; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <div class="logo-mark">Q</div>
      <span class="logo-text">OpenQA</span>
    </div>
    <div class="badge">FIRST RUN</div>
    <h1>Create admin account</h1>
    <p class="subtitle">Set up your OpenQA instance</p>

    <div class="msg error" id="error"></div>
    <div class="msg success" id="success"></div>

    <form id="setupForm">
      <div class="field">
        <label for="username">Username or Email</label>
        <input type="text" id="username" name="username" autocomplete="username" autofocus required pattern="[a-z0-9_.@\\-]+" title="Lowercase letters, digits, and ._@- characters">
        <div class="hint">Use your email or a username (lowercase, digits, ._@- allowed)</div>
      </div>
      <div class="field">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" autocomplete="new-password" required minlength="8">
        <div class="hint">Minimum 8 characters</div>
      </div>
      <div class="field">
        <label for="confirm">Confirm Password</label>
        <input type="password" id="confirm" name="confirm" autocomplete="new-password" required minlength="8">
      </div>
      <button type="submit" class="btn" id="submitBtn">Create Account &amp; Sign In</button>
    </form>

    <div class="footer">OpenQA v1.3.4</div>
  </div>

  <script>
    const form = document.getElementById('setupForm');
    const errorEl = document.getElementById('error');
    const successEl = document.getElementById('success');
    const btn = document.getElementById('submitBtn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.style.display = 'none';
      successEl.style.display = 'none';

      const password = document.getElementById('password').value;
      const confirm = document.getElementById('confirm').value;
      if (password !== confirm) {
        errorEl.textContent = 'Passwords do not match';
        errorEl.style.display = 'block';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Creating account…';

      try {
        const res = await fetch('/api/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: document.getElementById('username').value.trim(),
            password,
          }),
          credentials: 'include',
        });

        if (res.ok) {
          successEl.textContent = 'Account created! Redirecting…';
          successEl.style.display = 'block';
          setTimeout(() => { window.location.href = '/'; }, 800);
        } else {
          const data = await res.json().catch(() => ({}));
          errorEl.textContent = data.error || 'Setup failed';
          errorEl.style.display = 'block';
          btn.disabled = false;
          btn.textContent = 'Create Account & Sign In';
        }
      } catch {
        errorEl.textContent = 'Network error — please try again';
        errorEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Create Account & Sign In';
      }
    });
  </script>
</body>
</html>`;
}

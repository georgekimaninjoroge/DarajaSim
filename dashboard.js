/**
 * dashboard.js
 * Local HTTP server that serves a browser UI for the toolkit.
 */

import http from "http";
import { getQueue } from "./replay.js";
import * as log from "./logger.js";

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DarajaSim — Local Dashboard</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #fff;
    --surface: #f6f8fa;
    --border: #e4e7eb;
    --border-strong: #d0d5dd;
    --text: #101828;
    --muted: #667085;
    --subtle: #98a2b3;
    --green: #079455;
    --green-bg: #dcfae6;
    --red: #d92d20;
    --red-bg: #fee4e2;
    --orange: #b54708;
    --orange-bg: #fef0c7;
    --blue: #1570ef;
    --blue-bg: #eff8ff;
    --purple: #6941c6;
    --purple-bg: #f4f3ff;
    --radius: 8px;
    --shadow: 0 1px 3px rgba(16,24,40,.06), 0 1px 2px rgba(16,24,40,.04);
    --shadow-md: 0 4px 8px -2px rgba(16,24,40,.08), 0 2px 4px -2px rgba(16,24,40,.04);
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
    background: var(--bg);
    color: var(--text);
    font-size: 14px;
    line-height: 1.5;
    min-height: 100vh;
  }

  /* NAV */
  nav {
    border-bottom: 1px solid var(--border);
    padding: 0 32px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #fff;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .nav-brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .nav-logo {
    width: 28px;
    height: 28px;
    background: #16a34a;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 14px;
    font-weight: 700;
  }
  .nav-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
    letter-spacing: -0.01em;
  }
  .nav-title span { color: var(--red); }
  .badge {
    font-size: 11px;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 99px;
    background: var(--green-bg);
    color: var(--green);
    border: 1px solid #a9efc5;
  }
  .nav-right {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--muted);
  }
  .dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--green);
    display: inline-block;
  }

  /* LAYOUT */
  .page { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }

  /* STATS ROW */
  .stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 28px;
  }
  .stat {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    background: #fff;
    box-shadow: var(--shadow);
  }
  .stat-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: .04em;
    margin-bottom: 8px;
  }
  .stat-val {
    font-size: 28px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.02em;
    line-height: 1;
  }
  .stat-val.green { color: var(--green); }
  .stat-val.red { color: var(--red); }
  .stat-val.blue { color: var(--blue); }

  /* GRID */
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .full { grid-column: 1 / -1; }

  /* CARD */
  .card {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: #fff;
    box-shadow: var(--shadow);
    overflow: hidden;
  }
  .card-header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .card-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .card-title .icon {
    width: 20px; height: 20px;
    border-radius: 4px;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px;
  }
  .card-body { padding: 20px; }

  /* FORM */
  .field { margin-bottom: 14px; }
  .field:last-child { margin-bottom: 0; }
  label {
    display: block;
    font-size: 12px;
    font-weight: 500;
    color: var(--text);
    margin-bottom: 5px;
  }
  input {
    width: 100%;
    border: 1px solid var(--border-strong);
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 13px;
    font-family: inherit;
    color: var(--text);
    background: #fff;
    transition: border-color .15s, box-shadow .15s;
  }
  input:focus {
    outline: none;
    border-color: var(--blue);
    box-shadow: 0 0 0 3px rgba(21,112,239,.12);
  }
  .field-hint { font-size: 11px; color: var(--muted); margin-top: 4px; }

  /* SCENARIOS */
  .scenarios-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--text);
    margin-bottom: 8px;
    margin-top: 18px;
  }
  .scenarios-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  .scen-btn {
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px 10px;
    font-size: 12px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all .15s;
    background: #fff;
    color: var(--text);
  }
  .scen-btn:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
  .scen-btn .dot-s { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .s-success .dot-s { background: var(--green); }
  .s-cancel .dot-s { background: var(--red); }
  .s-timeout .dot-s { background: var(--orange); }
  .s-insufficient .dot-s { background: var(--purple); }
  .s-wrong_pin .dot-s { background: #b45309; }
  .s-duplicate .dot-s { background: var(--blue); }

  /* LOG */
  .log {
    height: 320px;
    overflow-y: auto;
    font-size: 12px;
    font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
    line-height: 1.8;
    padding: 4px 0;
  }
  .log-entry {
    padding: 3px 0;
    display: flex;
    gap: 10px;
    align-items: flex-start;
    border-bottom: 1px solid var(--surface);
  }
  .log-time { color: var(--subtle); flex-shrink: 0; font-size: 11px; padding-top: 1px; }
  .log-msg { color: var(--text); flex: 1; }
  .log-msg.ok { color: var(--green); }
  .log-msg.fail { color: var(--red); }
  .log-msg.warn { color: var(--orange); }
  .log-msg.info { color: var(--blue); }

  /* QUEUE */
  .queue-item {
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 12px 14px;
    margin-bottom: 8px;
    background: var(--surface);
  }
  .queue-item:last-child { margin-bottom: 0; }
  .queue-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .queue-scenario {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 99px;
    background: var(--orange-bg);
    color: var(--orange);
    text-transform: uppercase;
    letter-spacing: .04em;
  }
  .queue-url { font-size: 12px; color: var(--text); font-family: monospace; }
  .queue-meta { font-size: 11px; color: var(--muted); }
  .empty-state {
    text-align: center;
    padding: 32px;
    color: var(--muted);
    font-size: 13px;
  }
  .empty-state .empty-icon { font-size: 24px; margin-bottom: 8px; }

  /* BUTTONS */
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: none;
    border-radius: 6px;
    padding: 8px 14px;
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: all .15s;
  }
  .btn:hover { opacity: .88; }
  .btn-primary { background: #16a34a; color: #fff; }
  .btn-danger { background: var(--red); color: #fff; }
  .btn-ghost {
    background: #fff;
    color: var(--text);
    border: 1px solid var(--border-strong);
    box-shadow: var(--shadow);
  }
  .btn-ghost:hover { background: var(--surface); opacity: 1; }
  .queue-actions { display: flex; gap: 8px; margin-top: 14px; }
</style>
</head>
<body>

<nav>
  <div class="nav-brand">
    <div class="nav-logo">D</div>
    <span class="nav-title">Daraja<span>Sim</span></span>
    <span class="badge">Local</span>
  </div>
  <div class="nav-right">
    <span class="dot"></span>
    Simulator running
  </div>
</nav>

<div class="page">
  <div class="stats">
    <div class="stat">
      <div class="stat-label">Callbacks Sent</div>
      <div class="stat-val" id="stat-sent">0</div>
    </div>
    <div class="stat">
      <div class="stat-label">Accepted</div>
      <div class="stat-val green" id="stat-ok">0</div>
    </div>
    <div class="stat">
      <div class="stat-label">Failed</div>
      <div class="stat-val red" id="stat-fail">0</div>
    </div>
    <div class="stat">
      <div class="stat-label">In Queue</div>
      <div class="stat-val blue" id="stat-queue">0</div>
    </div>
  </div>

  <div class="grid">
    <!-- Trigger -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">
          <div class="icon" style="background:#dcfae6;color:#079455;">⚡</div>
          Trigger Callback
        </div>
      </div>
      <div class="card-body">
        <div class="field">
          <label>Callback URL</label>
          <input id="url" type="text" value="http://localhost:3000/api/mpesa/callback" />
          <div class="field-hint">Your local server endpoint</div>
        </div>
        <div class="field" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label>Amount (KES)</label>
            <input id="amount" type="number" value="100" min="1" />
          </div>
          <div>
            <label>Phone</label>
            <input id="phone" type="text" value="0712345678" />
          </div>
        </div>
        <div class="field">
          <label>Delay (ms)</label>
          <input id="delay" type="number" value="2000" min="0" />
          <div class="field-hint">Simulates Safaricom processing time</div>
        </div>

        <div class="scenarios-label">Scenarios</div>
        <div class="scenarios-grid">
          <button class="scen-btn s-success" onclick="trigger('success')"><span class="dot-s"></span>Success</button>
          <button class="scen-btn s-cancel" onclick="trigger('cancel')"><span class="dot-s"></span>Cancel</button>
          <button class="scen-btn s-timeout" onclick="trigger('timeout')"><span class="dot-s"></span>Timeout</button>
          <button class="scen-btn s-insufficient" onclick="trigger('insufficient')"><span class="dot-s"></span>No Balance</button>
          <button class="scen-btn s-wrong_pin" onclick="trigger('wrong_pin')"><span class="dot-s"></span>Wrong PIN</button>
          <button class="scen-btn s-duplicate" onclick="trigger('duplicate')"><span class="dot-s"></span>Duplicate</button>
        </div>
      </div>
    </div>

    <!-- Log -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">
          <div class="icon" style="background:#eff8ff;color:#1570ef;">📋</div>
          Request Log
        </div>
      </div>
      <div class="card-body" style="padding:12px 16px;">
        <div class="log" id="log">
          <div class="log-entry">
            <span class="log-time">${new Date().toLocaleTimeString()}</span>
            <span class="log-msg info">Dashboard ready — trigger a callback to begin</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Queue -->
    <div class="card full">
      <div class="card-header">
        <div class="card-title">
          <div class="icon" style="background:#fef0c7;color:#b54708;">🔁</div>
          Callback Queue
        </div>
        <span style="font-size:11px;color:var(--muted);">Failed callbacks pending replay</span>
      </div>
      <div class="card-body">
        <div id="queue-list">
          <div class="empty-state">
            <div class="empty-icon">✓</div>
            No failed callbacks — queue is clear
          </div>
        </div>
        <div class="queue-actions">
          <button class="btn btn-primary" onclick="replay()">↺ Replay All</button>
          <button class="btn btn-ghost" onclick="clearQueue()">Clear Queue</button>
        </div>
      </div>
    </div>
  </div>
</div>

<script>
  let sent = 0, ok = 0, fail = 0;

  function addLog(msg, cls = 'info') {
    const el = document.getElementById('log');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    const t = new Date().toLocaleTimeString();
    entry.innerHTML = '<span class="log-time">' + t + '</span><span class="log-msg ' + cls + '">' + msg + '</span>';
    el.appendChild(entry);
    el.scrollTop = el.scrollHeight;
  }

  function updateStats() {
    document.getElementById('stat-sent').textContent = sent;
    document.getElementById('stat-ok').textContent = ok;
    document.getElementById('stat-fail').textContent = fail;
    loadQueue();
  }

  async function trigger(scenario) {
    const url = document.getElementById('url').value;
    const amount = document.getElementById('amount').value;
    const phone = document.getElementById('phone').value;
    const delay = document.getElementById('delay').value;
    addLog('Triggering ' + scenario + ' → ' + url, 'info');
    sent++; updateStats();
    try {
      const res = await fetch('/api/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, scenario, amount: Number(amount), phone, delay: Number(delay) })
      });
      const data = await res.json();
      if (data.success) { addLog('Callback accepted — server responded ' + data.serverStatus, 'ok'); ok++; }
      else { addLog('Callback failed: ' + data.error + ' — queued for replay', 'fail'); fail++; }
    } catch (e) { addLog('Error: ' + e.message, 'fail'); fail++; }
    updateStats();
  }

  async function loadQueue() {
    try {
      const res = await fetch('/api/queue');
      const { queue } = await res.json();
      document.getElementById('stat-queue').textContent = queue.length;
      const el = document.getElementById('queue-list');
      if (!queue.length) {
        el.innerHTML = '<div class="empty-state"><div class="empty-icon">✓</div>No failed callbacks — queue is clear</div>';
        return;
      }
      el.innerHTML = queue.map(e => \`
        <div class="queue-item">
          <div class="queue-row">
            <span class="queue-scenario">\${e.scenario}</span>
            <span class="queue-url">\${e.url}</span>
          </div>
          <div class="queue-meta">Failed \${new Date(e.failedAt).toLocaleString()} · \${e.reason} · \${e.attempts} attempt(s)</div>
        </div>
      \`).join('');
    } catch {}
  }

  async function replay() {
    addLog('Replaying queued callbacks...', 'warn');
    const res = await fetch('/api/replay', { method: 'POST' });
    const data = await res.json();
    addLog('Replay done — ' + data.succeeded + ' succeeded, ' + data.failed + ' still failing', data.failed === 0 ? 'ok' : 'warn');
    loadQueue();
  }

  async function clearQueue() {
    await fetch('/api/queue', { method: 'DELETE' });
    addLog('Queue cleared', 'warn');
    loadQueue();
  }

  loadQueue();
  setInterval(loadQueue, 5000);
</script>
</body>
</html>`;

export async function startDashboard(port = 4000) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);

    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(HTML);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/trigger") {
      let body = "";
      req.on("data", c => body += c);
      req.on("end", async () => {
        try {
          const opts = JSON.parse(body);
          const { SCENARIOS } = await import("./scenarios.js");
          const fn = SCENARIOS[opts.scenario];
          if (!fn) throw new Error(`Unknown scenario: ${opts.scenario}`);
          const result = fn(opts.amount, opts.phone);
          const payload = Array.isArray(result) ? result[0] : result;
          let serverStatus = null, succeeded = false, errorMsg = null;
          try {
            const r = await fetch(opts.url, {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-Daraja-Simulated": "true" },
              body: JSON.stringify(payload),
              signal: AbortSignal.timeout(10_000),
            });
            serverStatus = r.status;
            succeeded = r.ok;
          } catch (e) { errorMsg = e.message; }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: succeeded, serverStatus, error: errorMsg }));
        } catch (e) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/queue") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ queue: getQueue() }));
      return;
    }

    if (req.method === "DELETE" && url.pathname === "/api/queue") {
      const { clearQueue } = await import("./replay.js");
      clearQueue();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/replay") {
      let succeeded = 0, failed = 0;
      const queue = getQueue();
      for (const entry of queue) {
        try {
          const r = await fetch(entry.url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Daraja-Replay": "true" },
            body: JSON.stringify(entry.payload),
            signal: AbortSignal.timeout(10_000),
          });
          if (r.ok) { const { removeFromQueue } = await import("./replay.js"); removeFromQueue(entry.id); succeeded++; }
          else failed++;
        } catch { failed++; }
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ succeeded, failed }));
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  });

  server.listen(port, () => {
    log.success(`Dashboard running at http://localhost:${port}`);
    log.info("Open in browser to trigger callbacks visually.");
    import("child_process").then(({ exec }) => {
      const open = process.platform === "darwin" ? "open" :
                   process.platform === "win32" ? "start" : "xdg-open";
      exec(`${open} http://localhost:${port}`);
    }).catch(() => {});
  });
}
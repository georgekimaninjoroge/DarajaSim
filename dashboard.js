/**
 * dashboard.js
 * Local HTTP server that serves a browser UI for the toolkit.
 * Lets you trigger callbacks, view queue, replay — all in browser.
 */

import http from "http";
import { simulate } from "./simulator.js";
import { getQueue, replayAll, showStatus } from "./replay.js";
import * as log from "./logger.js";

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Daraja Toolkit — Local Dashboard</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Courier New', monospace; background: #0d1117; color: #c9d1d9; min-height: 100vh; }
  .header { background: #161b22; border-bottom: 1px solid #30363d; padding: 20px 40px; display: flex; align-items: center; gap: 16px; }
  .logo { font-size: 22px; font-weight: bold; color: #58a6ff; }
  .badge { background: #1f6feb; color: #fff; font-size: 11px; padding: 2px 8px; border-radius: 99px; }
  .tagline { color: #8b949e; font-size: 13px; margin-top: 4px; }
  .main { max-width: 960px; margin: 0 auto; padding: 32px 24px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 24px; }
  .card h2 { font-size: 15px; color: #58a6ff; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
  label { font-size: 12px; color: #8b949e; display: block; margin-bottom: 6px; margin-top: 14px; }
  input, select { width: 100%; background: #0d1117; border: 1px solid #30363d; color: #c9d1d9; padding: 8px 12px; border-radius: 6px; font-family: inherit; font-size: 13px; }
  input:focus, select:focus { outline: none; border-color: #58a6ff; }
  button { margin-top: 16px; width: 100%; padding: 10px; border: none; border-radius: 6px; font-family: inherit; font-size: 13px; cursor: pointer; font-weight: bold; transition: opacity 0.2s; }
  button:hover { opacity: 0.85; }
  .btn-primary { background: #238636; color: #fff; }
  .btn-danger { background: #da3633; color: #fff; }
  .btn-secondary { background: #1f6feb; color: #fff; }
  .btn-warning { background: #9e6a03; color: #fff; }
  .log { background: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 16px; height: 280px; overflow-y: auto; font-size: 12px; line-height: 1.7; }
  .log-entry { padding: 2px 0; border-bottom: 1px solid #21262d; }
  .log-entry:last-child { border-bottom: none; }
  .ok { color: #3fb950; }
  .fail { color: #f85149; }
  .info { color: #58a6ff; }
  .warn { color: #d29922; }
  .queue-list { margin-top: 12px; }
  .queue-item { background: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 12px; margin-bottom: 8px; font-size: 12px; }
  .queue-item .scenario { color: #d29922; font-weight: bold; }
  .queue-item .meta { color: #8b949e; margin-top: 4px; }
  .empty { color: #8b949e; font-size: 13px; text-align: center; padding: 24px; }
  .full-width { grid-column: 1 / -1; }
  .scenarios-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; }
  .scenario-btn { margin-top: 0; padding: 8px; font-size: 12px; }
  .s-success { background: #238636; color: #fff; }
  .s-cancel { background: #da3633; color: #fff; }
  .s-timeout { background: #9e6a03; color: #fff; }
  .s-insufficient { background: #6e40c9; color: #fff; }
  .s-wrong_pin { background: #b45309; color: #fff; }
  .s-duplicate { background: #1f6feb; color: #fff; }
  .stats { display: flex; gap: 16px; margin-bottom: 20px; }
  .stat { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px 20px; flex: 1; text-align: center; }
  .stat-num { font-size: 28px; font-weight: bold; color: #58a6ff; }
  .stat-label { font-size: 11px; color: #8b949e; margin-top: 4px; }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">🛠 Daraja Toolkit <span class="badge">LOCAL</span></div>
    <div class="tagline">Production-accurate STK callback simulator — no ngrok, no HTTPS needed</div>
  </div>
</div>
<div class="main">
  <div class="stats">
    <div class="stat"><div class="stat-num" id="stat-sent">0</div><div class="stat-label">Callbacks Sent</div></div>
    <div class="stat"><div class="stat-num" id="stat-ok">0</div><div class="stat-label">Accepted (200)</div></div>
    <div class="stat"><div class="stat-num" id="stat-fail">0</div><div class="stat-label">Failed</div></div>
    <div class="stat"><div class="stat-num" id="stat-queue">0</div><div class="stat-label">In Queue</div></div>
  </div>

  <div class="grid">
    <!-- Trigger -->
    <div class="card">
      <h2>⚡ Trigger Callback</h2>
      <label>Callback URL (your local server)</label>
      <input id="url" type="text" value="http://localhost:3000/api/mpesa/callback" />
      <label>Amount (KES)</label>
      <input id="amount" type="number" value="100" min="1" />
      <label>Phone Number</label>
      <input id="phone" type="text" value="0712345678" />
      <label>Delay (ms) — simulates Safaricom processing time</label>
      <input id="delay" type="number" value="2000" min="0" />

      <label>Quick Scenarios</label>
      <div class="scenarios-grid">
        <button class="scenario-btn s-success" onclick="trigger('success')">✓ Success</button>
        <button class="scenario-btn s-cancel" onclick="trigger('cancel')">✗ Cancel</button>
        <button class="scenario-btn s-timeout" onclick="trigger('timeout')">⏱ Timeout</button>
        <button class="scenario-btn s-insufficient" onclick="trigger('insufficient')">💸 No Balance</button>
        <button class="scenario-btn s-wrong_pin" onclick="trigger('wrong_pin')">🔒 Wrong PIN</button>
        <button class="scenario-btn s-duplicate" onclick="trigger('duplicate')">⊕ Duplicate</button>
      </div>
    </div>

    <!-- Log -->
    <div class="card">
      <h2>📋 Request Log</h2>
      <div class="log" id="log">
        <div class="log-entry info">Dashboard ready. Trigger a callback to begin.</div>
      </div>
    </div>

    <!-- Queue -->
    <div class="card full-width">
      <h2>🔁 Callback Queue (failed — pending replay)</h2>
      <div class="queue-list" id="queue-list">
        <div class="empty">No failed callbacks in queue.</div>
      </div>
      <button class="btn-secondary" style="margin-top:12px;width:auto;padding:8px 20px;" onclick="replay()">↺ Replay All</button>
      <button class="btn-danger" style="margin-top:12px;margin-left:8px;width:auto;padding:8px 20px;" onclick="clearQueue()">✕ Clear Queue</button>
    </div>
  </div>
</div>

<script>
  let sent = 0, ok = 0, fail = 0;

  function addLog(msg, cls = 'info') {
    const el = document.getElementById('log');
    const entry = document.createElement('div');
    entry.className = 'log-entry ' + cls;
    const t = new Date().toLocaleTimeString();
    entry.textContent = '[' + t + '] ' + msg;
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
    addLog('Triggering scenario: ' + scenario + ' → ' + url, 'info');
    sent++;
    updateStats();

    try {
      const res = await fetch('/api/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, scenario, amount: Number(amount), phone, delay: Number(delay) })
      });
      const data = await res.json();
      if (data.success) {
        addLog('✓ Callback sent. Server responded: ' + data.serverStatus, 'ok');
        ok++;
      } else {
        addLog('✗ Callback failed: ' + data.error + '. Queued for replay.', 'fail');
        fail++;
      }
    } catch (e) {
      addLog('✗ Toolkit error: ' + e.message, 'fail');
      fail++;
    }
    updateStats();
  }

  async function loadQueue() {
    try {
      const res = await fetch('/api/queue');
      const { queue } = await res.json();
      document.getElementById('stat-queue').textContent = queue.length;
      const el = document.getElementById('queue-list');
      if (queue.length === 0) {
        el.innerHTML = '<div class="empty">No failed callbacks in queue.</div>';
        return;
      }
      el.innerHTML = queue.map(e => \`
        <div class="queue-item">
          <span class="scenario">\${e.scenario.toUpperCase()}</span> → \${e.url}
          <div class="meta">Failed: \${new Date(e.failedAt).toLocaleString()} — \${e.reason} | Attempts: \${e.attempts}</div>
        </div>
      \`).join('');
    } catch {}
  }

  async function replay() {
    addLog('Replaying all queued callbacks...', 'warn');
    const res = await fetch('/api/replay', { method: 'POST' });
    const data = await res.json();
    addLog('Replay complete: ' + data.succeeded + ' succeeded, ' + data.failed + ' still failing.', data.failed === 0 ? 'ok' : 'warn');
    loadQueue();
  }

  async function clearQueue() {
    await fetch('/api/queue', { method: 'DELETE' });
    addLog('Queue cleared.', 'warn');
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

    // Serve dashboard UI
    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(HTML);
      return;
    }

    // API: Trigger callback
    if (req.method === "POST" && url.pathname === "/api/trigger") {
      let body = "";
      req.on("data", c => body += c);
      req.on("end", async () => {
        try {
          const opts = JSON.parse(body);
          let serverStatus = null;
          let succeeded = false;
          let errorMsg = null;

          const { SCENARIOS } = await import("./scenarios.js");
          const fn = SCENARIOS[opts.scenario];
          if (!fn) throw new Error(`Unknown scenario: ${opts.scenario}`);
          const result = fn(opts.amount, opts.phone);
          const payload = Array.isArray(result) ? result[0] : result;

          try {
            const r = await fetch(opts.url, {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-Daraja-Simulated": "true" },
              body: JSON.stringify(payload),
              signal: AbortSignal.timeout(10_000),
            });
            serverStatus = r.status;
            succeeded = r.ok;
          } catch (e) {
            errorMsg = e.message;
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: succeeded, serverStatus, error: errorMsg }));
        } catch (e) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    // API: Get queue
    if (req.method === "GET" && url.pathname === "/api/queue") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ queue: getQueue() }));
      return;
    }

    // API: Clear queue
    if (req.method === "DELETE" && url.pathname === "/api/queue") {
      const { clearQueue } = await import("./replay.js");
      clearQueue();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // API: Replay
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

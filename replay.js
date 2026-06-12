/**
 * replay.js
 * Persists failed callbacks to disk, replays them on demand.
 * Simulates Safaricom's real retry behavior after server downtime.
 */

import fs from "fs";
import path from "path";
import os from "os";
import * as log from "./logger.js";

const STORE_DIR = path.join(os.homedir(), ".daraja-toolkit");
const QUEUE_FILE = path.join(STORE_DIR, "callback-queue.json");
const LOG_FILE = path.join(STORE_DIR, "callback-log.json");

function ensureStore() {
  if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
}

function readJSON(file) {
  try {
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return [];
  }
}

function writeJSON(file, data) {
  ensureStore();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

// ─── Persist to log (all callbacks ever fired) ────────────────────────────────

export function persistCallback(entry) {
  const log = readJSON(LOG_FILE);
  log.push({ ...entry, id: `cb_${Date.now()}` });
  writeJSON(LOG_FILE, log);
}

// ─── Queue (failed callbacks pending replay) ──────────────────────────────────

export async function queueCallback(entry) {
  const queue = readJSON(QUEUE_FILE);
  queue.push({ ...entry, id: `q_${Date.now()}`, attempts: 1 });
  writeJSON(QUEUE_FILE, queue);
}

export function getQueue() {
  return readJSON(QUEUE_FILE);
}

export function clearQueue() {
  writeJSON(QUEUE_FILE, []);
}

export function removeFromQueue(id) {
  const queue = readJSON(QUEUE_FILE).filter(e => e.id !== id);
  writeJSON(QUEUE_FILE, queue);
}

// ─── Replay ───────────────────────────────────────────────────────────────────

/**
 * Replay all queued callbacks.
 * @param {object} opts
 * @param {number} opts.delay   ms between replays (default 500)
 * @param {number} opts.from    timestamp — only replay callbacks queued after this
 */
export async function replayAll(opts = {}) {
  const { delay = 500, from = 0 } = opts;

  const queue = readJSON(QUEUE_FILE).filter(e => (e.failedAt || 0) >= from);

  if (queue.length === 0) {
    log.info("Queue empty. Nothing to replay.");
    return;
  }

  log.info(`Replaying ${queue.length} queued callback(s)...`);
  log.divider();

  let succeeded = 0;
  let failed = 0;

  for (const entry of queue) {
    log.info(`Replaying: ${entry.scenario} → ${entry.url}`);
    log.info(`Originally failed: ${new Date(entry.failedAt).toLocaleString()} — ${entry.reason}`);

    try {
      const res = await fetch(entry.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Daraja-Toolkit/1.0 (STK-Replay)",
          "X-Daraja-Simulated": "true",
          "X-Daraja-Replay": "true",
          "X-Daraja-Attempt": String((entry.attempts || 1) + 1),
        },
        body: JSON.stringify(entry.payload),
        signal: AbortSignal.timeout(10_000),
      });

      if (res.ok) {
        log.success(`Replay succeeded (${res.status})`);
        removeFromQueue(entry.id);
        succeeded++;
      } else {
        log.error(`Replay failed: server returned ${res.status}`);
        // Increment attempt count
        const q = readJSON(QUEUE_FILE);
        const idx = q.findIndex(e => e.id === entry.id);
        if (idx !== -1) { q[idx].attempts = (q[idx].attempts || 1) + 1; writeJSON(QUEUE_FILE, q); }
        failed++;
      }
    } catch (err) {
      log.error(`Replay failed: ${err.message}`);
      failed++;
    }

    if (delay > 0) await new Promise(r => setTimeout(r, delay));
    log.divider();
  }

  log.info(`Replay complete: ${succeeded} succeeded, ${failed} still failing.`);
  if (failed > 0) log.warn(`${failed} callbacks remain in queue. Fix server, then run: daraja replay`);
}

// ─── Status ───────────────────────────────────────────────────────────────────

export function showStatus() {
  const queue = readJSON(QUEUE_FILE);
  const history = readJSON(LOG_FILE);

  log.divider();
  log.info(`Queue: ${queue.length} pending replay`);
  log.info(`History: ${history.length} total callbacks fired this session`);

  if (queue.length > 0) {
    log.divider();
    log.warn("Pending callbacks:");
    queue.forEach((e, i) => {
      console.log(`  ${i + 1}. [${e.scenario}] → ${e.url}`);
      console.log(`     Failed: ${new Date(e.failedAt).toLocaleString()} — ${e.reason}`);
      console.log(`     Attempts: ${e.attempts}`);
    });
  }

  if (history.length > 0) {
    log.divider();
    log.info("Recent history (last 10):");
    history.slice(-10).forEach((e, i) => {
      const t = new Date(e.firedAt).toLocaleTimeString();
      console.log(`  ${i + 1}. [${e.scenario}] → ${e.url} at ${t}`);
    });
  }
  log.divider();
}

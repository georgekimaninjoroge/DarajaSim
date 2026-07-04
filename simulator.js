import { SCENARIOS } from "./scenarios.js";
import * as log from "./logger.js";
import { queueCallback, persistCallback } from "./replay.js";

const DEFAULT_DELAY_MS = 2000; 

async function fireCallback(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Daraja-Toolkit/1.0 (STK-Simulator)",
      "X-Daraja-Simulated": "true",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });

  const body = await res.text().catch(() => "");
  return { ok: res.ok, status: res.status, body };
}

/**
 * Main simulate function.
 *
 * @param {object} opts
 * @param {string}  opts.url       Full callback URL e.g. http://localhost:3000/api/mpesa/callback
 * @param {string}  opts.scenario  success | cancel | timeout | insufficient | wrong_pin | duplicate
 * @param {number}  opts.amount    Transaction amount
 * @param {string}  opts.phone     Phone number (any format)
 * @param {number}  opts.delay     Delay in ms before firing (default 2000)
 * @param {boolean} opts.verbose   Print full payload
 * @param {boolean} opts.noQueue   Skip queue on failure (for replay)
 */
export async function simulate(opts) {
  const {
    url,
    scenario = "success",
    amount = 1,
    phone = "0712345678",
    delay = DEFAULT_DELAY_MS,
    verbose = false,
    noQueue = false,
  } = opts;

  const scenarioFn = SCENARIOS[scenario];
  if (!scenarioFn) {
    log.error(`Unknown scenario: ${scenario}. Valid: ${Object.keys(SCENARIOS).join(", ")}`);
    process.exit(1);
  }


  const result = scenarioFn(amount, phone);
  const payloads = Array.isArray(result) ? result : [result];

  log.info(`Scenario: ${scenario.toUpperCase()} | Amount: KES ${amount} | Phone: ${phone}`);
  log.info(`Target:   ${url}`);

  if (delay > 0) {
    log.info(`Firing in ${delay}ms... (simulating Safaricom processing time)`);
    await new Promise(r => setTimeout(r, delay));
  }

  for (let i = 0; i < payloads.length; i++) {
    const payload = payloads[i];

    if (payloads.length > 1) {
      log.info(`Sending callback ${i + 1}/${payloads.length}${i > 0 ? " (duplicate)" : ""}...`);
      if (i > 0) await new Promise(r => setTimeout(r, 500));
    }

    if (verbose) log.payloadPreview(payload);


    if (!noQueue) {
      persistCallback({ url, payload, scenario, firedAt: Date.now() });
    }

    try {
      const res = await fireCallback(url, payload);
      const cb = payload.Body.stkCallback;

      if (res.ok) {
        log.callbackResult("success", cb.ResultCode, cb.ResultDesc, url);
        log.success(`Server responded ${res.status}. Callback handler working.`);
        if (res.body) log.info(`Response body: ${res.body.slice(0, 200)}`);
      } else {
        log.callbackResult("failed", cb.ResultCode, cb.ResultDesc, url);
        log.error(`Server returned ${res.status}. Check your callback handler.`);
        if (!noQueue) {
          await queueCallback({ url, payload, scenario, failedAt: Date.now(), reason: `HTTP ${res.status}` });
          log.warn("Queued for replay. Run: daraja replay");
        }
      }
    } catch (err) {
      const cb = payload.Body.stkCallback;
      log.callbackResult("failed", cb.ResultCode, cb.ResultDesc, url);

      if (err.name === "TimeoutError") {
        log.error("Request timed out (10s). Is your server running?");
      } else if (err.code === "ECONNREFUSED") {
        log.error(`Connection refused at ${url}. Server not running on that port.`);
      } else {
        log.error(`Network error: ${err.message}`);
      }

      if (!noQueue) {
        await queueCallback({ url, payload, scenario, failedAt: Date.now(), reason: err.message });
        log.warn("Queued for replay. Run: daraja replay");
      }
    }
  }
}
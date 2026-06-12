<p align="center">
  <img src="https://raw.githubusercontent.com/georgekimaninjoroge/DarajaSim/main/assets/banner.png" alt="DarajaSim" width="100%"/>
</p>

# Daraja Developer Toolkit

> Local M-PESA Daraja development toolkit — production-accurate STK callback simulation and offline recovery for Kenyan developers.

**No ngrok. No HTTPS. No deployment. No internet.**

Just run your local server and fire real-looking M-PESA callbacks at it instantly.

---

## The Problem

Every Kenyan developer building M-PESA integration hits this wall:

```
You: daraja.initiate({ callbackURL: "http://localhost:3000/callback" })
Safaricom: ❌ can't reach localhost
You: *installs ngrok, sets up tunnel, updates URL, restarts, ngrok crashes*
```

This toolkit solves it. Fire callbacks directly at localhost with one command.

---

## Install

```bash
npm install -g daraja-toolkit

# or without installing:
npx daraja-toolkit <command>
```

---

## Commands

### `daraja trigger` — Fire a callback

```bash
# Success payment
daraja trigger --amount 100 --phone 0712345678

# User cancels
daraja trigger --scenario cancel --amount 500 --phone 0712345678

# Timeout (user didn't respond)
daraja trigger --scenario timeout

# Insufficient balance
daraja trigger --scenario insufficient --amount 5000

# Wrong PIN
daraja trigger --scenario wrong_pin

# Duplicate callback (Safaricom retry simulation)
daraja trigger --scenario duplicate --amount 250

# Custom callback URL
daraja trigger --url http://localhost:8000/api/payments/mpesa --amount 100

# Fire immediately (no 2s delay)
daraja trigger --no-delay --scenario success

# Print full payload
daraja trigger --verbose
```

### `daraja replay` — Replay missed callbacks

When your server was down and callbacks failed, replay them after restart:

```bash
daraja replay

# With delay between replays
daraja replay --delay 1000

# Only replay callbacks that failed after a specific time
daraja replay --from 1704067200000
```

### `daraja status` — View queue

```bash
daraja status
```

### `daraja dashboard` — Browser UI

```bash
daraja dashboard
# Opens http://localhost:4000
```

### `daraja scenarios` — List all scenarios

```bash
daraja scenarios
```

---

## Scenarios

| Scenario | ResultCode | Description |
|---|---|---|
| `success` | 0 | Customer paid successfully |
| `cancel` | 1032 | User dismissed STK prompt |
| `timeout` | 1037 | User didn't respond in 60s |
| `insufficient` | 1 | Insufficient M-PESA balance |
| `wrong_pin` | 1032 | Wrong PIN entered 3 times |
| `duplicate` | 0 | Fires callback twice (Safaricom retry behavior) |

All payloads match Safaricom's production format exactly — same fields, same ResultCodes, realistic IDs.

---

## How It Works

```
daraja trigger
    │
    ├── generate production-accurate payload (scenarios.js)
    ├── wait 2s (simulate Safaricom processing time)
    ├── POST → http://localhost:3000/api/mpesa/callback
    │         Headers: Content-Type: application/json
    │                  X-Daraja-Simulated: true
    │
    ├── Server returns 200 → ✓ success
    └── Server down/error → queue callback → daraja replay later
```

Failed callbacks persist to `~/.daraja-toolkit/callback-queue.json`. Run `daraja replay` after fixing your server.

---

## Integration Example

```js
// Express.js callback handler
app.post("/api/mpesa/callback", (req, res) => {
  const { stkCallback } = req.body.Body;

  if (stkCallback.ResultCode === 0) {
    const amount = stkCallback.CallbackMetadata.Item.find(i => i.Name === "Amount").Value;
    const receipt = stkCallback.CallbackMetadata.Item.find(i => i.Name === "MpesaReceiptNumber").Value;
    const phone = stkCallback.CallbackMetadata.Item.find(i => i.Name === "PhoneNumber").Value;
    // ✓ Payment confirmed — update your DB
  } else {
    // Handle: cancel (1032), timeout (1037), insufficient (1)
  }

  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});
```

Test it:

```bash
daraja trigger --url http://localhost:3000/api/mpesa/callback --amount 500 --phone 0722000000
```

---

## Detecting Simulated Callbacks

The toolkit adds a header to every request:

```
X-Daraja-Simulated: true
X-Daraja-Replay: true   (on replayed callbacks)
```

Strip simulated callbacks in production:

```js
if (req.headers["x-daraja-simulated"]) return res.status(403).end();
```

---

## File Map

```
daraja-toolkit/
  bin/daraja.js        CLI entry (commander.js)
  lib/simulator.js     Fires callbacks at localhost
  lib/scenarios.js     All STK payload templates
  lib/replay.js        Queue + replay failed callbacks
  lib/logger.js        Pretty terminal output
  lib/dashboard.js     Browser UI (optional)
```

---

## Requirements

- Node.js 18+
- Your local server running on any port
- Nothing else

---

Built for the 8+ years Kenyan developers spent fighting ngrok.
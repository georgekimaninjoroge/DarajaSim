<p align="center">
  <img src="https://raw.githubusercontent.com/georgekimaninjoroge/DarajaSim/main/assets/banner.png" alt="DarajaSim" width="100%"/>
</p>

# DarajaSim

> Simulate M-PESA STK callbacks on localhost. No ngrok. No HTTPS. No internet.

---

## The Problem

Every Kenyan developer building M-PESA integration hits this wall:

```
You: daraja.initiate({ callbackURL: "http://localhost:3000/callback" })
Safaricom: ❌ can't reach localhost
You: *installs ngrok, sets up tunnel, updates URL, restarts, ngrok crashes*
```

DarajaSim solves it. Fire callbacks directly at localhost with one command.

---

## Install

```bash
npm install -g darajasim

# or without installing:
npx darajasim <command>
```

---

## Commands

### `darajasim trigger` — Fire a callback

```bash
# Success payment
darajasim trigger --amount 100 --phone 0712345678

# User cancels
darajasim trigger --scenario cancel --amount 500 --phone 0712345678

# Timeout (user didn't respond)
darajasim trigger --scenario timeout

# Insufficient balance
darajasim trigger --scenario insufficient --amount 5000

# Wrong PIN
darajasim trigger --scenario wrong_pin

# Duplicate callback (Safaricom retry simulation)
darajasim trigger --scenario duplicate --amount 250

# Custom callback URL
darajasim trigger --url http://localhost:8000/api/payments/mpesa --amount 100

# Fire immediately (no 2s delay)
darajasim trigger --no-delay --scenario success

# Print full payload
darajasim trigger --verbose
```

### `darajasim replay` — Replay missed callbacks

When your server was down and callbacks failed, replay them after restart:

```bash
darajasim replay

# With delay between replays
darajasim replay --delay 1000

# Only replay callbacks that failed after a specific time
darajasim replay --from 1704067200000
```

### `darajasim status` — View queue

```bash
darajasim status
```

### `darajasim dashboard` — Browser UI

```bash
darajasim dashboard
# Opens http://localhost:4000
```

### `darajasim scenarios` — List all scenarios

```bash
darajasim scenarios
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
darajasim trigger
    │
    ├── generate production-accurate payload (scenarios.js)
    ├── wait 2s (simulate Safaricom processing time)
    ├── POST → http://localhost:3000/api/mpesa/callback
    │         Headers: Content-Type: application/json
    │                  X-Daraja-Simulated: true
    │
    ├── Server returns 200 → ✓ success
    └── Server down/error → queue callback → darajasim replay later
```

Failed callbacks persist to `~/.darajasim/callback-queue.json`. Run `darajasim replay` after fixing your server.

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
darajasim trigger --url http://localhost:3000/api/mpesa/callback --amount 500 --phone 0722000000
```

---

## Detecting Simulated Callbacks

```
X-Daraja-Simulated: true
X-Daraja-Replay: true   (on replayed callbacks)
```

Strip in production:

```js
if (req.headers["x-daraja-simulated"]) return res.status(403).end();
```

---

## File Map

```
DarajaSim/
  daraja.js        CLI entry (commander.js)
  simulator.js     Fires callbacks at localhost
  scenarios.js     All STK payload templates
  replay.js        Queue + replay failed callbacks
  logger.js        Pretty terminal output
  dashboard.js     Browser UI (optional)
  assets/          Logo + banner
```

---

## Requirements

- Node.js 18+
- Your local server running on any port
- Nothing else

---

Built for the 8+ years Kenyan developers spent fighting ngrok.
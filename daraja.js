#!/usr/bin/env node

/**
 * daraja.js — CLI entry point
 * Usage: npx daraja <command> [options]
 */

import { Command } from "commander";
import { simulate } from "../lib/simulator.js";
import { replayAll, showStatus, clearQueue } from "../lib/replay.js";
import { startDashboard } from "../lib/dashboard.js";
import { SCENARIO_NAMES } from "../lib/scenarios.js";
import * as log from "../lib/logger.js";

const program = new Command();

program
  .name("daraja")
  .description("Local M-PESA Daraja development toolkit — no ngrok, no HTTPS needed")
  .version("1.0.0");

// ─── trigger ──────────────────────────────────────────────────────────────────

program
  .command("trigger")
  .description("Fire a production-accurate STK callback at your local server")
  .option("-u, --url <url>", "Callback URL", "http://localhost:3000/api/mpesa/callback")
  .option("-a, --amount <amount>", "Transaction amount (KES)", "100")
  .option("-p, --phone <phone>", "Phone number", "0712345678")
  .option("-s, --scenario <scenario>", `Scenario: ${SCENARIO_NAMES.join(" | ")}`, "success")
  .option("-d, --delay <ms>", "Delay before firing (ms)", "2000")
  .option("-v, --verbose", "Print full payload", false)
  .option("--no-delay", "Fire immediately (skip 2s delay)")
  .action(async (opts) => {
    log.banner();
    await simulate({
      url: opts.url,
      scenario: opts.scenario,
      amount: Number(opts.amount),
      phone: opts.phone,
      delay: opts.noDelay ? 0 : Number(opts.delay),
      verbose: opts.verbose,
    });
  });

// ─── replay ───────────────────────────────────────────────────────────────────

program
  .command("replay")
  .description("Replay all failed/queued callbacks")
  .option("--delay <ms>", "Delay between replays (ms)", "500")
  .option("--from <timestamp>", "Only replay callbacks failed after this Unix timestamp", "0")
  .action(async (opts) => {
    log.banner();
    await replayAll({
      delay: Number(opts.delay),
      from: Number(opts.from),
    });
  });

// ─── status ───────────────────────────────────────────────────────────────────

program
  .command("status")
  .description("Show pending queue and callback history")
  .action(() => {
    log.banner();
    showStatus();
  });

// ─── clear ────────────────────────────────────────────────────────────────────

program
  .command("clear")
  .description("Clear the failed callback queue")
  .action(() => {
    clearQueue();
    log.success("Queue cleared.");
  });

// ─── dashboard ────────────────────────────────────────────────────────────────

program
  .command("dashboard")
  .description("Open browser dashboard for visual testing")
  .option("--port <port>", "Dashboard port", "4000")
  .action(async (opts) => {
    log.banner();
    await startDashboard(Number(opts.port));
  });

// ─── scenarios ────────────────────────────────────────────────────────────────

program
  .command("scenarios")
  .description("List all available test scenarios")
  .action(() => {
    log.banner();
    log.divider();
    console.log("  Available scenarios:\n");
    const descriptions = {
      success:      "ResultCode 0    — Customer paid successfully",
      cancel:       "ResultCode 1032 — User dismissed STK prompt",
      timeout:      "ResultCode 1037 — User didn't respond in 60s",
      insufficient: "ResultCode 1    — Insufficient M-PESA balance",
      wrong_pin:    "ResultCode 1032 — Wrong PIN entered 3 times",
      duplicate:    "ResultCode 0    — Fires callback twice (Safaricom retry)",
    };
    Object.entries(descriptions).forEach(([name, desc]) => {
      console.log(`  \x1b[36m${name.padEnd(14)}\x1b[0m ${desc}`);
    });
    console.log();
    log.divider();
    console.log("\n  Example:\n");
    console.log("  \x1b[2mdaraja trigger --scenario cancel --phone 0712345678 --amount 500\x1b[0m\n");
  });

program.parse();

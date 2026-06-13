/**
 * logger.js — Pretty terminal output for daraja-toolkit
 */

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgGreen: "\x1b[42m",
  bgRed: "\x1b[41m",
  bgYellow: "\x1b[43m",
};

function ts() {
  return `${C.dim}[${new Date().toLocaleTimeString()}]${C.reset}`;
}

export function info(msg) {
  console.log(`${ts()} ${C.cyan}ℹ${C.reset} ${msg}`);
}

export function success(msg) {
  console.log(`${ts()} ${C.green}✓${C.reset} ${msg}`);
}

export function error(msg) {
  console.log(`${ts()} ${C.red}✗${C.reset} ${msg}`);
}

export function warn(msg) {
  console.log(`${ts()} ${C.yellow}⚠${C.reset} ${msg}`);
}

export function divider() {
  console.log(`${C.dim}${"─".repeat(60)}${C.reset}`);
}

export function banner() {
  console.log(`
${C.bold}${C.green}  ██████╗  █████╗ ██████╗  █████╗      ██╗ █████╗ ███████╗██╗███╗   ███╗${C.reset}
${C.bold}${C.green}  ██╔══██╗██╔══██╗██╔══██╗██╔══██╗     ██║██╔══██╗██╔════╝██║████╗ ████║${C.reset}
${C.bold}${C.green}  ██║  ██║███████║██████╔╝███████║     ██║███████║███████╗██║██╔████╔██║${C.reset}
${C.bold}${C.green}  ██║  ██║██╔══██║██╔══██╗██╔══██║██   ██║██╔══██║╚════██║██║██║╚██╔╝██║${C.reset}
${C.bold}${C.red}  ██████╔╝██║  ██║██║  ██║██║  ██║╚█████╔╝██║  ██║███████║██║██║ ╚═╝ ██║${C.reset}
${C.bold}${C.red}  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚════╝ ╚═╝  ╚═╝╚══════╝╚═╝╚═╝     ╚═╝${C.reset}
${C.bold}  DarajaSim Developer Toolkit${C.reset} ${C.dim}v1.0.1${C.reset}
${C.dim}  Local M-PESA STK callback simulator — no ngrok needed${C.reset}
`);
}

export function callbackResult(status, code, desc, target) {
  const icon = status === "success" ? `${C.bgGreen} SENT ${C.reset}` :
               status === "queued" ? `${C.bgYellow} QUEUED ${C.reset}` :
               `${C.bgRed} FAILED ${C.reset}`;
  console.log(`\n${ts()} ${icon}`);
  console.log(`  ${C.dim}Target:${C.reset}  ${target}`);
  console.log(`  ${C.dim}Code:${C.reset}    ${code === 0 ? C.green : C.red}${code}${C.reset}`);
  console.log(`  ${C.dim}Result:${C.reset}  ${desc}\n`);
}

export function payloadPreview(payload) {
  console.log(`\n${C.dim}Payload:${C.reset}`);
  console.log(C.dim + JSON.stringify(payload, null, 2).split("\n").map(l => "  " + l).join("\n") + C.reset);
  console.log();
}
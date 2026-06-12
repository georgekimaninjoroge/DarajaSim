/**
 * scenarios.js
 * Production-accurate STK callback payloads.
 * ResultCodes match real Safaricom Daraja responses exactly.
 */

function generateIds() {
  const ts = Date.now();
  const rand = () => Math.random().toString(36).substring(2, 8).toUpperCase();
  return {
    MerchantRequestID: `${Math.floor(ts / 1000)}-${Math.floor(Math.random() * 99999999)}-1`,
    CheckoutRequestID: `ws_CO_${new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14)}${rand()}`,
  };
}

function formatPhone(phone) {
  // Normalize to 254XXXXXXXXX
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("254")) return parseInt(digits);
  if (digits.startsWith("0")) return parseInt("254" + digits.slice(1));
  return parseInt("254" + digits);
}

function receiptNumber() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function transactionDate() {
  const now = new Date();
  return parseInt(
    `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}` +
    `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`
  );
}

/**
 * SUCCESS — ResultCode 0
 * Customer entered PIN, payment completed.
 */
export function success(amount, phone) {
  const ids = generateIds();
  return {
    Body: {
      stkCallback: {
        ...ids,
        ResultCode: 0,
        ResultDesc: "The service request is processed successfully.",
        CallbackMetadata: {
          Item: [
            { Name: "Amount", Value: amount },
            { Name: "MpesaReceiptNumber", Value: receiptNumber() },
            { Name: "Balance" },
            { Name: "TransactionDate", Value: transactionDate() },
            { Name: "PhoneNumber", Value: formatPhone(phone) },
          ],
        },
      },
    },
  };
}

/**
 * CANCEL — ResultCode 1032
 * User dismissed the STK prompt.
 */
export function cancel(amount, phone) {
  const ids = generateIds();
  return {
    Body: {
      stkCallback: {
        ...ids,
        ResultCode: 1032,
        ResultDesc: "Request cancelled by user.",
      },
    },
  };
}

/**
 * TIMEOUT — ResultCode 1037
 * User did not respond within 60 seconds.
 */
export function timeout(amount, phone) {
  const ids = generateIds();
  return {
    Body: {
      stkCallback: {
        ...ids,
        ResultCode: 1037,
        ResultDesc: "DS timeout user cannot be reached.",
      },
    },
  };
}

/**
 * INSUFFICIENT — ResultCode 1
 * User has insufficient M-PESA balance.
 */
export function insufficient(amount, phone) {
  const ids = generateIds();
  return {
    Body: {
      stkCallback: {
        ...ids,
        ResultCode: 1,
        ResultDesc: "The balance is insufficient for the transaction.",
      },
    },
  };
}

/**
 * WRONG_PIN — ResultCode 1032 (after 3 wrong attempts)
 * User entered wrong PIN too many times.
 */
export function wrongPin(amount, phone) {
  const ids = generateIds();
  return {
    Body: {
      stkCallback: {
        ...ids,
        ResultCode: 1032,
        ResultDesc: "Request cancelled by user.",
      },
    },
  };
}

/**
 * DUPLICATE — Success callback sent twice.
 * Safaricom retries if your server didn't ACK with 200.
 */
export function duplicate(amount, phone) {
  // Return same receipt number to simulate real duplicate
  const ids = generateIds();
  const receipt = receiptNumber();
  const payload = {
    Body: {
      stkCallback: {
        ...ids,
        ResultCode: 0,
        ResultDesc: "The service request is processed successfully.",
        CallbackMetadata: {
          Item: [
            { Name: "Amount", Value: amount },
            { Name: "MpesaReceiptNumber", Value: receipt },
            { Name: "Balance" },
            { Name: "TransactionDate", Value: transactionDate() },
            { Name: "PhoneNumber", Value: formatPhone(phone) },
          ],
        },
      },
    },
  };
  return [payload, { ...payload }]; // two identical payloads
}

export const SCENARIOS = {
  success,
  cancel,
  timeout,
  insufficient,
  wrong_pin: wrongPin,
  duplicate,
};

export const SCENARIO_NAMES = Object.keys(SCENARIOS);

export const RESULT_CODES = {
  0: "Success",
  1: "Insufficient balance",
  1032: "Cancelled by user",
  1037: "Timeout / user unreachable",
};

function generateIds() {
  const ts = Date.now();
  const rand = () => Math.random().toString(36).substring(2, 8).toUpperCase();
  return {
    MerchantRequestID: `${Math.floor(ts / 1000)}-${Math.floor(Math.random() * 99999999)}-1`,
    CheckoutRequestID: `ws_CO_${new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14)}${rand()}`,
  };
}

function formatPhone(phone) {

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

export function duplicate(amount, phone) {

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
  return [payload, { ...payload }]; 
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
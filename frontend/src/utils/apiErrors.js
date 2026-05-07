import { API_ERROR_MESSAGES, GENERIC_API_ERROR_MESSAGE } from "../constants/api";

export function formatApiError(payload) {
  const errors = Array.isArray(payload?.errors) ? payload.errors : [];
  if (errors.length > 0) {
    return errors.map(formatApiErrorCode).join(" ");
  }

  return formatApiErrorCode(payload?.error || "request_failed");
}

function formatApiErrorCode(code) {
  return API_ERROR_MESSAGES[code] || GENERIC_API_ERROR_MESSAGE;
}

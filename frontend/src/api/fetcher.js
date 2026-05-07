import { API_BASE, API_ERROR_MESSAGES } from "../constants/api";
import { formatApiError } from "../utils/apiErrors";

export function createApi(token) {
  return async function api(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    }).catch(() => {
      throw new Error(API_ERROR_MESSAGES.request_failed);
    });

    if (response.status === 204) return null;

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(formatApiError(payload));
    }
    return payload;
  };
}

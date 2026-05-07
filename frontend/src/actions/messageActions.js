export function fetchMessages(api, page) {
  return api(`/api/messages?page=${page}`);
}

export function createMessage(api, body) {
  return api("/api/messages", { method: "POST", body: { body } });
}

export function updateMessage(api, messageId, body) {
  return api(`/api/messages/${messageId}`, { method: "PATCH", body: { body } });
}

export function deleteMessage(api, messageId) {
  return api(`/api/messages/${messageId}`, { method: "DELETE" });
}

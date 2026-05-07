export function fetchAdminUsers(api, page, query) {
  const params = new URLSearchParams({ page: String(page) });
  if (query) params.set("q", query);
  return api(`/api/admin/users?${params.toString()}`);
}

export function createAdminUser(api, payload) {
  return api("/api/admin/users", { method: "POST", body: payload });
}

export function updateAdminUser(api, userId, payload) {
  return api(`/api/admin/users/${userId}`, { method: "PATCH", body: payload });
}

export function fetchAdminUser(api, userId) {
  return api(`/api/admin/users/${userId}`);
}

export function deleteAdminUser(api, userId) {
  return api(`/api/admin/users/${userId}`, { method: "DELETE" });
}

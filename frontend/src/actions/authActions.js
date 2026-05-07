export function login(api, form) {
  return api("/api/auth/login", { method: "POST", body: form });
}

export function register(api, form) {
  return api("/api/auth/register", { method: "POST", body: form });
}

export function logout(api) {
  return api("/api/auth/logout", { method: "DELETE" });
}

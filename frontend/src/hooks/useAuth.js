import { useMemo, useState } from "react";
import { createApi } from "../api/fetcher";
import { login, logout, register } from "../actions/authActions";
import { readStoredUser } from "../utils/storage";

export function useAuth() {
  const [initialSession] = useState(readInitialSession);
  const [token, setToken] = useState(initialSession.token);
  const [user, setUser] = useState(initialSession.user);
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");

  const api = useMemo(() => createApi(token), [token]);

  function applySession(payload) {
    setToken(payload.token);
    setUser(payload.user);
    localStorage.setItem("token", payload.token);
    localStorage.setItem("user", JSON.stringify(payload.user));
  }

  async function clearSession() {
    if (token) {
      await logout(api).catch(() => null);
    }
    setToken("");
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  async function submitAuth(form) {
    setError("");
    try {
      const payload = mode === "register" ? await register(api, form) : await login(api, form);
      applySession(payload);
    } catch (err) {
      setError(err.message);
    }
  }

  return {
    api,
    user,
    mode,
    error,
    setMode,
    submitAuth,
    clearSession,
  };
}

function readInitialSession() {
  const user = readStoredUser();
  return {
    token: user ? localStorage.getItem("token") || "" : "",
    user,
  };
}

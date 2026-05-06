import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const API_ERROR_MESSAGES = {
  unauthorized: "ログインが必要です。",
  forbidden: "この操作を行う権限がありません。",
  not_found: "対象のデータが見つかりません。",
  invalid_email_or_password: "メールアドレスまたはパスワードが正しくありません。",
  request_failed: "リクエストに失敗しました。時間をおいて再度お試しください。",
};
const GENERIC_API_ERROR_MESSAGE = "エラーが発生しました。時間をおいて再度お試しください。";
const CHAT_EMPTY_META = { page: 1, per_page: 10, total_count: 0, total_pages: 0 };
const ADMIN_EMPTY_META = { page: 1, per_page: 10, total_count: 0, total_pages: 0 };
const ADMIN_INITIAL_STATE = {
  users: { query: "", items: [], error: "", page: 1, meta: ADMIN_EMPTY_META },
};

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [user, setUser] = useState(readStoredUser);
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
      await api("/api/auth/logout", { method: "DELETE" }).catch(() => null);
    }
    setToken("");
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  async function handleAuth(path, form) {
    setError("");
    try {
      const payload = await api(path, { method: "POST", body: form });
      applySession(payload);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!user) {
    return (
      <main className="shell">
        <section className="panel auth-panel">
          <h1>サンプル伝言アプリ</h1>
          <div className="tabs">
            <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>ログイン</button>
            <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>新規作成</button>
          </div>
          <AuthForm mode={mode} onSubmit={handleAuth} />
          {error && <p className="error">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <h1>サンプル伝言アプリ</h1>
          <p>{user.name} / {user.email}</p>
        </div>
        <button onClick={clearSession}>ログアウト</button>
      </header>
      <Chat api={api} />
      {user.role === "admin" && <Admin api={api} currentUser={user} />}
    </main>
  );
}

function AuthForm({ mode, onSubmit }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", password_confirmation: "" });
  const isRegister = mode === "register";

  function update(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function submit(event) {
    event.preventDefault();
    onSubmit(isRegister ? "/api/auth/register" : "/api/auth/login", form);
  }

  return (
    <form onSubmit={submit} className="form">
      {isRegister && <input name="name" value={form.name} onChange={update} placeholder="名前" required />}
      <input name="email" type="email" value={form.email} onChange={update} placeholder="メールアドレス" required />
      <input name="password" type="password" value={form.password} onChange={update} placeholder="パスワード" required />
      {isRegister && (
        <input name="password_confirmation" type="password" value={form.password_confirmation} onChange={update} placeholder="パスワード確認" required />
      )}
      <button type="submit">{isRegister ? "作成" : "ログイン"}</button>
    </form>
  );
}

function Chat({ api }) {
  const [messages, setMessages] = useState([]);
  const [meta, setMeta] = useState(CHAT_EMPTY_META);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editBody, setEditBody] = useState("");

  async function loadMessages(nextPage = meta.page) {
    setError("");
    cancelEdit();
    try {
      const payload = await api(`/api/messages?page=${nextPage}`);
      const normalized = normalizeMessagesIndex(payload, nextPage);
      setMessages(normalized.items);
      setMeta(normalized.meta);
    } catch (err) {
      setMessages([]);
      setMeta({ ...CHAT_EMPTY_META, page: nextPage });
      setError(err.message);
    }
  }

  async function submit(event) {
    event.preventDefault();
    try {
      await api("/api/messages", { method: "POST", body: { body } });
      setBody("");
      await loadMessages(1);
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(message) {
    setEditingId(message.id);
    setEditBody(message.body || "");
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditBody("");
  }

  async function saveEdit(event, message) {
    event.preventDefault();
      setError("");
    try {
      await api(`/api/messages/${message.id}`, { method: "PATCH", body: { body: editBody } });
      cancelEdit();
      await loadMessages(meta.page);
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteMessage(message) {
    if (!window.confirm("削除しますか？")) return;

    setError("");
    try {
      await api(`/api/messages/${message.id}`, { method: "DELETE" });
      const nextPage = messages.length === 1 && meta.page > 1 ? meta.page - 1 : meta.page;
      await loadMessages(nextPage);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadMessages(1);
  }, []);

  const hasMessages = messages.length > 0;
  const hasPrevious = meta.page > 1;
  const hasNext = meta.total_pages > 0 && meta.page < meta.total_pages;

  return (
    <section className="panel">
      <div className="section-header">
        <h2>チャット</h2>
        <button onClick={() => loadMessages(meta.page)}>更新</button>
      </div>
      <form onSubmit={submit} className="inline-form">
        <input value={body} onChange={(event) => setBody(event.target.value)} placeholder="メッセージ" maxLength="500" required />
        <button type="submit">投稿</button>
      </form>
      {error && <p className="error">{error}</p>}
      <ul className="list">
        {messages.map((message) => (
          <li key={message.id} className="message-item">
            <div className="message-content">
              <strong>{message.user?.name || "不明なユーザー"}</strong>
              {editingId === message.id ? (
                <form className="edit-form" onSubmit={(event) => saveEdit(event, message)}>
                  <input value={editBody} onChange={(event) => setEditBody(event.target.value)} maxLength="500" required />
                  <div className="actions">
                    <button type="submit">保存</button>
                    <button type="button" onClick={cancelEdit}>キャンセル</button>
                  </div>
                </form>
              ) : (
                <span>{message.body}</span>
              )}
              {message.edited && <small className="edited-label">編集済み</small>}
            </div>
            {(message.can_edit || message.can_delete) && editingId !== message.id && (
              <div className="actions">
                {message.can_edit && <button onClick={() => startEdit(message)}>編集</button>}
                {message.can_delete && <button onClick={() => deleteMessage(message)}>削除</button>}
              </div>
            )}
          </li>
        ))}
      </ul>
      {!error && !hasMessages && <p className="empty">メッセージはまだありません。</p>}
      <div className="pagination">
        <button disabled={!hasPrevious} onClick={() => loadMessages(meta.page - 1)}>前へ</button>
        <span>{meta.total_pages > 0 ? `${meta.page} / ${meta.total_pages}` : "0件"}</span>
        <button disabled={!hasNext} onClick={() => loadMessages(meta.page + 1)}>次へ</button>
      </div>
    </section>
  );
}

function normalizeMessagesIndex(payload, requestedPage) {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      meta: { ...CHAT_EMPTY_META, page: requestedPage, total_count: payload.length, total_pages: payload.length > 0 ? 1 : 0 },
    };
  }

  const items = Array.isArray(payload?.items) ? payload.items : [];
  const rawMeta = payload?.meta || {};
  const perPage = Number(rawMeta.per_page) || CHAT_EMPTY_META.per_page;
  const totalCount = Number(rawMeta.total_count) || 0;
  const totalPages = Number(rawMeta.total_pages) || 0;
  const rawPage = Number(rawMeta.page) || requestedPage || 1;
  const normalizedPage = rawPage >= 1 ? rawPage : 1;

  return {
    items,
    meta: {
      page: normalizedPage,
      per_page: perPage,
      total_count: totalCount,
      total_pages: totalPages,
    },
  };
}

function Admin({ api, currentUser }) {
  const [adminState, setAdminState] = useState(ADMIN_INITIAL_STATE);
  const [formMode, setFormMode] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [formValues, setFormValues] = useState(emptyAdminUserForm());
  const current = adminState.users;

  function updateTabState(targetTab, changes) {
    setAdminState((state) => ({
      ...state,
      [targetTab]: { ...state[targetTab], ...changes },
    }));
  }

  async function load(targetTab = "users", page = adminState.users.page, query = adminState.users.query) {
    updateTabState(targetTab, { error: "" });
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (query) params.set("q", query);
      const payload = await api(`/api/admin/${targetTab}?${params.toString()}`);
      const normalized = normalizeAdminIndex(payload, page);
      updateTabState(targetTab, {
        items: normalized.items,
        meta: normalized.meta,
        page: normalized.meta.page,
        error: "",
      });
    } catch (err) {
      updateTabState(targetTab, { items: [], error: err.message });
    }
  }

  function updateQuery(value) {
    updateTabState("users", { query: value });
  }

  function search(event) {
    event.preventDefault();
    updateTabState("users", { page: 1 });
    load("users", 1, current.query);
  }

  function changePage(nextPage) {
    load("users", nextPage, current.query);
  }

  function startCreateUser() {
    updateTabState("users", { error: "" });
    setFormMode("create");
    setEditingUserId(null);
    setFormValues(emptyAdminUserForm());
  }

  function startEditUser(item) {
    updateTabState("users", { error: "" });
    setFormMode("edit");
    setEditingUserId(item.id);
    setFormValues({
      name: item.name || "",
      email: item.email || "",
      password: "",
      password_confirmation: "",
      role: item.role || "member",
    });
  }

  function cancelUserForm() {
    setFormMode(null);
    setEditingUserId(null);
    setFormValues(emptyAdminUserForm());
  }

  function updateUserForm(event) {
    setFormValues({ ...formValues, [event.target.name]: event.target.value });
  }

  function userFormPayload() {
    const payload = {
      name: formValues.name,
      email: formValues.email,
      role: formValues.role,
    };

    if (formMode === "create" || formValues.password) {
      payload.password = formValues.password;
      payload.password_confirmation = formValues.password_confirmation;
    }

    return payload;
  }

  async function submitUserForm(event) {
    event.preventDefault();
    updateTabState("users", { error: "" });

    try {
      if (formMode === "edit") {
        await api(`/api/admin/users/${editingUserId}`, { method: "PATCH", body: userFormPayload() });
      } else {
        await api("/api/admin/users", { method: "POST", body: userFormPayload() });
      }
      cancelUserForm();
      await load("users", adminState.users.page, adminState.users.query);
    } catch (err) {
      updateTabState("users", { error: err.message });
    }
  }

  async function showItem(item) {
    updateTabState("users", { error: "" });
    try {
      const payload = await api(`/api/admin/users/${item.id}`);
      window.alert(formatItem(payload));
    } catch (err) {
      updateTabState("users", { error: err.message });
    }
  }

  async function deleteItem(item) {
    if (!window.confirm("削除しますか？")) return;

    updateTabState("users", { error: "" });
    try {
      await api(`/api/admin/users/${item.id}`, { method: "DELETE" });
      const nextPage = current.items.length === 1 && current.page > 1 ? current.page - 1 : current.page;
      await load("users", nextPage, current.query);
    } catch (err) {
      updateTabState("users", { error: err.message });
    }
  }

  useEffect(() => {
    load("users");
  }, []);

  const hasItems = current.items.length > 0;
  const hasPrevious = current.meta.page > 1;
  const hasNext = current.meta.total_pages > 0 && current.meta.page < current.meta.total_pages;

  return (
    <section className="panel">
      <div className="section-header">
        <h2>ユーザー管理</h2>
      </div>
      <form className="inline-form" onSubmit={search}>
        <input
          className="admin-user-search"
          value={current.query}
          onChange={(event) => updateQuery(event.target.value)}
          placeholder="検索"
        />
        <button type="submit">検索</button>
        <button type="button" onClick={startCreateUser}>追加</button>
      </form>
      {formMode && (
        <form className="form admin-user-form" onSubmit={submitUserForm}>
          <input name="name" value={formValues.name} onChange={updateUserForm} placeholder="名前" required />
          <input name="email" type="email" value={formValues.email} onChange={updateUserForm} placeholder="メールアドレス" required />
          <input name="password" type="password" value={formValues.password} onChange={updateUserForm} placeholder="パスワード" required={formMode === "create"} />
          <input
            name="password_confirmation"
            type="password"
            value={formValues.password_confirmation}
            onChange={updateUserForm}
            placeholder="パスワード確認"
            required={formMode === "create" || Boolean(formValues.password)}
          />
          <select name="role" value={formValues.role} onChange={updateUserForm}>
            <option value="member">member</option>
            <option value="admin">admin</option>
          </select>
          <div className="actions">
            <button type="submit">{formMode === "create" ? "作成" : "保存"}</button>
            <button type="button" onClick={cancelUserForm}>キャンセル</button>
          </div>
        </form>
      )}
      {current.error && <p className="error">{current.error}</p>}
      <ul className="list">
        {current.items.map((item) => (
          <li key={item.id}>
            <span>{formatAdminListItem(item)}</span>
            <div className="actions">
              <button onClick={() => showItem(item)}>表示</button>
              <button onClick={() => startEditUser(item)}>編集</button>
              {currentUser?.id !== item.id && <button onClick={() => deleteItem(item)}>削除</button>}
            </div>
          </li>
        ))}
      </ul>
      {!current.error && !hasItems && <p className="empty">該当するデータがありません。</p>}
      <div className="pagination">
        <button disabled={!hasPrevious} onClick={() => changePage(current.meta.page - 1)}>前へ</button>
        <span>{current.meta.total_pages > 0 ? `${current.meta.page} / ${current.meta.total_pages}` : "0件"}</span>
        <button disabled={!hasNext} onClick={() => changePage(current.meta.page + 1)}>次へ</button>
      </div>
    </section>
  );
}

function normalizeAdminIndex(payload, requestedPage) {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      meta: { ...ADMIN_EMPTY_META, page: requestedPage, total_count: payload.length, total_pages: payload.length > 0 ? 1 : 0 },
    };
  }

  const items = Array.isArray(payload?.items) ? payload.items : [];
  const rawMeta = payload?.meta || {};
  const perPage = Number(rawMeta.per_page) || ADMIN_EMPTY_META.per_page;
  const totalCount = Number(rawMeta.total_count) || 0;
  const totalPages = Number(rawMeta.total_pages) || 0;
  const page = Number(rawMeta.page) || requestedPage || 1;

  return {
    items,
    meta: {
      page: page >= 1 ? page : 1,
      per_page: perPage,
      total_count: totalCount,
      total_pages: totalPages,
    },
  };
}

function emptyAdminUserForm() {
  return { name: "", email: "", password: "", password_confirmation: "", role: "member" };
}

function formatAdminListItem(item) {
  return `${item.name} / ${item.email} / ${item.role}`;
}

function formatItem(item) {
  return `${item.name}\n${item.email}\n${item.role}`;
}

function createApi(token) {
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

function formatApiError(payload) {
  const errors = Array.isArray(payload?.errors) ? payload.errors : [];
  if (errors.length > 0) {
    return errors.map(formatApiErrorCode).join(" ");
  }

  return formatApiErrorCode(payload?.error || "request_failed");
}

function formatApiErrorCode(code) {
  return API_ERROR_MESSAGES[code] || GENERIC_API_ERROR_MESSAGE;
}

function readStoredUser() {
  try {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  } catch {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    return null;
  }
}

createRoot(document.getElementById("root")).render(<App />);

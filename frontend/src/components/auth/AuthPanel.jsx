import { useState } from "react";

export function AuthPanel({ mode, error, onModeChange, onSubmit }) {
  return (
    <main className="shell">
      <section className="panel auth-panel">
        <h1>サンプル伝言アプリ</h1>
        <div className="tabs">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => onModeChange("login")}
          >
            ログイン
          </button>
          <button
            className={mode === "register" ? "active" : ""}
            onClick={() => onModeChange("register")}
          >
            新規作成
          </button>
        </div>
        <AuthForm mode={mode} onSubmit={onSubmit} />
        {error && <p className="error">{error}</p>}
      </section>
    </main>
  );
}

function AuthForm({ mode, onSubmit }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
  });
  const isRegister = mode === "register";

  function update(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function submit(event) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={submit} className="form">
      {isRegister && (
        <input name="name" value={form.name} onChange={update} placeholder="名前" required />
      )}
      <input
        name="email"
        type="email"
        value={form.email}
        onChange={update}
        placeholder="メールアドレス"
        required
      />
      <input
        name="password"
        type="password"
        value={form.password}
        onChange={update}
        placeholder="パスワード"
        required
      />
      {isRegister && (
        <input
          name="password_confirmation"
          type="password"
          value={form.password_confirmation}
          onChange={update}
          placeholder="パスワード確認"
          required
        />
      )}
      <button type="submit">{isRegister ? "作成" : "ログイン"}</button>
    </form>
  );
}

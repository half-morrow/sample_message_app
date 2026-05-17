import { AdminUsersPanel } from "./components/admin/AdminUsersPanel";
import { AuthPanel } from "./components/auth/AuthPanel";
import { ChatPanel } from "./components/chat/ChatPanel";
import { useAdminUsers } from "./hooks/useAdminUsers";
import { useAuth } from "./hooks/useAuth";
import { useChatMessages } from "./hooks/useChatMessages";

export function App() {
  const auth = useAuth();

  if (!auth.user) {
    return (
      <AuthPanel
        mode={auth.mode}
        error={auth.error}
        onModeChange={auth.setMode}
        onSubmit={auth.submitAuth}
      />
    );
  }

  return <AuthenticatedApp auth={auth} />;
}

function AuthenticatedApp({ auth }) {
  const chat = useChatMessages(auth.api);
  const admin = useAdminUsers(auth.api, auth.user.role === "admin");

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <h1>サンプル伝言アプリ</h1>
          <p>
            {auth.user.name} / {auth.user.email}
          </p>
        </div>
        <button onClick={auth.clearSession}>ログアウト</button>
      </header>
      <ChatPanel chat={chat} />
      {auth.user.role === "admin" && <AdminUsersPanel admin={admin} currentUser={auth.user} />}
    </main>
  );
}

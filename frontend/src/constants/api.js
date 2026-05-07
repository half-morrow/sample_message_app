export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export const API_ERROR_MESSAGES = {
  unauthorized: "ログインが必要です。",
  forbidden: "この操作を行う権限がありません。",
  not_found: "対象のデータが見つかりません。",
  invalid_email_or_password: "メールアドレスまたはパスワードが正しくありません。",
  request_failed: "リクエストに失敗しました。時間をおいて再度お試しください。",
};

export const GENERIC_API_ERROR_MESSAGE = "エラーが発生しました。時間をおいて再度お試しください。";

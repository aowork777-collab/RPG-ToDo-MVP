// Resolve against the page so GitHub Pages' repository subdirectory is retained.
export function googleSignInOptions(href) {
  return {provider: "google", options: {redirectTo: new URL("./hub.html", href).href, queryParams: {prompt: "select_account"}}};
}

export function readAuthReturn(href) {
  const url = new URL(href), hash = new URLSearchParams(url.hash.slice(1));
  const parameters = [url.searchParams, hash];
  const returned = parameters.some(p => ["code", "access_token", "error", "error_code", "error_description"].some(key => p.has(key)));
  const failed = parameters.some(p => p.has("error") || p.has("error_code") || p.has("error_description"));
  // Inspect the provider text only to classify it. Never display or retain the raw URL,
  // auth code, token, or error description in a diagnostic report.
  const failure = parameters.map(p => [p.get("error_code"), p.get("error"), p.get("error_description")].filter(Boolean).join(" ")).join(" ");
  return {returned, failed, hasCode: parameters.some(p => p.has("code")), message: failed ? authErrorMessage(failure) : ""};
}

export function authErrorMessage(error = "") {
  const text = typeof error === "string" ? error : [error?.code, error?.name, error?.message, error?.details?.code].filter(Boolean).join(" ");
  if (/invalid_client|deleted_client/i.test(text)) return "Googleログインの設定に問題があります（invalid_client）。運営側で同じOAuthクライアントのIDとシークレットの組み合わせを確認する必要があります。個人のタスクはログインせずに使えます。［GOOGLE_CLIENT_CONFIG］";
  if (/exchang.*external.*code|external.*code.*exchang|oauth.*token.*exchange/i.test(text)) return "Googleの認証結果を受け取れませんでした。運営側でGoogleとSupabaseの連携設定を確認する必要があります。繰り返しログインしても解決しない場合があります。［GOOGLE_TOKEN_EXCHANGE］";
  if (/email.*external.*provider|email_not_found|provider_email_needs_verification/i.test(text)) return "Googleアカウントのメール情報を確認できませんでした。メール情報への許可と連携設定の確認が必要です。［GOOGLE_EMAIL］";
  if (/bad_code_verifier|flow_state_not_found|flow_state_expired|AuthPKCE|code.verifier|invalid_grant/i.test(text)) return "ログイン開始時の情報が見つからないか、期限が切れています。この画面の「Googleでログイン」からやり直し、同じブラウザで完了してください。［AUTH_SESSION_EXPIRED］";
  if (/storage_unavailable|QuotaExceededError|SecurityError/i.test(text)) return "このブラウザにログイン情報を保存できません。サイトの保存を許可するか、Safari・Chromeなどの通常ブラウザで開いてください。ToDoデータを削除する必要はありません。［AUTH_STORAGE］";
  if (/access_denied|user_cancelled/i.test(text)) return "ログインがキャンセルされたか、許可されませんでした。利用するGoogleアカウントを確認し、もう一度お試しください。［AUTH_CANCELLED］";
  if (/signup_disabled|provider_disabled|oauth_provider_not_supported/i.test(text)) return "このアプリのGoogleログインまたは新規登録が停止されています。運営側で設定を確認する必要があります。［AUTH_DISABLED］";
  if (/fetch|network|timeout|AuthRetryableFetchError/i.test(text)) return "認証サービスに接続できませんでした。通信を確認してから、もう一度ログインしてください。［AUTH_NETWORK］";
  if (/server_error|unexpected_failure/i.test(text)) return "認証サービス側で処理に失敗しました。運営に末尾の確認コードをお知らせください。ToDoデータの削除や連続した再試行は不要です。［AUTH_PROVIDER_ERROR］";
  if (/missing_session/i.test(text)) return "認証後のログイン情報を確認できませんでした。この画面からもう一度ログインしてください。再発する場合は末尾の確認コードを運営へお知らせください。［AUTH_NO_SESSION］";
  return "ログインを完了できませんでした。末尾の確認コードを運営にお知らせください。個人のタスクはそのまま使えます。［AUTH_UNKNOWN］";
}

export class LoginError extends Error {
  constructor(message) { super(message); this.name = "LoginError"; }
}

// getSession() alone discards the SDK's callback-initialization error. Await the
// existing initialization promise; do not exchange the one-use code a second time.
export async function resolveAuthUser(auth, callback = {}) {
  const initialized = callback.returned ? await auth.initialize() : null;
  if (callback.failed) throw new LoginError(callback.message);
  if (initialized?.error) throw new LoginError(authErrorMessage(initialized.error));
  const {data, error} = await auth.getSession();
  if (error) throw new LoginError(authErrorMessage(error));
  const user = data?.session?.user || null;
  if (!user && callback.returned) throw new LoginError(authErrorMessage(callback.hasCode ? "code_verifier_missing" : "missing_session"));
  return user;
}

export async function beginGoogleSignIn(auth, href, browserWindow) {
  // The SDK can fall back to memory storage, which is lost on the Google redirect.
  // Test persistence before leaving this page, without touching existing records.
  const key = `rpg-todo:auth-probe:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  try {
    const storage = browserWindow.localStorage;
    storage.setItem(key, "ok");
    const saved = storage.getItem(key) === "ok";
    storage.removeItem(key);
    if (!saved) throw Error("storage_unavailable");
  } catch { throw new LoginError(authErrorMessage("storage_unavailable")); }
  try {
    const {error} = await auth.signInWithOAuth(googleSignInOptions(href));
    if (error) throw error;
  } catch (error) { throw new LoginError(authErrorMessage(error)); }
}

export function cleanAuthReturn(href, history) {
  const url = new URL("./hub.html", href); url.hash = "community";
  history.replaceState(null, "", url.href);
}

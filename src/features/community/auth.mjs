// Resolve against the page so GitHub Pages' repository subdirectory is retained.
export function googleSignInOptions(href) {
  return {provider: "google", options: {redirectTo: new URL("./hub.html", href).href, queryParams: {prompt: "select_account"}}};
}

export function readAuthReturn(href) {
  const url = new URL(href), hash = new URLSearchParams(url.hash.slice(1));
  const parameters = [url.searchParams, hash];
  const returned = parameters.some(p => ["code", "access_token", "error", "error_code", "error_description"].some(key => p.has(key)));
  const failed = parameters.some(p => p.has("error") || p.has("error_code") || p.has("error_description"));
  const code = parameters.map(p => p.get("error_code") || p.get("error") || "").join(" ");
  return {returned, message: failed ? authErrorMessage(code) : ""};
}

export function authErrorMessage(code = "") {
  if (/invalid_client|deleted_client/i.test(code)) return "Googleログインの設定に問題があります。運営にエラー名「invalid_client」をお知らせください。個人のタスクはログインせずに使えます。";
  if (/access_denied/i.test(code)) return "ログインがキャンセルされたか、許可されませんでした。利用するGoogleアカウントを確認し、もう一度お試しください。";
  return "ログインを完了できませんでした。同じブラウザで「Googleでログイン」をもう一度お試しください。";
}

export function cleanAuthReturn(href, history) {
  const url = new URL("./hub.html", href); url.hash = "community";
  history.replaceState(null, "", url.href);
}

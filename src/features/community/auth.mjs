// Resolve against the page so GitHub Pages' repository subdirectory is retained.
export function googleSignInOptions(href) {
  return {provider: "google", options: {redirectTo: new URL("./hub.html", href).href, queryParams: {prompt: "select_account"}}};
}

export function readAuthReturn(href) {
  const url = new URL(href), hash = new URLSearchParams(url.hash.slice(1));
  const parameters = [url.searchParams, hash];
  const returned = parameters.some(p => ["code", "access_token", "error", "error_description"].some(key => p.has(key)));
  const failed = parameters.some(p => p.has("error") || p.has("error_description"));
  return {returned, message: failed ? "ログインがキャンセルされたか、認証できませんでした。Googleでログインをもう一度お試しください。" : ""};
}

export function cleanAuthReturn(href, history) {
  const url = new URL("./hub.html", href); url.hash = "community";
  history.replaceState(null, "", url.href);
}

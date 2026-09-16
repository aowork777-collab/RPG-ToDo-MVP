const entries = [["☀", "今日", "./index.html", "today"], ["▦", "記録", "./hub.html#records", "records"], ["⚔", "冒険", "./hub.html#adventure", "adventure"], ["♧", "仲間", "./hub.html#community", "community"], ["☺", "自分", "./hub.html#profile", "profile"]];
function navigation() {
  document.querySelectorAll(".page-nav").forEach(node => node.remove());
  let nav = document.getElementById("mainNavigation");
  if (!nav) {nav = document.createElement("nav"); nav.id = "mainNavigation"; nav.className = "main-navigation"; nav.setAttribute("aria-label", "メインメニュー"); const header = document.querySelector(".topbar, .game-page-header, .hub-header, .settings-header"); if (header) header.after(nav); else document.body.prepend(nav);}
  const page = location.pathname.endsWith("hub.html") ? location.hash.slice(1) || "records" : location.pathname.endsWith("battle.html") ? "adventure" : location.pathname.endsWith("settings.html") ? "settings" : "today";
  nav.replaceChildren();
  for (const [icon, label, href, key] of entries) {const a = document.createElement("a"); a.href = href; if (key === page) a.setAttribute("aria-current", "page"); const mark = document.createElement("span"); mark.textContent = icon; mark.setAttribute("aria-hidden", "true"); a.append(mark, document.createTextNode(label)); nav.append(a);}
}
navigation(); window.addEventListener("hashchange", navigation);
window.addEventListener("rpg:navigation", navigation);

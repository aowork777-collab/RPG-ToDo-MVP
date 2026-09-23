import { createIcon } from "./ui/icons.mjs";
const entries = [["today", "今日", "./index.html", "today"], ["calendar", "記録", "./hub.html#records", "records"], ["compass", "冒険", "./hub.html#adventure", "adventure"], ["users", "仲間", "./hub.html#community", "community"], ["user", "自分", "./hub.html#profile", "profile"]];
const descriptions = {today: "タスクを管理", records: "カレンダー・功績", adventure: "育ったレベルで戦う", community: "共有・応援", profile: "プロフィール"};
function navigation() {
  document.querySelectorAll(".page-nav").forEach(node => node.remove());
  let nav = document.getElementById("mainNavigation");
  if (!nav) {nav = document.createElement("nav"); nav.id = "mainNavigation"; nav.className = "main-navigation"; nav.setAttribute("aria-label", "メインメニュー"); const header = document.querySelector(".topbar, .game-page-header, .hub-header, .settings-header"); if (header) header.after(nav); else document.body.prepend(nav);}
  const page = location.pathname.endsWith("hub.html") ? location.hash.slice(1) || "records" : location.pathname.endsWith("battle.html") ? "adventure" : location.pathname.endsWith("settings.html") ? "settings" : "today";
  nav.replaceChildren();
  for (const [icon, label, href, key] of entries) {
    const a = document.createElement("a"); a.href = href; a.setAttribute("aria-label", `${label}：${descriptions[key]}`);
    if (key === page) a.setAttribute("aria-current", "page");
    const mark = document.createElement("span"); mark.className = "nav-icon"; mark.append(createIcon(icon)); mark.setAttribute("aria-hidden", "true");
    const copy = document.createElement("span"); copy.className = "nav-copy";
    const name = document.createElement("strong"); name.textContent = label;
    const description = document.createElement("small"); description.textContent = descriptions[key];
    copy.append(name, description); a.append(mark, copy); nav.append(a);
  }
}
navigation(); window.addEventListener("hashchange", navigation);
window.addEventListener("rpg:navigation", navigation);

import { loadState, saveState } from "./storage.mjs";
import { renderProfileEditor } from "./features/habits/profile.mjs";
import { renderCalendar } from "./features/habits/calendar.mjs";
import { el, button, link, field, selectField, panel, submit, notice, run } from "./features/habits/dom.mjs";
import { renderAdventure } from "./game/ui/adventure-map.mjs";
import { getProgress } from "./model.mjs";
import { readAuthReturn, cleanAuthReturn, LoginError } from "./features/community/auth.mjs";

const root = document.getElementById("hubRoot");
let request = 0, authSubscribed = false;
const callback = readAuthReturn(location.href);
let authReturn = callback.returned;
function finishAuthReturn() {
  if (!authReturn) return;
  authReturn = false; cleanAuthReturn(location.href, history);
  window.dispatchEvent(new Event("rpg:navigation"));
}
function title(text, description, eyebrow) {
  document.title = `${text} / RPG ToDo`;
  const header = el("header", "hub-title"); const h1 = el("h1", "", text); h1.id = "hubTitle"; h1.tabIndex = -1;
  header.append(el("p", "hub-eyebrow", eyebrow), h1, el("p", "muted", description)); return header;
}
async function render() {
  const runId = ++request, state = loadState(), raw = localStorage.getItem("rpg-todo:v1"); let base = raw;
  const commit = () => {
    if (localStorage.getItem("rpg-todo:v1") !== base) { notice("ほかの画面で記録が更新されました。この画面を再読み込みしてから保存してください。", "error"); return false; }
    const result = saveState(state); if (!result.ok) {notice("端末に保存できませんでした。保存容量を確認してください。", "error"); return false;}
    base = localStorage.getItem("rpg-todo:v1"); return true;
  };
  const page = authReturn ? "community" : location.hash.slice(1) || "records";
  root.replaceChildren(); document.getElementById("hubNotice").hidden = true;
  if (page === "profile") {
    root.append(title("プロフィール", "自分の写真・表示名・目標・興味のあるタグを設定できます。", "自分のペースで続けよう"));
    renderProfileEditor(root, state, commit);
    root.append(link("仲間への公開・クラウド保管を設定 →", "./hub.html#community"));
  } else if (page === "adventure") {
    root.append(title("冒険マップ", "タスクで上げたレベルが、戦う力になります。次のステージに挑戦しましょう。", "今日の一歩が、冒険の力に")); renderAdventure(root, getProgress(state.totalXp).level);
  } else if (page === "community") {
    root.append(title("仲間と続ける", "招待した相手とタスクを共有したり、同じ目標の仲間を応援したりできます。", "共有・応援・クラウド保管"));
    const content = el("div", "hub-stack"); content.append(el("p", "muted", "アカウントを確認しています…")); root.append(content);
    try {
      if (!navigator.onLine) throw Error("現在オフラインです。ToDo・記録・冒険はこのまま使えます。仲間の機能は接続後に開いてください。");
      const [{cloud, currentUser}, {renderSignIn, renderAccount}, {renderBoards}, {renderGroups}] = await Promise.all([import("./features/community/client.mjs"), import("./features/community/account.mjs"), import("./features/community/boards.mjs"), import("./features/community/groups.mjs")]);
      if (!authSubscribed) {authSubscribed = true; let lastUser;
        cloud.auth.onAuthStateChange((event, session) => {
          const nextUser = session?.user?.id || null;
          if ((event === "SIGNED_OUT" || (lastUser !== undefined && lastUser !== nextUser)) && (location.hash === "#community" || authReturn)) {
            // Invalidate pending requests immediately; never await auth work inside its lock.
            request++; root.replaceChildren();
            setTimeout(() => { if (location.hash === "#community" || authReturn) render(); }, 0);
          }
          lastUser = nextUser;
        });
      }
      let user;
      try {
        user = await currentUser(authReturn ? callback : undefined);
      } catch (error) {
        if (!(error instanceof LoginError)) throw error;
        if (runId !== request) return;
        finishAuthReturn();
        content.replaceChildren();
        renderSignIn(content, render);
        notice(error.message, "error");
        return;
      }
      if (runId !== request) return;
      finishAuthReturn();
      content.replaceChildren();
      if (!user) {renderSignIn(content, render); return;}
      const tabs = el("nav", "hub-tabs"); tabs.setAttribute("aria-label", "仲間のメニュー"); const area = el("div", "hub-stack"); content.append(tabs, area);
      let tabRequest = 0;
      async function show(which) {
        const id = ++tabRequest; area.replaceChildren(el("p", "muted", "読み込んでいます…"));
        for (const child of tabs.children) child.setAttribute("aria-pressed", String(child.dataset.tab === which));
        const target = el("div", "hub-stack"); area.replaceChildren(target);
        try { if (which === "boards") await renderBoards(target, user); else if (which === "groups") await renderGroups(target, user, state); else await renderAccount(target, user, state, () => show("account"), render); }
        catch (error) { if (runId === request && id === tabRequest) {target.replaceChildren(el("p", "hub-notice error", error.message), button("再試行", () => show(which)));} }
      }
      for (const [key, name] of [["boards", "共有ボード"], ["groups", "タグの仲間"], ["account", "アカウント・保管"]]) { const tab = button(name, () => show(key)); tab.dataset.tab = key; tabs.append(tab); }
      await show("boards");
    } catch (error) { if (runId === request) { finishAuthReturn(); content.replaceChildren(el("p", "hub-notice error", callback.message || error.message), button("もう一度接続", render)); } }
  } else {
    root.append(title("カレンダーと達成記録", "日付を選ぶと、その日の達成を確認できます。休む日や気持ちも記録できます。", "小さな一歩を振り返る")); renderCalendar(root, state, commit);
  }
}
window.addEventListener("hashchange", render);
window.addEventListener("pageshow", event => {if (event.persisted) render();});
render();

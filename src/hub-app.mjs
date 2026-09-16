import { loadState, saveState } from "./storage.mjs";
import { AVATARS, normalizeTags } from "./features/habits/state.mjs";
import { renderCalendar } from "./features/habits/calendar.mjs";
import { el, button, link, field, selectField, panel, submit, notice, run } from "./features/habits/dom.mjs";
import { renderAdventure } from "./game/ui/adventure-map.mjs";
import { getProgress } from "./model.mjs";
import { readAuthReturn, cleanAuthReturn } from "./features/community/auth.mjs";

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
    root.append(title("あなたのプロフィール", "なりたい自分を、毎日の小さな一歩から。", "MY JOURNEY"));
    const summary = panel(`${state.habits.profile.avatar} ${state.habits.profile.name}`, `PLAYER LEVEL ${getProgress(state.totalXp).level} · ${state.totalXp} XP`);
    const form = el("form", "hub-form"), p = state.habits.profile;
    form.append(field("表示名", "name", p.name, {required: true, max: 30, autocomplete: "nickname"}), selectField("アバター", "avatar", AVATARS.map(avatar => [avatar, avatar]), p.avatar), field("目指していること", "goal", p.goal, {max: 140, placeholder: "例：3か月後に英語で自己紹介できるようになる"}), field("興味のあるタグ（5個まで・カンマ区切り）", "tags", p.tags.join(", "), {max: 104, placeholder: "英語, 勉強, 読書"}), selectField("1つ以上達成する日を、週に何日つくる？", "weeklyGoal", Array.from({length: 7}, (_, i) => [i + 1, `週 ${i + 1} 日`]), state.habits.weeklyGoal), submit("プロフィールを保存"));
    form.addEventListener("submit", event => {event.preventDefault(); const data = new FormData(form); const name = String(data.get("name")).trim(); if (!name) return;
      const previousProfile = state.habits.profile, previousGoal = state.habits.weeklyGoal;
      state.habits.profile = {name, avatar: data.get("avatar"), goal: String(data.get("goal")).trim(), tags: normalizeTags(data.get("tags"))}; state.habits.weeklyGoal = Number(data.get("weeklyGoal"));
      if (commit()) {summary.querySelector("h2").textContent = `${state.habits.profile.avatar} ${name}`; notice("プロフィールを保存しました。仲間向けの公開は「仲間」のアカウントから選べます。");}
      else {state.habits.profile = previousProfile; state.habits.weeklyGoal = previousGoal;}
    }); summary.append(form); root.append(summary, link("仲間への公開・クラウド保管を設定 →", "./hub.html#community"));
  } else if (page === "adventure") {
    root.append(title("星の遠征地図", "今日の達成で強くなる。次の物語は、あなたの一歩の先に。", "ASTRAL EXPEDITION")); renderAdventure(root, getProgress(state.totalXp).level);
  } else if (page === "community") {
    root.append(title("ひとりの一歩を、仲間と", "招待した相手との共有と、同じタグの仲間との応援。", "TOGETHER"));
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
      const user = await currentUser(); if (runId !== request) return;
      finishAuthReturn();
      content.replaceChildren();
      if (!user) {renderSignIn(content, render); if (callback.message) notice(callback.message, "error"); else if (callback.returned) notice("ログインを完了できませんでした。同じブラウザからもう一度ログインしてください。", "error"); return;}
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
    root.append(title("積み重ねた、あなたの足あと", "できた日も、意識して休んだ日も。ここからまた始められる。", "YOUR RECORDS")); renderCalendar(root, state, commit);
  }
}
window.addEventListener("hashchange", render);
window.addEventListener("pageshow", event => {if (event.persisted) render();});
render();

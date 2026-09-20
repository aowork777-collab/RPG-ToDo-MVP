import { cloud, query, requireRows } from "./client.mjs";
import { el, button, field, selectField, panel, submit, empty, notice, run } from "../habits/dom.mjs";
import { loadState, saveState } from "../../storage.mjs";
import { addTask } from "../../actions.mjs";

export async function renderBoards(root, user) {
  const [boards, memberships] = await Promise.all([
    query(cloud.from("boards").select("*").order("created_at", {ascending: false})),
    query(cloud.from("board_members").select("*").eq("user_id", user.id)),
  ]);
  const header = panel("招待した人だけの共有ボード", "閲覧者は見るだけ、編集者はタスクの追加・完了・削除ができます。個人ToDoとXPは自動で共有されません。");
  const steps = el("ol", "guide-steps");
  for (const [title, description] of [["ボードを作る", "家事や勉強など、一緒に取り組む名前を付けます。"], ["相手を招待する", "相手の「アカウント・保管」にある招待先IDを受け取り、招待します。"], ["承認して共有スタート", "相手がこの画面で承認すると、タスクが見えるようになります。"]]) {const item = el("li"); item.append(el("strong", "", title), el("p", "", description)); steps.append(item);}
  const guide = el("details", "usage-guide"); guide.append(el("summary", "", "共有するまでの3ステップ"), steps); header.append(guide);
  const form = el("form", "hub-form inline"); const create = submit("ボードを作成");
  form.append(field("ボード名", "title", "", {required: true, max: 80, placeholder: "例：家族の家事リスト"}), create);
  form.addEventListener("submit", event => {event.preventDefault(); run(create, async () => {
    const title = String(new FormData(form).get("title")).trim(); if (!title) return;
    await query(cloud.from("boards").insert({title, owner_id: user.id})); await refresh(); notice("非公開のボードを作成しました。相手を招待できます。");
  });});
  header.append(form, button("共有データを更新", () => refresh())); root.append(header);
  const content = el("div", "hub-stack"); root.append(content);
  async function refresh() { if (!root.isConnected) return; root.replaceChildren(); await renderBoards(root, user); }
  const invited = memberships.filter(member => !member.accepted);
  for (const member of invited) {
    const board = boards.find(board => board.id === member.board_id); if (!board) continue;
    const invite = panel(`招待：${board.title}`, `${member.role === "editor" ? "編集者" : "閲覧者"}として招待されています。承認するまではタスクを取得しません。`);
    const accept = button("招待を承認", () => run(accept, async () => {requireRows(await query(cloud.from("board_members").update({accepted: true}).eq("board_id", member.board_id).eq("user_id", user.id).select("board_id"))); await refresh();}));
    const decline = button("辞退", () => run(decline, async () => {await query(cloud.from("board_members").delete().eq("board_id", member.board_id).eq("user_id", user.id)); await refresh();}));
    invite.append(accept, decline); content.append(invite);
  }
  const available = boards.filter(board => board.owner_id === user.id || memberships.some(member => member.board_id === board.id && member.accepted));
  if (!available.length) content.append(empty("共有ボードはまだありません", "ボードを作るか、アカウント設定にある招待先IDを相手に伝えてください。"));
  for (const board of available) {
    const owned = board.owner_id === user.id, member = memberships.find(member => member.board_id === board.id), editable = owned || member?.role === "editor";
    const card = panel(board.title, owned ? "あなたが管理者 · 招待した相手だけに共有" : editable ? "編集できます" : "閲覧のみ");
    card.classList.add("shared-board"); card.prepend(el("p", "privacy-pill", "招待メンバー限定"));
    content.append(card);
    const tasks = await query(cloud.from("board_tasks").select("*").eq("board_id", board.id).order("created_at"));
    const list = el("div", "shared-task-list");
    for (const task of tasks) {
      const row = el("div", `shared-task${task.completed ? " done" : ""}`);
      const toggle = button(task.completed ? "✓" : "○", () => run(toggle, async () => { requireRows(await query(cloud.from("board_tasks").update({completed: !task.completed}).eq("id", task.id).select("id"))); await refresh(); }));
      toggle.disabled = !editable; toggle.setAttribute("aria-label", `${task.title}を${task.completed ? "未完了に戻す" : "完了する"}`); toggle.setAttribute("aria-pressed", String(task.completed));
      row.append(toggle, el("span", "shared-title", task.title));
      const copy = button("自分のToDoへ", () => {
        if (!confirm(`「${task.title}」を自分のToDoへコピーしますか？共有側とは別のタスクとして追加します。`)) return;
        const local = loadState(); addTask(local, {title: task.title, difficulty: 2});
        if (!saveState(local).ok) { notice("端末に保存できませんでした。", "error"); return; }
        notice("自分のToDoへ追加しました。実際に取り組んで完了するとXPを獲得できます。");
      }, "hub-button subtle"); row.append(copy);
      if (editable) {const remove = button("削除", () => run(remove, async () => { if (!confirm(`共有タスク「${task.title}」を削除しますか？`)) return; requireRows(await query(cloud.from("board_tasks").delete().eq("id", task.id).select("id"))); await refresh(); }), "hub-button danger"); row.append(remove);}
      list.append(row);
    }
    card.append(list);
    if (!tasks.length) card.append(empty("共有タスクはまだありません", editable ? "下の入力欄から追加できます。" : "編集者がタスクを追加すると表示されます。"));
    if (editable) {
      const addForm = el("form", "hub-form inline"), add = submit("共有タスクを追加");
      addForm.append(field("タスク名（参加者に共有）", "title", "", {required: true, max: 120}), add);
      addForm.addEventListener("submit", event => {event.preventDefault(); run(add, async () => { const title = String(new FormData(addForm).get("title")).trim(); if (!title) return; await query(cloud.from("board_tasks").insert({board_id: board.id, title, created_by: user.id})); await refresh(); });}); card.append(addForm);
      const localTasks = loadState().tasks.filter(task => !task.completed);
      if (localTasks.length) {
        const copyForm = el("form", "hub-form inline"), share = submit("選んだタスク名を共有");
        copyForm.append(selectField("個人ToDoからコピー（メモ・期限・XPは含めません）", "task", localTasks.map(task => [task.id, task.title]), localTasks[0].id), share);
        copyForm.addEventListener("submit", event => {event.preventDefault(); run(share, async () => {const selected = localTasks.find(task => task.id === new FormData(copyForm).get("task")); if (!selected || !confirm(`「${selected.title}」の名前を「${board.title}」の参加者に共有しますか？`)) return; await query(cloud.from("board_tasks").insert({board_id: board.id, title: selected.title, created_by: user.id})); await refresh();});}); card.append(copyForm);
      }
    }
    if (owned) {
      const management = el("details", "hub-details"); management.append(el("summary", "", "招待とアクセス権を管理"));
      const inviteForm = el("form", "hub-form"), inviteButton = submit("この相手を招待");
      inviteForm.append(field("相手の招待先ID", "user", "", {required: true, max: 36, placeholder: "相手のアカウント画面からコピー"}), selectField("許可する操作", "role", [["viewer", "閲覧のみ"], ["editor", "タスクを編集できる"]], "viewer"), inviteButton);
      inviteForm.addEventListener("submit", event => {event.preventDefault(); run(inviteButton, async () => {
        const data = new FormData(inviteForm), target = String(data.get("user")).trim();
        if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(target)) throw Error("相手のアカウント画面にある招待先IDをコピーしてください。");
        if (target === user.id) throw Error("自分はすでに管理者です。相手のIDを指定してください。");
        await query(cloud.from("board_members").insert({board_id: board.id, user_id: target, role: data.get("role")})); await refresh(); notice("招待を作成しました。相手の共有ボード画面に表示されます。");
      });}); management.append(inviteForm);
      const members = await query(cloud.from("board_members").select("*").eq("board_id", board.id));
      for (const access of members) {
        const row = el("div", "access-row"); row.append(el("code", "", access.user_id), el("span", "", `${access.role === "editor" ? "編集者" : "閲覧者"} / ${access.accepted ? "承認済み" : "承認待ち"}`));
        const revoke = button("権限を取り消す", () => run(revoke, async () => { if (!confirm("この相手のアクセス権を取り消しますか？取り消し後の取得・更新を禁止します。すでに相手がコピーした内容は削除できません。")) return; await query(cloud.from("board_members").delete().eq("board_id", board.id).eq("user_id", access.user_id)); await refresh(); })); row.append(revoke); management.append(row);
      }
      const removeBoard = button("ボード全体を削除", () => run(removeBoard, async () => { if (!confirm(`「${board.title}」と共有タスク・招待をすべて削除しますか？`)) return; await query(cloud.from("boards").delete().eq("id", board.id)); await refresh(); }), "hub-button danger"); management.append(removeBoard); card.append(management);
    } else {
      const leave = button("ボードから退出", () => run(leave, async () => { if (!confirm("この共有ボードから退出しますか？")) return; await query(cloud.from("board_members").delete().eq("board_id", board.id).eq("user_id", user.id)); await refresh(); })); card.append(leave);
    }
  }
}

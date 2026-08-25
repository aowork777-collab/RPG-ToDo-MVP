import { difficultyStars, formatDueTime, setText } from "./helpers.mjs";

export function renderBoss(elements, state, actions) {
  const boss = state.tasks.find((task) => task.isBoss && !task.completed);
  elements.bossContainer.replaceChildren();

  if (!boss) {
    const empty = document.createElement("div");
    empty.className = "boss-empty";
    empty.innerHTML = `
      <div>
        <span class="boss-empty-symbol" aria-hidden="true">✓</span>
        <h3>今日のボスは未設定です</h3>
        <p>最重要タスクを1つ選ぶと、迷わず着手できます。</p>
        <button class="primary-button" type="button">ボスクエストを追加</button>
      </div>
    `;
    empty.querySelector("button").addEventListener("click", () => actions.openQuest(true));
    elements.bossContainer.append(empty);
    return;
  }

  const card = document.createElement("article");
  card.className = "boss-card";
  card.innerHTML = `
    <div class="boss-card-inner">
      <div class="boss-topline">
        <span class="boss-badge"><i aria-hidden="true">!</i> BOSS ENCOUNTER</span>
        <span class="boss-stars"></span>
      </div>
      <h2 class="boss-title"></h2>
      <div class="boss-power-row">
        <span>BOSS POWER</span>
        <div class="boss-power-track" aria-hidden="true"></div>
        <strong class="power-value"></strong>
      </div>
      <div class="boss-footer">
        <div class="boss-meta">
          <div><span>DEADLINE</span><strong class="boss-deadline"></strong></div>
          <div><span>REWARD</span><strong class="reward-value"></strong></div>
        </div>
        <button class="complete-button" type="button">ボスを撃破する</button>
      </div>
    </div>
  `;

  const stars = card.querySelector(".boss-stars");
  setText(stars, difficultyStars(boss.difficulty));
  stars.setAttribute("aria-label", `難易度 ${boss.difficulty}`);
  setText(card.querySelector(".boss-title"), boss.title);
  setText(card.querySelector(".power-value"), `${boss.difficulty * 20}%`);
  setText(card.querySelector(".boss-deadline"), formatDueTime(boss.dueTime));
  setText(card.querySelector(".reward-value"), `+${boss.reward} XP`);

  const powerTrack = card.querySelector(".boss-power-track");
  for (let index = 0; index < 10; index += 1) {
    const segment = document.createElement("i");
    if (index < boss.difficulty * 2) segment.className = "filled";
    powerTrack.append(segment);
  }

  card.querySelector(".complete-button").addEventListener("click", () => actions.toggleTask(boss.id));
  elements.bossContainer.append(card);
}

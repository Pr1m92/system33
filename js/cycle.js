import {
  calcStats,
  flattenCycle,
  formatWr,
  monthLabel,
  GAMES_PER_MINI,
  IDEAL_WR,
} from "./calc.js?v=10";
import { escapeHtml } from "./crypto.js?v=10";
import { saveUser } from "./storage.js?v=10";

const SEAL_META = [
  { code: "ЗАЖИГАНИЕ", title: "Печать I · Зажигание", hint: "Первая орбита: запусти ритм и честные записи." },
  { code: "СТАБИЛИЗАЦИЯ", title: "Печать II · Стабилизация", hint: "Средняя орбита: ровность важнее рывка." },
  { code: "ДОЖИМ", title: "Печать III · Дожим", hint: "Финальная орбита: забери голубые победы." },
];

let editorState = null;

function resultClass(result) {
  if (result === "win") return "cell-win";
  if (result === "chance") return "cell-chance";
  if (result === "loss") return "cell-loss";
  return "";
}

function progressPct(done, total) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
}

function ringSvg(pct, tone = "teal") {
  const r = 18;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return `
    <svg class="sat-ring ${tone}" viewBox="0 0 44 44" aria-hidden="true">
      <circle class="sat-ring-track" cx="22" cy="22" r="${r}" />
      <circle class="sat-ring-fill" cx="22" cy="22" r="${r}"
        stroke-dasharray="${dash} ${c}" />
    </svg>`;
}

function orbsHtml(stats, size = "") {
  const wrPct = Math.min(100, stats.currentWr ?? 0);
  const potPct = Math.min(100, stats.potentialWr ?? 0);
  const chancePct = Math.min(100, (stats.chance / Math.max(stats.played || 1, 1)) * 100);
  return `
    <div class="orbs satellite-stack ${size}">
      <div class="sat-wrap" title="Фактический процент побед">
        ${ringSvg(wrPct, "green")}
        <div class="orb orb-wr">
          <span>Победы</span>
          <strong>${formatWr(stats.currentWr)}</strong>
        </div>
      </div>
      <div class="orb-bridge" aria-hidden="true"></div>
      <div class="sat-wrap" title="Поражения с шансом">
        ${ringSvg(chancePct, "blue")}
        <div class="orb orb-blue">
          <span>Шанс</span>
          <strong>${stats.chance}</strong>
        </div>
      </div>
      <div class="orb-bridge" aria-hidden="true"></div>
      <div class="sat-wrap" title="Потенциал, если дожать голубые">
        ${ringSvg(potPct, "teal")}
        <div class="orb orb-pot">
          <span>Потенц.</span>
          <strong>${formatWr(stats.potentialWr)}</strong>
        </div>
      </div>
    </div>
  `;
}

function tablesHtml(stats) {
  return `
    <div class="side-tables telemetry">
      <table class="mini-table">
        <thead><tr><th>Тип</th><th>П</th><th>Пор</th></tr></thead>
        <tbody>
          <tr><td>А</td><td>${stats.byType.A.win}</td><td>${stats.byType.A.loss}</td></tr>
          <tr><td>Б</td><td>${stats.byType.B.win}</td><td>${stats.byType.B.loss}</td></tr>
          <tr><td>В</td><td>${stats.byType.C.win}</td><td>${stats.byType.C.loss}</td></tr>
        </tbody>
      </table>
      <table class="mini-table">
        <thead><tr><th colspan="2">Стабильность</th></tr></thead>
        <tbody>
          <tr><td>+</td><td>${stats.stab["+"]}</td></tr>
          <tr><td>−</td><td>${stats.stab["-"]}</td></tr>
          <tr><td>=</td><td>${stats.stab["="]}</td></tr>
        </tbody>
      </table>
    </div>
  `;
}

function gameColumnHtml(game, miniIndex, gameIndex) {
  const cls = resultClass(game.result);
  const typeMap = { A: "А", B: "Б", C: "В" };
  const type = typeMap[game.type] || "·";
  const s0 = game.stab[0] || "·";
  const s1 = game.stab[1] || "·";
  const s2 = game.stab[2] || "·";
  const filled = Boolean(game.result);
  return `
    <button type="button" class="game-col star-slot ${cls} ${filled ? "lit" : "empty"}" data-mini="${miniIndex}" data-game="${gameIndex}" title="Звезда ${gameIndex + 1}">
      <span class="g-cell type">${escapeHtml(type)}</span>
      <span class="g-cell">${escapeHtml(s0 === "-" ? "−" : s0)}</span>
      <span class="g-cell">${escapeHtml(s1 === "-" ? "−" : s1)}</span>
      <span class="g-cell">${escapeHtml(s2 === "-" ? "−" : s2)}</span>
    </button>
  `;
}

function miniBlockHtml(games, miniIndex) {
  const stats = calcStats(games);
  const meta = SEAL_META[miniIndex];
  const pct = progressPct(stats.played, GAMES_PER_MINI);
  const done = stats.played >= GAMES_PER_MINI;
  const mode = stats.currentWr != null && stats.currentWr >= IDEAL_WR * 100;
  const cols = games.map((g, i) => gameColumnHtml(g, miniIndex, i)).join("");
  const state = done ? (mode ? "sealed-gold" : "sealed") : stats.played ? "active" : "dormant";

  return `
    <article class="mini-block seal-chamber ${state}" id="seal-${miniIndex + 1}">
      <div class="seal-aurora" aria-hidden="true"></div>
      <header class="mini-head seal-head">
        <div>
          <p class="seal-code">${meta.code}</p>
          <h3>${meta.title}</h3>
          <p class="seal-hint">${meta.hint}</p>
        </div>
        <div class="seal-progress">
          <svg class="seal-orbit" viewBox="0 0 72 72" aria-hidden="true">
            <circle cx="36" cy="36" r="30" class="seal-orbit-track"/>
            <circle cx="36" cy="36" r="30" class="seal-orbit-fill"
              stroke-dasharray="${(pct / 100) * 188.4} 188.4"/>
            <text x="36" y="39" text-anchor="middle">${pct}%</text>
          </svg>
          <span class="seal-count">${stats.played}/${GAMES_PER_MINI} звёзд</span>
        </div>
      </header>
      <div class="mini-layout">
        <div class="starfield-grid-wrap">
          <div class="starfield-label">Лента созвездия · 33 звезды</div>
          <div class="games-grid starfield-grid">${cols}</div>
        </div>
        ${orbsHtml(stats)}
        ${tablesHtml(stats)}
      </div>
    </article>
  `;
}

export function renderCycleView(user, cycleIndex, root, openEditor) {
  const month = monthLabel(user.createdAt, cycleIndex);
  const cycleData = user.cycles[cycleIndex];
  const totalStats = calcStats(flattenCycle(cycleData));
  const totalPlayed = totalStats.played;
  const sealsDone = cycleData.filter((g) => calcStats(g).played >= GAMES_PER_MINI).length;

  root.innerHTML = `
    <section class="cycle-hero panel planet-deck">
      <div class="planet-deck-sky" aria-hidden="true">
        <span class="pd-star"></span><span class="pd-star"></span><span class="pd-star"></span>
        <span class="pd-star"></span><span class="pd-star"></span><span class="pd-star"></span>
        <div class="pd-orbit o1"></div>
        <div class="pd-orbit o2"></div>
        <div class="pd-core"></div>
      </div>
      <div class="planet-deck-copy">
        <p class="eyebrow">Планета ${cycleIndex + 1} из 12 · орбита года</p>
        <h2>${escapeHtml(month)}</h2>
        <p class="planet-lead">
          Три печати × 33 звезды. Каждая запись — звезда на ленте созвездия:
          цвет результата, тип А/Б/В и стабильность (+/−/=).
        </p>
        <div class="planet-chips">
          <span>Печатей закрыто: <strong>${sealsDone}/3</strong></span>
          <span>Игр на планете: <strong>${totalPlayed}/99</strong></span>
          <span>Победы: <strong>${formatWr(totalStats.currentWr)}</strong></span>
        </div>
        <p class="cycle-tip">
          <strong>Спутники справа:</strong> «Победы» — факт,
          «Шанс» — голубые поражения,
          «Потенц.» — процент, если дожать голубые.
        </p>
      </div>
      <div class="cycle-summary planet-telemetry">
        ${orbsHtml(totalStats, "lg")}
        ${tablesHtml(totalStats)}
      </div>
    </section>

    <nav class="seal-nav" aria-label="Печати цикла">
      ${SEAL_META.map(
        (s, i) => `
        <a class="seal-nav-btn" href="#seal-${i + 1}">
          <em>${i + 1}</em>
          <span>${s.code}</span>
        </a>`
      ).join("")}
    </nav>

    <section class="minis seal-cluster">
      ${cycleData.map((games, i) => miniBlockHtml(games, i)).join("")}
    </section>
  `;

  root.querySelectorAll(".game-col").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mini = Number(btn.getAttribute("data-mini"));
      const game = Number(btn.getAttribute("data-game"));
      openEditor(cycleIndex, mini, game);
    });
  });

}

export function bindEditor(userRef, onSaved) {
  const modal = document.getElementById("editor");
  const title = document.getElementById("editor-title");
  const sub = document.getElementById("editor-sub");
  const typeRow = document.getElementById("edit-type");
  const stabRoot = document.getElementById("edit-stab");
  const resultRow = document.getElementById("edit-result");
  const saveBtn = document.getElementById("editor-save");

  function syncUi() {
    if (!editorState) return;
    typeRow.querySelectorAll("button").forEach((b) => {
      b.classList.toggle("active", b.dataset.type === editorState.draft.type);
    });
    stabRoot.querySelectorAll(".chip-row").forEach((row) => {
      const slot = Number(row.dataset.slot);
      row.querySelectorAll("button").forEach((b) => {
        const val = b.dataset.stab === "−" ? "-" : b.dataset.stab;
        b.classList.toggle("active", editorState.draft.stab[slot] === val);
      });
    });
    resultRow.querySelectorAll("button").forEach((b) => {
      b.classList.toggle("active", (b.dataset.result || "") === editorState.draft.result);
    });
  }

  function open(cycleIndex, miniIndex, gameIndex) {
    const game = userRef.current.cycles[cycleIndex][miniIndex][gameIndex];
    editorState = {
      cycleIndex,
      miniIndex,
      gameIndex,
      draft: {
        type: game.type,
        stab: [...game.stab],
        result: game.result,
      },
    };
    const seal = SEAL_META[miniIndex];
    title.textContent = `Звезда ${gameIndex + 1}`;
    sub.textContent = `${seal.title} · Планета ${cycleIndex + 1}`;
    modal.hidden = false;
    syncUi();
  }

  function close() {
    modal.hidden = true;
    editorState = null;
  }

  typeRow.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-type]");
    if (!btn || !editorState) return;
    editorState.draft.type = btn.dataset.type;
    syncUi();
  });

  stabRoot.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-stab]");
    if (!btn || !editorState) return;
    const row = btn.closest(".chip-row");
    const slot = Number(row.dataset.slot);
    const val = btn.dataset.stab === "−" ? "-" : btn.dataset.stab;
    editorState.draft.stab[slot] = val;
    syncUi();
  });

  resultRow.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-result]");
    if (!btn || !editorState) return;
    editorState.draft.result = btn.dataset.result || "";
    syncUi();
  });

  saveBtn.addEventListener("click", () => {
    if (!editorState) return;
    const { cycleIndex, miniIndex, gameIndex, draft } = editorState;
    userRef.current.cycles[cycleIndex][miniIndex][gameIndex] = {
      type: draft.type,
      stab: [...draft.stab],
      result: draft.result,
    };
    saveUser(userRef.current);
    close();
    onSaved(cycleIndex);
  });

  modal.querySelectorAll("[data-close]").forEach((el) => {
    el.addEventListener("click", close);
  });

  return { open, close };
}

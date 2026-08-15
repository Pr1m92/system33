import {
  calcStats,
  flattenCycle,
  formatWr,
  monthLabel,
  GAMES_PER_MINI,
  MINIS_PER_CYCLE,
} from "./calc.js?v=3";
import { escapeHtml } from "./crypto.js?v=3";
import { saveUser } from "./storage.js?v=3";

let editorState = null;

function resultClass(result) {
  if (result === "win") return "cell-win";
  if (result === "chance") return "cell-chance";
  if (result === "loss") return "cell-loss";
  return "";
}

function orbsHtml(stats, size = "") {
  return `
    <div class="orbs ${size}">
      <div class="orb orb-wr" title="Текущий винрейт">
        <span>WR</span>
        <strong>${formatWr(stats.currentWr)}</strong>
      </div>
      <div class="orb-line"></div>
      <div class="orb orb-blue" title="Поражения с шансом">
        <span>Chance</span>
        <strong>${stats.chance}</strong>
      </div>
      <div class="orb-line"></div>
      <div class="orb orb-pot" title="Возможный винрейт">
        <span>Pot.</span>
        <strong>${formatWr(stats.potentialWr)}</strong>
      </div>
    </div>
  `;
}

function tablesHtml(stats) {
  return `
    <div class="side-tables">
      <table class="mini-table">
        <thead><tr><th>Тип</th><th>W</th><th>L</th></tr></thead>
        <tbody>
          <tr><td>A</td><td>${stats.byType.A.win}</td><td>${stats.byType.A.loss}</td></tr>
          <tr><td>B</td><td>${stats.byType.B.win}</td><td>${stats.byType.B.loss}</td></tr>
          <tr><td>C</td><td>${stats.byType.C.win}</td><td>${stats.byType.C.loss}</td></tr>
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
  const type = game.type || "·";
  const s0 = game.stab[0] || "·";
  const s1 = game.stab[1] || "·";
  const s2 = game.stab[2] || "·";
  return `
    <button type="button" class="game-col ${cls}" data-mini="${miniIndex}" data-game="${gameIndex}" title="Игра ${gameIndex + 1}">
      <span class="g-cell type">${escapeHtml(type)}</span>
      <span class="g-cell">${escapeHtml(s0 === "-" ? "−" : s0)}</span>
      <span class="g-cell">${escapeHtml(s1 === "-" ? "−" : s1)}</span>
      <span class="g-cell">${escapeHtml(s2 === "-" ? "−" : s2)}</span>
    </button>
  `;
}

function miniBlockHtml(games, miniIndex) {
  const stats = calcStats(games);
  const cols = games.map((g, i) => gameColumnHtml(g, miniIndex, i)).join("");
  return `
    <article class="mini-block">
      <header class="mini-head">
        <h3>Мини-цикл ${miniIndex + 1}</h3>
        <span>${stats.played}/${GAMES_PER_MINI} игр</span>
      </header>
      <div class="mini-layout">
        <div class="games-grid">${cols}</div>
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

  root.innerHTML = `
    <section class="cycle-hero panel">
      <div>
        <p class="eyebrow">Цикл ${cycleIndex + 1} из 12</p>
        <h2>${escapeHtml(month)}</h2>
        <p>3 мини-цикла × 33 игры. Заполняй матчи честно: цвет результата, тип A/B/C и стабильность (+/−/=).</p>
        <p class="cycle-tip">
          <strong>Как читать кружки:</strong> WR — фактический винрейт,
          Chance — поражения с шансом,
          Pot. — винрейт, если дожать голубые игры до побед.
        </p>
      </div>
      <div class="cycle-summary">
        ${orbsHtml(totalStats, "lg")}
        ${tablesHtml(totalStats)}
      </div>
    </section>
    <section class="minis">
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
    title.textContent = `Игра ${gameIndex + 1}`;
    sub.textContent = `Мини-цикл ${miniIndex + 1} · Цикл ${cycleIndex + 1}`;
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

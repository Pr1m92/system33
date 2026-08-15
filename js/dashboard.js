import {
  buildYearPlan,
  monthLabel,
  CYCLE_COUNT,
  GAMES_PER_CYCLE,
  IDEAL_WR,
  expectedMmrGain,
  formatWr,
  calcStats,
  flattenCycle,
} from "./calc.js?v=7";
import { escapeHtml } from "./crypto.js?v=7";

function detectCurrentCycle(user) {
  for (let i = 0; i < CYCLE_COUNT; i += 1) {
    const stats = calcStats(flattenCycle(user.cycles[i]));
    if (stats.played < GAMES_PER_CYCLE) return i;
  }
  return CYCLE_COUNT - 1;
}

function yearStats(user) {
  const all = user.cycles.flatMap((c) => flattenCycle(c));
  return calcStats(all);
}

function progressPct(done, total) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
}

export function renderInsight(user, el) {
  if (!el) return;
  const currentIdx = detectCurrentCycle(user);
  const plan = buildYearPlan(user.mmrNow, user.mmrGoal);
  const stats = calcStats(flattenCycle(user.cycles[currentIdx]));
  const month = monthLabel(user.createdAt, currentIdx);
  const gap = user.mmrGoal - user.mmrNow;
  const maxYear = expectedMmrGain(GAMES_PER_CYCLE * CYCLE_COUNT, IDEAL_WR);
  const potGap =
    stats.potentialWr != null && stats.currentWr != null
      ? (stats.potentialWr - stats.currentWr).toFixed(1)
      : null;

  let verdict;
  let tone = "neutral";
  let psych = "";

  if (stats.played === 0) {
    verdict = `Цикл ${currentIdx + 1} (${month}) ещё пуст. Открой дневник и зафиксируй первую серию — мозгу нужен якорь прогресса, иначе цель ${user.mmrGoal} остаётся абстракцией.`;
    psych = "Психологический старт: маленький первый шаг снижает сопротивление. Не жди идеального дня — начни с 1–3 честных записей.";
    tone = "start";
  } else if (stats.currentWr != null && stats.currentWr < 50) {
    verdict = `Процент побед ${formatWr(stats.currentWr)} ниже точки равновесия. Сейчас объём игр вреднее, чем пауза на разбор. Цель ${user.mmrGoal} достижима только через стабильность решений.`;
    psych = "Эффект «догоню количеством» усиливает тильт. Система просит режим качества: меньше матчей, больше осознанности.";
    tone = "warn";
  } else if (stats.currentWr != null && stats.currentWr < 66) {
    verdict = `Рабочая зона роста: ${formatWr(stats.currentWr)} побед, потенциал ${formatWr(stats.potentialWr)}${potGap ? ` (разрыв ${potGap}%)` : ""}. Голубые поражения — почти победы, которые нужно дожимать.`;
    psych = "Здесь включается состояние потока: задача сложная, но выполнимая. Не ломай серию эмоцией — держи ритм мини-цикла.";
    tone = "focus";
  } else {
    verdict = `Режим «Система 33%» выполнен: ${formatWr(stats.currentWr)} побед. Дисциплина важнее эйфории — закрепи паттерн, иначе рост откатится.`;
    psych = "После успеха мозг хочет расслабиться. Оставь ритуал заполнения игр — это страховка от отката.";
    tone = "good";
  }

  el.className = `insight-banner panel tone-${tone} reveal is-in`;
  el.innerHTML = `
    <div class="insight-kicker">Вывод системы · цикл ${currentIdx + 1} из 12</div>
    <p class="insight-text">${verdict}</p>
    <p class="insight-psych">${psych}</p>
    <div class="insight-meta">
      <span>Шаг плана: <strong>+${plan[currentIdx].gainPlan}</strong></span>
      <span>Потолок года при 66%: <strong>+${maxYear}</strong></span>
      <span>Игр в цикле: <strong>${stats.played}/${GAMES_PER_CYCLE}</strong></span>
      <span>До цели: <strong>+${gap}</strong></span>
    </div>
  `;
}

export function renderTopbar(user, el) {
  const plan = buildYearPlan(user.mmrNow, user.mmrGoal);
  const maxYear = expectedMmrGain(GAMES_PER_CYCLE * CYCLE_COUNT, IDEAL_WR);
  el.innerHTML = `
    <div class="stat-pill"><span>Сейчас</span><strong>${user.mmrNow}</strong></div>
    <div class="stat-pill"><span>Цель</span><strong>${user.mmrGoal}</strong></div>
    <div class="stat-pill"><span>План / цикл</span><strong>+${plan[0].gainPlan}</strong></div>
    <div class="stat-pill"><span>Макс. / год при 66%</span><strong>+${maxYear}</strong></div>
  `;
}

export function renderAnalytics(user, el) {
  if (!el) return;
  const currentIdx = detectCurrentCycle(user);
  const plan = buildYearPlan(user.mmrNow, user.mmrGoal);
  const cycleStats = calcStats(flattenCycle(user.cycles[currentIdx]));
  const yStats = yearStats(user);
  const cyclePct = progressPct(cycleStats.played, GAMES_PER_CYCLE);
  const yearGamesTarget = GAMES_PER_CYCLE * CYCLE_COUNT;
  const yearPct = progressPct(yStats.played, yearGamesTarget);
  const wr = cycleStats.currentWr ?? 0;
  const pot = cycleStats.potentialWr ?? 0;
  const toIdeal = Math.max(0, 66 - wr).toFixed(1);
  const bestType = ["A", "B", "C"]
    .map((t) => {
      const w = yStats.byType[t].win;
      const l = yStats.byType[t].loss;
      const n = w + l;
      return { t, n, wr: n ? (w / n) * 100 : null };
    })
    .sort((a, b) => (b.wr ?? -1) - (a.wr ?? -1))[0];

  el.innerHTML = `
    <div class="analytics-grid">
      <article class="analytics-card">
        <h3>Прогресс цикла</h3>
        <div class="meter"><div class="meter-fill" style="--p:${cyclePct}%"></div></div>
        <div class="meter-label">${cycleStats.played} / ${GAMES_PER_CYCLE} игр · ${cyclePct}%</div>
        <p class="analytics-note">Короткий цикл даёт быструю обратную связь — движение видно каждые 33 игры.</p>
      </article>
      <article class="analytics-card">
        <h3>Прогресс года</h3>
        <div class="meter"><div class="meter-fill year" style="--p:${yearPct}%"></div></div>
        <div class="meter-label">${yStats.played} / ${yearGamesTarget} игр · ${yearPct}%</div>
        <p class="analytics-note">Длинная цель: ${user.mmrNow} → ${user.mmrGoal}. Горизонт года держит смысл серии.</p>
      </article>
      <article class="analytics-card">
        <h3>Победы и потенциал</h3>
        <div class="dual-bars">
          <div>
            <span>Сейчас</span>
            <div class="bar-track"><i style="width:${Math.min(100, wr)}%"></i></div>
            <strong>${formatWr(cycleStats.currentWr)}</strong>
          </div>
          <div>
            <span>Потенциал</span>
            <div class="bar-track pot"><i style="width:${Math.min(100, pot)}%"></i></div>
            <strong>${formatWr(cycleStats.potentialWr)}</strong>
          </div>
        </div>
        <p class="analytics-note">До режима 66% остаётся <strong>${toIdeal}%</strong>. Голубые игры — главный рычаг.</p>
      </article>
      <article class="analytics-card">
        <h3>Срез по типам</h3>
        <div class="type-row">
          ${["A", "B", "C"]
            .map((t) => {
              const w = yStats.byType[t].win;
              const l = yStats.byType[t].loss;
              return `<div class="type-chip"><em>${t}</em><span>${w}П / ${l}Пор</span></div>`;
            })
            .join("")}
        </div>
        <p class="analytics-note">
          ${
            bestType.wr == null
              ? "Пока мало данных по типам А/Б/В — отмечай тип в каждой игре."
              : `Сильнее всего тип <strong>${bestType.t}</strong> (${formatWr(bestType.wr)}). Слабые типы — зона тренировки.`
          }
        </p>
      </article>
      <article class="analytics-card wide">
        <h3>План рейтинга на текущем цикле</h3>
        <div class="plan-strip">
          <div><span>Старт плана</span><strong>${plan[currentIdx].startPlanned}</strong></div>
          <div><span>Финиш плана</span><strong>${plan[currentIdx].endPlanned}</strong></div>
          <div><span>Макс. при 66%</span><strong>${plan[currentIdx].endMax}</strong></div>
          <div><span>Шаг</span><strong>+${plan[currentIdx].gainPlan}</strong></div>
        </div>
        <p class="analytics-note">План — спокойный маршрут. Максимум — потолок при идеальной игре. Сравнивай себя с вчерашней дисциплиной, не только с потолком.</p>
      </article>
    </div>
  `;
}

/** Понятная сетка 12 месяцев вместо хрупкого SVG-круга */
export function renderRing(user, svg, centerEl, onOpenCycle) {
  const plan = buildYearPlan(user.mmrNow, user.mmrGoal);
  const currentIdx = detectCurrentCycle(user);
  const yStats = yearStats(user);
  const wrap = svg.parentElement;

  const cards = plan
    .map((p, i) => {
      const month = monthLabel(user.createdAt, i);
      const stats = calcStats(flattenCycle(user.cycles[i]));
      const state = i < currentIdx ? "past" : i === currentIdx ? "current" : "future";
      const pct = progressPct(stats.played, GAMES_PER_CYCLE);
      return `
        <button type="button" class="month-card ${state}" data-cycle="${i}">
          <div class="month-top">
            <span class="month-num">${i + 1}</span>
            <span class="month-name">${escapeHtml(month)}</span>
          </div>
          <div class="month-mmr">${p.startPlanned} → <strong>${p.endPlanned}</strong></div>
          <div class="month-max">макс. ${p.endMax}</div>
          <div class="month-track"><i style="width:${pct}%"></i></div>
          <div class="month-games">${stats.played}/${GAMES_PER_CYCLE} игр</div>
        </button>`;
    })
    .join("");

  // Hide broken SVG ring, render HTML map into wrap
  svg.hidden = true;
  centerEl.hidden = true;

  let map = wrap.querySelector(".year-map");
  if (!map) {
    map = document.createElement("div");
    map.className = "year-map";
    wrap.appendChild(map);
  }

  map.innerHTML = `
    <div class="year-summary">
      <div class="year-brand">Система 33%</div>
      <div class="year-nick">${escapeHtml(user.nick)}</div>
      <div class="year-path">${user.mmrNow} → ${user.mmrGoal} рейтинг</div>
      <div class="year-meta">${user.gamesWeek} игр/нед · цель 66% побед · год: ${yStats.played} игр · ${formatWr(yStats.currentWr)}</div>
    </div>
    <div class="month-grid">${cards}</div>
  `;

  map.querySelectorAll(".month-card").forEach((btn) => {
    btn.addEventListener("click", () => onOpenCycle(Number(btn.dataset.cycle)));
  });
}

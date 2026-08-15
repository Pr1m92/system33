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
} from "./calc.js?v=10";
import { escapeHtml } from "./crypto.js?v=10";

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
  const typeRu = { A: "А", B: "Б", C: "В" };
  const bestType = ["A", "B", "C"]
    .map((t) => {
      const w = yStats.byType[t].win;
      const l = yStats.byType[t].loss;
      const n = w + l;
      return { t, label: typeRu[t], n, wr: n ? (w / n) * 100 : null };
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
              return `<div class="type-chip"><em>${typeRu[t]}</em><span>${w}П / ${l}Пор</span></div>`;
            })
            .join("")}
        </div>
        <p class="analytics-note">
          ${
            bestType.wr == null
              ? "Пока мало данных по типам А/Б/В — отмечай тип в каждой игре."
              : `Сильнее всего тип <strong>${bestType.label}</strong> (${formatWr(bestType.wr)}). Слабые типы — зона тренировки.`
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

function orbitPoint(index, total, radiusPct) {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  return {
    x: 50 + radiusPct * Math.cos(angle),
    y: 50 + radiusPct * Math.sin(angle),
    angleDeg: (angle * 180) / Math.PI,
  };
}

/** Орбита года: 12 планет-циклов вокруг ядра (HTML, без конфликтов SVG-transform) */
export function renderRing(user, svg, centerEl, onOpenCycle) {
  const plan = buildYearPlan(user.mmrNow, user.mmrGoal);
  const currentIdx = detectCurrentCycle(user);
  const yStats = yearStats(user);
  const wrap = svg.parentElement;
  const radius = 38;
  const yearFill = ((currentIdx + progressPct(calcStats(flattenCycle(user.cycles[currentIdx])).played, GAMES_PER_CYCLE) / 100) / CYCLE_COUNT) * 100;

  svg.hidden = true;
  centerEl.hidden = true;

  let map = wrap.querySelector(".orbit-map");
  if (!map) {
    map = document.createElement("div");
    map.className = "orbit-map";
    wrap.appendChild(map);
  }

  const points = plan.map((_, i) => orbitPoint(i, CYCLE_COUNT, radius));

  const constellationLines = points
    .map((p, i) => {
      const n = points[(i + 1) % points.length];
      const active = i < currentIdx;
      return `<line class="orbit-chord ${active ? "lit" : ""}" x1="${p.x}" y1="${p.y}" x2="${n.x}" y2="${n.y}" />`;
    })
    .join("");

  const stars = Array.from({ length: 28 }, (_, i) => {
    const a = (i * 137.5) % 360;
    const r = 12 + ((i * 17) % 34);
    const x = 50 + r * Math.cos((a * Math.PI) / 180);
    const y = 50 + r * Math.sin((a * Math.PI) / 180);
    const s = 0.35 + (i % 4) * 0.2;
    return `<circle class="orbit-star" cx="${x}" cy="${y}" r="${s}" style="--d:${(i % 7) * 0.4}s" />`;
  }).join("");

  const planets = plan
    .map((p, i) => {
      const month = monthLabel(user.createdAt, i);
      const stats = calcStats(flattenCycle(user.cycles[i]));
      const state = i < currentIdx ? "past" : i === currentIdx ? "current" : "future";
      const pct = progressPct(stats.played, GAMES_PER_CYCLE);
      const pt = points[i];
      const shortMonth = month.split(" ")[0];
      return `
        <button type="button" class="planet month-card ${state}" data-cycle="${i}"
          style="left:${pt.x}%;top:${pt.y}%;--delay:${i * 55}ms"
          title="Цикл ${i + 1}: ${escapeHtml(month)}">
          <span class="planet-glow" aria-hidden="true"></span>
          <span class="planet-core">
            <span class="planet-num">${i + 1}</span>
            <span class="planet-month">${escapeHtml(shortMonth)}</span>
          </span>
          <span class="planet-panel">
            <span class="planet-path">${p.startPlanned} → <strong>${p.endPlanned}</strong></span>
            <span class="planet-max">макс. ${p.endMax}</span>
            <span class="planet-track"><i style="width:${pct}%"></i></span>
            <span class="planet-games">${stats.played}/${GAMES_PER_CYCLE}</span>
          </span>
        </button>`;
    })
    .join("");

  // Compact list for narrow screens
  const rail = plan
    .map((p, i) => {
      const month = monthLabel(user.createdAt, i);
      const stats = calcStats(flattenCycle(user.cycles[i]));
      const state = i < currentIdx ? "past" : i === currentIdx ? "current" : "future";
      const pct = progressPct(stats.played, GAMES_PER_CYCLE);
      return `
        <button type="button" class="orbit-rail-item ${state}" data-cycle="${i}">
          <span class="orbit-rail-num">${i + 1}</span>
          <span class="orbit-rail-body">
            <strong>${escapeHtml(month)}</strong>
            <em>${p.startPlanned} → ${p.endPlanned}</em>
            <span class="planet-track"><i style="width:${pct}%"></i></span>
          </span>
          <span class="orbit-rail-games">${stats.played}/${GAMES_PER_CYCLE}</span>
        </button>`;
    })
    .join("");

  map.innerHTML = `
    <div class="orbit-stage" aria-label="Орбита из 12 циклов">
      <svg class="orbit-sky" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <radialGradient id="orbitCoreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="rgba(61,214,198,0.35)"/>
            <stop offset="55%" stop-color="rgba(61,214,198,0.08)"/>
            <stop offset="100%" stop-color="rgba(61,214,198,0)"/>
          </radialGradient>
          <linearGradient id="orbitArc" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#3dd6c6"/>
            <stop offset="100%" stop-color="#f0a35e"/>
          </linearGradient>
        </defs>
        <circle class="orbit-halo" cx="50" cy="50" r="46" fill="url(#orbitCoreGlow)"/>
        <circle class="orbit-track-ring" cx="50" cy="50" r="${radius}" />
        <circle class="orbit-track-ring soft" cx="50" cy="50" r="${radius - 8}" />
        <circle class="orbit-progress" cx="50" cy="50" r="${radius}"
          style="stroke-dasharray: ${yearFill * 2.387} ${238.7 - yearFill * 2.387}" />
        ${constellationLines}
        ${stars}
      </svg>

      <div class="orbit-hub">
        <div class="orbit-hub-ring"></div>
        <p class="year-brand">Система 33%</p>
        <p class="year-nick">${escapeHtml(user.nick)}</p>
        <p class="year-path">${user.mmrNow} → ${user.mmrGoal}</p>
        <p class="year-meta">${user.gamesWeek} игр/нед · цель 66%<br/>год: ${yStats.played} · ${formatWr(yStats.currentWr)}</p>
      </div>

      ${planets}
    </div>

    <div class="orbit-rail" aria-label="Список циклов">${rail}</div>
  `;

  map.querySelectorAll("[data-cycle]").forEach((btn) => {
    btn.addEventListener("click", () => onOpenCycle(Number(btn.dataset.cycle)));
  });
}

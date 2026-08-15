import {
  buildYearPlan,
  monthLabel,
  CYCLE_COUNT,
  GAMES_PER_CYCLE,
  IDEAL_WR,
  MMR_DELTA,
  expectedMmrGain,
  formatWr,
  calcStats,
  flattenCycle,
} from "./calc.js?v=6";
import { escapeHtml } from "./crypto.js?v=6";

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
    verdict = `Цикл ${currentIdx + 1} (${month}) ещё пуст. Открой дневник и зафиксируй первую серию — мозгу нужен «якорь прогресса», иначе цель ${user.mmrGoal} остаётся абстракцией.`;
    psych = "Психологический старт: маленький первый шаг снижает сопротивление. Не жди идеального дня — начни с 1–3 честных записей.";
    tone = "start";
  } else if (stats.currentWr != null && stats.currentWr < 50) {
    verdict = `WR ${formatWr(stats.currentWr)} ниже точки равновесия. Сейчас объём игр вреднее, чем пауза на разбор. Цель ${user.mmrGoal} достижима только через стабильность решений.`;
    psych = "Эффект «догоню количеством» усиливает тильт. Система просит режим качества: меньше матчей, больше осознанности.";
    tone = "warn";
  } else if (stats.currentWr != null && stats.currentWr < 66) {
    verdict = `Рабочая зона роста: WR ${formatWr(stats.currentWr)}, потенциал ${formatWr(stats.potentialWr)}${potGap ? ` (Δ ${potGap}%)` : ""}. Голубые поражения — это почти победы, которые система учит дожимать.`;
    psych = "Здесь включается flow: задача сложная, но выполнимая. Не ломай серию эмоцией — держи ритм мини-цикла.";
    tone = "focus";
  } else {
    verdict = `Режим SYSTEM 33% выполнен: WR ${formatWr(stats.currentWr)}. Дисциплина важнее эйфории — закрепи паттерн, иначе рост откатится на следующей серии.`;
    psych = "После успеха мозг хочет расслабиться. Оставь ритуал заполнения игр — это страховка от отката.";
    tone = "good";
  }

  el.className = `insight-banner panel tone-${tone} reveal is-in`;
  el.innerHTML = `
    <div class="insight-kicker">Вывод системы · цикл ${currentIdx + 1}/12</div>
    <p class="insight-text">${verdict}</p>
    <p class="insight-psych">${psych}</p>
    <div class="insight-meta">
      <span>План шага: <strong>+${plan[currentIdx].gainPlan} MMR</strong></span>
      <span>Потолок года @66%: <strong>+${maxYear} MMR</strong></span>
      <span>Игр в цикле: <strong>${stats.played}/${GAMES_PER_CYCLE}</strong></span>
      <span>До цели: <strong>+${gap} MMR</strong></span>
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
    <div class="stat-pill"><span>Max / год @66%</span><strong>+${maxYear}</strong></div>
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
        <div class="meter">
          <div class="meter-fill" style="--p:${cyclePct}%"></div>
        </div>
        <div class="meter-label">${cycleStats.played} / ${GAMES_PER_CYCLE} игр · ${cyclePct}%</div>
        <p class="analytics-note">Короткий цикл даёт быструю обратную связь — мозг видит движение каждые ~33 игры.</p>
      </article>

      <article class="analytics-card">
        <h3>Прогресс года</h3>
        <div class="meter">
          <div class="meter-fill year" style="--p:${yearPct}%"></div>
        </div>
        <div class="meter-label">${yStats.played} / ${yearGamesTarget} игр · ${yearPct}%</div>
        <p class="analytics-note">Длинная петля цели: ${user.mmrNow} → ${user.mmrGoal}. Аспирационный горизонт держит смысл серии.</p>
      </article>

      <article class="analytics-card">
        <h3>WR vs потенциал</h3>
        <div class="dual-bars">
          <div>
            <span>Текущий</span>
            <div class="bar-track"><i style="width:${Math.min(100, wr)}%"></i></div>
            <strong>${formatWr(cycleStats.currentWr)}</strong>
          </div>
          <div>
            <span>Возможный</span>
            <div class="bar-track pot"><i style="width:${Math.min(100, pot)}%"></i></div>
            <strong>${formatWr(cycleStats.potentialWr)}</strong>
          </div>
        </div>
        <p class="analytics-note">До режима 66% остаётся <strong>${toIdeal}%</strong> WR. Голубые игры — главный рычаг.</p>
      </article>

      <article class="analytics-card">
        <h3>Срез по типам</h3>
        <div class="type-row">
          ${["A", "B", "C"]
            .map((t) => {
              const w = yStats.byType[t].win;
              const l = yStats.byType[t].loss;
              return `<div class="type-chip"><em>${t}</em><span>${w}W / ${l}L</span></div>`;
            })
            .join("")}
        </div>
        <p class="analytics-note">
          ${
            bestType.wr == null
              ? "Пока мало данных по типам A/B/C — отмечай тип в каждой игре."
              : `Сильнее всего выглядит тип <strong>${bestType.t}</strong> (${formatWr(bestType.wr)}). Слабые типы — зона тренировки, не игнора.`
          }
        </p>
      </article>

      <article class="analytics-card wide">
        <h3>План MMR на текущем цикле</h3>
        <div class="plan-strip">
          <div><span>Старт плана</span><strong>${plan[currentIdx].startPlanned}</strong></div>
          <div><span>Финиш плана</span><strong>${plan[currentIdx].endPlanned}</strong></div>
          <div><span>Max @66%</span><strong>${plan[currentIdx].endMax}</strong></div>
          <div><span>Шаг</span><strong>+${plan[currentIdx].gainPlan}</strong></div>
        </div>
        <p class="analytics-note">План — спокойный маршрут. Max — потолок при идеальной реализации. Не сравнивай себя только с потолком: сравнивай с вчерашней дисциплиной.</p>
      </article>
    </div>
  `;
}

export function renderRing(user, svg, centerEl, onOpenCycle) {
  const plan = buildYearPlan(user.mmrNow, user.mmrGoal);
  const currentIdx = detectCurrentCycle(user);
  const cx = 480;
  const cy = 480;
  const R = 340;

  const nodes = plan.map((p, i) => {
    const angle = -Math.PI / 2 + (i / CYCLE_COUNT) * Math.PI * 2;
    const x = cx + Math.cos(angle) * R;
    const y = cy + Math.sin(angle) * R;
    const month = monthLabel(user.createdAt, i);
    const stats = calcStats(flattenCycle(user.cycles[i]));
    const state = i < currentIdx ? "past" : i === currentIdx ? "current" : "future";
    const pct = progressPct(stats.played, GAMES_PER_CYCLE);
    return { ...p, x, y, month, stats, state, angle, pct };
  });

  let arcs = "";
  for (let i = 0; i < CYCLE_COUNT; i += 1) {
    const a = nodes[i];
    const b = nodes[(i + 1) % CYCLE_COUNT];
    arcs += `<path d="M ${a.x} ${a.y} A ${R} ${R} 0 0 1 ${b.x} ${b.y}" class="ring-path ${a.state}" fill="none" />`;
  }

  const cards = nodes
    .map((n) => {
      const monthShort = escapeHtml(n.month.split(" ")[0]);
      return `
      <g class="cycle-node ${n.state}" data-cycle="${n.index}" transform="translate(${n.x}, ${n.y})" style="cursor:pointer">
        <circle r="58" class="node-halo" />
        <rect x="-54" y="-48" width="108" height="96" rx="16" class="node-card" />
        <text y="-22" text-anchor="middle" class="node-num">${n.index + 1}</text>
        <text y="-2" text-anchor="middle" class="node-month">${monthShort}</text>
        <text y="18" text-anchor="middle" class="node-mmr">${n.endPlanned}</text>
        <text y="34" text-anchor="middle" class="node-max">max ${n.endMax}</text>
        <rect x="-40" y="40" width="80" height="5" rx="3" class="node-track" />
        <rect x="-40" y="40" width="${(80 * n.pct) / 100}" height="5" rx="3" class="node-fill" />
      </g>`;
    })
    .join("");

  svg.setAttribute("viewBox", "0 0 960 960");
  svg.innerHTML = `
    <defs>
      <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#061018" flood-opacity="0.45"/>
      </filter>
      <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#3dd6c6"/>
        <stop offset="100%" stop-color="#f0a35e"/>
      </linearGradient>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${R}" class="ring-guide" fill="none" />
    ${arcs}
    ${cards}
  `;

  const yStats = yearStats(user);
  centerEl.innerHTML = `
    <div class="center-kicker">SYSTEM 33%</div>
    <div class="center-title">${escapeHtml(user.nick)}</div>
    <div class="center-line">${user.mmrNow} → ${user.mmrGoal} MMR</div>
    <div class="center-line muted">${user.gamesWeek} игр/нед · цель WR ${Math.round(IDEAL_WR * 100)}%</div>
    <div class="center-mini">год: ${yStats.played} игр · WR ${formatWr(yStats.currentWr)}</div>
  `;
  centerEl.classList.add("center-pop");

  svg.querySelectorAll(".cycle-node").forEach((node) => {
    node.addEventListener("click", () => {
      onOpenCycle(Number(node.getAttribute("data-cycle")));
    });
  });
}

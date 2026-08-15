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
} from "./calc.js?v=4";
import { escapeHtml } from "./crypto.js?v=4";

function detectCurrentCycle(user) {
  for (let i = 0; i < CYCLE_COUNT; i += 1) {
    const stats = calcStats(flattenCycle(user.cycles[i]));
    if (stats.played < GAMES_PER_CYCLE) return i;
  }
  return CYCLE_COUNT - 1;
}

export function renderInsight(user, el) {
  if (!el) return;
  const currentIdx = detectCurrentCycle(user);
  const plan = buildYearPlan(user.mmrNow, user.mmrGoal);
  const stats = calcStats(flattenCycle(user.cycles[currentIdx]));
  const month = monthLabel(user.createdAt, currentIdx);
  const gap = user.mmrGoal - user.mmrNow;
  const maxYear = expectedMmrGain(GAMES_PER_CYCLE * CYCLE_COUNT, IDEAL_WR);

  let verdict;
  let tone = "neutral";

  if (stats.played === 0) {
    verdict = `Цикл ${currentIdx + 1} (${month}) ещё пуст. Начни дневник игр — система покажет, где ты теряешь MMR и где уже близко к победе.`;
    tone = "start";
  } else if (stats.currentWr != null && stats.currentWr < 50) {
    verdict = `Текущий WR ${formatWr(stats.currentWr)}. Сейчас важнее качество решений, чем объём. Разбери красные игры и типы A/B/C — цель ${user.mmrGoal} достижима только через стабильность.`;
    tone = "warn";
  } else if (stats.currentWr != null && stats.currentWr < 66) {
    const pot = formatWr(stats.potentialWr);
    verdict = `Рабочая зона роста: WR ${formatWr(stats.currentWr)}, потенциал ${pot}. Закрывай «голубые» поражения — это самый быстрый путь к режиму 66%.`;
    tone = "focus";
  } else {
    verdict = `Режим SYSTEM 33% выполнен: WR ${formatWr(stats.currentWr)}. Держи дисциплину мини-циклов и не отпускай стабильность — так цель +${gap} MMR становится вопросом времени.`;
    tone = "good";
  }

  el.className = `insight-banner panel tone-${tone}`;
  el.innerHTML = `
    <div class="insight-kicker">Вывод системы · цикл ${currentIdx + 1}/12</div>
    <p class="insight-text">${verdict}</p>
    <div class="insight-meta">
      <span>План шага: <strong>+${plan[currentIdx].gainPlan} MMR</strong></span>
      <span>Потолок года @66%: <strong>+${maxYear} MMR</strong></span>
      <span>Игр в цикле: <strong>${stats.played}/${GAMES_PER_CYCLE}</strong></span>
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

export function renderRing(user, svg, centerEl, onOpenCycle) {
  const plan = buildYearPlan(user.mmrNow, user.mmrGoal);
  const currentIdx = detectCurrentCycle(user);
  const cx = 450;
  const cy = 450;
  const R = 310;

  const nodes = plan.map((p, i) => {
    const angle = -Math.PI / 2 + (i / CYCLE_COUNT) * Math.PI * 2;
    const x = cx + Math.cos(angle) * R;
    const y = cy + Math.sin(angle) * R;
    const month = monthLabel(user.createdAt, i);
    const stats = calcStats(flattenCycle(user.cycles[i]));
    const state = i < currentIdx ? "past" : i === currentIdx ? "current" : "future";
    return { ...p, x, y, month, stats, state, angle };
  });

  // arrows between nodes
  let arrows = "";
  for (let i = 0; i < CYCLE_COUNT; i += 1) {
    const a = nodes[i];
    const b = nodes[(i + 1) % CYCLE_COUNT];
    const mx = (a.x + b.x) / 2 - Math.sin((a.angle + b.angle) / 2) * 28;
    const my = (a.y + b.y) / 2 + Math.cos((a.angle + b.angle) / 2) * 28;
    arrows += `
      <path d="M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}" class="ring-path" fill="none" />
      <foreignObject x="${mx - 34}" y="${my - 14}" width="68" height="28">
        <div xmlns="http://www.w3.org/1999/xhtml" class="edge-badge">→ ${a.endPlanned}</div>
      </foreignObject>
    `;
  }

  const cards = nodes
    .map((n) => {
      return `
      <g class="cycle-node ${n.state}" data-cycle="${n.index}" transform="translate(${n.x}, ${n.y})" style="cursor:pointer">
        <rect x="-62" y="-54" width="124" height="108" rx="18" class="node-card" />
        <text y="-22" text-anchor="middle" class="node-num">${n.index + 1}</text>
        <text y="0" text-anchor="middle" class="node-month">${escapeHtml(n.month.split(" ")[0])}</text>
        <text y="20" text-anchor="middle" class="node-mmr">${n.startPlanned} → ${n.endPlanned}</text>
        <text y="38" text-anchor="middle" class="node-max">max ${n.endMax}</text>
      </g>`;
    })
    .join("");

  svg.innerHTML = `
    <defs>
      <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#0b1220" flood-opacity="0.25"/>
      </filter>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${R}" class="ring-guide" fill="none" />
    ${arrows}
    ${cards}
  `;

  centerEl.innerHTML = `
    <div class="center-kicker">SYSTEM 33%</div>
    <div class="center-title">${escapeHtml(user.nick)}</div>
    <div class="center-line">${user.mmrNow} → ${user.mmrGoal} MMR</div>
    <div class="center-line muted">${user.gamesWeek} игр/нед · Δ${MMR_DELTA} · цель WR ${Math.round(IDEAL_WR * 100)}%</div>
  `;
  centerEl.classList.add("center-pop");

  svg.querySelectorAll(".cycle-node").forEach((node) => {
    node.addEventListener("click", () => {
      onOpenCycle(Number(node.getAttribute("data-cycle")));
    });
  });
}

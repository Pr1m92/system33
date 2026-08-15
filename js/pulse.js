import {
  calcStats,
  flattenCycle,
  formatWr,
  GAMES_PER_MINI,
  GAMES_PER_CYCLE,
  CYCLE_COUNT,
  IDEAL_WR,
} from "./calc.js?v=6";

function detectCurrentCycle(user) {
  for (let i = 0; i < CYCLE_COUNT; i += 1) {
    const stats = calcStats(flattenCycle(user.cycles[i]));
    if (stats.played < GAMES_PER_CYCLE) return i;
  }
  return CYCLE_COUNT - 1;
}

function recentResults(user, limit = 24) {
  const current = detectCurrentCycle(user);
  const games = flattenCycle(user.cycles[current]).filter((g) => g.result);
  return games.slice(-limit);
}

/** Оригинальная метрика SYSTEM 33%: сколько побед «оставлено на столе». */
export function clutchGap(stats) {
  if (!stats.played) {
    return { points: 0, recoverable: 0, label: "нет данных" };
  }
  const points = Math.max(0, (stats.potentialWr || 0) - (stats.currentWr || 0));
  const recoverable = stats.chance;
  let label = "спокойно";
  if (points >= 20) label = "высокий clutch-gap";
  else if (points >= 10) label = "есть рычаг";
  else if (points > 0) label = "почти в режиме";
  else label = "режим закрыт";
  return { points, recoverable, label };
}

/** Momentum stream: не ломается как стрик, а сужается. */
export function momentumSeries(results) {
  let width = 0.55;
  return results.map((g) => {
    if (g.result === "win") width = Math.min(1, width + 0.08);
    else if (g.result === "chance") width = Math.max(0.22, width - 0.03);
    else if (g.result === "loss") width = Math.max(0.12, width - 0.07);
    return { result: g.result, width };
  });
}

export function miniSeals(cycleData) {
  return cycleData.map((games, i) => {
    const stats = calcStats(games);
    const done = stats.played >= GAMES_PER_MINI;
    const mode = stats.currentWr != null && stats.currentWr >= IDEAL_WR * 100;
    return {
      index: i,
      played: stats.played,
      done,
      mode,
      wr: stats.currentWr,
      title: done ? (mode ? "Печать 66%" : "Печать цикла") : "Печать закрыта",
    };
  });
}

export function focusCard(user) {
  const idx = detectCurrentCycle(user);
  const stats = calcStats(flattenCycle(user.cycles[idx]));
  const gap = clutchGap(stats);
  const seals = miniSeals(user.cycles[idx]);
  const openSeal = seals.find((s) => !s.done);

  if (stats.played === 0) {
    return {
      code: "IGNITE",
      title: "Фокус дня: Ignite",
      action: "Сыграй 1–3 осознанных матча и сразу заполни результат. Не целься в идеал — целься в честный старт.",
      why: "Мозгу нужен первый якорь прогресса. Пустой цикл ощущается как бесконечность.",
    };
  }
  if (stats.currentWr != null && stats.currentWr < 50) {
    return {
      code: "STABILIZE",
      title: "Фокус дня: Stabilize",
      action: "Срежь объём. Разбери последние красные игры по типу A/B/C. Сегодня важнее 2 качественных матча, чем 10 на эмоциях.",
      why: "Ниже 50% объём усиливает тильт. Система защищает тебя от «догоню количеством».",
    };
  }
  if (gap.recoverable >= 3) {
    return {
      code: "CONVERT",
      title: "Фокус дня: Convert Blue",
      action: `У тебя ${gap.recoverable} голубых поражений. Сегодня тренируй именно дожим: драки, которые уже были близко к победе.`,
      why: `Clutch-gap ${gap.points.toFixed(1)}% — это победы, которые система считает «оставленными на столе».`,
    };
  }
  if (openSeal) {
    return {
      code: "SEAL",
      title: `Фокус дня: Seal ${openSeal.index + 1}`,
      action: `Доведи мини-цикл ${openSeal.index + 1} до 33 игр. Сейчас ${openSeal.played}/33. Закрытая печать даёт ясный средний горизонт.`,
      why: "Средняя петля (33 игры) удерживает мотивацию лучше, чем голый годовой MMR.",
    };
  }
  return {
    code: "COMPOUND",
    title: "Фокус дня: Compound",
    action: "Режим системы близко или уже выполнен. Не ломай ритуал записи. Добавь 1 осознанный матч в слабом типе A/B/C.",
    why: "После успеха мозг хочет расслабиться. Ритуал — страховка от отката.",
  };
}

export function renderPulse(user, el) {
  if (!el) return;
  const idx = detectCurrentCycle(user);
  const stats = calcStats(flattenCycle(user.cycles[idx]));
  const gap = clutchGap(stats);
  const focus = focusCard(user);
  const seals = miniSeals(user.cycles[idx]);
  const series = momentumSeries(recentResults(user, 28));
  const path = buildMomentumPath(series);

  el.innerHTML = `
    <div class="pulse-grid">
      <article class="pulse-card focus-card">
        <div class="pulse-art">
          <img src="assets/seal-33.png" alt="" width="72" height="72" />
        </div>
        <div>
          <p class="pulse-code">${focus.code}</p>
          <h3>${focus.title}</h3>
          <p class="pulse-action">${focus.action}</p>
          <p class="pulse-why">${focus.why}</p>
        </div>
      </article>

      <article class="pulse-card clutch-card">
        <h3>Clutch Gap</h3>
        <div class="clutch-value">${gap.points.toFixed(1)}%</div>
        <p class="pulse-label">${gap.label}</p>
        <p class="analytics-note">Разница между возможным и текущим WR. Это оригинальный рычаг SYSTEM 33%: сколько побед ещё можно «забрать» из голубых поражений (${gap.recoverable}).</p>
        <div class="clutch-meter"><i style="width:${Math.min(100, gap.points * 2.2)}%"></i></div>
      </article>

      <article class="pulse-card momentum-card">
        <h3>Momentum Stream</h3>
        <p class="analytics-note">Не стыдливый стрик. Поток сужается после поражений, но не обрывается — чтобы не ломать мотивацию.</p>
        <svg class="momentum-svg" viewBox="0 0 320 86" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="momGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#3dd6c6"/>
              <stop offset="100%" stop-color="#f0a35e"/>
            </linearGradient>
          </defs>
          <path d="${path}" fill="none" stroke="url(#momGrad)" stroke-width="4" stroke-linecap="round"/>
        </svg>
        <div class="mom-legend"><span>уже</span><span>сейчас</span></div>
      </article>

      <article class="pulse-card seals-card">
        <h3>Печати мини-циклов</h3>
        <div class="seals-row">
          ${seals
            .map(
              (s) => `
            <div class="seal ${s.done ? "open" : "locked"} ${s.mode ? "mode" : ""}" title="${s.title}">
              <strong>${s.index + 1}</strong>
              <span>${s.done ? formatWr(s.wr) : `${s.played}/33`}</span>
            </div>`
            )
            .join("")}
        </div>
        <p class="analytics-note">Закрытая печать = завершённый мини-цикл. Золотая кайма = WR ≥ 66% внутри печати.</p>
      </article>
    </div>
  `;
}

function buildMomentumPath(series) {
  if (!series.length) {
    return "M 8 48 C 80 48, 160 48, 312 48";
  }
  const w = 320;
  const h = 86;
  const step = (w - 16) / Math.max(series.length - 1, 1);
  return series
    .map((p, i) => {
      const x = 8 + i * step;
      const y = h / 2 - (p.width - 0.5) * 54;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

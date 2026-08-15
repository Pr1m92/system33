/** @typedef {'A'|'B'|'C'|''} GameType */
/** @typedef {'+'|'-'|'='|''} Stab */
/** @typedef {'win'|'chance'|'loss'|''} Result */

/**
 * @typedef {Object} Game
 * @property {GameType} type
 * @property {[Stab, Stab, Stab]} stab
 * @property {Result} result
 */

/**
 * @typedef {Object} UserProfile
 * @property {string} nick
 * @property {string} salt
 * @property {string} passHash
 * @property {number} mmrNow
 * @property {number} mmrGoal
 * @property {number} gamesWeek
 * @property {string} createdAt
 * @property {Game[][][]} cycles  // [12][3][33]
 */

export const GAMES_PER_MINI = 33;
export const MINIS_PER_CYCLE = 3;
export const CYCLE_COUNT = 12;
export const GAMES_PER_CYCLE = GAMES_PER_MINI * MINIS_PER_CYCLE;
export const IDEAL_WR = 0.66;
/** Средний swing MMR за игру (победа +Δ / поражение −Δ). Для планирования. */
export const MMR_DELTA = 25;

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

export function emptyGame() {
  return { type: "", stab: ["", "", ""], result: "" };
}

export function emptyCycleData() {
  return Array.from({ length: MINIS_PER_CYCLE }, () =>
    Array.from({ length: GAMES_PER_MINI }, () => emptyGame())
  );
}

export function createEmptyCycles() {
  return Array.from({ length: CYCLE_COUNT }, () => emptyCycleData());
}

export function monthLabel(startIso, cycleIndex) {
  const d = new Date(startIso);
  d.setMonth(d.getMonth() + cycleIndex);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Ожидаемый прирост MMR за N игр при винрейте wr */
export function expectedMmrGain(gamesCount, wr, delta = MMR_DELTA) {
  // E[Δ] = (2p - 1) * delta
  return Math.round(gameCount * (2 * wr - 1) * delta);
}

export function buildYearPlan(mmrNow, mmrGoal) {
  const totalGain = mmrGoal - mmrNow;
  const perCyclePlan = totalGain / CYCLE_COUNT;
  const maxPerCycle = expectedMmrGain(GAMES_PER_CYCLE, IDEAL_WR);

  return Array.from({ length: CYCLE_COUNT }, (_, i) => {
    const startPlanned = Math.round(mmrNow + perCyclePlan * i);
    const endPlanned = Math.round(mmrNow + perCyclePlan * (i + 1));
    const endMax = mmrNow + maxPerCycle * (i + 1);
    return {
      index: i,
      startPlanned,
      endPlanned,
      endMax: Math.round(endMax),
      gainPlan: Math.round(perCyclePlan),
      gainMax: maxPerCycle,
    };
  });
}

/**
 * Статистика по набору игр (мини-цикл или весь цикл)
 * @param {Game[]} games
 */
export function calcStats(games) {
  let win = 0;
  let chance = 0;
  let loss = 0;
  const byType = {
    A: { win: 0, loss: 0 },
    B: { win: 0, loss: 0 },
    C: { win: 0, loss: 0 },
  };
  const stab = { "+": 0, "-": 0, "=": 0 };

  for (const g of games) {
    if (g.result === "win") win += 1;
    else if (g.result === "chance") chance += 1;
    else if (g.result === "loss") loss += 1;

    if (g.type && (g.result === "win" || g.result === "chance" || g.result === "loss")) {
      if (g.result === "win") byType[g.type].win += 1;
      else byType[g.type].loss += 1;
    }

    for (const s of g.stab) {
      if (s === "+" || s === "-" || s === "=") stab[s] += 1;
    }
  }

  const played = win + chance + loss;
  const currentWr = played ? (win / played) * 100 : null;
  // Возможный WR: если все «голубые» обратить в победы
  const potentialWr = played ? ((win + chance) / played) * 100 : null;

  return {
    win,
    chance,
    loss,
    played,
    currentWr,
    potentialWr,
    byType,
    stab,
  };
}

export function flattenCycle(cycleData) {
  return cycleData.flat();
}

export function formatWr(value) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(1)}%`;
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

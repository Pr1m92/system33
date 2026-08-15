import { registerUser, loginUser, requireUser, clearSession } from "./storage.js?v=7";
import { renderRing, renderTopbar, renderInsight, renderAnalytics } from "./dashboard.js?v=7";
import { renderCycleView, bindEditor } from "./cycle.js?v=7";
import { runReveal, startAmbient, pulseRingNodes } from "./motion.js?v=7";
import { renderPulse } from "./pulse.js?v=7";

const views = {
  auth: document.getElementById("view-auth"),
  dashboard: document.getElementById("view-dashboard"),
  cycle: document.getElementById("view-cycle"),
};

const userRef = { current: null };
let activeCycle = 0;

startAmbient();
runReveal();

function show(view) {
  Object.values(views).forEach((el) => el.classList.remove("active"));
  views[view].classList.add("active");
  requestAnimationFrame(() => runReveal(views[view]));
}

function setError(id, message) {
  const el = document.getElementById(id);
  if (!message) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = message;
}

function paintUserChips(user) {
  document.getElementById("user-chip").textContent = user.nick;
  document.getElementById("user-chip-cycle").textContent = user.nick;
}

function openDashboard() {
  const user = userRef.current;
  paintUserChips(user);
  renderTopbar(user, document.getElementById("topbar-stats"));
  renderInsight(user, document.getElementById("insight-banner"));
  renderPulse(user, document.getElementById("pulse-root"));
  renderAnalytics(user, document.getElementById("analytics-root"));
  const svg = document.getElementById("cycle-ring");
  renderRing(user, svg, document.getElementById("ring-center"), openCycle);
  pulseRingNodes(svg);
  show("dashboard");
}

function openCycle(cycleIndex) {
  activeCycle = cycleIndex;
  const user = userRef.current;
  paintUserChips(user);
  document.getElementById("cycle-title").textContent = `Цикл ${cycleIndex + 1}`;
  renderCycleView(user, cycleIndex, document.getElementById("cycle-main"), editor.open);
  show("cycle");
}

const editor = bindEditor(userRef, (cycleIndex) => {
  openCycle(cycleIndex);
});

// Tabs
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => {
      t.classList.toggle("active", t === tab);
      t.setAttribute("aria-selected", t === tab ? "true" : "false");
    });
    const isLogin = tab.dataset.tab === "login";
    document.getElementById("form-login").hidden = !isLogin;
    document.getElementById("form-register").hidden = isLogin;
    setError("login-error", "");
    setError("reg-error", "");
  });
});

document.getElementById("form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  setError("login-error", "");
  try {
    const nick = document.getElementById("login-nick").value;
    const password = document.getElementById("login-pass").value;
    userRef.current = await loginUser(nick, password);
    openDashboard();
  } catch (err) {
    setError("login-error", err.message || "Ошибка входа");
  }
});

document.getElementById("form-register").addEventListener("submit", async (e) => {
  e.preventDefault();
  setError("reg-error", "");
  try {
    userRef.current = await registerUser({
      nick: document.getElementById("reg-nick").value,
      password: document.getElementById("reg-pass").value,
      mmrNow: Number(document.getElementById("reg-mmr-now").value),
      mmrGoal: Number(document.getElementById("reg-mmr-goal").value),
      gamesWeek: Number(document.getElementById("reg-games-week").value),
    });
    openDashboard();
  } catch (err) {
    setError("reg-error", err.message || "Ошибка регистрации");
  }
});

function logout() {
  clearSession();
  userRef.current = null;
  show("auth");
}

document.getElementById("btn-logout").addEventListener("click", logout);
document.getElementById("btn-logout-2").addEventListener("click", logout);
document.getElementById("btn-back").addEventListener("click", openDashboard);

// boot
const existing = requireUser();
if (existing) {
  userRef.current = existing;
  openDashboard();
}

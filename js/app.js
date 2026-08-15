import { registerUser, loginUser, requireUser, clearSession } from "./storage.js?v=9";
import { renderRing, renderTopbar, renderInsight, renderAnalytics } from "./dashboard.js?v=9";
import { renderCycleView, bindEditor } from "./cycle.js?v=9";
import { runReveal, startAmbient, pulseRingNodes } from "./motion.js?v=9";
import { renderPulse } from "./pulse.js?v=9";

const views = {
  auth: document.getElementById("view-auth"),
  dashboard: document.getElementById("view-dashboard"),
  cycle: document.getElementById("view-cycle"),
};

const userRef = { current: null };
let activeCycle = 0;

startAmbient();
runReveal();
bindDashNav();

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

function shellOffset() {
  const shell = document.querySelector(".dash-shell");
  return (shell?.offsetHeight || 0) + 12;
}

function jumpToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - shellOffset();
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  document.querySelectorAll(".dash-nav-btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.jump === id);
  });
}

function bindDashNav() {
  const nav = document.getElementById("dash-nav");
  if (!nav) return;
  nav.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-jump]");
    if (!btn) return;
    jumpToSection(btn.dataset.jump);
  });

  const sectionIds = [...nav.querySelectorAll("[data-jump]")].map((b) => b.dataset.jump);
  const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);

  const syncActive = () => {
    if (!views.dashboard.classList.contains("active")) return;
    const y = window.scrollY + shellOffset() + 24;
    let current = sectionIds[0];
    for (const el of sections) {
      if (el.offsetTop <= y) current = el.id;
    }
    document.querySelectorAll(".dash-nav-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.jump === current);
    });
  };

  window.addEventListener("scroll", syncActive, { passive: true });
  syncActive();
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

const existing = requireUser();
if (existing) {
  userRef.current = existing;
  openDashboard();
}

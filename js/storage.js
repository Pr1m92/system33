import { createEmptyCycles } from "./calc.js?v=5";
import { hashPassword, verifyPassword, randomSalt, randomToken } from "./crypto.js?v=5";

const USERS_KEY = "system33_users_v1";
const SESSION_KEY = "system33_session_v1";

function readUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function nickKey(nick) {
  return nick.trim().toLowerCase();
}

export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.token || !session?.nick || !session?.expiresAt) return null;
    if (Date.now() > session.expiresAt) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function setSession(nick) {
  const session = {
    nick,
    token: randomToken(),
    expiresAt: Date.now() + 1000 * 60 * 60 * 12,
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getUser(nick) {
  const users = readUsers();
  return users[nickKey(nick)] || null;
}

export function saveUser(user) {
  const users = readUsers();
  users[nickKey(user.nick)] = user;
  writeUsers(users);
}

export async function registerUser({ nick, password, mmrNow, mmrGoal, gamesWeek }) {
  const clean = nick.trim();
  if (clean.length < 2) throw new Error("Ник слишком короткий");
  if (password.length < 6) throw new Error("Пароль минимум 6 символов");
  if (mmrGoal <= mmrNow) throw new Error("Цель MMR должна быть выше текущего");
  if (getUser(clean)) throw new Error("Такой ник уже зарегистрирован");

  const salt = randomSalt();
  const passHash = await hashPassword(password, salt);

  const user = {
    nick: clean,
    salt,
    passHash,
    mmrNow,
    mmrGoal,
    gamesWeek,
    createdAt: new Date().toISOString(),
    cycles: createEmptyCycles(),
  };

  saveUser(user);
  setSession(clean);
  return user;
}

export async function loginUser(nick, password) {
  const user = getUser(nick);
  if (!user) throw new Error("Пользователь не найден");
  const ok = await verifyPassword(password, user.salt, user.passHash);
  if (!ok) throw new Error("Неверный пароль");
  setSession(user.nick);
  return user;
}

export function requireUser() {
  const session = getSession();
  if (!session) return null;
  return getUser(session.nick);
}

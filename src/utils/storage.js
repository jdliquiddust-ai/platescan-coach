// ─── Session ─────────────────────────────────────────────────────────────────

const SESSION_KEY = 'psc_session';
const USERS_KEY   = 'psc_users';

export const getCurrentUser = () => localStorage.getItem(SESSION_KEY) || null;
const setSession  = (u) => localStorage.setItem(SESSION_KEY, u);
const clearSession = () => localStorage.removeItem(SESSION_KEY);

const getUsers = () => JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
const saveUsers = (u) => localStorage.setItem(USERS_KEY, JSON.stringify(u));

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str + '__psc25'));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const createUser = async (username, password) => {
  const key = username.toLowerCase().trim();
  const users = getUsers();
  if (users[key]) throw new Error('Username already taken — try a different one.');
  if (key.length < 3) throw new Error('Username must be at least 3 characters.');
  if (!/^[a-zA-Z0-9_]+$/.test(key)) throw new Error('Only letters, numbers, and underscores allowed.');
  if (password.length < 6) throw new Error('Password must be at least 6 characters.');
  users[key] = { passwordHash: await sha256(password), displayName: username.trim(), createdAt: Date.now() };
  saveUsers(users);
  setSession(key);
  return key;
};

export const loginUser = async (username, password) => {
  const key = username.toLowerCase().trim();
  const users = getUsers();
  if (!users[key]) throw new Error('No account found with that username.');
  if (users[key].passwordHash !== await sha256(password)) throw new Error('Incorrect password.');
  setSession(key);
  return key;
};

export const logoutUser = () => clearSession();

export const getDisplayName = (username) => getUsers()[username]?.displayName || username;

// ─── Per-user key helper ──────────────────────────────────────────────────────

const uk = (u, k) => `psc_${u}_${k}`;
const get = (u, k, fallback) => JSON.parse(localStorage.getItem(uk(u, k)) || fallback);
const set = (u, k, v) => localStorage.setItem(uk(u, k), JSON.stringify(v));

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const getTodayDate = () => new Date().toISOString().split('T')[0];

// ─── Profile ─────────────────────────────────────────────────────────────────

export const getProfile   = (u) => get(u, 'profile', 'null');
export const saveProfile  = (u, p) => set(u, 'profile', p);

export const getApiKey    = (u) => localStorage.getItem(uk(u, 'apikey')) || '';
export const saveApiKey   = (u, k) => localStorage.setItem(uk(u, 'apikey'), k);

export const isOnboarded  = (u) => localStorage.getItem(uk(u, 'onboarded')) === 'true';
export const setOnboarded = (u) => localStorage.setItem(uk(u, 'onboarded'), 'true');

// ─── Daily logs ───────────────────────────────────────────────────────────────

export const getAllDailyLogs  = (u) => get(u, 'logs', '{}');
export const saveAllDailyLogs = (u, logs) => set(u, 'logs', logs);

export const getDayLog = (u, date) => {
  const all = getAllDailyLogs(u);
  return all[date] || { meals: [], steps: 0, water: 0 };
};

export const saveDayLog = (u, date, log) => {
  const all = getAllDailyLogs(u);
  all[date] = log;
  saveAllDailyLogs(u, all);
};

export const getTodayLog  = (u) => getDayLog(u, getTodayDate());
export const saveTodayLog = (u, log) => saveDayLog(u, getTodayDate(), log);

export const addMealToToday = (u, meal) => {
  const log = getTodayLog(u);
  log.meals.push(meal);
  saveTodayLog(u, log);
};

export const updateTodayMeta = (u, steps, water) => {
  const log = getTodayLog(u);
  log.steps = steps;
  log.water = water;
  saveTodayLog(u, log);
};

// ─── Favorites ────────────────────────────────────────────────────────────────

const mealFP = (items) => items.map(i => i.name.toLowerCase().trim()).sort().join('|');

export const getFavorites   = (u) => get(u, 'favorites', '[]');
export const saveFavorites  = (u, favs) => set(u, 'favorites', favs);

export const isFavorite = (u, items) => {
  const fp = mealFP(items);
  return getFavorites(u).some(f => mealFP(f.items) === fp);
};

export const toggleFavorite = (u, meal) => {
  const fp = mealFP(meal.items);
  let favs = getFavorites(u);
  const idx = favs.findIndex(f => mealFP(f.items) === fp);
  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    favs.unshift({ ...meal, favId: Date.now().toString(), savedAt: Date.now() });
  }
  saveFavorites(u, favs);
  return idx < 0; // true = now favorited
};

// ─── Reset ────────────────────────────────────────────────────────────────────

export const clearUserData = (u) => {
  ['profile', 'apikey', 'onboarded', 'logs', 'favorites'].forEach(k => {
    localStorage.removeItem(uk(u, k));
  });
};

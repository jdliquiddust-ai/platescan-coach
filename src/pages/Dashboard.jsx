import { useState, useEffect, useCallback } from 'react';
import CircularProgress from '../components/CircularProgress';
import CoachCard from '../components/CoachCard';
import { useUser } from '../context/UserContext';
import { getTodayLog, saveTodayLog, getProfile, getApiKey, isFavorite, toggleFavorite } from '../utils/storage';
import { sumMacros, MEAL_LABELS, getGreeting, MEAL_TYPES } from '../utils/nutrition';
import { getCoachInsight } from '../utils/api';

const MACRO_CONFIG = [
  { key: 'calories', label: 'Calories', unit: 'kcal', color: '#f97316' },
  { key: 'protein',  label: 'Protein',  unit: 'g',    color: '#ec4899' },
  { key: 'carbs',    label: 'Carbs',    unit: 'g',    color: '#60a5fa' },
  { key: 'fat',      label: 'Fat',      unit: 'g',    color: '#facc15' },
];

export default function Dashboard({ onNavigate }) {
  const username = useUser();
  const [log, setLog] = useState(() => getTodayLog(username));
  const [profile] = useState(() => getProfile(username));
  const [coach, setCoach] = useState(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState('');
  const [steps, setSteps] = useState(log.steps || 0);
  const [water, setWater] = useState(log.water || 0);
  const [favTick, setFavTick] = useState(0); // forces re-render after toggle

  const goals = profile?.goals || { calories: 2000, protein: 150, carbs: 200, fat: 67 };
  const consumed = sumMacros(log.meals || []);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const refreshLog = useCallback(() => {
    const fresh = getTodayLog(username);
    setLog(fresh);
    setSteps(fresh.steps || 0);
    setWater(fresh.water || 0);
  }, [username]);

  useEffect(() => {
    refreshLog();
    window.addEventListener('focus', refreshLog);
    return () => window.removeEventListener('focus', refreshLog);
  }, [refreshLog]);

  const updateMeta = (newSteps, newWater) => {
    const fresh = getTodayLog(username);
    fresh.steps = newSteps;
    fresh.water = newWater;
    saveTodayLog(username, fresh);
  };

  const handleSteps = (v) => {
    const n = Math.max(0, v);
    setSteps(n);
    updateMeta(n, water);
  };

  const handleWater = (delta) => {
    const n = Math.max(0, Math.min(16, water + delta));
    setWater(n);
    updateMeta(steps, n);
  };

  const handleToggleFav = (meal) => {
    toggleFavorite(username, meal);
    setFavTick(t => t + 1);
  };

  const fetchCoach = async () => {
    const key = getApiKey(username);
    if (!key) { setCoachError('Add your API key in Settings to use the coach.'); return; }
    if (!log.meals?.length) { setCoachError('Log a meal first to get personalized coaching.'); return; }
    setCoachLoading(true);
    setCoachError('');
    try {
      const result = await getCoachInsight(profile, log.meals, goals, key);
      setCoach(result);
    } catch (e) {
      setCoachError(e.message);
    } finally {
      setCoachLoading(false);
    }
  };

  const mealsByType = MEAL_TYPES.reduce((acc, t) => {
    acc[t] = (log.meals || []).filter(m => m.mealType === t);
    return acc;
  }, {});

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide">
      {/* Header */}
      <div className="px-5 pt-12 pb-5 bg-gradient-to-b from-slate-800/50 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm">{getGreeting()}</p>
            <h1 className="text-2xl font-bold text-white mt-0.5">{profile?.name || username} 👋</h1>
            <p className="text-slate-500 text-xs mt-1">{today}</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
            {(profile?.name || username)[0].toUpperCase()}
          </div>
        </div>
      </div>

      <div className="px-5 space-y-5 pb-6">
        {/* Calorie bar */}
        <div className="bg-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-sm font-medium">Daily Calories</span>
            <span className="text-orange-400 text-sm font-bold">{consumed.calories} / {goals.calories}</span>
          </div>
          <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, (consumed.calories / goals.calories) * 100)}%`,
                background: consumed.calories > goals.calories ? '#ef4444' : 'linear-gradient(90deg,#f97316,#f59e0b)',
              }}
            />
          </div>
          <div className="text-xs text-slate-500 mt-1.5">{Math.max(0, goals.calories - consumed.calories)} kcal remaining</div>
        </div>

        {/* Macro rings */}
        <div className="bg-slate-800 rounded-2xl p-4">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-4">Macros</p>
          <div className="grid grid-cols-4 gap-2">
            {MACRO_CONFIG.map(m => (
              <CircularProgress key={m.key} value={consumed[m.key]} goal={goals[m.key]} label={m.label} unit={m.unit} color={m.color} size={78} />
            ))}
          </div>
        </div>

        {/* Today's meals */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold">Today's Meals</h2>
            <button onClick={() => onNavigate('log')} className="text-emerald-400 text-sm font-medium">+ Add</button>
          </div>

          {log.meals?.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700/50 border-dashed rounded-2xl p-8 text-center">
              <div className="text-4xl mb-2">🍽️</div>
              <p className="text-slate-400 text-sm">No meals logged yet</p>
              <button onClick={() => onNavigate('log')} className="mt-3 px-5 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-xl">
                Log your first meal
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {MEAL_TYPES.map(type => {
                const meals = mealsByType[type];
                if (!meals.length) return null;
                const { emoji, label } = MEAL_LABELS[type];
                const typeMacros = sumMacros(meals);
                return (
                  <div key={type} className="bg-slate-800 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span>{emoji}</span>
                        <span className="text-white font-semibold text-sm">{label}</span>
                      </div>
                      <span className="text-slate-400 text-xs">{typeMacros.calories} kcal</span>
                    </div>
                    <div className="space-y-2">
                      {meals.map((meal, idx) => {
                        const faved = isFavorite(username, meal.items);
                        return (
                          <div key={idx} className="pl-2 border-l-2 border-slate-700">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-slate-300 text-sm truncate">{meal.items.map(i => i.name).join(', ')}</div>
                                <div className="flex gap-3 mt-0.5">
                                  <span className="text-pink-400 text-xs">{meal.totalProtein}g P</span>
                                  <span className="text-blue-400 text-xs">{meal.totalCarbs}g C</span>
                                  <span className="text-yellow-400 text-xs">{meal.totalFat}g F</span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleToggleFav(meal)}
                                className="flex-shrink-0 p-1 transition-transform active:scale-125"
                                title={faved ? 'Remove from favorites' : 'Save as favorite'}
                              >
                                <HeartIcon filled={faved} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Steps + Water */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800 rounded-2xl p-4">
            <div className="text-slate-400 text-xs mb-2">👟 Steps</div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleSteps(steps - 500)} className="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center font-bold">−</button>
              <input type="number" value={steps} onChange={e => handleSteps(Number(e.target.value))} className="flex-1 bg-transparent text-white font-bold text-lg text-center focus:outline-none" />
              <button onClick={() => handleSteps(steps + 500)} className="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center font-bold">+</button>
            </div>
            <div className="mt-2 w-full h-1.5 bg-slate-700 rounded-full">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(100, (steps / 10000) * 100)}%` }} />
            </div>
            <div className="text-slate-600 text-xs mt-1">Goal: 10,000</div>
          </div>

          <div className="bg-slate-800 rounded-2xl p-4">
            <div className="text-slate-400 text-xs mb-2">💧 Water</div>
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => handleWater(-1)} className="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center font-bold">−</button>
              <div className="text-center">
                <div className="text-white font-bold text-lg">{water}</div>
                <div className="text-slate-500 text-xs">of 8 glasses</div>
              </div>
              <button onClick={() => handleWater(1)} className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">+</button>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={`flex-1 h-2 rounded-full transition-all ${i < water ? 'bg-blue-400' : 'bg-slate-700'}`} />
              ))}
            </div>
          </div>
        </div>

        {/* AI Coach */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold">AI Coach</h2>
            <button onClick={fetchCoach} disabled={coachLoading} className="text-xs px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-700/30 rounded-lg font-medium disabled:opacity-50">
              {coachLoading ? 'Thinking…' : 'Get Coaching'}
            </button>
          </div>

          {coachError && <div className="bg-red-900/20 border border-red-800/30 rounded-xl p-3 text-red-400 text-sm">{coachError}</div>}
          {coach && !coachError && <CoachCard insight={coach.insight} suggestions={coach.suggestions} loading={coachLoading} />}
          {coachLoading && !coach && <CoachCard loading />}
          {!coach && !coachLoading && !coachError && (
            <div className="bg-slate-800/50 border border-slate-700/50 border-dashed rounded-2xl p-5 text-center">
              <div className="text-3xl mb-2">🤖</div>
              <p className="text-slate-400 text-sm">Log a meal, then tap "Get Coaching" for personalized advice</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HeartIcon({ filled }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? '#f43f5e' : 'none'} stroke={filled ? '#f43f5e' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

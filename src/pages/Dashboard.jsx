import { useState, useEffect, useCallback } from 'react';
import CircularProgress from '../components/CircularProgress';
import CoachCard from '../components/CoachCard';
import { useUser } from '../context/UserContext';
import { getTodayLog, saveTodayLog, getProfile, isFavorite, toggleFavorite } from '../utils/storage';
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
  const [favTick, setFavTick] = useState(0);

  const goals = profile?.goals || { calories: 2000, protein: 150, carbs: 200, fat: 67 };
  const consumed = sumMacros(log.meals || []);
  const calPct = Math.min(100, Math.round((consumed.calories / goals.calories) * 100));
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

  const handleSteps = (v) => { const n = Math.max(0, v); setSteps(n); updateMeta(n, water); };
  const handleWater = (delta) => { const n = Math.max(0, Math.min(16, water + delta)); setWater(n); updateMeta(steps, n); };
  const handleToggleFav = (meal) => { toggleFavorite(username, meal); setFavTick(t => t + 1); };

  const fetchCoach = async () => {
    if (!log.meals?.length) { setCoachError('Log a meal first to get coaching.'); return; }
    setCoachLoading(true); setCoachError('');
    try {
      const result = await getCoachInsight(profile, log.meals, goals);
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

  const remainingCal = Math.max(0, goals.calories - consumed.calories);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide bg-black">
      {/* Header */}
      <div className="px-5 pt-14 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-zinc-500 text-sm">{getGreeting()}</p>
            <h1 className="text-2xl font-bold text-white mt-0.5">{profile?.name || username}</h1>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base"
            style={{ background: 'linear-gradient(135deg,#10b981,#0891b2)' }}>
            {(profile?.name || username)[0].toUpperCase()}
          </div>
        </div>
        <p className="text-zinc-600 text-xs mt-2">{today}</p>
      </div>

      <div className="px-5 space-y-4 pb-8">
        {/* Calorie hero card */}
        <div className="rounded-3xl overflow-hidden border border-white/[0.06]"
          style={{ background: 'linear-gradient(135deg,#0d1f17,#0a1a0f)' }}>
          <div className="p-5">
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest mb-1">Calories Today</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-5xl font-bold text-white">{consumed.calories}</span>
                  <span className="text-zinc-500 text-base">/ {goals.calories}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-emerald-400 font-bold text-lg">{remainingCal}</div>
                <div className="text-zinc-600 text-xs">remaining</div>
              </div>
            </div>
            <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${calPct}%`,
                  background: consumed.calories > goals.calories ? '#ef4444' : 'linear-gradient(90deg,#10b981,#34d399)',
                  boxShadow: consumed.calories <= goals.calories ? '0 0 12px rgba(16,185,129,0.4)' : 'none',
                }}
              />
            </div>
            <div className="text-zinc-600 text-xs mt-2">{calPct}% of daily goal</div>
          </div>

          {/* Macro row */}
          <div className="grid grid-cols-3 divide-x divide-white/[0.05] border-t border-white/[0.05]">
            {[
              { label: 'Protein', key: 'protein', color: '#ec4899' },
              { label: 'Carbs',   key: 'carbs',   color: '#3b82f6' },
              { label: 'Fat',     key: 'fat',      color: '#eab308' },
            ].map(m => (
              <div key={m.key} className="py-3 text-center">
                <div className="font-bold text-sm" style={{ color: m.color }}>{consumed[m.key]}g</div>
                <div className="text-zinc-600 text-xs mt-0.5">{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Macro rings */}
        <div className="bg-zinc-900 rounded-3xl p-5 border border-white/[0.04]">
          <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest mb-4">Progress</p>
          <div className="grid grid-cols-4 gap-2">
            {MACRO_CONFIG.map(m => (
              <CircularProgress key={m.key} value={consumed[m.key]} goal={goals[m.key]} label={m.label} unit={m.unit} color={m.color} size={74} />
            ))}
          </div>
        </div>

        {/* Log meal CTA (if no meals) */}
        {!log.meals?.length && (
          <button onClick={() => onNavigate('log')}
            className="w-full py-5 rounded-3xl flex items-center justify-center gap-3 border border-dashed border-white/[0.08] active:scale-[0.98] transition-transform">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-sm">Log your first meal</p>
              <p className="text-zinc-600 text-xs">Snap a photo to get started</p>
            </div>
          </button>
        )}

        {/* Today's meals */}
        {log.meals?.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold">Today's Meals</h2>
              <button onClick={() => onNavigate('log')} className="text-emerald-400 text-sm font-medium">+ Add</button>
            </div>
            <div className="space-y-2.5">
              {MEAL_TYPES.map(type => {
                const meals = mealsByType[type];
                if (!meals.length) return null;
                const { emoji, label } = MEAL_LABELS[type];
                const typeMacros = sumMacros(meals);
                return (
                  <div key={type} className="bg-zinc-900 rounded-2xl p-4 border border-white/[0.04]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{emoji}</span>
                        <span className="text-white font-medium text-sm">{label}</span>
                      </div>
                      <span className="text-orange-400 text-xs font-semibold">{typeMacros.calories} kcal</span>
                    </div>
                    <div className="space-y-2">
                      {meals.map((meal, idx) => {
                        const faved = isFavorite(username, meal.items);
                        return (
                          <div key={idx} className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-zinc-300 text-sm truncate">{meal.items.map(i => i.name).join(', ')}</div>
                              <div className="flex gap-3 mt-0.5">
                                <span className="text-pink-400 text-xs">{meal.totalProtein}g P</span>
                                <span className="text-blue-400 text-xs">{meal.totalCarbs}g C</span>
                                <span className="text-yellow-400 text-xs">{meal.totalFat}g F</span>
                              </div>
                            </div>
                            <button onClick={() => handleToggleFav(meal)} className="p-1 transition-transform active:scale-125 flex-shrink-0">
                              <HeartIcon filled={faved} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Steps + Water */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-900 rounded-2xl p-4 border border-white/[0.04]">
            <div className="text-zinc-500 text-xs mb-3 font-medium">👟 Steps</div>
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => handleSteps(steps - 500)} className="w-8 h-8 rounded-xl bg-zinc-800 text-white flex items-center justify-center font-bold text-sm">−</button>
              <input type="number" value={steps} onChange={e => handleSteps(Number(e.target.value))}
                className="flex-1 bg-transparent text-white font-bold text-lg text-center focus:outline-none" />
              <button onClick={() => handleSteps(steps + 500)} className="w-8 h-8 rounded-xl bg-zinc-800 text-white flex items-center justify-center font-bold text-sm">+</button>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(100, (steps / 10000) * 100)}%` }} />
            </div>
            <div className="text-zinc-700 text-xs mt-1.5">/ 10,000 goal</div>
          </div>

          <div className="bg-zinc-900 rounded-2xl p-4 border border-white/[0.04]">
            <div className="text-zinc-500 text-xs mb-3 font-medium">💧 Water</div>
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => handleWater(-1)} className="w-8 h-8 rounded-xl bg-zinc-800 text-white flex items-center justify-center font-bold text-sm">−</button>
              <div className="text-center">
                <div className="text-white font-bold text-xl">{water}</div>
                <div className="text-zinc-600 text-xs">/ 8 glasses</div>
              </div>
              <button onClick={() => handleWater(1)} className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-500/20">+</button>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i < water ? 'bg-blue-400' : 'bg-zinc-800'}`} />
              ))}
            </div>
          </div>
        </div>

        {/* AI Coach */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold">AI Coach</h2>
            <button onClick={fetchCoach} disabled={coachLoading}
              className="text-xs px-3 py-1.5 rounded-xl font-medium disabled:opacity-50 transition-all"
              style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
              {coachLoading ? 'Thinking…' : 'Get Coaching'}
            </button>
          </div>

          {coachError && <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 text-red-400 text-sm">{coachError}</div>}
          {coach && !coachError && <CoachCard insight={coach.insight} suggestions={coach.suggestions} loading={coachLoading} />}
          {coachLoading && !coach && <CoachCard loading />}
          {!coach && !coachLoading && !coachError && (
            <div className="bg-zinc-900 border border-white/[0.04] border-dashed rounded-2xl p-5 text-center">
              <p className="text-zinc-500 text-sm">Log a meal then tap "Get Coaching" for personalized advice</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HeartIcon({ filled }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill={filled ? '#f43f5e' : 'none'} stroke={filled ? '#f43f5e' : '#3f3f46'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

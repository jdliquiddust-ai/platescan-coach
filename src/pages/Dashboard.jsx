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
  { key: 'carbs',    label: 'Carbs',    unit: 'g',    color: '#3b82f6' },
  { key: 'fat',      label: 'Fat',      unit: 'g',    color: '#eab308' },
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
    setLog(fresh); setSteps(fresh.steps || 0); setWater(fresh.water || 0);
  }, [username]);

  useEffect(() => {
    refreshLog();
    window.addEventListener('focus', refreshLog);
    return () => window.removeEventListener('focus', refreshLog);
  }, [refreshLog]);

  const updateMeta = (s, w) => { const f = getTodayLog(username); f.steps = s; f.water = w; saveTodayLog(username, f); };
  const handleSteps = (v) => { const n = Math.max(0, v); setSteps(n); updateMeta(n, water); };
  const handleWater = (d) => { const n = Math.max(0, Math.min(16, water + d)); setWater(n); updateMeta(steps, n); };
  const handleToggleFav = (meal) => { toggleFavorite(username, meal); setFavTick(t => t + 1); };

  const fetchCoach = async () => {
    if (!log.meals?.length) { setCoachError('Log a meal first to get coaching.'); return; }
    setCoachLoading(true); setCoachError('');
    try {
      const result = await getCoachInsight(profile, log.meals, goals);
      setCoach(result);
    } catch (e) { setCoachError(e.message); }
    finally { setCoachLoading(false); }
  };

  const mealsByType = MEAL_TYPES.reduce((acc, t) => {
    acc[t] = (log.meals || []).filter(m => m.mealType === t);
    return acc;
  }, {});

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide bg-gray-50">
      {/* Header */}
      <div className="bg-white px-5 pt-14 pb-5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">{getGreeting()}</p>
            <h1 className="text-2xl font-bold text-gray-900 mt-0.5">{profile?.name || username} 👋</h1>
          </div>
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg shadow"
            style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
            {(profile?.name || username)[0].toUpperCase()}
          </div>
        </div>
        <p className="text-gray-400 text-xs mt-1">{today}</p>
      </div>

      <div className="px-4 space-y-4 pt-4 pb-8">
        {/* Calorie hero */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-400 text-xs font-medium uppercase tracking-widest mb-1">Calories</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-5xl font-bold text-gray-900">{consumed.calories}</span>
                <span className="text-gray-400 text-sm font-medium">/ {goals.calories}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-500">{Math.max(0, goals.calories - consumed.calories)}</div>
              <div className="text-gray-400 text-xs">remaining</div>
            </div>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${calPct}%`,
                background: consumed.calories > goals.calories ? '#ef4444' : 'linear-gradient(90deg,#22c55e,#16a34a)',
              }} />
          </div>
          <p className="text-gray-400 text-xs mt-2">{calPct}% of daily goal</p>

          {/* Macro strip */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-100">
            {[
              { label: 'Protein', key: 'protein', color: '#ec4899', bg: '#fdf2f8' },
              { label: 'Carbs',   key: 'carbs',   color: '#3b82f6', bg: '#eff6ff' },
              { label: 'Fat',     key: 'fat',      color: '#eab308', bg: '#fefce8' },
            ].map(m => (
              <div key={m.key} className="rounded-2xl py-3 text-center" style={{ background: m.bg }}>
                <div className="font-bold text-base" style={{ color: m.color }}>{consumed[m.key]}g</div>
                <div className="text-gray-400 text-xs mt-0.5">{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Macro rings */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-4">Progress</p>
          <div className="grid grid-cols-4 gap-1">
            {MACRO_CONFIG.map(m => (
              <CircularProgress key={m.key} value={consumed[m.key]} goal={goals[m.key]} label={m.label} unit={m.unit} color={m.color} size={76} />
            ))}
          </div>
        </div>

        {/* Log CTA */}
        {!log.meals?.length && (
          <button onClick={() => onNavigate('log')}
            className="w-full py-5 rounded-3xl bg-white border-2 border-dashed border-gray-200 flex items-center justify-center gap-3 active:scale-[0.98] transition-transform shadow-sm">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </div>
            <div className="text-left">
              <p className="text-gray-900 font-semibold text-sm">Log your first meal</p>
              <p className="text-gray-400 text-xs">Snap a photo to get started</p>
            </div>
          </button>
        )}

        {/* Meals */}
        {log.meals?.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-gray-900 font-bold">Today's Meals</h2>
              <button onClick={() => onNavigate('log')} className="text-green-500 text-sm font-semibold">+ Add</button>
            </div>
            <div className="space-y-2.5">
              {MEAL_TYPES.map(type => {
                const meals = mealsByType[type];
                if (!meals.length) return null;
                const { emoji, label } = MEAL_LABELS[type];
                const typeMacros = sumMacros(meals);
                return (
                  <div key={type} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{emoji}</span>
                        <span className="text-gray-900 font-semibold text-sm">{label}</span>
                      </div>
                      <span className="text-orange-500 text-xs font-bold bg-orange-50 px-2 py-1 rounded-full">{typeMacros.calories} kcal</span>
                    </div>
                    <div className="space-y-2.5">
                      {meals.map((meal, idx) => {
                        const faved = isFavorite(username, meal.items);
                        return (
                          <div key={idx} className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-gray-800 text-sm truncate font-medium">{meal.items.map(i => i.name).join(', ')}</div>
                              <div className="flex gap-3 mt-0.5">
                                <span className="text-pink-500 text-xs">{meal.totalProtein}g P</span>
                                <span className="text-blue-500 text-xs">{meal.totalCarbs}g C</span>
                                <span className="text-yellow-500 text-xs">{meal.totalFat}g F</span>
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
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="text-gray-400 text-xs font-medium mb-3">👟 Steps</div>
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => handleSteps(steps - 500)} className="w-8 h-8 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-sm">−</button>
              <input type="number" value={steps} onChange={e => handleSteps(Number(e.target.value))}
                className="flex-1 bg-transparent text-gray-900 font-bold text-lg text-center focus:outline-none" />
              <button onClick={() => handleSteps(steps + 500)} className="w-8 h-8 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-sm">+</button>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full">
              <div className="h-full bg-green-400 rounded-full transition-all" style={{ width: `${Math.min(100, (steps / 10000) * 100)}%` }} />
            </div>
            <div className="text-gray-400 text-xs mt-1.5">/ 10,000 goal</div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="text-gray-400 text-xs font-medium mb-3">💧 Water</div>
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => handleWater(-1)} className="w-8 h-8 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-sm">−</button>
              <div className="text-center">
                <div className="text-gray-900 font-bold text-xl">{water}</div>
                <div className="text-gray-400 text-xs">/ 8 glasses</div>
              </div>
              <button onClick={() => handleWater(1)} className="w-8 h-8 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center font-bold text-sm">+</button>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i < water ? 'bg-blue-400' : 'bg-gray-100'}`} />
              ))}
            </div>
          </div>
        </div>

        {/* AI Coach */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-gray-900 font-bold">AI Coach</h2>
            <button onClick={fetchCoach} disabled={coachLoading}
              className="text-xs px-3 py-1.5 rounded-xl font-semibold disabled:opacity-50 text-green-600 bg-green-50 border border-green-100">
              {coachLoading ? 'Thinking…' : 'Get Advice'}
            </button>
          </div>
          {coachError && <div className="bg-red-50 border border-red-100 rounded-2xl p-3 text-red-500 text-sm">{coachError}</div>}
          {coach && !coachError && <CoachCard insight={coach.insight} suggestions={coach.suggestions} loading={coachLoading} />}
          {coachLoading && !coach && <CoachCard loading />}
          {!coach && !coachLoading && !coachError && (
            <div className="bg-white border border-gray-100 border-dashed rounded-2xl p-5 text-center shadow-sm">
              <p className="text-gray-400 text-sm">Log a meal then tap "Get Advice" for personalized coaching</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HeartIcon({ filled }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill={filled ? '#f43f5e' : 'none'} stroke={filled ? '#f43f5e' : '#d1d5db'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}

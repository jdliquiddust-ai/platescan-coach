import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import CircularProgress from '../components/CircularProgress';
import CoachCard from '../components/CoachCard';
import { useUser } from '../context/UserContext';
import { getTodayLog, saveTodayLog, getProfile, getAllDailyLogs, isFavorite, toggleFavorite } from '../utils/storage';
import { sumMacros, MEAL_LABELS, getGreeting, MEAL_TYPES } from '../utils/nutrition';
import { getCoachInsight } from '../utils/api';

const MACRO_CONFIG = [
  { key: 'calories', label: 'Calories', unit: 'kcal', color: '#f97316' },
  { key: 'protein',  label: 'Protein',  unit: 'g',    color: '#ec4899' },
  { key: 'carbs',    label: 'Carbs',    unit: 'g',    color: '#3b82f6' },
  { key: 'fat',      label: 'Fat',      unit: 'g',    color: '#eab308' },
];

const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, type: 'spring', stiffness: 260, damping: 22 } }),
};

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

  const allLogs = getAllDailyLogs(username);
  const streak = useMemo(() => {
    let count = 0;
    const now = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const key = d.toISOString().split('T')[0];
      if (allLogs[key]?.meals?.length) count++; else if (i > 0) break;
    }
    return count;
  }, [allLogs]);

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
    <div className="flex-1 overflow-y-auto scrollbar-hide">
      {/* Header */}
      <div className="px-5 pt-14 pb-5 glass" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p style={{ color: 'rgba(255,255,255,0.5)' }} className="text-sm">{getGreeting()}</p>
            <h1 className="text-2xl font-bold text-white mt-0.5">{profile?.name || username} 👋</h1>
          </div>
          <div className="flex items-center gap-3">
            {streak > 0 && (
              <motion.div whileTap={{ scale: 0.9 }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(255,165,0,0.15)', border: '1px solid rgba(255,165,0,0.3)' }}>
                <span className="text-base">🔥</span>
                <span className="text-orange-400 font-bold text-sm">{streak}</span>
              </motion.div>
            )}
            <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg"
              style={{ background: 'linear-gradient(135deg,#9EFF00,#6abf00)', color: '#060d06' }}>
              {(profile?.name || username)[0].toUpperCase()}
            </div>
          </div>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.35)' }} className="text-xs mt-1">{today}</p>
      </div>

      <div className="px-4 space-y-4 pt-4 pb-8">
        {/* Calorie hero */}
        <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible"
          className="glass-strong rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p style={{ color: 'rgba(255,255,255,0.45)' }} className="text-xs font-medium uppercase tracking-widest mb-1">Calories</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-5xl font-bold text-white">{consumed.calories}</span>
                <span style={{ color: 'rgba(255,255,255,0.4)' }} className="text-sm font-medium">/ {goals.calories}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: '#9EFF00' }}>{Math.max(0, goals.calories - consumed.calories)}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)' }} className="text-xs">remaining</div>
            </div>
          </div>
          <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <motion.div className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${calPct}%` }}
              transition={{ type: 'spring', stiffness: 80, damping: 20 }}
              style={{ background: consumed.calories > goals.calories ? '#ef4444' : 'linear-gradient(90deg,#9EFF00,#6abf00)' }} />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.35)' }} className="text-xs mt-2">{calPct}% of daily goal</p>
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            {[
              { label: 'Protein', key: 'protein', color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
              { label: 'Carbs',   key: 'carbs',   color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
              { label: 'Fat',     key: 'fat',     color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
            ].map(m => (
              <div key={m.key} className="rounded-2xl py-3 text-center" style={{ background: m.bg }}>
                <div className="font-bold text-base" style={{ color: m.color }}>{consumed[m.key]}g</div>
                <div style={{ color: 'rgba(255,255,255,0.4)' }} className="text-xs mt-0.5">{m.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Macro rings */}
        <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible"
          className="glass rounded-3xl p-5 shadow-lg">
          <p style={{ color: 'rgba(255,255,255,0.45)' }} className="text-xs font-semibold uppercase tracking-widest mb-4">Progress</p>
          <div className="grid grid-cols-4 gap-1">
            {MACRO_CONFIG.map(m => (
              <CircularProgress key={m.key} value={consumed[m.key]} goal={goals[m.key]} label={m.label} unit={m.unit} color={m.color} size={76} dark />
            ))}
          </div>
        </motion.div>

        {/* Log CTA */}
        {!log.meals?.length && (
          <motion.button custom={2} variants={cardVariants} initial="hidden" animate="visible"
            whileTap={{ scale: 0.97 }} onClick={() => onNavigate('log')}
            className="w-full py-5 rounded-3xl glass flex items-center justify-center gap-3 shadow-lg"
            style={{ border: '2px dashed rgba(158,255,0,0.3)' }}>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#9EFF00,#6abf00)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#060d06" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-sm">Log your first meal</p>
              <p style={{ color: 'rgba(255,255,255,0.4)' }} className="text-xs">Snap a photo to get started</p>
            </div>
          </motion.button>
        )}

        {/* Meals */}
        {log.meals?.length > 0 && (
          <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-white font-bold">Today's Meals</h2>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => onNavigate('log')}
                className="text-sm font-semibold px-3 py-1 rounded-full"
                style={{ color: '#9EFF00', background: 'rgba(158,255,0,0.1)', border: '1px solid rgba(158,255,0,0.2)' }}>
                + Add
              </motion.button>
            </div>
            <div className="space-y-2.5">
              {MEAL_TYPES.map(type => {
                const meals = mealsByType[type];
                if (!meals.length) return null;
                const { emoji, label } = MEAL_LABELS[type];
                const typeMacros = sumMacros(meals);
                return (
                  <motion.div key={type} whileTap={{ scale: 0.98 }}
                    className="glass rounded-2xl p-4 shadow-md">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{emoji}</span>
                        <span className="text-white font-semibold text-sm">{label}</span>
                      </div>
                      <span className="text-xs font-bold px-2 py-1 rounded-full"
                        style={{ color: '#f97316', background: 'rgba(249,115,22,0.15)' }}>{typeMacros.calories} kcal</span>
                    </div>
                    <div className="space-y-2.5">
                      {meals.map((meal, idx) => {
                        const faved = isFavorite(username, meal.items);
                        return (
                          <div key={idx} className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-white text-sm truncate font-medium">{meal.items.map(i => i.name).join(', ')}</div>
                              <div className="flex gap-3 mt-0.5">
                                <span style={{ color: '#ec4899' }} className="text-xs">{meal.totalProtein}g P</span>
                                <span style={{ color: '#3b82f6' }} className="text-xs">{meal.totalCarbs}g C</span>
                                <span style={{ color: '#eab308' }} className="text-xs">{meal.totalFat}g F</span>
                              </div>
                            </div>
                            <motion.button whileTap={{ scale: 1.3 }} onClick={() => handleToggleFav(meal)} className="p-1 flex-shrink-0">
                              <HeartIcon filled={faved} />
                            </motion.button>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Steps + Water */}
        <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible"
          className="grid grid-cols-2 gap-3">
          <div className="glass rounded-2xl p-4 shadow-md">
            <div style={{ color: 'rgba(255,255,255,0.5)' }} className="text-xs font-medium mb-3">👟 Steps</div>
            <div className="flex items-center gap-2 mb-3">
              <motion.button whileTap={{ scale: 0.88 }} onClick={() => handleSteps(steps - 500)}
                className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>−</motion.button>
              <input type="number" value={steps} onChange={e => handleSteps(Number(e.target.value))}
                className="flex-1 bg-transparent text-white font-bold text-lg text-center focus:outline-none" />
              <motion.button whileTap={{ scale: 0.88 }} onClick={() => handleSteps(steps + 500)}
                className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm"
                style={{ background: 'rgba(158,255,0,0.15)', color: '#9EFF00' }}>+</motion.button>
            </div>
            <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100,(steps/10000)*100)}%`, background: '#9EFF00' }} />
            </div>
            <div style={{ color: 'rgba(255,255,255,0.35)' }} className="text-xs mt-1.5">/ 10,000 goal</div>
          </div>

          <div className="glass rounded-2xl p-4 shadow-md">
            <div style={{ color: 'rgba(255,255,255,0.5)' }} className="text-xs font-medium mb-3">💧 Water</div>
            <div className="flex items-center justify-between mb-3">
              <motion.button whileTap={{ scale: 0.88 }} onClick={() => handleWater(-1)}
                className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>−</motion.button>
              <div className="text-center">
                <div className="text-white font-bold text-xl">{water}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)' }} className="text-xs">/ 8 glasses</div>
              </div>
              <motion.button whileTap={{ scale: 0.88 }} onClick={() => handleWater(1)}
                className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm"
                style={{ background: 'rgba(59,130,246,0.2)', color: '#60a5fa' }}>+</motion.button>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex-1 h-1.5 rounded-full transition-all"
                  style={{ background: i < water ? '#60a5fa' : 'rgba(255,255,255,0.1)' }} />
              ))}
            </div>
          </div>
        </motion.div>

        {/* AI Coach */}
        <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-white font-bold">AI Coach</h2>
            <motion.button whileTap={{ scale: 0.9 }} onClick={fetchCoach} disabled={coachLoading}
              className="text-xs px-3 py-1.5 rounded-xl font-semibold disabled:opacity-50"
              style={{ color: '#9EFF00', background: 'rgba(158,255,0,0.1)', border: '1px solid rgba(158,255,0,0.25)' }}>
              {coachLoading ? 'Thinking…' : 'Get Advice'}
            </motion.button>
          </div>
          {coachError && (
            <div className="rounded-2xl p-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>{coachError}</div>
          )}
          {coach && !coachError && <CoachCard insight={coach.insight} healthAnalysis={coach.healthAnalysis} recovery={coach.recovery} suggestions={coach.suggestions} loading={coachLoading} dark />}
          {coachLoading && !coach && <CoachCard loading dark />}
          {!coach && !coachLoading && !coachError && (
            <div className="glass rounded-2xl p-5 text-center shadow-md">
              <p style={{ color: 'rgba(255,255,255,0.4)' }} className="text-sm">Log a meal then tap "Get Advice" for personalized coaching</p>
            </div>
          )}
        </motion.div>

        {/* Footer */}
        <p className="text-center text-xs mt-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Proprietary AI Engine v2.0 | Secured by JD's Vault
        </p>
      </div>
    </div>
  );
}

function HeartIcon({ filled }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill={filled ? '#f43f5e' : 'none'} stroke={filled ? '#f43f5e' : 'rgba(255,255,255,0.3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}

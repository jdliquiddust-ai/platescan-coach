import { useState, useMemo } from 'react';
import { getAllDailyLogs, getProfile, isFavorite, toggleFavorite } from '../utils/storage';
import { useUser } from '../context/UserContext';
import { sumMacros, formatDate, MEAL_LABELS } from '../utils/nutrition';

export default function History() {
  const username = useUser();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});
  const [expandedMeal, setExpandedMeal] = useState({});
  const [favTick, setFavTick] = useState(0);

  const profile = getProfile(username);
  const goals = profile?.goals || { calories: 2000, protein: 150 };
  const allLogs = getAllDailyLogs(username);

  const dates = Object.keys(allLogs).sort((a, b) => b.localeCompare(a));

  const filteredDates = useMemo(() => {
    if (!search.trim()) return dates;
    const q = search.toLowerCase();
    return dates.filter(date =>
      allLogs[date].meals.some(meal => meal.items.some(item => item.name.toLowerCase().includes(q)))
    );
  }, [dates, search, allLogs]);

  const weeklyData = useMemo(() => {
    const today = new Date();
    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const log = allLogs[key];
      if (log?.meals?.length) week.push({ date: key, ...sumMacros(log.meals) });
    }
    return week;
  }, [allLogs]);

  const avgCalories = weeklyData.length
    ? Math.round(weeklyData.reduce((s, d) => s + d.calories, 0) / weeklyData.length)
    : 0;

  const bestProteinDay = weeklyData.length
    ? weeklyData.reduce((best, d) => d.protein > (best?.protein || 0) ? d : best, null)
    : null;

  const streak = useMemo(() => {
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().split('T')[0];
      if (allLogs[key]?.meals?.length) count++;
      else if (i > 0) break;
    }
    return count;
  }, [allLogs]);

  const toggleDay = (date) => setExpanded(p => ({ ...p, [date]: !p[date] }));
  const toggleMealExp = (id) => setExpandedMeal(p => ({ ...p, [id]: !p[id] }));

  const handleToggleFav = (meal) => {
    toggleFavorite(username, meal);
    setFavTick(t => t + 1);
  };

  const dayStatus = (totalCal) => {
    const diff = Math.abs(totalCal - goals.calories) / goals.calories;
    if (diff <= 0.1) return { color: 'text-emerald-400', bg: 'bg-emerald-900/20 border-emerald-700/30', label: 'On target' };
    if (diff <= 0.25) return { color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-700/30', label: 'Slightly off' };
    return { color: 'text-red-400', bg: 'bg-red-900/20 border-red-700/30', label: 'Way off' };
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-white">History</h1>
        <p className="text-slate-400 text-sm mt-0.5">Your full meal log</p>
      </div>

      <div className="px-5 space-y-5 pb-8">
        {/* Weekly summary */}
        {weeklyData.length > 0 && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
            <h3 className="text-white font-semibold mb-3">📊 7-Day Summary</h3>
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Avg Calories" value={avgCalories} unit="kcal" color="text-orange-400" />
              <StatCard label="Best Protein" value={bestProteinDay ? Math.round(bestProteinDay.protein) : 0} unit="g" color="text-pink-400" />
              <StatCard label="Log Streak" value={streak} unit="days" color="text-emerald-400" />
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search meals by food name…"
            className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {filteredDates.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">{search ? '🔍' : '📭'}</div>
            <p className="text-slate-400">{search ? 'No meals match your search' : 'No meals logged yet'}</p>
          </div>
        ) : (
          filteredDates.map(date => {
            const log = allLogs[date];
            const meals = log.meals || [];
            const macros = sumMacros(meals);
            const { color, bg, label } = dayStatus(macros.calories);
            const isOpen = expanded[date];

            return (
              <div key={date} className={`border rounded-2xl overflow-hidden transition-all ${bg}`}>
                <button onClick={() => toggleDay(date)} className="w-full flex items-center justify-between p-4 text-left">
                  <div>
                    <div className="text-white font-semibold">{formatDate(date)}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-sm font-medium ${color}`}>{macros.calories} kcal</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-500 text-xs">{meals.length} meal{meals.length !== 1 ? 's' : ''}</span>
                      <span className={`text-xs ${color} opacity-70`}>· {label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-pink-400 text-xs">{Math.round(macros.protein)}g P</div>
                      <div className="text-blue-400 text-xs">{Math.round(macros.carbs)}g C</div>
                    </div>
                    <span className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-white/5 divide-y divide-white/5">
                    {meals.map((meal, idx) => {
                      const mealId = `${date}-${idx}`;
                      const isExpMeal = expandedMeal[mealId];
                      const { emoji, label: typeLabel } = MEAL_LABELS[meal.mealType] || { emoji: '🍽️', label: meal.mealType };
                      const faved = isFavorite(username, meal.items);

                      return (
                        <div key={mealId}>
                          <div className="flex items-start gap-3 p-4">
                            {meal.photoThumbnail ? (
                              <img src={meal.photoThumbnail} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center text-xl flex-shrink-0">{emoji}</div>
                            )}
                            <button onClick={() => toggleMealExp(mealId)} className="flex-1 min-w-0 text-left">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-300 text-xs font-medium uppercase tracking-wide">{typeLabel}</span>
                                <span className="text-orange-400 text-sm font-semibold">{meal.totalCalories} kcal</span>
                              </div>
                              <div className="text-white text-sm mt-0.5 truncate">{meal.items.map(i => i.name).join(', ')}</div>
                              <div className="flex gap-3 mt-1">
                                <span className="text-pink-400 text-xs">{meal.totalProtein}g P</span>
                                <span className="text-blue-400 text-xs">{meal.totalCarbs}g C</span>
                                <span className="text-yellow-400 text-xs">{meal.totalFat}g F</span>
                              </div>
                            </button>
                            <button
                              onClick={() => handleToggleFav(meal)}
                              className="flex-shrink-0 p-1 transition-transform active:scale-125 mt-1"
                            >
                              <HeartIcon filled={faved} />
                            </button>
                          </div>

                          {isExpMeal && (
                            <div className="px-4 pb-4 space-y-3 animate-fade-in">
                              <div className="bg-slate-900/50 rounded-xl p-3 space-y-1.5">
                                {meal.items.map((item, i) => (
                                  <div key={i} className="flex justify-between text-sm">
                                    <span className="text-slate-300">{item.name}</span>
                                    <span className="text-slate-500">{item.calories} kcal</span>
                                  </div>
                                ))}
                              </div>
                              {meal.coachInsight && (
                                <div className="bg-emerald-900/20 border border-emerald-700/20 rounded-xl p-3">
                                  <div className="text-emerald-400 text-xs font-semibold mb-1">Coach insight from this session</div>
                                  <p className="text-slate-300 text-xs leading-relaxed">{meal.coachInsight}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, unit, color }) {
  return (
    <div className="bg-slate-900/50 rounded-xl p-3 text-center">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-slate-500 text-xs">{unit}</div>
      <div className="text-slate-500 text-xs mt-0.5">{label}</div>
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

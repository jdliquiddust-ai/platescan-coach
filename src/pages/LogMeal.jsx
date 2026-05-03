import { useState, useRef } from 'react';
import { analyzePhoto, analyzeText, lookupBarcode, getCoachInsight } from '../utils/api';
import { addMealToToday, getProfile, getApiKey, getTodayLog, saveTodayLog, getFavorites, toggleFavorite, isFavorite } from '../utils/storage';
import { MEAL_LABELS, MEAL_TYPES } from '../utils/nutrition';
import { useUser } from '../context/UserContext';
import CoachCard from '../components/CoachCard';

const METHODS = [
  { id: 'photo',   label: 'Camera',  emoji: '📷' },
  { id: 'text',    label: 'Describe', emoji: '✏️' },
  { id: 'barcode', label: 'Barcode', emoji: '▦' },
];

export default function LogMeal({ onBack, onDone }) {
  const username = useUser();
  const [method, setMethod] = useState('photo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [mealType, setMealType] = useState(() => {
    const h = new Date().getHours();
    return h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 20 ? 'dinner' : 'snack';
  });
  const [coach, setCoach] = useState(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [favTick, setFavTick] = useState(0);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoData, setPhotoData] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const fileRef = useRef();

  const favorites = getFavorites(username);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result);
      setPhotoData({ base64: reader.result.split(',')[1], mediaType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    const key = getApiKey(username);
    if (!key && method !== 'barcode') { setError('Add your API key in Settings first.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      let res;
      if (method === 'photo') {
        if (!photoData) { setError('Please take or select a photo first.'); setLoading(false); return; }
        res = await analyzePhoto(photoData.base64, photoData.mediaType, key);
      } else if (method === 'text') {
        if (!textInput.trim()) { setError('Please describe your meal.'); setLoading(false); return; }
        res = await analyzeText(textInput.trim(), key);
      } else {
        if (!barcodeInput.trim()) { setError('Please enter a barcode number.'); setLoading(false); return; }
        res = await lookupBarcode(barcodeInput.trim());
      }
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const useFavorite = (fav) => {
    setResult({ items: fav.items, totalCalories: fav.totalCalories, totalProtein: fav.totalProtein, totalCarbs: fav.totalCarbs, totalFat: fav.totalFat });
    setError('');
  };

  const saveMeal = async () => {
    if (!result) return;
    const meal = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      mealType,
      timestamp: Date.now(),
      items: result.items,
      totalCalories: result.totalCalories,
      totalProtein: result.totalProtein,
      totalCarbs: result.totalCarbs,
      totalFat: result.totalFat,
      photoThumbnail: photoPreview || null,
    };
    addMealToToday(username, meal);
    setSaved(true);

    const profile = getProfile(username);
    const key = getApiKey(username);
    if (profile && key) {
      setCoachLoading(true);
      try {
        const todayLog = getTodayLog(username);
        const insight = await getCoachInsight(profile, todayLog.meals, profile.goals, key);
        setCoach(insight);
        const updatedLog = getTodayLog(username);
        const last = updatedLog.meals[updatedLog.meals.length - 1];
        if (last) {
          last.coachInsight = insight.insight;
          last.suggestions = insight.suggestions;
          saveTodayLog(username, updatedLog);
        }
      } catch (_) {}
      finally { setCoachLoading(false); }
    }
  };

  const handleToggleFavResult = () => {
    if (!result) return;
    toggleFavorite(username, { items: result.items, totalCalories: result.totalCalories, totalProtein: result.totalProtein, totalCarbs: result.totalCarbs, totalFat: result.totalFat });
    setFavTick(t => t + 1);
  };

  const resultIsFav = result ? isFavorite(username, result.items) : false;

  const resetForm = () => {
    setResult(null); setSaved(false); setCoach(null);
    setPhotoPreview(null); setPhotoData(null);
    setTextInput(''); setBarcodeInput('');
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide bg-black">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-14 pb-5">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-white">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h1 className="text-lg font-semibold text-white">Log Meal</h1>
      </div>

      <div className="px-5 pb-10 space-y-5">
        {/* Method tabs */}
        <div className="flex gap-2 bg-zinc-900 rounded-2xl p-1.5">
          {METHODS.map(m => (
            <button
              key={m.id}
              onClick={() => { setMethod(m.id); setResult(null); setError(''); setPhotoPreview(null); setPhotoData(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${method === m.id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-zinc-500'}`}
            >
              <span className="text-base">{m.emoji}</span> {m.label}
            </button>
          ))}
        </div>

        {/* Favorites strip */}
        {!result && !saved && favorites.length > 0 && (
          <div>
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest mb-3">Quick Add</p>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
              {favorites.map(fav => (
                <button key={fav.favId} onClick={() => useFavorite(fav)}
                  className="flex-shrink-0 bg-zinc-900 border border-white/[0.06] rounded-2xl p-3 text-left w-36 active:scale-95 transition-transform">
                  <div className="text-rose-400 text-xs mb-1.5 font-medium">♥ Saved</div>
                  <div className="text-white text-xs font-medium leading-tight line-clamp-2">{fav.items.map(i => i.name).join(', ')}</div>
                  <div className="text-orange-400 text-xs mt-2 font-bold">{fav.totalCalories} kcal</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Camera input */}
        {method === 'photo' && !result && (
          <div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
            {!photoPreview ? (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full h-72 rounded-3xl border border-white/[0.07] bg-zinc-900 flex flex-col items-center justify-center gap-4 active:scale-[0.98] transition-transform"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-white font-semibold">Take a photo</p>
                  <p className="text-zinc-500 text-sm mt-0.5">Tap to open camera</p>
                </div>
              </button>
            ) : (
              <div className="relative rounded-3xl overflow-hidden">
                <img src={photoPreview} alt="Meal" className="w-full h-72 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <button onClick={() => { setPhotoPreview(null); setPhotoData(null); fileRef.current?.click(); }}
                  className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full border border-white/10">
                  Retake
                </button>
              </div>
            )}
          </div>
        )}

        {/* Text input */}
        {method === 'text' && !result && (
          <textarea
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            placeholder="e.g. Two scrambled eggs, whole wheat toast, and orange juice…"
            rows={5}
            className="w-full bg-zinc-900 border border-white/[0.07] rounded-2xl px-4 py-4 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
          />
        )}

        {/* Barcode input */}
        {method === 'barcode' && !result && (
          <div>
            <input
              type="number"
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              placeholder="Enter barcode number…"
              className="w-full bg-zinc-900 border border-white/[0.07] rounded-2xl px-4 py-4 text-white text-base placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
            <p className="text-zinc-600 text-xs mt-2 px-1">Enter the barcode from the product packaging</p>
          </div>
        )}

        {/* Analyze button */}
        {!result && !saved && (
          <button onClick={analyze} disabled={loading}
            className="w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.98] disabled:opacity-40"
            style={{ background: loading ? '#18181b' : 'linear-gradient(135deg,#10b981,#059669)', color: 'white', boxShadow: loading ? 'none' : '0 8px 32px rgba(16,185,129,0.25)' }}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Analyzing…
              </span>
            ) : method === 'photo' ? 'Analyze Photo' : method === 'text' ? 'Parse Meal' : 'Look Up Barcode'}
          </button>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-400 text-sm">{error}</div>
        )}

        {/* Result */}
        {result && !saved && (
          <div className="space-y-4 animate-slide-up">
            <div className="bg-zinc-900 rounded-3xl overflow-hidden border border-white/[0.06]">
              {photoPreview && <img src={photoPreview} alt="" className="w-full h-48 object-cover" />}
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold">Detected</h3>
                  <button onClick={handleToggleFavResult}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-all active:scale-95"
                    style={resultIsFav ? { borderColor: 'rgba(244,63,94,0.4)', color: '#f43f5e', background: 'rgba(244,63,94,0.08)' } : { borderColor: 'rgba(255,255,255,0.1)', color: '#6b7280' }}>
                    <HeartIcon filled={resultIsFav} size={12} />
                    {resultIsFav ? 'Saved' : 'Save'}
                  </button>
                </div>
                <div className="space-y-2.5 mb-4">
                  {result.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-zinc-300 text-sm">{item.name}</span>
                      <span className="text-orange-400 text-sm font-semibold">{item.calories} kcal</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/[0.06] pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white font-bold text-base">Total</span>
                    <span className="text-orange-400 font-bold text-xl">{result.totalCalories} kcal</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <MacroPill label="Protein" value={result.totalProtein} color="#ec4899" />
                    <MacroPill label="Carbs" value={result.totalCarbs} color="#3b82f6" />
                    <MacroPill label="Fat" value={result.totalFat} color="#eab308" />
                  </div>
                </div>
              </div>
            </div>

            {/* Meal type */}
            <div>
              <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest mb-3">Meal Type</p>
              <div className="grid grid-cols-4 gap-2">
                {MEAL_TYPES.map(t => {
                  const { emoji, label } = MEAL_LABELS[t];
                  return (
                    <button key={t} onClick={() => setMealType(t)}
                      className={`flex flex-col items-center gap-1 py-3 rounded-2xl border transition-all text-xs font-medium ${mealType === t ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' : 'border-white/[0.06] bg-zinc-900 text-zinc-500'}`}>
                      <span className="text-lg">{emoji}</span>{label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={resetForm} className="flex-1 py-4 rounded-2xl border border-white/[0.08] text-zinc-400 font-semibold text-sm">Redo</button>
              <button onClick={saveMeal}
                className="flex-1 py-4 rounded-2xl font-bold text-sm text-white"
                style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 8px 24px rgba(16,185,129,0.25)' }}>
                Add to Log
              </button>
            </div>
          </div>
        )}

        {/* Post-save */}
        {saved && (
          <div className="space-y-4 animate-slide-up">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <p className="text-white font-bold text-lg">Meal logged!</p>
              <p className="text-zinc-400 text-sm mt-1">{result.totalCalories} kcal · {MEAL_LABELS[mealType].label}</p>
            </div>
            {(coachLoading || coach) && <CoachCard insight={coach?.insight} suggestions={coach?.suggestions} loading={coachLoading} />}
            <div className="flex gap-3">
              <button onClick={resetForm} className="flex-1 py-4 rounded-2xl border border-white/[0.08] text-zinc-400 font-semibold text-sm">Log Another</button>
              <button onClick={onDone}
                className="flex-1 py-4 rounded-2xl font-bold text-sm text-white"
                style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 8px 24px rgba(16,185,129,0.25)' }}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MacroPill({ label, value, color }) {
  return (
    <div className="bg-black/40 rounded-xl p-2.5 text-center border border-white/[0.04]">
      <div className="font-bold text-sm" style={{ color }}>{value}g</div>
      <div className="text-zinc-600 text-xs mt-0.5">{label}</div>
    </div>
  );
}

function HeartIcon({ filled, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#f43f5e' : 'none'} stroke={filled ? '#f43f5e' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

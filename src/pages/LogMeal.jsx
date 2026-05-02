import { useState, useRef } from 'react';
import { analyzePhoto, analyzeText, lookupBarcode, getCoachInsight } from '../utils/api';
import { addMealToToday, getProfile, getApiKey, getTodayLog, saveTodayLog, getFavorites, toggleFavorite, isFavorite } from '../utils/storage';
import { MEAL_LABELS, MEAL_TYPES } from '../utils/nutrition';
import { useUser } from '../context/UserContext';
import CoachCard from '../components/CoachCard';

const METHODS = [
  { id: 'photo',   label: 'Photo',    emoji: '📷' },
  { id: 'text',    label: 'Text',     emoji: '✏️' },
  { id: 'barcode', label: 'Barcode',  emoji: '📊' },
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

  // Photo
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoData, setPhotoData] = useState(null);
  const fileRef = useRef();

  // Text
  const [textInput, setTextInput] = useState('');

  // Barcode
  const [barcodeInput, setBarcodeInput] = useState('');

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
    if (!key) { setError('Add your Anthropic API key in Settings first.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      let res;
      if (method === 'photo') {
        if (!photoData) { setError('Please select a photo first.'); setLoading(false); return; }
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
    setResult({
      items: fav.items,
      totalCalories: fav.totalCalories,
      totalProtein: fav.totalProtein,
      totalCarbs: fav.totalCarbs,
      totalFat: fav.totalFat,
    });
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

    const key = getApiKey(username);
    const profile = getProfile(username);
    if (key && profile) {
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
      } catch (_) {
        // coach is optional
      } finally {
        setCoachLoading(false);
      }
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
    <div className="flex-1 overflow-y-auto scrollbar-hide">
      <div className="flex items-center gap-3 px-5 pt-12 pb-4">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 text-lg">←</button>
        <h1 className="text-xl font-bold text-white">Log Meal</h1>
      </div>

      <div className="px-5 space-y-5 pb-8">
        {/* Method tabs */}
        <div className="flex gap-2 bg-slate-800 rounded-2xl p-1.5">
          {METHODS.map(m => (
            <button
              key={m.id}
              onClick={() => { setMethod(m.id); setResult(null); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${method === m.id ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400'}`}
            >
              <span>{m.emoji}</span> {m.label}
            </button>
          ))}
        </div>

        {/* Favorites quick-add */}
        {!result && !saved && favorites.length > 0 && (
          <div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-2">⭐ Quick Add Favorites</p>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
              {favorites.map(fav => (
                <button
                  key={fav.favId}
                  onClick={() => useFavorite(fav)}
                  className="flex-shrink-0 bg-slate-800 border border-slate-700 rounded-xl p-3 text-left w-36 hover:border-emerald-600 transition-colors"
                >
                  <div className="text-rose-400 text-xs mb-1">♥ Favorite</div>
                  <div className="text-white text-xs font-medium leading-tight truncate">{fav.items.map(i => i.name).join(', ')}</div>
                  <div className="text-orange-400 text-xs mt-1 font-semibold">{fav.totalCalories} kcal</div>
                  <div className="flex gap-1.5 mt-1">
                    <span className="text-pink-400 text-[10px]">{fav.totalProtein}P</span>
                    <span className="text-blue-400 text-[10px]">{fav.totalCarbs}C</span>
                    <span className="text-yellow-400 text-[10px]">{fav.totalFat}F</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Photo input */}
        {method === 'photo' && !result && (
          <div>
            <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-slate-700 rounded-2xl overflow-hidden cursor-pointer hover:border-emerald-600 transition-colors">
              {photoPreview ? (
                <img src={photoPreview} alt="Meal preview" className="w-full h-56 object-cover" />
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-slate-500 gap-2">
                  <span className="text-4xl">📷</span>
                  <span className="text-sm">Tap to upload or capture a photo</span>
                  <span className="text-xs text-slate-600">JPG, PNG, WEBP</span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
            {photoPreview && <button onClick={() => { setPhotoPreview(null); setPhotoData(null); }} className="mt-2 text-slate-500 text-xs">Remove photo</button>}
          </div>
        )}

        {/* Text input */}
        {method === 'text' && !result && (
          <textarea
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            placeholder="e.g. Two scrambled eggs, a slice of whole wheat toast, and a cup of orange juice"
            rows={4}
            className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
          />
        )}

        {/* Barcode input */}
        {method === 'barcode' && !result && (
          <div>
            <label className="block text-sm text-slate-400 mb-2">Barcode Number</label>
            <input
              type="number"
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              placeholder="e.g. 737628064502"
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3.5 text-white text-base placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <p className="text-slate-600 text-xs mt-2">Enter the barcode from the product packaging</p>
          </div>
        )}

        {/* Analyze button */}
        {!result && !saved && (
          <button onClick={analyze} disabled={loading} className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-base disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-emerald-900/40">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing…
              </span>
            ) : method === 'photo' ? '🔍 Analyze Photo' : method === 'text' ? '🔍 Parse Meal' : '🔍 Look Up Barcode'}
          </button>
        )}

        {error && <div className="bg-red-900/20 border border-red-800/30 rounded-xl p-3 text-red-400 text-sm">{error}</div>}

        {/* Result preview */}
        {result && !saved && (
          <div className="space-y-4 animate-slide-up">
            <div className="bg-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">Detected Items</h3>
                <button onClick={handleToggleFavResult} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all active:scale-110"
                  style={resultIsFav ? { borderColor: '#f43f5e', color: '#f43f5e', background: 'rgba(244,63,94,0.08)' } : { borderColor: '#475569', color: '#94a3b8' }}>
                  <HeartIcon filled={resultIsFav} size={13} />
                  {resultIsFav ? 'Saved' : 'Save'}
                </button>
              </div>
              <div className="space-y-2">
                {result.items.map((item, i) => (
                  <div key={i} className="flex items-start justify-between py-2 border-b border-slate-700 last:border-0">
                    <span className="text-slate-300 text-sm flex-1">{item.name}</span>
                    <span className="text-orange-400 text-sm font-medium ml-2">{item.calories} kcal</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-700">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-white font-bold">Total</span>
                  <span className="text-orange-400 font-bold">{result.totalCalories} kcal</span>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-pink-400">{result.totalProtein}g protein</span>
                  <span className="text-blue-400">{result.totalCarbs}g carbs</span>
                  <span className="text-yellow-400">{result.totalFat}g fat</span>
                </div>
              </div>
            </div>

            {/* Meal type */}
            <div>
              <label className="text-slate-400 text-sm mb-2 block">Meal Type</label>
              <div className="grid grid-cols-4 gap-2">
                {MEAL_TYPES.map(t => {
                  const { emoji, label } = MEAL_LABELS[t];
                  return (
                    <button key={t} onClick={() => setMealType(t)} className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all text-xs font-medium ${mealType === t ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
                      <span className="text-lg">{emoji}</span>{label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={resetForm} className="flex-1 py-3.5 rounded-2xl border border-slate-700 text-slate-400 font-semibold">Redo</button>
              <button onClick={saveMeal} className="flex-1 py-3.5 rounded-2xl bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/40">Add to Log ✓</button>
            </div>
          </div>
        )}

        {/* Post-save */}
        {saved && (
          <div className="space-y-4 animate-slide-up">
            <div className="bg-emerald-900/30 border border-emerald-700/30 rounded-2xl p-4 text-center">
              <div className="text-3xl mb-1">✅</div>
              <p className="text-emerald-400 font-semibold">Meal logged!</p>
              <p className="text-slate-400 text-sm mt-1">{result.totalCalories} kcal added to {MEAL_LABELS[mealType].label}</p>
            </div>
            {(coachLoading || coach) && <CoachCard insight={coach?.insight} suggestions={coach?.suggestions} loading={coachLoading} />}
            <div className="flex gap-3">
              <button onClick={resetForm} className="flex-1 py-3.5 rounded-2xl border border-slate-700 text-slate-400 font-semibold">Log Another</button>
              <button onClick={onDone} className="flex-1 py-3.5 rounded-2xl bg-emerald-500 text-white font-bold">Done</button>
            </div>
          </div>
        )}
      </div>
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

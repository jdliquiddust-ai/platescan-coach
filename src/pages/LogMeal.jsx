import { useState, useRef } from 'react';
import { analyzePhoto, analyzeText, lookupBarcode, getCoachInsight } from '../utils/api';
import { addMealToToday, getProfile, getTodayLog, saveTodayLog, getFavorites, toggleFavorite, isFavorite } from '../utils/storage';
import { MEAL_LABELS, MEAL_TYPES } from '../utils/nutrition';
import { useUser } from '../context/UserContext';
import CoachCard from '../components/CoachCard';

const METHODS = [
  { id: 'photo',   label: 'Camera',   emoji: '📷' },
  { id: 'text',    label: 'Describe', emoji: '✏️' },
  { id: 'barcode', label: 'Barcode',  emoji: '▦' },
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
    setLoading(true); setError(''); setResult(null);
    try {
      let res;
      if (method === 'photo') {
        if (!photoData) { setError('Please take or select a photo first.'); setLoading(false); return; }
        res = await analyzePhoto(photoData.base64, photoData.mediaType);
      } else if (method === 'text') {
        if (!textInput.trim()) { setError('Please describe your meal.'); setLoading(false); return; }
        res = await analyzeText(textInput.trim());
      } else {
        if (!barcodeInput.trim()) { setError('Please enter a barcode number.'); setLoading(false); return; }
        res = await lookupBarcode(barcodeInput.trim());
      }
      setResult(res);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
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
      mealType, timestamp: Date.now(),
      items: result.items,
      totalCalories: result.totalCalories, totalProtein: result.totalProtein,
      totalCarbs: result.totalCarbs, totalFat: result.totalFat,
      photoThumbnail: photoPreview || null,
    };
    addMealToToday(username, meal);
    setSaved(true);
    const profile = getProfile(username);
    if (profile) {
      setCoachLoading(true);
      try {
        const todayLog = getTodayLog(username);
        const insight = await getCoachInsight(profile, todayLog.meals, profile.goals);
        setCoach(insight);
        const updatedLog = getTodayLog(username);
        const last = updatedLog.meals[updatedLog.meals.length - 1];
        if (last) { last.coachInsight = insight.insight; last.suggestions = insight.suggestions; saveTodayLog(username, updatedLog); }
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
    <div className="flex-1 overflow-y-auto scrollbar-hide bg-gray-50">
      {/* Header */}
      <div className="bg-white flex items-center gap-3 px-5 pt-14 pb-4 border-b border-gray-100">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">Log Meal</h1>
      </div>

      <div className="px-4 pb-10 pt-4 space-y-4">
        {/* Method tabs */}
        <div className="flex gap-2 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100">
          {METHODS.map(m => (
            <button key={m.id}
              onClick={() => { setMethod(m.id); setResult(null); setError(''); setPhotoPreview(null); setPhotoData(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${method === m.id ? 'bg-green-500 text-white shadow' : 'text-gray-400'}`}>
              <span>{m.emoji}</span>{m.label}
            </button>
          ))}
        </div>

        {/* Favorites strip */}
        {!result && !saved && favorites.length > 0 && (
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-2.5 px-1">Quick Add</p>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
              {favorites.map(fav => (
                <button key={fav.favId} onClick={() => useFavorite(fav)}
                  className="flex-shrink-0 bg-white border border-gray-100 rounded-2xl p-3 text-left w-36 active:scale-95 transition-transform shadow-sm">
                  <div className="text-rose-400 text-xs mb-1.5 font-semibold">♥ Saved</div>
                  <div className="text-gray-800 text-xs font-medium leading-tight line-clamp-2">{fav.items.map(i => i.name).join(', ')}</div>
                  <div className="text-orange-500 text-xs mt-2 font-bold">{fav.totalCalories} kcal</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Camera */}
        {method === 'photo' && !result && (
          <div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
            {!photoPreview ? (
              <button onClick={() => fileRef.current?.click()}
                className="w-full h-72 rounded-3xl bg-white border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-4 active:scale-[0.98] transition-transform shadow-sm">
                <div className="w-20 h-20 rounded-full bg-green-50 border-2 border-green-100 flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-gray-900 font-bold text-base">Take a photo</p>
                  <p className="text-gray-400 text-sm mt-0.5">Tap to open camera</p>
                </div>
              </button>
            ) : (
              <div className="relative rounded-3xl overflow-hidden shadow-sm">
                <img src={photoPreview} alt="Meal" className="w-full h-72 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <button onClick={() => { setPhotoPreview(null); setPhotoData(null); fileRef.current?.click(); }}
                  className="absolute bottom-4 right-4 bg-white/90 text-gray-800 text-xs px-4 py-2 rounded-full font-semibold shadow">
                  Retake
                </button>
              </div>
            )}
          </div>
        )}

        {/* Text */}
        {method === 'text' && !result && (
          <textarea value={textInput} onChange={e => setTextInput(e.target.value)}
            placeholder="e.g. Two scrambled eggs, whole wheat toast, and orange juice…"
            rows={5}
            className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-green-400 transition-colors resize-none shadow-sm" />
        )}

        {/* Barcode */}
        {method === 'barcode' && !result && (
          <div>
            <input type="number" value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)}
              placeholder="Enter barcode number…"
              className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 text-gray-900 text-base placeholder-gray-400 focus:outline-none focus:border-green-400 transition-colors shadow-sm" />
            <p className="text-gray-400 text-xs mt-2 px-1">Enter the barcode from the product packaging</p>
          </div>
        )}

        {/* Analyze button */}
        {!result && !saved && (
          <button onClick={analyze} disabled={loading}
            className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 8px 24px rgba(34,197,94,0.3)' }}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Analyzing…
              </span>
            ) : method === 'photo' ? '🔍 Analyze Photo' : method === 'text' ? '🔍 Parse Meal' : '🔍 Look Up Barcode'}
          </button>
        )}

        {error && <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-red-500 text-sm">{error}</div>}

        {/* Result */}
        {result && !saved && (
          <div className="space-y-4 animate-slide-up">
            <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
              {photoPreview && <img src={photoPreview} alt="" className="w-full h-48 object-cover" />}
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-900 font-bold">Detected Items</h3>
                  <button onClick={handleToggleFavResult}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border font-semibold transition-all active:scale-95"
                    style={resultIsFav ? { borderColor: '#fda4af', color: '#f43f5e', background: '#fff1f2' } : { borderColor: '#e5e7eb', color: '#9ca3af', background: 'white' }}>
                    <HeartIcon filled={resultIsFav} size={12} />
                    {resultIsFav ? 'Saved' : 'Save'}
                  </button>
                </div>
                <div className="space-y-2.5 mb-4">
                  {result.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-gray-700 text-sm">{item.name}</span>
                      <span className="text-orange-500 text-sm font-bold">{item.calories} kcal</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-900 font-bold">Total</span>
                    <span className="text-orange-500 font-bold text-xl">{result.totalCalories} kcal</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <MacroPill label="Protein" value={result.totalProtein} color="#ec4899" bg="#fdf2f8" />
                    <MacroPill label="Carbs"   value={result.totalCarbs}   color="#3b82f6" bg="#eff6ff" />
                    <MacroPill label="Fat"     value={result.totalFat}     color="#eab308" bg="#fefce8" />
                  </div>
                </div>
              </div>
            </div>

            {/* Meal type */}
            <div>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3 px-1">Meal Type</p>
              <div className="grid grid-cols-4 gap-2">
                {MEAL_TYPES.map(t => {
                  const { emoji, label } = MEAL_LABELS[t];
                  return (
                    <button key={t} onClick={() => setMealType(t)}
                      className={`flex flex-col items-center gap-1 py-3 rounded-2xl border-2 transition-all text-xs font-semibold ${mealType === t ? 'border-green-400 bg-green-50 text-green-600' : 'border-gray-100 bg-white text-gray-400'}`}>
                      <span className="text-lg">{emoji}</span>{label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={resetForm} className="flex-1 py-4 rounded-2xl border-2 border-gray-200 text-gray-500 font-semibold text-sm bg-white">Redo</button>
              <button onClick={saveMeal}
                className="flex-1 py-4 rounded-2xl font-bold text-sm text-white"
                style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 8px 24px rgba(34,197,94,0.3)' }}>
                Add to Log ✓
              </button>
            </div>
          </div>
        )}

        {/* Post-save */}
        {saved && (
          <div className="space-y-4 animate-slide-up">
            <div className="bg-green-50 border border-green-100 rounded-3xl p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <p className="text-gray-900 font-bold text-lg">Meal logged!</p>
              <p className="text-gray-500 text-sm mt-1">{result.totalCalories} kcal · {MEAL_LABELS[mealType].label}</p>
            </div>
            {(coachLoading || coach) && <CoachCard insight={coach?.insight} suggestions={coach?.suggestions} loading={coachLoading} />}
            <div className="flex gap-3">
              <button onClick={resetForm} className="flex-1 py-4 rounded-2xl border-2 border-gray-200 text-gray-500 font-semibold text-sm bg-white">Log Another</button>
              <button onClick={onDone}
                className="flex-1 py-4 rounded-2xl font-bold text-sm text-white"
                style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 8px 24px rgba(34,197,94,0.3)' }}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MacroPill({ label, value, color, bg }) {
  return (
    <div className="rounded-2xl py-2.5 text-center" style={{ background: bg }}>
      <div className="font-bold text-sm" style={{ color }}>{value}g</div>
      <div className="text-gray-500 text-xs mt-0.5">{label}</div>
    </div>
  );
}

function HeartIcon({ filled, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#f43f5e' : 'none'} stroke={filled ? '#f43f5e' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}

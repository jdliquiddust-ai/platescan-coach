import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
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
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1024;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPhotoPreview(dataUrl);
      setPhotoData({ base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' });
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
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
    <div className="flex-1 overflow-y-auto scrollbar-hide">
      {/* Header */}
      <div className="glass flex items-center gap-3 px-5 pt-14 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <motion.button whileTap={{ scale: 0.88 }} onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </motion.button>
        <h1 className="text-lg font-bold text-white">Log Meal</h1>
      </div>

      <div className="px-4 pb-10 pt-4 space-y-4">
        {/* Method tabs */}
        <div className="flex gap-2 glass rounded-2xl p-1.5 shadow-sm">
          {METHODS.map(m => (
            <motion.button key={m.id} whileTap={{ scale: 0.93 }}
              onClick={() => { setMethod(m.id); setResult(null); setError(''); setPhotoPreview(null); setPhotoData(null); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={method === m.id
                ? { background: 'linear-gradient(135deg,#9EFF00,#6abf00)', color: '#060d06' }
                : { color: 'rgba(255,255,255,0.4)' }}>
              <span>{m.emoji}</span>{m.label}
            </motion.button>
          ))}
        </div>

        {/* Favorites strip */}
        {!result && !saved && favorites.length > 0 && (
          <div>
            <p style={{ color: 'rgba(255,255,255,0.4)' }} className="text-xs font-semibold uppercase tracking-widest mb-2.5 px-1">Quick Add</p>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
              {favorites.map(fav => (
                <motion.button key={fav.favId} whileTap={{ scale: 0.93 }} onClick={() => useFavorite(fav)}
                  className="flex-shrink-0 glass rounded-2xl p-3 text-left w-36 shadow-sm">
                  <div className="text-rose-400 text-xs mb-1.5 font-semibold">♥ Saved</div>
                  <div className="text-white text-xs font-medium leading-tight line-clamp-2">{fav.items.map(i => i.name).join(', ')}</div>
                  <div className="text-orange-400 text-xs mt-2 font-bold">{fav.totalCalories} kcal</div>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Camera */}
        {method === 'photo' && !result && (
          <div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
            {!photoPreview ? (
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => fileRef.current?.click()}
                className="w-full h-72 rounded-3xl glass flex flex-col items-center justify-center gap-4 shadow-lg"
                style={{ border: '2px dashed rgba(158,255,0,0.35)' }}>
                <div className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(158,255,0,0.12)', border: '2px solid rgba(158,255,0,0.3)' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9EFF00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-base">Take a photo</p>
                  <p style={{ color: 'rgba(255,255,255,0.4)' }} className="text-sm mt-0.5">Tap to open camera</p>
                </div>
              </motion.button>
            ) : (
              <div className="relative rounded-3xl overflow-hidden shadow-xl" style={{ height: '288px' }}>
                <img src={photoPreview} alt="Meal" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                {/* Scan line */}
                {loading && (
                  <div className="absolute inset-0 overflow-hidden rounded-3xl">
                    <div className="scan-line absolute left-0 right-0 h-0.5 z-10"
                      style={{ background: 'linear-gradient(90deg,transparent,#9EFF00,transparent)', boxShadow: '0 0 12px 3px #9EFF00' }} />
                  </div>
                )}
                {/* Corner brackets */}
                <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor: '#9EFF00' }} />
                <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 rounded-tr-lg" style={{ borderColor: '#9EFF00' }} />
                <div className="absolute bottom-12 left-3 w-6 h-6 border-b-2 border-l-2 rounded-bl-lg" style={{ borderColor: '#9EFF00' }} />
                <div className="absolute bottom-12 right-3 w-6 h-6 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor: '#9EFF00' }} />
                <motion.button whileTap={{ scale: 0.92 }}
                  onClick={() => { setPhotoPreview(null); setPhotoData(null); fileRef.current?.click(); }}
                  className="absolute bottom-4 right-4 text-xs px-4 py-2 rounded-full font-semibold"
                  style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
                  Retake
                </motion.button>
              </div>
            )}
          </div>
        )}

        {/* Text */}
        {method === 'text' && !result && (
          <textarea value={textInput} onChange={e => setTextInput(e.target.value)}
            placeholder="e.g. Two scrambled eggs, whole wheat toast, and orange juice…"
            rows={5}
            className="w-full glass rounded-2xl px-4 py-4 text-white text-sm focus:outline-none resize-none shadow-sm"
            style={{ color: 'white', '::placeholder': { color: 'rgba(255,255,255,0.3)' } }} />
        )}

        {/* Barcode */}
        {method === 'barcode' && !result && (
          <div>
            <input type="number" value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)}
              placeholder="Enter barcode number…"
              className="w-full glass rounded-2xl px-4 py-4 text-white text-base focus:outline-none shadow-sm" />
            <p style={{ color: 'rgba(255,255,255,0.35)' }} className="text-xs mt-2 px-1">Enter the barcode from the product packaging</p>
          </div>
        )}

        {/* Analyze button */}
        {!result && !saved && (
          <motion.button whileTap={{ scale: 0.95 }} onClick={analyze} disabled={loading}
            className="w-full py-4 rounded-2xl font-bold text-base disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#9EFF00,#6abf00)', color: '#060d06', boxShadow: '0 8px 28px rgba(158,255,0,0.3)' }}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(6,13,6,0.3)', borderTopColor: '#060d06' }} />
                Architecting Nutritional Offset…
              </span>
            ) : method === 'photo' ? '⚡ Analyze Photo' : method === 'text' ? '⚡ Parse Meal' : '⚡ Look Up Barcode'}
          </motion.button>
        )}

        {error && <div className="rounded-2xl p-4 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>{error}</div>}

        {/* Result */}
        {result && !saved && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="space-y-4">
            <div className="glass-strong rounded-3xl overflow-hidden shadow-xl">
              {photoPreview && <img src={photoPreview} alt="" className="w-full h-48 object-cover" />}
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold">Detected Items</h3>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={handleToggleFavResult}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-semibold"
                    style={resultIsFav
                      ? { border: '1px solid rgba(244,63,94,0.4)', color: '#f43f5e', background: 'rgba(244,63,94,0.1)' }
                      : { border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.05)' }}>
                    <HeartIcon filled={resultIsFav} size={12} />
                    {resultIsFav ? 'Saved' : 'Save'}
                  </motion.button>
                </div>
                <div className="space-y-2.5 mb-4">
                  {result.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span style={{ color: 'rgba(255,255,255,0.8)' }} className="text-sm">{item.name}</span>
                      <span className="text-orange-400 text-sm font-bold">{item.calories} kcal</span>
                    </div>
                  ))}
                </div>
                <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white font-bold">Total</span>
                    <span className="text-orange-400 font-bold text-xl">{result.totalCalories} kcal</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <MacroPill label="Protein" value={result.totalProtein} color="#ec4899" bg="rgba(236,72,153,0.12)" />
                    <MacroPill label="Carbs"   value={result.totalCarbs}   color="#3b82f6" bg="rgba(59,130,246,0.12)" />
                    <MacroPill label="Fat"     value={result.totalFat}     color="#eab308" bg="rgba(234,179,8,0.12)" />
                  </div>
                </div>
              </div>
            </div>

            {/* Meal type */}
            <div>
              <p style={{ color: 'rgba(255,255,255,0.4)' }} className="text-xs font-semibold uppercase tracking-widest mb-3 px-1">Meal Type</p>
              <div className="grid grid-cols-4 gap-2">
                {MEAL_TYPES.map(t => {
                  const { emoji, label } = MEAL_LABELS[t];
                  const active = mealType === t;
                  return (
                    <motion.button key={t} whileTap={{ scale: 0.9 }} onClick={() => setMealType(t)}
                      className="flex flex-col items-center gap-1 py-3 rounded-2xl text-xs font-semibold transition-all glass"
                      style={active ? { border: '1px solid #9EFF00', color: '#9EFF00', background: 'rgba(158,255,0,0.1)' } : { color: 'rgba(255,255,255,0.4)' }}>
                      <span className="text-lg">{emoji}</span>{label}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <motion.button whileTap={{ scale: 0.95 }} onClick={resetForm}
                className="flex-1 py-4 rounded-2xl font-semibold text-sm glass"
                style={{ color: 'rgba(255,255,255,0.6)' }}>Redo</motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={saveMeal}
                className="flex-1 py-4 rounded-2xl font-bold text-sm"
                style={{ background: 'linear-gradient(135deg,#9EFF00,#6abf00)', color: '#060d06', boxShadow: '0 8px 24px rgba(158,255,0,0.3)' }}>
                Add to Log ✓
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Post-save */}
        {saved && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="space-y-4">
            <div className="glass-strong rounded-3xl p-6 text-center shadow-xl" style={{ border: '1px solid rgba(158,255,0,0.2)' }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: 'rgba(158,255,0,0.15)', border: '1px solid rgba(158,255,0,0.3)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9EFF00" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <p className="text-white font-bold text-lg">Meal logged!</p>
              <p style={{ color: 'rgba(255,255,255,0.5)' }} className="text-sm mt-1">{result.totalCalories} kcal · {MEAL_LABELS[mealType].label}</p>
            </div>
            {(coachLoading || coach) && <CoachCard insight={coach?.insight} healthAnalysis={coach?.healthAnalysis} recovery={coach?.recovery} suggestions={coach?.suggestions} loading={coachLoading} dark />}
            <div className="flex gap-3">
              <motion.button whileTap={{ scale: 0.95 }} onClick={resetForm}
                className="flex-1 py-4 rounded-2xl font-semibold text-sm glass"
                style={{ color: 'rgba(255,255,255,0.6)' }}>Log Another</motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={onDone}
                className="flex-1 py-4 rounded-2xl font-bold text-sm"
                style={{ background: 'linear-gradient(135deg,#9EFF00,#6abf00)', color: '#060d06', boxShadow: '0 8px 24px rgba(158,255,0,0.3)' }}>
                Done
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function MacroPill({ label, value, color, bg }) {
  return (
    <div className="rounded-2xl py-2.5 text-center" style={{ background: bg }}>
      <div className="font-bold text-sm" style={{ color }}>{value}g</div>
      <div style={{ color: 'rgba(255,255,255,0.5)' }} className="text-xs mt-0.5">{label}</div>
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

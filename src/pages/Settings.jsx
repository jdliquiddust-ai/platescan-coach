import { useState } from 'react';
import { getProfile, saveProfile, clearUserData, logoutUser } from '../utils/storage';
import { useUser } from '../context/UserContext';
import { calcGoals, kgToLbs, lbsToKg, cmToIn, inToCm } from '../utils/nutrition';

const GOAL_OPTIONS = [
  { id: 'lose',     emoji: '🔥', label: 'Lose Weight',  color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200' },
  { id: 'maintain', emoji: '⚖️', label: 'Maintain',      color: 'text-blue-500',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  { id: 'build',    emoji: '💪', label: 'Build Muscle', color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200' },
];

const ACTIVITY_OPTIONS = [
  { id: 'sedentary',   label: 'Sedentary',   desc: 'Little or no exercise' },
  { id: 'light',       label: 'Light',       desc: '1–3 days/week' },
  { id: 'moderate',    label: 'Moderate',    desc: '3–5 days/week' },
  { id: 'active',      label: 'Active',      desc: '6–7 days/week' },
  { id: 'very_active', label: 'Very Active', desc: 'Physical job + training' },
];

export default function Settings({ onLogout }) {
  const username = useUser();
  const [weightUnit, setWeightUnit] = useState('kg');
  const [heightUnit, setHeightUnit] = useState('cm');
  const [profile, setProfile] = useState(() => getProfile(username) || {});
  const [displayWeight, setDisplayWeight] = useState(() => { const p = getProfile(username) || {}; return p.weight ? String(p.weight) : ''; });
  const [displayHeight, setDisplayHeight] = useState(() => { const p = getProfile(username) || {}; return p.height ? String(p.height) : ''; });
  const [saved, setSaved] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const set = (k, v) => setProfile(prev => ({ ...prev, [k]: v }));

  const handleWeightUnit = (u) => {
    if (u === weightUnit) return;
    const v = parseFloat(displayWeight);
    if (!isNaN(v) && v > 0) setDisplayWeight(String(u === 'lbs' ? kgToLbs(v) : lbsToKg(v)));
    setWeightUnit(u);
  };
  const handleHeightUnit = (u) => {
    if (u === heightUnit) return;
    const v = parseFloat(displayHeight);
    if (!isNaN(v) && v > 0) setDisplayHeight(String(u === 'in' ? cmToIn(v) : inToCm(v)));
    setHeightUnit(u);
  };

  const save = () => {
    const weightKg = weightUnit === 'lbs' ? lbsToKg(Number(displayWeight)) : Number(displayWeight);
    const heightCm = heightUnit === 'in'  ? inToCm(Number(displayHeight))  : Number(displayHeight);
    const updated = { ...profile, age: Number(profile.age), weight: weightKg, height: heightCm };
    updated.goals = calcGoals(updated);
    saveProfile(username, updated);
    setProfile(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const goals = calcGoals({
    ...profile,
    age: Number(profile.age),
    weight: weightUnit === 'lbs' ? lbsToKg(Number(displayWeight)) : Number(displayWeight),
    height: heightUnit === 'in'  ? inToCm(Number(displayHeight))  : Number(displayHeight),
  });

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide bg-gray-50">
      {/* Header */}
      <div className="bg-white px-5 pt-14 pb-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-xl"
            style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
            {(profile.name || username || '?')[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{profile.name || 'My Profile'}</h1>
            <p className="text-gray-400 text-sm">@{username}</p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4 pt-4 pb-8">
        {/* Profile */}
        <Card title="Personal Info">
          <Field label="Name">
            <LInput value={profile.name || ''} onChange={v => set('name', v)} placeholder="Your name" />
          </Field>
          <Field label="Age">
            <LInput type="number" value={profile.age || ''} onChange={v => set('age', v)} placeholder="e.g. 28" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Weight`}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-gray-400 text-xs flex-1">Weight</span>
                <UnitToggle options={['kg','lbs']} value={weightUnit} onChange={handleWeightUnit} />
              </div>
              <LInput type="number" value={displayWeight} onChange={setDisplayWeight} placeholder={weightUnit === 'kg' ? '75' : '165'} />
            </Field>
            <Field label={`Height`}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-gray-400 text-xs flex-1">Height</span>
                <UnitToggle options={['cm','in']} value={heightUnit} onChange={handleHeightUnit} />
              </div>
              <LInput type="number" value={displayHeight} onChange={setDisplayHeight} placeholder={heightUnit === 'cm' ? '175' : '69'} />
            </Field>
          </div>
          <Field label="Sex">
            <div className="flex gap-2">
              {[{ id: 'male', label: '♂ Male' }, { id: 'female', label: '♀ Female' }].map(g => (
                <button key={g.id} onClick={() => set('gender', g.id)}
                  className={`flex-1 py-3 rounded-2xl border-2 text-sm font-semibold transition-all ${profile.gender === g.id ? 'border-green-400 bg-green-50 text-green-600' : 'border-gray-200 bg-white text-gray-400'}`}>
                  {g.label}
                </button>
              ))}
            </div>
          </Field>
        </Card>

        {/* Goal */}
        <Card title="Fitness Goal">
          <div className="grid grid-cols-3 gap-2">
            {GOAL_OPTIONS.map(g => (
              <button key={g.id} onClick={() => set('goal', g.id)}
                className={`flex flex-col items-center gap-1.5 py-4 rounded-2xl border-2 transition-all text-xs font-bold ${profile.goal === g.id ? `${g.border} ${g.bg} ${g.color}` : 'border-gray-100 bg-white text-gray-400'}`}>
                <span className="text-2xl">{g.emoji}</span>{g.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Activity */}
        <Card title="Activity Level">
          <div className="space-y-2">
            {ACTIVITY_OPTIONS.map(a => (
              <button key={a.id} onClick={() => set('activityLevel', a.id)}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all ${profile.activityLevel === a.id ? 'border-green-300 bg-green-50' : 'border-gray-100 bg-white'}`}>
                <div className="text-left">
                  <div className={`text-sm font-semibold ${profile.activityLevel === a.id ? 'text-green-700' : 'text-gray-700'}`}>{a.label}</div>
                  <div className="text-gray-400 text-xs mt-0.5">{a.desc}</div>
                </div>
                {profile.activityLevel === a.id && (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="2 6 5 9 10 3"/></svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </Card>

        {/* Daily Goals */}
        <Card title="Daily Targets">
          <div className="grid grid-cols-2 gap-3">
            <GoalTile label="Calories" value={goals.calories} unit="kcal" color="#f97316" bg="#fff7ed" />
            <GoalTile label="Protein"  value={goals.protein}  unit="g"    color="#ec4899" bg="#fdf2f8" />
            <GoalTile label="Carbs"    value={goals.carbs}    unit="g"    color="#3b82f6" bg="#eff6ff" />
            <GoalTile label="Fat"      value={goals.fat}      unit="g"    color="#f59e0b" bg="#fffbeb" />
          </div>
          <p className="text-gray-400 text-xs text-center">Auto-updates when you save</p>
        </Card>

        {/* Save */}
        <button onClick={save}
          className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-[0.98]"
          style={{ background: saved ? '#16a34a' : 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 8px 24px rgba(34,197,94,0.25)' }}>
          {saved ? '✓ Saved!' : 'Save Changes'}
        </button>

        {/* Sign Out */}
        <button onClick={() => { logoutUser(); onLogout(); }}
          className="w-full py-4 rounded-2xl border-2 border-gray-200 bg-white text-gray-600 font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign Out
        </button>

        {/* Danger Zone */}
        <div className="bg-white border border-red-100 rounded-2xl p-4">
          <h3 className="text-red-500 font-bold text-sm mb-2">Danger Zone</h3>
          {!showReset ? (
            <button onClick={() => setShowReset(true)} className="text-red-400 text-sm font-medium">Delete all my data</button>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-500 text-sm">Deletes all meals, history, and profile. Your account stays. Are you sure?</p>
              <div className="flex gap-3">
                <button onClick={() => setShowReset(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium">Cancel</button>
                <button onClick={() => { clearUserData(username); window.location.reload(); }} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold">Delete</button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-gray-300 text-xs">PlateScan Coach · All data stored locally</p>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 space-y-3">
      <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest">{title}</h3>
      {children}
    </div>
  );
}
function Field({ label, children }) {
  return <div><label className="block text-gray-500 text-xs font-medium mb-1.5 px-0.5">{label}</label>{children}</div>;
}
function LInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-green-400 transition-colors" />
  );
}
function GoalTile({ label, value, unit, color, bg }) {
  return (
    <div className="rounded-2xl p-3.5 text-center" style={{ background: bg }}>
      <div className="text-2xl font-bold" style={{ color }}>{isNaN(value) ? '—' : value}</div>
      <div className="text-gray-400 text-xs mt-0.5">{unit}</div>
      <div className="text-gray-500 text-xs font-medium mt-0.5">{label}</div>
    </div>
  );
}
function UnitToggle({ options, value, onChange }) {
  return (
    <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => onChange(opt)}
          className={`px-2 py-0.5 rounded-md text-xs font-bold transition-all ${value === opt ? 'bg-green-500 text-white shadow-sm' : 'text-gray-400'}`}>
          {opt}
        </button>
      ))}
    </div>
  );
}

import { useState } from 'react';
import { getProfile, saveProfile, clearUserData, logoutUser } from '../utils/storage';
import { useUser } from '../context/UserContext';
import { calcGoals, kgToLbs, lbsToKg, cmToIn, inToCm } from '../utils/nutrition';

const GOAL_OPTIONS = [
  { id: 'lose',     emoji: '🔥', label: 'Lose Weight' },
  { id: 'maintain', emoji: '⚖️', label: 'Maintain' },
  { id: 'build',    emoji: '💪', label: 'Build Muscle' },
];

const ACTIVITY_OPTIONS = [
  { id: 'sedentary',   label: 'Sedentary',   desc: 'Little/no exercise' },
  { id: 'light',       label: 'Light',       desc: '1-3x/week' },
  { id: 'moderate',    label: 'Moderate',    desc: '3-5x/week' },
  { id: 'active',      label: 'Active',      desc: '6-7x/week' },
  { id: 'very_active', label: 'Very Active', desc: 'Physical job' },
];

export default function Settings({ onLogout }) {
  const username = useUser();
  const [weightUnit, setWeightUnit] = useState('kg');
  const [heightUnit, setHeightUnit] = useState('cm');
  const [profile, setProfile] = useState(() => {
    const p = getProfile(username) || {};
    return p;
  });
  const [displayWeight, setDisplayWeight] = useState(() => {
    const p = getProfile(username) || {};
    return p.weight ? String(p.weight) : '';
  });
  const [displayHeight, setDisplayHeight] = useState(() => {
    const p = getProfile(username) || {};
    return p.height ? String(p.height) : '';
  });
  const [saved, setSaved] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const set = (k, v) => setProfile(prev => ({ ...prev, [k]: v }));

  const handleWeightUnit = (newUnit) => {
    if (newUnit === weightUnit) return;
    const val = parseFloat(displayWeight);
    if (!isNaN(val) && val > 0) {
      setDisplayWeight(String(newUnit === 'lbs' ? kgToLbs(val) : lbsToKg(val)));
    }
    setWeightUnit(newUnit);
  };

  const handleHeightUnit = (newUnit) => {
    if (newUnit === heightUnit) return;
    const val = parseFloat(displayHeight);
    if (!isNaN(val) && val > 0) {
      setDisplayHeight(String(newUnit === 'in' ? cmToIn(val) : inToCm(val)));
    }
    setHeightUnit(newUnit);
  };

  const save = () => {
    const weightKg = weightUnit === 'lbs' ? lbsToKg(Number(displayWeight)) : Number(displayWeight);
    const heightCm = heightUnit === 'in' ? inToCm(Number(displayHeight)) : Number(displayHeight);
    const updated = { ...profile, age: Number(profile.age), weight: weightKg, height: heightCm };
    updated.goals = calcGoals(updated);
    saveProfile(username, updated);
    setProfile(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleLogout = () => {
    logoutUser();
    onLogout();
  };

  const goals = calcGoals({
    ...profile,
    age: Number(profile.age),
    weight: weightUnit === 'lbs' ? lbsToKg(Number(displayWeight)) : Number(displayWeight),
    height: heightUnit === 'in' ? inToCm(Number(displayHeight)) : Number(displayHeight),
  });

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-white">Profile & Settings</h1>
        <p className="text-slate-400 text-sm mt-0.5">@{username}</p>
      </div>

      <div className="px-5 space-y-5 pb-8">
        {/* Profile */}
        <Section title="Profile">
          <Field label="Name">
            <Input value={profile.name || ''} onChange={v => set('name', v)} placeholder="Your name" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Age"><Input type="number" value={profile.age || ''} onChange={v => set('age', v)} placeholder="28" /></Field>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-400 text-xs">Weight</label>
                <UnitToggle options={['kg', 'lbs']} value={weightUnit} onChange={handleWeightUnit} />
              </div>
              <Input type="number" value={displayWeight} onChange={setDisplayWeight} placeholder={weightUnit === 'kg' ? '75' : '165'} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-400 text-xs">Height</label>
                <UnitToggle options={['cm', 'in']} value={heightUnit} onChange={handleHeightUnit} />
              </div>
              <Input type="number" value={displayHeight} onChange={setDisplayHeight} placeholder={heightUnit === 'cm' ? '175' : '69'} />
            </div>
          </div>
          <Field label="Biological Sex">
            <div className="flex gap-2">
              {[{ id: 'male', label: '♂ Male' }, { id: 'female', label: '♀ Female' }].map(g => (
                <button key={g.id} onClick={() => set('gender', g.id)} className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${profile.gender === g.id ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
                  {g.label}
                </button>
              ))}
            </div>
          </Field>
        </Section>

        {/* Goal */}
        <Section title="Goal">
          <div className="grid grid-cols-3 gap-2">
            {GOAL_OPTIONS.map(g => (
              <button key={g.id} onClick={() => set('goal', g.id)} className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all text-xs font-semibold ${profile.goal === g.id ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
                <span className="text-xl">{g.emoji}</span>{g.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Activity */}
        <Section title="Activity Level">
          <div className="space-y-2">
            {ACTIVITY_OPTIONS.map(a => (
              <button key={a.id} onClick={() => set('activityLevel', a.id)} className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${profile.activityLevel === a.id ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-800'}`}>
                <div className="text-left">
                  <div className={`text-sm font-medium ${profile.activityLevel === a.id ? 'text-emerald-400' : 'text-white'}`}>{a.label}</div>
                  <div className="text-slate-500 text-xs">{a.desc}</div>
                </div>
                {profile.activityLevel === a.id && <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs">✓</div>}
              </button>
            ))}
          </div>
        </Section>

        {/* Calculated Goals */}
        <Section title="Calculated Daily Goals">
          <div className="grid grid-cols-2 gap-3">
            <GoalCard label="Calories" value={goals.calories} unit="kcal" color="text-orange-400" />
            <GoalCard label="Protein"  value={goals.protein}  unit="g"    color="text-pink-400" />
            <GoalCard label="Carbs"    value={goals.carbs}    unit="g"    color="text-blue-400" />
            <GoalCard label="Fat"      value={goals.fat}      unit="g"    color="text-yellow-400" />
          </div>
          <p className="text-slate-600 text-xs text-center">Based on Mifflin-St Jeor formula. Auto-updates when you save.</p>
        </Section>

        {/* Save */}
        <button onClick={save} className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-base shadow-lg shadow-emerald-900/40 transition-all active:scale-95">
          {saved ? '✓ Saved!' : 'Save Changes'}
        </button>

        {/* Sign Out */}
        <button
          onClick={handleLogout}
          className="w-full py-4 rounded-2xl border-2 border-slate-700 text-slate-300 font-bold text-base flex items-center justify-center gap-2 hover:border-slate-600 transition-colors"
        >
          <SignOutIcon />
          Sign Out
        </button>

        {/* Danger zone */}
        <div className="border border-red-900/30 rounded-2xl p-4">
          <h3 className="text-red-400 font-semibold text-sm mb-2">Danger Zone</h3>
          {!showReset ? (
            <button onClick={() => setShowReset(true)} className="text-red-500 text-sm">Delete my data</button>
          ) : (
            <div className="space-y-3">
              <p className="text-slate-400 text-sm">This deletes all your meals, history, and profile — your account remains. Are you sure?</p>
              <div className="flex gap-3">
                <button onClick={() => setShowReset(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm">Cancel</button>
                <button onClick={() => { clearUserData(username); window.location.reload(); }} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold">Delete Data</button>
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-slate-700 text-xs pb-2">PlateScan Coach v1.0 · All data stored locally</div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
      <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-slate-400 text-xs mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
    />
  );
}

function GoalCard({ label, value, unit, color }) {
  return (
    <div className="bg-slate-900/60 rounded-xl p-3 text-center">
      <div className={`text-2xl font-bold ${color}`}>{isNaN(value) ? '—' : value}</div>
      <div className="text-slate-500 text-xs">{unit}</div>
      <div className="text-slate-400 text-xs mt-0.5">{label}</div>
    </div>
  );
}

function UnitToggle({ options, value, onChange }) {
  return (
    <div className="flex bg-slate-700 rounded-lg p-0.5 gap-0.5">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-2 py-0.5 rounded-md text-xs font-bold transition-all ${value === opt ? 'bg-emerald-500 text-white shadow' : 'text-slate-400 hover:text-slate-300'}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function SignOutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}

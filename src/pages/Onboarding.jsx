import { useState } from 'react';
import { saveProfile, setOnboarded } from '../utils/storage';
import { useUser } from '../context/UserContext';
import { calcGoals, kgToLbs, lbsToKg, cmToIn, inToCm } from '../utils/nutrition';

const STEPS = 5;

const GOALS = [
  { id: 'lose',     emoji: '🔥', label: 'Lose Weight',   desc: 'Caloric deficit' },
  { id: 'maintain', emoji: '⚖️', label: 'Maintain',       desc: 'Stay the same' },
  { id: 'build',    emoji: '💪', label: 'Build Muscle',   desc: 'Caloric surplus' },
];

const ACTIVITY_LEVELS = [
  { id: 'sedentary',   label: 'Sedentary',   desc: 'Little to no exercise' },
  { id: 'light',       label: 'Light',       desc: '1-3 days/week' },
  { id: 'moderate',    label: 'Moderate',    desc: '3-5 days/week' },
  { id: 'active',      label: 'Active',      desc: '6-7 days/week' },
  { id: 'very_active', label: 'Very Active', desc: 'Physical job + training' },
];

export default function Onboarding({ onComplete }) {
  const username = useUser();
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    name: '', age: '', gender: 'male',
    weight: '', height: '',
    goal: 'maintain', activityLevel: 'moderate',
  });
  const [weightUnit, setWeightUnit] = useState('kg');
  const [heightUnit, setHeightUnit] = useState('cm');

  const set = (k, v) => setData(prev => ({ ...prev, [k]: v }));

  const handleWeightUnit = (newUnit) => {
    if (newUnit === weightUnit) return;
    const val = parseFloat(data.weight);
    if (!isNaN(val) && val > 0) {
      set('weight', String(newUnit === 'lbs' ? kgToLbs(val) : lbsToKg(val)));
    }
    setWeightUnit(newUnit);
  };

  const handleHeightUnit = (newUnit) => {
    if (newUnit === heightUnit) return;
    const val = parseFloat(data.height);
    if (!isNaN(val) && val > 0) {
      set('height', String(newUnit === 'in' ? cmToIn(val) : inToCm(val)));
    }
    setHeightUnit(newUnit);
  };

  const next = () => {
    if (step < STEPS - 1) setStep(s => s + 1);
    else finish();
  };

  const finish = () => {
    const weightKg = weightUnit === 'lbs' ? lbsToKg(Number(data.weight)) : Number(data.weight);
    const heightCm = heightUnit === 'in'  ? inToCm(Number(data.height))  : Number(data.height);
    const profile = {
      ...data,
      age: Number(data.age),
      weight: weightKg,
      height: heightCm,
    };
    profile.goals = calcGoals(profile);
    saveProfile(username, profile);
    setOnboarded(username);
    onComplete();
  };

  const canNext = () => {
    if (step === 0) return data.name.trim() && data.age && Number(data.age) > 0;
    if (step === 1) return data.gender;
    if (step === 2) return data.weight && data.height;
    return true;
  };

  const weightPlaceholder = weightUnit === 'kg' ? 'e.g. 75' : 'e.g. 165';
  const heightPlaceholder = heightUnit === 'cm' ? 'e.g. 175' : 'e.g. 69';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🥗</div>
          <h1 className="text-2xl font-bold text-white">PlateScan Coach</h1>
          <p className="text-slate-400 text-sm mt-1">Your AI nutrition trainer</p>
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-2 mb-8">
          {Array.from({ length: STEPS }).map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i <= step ? 'w-6 bg-emerald-500' : 'w-1.5 bg-slate-700'}`} />
          ))}
        </div>

        <div className="animate-fade-in">
          {step === 0 && (
            <StepCard title="Let's get to know you" emoji="👋">
              <Input label="Your name" value={data.name} onChange={v => set('name', v)} placeholder="e.g. Alex" />
              <Input label="Age" type="number" value={data.age} onChange={v => set('age', v)} placeholder="e.g. 28" />
            </StepCard>
          )}

          {step === 1 && (
            <StepCard title="Biological sex" emoji="🧬" subtitle="Used for calorie calculations">
              <div className="grid grid-cols-2 gap-3">
                {[{ id: 'male', emoji: '♂️', label: 'Male' }, { id: 'female', emoji: '♀️', label: 'Female' }].map(g => (
                  <button
                    key={g.id}
                    onClick={() => set('gender', g.id)}
                    className={`p-5 rounded-2xl border-2 transition-all text-center ${data.gender === g.id ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-800'}`}
                  >
                    <div className="text-3xl mb-1">{g.emoji}</div>
                    <div className="text-white font-semibold">{g.label}</div>
                  </button>
                ))}
              </div>
            </StepCard>
          )}

          {step === 2 && (
            <StepCard title="Your measurements" emoji="📏">
              {/* Weight */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm text-slate-400">Weight</label>
                  <UnitToggle options={['kg', 'lbs']} value={weightUnit} onChange={handleWeightUnit} />
                </div>
                <input
                  type="number"
                  value={data.weight}
                  onChange={e => set('weight', e.target.value)}
                  placeholder={weightPlaceholder}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 text-white text-base placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              {/* Height */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm text-slate-400">Height</label>
                  <UnitToggle options={['cm', 'in']} value={heightUnit} onChange={handleHeightUnit} />
                </div>
                <input
                  type="number"
                  value={data.height}
                  onChange={e => set('height', e.target.value)}
                  placeholder={heightPlaceholder}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 text-white text-base placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </StepCard>
          )}

          {step === 3 && (
            <StepCard title="What's your goal?" emoji="🎯">
              <div className="space-y-3">
                {GOALS.map(g => (
                  <button
                    key={g.id}
                    onClick={() => set('goal', g.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${data.goal === g.id ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-800'}`}
                  >
                    <span className="text-2xl">{g.emoji}</span>
                    <div>
                      <div className="text-white font-semibold">{g.label}</div>
                      <div className="text-slate-400 text-sm">{g.desc}</div>
                    </div>
                    {data.goal === g.id && <div className="ml-auto w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs">✓</div>}
                  </button>
                ))}
              </div>
            </StepCard>
          )}

          {step === 4 && (
            <StepCard title="Activity level" emoji="🏃">
              <div className="space-y-2">
                {ACTIVITY_LEVELS.map(a => (
                  <button
                    key={a.id}
                    onClick={() => set('activityLevel', a.id)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all text-left ${data.activityLevel === a.id ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-800'}`}
                  >
                    <div>
                      <div className="text-white font-medium text-sm">{a.label}</div>
                      <div className="text-slate-500 text-xs">{a.desc}</div>
                    </div>
                    {data.activityLevel === a.id && <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs">✓</div>}
                  </button>
                ))}
              </div>
            </StepCard>
          )}
        </div>

        <button
          onClick={next}
          disabled={!canNext()}
          className="mt-6 w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-emerald-900/40"
        >
          {step < STEPS - 1 ? 'Continue' : "Let's go! 🚀"}
        </button>

        {step < STEPS - 1 && (
          <button onClick={next} className="mt-3 w-full text-slate-500 text-sm py-2">Skip</button>
        )}
      </div>
    </div>
  );
}

function StepCard({ title, emoji, subtitle, children }) {
  return (
    <div>
      <div className="mb-6">
        <div className="text-3xl mb-2">{emoji}</div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-sm text-slate-400 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 text-white text-base placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
      />
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
          className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${value === opt ? 'bg-emerald-500 text-white shadow' : 'text-slate-400 hover:text-slate-300'}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

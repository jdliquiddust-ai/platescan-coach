import { useState } from 'react';
import { createUser, loginUser } from '../utils/storage';

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const switchMode = (m) => { setMode(m); setError(''); };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) { setError('Please fill in all fields.'); return; }
    if (mode === 'signup' && password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const user = mode === 'signup' ? await createUser(username, password) : await loginUser(username, password);
      onAuth(user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-3xl mx-auto mb-5 flex items-center justify-center text-4xl shadow-lg"
            style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
            🥗
          </div>
          <h1 className="text-3xl font-bold text-gray-900">PlateScan</h1>
          <p className="text-gray-400 text-sm mt-1.5">AI nutrition tracker</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
          {[['login', 'Sign In'], ['signup', 'Sign Up']].map(([m, label]) => (
            <button key={m} onClick={() => switchMode(m)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Username">
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              placeholder="e.g. alex_fit" autoCapitalize="none" autoCorrect="off"
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-green-400 transition-colors" />
          </Field>

          <Field label="Password">
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-green-400 transition-colors pr-16" />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium">
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>
          </Field>

          {mode === 'signup' && (
            <Field label="Confirm Password">
              <input type={showPass ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat password"
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-green-400 transition-colors" />
            </Field>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-red-500 text-sm">{error}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-50 transition-all active:scale-[0.98] mt-2"
            style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 8px 24px rgba(34,197,94,0.3)' }}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                {mode === 'signup' ? 'Creating account…' : 'Signing in…'}
              </span>
            ) : mode === 'signup' ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <p className="text-gray-400 text-xs text-center mt-8">Data stored locally on your device.</p>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-gray-500 text-xs font-medium mb-1.5 px-1">{label}</label>
      {children}
    </div>
  );
}

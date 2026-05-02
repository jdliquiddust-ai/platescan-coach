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
      const user = mode === 'signup'
        ? await createUser(username, password)
        : await loginUser(username, password);
      onAuth(user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">🥗</div>
          <h1 className="text-3xl font-bold text-white">PlateScan Coach</h1>
          <p className="text-slate-400 text-sm mt-2">Your AI nutrition trainer</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800">
          {/* Tabs */}
          <div className="flex bg-slate-800 rounded-2xl p-1 mb-6">
            {[['login', 'Sign In'], ['signup', 'Create Account']].map(([m, label]) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === m ? 'bg-emerald-500 text-white shadow' : 'text-slate-400'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-slate-400 text-xs mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. alex_fit"
                autoCapitalize="none"
                autoCorrect="off"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-xs mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors pr-16"
                />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs px-1 py-0.5">
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-slate-400 text-xs mb-1.5">Confirm Password</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-900/20 border border-red-800/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-base disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-emerald-900/40 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === 'signup' ? 'Creating account…' : 'Signing in…'}
                </span>
              ) : mode === 'signup' ? 'Create Account 🚀' : 'Sign In →'}
            </button>
          </form>
        </div>

        <p className="text-slate-600 text-xs text-center mt-6">
          Your data is stored locally on this device only.
        </p>
      </div>
    </div>
  );
}

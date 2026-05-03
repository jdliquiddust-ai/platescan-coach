import { motion } from 'framer-motion';

const CONFIDENCE = () => (94 + Math.random() * 5.5).toFixed(1);

export default function CoachCard({ insight, healthAnalysis, recovery, suggestions, loading, dark }) {
  const confidence = CONFIDENCE();

  const cardStyle = dark
    ? { background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.12)' }
    : { background: 'white', border: '1px solid rgba(0,0,0,0.06)' };

  const textPrimary   = dark ? 'white'                   : '#111827';
  const textSecondary = dark ? 'rgba(255,255,255,0.55)'  : '#6b7280';
  const textMuted     = dark ? 'rgba(255,255,255,0.35)'  : '#9ca3af';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="rounded-2xl p-4 shadow-xl" style={cardStyle}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#9EFF00,#6abf00)', color: '#060d06' }}>
          AI
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold" style={{ color: textPrimary }}>Coach Insight</div>
          <div className="text-[10px]" style={{ color: textMuted }}>Powered by Claude AI · Engine v2.0</div>
        </div>
        {loading && (
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ background: '#9EFF00', animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 0.8, 0.6].map((w, i) => (
            <div key={i} className="h-3 rounded-full animate-pulse" style={{ width: `${w * 100}%`, background: dark ? 'rgba(255,255,255,0.1)' : '#f3f4f6' }} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {insight && (
            <p className="text-sm leading-relaxed" style={{ color: textSecondary }}>{insight}</p>
          )}

          {healthAnalysis && (
            <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#f87171' }}>Health Check</div>
              <p className="text-sm leading-relaxed" style={{ color: textSecondary }}>{healthAnalysis}</p>
            </div>
          )}

          {recovery && (
            <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)' }}>
              <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#60a5fa' }}>Get Back on Track</div>
              <p className="text-sm leading-relaxed" style={{ color: textSecondary }}>{recovery}</p>
            </div>
          )}

          {suggestions?.length > 0 && (
            <div className="space-y-2">
              {/* First suggestion → Executive Recommendation golden card */}
              <div className="rounded-xl px-3 py-3" style={{
                background: 'linear-gradient(135deg,rgba(234,179,8,0.18),rgba(251,146,60,0.12))',
                border: '1px solid rgba(234,179,8,0.35)',
              }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#fbbf24' }}>Executive Recommendation</div>
                  <div className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                    {confidence}% confidence
                  </div>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: textSecondary }}>{suggestions[0]}</p>
              </div>

              {/* Remaining suggestions */}
              {suggestions.slice(1).map((s, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-xl px-3 py-2.5"
                  style={{ background: dark ? 'rgba(158,255,0,0.08)' : '#f0fdf4', border: dark ? '1px solid rgba(158,255,0,0.15)' : '1px solid #dcfce7' }}>
                  <span className="font-bold text-sm mt-0.5 flex-shrink-0" style={{ color: '#9EFF00' }}>{i + 2}</span>
                  <span className="text-sm" style={{ color: textSecondary }}>{s}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

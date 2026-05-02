export default function CoachCard({ insight, suggestions, loading }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-emerald-900/60 to-slate-800 border border-emerald-700/30 p-4 animate-fade-in">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg shadow-emerald-900/50">
          PC
        </div>
        <div>
          <div className="text-sm font-semibold text-emerald-400">PlateScan Coach</div>
          <div className="text-[10px] text-slate-500">AI Nutrition Guide</div>
        </div>
        {loading && (
          <div className="ml-auto flex gap-1">
            {[0, 1, 2].map(i => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-3 bg-slate-700 rounded animate-pulse w-full" />
          <div className="h-3 bg-slate-700 rounded animate-pulse w-4/5" />
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-200 leading-relaxed mb-3">{insight}</p>
          {suggestions?.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Suggestions</div>
              {suggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-2 bg-slate-800/60 rounded-xl px-3 py-2">
                  <span className="text-emerald-400 font-bold text-sm mt-0.5">{i + 1}</span>
                  <span className="text-sm text-slate-300">{s}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

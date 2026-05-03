export default function CoachCard({ insight, suggestions, loading }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 animate-fade-in">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
          AI
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">Coach Insight</div>
          <div className="text-[10px] text-gray-400">Powered by Claude AI</div>
        </div>
        {loading && (
          <div className="ml-auto flex gap-1">
            {[0, 1, 2].map(i => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-green-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-3 bg-gray-100 rounded-full animate-pulse w-full" />
          <div className="h-3 bg-gray-100 rounded-full animate-pulse w-4/5" />
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-700 leading-relaxed mb-3">{insight}</p>
          {suggestions?.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Suggestions</div>
              {suggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-2.5 bg-green-50 rounded-xl px-3 py-2.5">
                  <span className="text-green-500 font-bold text-sm mt-0.5 flex-shrink-0">{i + 1}</span>
                  <span className="text-sm text-gray-700">{s}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

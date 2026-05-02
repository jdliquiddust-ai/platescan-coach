export default function CircularProgress({ value, goal, label, unit, color, size = 100 }) {
  const pct = Math.min(goal > 0 ? value / goal : 0, 1);
  const r = 38;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const remaining = Math.max(goal - value, 0);

  const trackColor = 'rgba(255,255,255,0.08)';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" style={{ display: 'block' }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={trackColor} strokeWidth="7" />
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
          <span className="text-lg font-bold text-white leading-none">{Math.round(value)}</span>
          <span className="text-[10px] text-slate-400 mt-0.5">{unit}</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-xs font-semibold" style={{ color }}>{label}</div>
        <div className="text-[10px] text-slate-500">{remaining} left</div>
      </div>
    </div>
  );
}

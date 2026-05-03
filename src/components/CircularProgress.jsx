export default function CircularProgress({ value, goal, label, unit, color, size = 100 }) {
  const pct = Math.min(goal > 0 ? value / goal : 0, 1);
  const r = 36;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" style={{ display: 'block' }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F3F4F6" strokeWidth="6" />
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-bold text-gray-900 leading-none">{Math.round(value)}</span>
          <span className="text-[9px] text-gray-400 mt-0.5">{unit}</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-xs font-semibold text-gray-700">{label}</div>
        <div className="text-[10px] text-gray-400">{Math.max(0, goal - value)} left</div>
      </div>
    </div>
  );
}

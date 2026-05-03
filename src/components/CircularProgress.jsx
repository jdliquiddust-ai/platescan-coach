export default function CircularProgress({ value, goal, label, unit, color, size = 100, dark }) {
  const pct = Math.min(goal > 0 ? value / goal : 0, 1);
  const r = 36;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  const trackColor  = dark ? 'rgba(255,255,255,0.08)' : '#F3F4F6';
  const labelColor  = dark ? 'rgba(255,255,255,0.7)'  : '#374151';
  const subColor    = dark ? 'rgba(255,255,255,0.35)' : '#9ca3af';
  const valueColor  = dark ? 'white'                  : '#111827';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" style={{ display: 'block' }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={trackColor} strokeWidth="6" />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="6"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-bold leading-none" style={{ color: valueColor }}>{Math.round(value)}</span>
          <span className="text-[9px] mt-0.5" style={{ color: subColor }}>{unit}</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-xs font-semibold" style={{ color: labelColor }}>{label}</div>
        <div className="text-[10px]" style={{ color: subColor }}>{Math.max(0, goal - value)} left</div>
      </div>
    </div>
  );
}

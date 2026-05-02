const tabs = [
  { id: 'dashboard', label: 'Home', icon: HomeIcon },
  { id: 'log',       label: 'Log',  icon: PlusIcon },
  { id: 'history',   label: 'History', icon: ClockIcon },
  { id: 'settings',  label: 'Profile', icon: UserIcon },
];

export default function Navigation({ current, onNavigate }) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-50">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = current === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                id === 'log'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/50 scale-110 -mt-3'
                  : active
                  ? 'text-emerald-400'
                  : 'text-slate-500'
              }`}
            >
              <Icon size={id === 'log' ? 22 : 20} />
              {id !== 'log' && <span className="text-[10px] font-medium">{label}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function HomeIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function PlusIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function ClockIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function UserIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}

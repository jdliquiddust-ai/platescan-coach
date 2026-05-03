const tabs = [
  { id: 'dashboard', label: 'Home',    icon: HomeIcon },
  { id: 'log',       label: 'Scan',    icon: ScanIcon },
  { id: 'history',   label: 'History', icon: ClockIcon },
  { id: 'settings',  label: 'Profile', icon: UserIcon },
];

export default function Navigation({ current, onNavigate }) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 z-50"
      style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center justify-around h-[68px] px-2">
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = current === id;
          const isLog = id === 'log';
          return (
            <button key={id} onClick={() => onNavigate(id)}
              className="flex flex-col items-center gap-1 transition-all active:scale-90 relative">
              {isLog ? (
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center -mt-7 shadow-lg"
                  style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 8px 24px rgba(34,197,94,0.35)' }}>
                  <Icon size={24} />
                </div>
              ) : (
                <>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${active ? 'bg-green-50' : ''}`}>
                    <Icon size={20} active={active} />
                  </div>
                  <span className={`text-[10px] font-medium ${active ? 'text-green-500' : 'text-gray-400'}`}>{label}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function HomeIcon({ size, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={active ? '#22c55e' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}
function ScanIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  );
}
function ClockIcon({ size, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={active ? '#22c55e' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}
function UserIcon({ size, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={active ? '#22c55e' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

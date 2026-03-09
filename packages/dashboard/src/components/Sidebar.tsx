import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '', label: 'Dashboard', icon: '⬡' },
  { to: 'recipes', label: 'Recipes', icon: '◈' },
  { to: 'executions', label: 'Executions', icon: '▸' },
  { to: 'webhooks', label: 'Webhooks', icon: '⚡' },
  { to: 'config', label: 'Config', icon: '⚙' },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-56 border-r border-zinc-800 bg-zinc-900 flex flex-col
          transform transition-transform duration-200 ease-in-out
          md:relative md:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <img src="/dashboard/logo.png" alt="HookLaw" className="w-10 h-10 rounded-lg" />
            <div>
              <h1 className="text-sm font-bold text-zinc-100">HookLaw</h1>
              <p className="text-[10px] text-zinc-500">v1.0.0</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === ''}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`
              }
            >
              <span className="text-xs">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <p className="text-[10px] text-zinc-600 text-center">
            Webhooks in. MCP tools out.
          </p>
        </div>
      </aside>
    </>
  );
}

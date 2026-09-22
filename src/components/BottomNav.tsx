import { House, Map, Search } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Home', icon: House },
  { to: '/map', label: 'Map', icon: Map },
  { to: '/search', label: 'Search', icon: Search },
]

export function BottomNav() {
  return (
    <nav className="flex h-16 shrink-0 items-center justify-around border-t border-neutral-700 bg-neutral-800/90 backdrop-blur">
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-xs font-medium ${
              isActive ? 'text-emerald-400' : 'text-neutral-400'
            }`
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

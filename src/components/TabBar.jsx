import { NavLink } from 'react-router-dom'
import { SunIcon, SproutIcon, CalendarIcon, MoonIcon, SlidersIcon } from './icons'

const tabs = [
  { to: '/', label: 'Today', Icon: SunIcon },
  { to: '/garden', label: 'Garden', Icon: SproutIcon },
  { to: '/week', label: 'This Week', Icon: CalendarIcon },
  { to: '/reflection', label: 'Reflection', Icon: MoonIcon },
  { to: '/settings', label: 'Settings', Icon: SlidersIcon },
]

export default function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      {tabs.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => (isActive ? 'tab active' : 'tab')}
        >
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

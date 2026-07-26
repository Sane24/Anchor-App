import { Link } from 'react-router-dom'
import { AnchorMark, SunIcon } from './icons'

export default function AppHeader() {
  return (
    <header className="header">
      <div className="header-logo">
        <span style={{ color: 'var(--green)', display: 'grid', placeItems: 'center' }}>
          <AnchorMark size={40} />
        </span>
        <div>
          <div className="header-name">Anchor</div>
          <div className="header-tagline">steady the day</div>
        </div>
      </div>
      <Link to="/settings" className="header-action" aria-label="Settings">
        <SunIcon size={22} />
      </Link>
    </header>
  )
}

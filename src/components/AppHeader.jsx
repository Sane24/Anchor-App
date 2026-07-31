import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AmbientSoundSheet from './AmbientSoundSheet'
import { useAmbientSound } from '../hooks/useAmbientSound'
import { AnchorMark, MoonIcon, SpeakerIcon, SunIcon } from './icons'
import { useDarkMode } from '../hooks/useThemeColor'

export default function AppHeader({ user }) {
  const { pathname } = useLocation()
  const [soundOpen, setSoundOpen] = useState(false)
  const [sound, setSound] = useState('None')
  const [dark, setDark] = useDarkMode()

  useAmbientSound(sound)

  // In Figma the sound button only appears on the Focus Sprint screen, and this
  // header renders on every tab — so it stays scoped to /timer. It also stays
  // put while a sound is playing, otherwise leaving /timer would strand audio
  // with no way to switch it off.
  const showSound = pathname === '/timer' || sound !== 'None'

  function chooseSound(option) {
    setSound(option)
    setSoundOpen(false)
  }

  return (
    <>
      <header className="header">
        {/* The logo doubles as a way home from anywhere, including the screens
            that aren't tabs (Briefing, Focus Sprint). */}
        <Link to="/" className="header-logo" aria-label="Go to Today">
          <span style={{ color: 'var(--green)', display: 'grid', placeItems: 'center' }}>
            <AnchorMark size={38} />
          </span>
          <div>
            <div className="header-name">Anchor</div>
            <div className="header-tagline">steady the day</div>
          </div>
        </Link>

        <div className="header-actions">
          {user && (
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink-soft)' }}>
              {user}
            </span>
          )}

          {showSound && (
            <button
              className="header-sound"
              type="button"
              aria-label="Ambient sound"
              aria-expanded={soundOpen}
              onClick={() => setSoundOpen(true)}
            >
              <SpeakerIcon size={17} />
            </button>
          )}
          {/* Shows the mode you're in: sun by day, moon at night. Settings
              still has its own tab, so nothing is lost by reusing this spot. */}
          <button
            className="header-action"
            type="button"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={dark}
            onClick={() => setDark(!dark)}
          >
            {dark ? <MoonIcon size={22} /> : <SunIcon size={22} />}
          </button>
        </div>
      </header>

      {showSound && soundOpen && (
        <AmbientSoundSheet
          selected={sound}
          onSelect={chooseSound}
          onClose={() => setSoundOpen(false)}
        />
      )}
    </>
  )
}

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AmbientSoundSheet from './AmbientSoundSheet'
import { useAmbientSound } from '../hooks/useAmbientSound'
import { AnchorMark, SpeakerIcon, SunIcon } from './icons'

export default function AppHeader() {
  const { pathname } = useLocation()
  const [soundOpen, setSoundOpen] = useState(false)
  const [sound, setSound] = useState('None')

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
        <div className="header-logo">
          <span style={{ color: 'var(--green)', display: 'grid', placeItems: 'center' }}>
            <AnchorMark size={38} />
          </span>
          <div>
            <div className="header-name">Anchor</div>
            <div className="header-tagline">steady the day</div>
          </div>
        </div>

        <div className="header-actions">
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
          <Link to="/settings" className="header-action" aria-label="Settings">
            <SunIcon size={22} />
          </Link>
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

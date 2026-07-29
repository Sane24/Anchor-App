import { useState, useEffect } from 'react'
import { useGoogleConnect, getStoredGoogleToken, clearGoogleToken } from '../data/googleAuth'
import { useThemeColor, colorThemes } from '../hooks/useThemeColor'

export default function Settings() {
  const [themeId, setThemeId] = useThemeColor()
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    setConnected(!!getStoredGoogleToken())
  }, [])

  const connectGoogle = useGoogleConnect(() => {
    setConnected(true)
  })

  const disconnectGoogle = () => {
    clearGoogleToken()
    setConnected(false)
  }

  return (
    <div className="screen">
      <h2 className="screen-title">Settings</h2>

      <div className="card">
        <h3 className="card-section-title">Appearance</h3>
        <p className="card-section-note">
          Pick an accent color for buttons, highlights, and the active tab.
        </p>
        <div className="theme-picker">
          {colorThemes.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className={themeId === theme.id ? 'theme-option active' : 'theme-option'}
              style={{ '--theme-color': theme.vars['--green'] }}
              aria-pressed={themeId === theme.id}
              onClick={() => setThemeId(theme.id)}
            >
              <span className="theme-option-emoji" aria-hidden="true">{theme.emoji}</span>
              <span>{theme.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <p className="eyebrow">Connections</p>
        <p>Calendar events + Gmail as tasks. The briefing only pulls from what's connected.</p>

        {connected ? (
          <div>
            <p style={{ color: 'var(--green)' }}>✓ Google connected</p>
            <button onClick={disconnectGoogle}>Disconnect Google</button>
          </div>
        ) : (
          <button onClick={() => connectGoogle()}>Connect Google</button>
        )}
      </div>
    </div>
  )
}
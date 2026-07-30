import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  useGoogleConnect,
  getStoredGoogleToken,
  clearGoogleToken,
  isGoogleConfigured,
} from '../data/googleAuth'
import { useThemeColor, colorThemes } from '../hooks/useThemeColor'
import NotificationSettings from '../components/NotificationSettings'
// Kept in its own component so useGoogleConnect only runs when a client ID
// exists. Hooks can't be called conditionally, but an unrendered component
// never calls them at all — and calling this one without an ID throws inside
// the Google SDK, which takes the whole app down.
function GoogleConnection() {
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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '12px',
        padding: '12px',
        borderRadius: '10px',
        background: 'var(--paper, #fff)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--sand, #f0ece2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
          }}
        >
          G
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: 600 }}>Google</p>
          <p style={{ margin: 0, fontSize: '0.85em', color: 'var(--ink-soft)' }}>
            {connected ? 'Connected' : 'Calendar and Gmail'}
          </p>
        </div>
      </div>

      {connected ? (
        <button
          onClick={disconnectGoogle}
          style={{
            borderRadius: '20px',
            padding: '8px 16px',
            background: 'transparent',
            border: '1px solid var(--ink-soft)',
            color: 'var(--ink-soft)',
          }}
        >
          Disconnect
        </button>
      ) : (
        <button
          onClick={() => connectGoogle()}
          style={{
            borderRadius: '20px',
            padding: '8px 16px',
            background: 'var(--green)',
            border: 'none',
            color: '#fff',
          }}
        >
          Connect
        </button>
      )}
    </div>
  )
}

export default function Settings({ user, onLogout }) {
  const [themeId, setThemeId] = useThemeColor()
  const [hovering, setHovering] = useState(false)

  return (
    <div className="screen">
      <h2 className="screen-title">Settings</h2>

      <div className="card">
        <p className="eyebrow">Account</p>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, fontWeight: 600 }}>{user}</p>
            <button
              type="button"
              onClick={onLogout}
              onMouseEnter={() => setHovering(true)}
              onMouseLeave={() => setHovering(false)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: hovering ? '#b06a5f' : '#e53e3e',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Sign Out
            </button>
          </div>
        ) : (
          <Link
            to="/auth"
            style={{
              color: 'var(--green)',
              fontWeight: 600,
              fontSize: '14px',
              textDecoration: 'underline',
            }}
          >
            Sign In
          </Link>
        )}
      </div>

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


      <NotificationSettings />
      
      <div className="card">
        <p className="eyebrow">Accounts Connected</p>
        <p>Pulls calendar events and unread email as tasks.</p>

        {isGoogleConfigured ? (
          <GoogleConnection />
        ) : (
          <p className="card-section-note">
            Google sign-in isn't set up on this machine. Copy <code>.env.example</code> to{' '}
            <code>.env</code>, then restart the dev server. Manual planning in the briefing
            works without it.
          </p>
        )}
      </div>
    </div>
  )
}
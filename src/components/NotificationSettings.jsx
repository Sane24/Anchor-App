import { useState } from 'react'
import {
  isSupported,
  getPermission,
  requestPermission,
  getSettings,
  saveSettings,
  sendTest,
} from '../notifications'

// notification settings card, rendered inside settings — Reed
// handles four situations: unsupported browser, permission not asked yet,
// permission denied, and granted (time pickers + test button).

export default function NotificationSettings() {
  const [permission, setPermission] = useState(getPermission())
  const [settings, setSettings] = useState(getSettings())
  const [testSent, setTestSent] = useState(false)

  const update = (patch) => setSettings(saveSettings(patch))

  const enable = async () => {
    const result = await requestPermission()
    setPermission(result)
    if (result === 'granted') update({ enabled: true })
  }

  const onTest = () => {
    sendTest()
    setTestSent(true)
    setTimeout(() => setTestSent(false), 3000)
  }

  /* ---- unsupported browser ---- */
  if (!isSupported()) {
    return (
      <div className="card">
        <p className="eyebrow">Reminders</p>
        <p className="card-section-note">
          This browser doesn't support notifications. On iPhone, add Anchor to
          your Home Screen (Share → Add to Home Screen) and open it from there,
          or use Chrome, Firefox, or Edge on a computer.
        </p>
      </div>
    )
  }

  /* ---- permission denied ---- */
  if (permission === 'denied') {
    return (
      <div className="card">
        <p className="eyebrow">Reminders</p>
        <p className="card-section-note">
          Notifications are blocked for this site. To turn them on, open your
          browser's site settings (the icon next to the address bar), allow
          Notifications, then reload this page.
        </p>
      </div>
    )
  }

  /* ---- not asked yet ---- */
  if (permission !== 'granted') {
  return (
    <div className="card">
      <p className="eyebrow">Reminders</p>
      <p className="card-section-note">
        Get a nudge for your morning briefing and night reflection.
      </p>
      <button
        type="button"
        className="btn-week-primary"
        onClick={enable}
        style={{ marginTop: '12px' }}
      >
        Enable notifications
      </button>
    </div>
  )
}

  /* ---- granted ---- */
  return (
    <div className="card">
      <p className="eyebrow">Reminders</p>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 0',
        }}
      >
        <span style={{ fontWeight: 600 }}>Daily reminders</span>
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
          style={{ width: 18, height: 18, accentColor: 'var(--green)' }}
        />
      </label>

      {settings.enabled && (
        <>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderTop: '1px solid var(--line)',
            }}
          >
            <span>Morning briefing</span>
            <input
              type="time"
              value={settings.morning}
              onChange={(e) => update({ morning: e.target.value })}
              style={{
                fontFamily: 'inherit',
                fontSize: 'inherit',
                border: '1px solid var(--line-strong)',
                borderRadius: 'var(--r-btn)',
                padding: '6px 8px',
                background: 'var(--card)',
                color: 'var(--ink)',
              }}
            />
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderTop: '1px solid var(--line)',
            }}
          >
            <span>Night reflection</span>
            <input
              type="time"
              value={settings.evening}
              onChange={(e) => update({ evening: e.target.value })}
              style={{
                fontFamily: 'inherit',
                fontSize: 'inherit',
                border: '1px solid var(--line-strong)',
                borderRadius: 'var(--r-btn)',
                padding: '6px 8px',
                background: 'var(--card)',
                color: 'var(--ink)',
              }}
            />
          </label>
        </>
      )}

      <p className="card-section-note" style={{ marginTop: 12 }}>
        You'll get a notification if Anchor is open at that time. If it isn't,
        the reminder is waiting inside the app next time you open it.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
        <button type="button" className="step-suggest-btn" onClick={onTest}>
          Send a test
        </button>
        {testSent && (
          <span className="card-section-note" role="status">
            Sent — check the corner of your screen.
          </span>
        )}
      </div>
    </div>
  )
}
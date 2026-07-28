import { useState, useEffect } from 'react'
import { useGoogleConnect, getStoredGoogleToken, clearGoogleToken } from '../data/googleAuth'

export default function Settings() {
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
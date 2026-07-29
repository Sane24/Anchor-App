// Local persistence. localStorage-backed until there's a real backend.

const SESSIONS_KEY = 'anchor_focus_sessions'

export function loadSessions() {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (err) {
    console.error('Could not read focus sessions:', err)
    return []
  }
}

export function saveSession(session) {
  const sessions = loadSessions()
  sessions.push(session)
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
  } catch (err) {
    console.error('Could not save focus session:', err)
  }
  return sessions
}

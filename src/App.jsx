import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import { pullAndMerge, clearSyncUser } from './data/sync'
import { subscribeToStore } from './store'
import { Routes, Route, useNavigate } from 'react-router-dom'
import AppHeader from './components/AppHeader'
import TabBar from './components/TabBar'
import TimerPopup from './components/TimerPopup'
import ReminderNudge from './components/ReminderNudge'
import { start as startReminders } from './notifications'
import { FocusSessionProvider } from './hooks/useFocusSession'
import Today from './screens/Today'
import Garden from './screens/Garden'
import ThisWeek from './screens/ThisWeek'
import Reflection from './screens/Reflection'
import Settings from './screens/Settings'
import Briefing from './screens/Briefing'
import Timer from './screens/Timer'
import Auth from './screens/Auth'

export default function App() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  // Bumped when a sync pull replaces local data, so the current screen
  // re-reads the store (it's the `key` on <Routes> below).
  const [dataVersion, setDataVersion] = useState(0)

  // Poll the clock for reminder times. Safe to call repeatedly; it no-ops
  // once the interval is running.
  useEffect(startReminders, [])

  useEffect(() => {
    // Check if someone's already signed in (e.g. they refreshed the page)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user.user_metadata?.full_name || session.user.email)
        pullAndMerge(session.user.id)
      }
    })

    // Keep `user` in sync any time auth state changes (sign in, sign out, etc.)
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      // A password-reset link opens the app at '/', where the auth sheet isn't
      // mounted — so send them to it with the new-password form showing.
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/auth', { state: { reset: true } })
      }

      if (session?.user) {
        setUser(session.user.user_metadata?.full_name || session.user.email)
        // Signing in pulls this account's data and merges it with what's on
        // this device. Signing out leaves local data alone — the app keeps
        // working anonymously.
        pullAndMerge(session.user.id)
      } else {
        setUser(null)
        clearSyncUser()
      }
    })

    const unsubscribeStore = subscribeToStore(() => setDataVersion((v) => v + 1))

    return () => {
      listener.subscription.unsubscribe()
      unsubscribeStore()
    }
  }, [])

  return (
    <FocusSessionProvider>
      <div className="app">
        <AppHeader user={user} />
        <Routes key={dataVersion}>
          <Route path="/" element={<Today />} />
          <Route path="/garden" element={<Garden />} />
          <Route path="/week" element={<ThisWeek />} />
          <Route path="/reflection" element={<Reflection />} />
          <Route path="/settings" element={<Settings user={user} onLogout={() => supabase.auth.signOut()} />} />
          <Route path="/briefing" element={<Briefing />} />
          <Route path="/timer" element={<Timer />} />
          <Route path="/auth" element={<Auth />} />
        </Routes>
        <ReminderNudge />
        <TimerPopup />
        <TabBar />
      </div>
    </FocusSessionProvider>
  )
}
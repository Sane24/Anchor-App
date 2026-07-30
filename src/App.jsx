import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient' 
import { Routes, Route } from 'react-router-dom'
import AppHeader from './components/AppHeader'
import TabBar from './components/TabBar'
import TimerPopup from './components/TimerPopup'
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
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Check if someone's already signed in (e.g. they refreshed the page)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user.user_metadata?.full_name || session.user.email)
      }
    })

    // Keep `user` in sync any time auth state changes (sign in, sign out, etc.)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user.user_metadata?.full_name || session.user.email)
      } else {
        setUser(null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <FocusSessionProvider>
      <div className="app">
        <AppHeader user={user} />
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/garden" element={<Garden />} />
          <Route path="/week" element={<ThisWeek />} />
          <Route path="/reflection" element={<Reflection />} />
          <Route path="/settings" element={<Settings user={user} onLogout={() => supabase.auth.signOut()} />} />
          <Route path="/briefing" element={<Briefing />} />
          <Route path="/timer" element={<Timer />} />
          <Route path="/auth" element={<Auth />} />
        </Routes>
        <TimerPopup />
        <TabBar />
      </div>
    </FocusSessionProvider>
  )
}
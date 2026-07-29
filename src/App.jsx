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

export default function App() {
  return (
    <FocusSessionProvider>
      <div className="app">
        <AppHeader />
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/garden" element={<Garden />} />
          <Route path="/week" element={<ThisWeek />} />
          <Route path="/reflection" element={<Reflection />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/briefing" element={<Briefing />} />
          <Route path="/timer" element={<Timer />} />
        </Routes>
        <TimerPopup />
        <TabBar />
      </div>
    </FocusSessionProvider>
  )
}

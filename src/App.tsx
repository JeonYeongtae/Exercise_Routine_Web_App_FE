import { BrowserRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import CalendarPage from './pages/CalendarPage'
import TodayPage from './pages/TodayPage'
import WorkoutPlayer from './pages/WorkoutPlayer'
import ProgressPage from './pages/ProgressPage'
import ProteinPage from './pages/ProteinPage'
import SettingsPage from './pages/SettingsPage'

function TabBar() {
  const { pathname } = useLocation()
  // 운동 진행 화면(풀스크린)에서는 탭바 숨김
  if (pathname.startsWith('/workout')) return null

  const tabs = [
    { to: '/', label: '오늘', ico: '🏠', end: true },
    { to: '/calendar', label: '캘린더', ico: '📅', end: false },
    { to: '/progress', label: '진행', ico: '📈', end: false },
    { to: '/protein', label: '단백질', ico: '🥤', end: false },
    { to: '/settings', label: '설정', ico: '⚙️', end: false },
  ]

  return (
    <nav className="tabbar">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="ico">{t.ico}</span>
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/protein" element={<ProteinPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/workout" element={<WorkoutPlayer />} />
        </Routes>
        <TabBar />
      </div>
    </BrowserRouter>
  )
}

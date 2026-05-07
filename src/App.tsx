import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { BookingProvider } from './context/BookingContext'
import { AuthProvider } from './context/AuthContext'
import AuthGuard from './components/AuthGuard'
import DashboardLayout from './pages/dashboard/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Setup from './pages/Setup'
import MyBookings from './pages/MyBookings'
import UserPage from './pages/UserPage'
import DashboardBookings from './pages/dashboard/Bookings'
import DashboardSlots from './pages/dashboard/Slots'
import DashboardEventTypes from './pages/dashboard/EventTypes'
import DashboardSettings from './pages/dashboard/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BookingProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/bookings" element={<Navigate to="/my-bookings" replace />} />

            <Route
              path="/dashboard"
              element={
                <AuthGuard>
                  <DashboardLayout />
                </AuthGuard>
              }
            >
              <Route index element={<DashboardBookings />} />
              <Route path="slots" element={<DashboardSlots />} />
              <Route path="event-types" element={<DashboardEventTypes />} />
              <Route path="settings" element={<DashboardSettings />} />
            </Route>

            <Route path="/:username" element={<UserPage />} />
          </Routes>
        </BookingProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { LoadingState } from './components/ui/States'
import AuthGuard from './components/AuthGuard'
import Home from './pages/Home'
import Login from './pages/Login'
import Setup from './pages/Setup'
import MyBookings from './pages/MyBookings'
import UserPage from './pages/UserPage'

// Code-split the dashboard so the public bundle stays small
const DashboardLayout    = lazy(() => import('./pages/dashboard/Layout'))
const DashboardBookings  = lazy(() => import('./pages/dashboard/Bookings'))
const DashboardSlots     = lazy(() => import('./pages/dashboard/Slots'))
const DashboardEventTypes= lazy(() => import('./pages/dashboard/EventTypes'))
const DashboardSettings  = lazy(() => import('./pages/dashboard/Settings'))

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppProvider>
          <Suspense fallback={<LoadingState fullscreen />}>
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
          </Suspense>
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

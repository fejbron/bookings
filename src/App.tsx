import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { LoadingState } from './components/ui/States'
import AuthGuard from './components/AuthGuard'
import AdminGuard from './components/AdminGuard'
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

// Code-split the admin area separately so it never ships to non-admins
const AdminLayout        = lazy(() => import('./pages/admin/Layout'))
const AdminOverview      = lazy(() => import('./pages/admin/Overview'))
const AdminUsers         = lazy(() => import('./pages/admin/Users'))
const AdminBookings      = lazy(() => import('./pages/admin/Bookings'))
const AdminSlots         = lazy(() => import('./pages/admin/Slots'))
const AdminTypes         = lazy(() => import('./pages/admin/EventTypes'))
const AdminTeams         = lazy(() => import('./pages/admin/Teams'))
const AdminSettings      = lazy(() => import('./pages/admin/Settings'))
const AdminAudit         = lazy(() => import('./pages/admin/Audit'))

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

              <Route
                path="/admin"
                element={
                  <AdminGuard>
                    <AdminLayout />
                  </AdminGuard>
                }
              >
                <Route index element={<AdminOverview />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="bookings" element={<AdminBookings />} />
                <Route path="slots" element={<AdminSlots />} />
                <Route path="event-types" element={<AdminTypes />} />
                <Route path="teams" element={<AdminTeams />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="audit" element={<AdminAudit />} />
              </Route>

              <Route path="/:username" element={<UserPage />} />
            </Routes>
          </Suspense>
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

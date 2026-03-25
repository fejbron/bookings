import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { BookingProvider } from './context/BookingContext'
import { AuthProvider } from './context/AuthContext'
import AdminGuard from './components/AdminGuard'
import Sidebar from './components/Navbar'
import Home from './pages/Home'
import Book from './pages/Book'
import MyBookings from './pages/MyBookings'
import AdminLogin from './pages/admin/Login'
import Dashboard from './pages/admin/Dashboard'
import ManageSlots from './pages/admin/ManageSlots'
import Settings from './pages/admin/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BookingProvider>
          <div className="app-layout">
            <Sidebar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/book" element={<Book />} />
                <Route path="/my-bookings" element={<MyBookings />} />
                <Route path="/bookings" element={<Navigate to="/my-bookings" replace />} />

                <Route path="/admin" element={<AdminLogin />} />
                <Route
                  path="/admin/dashboard"
                  element={
                    <AdminGuard>
                      <Dashboard />
                    </AdminGuard>
                  }
                />
                <Route
                  path="/admin/slots"
                  element={
                    <AdminGuard>
                      <ManageSlots />
                    </AdminGuard>
                  }
                />
                <Route
                  path="/admin/settings"
                  element={
                    <AdminGuard>
                      <Settings />
                    </AdminGuard>
                  }
                />
              </Routes>
            </main>
          </div>
        </BookingProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

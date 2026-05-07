import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading, needsSetup } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (needsSetup) return <Navigate to="/setup" replace />

  return <>{children}</>
}

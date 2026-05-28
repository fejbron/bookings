import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks'
import { LoadingState } from './ui/States'

export default function AdminGuard({ children }: { children: ReactNode }) {
  const { user, loading, isPlatformAdmin } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingState fullscreen />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (!isPlatformAdmin) return <Navigate to="/dashboard" replace />

  return <>{children}</>
}

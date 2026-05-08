import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks'
import { LoadingState } from './ui/States'

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading, needsSetup } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingState fullscreen />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (needsSetup) return <Navigate to="/setup" replace />

  return <>{children}</>
}

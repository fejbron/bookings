import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { ReactNode } from 'react'

export default function AdminGuard({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useAuth()

  if (loading) return null

  if (!isAdmin) {
    return <Navigate to="/admin" replace />
  }

  return <>{children}</>
}

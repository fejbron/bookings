import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { ReactNode } from 'react'

export default function LecturerGuard({ children }: { children: ReactNode }) {
  const { isLecturer, loading } = useAuth()
  if (loading) return null
  if (!isLecturer) return <Navigate to="/admin" replace />
  return <>{children}</>
}

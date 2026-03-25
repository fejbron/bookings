import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  isAdmin: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<string | null>
  logout: () => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? error.message : null
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<string | null> => {
    // Re-authenticate first to verify current password
    if (!user?.email) return 'Not authenticated'
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })
    if (signInError) return 'Current password is incorrect.'
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return error ? error.message : null
  }, [user])

  return (
    <AuthContext.Provider value={{ user, isAdmin: !!user, loading, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

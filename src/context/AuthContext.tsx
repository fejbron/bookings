import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { LecturerProfile } from '../types'

function toLecturer(r: { id: string; name: string; email: string; class_group: string | null; created_at: string }): LecturerProfile {
  return { id: r.id, name: r.name, email: r.email, classGroup: r.class_group ?? undefined, createdAt: r.created_at }
}

interface AuthContextType {
  user: User | null
  isAdmin: boolean
  isLecturer: boolean
  currentLecturer: LecturerProfile | null
  lecturers: LecturerProfile[]
  loading: boolean
  login: (email: string, password: string) => Promise<string | null>
  logout: () => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<string | null>
  createLecturerAccount: (name: string, email: string, password: string, classGroup: string) => Promise<void>
  deleteLecturerAccount: (id: string) => Promise<void>
  loadLecturers: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLecturer, setIsLecturer] = useState(false)
  const [currentLecturer, setCurrentLecturer] = useState<LecturerProfile | null>(null)
  const [lecturers, setLecturers] = useState<LecturerProfile[]>([])
  const [loading, setLoading] = useState(true)

  const resolveRole = useCallback(async (authUser: User | null) => {
    if (!authUser) {
      setUser(null)
      setIsLecturer(false)
      setCurrentLecturer(null)
      return
    }
    const { data } = await supabase
      .from('lecturer_profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle()
    setUser(authUser)
    if (data) {
      setIsLecturer(true)
      setCurrentLecturer(toLecturer(data))
    } else {
      setIsLecturer(false)
      setCurrentLecturer(null)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      await resolveRole(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveRole(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [resolveRole])

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? error.message : null
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<string | null> => {
    if (!user?.email) return 'Not authenticated'
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })
    if (signInError) return 'Current password is incorrect.'
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return error ? error.message : null
  }, [user])

  const loadLecturers = useCallback(async () => {
    const { data } = await supabase
      .from('lecturer_profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setLecturers(data.map(toLecturer))
  }, [])

  const createLecturerAccount = useCallback(async (name: string, email: string, password: string, classGroup: string) => {
    // Save admin session before signUp potentially overwrites it
    const { data: { session: adminSession } } = await supabase.auth.getSession()
    if (!adminSession) throw new Error('Not authenticated')

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw new Error(error.message)

    const lecturerId = data.user?.id
    if (!lecturerId) throw new Error('Failed to create user account. Check that email confirmation is disabled in your Supabase project (Auth → Settings → Email confirmation).')

    // Restore admin session in case signUp changed it
    await supabase.auth.setSession({
      access_token: adminSession.access_token,
      refresh_token: adminSession.refresh_token,
    })

    const { error: profileError } = await supabase.from('lecturer_profiles').insert({
      id: lecturerId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      class_group: classGroup.trim() || null,
    })
    if (profileError) throw new Error(profileError.message)

    setLecturers(prev => [{
      id: lecturerId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      classGroup: classGroup.trim() || undefined,
      createdAt: new Date().toISOString(),
    }, ...prev])
  }, [])

  const deleteLecturerAccount = useCallback(async (id: string) => {
    const { error } = await supabase.from('lecturer_profiles').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setLecturers(prev => prev.filter(l => l.id !== id))
  }, [])

  const isAdmin = !!user && !isLecturer

  return (
    <AuthContext.Provider value={{
      user, isAdmin, isLecturer, currentLecturer, lecturers, loading,
      login, logout, changePassword,
      createLecturerAccount, deleteLecturerAccount, loadLecturers,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

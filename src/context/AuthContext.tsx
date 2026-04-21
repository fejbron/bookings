import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { LecturerProfile } from '../types'

// ── helpers ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toLecturer(r: any): LecturerProfile {
  return { id: r.id, name: r.name, email: r.email, classGroup: r.class_group ?? undefined, createdAt: r.created_at }
}

async function hashPassword(password: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

const LECTURER_SESSION_KEY = 'bookslot_lecturer_session'

// ── context types ────────────────────────────────────────────────────────────

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

// ── provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [lecturers, setLecturers] = useState<LecturerProfile[]>([])

  // Lecturer session lives in localStorage — no Supabase Auth needed for lecturers
  const [lecturerUser, setLecturerUser] = useState<LecturerProfile | null>(() => {
    try {
      const stored = localStorage.getItem(LECTURER_SESSION_KEY)
      return stored ? (JSON.parse(stored) as LecturerProfile) : null
    } catch { return null }
  })

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

  // ── login: check lecturer table first, then Supabase Auth for admin ────────

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    const normalised = email.toLowerCase().trim()

    // Check lecturer_profiles first
    const { data: lecturerRow, error: lecturerErr } = await supabase
      .from('lecturer_profiles')
      .select('id, name, email, password, class_group, created_at')
      .eq('email', normalised)
      .maybeSingle()

    if (lecturerRow) {
      const hash = await hashPassword(password)
      if (lecturerRow.password !== hash) return 'Invalid email or password.'
      // Clear any lingering admin session before setting lecturer session
      await supabase.auth.signOut()
      setUser(null)
      const profile = toLecturer(lecturerRow)
      setLecturerUser(profile)
      localStorage.setItem(LECTURER_SESSION_KEY, JSON.stringify(profile))
      return null
    }

    // lecturerRow is null — either not a lecturer or query failed (RLS)
    // Either way, fall through to admin (Supabase Auth)
    if (lecturerErr) console.warn('lecturer_profiles query error:', lecturerErr.message)

    // Fall through to admin (Supabase Auth) — clear any stale lecturer session first
    localStorage.removeItem(LECTURER_SESSION_KEY)
    setLecturerUser(null)
    const { error } = await supabase.auth.signInWithPassword({ email: normalised, password })
    return error ? 'Invalid email or password.' : null
  }, [])

  // ── logout ────────────────────────────────────────────────────────────────

  const logout = useCallback(async () => {
    // Always clear both sessions on logout
    setLecturerUser(null)
    localStorage.removeItem(LECTURER_SESSION_KEY)
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  // ── admin: change password ────────────────────────────────────────────────

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<string | null> => {
    if (!user?.email) return 'Not authenticated'
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })
    if (signInError) return 'Current password is incorrect.'
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return error ? error.message : null
  }, [user])

  // ── lecturer management (admin only) ─────────────────────────────────────

  const loadLecturers = useCallback(async () => {
    const { data, error } = await supabase
      .from('lecturer_profiles')
      .select('id, name, email, class_group, created_at')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    setLecturers((data ?? []).map(toLecturer))
  }, [])

  const createLecturerAccount = useCallback(async (name: string, email: string, password: string, classGroup: string) => {
    const hash = await hashPassword(password)
    const { data: inserted, error } = await supabase.from('lecturer_profiles').insert({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hash,
      class_group: classGroup.trim() || null,
    }).select('id, name, email, class_group, created_at').single()
    if (error) throw new Error(error.message)

    // Optimistically add the new lecturer, then try to sync from DB
    if (inserted) {
      setLecturers(prev => [toLecturer(inserted), ...prev])
    }
    // Also attempt a full reload (may be a no-op if RLS blocks SELECT)
    loadLecturers().catch(() => {/* silently ignore if reload fails */})
  }, [loadLecturers])

  const deleteLecturerAccount = useCallback(async (id: string) => {
    const { error } = await supabase.from('lecturer_profiles').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setLecturers(prev => prev.filter(l => l.id !== id))
  }, [])

  const isLecturer = !!lecturerUser
  const isAdmin = !!user && !isLecturer
  const currentLecturer = lecturerUser

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

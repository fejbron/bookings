import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { LecturerProfile } from '../types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toProfile(r: any): LecturerProfile {
  return {
    id: r.id,
    userId: r.user_id ?? undefined,
    username: r.username ?? undefined,
    name: r.name,
    email: r.email,
    title: r.title ?? undefined,
    classGroup: r.class_group ?? undefined,
    description: r.description ?? undefined,
    isPublic: r.is_public ?? true,
    createdAt: r.created_at,
  }
}

interface AuthContextType {
  user: User | null
  profile: LecturerProfile | null
  loading: boolean
  needsSetup: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  createProfile: (data: { name: string; username: string; title?: string; description?: string }) => Promise<void>
  updateProfile: (updates: Partial<Pick<LecturerProfile, 'name' | 'username' | 'title' | 'description' | 'classGroup' | 'isPublic'>>) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<string | null>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<LecturerProfile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('lecturer_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    setProfile(data ? toProfile(data) : null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        loadProfile(u.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) loadProfile(u.id)
      else { setProfile(null) }
    })
    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    return error ? error.message : null
  }, [])

  const signUp = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    })
    return error ? error.message : null
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }, [])

  const createProfile = useCallback(async (data: {
    name: string; username: string; title?: string; description?: string
  }) => {
    if (!user) throw new Error('Not authenticated')

    // Check username is available
    const { data: existing } = await supabase
      .from('lecturer_profiles')
      .select('id')
      .eq('username', data.username.trim().toLowerCase())
      .maybeSingle()
    if (existing) throw new Error('That username is already taken.')

    const { data: inserted, error } = await supabase
      .from('lecturer_profiles')
      .insert({
        user_id: user.id,
        email: user.email!,
        name: data.name.trim(),
        username: data.username.trim().toLowerCase(),
        title: data.title?.trim() || null,
        description: data.description?.trim() || null,
        is_public: true,
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    setProfile(toProfile(inserted))
  }, [user])

  const updateProfile = useCallback(async (
    updates: Partial<Pick<LecturerProfile, 'name' | 'username' | 'title' | 'description' | 'classGroup' | 'isPublic'>>
  ) => {
    if (!user) throw new Error('Not authenticated')

    // If changing username, check availability
    if (updates.username && updates.username !== profile?.username) {
      const { data: existing } = await supabase
        .from('lecturer_profiles')
        .select('id')
        .eq('username', updates.username.trim().toLowerCase())
        .maybeSingle()
      if (existing) throw new Error('That username is already taken.')
    }

    const patch: Record<string, unknown> = {}
    if (updates.name !== undefined) patch.name = updates.name.trim()
    if (updates.username !== undefined) patch.username = updates.username.trim().toLowerCase()
    if (updates.title !== undefined) patch.title = updates.title.trim() || null
    if (updates.description !== undefined) patch.description = updates.description.trim() || null
    if (updates.classGroup !== undefined) patch.class_group = updates.classGroup.trim() || null
    if (updates.isPublic !== undefined) patch.is_public = updates.isPublic

    const { data, error } = await supabase
      .from('lecturer_profiles')
      .update(patch)
      .eq('user_id', user.id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    setProfile(toProfile(data))
  }, [user, profile])

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<string | null> => {
    if (!user?.email) return 'Not authenticated'
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })
    if (signInErr) return 'Current password is incorrect.'
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return error ? error.message : null
  }, [user])

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const needsSetup = !!user && !loading && !profile

  return (
    <AuthContext.Provider value={{
      user, profile, loading, needsSetup,
      signIn, signUp, signOut, createProfile, updateProfile, changePassword, refreshProfile,
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

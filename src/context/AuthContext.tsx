import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { LecturerProfile, TeamMember, ManagedAccount } from '../types'

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toTeamMember(r: any): TeamMember {
  return {
    id: r.id,
    hostUserId: r.host_user_id,
    memberEmail: r.member_email,
    memberUserId: r.member_user_id ?? undefined,
    role: r.role,
    status: r.status,
    createdAt: r.created_at,
  }
}

interface AuthContextType {
  user: User | null
  profile: LecturerProfile | null        // own profile
  activeProfile: LecturerProfile | null  // profile of the account being managed
  activeUserId: string | null            // user_id of account being managed
  isManagingOther: boolean               // true when managing someone else's account
  loading: boolean
  needsSetup: boolean

  teamMembers: TeamMember[]              // people who can manage MY account
  managedAccounts: ManagedAccount[]      // accounts I can manage

  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  switchAccount: (userId: string) => void

  createProfile: (data: { name: string; username: string; title?: string; description?: string }) => Promise<void>
  updateProfile: (updates: Partial<Pick<LecturerProfile, 'name' | 'username' | 'title' | 'description' | 'classGroup' | 'isPublic'>>) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<string | null>
  refreshProfile: () => Promise<void>

  inviteTeamMember: (email: string) => Promise<string | null>
  removeTeamMember: (id: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<LecturerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeUserId, setActiveUserId] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [managedAccounts, setManagedAccounts] = useState<ManagedAccount[]>([])

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('lecturer_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    setProfile(data ? toProfile(data) : null)
    return data ? toProfile(data) : null
  }

  async function loadTeam(userId: string) {
    const { data } = await supabase
      .from('team_members')
      .select('*')
      .eq('host_user_id', userId)
    setTeamMembers((data ?? []).map(toTeamMember))
  }

  async function loadManagedAccounts(userEmail: string, userId: string) {
    const { data: memberships } = await supabase
      .from('team_members')
      .select('*')
      .eq('member_email', userEmail)
      .eq('status', 'active')

    if (!memberships || memberships.length === 0) {
      setManagedAccounts([])
      return
    }

    // Link member_user_id if not set yet
    const unlinked = memberships.filter(m => !m.member_user_id)
    if (unlinked.length > 0) {
      await supabase
        .from('team_members')
        .update({ member_user_id: userId })
        .in('id', unlinked.map(m => m.id))
    }

    const hostIds = memberships.map(m => m.host_user_id)
    const { data: profiles } = await supabase
      .from('lecturer_profiles')
      .select('*')
      .in('user_id', hostIds)

    const accounts: ManagedAccount[] = memberships
      .map(m => {
        const p = profiles?.find(pr => pr.user_id === m.host_user_id)
        return p ? { hostUserId: m.host_user_id, profile: toProfile(p), role: m.role } : null
      })
      .filter(Boolean) as ManagedAccount[]

    setManagedAccounts(accounts)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        await Promise.allSettled([
          loadProfile(u.id),
          loadTeam(u.id),
          loadManagedAccounts(u.email!, u.id),
        ])
        setActiveUserId(u.id)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        await Promise.allSettled([
          loadProfile(u.id),
          loadTeam(u.id),
          loadManagedAccounts(u.email!, u.id),
        ])
        setActiveUserId(prev => prev ?? u.id)
      } else {
        setProfile(null)
        setTeamMembers([])
        setManagedAccounts([])
        setActiveUserId(null)
      }
    })
    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const switchAccount = useCallback((userId: string) => {
    setActiveUserId(userId)
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
    setTeamMembers([])
    setManagedAccounts([])
    setActiveUserId(null)
  }, [])

  const createProfile = useCallback(async (data: {
    name: string; username: string; title?: string; description?: string
  }) => {
    if (!user) throw new Error('Not authenticated')

    const { data: existing } = await supabase
      .from('lecturer_profiles')
      .select('id')
      .eq('username', data.username.trim().toLowerCase())
      .maybeSingle()
    if (existing) throw new Error('That username is already taken.')

    const { data: inserted, error } = await supabase
      .from('lecturer_profiles')
      .upsert({
        user_id: user.id,
        email: user.email!,
        name: data.name.trim(),
        username: data.username.trim().toLowerCase(),
        title: data.title?.trim() || null,
        description: data.description?.trim() || null,
        is_public: true,
      }, { onConflict: 'email' })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    setProfile(toProfile(inserted))
    setActiveUserId(user.id)
  }, [user])

  const updateProfile = useCallback(async (
    updates: Partial<Pick<LecturerProfile, 'name' | 'username' | 'title' | 'description' | 'classGroup' | 'isPublic'>>
  ) => {
    if (!user) throw new Error('Not authenticated')

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

  const inviteTeamMember = useCallback(async (email: string): Promise<string | null> => {
    if (!user) return 'Not authenticated'
    const normalizedEmail = email.trim().toLowerCase()
    if (normalizedEmail === user.email) return 'You cannot add yourself.'
    if (teamMembers.some(m => m.memberEmail === normalizedEmail)) return 'Already in your team.'

    const { data, error } = await supabase
      .from('team_members')
      .insert({ host_user_id: user.id, member_email: normalizedEmail })
      .select()
      .single()
    if (error) return error.message
    setTeamMembers(prev => [...prev, toTeamMember(data)])
    return null
  }, [user, teamMembers])

  const removeTeamMember = useCallback(async (id: string): Promise<void> => {
    await supabase.from('team_members').delete().eq('id', id)
    setTeamMembers(prev => prev.filter(m => m.id !== id))
  }, [])

  const isManagingOther = !!activeUserId && activeUserId !== user?.id
  const activeProfile = isManagingOther
    ? managedAccounts.find(a => a.hostUserId === activeUserId)?.profile ?? null
    : profile
  const needsSetup = !!user && !loading && !profile

  return (
    <AuthContext.Provider value={{
      user, profile, activeProfile, activeUserId, isManagingOther, loading, needsSetup,
      teamMembers, managedAccounts,
      signIn, signUp, signOut, switchAccount,
      createProfile, updateProfile, changePassword, refreshProfile,
      inviteTeamMember, removeTeamMember,
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

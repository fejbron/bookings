// Single source of truth for auth + account data.
// Replaces AuthContext + BookingContext. One auth listener, no race conditions.

import {
  createContext, useContext, useEffect, useRef, useState, useCallback, useMemo,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import * as q from '../lib/db/queries'
import * as m from '../lib/db/mutations'
import type {
  Profile, CalendarTypeRecord, PresentationSlot, SlotConfig,
  Booking, BookingStudent, TeamMember, ManagedAccount,
} from '../types'

interface AccountState {
  slots: PresentationSlot[]
  slotConfigs: SlotConfig[]
  calendarTypes: CalendarTypeRecord[]
  bookings: Booking[]
  settings: { welcomeMessage: string; allowSelfCancel: boolean }
}

const EMPTY_ACCOUNT: AccountState = {
  slots: [], slotConfigs: [], calendarTypes: [], bookings: [],
  settings: { welcomeMessage: '', allowSelfCancel: true },
}

interface AppContextValue {
  // Auth
  user: User | null
  authLoading: boolean
  profile: Profile | null
  needsSetup: boolean

  // Active account (own or managed)
  activeUserId: string | null
  activeProfile: Profile | null
  isManagingOther: boolean
  managedAccounts: ManagedAccount[]
  teamMembers: TeamMember[]

  // Active account data
  account: AccountState
  dataLoading: boolean
  dataError: Error | null

  // Auth actions
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  changePassword: (current: string, next: string) => Promise<string | null>
  createProfile: (input: { name: string; username: string; accountType: 'lecturer' | 'professional'; title?: string; description?: string }) => Promise<void>
  updateProfile: (input: UpdateProfilePatch) => Promise<void>

  // Account switching
  switchAccount: (userId: string) => void

  // Team
  inviteTeamMember: (email: string) => Promise<string | null>
  removeTeamMember: (id: string) => Promise<void>

  // Calendar types
  createCalendarType: (input: { name: string; color: string; description?: string; isPresentation?: boolean }) => Promise<CalendarTypeRecord>
  updateCalendarType: (id: string, patch: { name?: string; color?: string; description?: string; isPresentation?: boolean }) => Promise<void>
  deleteCalendarType: (id: string) => Promise<void>

  // Slots
  generateSlots: (input: Omit<m.GenerateSlotsInput, 'userId' | 'existingSlots'>) => Promise<PresentationSlot[]>
  deleteSlot: (id: string) => Promise<void>
  clearAllSlots: () => Promise<void>

  // Bookings
  confirmBooking: (id: string) => Promise<void>
  cancelBooking: (id: string, reason?: string) => Promise<void>
  rescheduleBooking: (id: string, slotId: string) => Promise<void>
  setBookingComment: (id: string, comment: string) => Promise<void>
  setBookingStudents: (id: string, students: BookingStudent[]) => Promise<void>
  refetchAccount: () => Promise<void>

  // Settings
  saveSettings: (welcomeMessage: string, allowSelfCancel: boolean) => Promise<void>

  // Computed helpers
  getAvailableDates: (calendarType?: string) => string[]
  getAvailableSlots: (date: string, calendarType?: string) => PresentationSlot[]
}

// All fields the UI can patch on a profile. The mutation layer picks which
// columns go into which table based on the row's actual type.
type UpdateProfilePatch = Partial<{
  name: string; username: string; title: string; description: string; isPublic: boolean
  // Lecturer
  classGroup: string; institution: string; department: string
  officeLocation: string; officeHours: string; courses: string[]; academicRank: string
  // Professional
  company: string; industry: string; jobTitle: string; services: string
  location: string; website: string; linkedinUrl: string
}>

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  // Auth state
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [managedAccounts, setManagedAccounts] = useState<ManagedAccount[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [activeUserId, setActiveUserId] = useState<string | null>(null)

  // Account data state
  const [account, setAccount] = useState<AccountState>(EMPTY_ACCOUNT)
  const [dataLoading, setDataLoading] = useState(false)
  const [dataError, setDataError] = useState<Error | null>(null)

  // Track in-flight account loads so we ignore stale results
  const loadGen = useRef(0)

  // ── Auth bootstrap ─────────────────────────────────────────────────────────

  const hydrate = useCallback(async (u: User | null) => {
    if (!u) {
      setProfile(null)
      setTeamMembers([])
      setManagedAccounts([])
      setActiveUserId(null)
      return
    }

    const [profileR, teamR, managedR] = await Promise.allSettled([
      q.getProfileByUserId(u.id),
      q.getTeam(u.id),
      q.getManagedAccounts(u.email!, u.id),
    ])

    setProfile(profileR.status === 'fulfilled' ? profileR.value : null)
    setTeamMembers(teamR.status === 'fulfilled' ? teamR.value : [])
    setManagedAccounts(managedR.status === 'fulfilled' ? managedR.value : [])

    // Default active account to own user
    setActiveUserId((prev) => prev ?? u.id)
  }, [])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return
      const u = session?.user ?? null
      setUser(u)
      await hydrate(u)
      if (mounted) setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (!mounted) return
      const u = session?.user ?? null
      setUser(u)
      await hydrate(u)
    })

    return () => { mounted = false; subscription.unsubscribe() }
  }, [hydrate])

  // ── Account data loading ───────────────────────────────────────────────────

  const refetchAccount = useCallback(async () => {
    if (!activeUserId) {
      setAccount(EMPTY_ACCOUNT)
      setDataLoading(false)
      setDataError(null)
      return
    }
    const gen = ++loadGen.current
    setDataLoading(true)
    setDataError(null)
    try {
      const next = await q.getAccountData(activeUserId)
      if (gen === loadGen.current) setAccount(next)
    } catch (err) {
      if (gen === loadGen.current) setDataError(err as Error)
    } finally {
      if (gen === loadGen.current) setDataLoading(false)
    }
  }, [activeUserId])

  useEffect(() => {
    if (authLoading) return
    void refetchAccount()
  }, [authLoading, refetchAccount])

  // ── Auth actions ───────────────────────────────────────────────────────────

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    return error?.message ?? null
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password })
    return error?.message ?? null
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const changePassword = useCallback(async (current: string, next: string) => {
    if (!user?.email) return 'Not authenticated'
    const { error: signErr } = await supabase.auth.signInWithPassword({ email: user.email, password: current })
    if (signErr) return 'Current password is incorrect.'
    const { error } = await supabase.auth.updateUser({ password: next })
    return error?.message ?? null
  }, [user])

  const createProfile = useCallback(async (input: { name: string; username: string; accountType: 'lecturer' | 'professional'; title?: string; description?: string }) => {
    if (!user) throw new Error('Not authenticated')
    const taken = await q.isUsernameTaken(input.username.trim().toLowerCase())
    if (taken) throw new Error('That username is already taken.')
    const next = await m.upsertProfile({ ...input, userId: user.id, email: user.email! })
    setProfile(next)
    setActiveUserId(user.id)
  }, [user])

  const updateProfile = useCallback(async (input: UpdateProfilePatch) => {
    if (!user) throw new Error('Not authenticated')
    if (input.username && input.username !== profile?.username) {
      const taken = await q.isUsernameTaken(input.username.trim().toLowerCase())
      if (taken) throw new Error('That username is already taken.')
    }
    const next = await m.updateProfile({ userId: user.id, ...input })
    setProfile(next)
  }, [user, profile])

  // ── Account switching ──────────────────────────────────────────────────────

  const switchAccount = useCallback((userId: string) => setActiveUserId(userId), [])

  // ── Team ───────────────────────────────────────────────────────────────────

  const inviteTeamMember = useCallback(async (email: string): Promise<string | null> => {
    if (!user) return 'Not authenticated'
    const normalized = email.trim().toLowerCase()
    if (normalized === user.email) return 'You cannot add yourself.'
    if (teamMembers.some((t) => t.memberEmail === normalized)) return 'Already in your team.'
    try {
      const next = await m.inviteTeamMember(user.id, normalized)
      setTeamMembers((prev) => [...prev, next])
      return null
    } catch (err) {
      return (err as Error).message
    }
  }, [user, teamMembers])

  const removeTeamMember = useCallback(async (id: string) => {
    await m.removeTeamMember(id)
    setTeamMembers((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // ── Calendar types ─────────────────────────────────────────────────────────

  const createCalendarType = useCallback(async (input: { name: string; color: string; description?: string; isPresentation?: boolean }) => {
    if (!activeUserId) throw new Error('No active account')
    const next = await m.createCalendarType({ ...input, userId: activeUserId })
    setAccount((prev) => ({ ...prev, calendarTypes: [...prev.calendarTypes, next] }))
    return next
  }, [activeUserId])

  const updateCalendarType = useCallback(async (id: string, patch: { name?: string; color?: string; description?: string; isPresentation?: boolean }) => {
    const next = await m.updateCalendarType({ id, ...patch })
    setAccount((prev) => ({
      ...prev,
      calendarTypes: prev.calendarTypes.map((t) => t.id === id ? next : t),
    }))
  }, [])

  const deleteCalendarType = useCallback(async (id: string) => {
    await m.deleteCalendarType(id)
    setAccount((prev) => ({ ...prev, calendarTypes: prev.calendarTypes.filter((t) => t.id !== id) }))
  }, [])

  // ── Slots ──────────────────────────────────────────────────────────────────

  const generateSlots = useCallback(async (input: Omit<m.GenerateSlotsInput, 'userId' | 'existingSlots'>) => {
    if (!activeUserId) throw new Error('No active account')
    const created = await m.generateSlots({ ...input, userId: activeUserId, existingSlots: account.slots })
    setAccount((prev) => ({ ...prev, slots: [...prev.slots, ...created] }))
    return created
  }, [activeUserId, account.slots])

  const deleteSlot = useCallback(async (id: string) => {
    await m.deleteSlot(id)
    setAccount((prev) => ({
      ...prev,
      slots: prev.slots.filter((s) => s.id !== id),
      bookings: prev.bookings.map((b) => b.slotId === id ? { ...b, status: 'cancelled' as const } : b),
    }))
  }, [])

  const clearAllSlots = useCallback(async () => {
    if (!activeUserId) return
    await m.deleteAllSlots(activeUserId)
    setAccount((prev) => ({
      ...prev, slots: [], slotConfigs: [],
      bookings: prev.bookings.map((b) => ({ ...b, status: 'cancelled' as const })),
    }))
  }, [activeUserId])

  // ── Bookings ───────────────────────────────────────────────────────────────

  const confirmBooking = useCallback(async (id: string) => {
    await m.setBookingStatus(id, 'confirmed')
    setAccount((prev) => ({
      ...prev,
      bookings: prev.bookings.map((b) => b.id === id ? { ...b, status: 'confirmed' as const } : b),
    }))
  }, [])

  const cancelBooking = useCallback(async (id: string, reason?: string) => {
    await m.setBookingStatus(id, 'cancelled', reason)
    setAccount((prev) => ({
      ...prev,
      bookings: prev.bookings.map((b) => b.id === id
        ? { ...b, status: 'cancelled' as const, cancellationReason: reason ?? b.cancellationReason }
        : b),
    }))
  }, [])

  const rescheduleBooking = useCallback(async (bookingId: string, newSlotId: string) => {
    const slot = account.slots.find((s) => s.id === newSlotId)
    if (!slot) throw new Error('Slot not found')
    await m.rescheduleBooking(bookingId, slot)
    setAccount((prev) => ({
      ...prev,
      bookings: prev.bookings.map((b) => b.id === bookingId
        ? { ...b, slotId: newSlotId, date: slot.date, time: slot.time, duration: slot.duration }
        : b),
    }))
  }, [account.slots])

  const setBookingComment = useCallback(async (id: string, comment: string) => {
    await m.setBookingComment(id, comment)
    setAccount((prev) => ({
      ...prev,
      bookings: prev.bookings.map((b) => b.id === id ? { ...b, adminComment: comment } : b),
    }))
  }, [])

  const setBookingStudents = useCallback(async (id: string, students: BookingStudent[]) => {
    await m.setBookingStudents(id, students)
    setAccount((prev) => ({
      ...prev,
      bookings: prev.bookings.map((b) => b.id === id ? { ...b, students } : b),
    }))
  }, [])

  // ── Settings ───────────────────────────────────────────────────────────────

  const saveSettings = useCallback(async (welcomeMessage: string, allowSelfCancel: boolean) => {
    if (!activeUserId) return
    await m.upsertSettings(activeUserId, welcomeMessage, allowSelfCancel)
    setAccount((prev) => ({ ...prev, settings: { welcomeMessage, allowSelfCancel } }))
  }, [activeUserId])

  // ── Derived helpers ────────────────────────────────────────────────────────

  const bookedSlotIds = useMemo(
    () => new Set(account.bookings.filter((b) => b.status !== 'cancelled').map((b) => b.slotId)),
    [account.bookings],
  )

  const getAvailableDates = useCallback((calendarType?: string): string[] => {
    const today = new Date().toISOString().slice(0, 10)
    const dates = new Set<string>()
    for (const s of account.slots) {
      if (bookedSlotIds.has(s.id)) continue
      if (s.date < today) continue
      if (calendarType && s.calendarType !== calendarType) continue
      dates.add(s.date)
    }
    return Array.from(dates).sort()
  }, [account.slots, bookedSlotIds])

  const getAvailableSlots = useCallback((date: string, calendarType?: string): PresentationSlot[] => {
    return account.slots
      .filter((s) => s.date === date && !bookedSlotIds.has(s.id) && (!calendarType || s.calendarType === calendarType))
      .sort((a, b) => a.time.localeCompare(b.time))
  }, [account.slots, bookedSlotIds])

  // ── Derived auth helpers ───────────────────────────────────────────────────

  const isManagingOther = !!activeUserId && activeUserId !== user?.id
  const activeProfile = isManagingOther
    ? managedAccounts.find((a) => a.hostUserId === activeUserId)?.profile ?? null
    : profile
  const needsSetup = !!user && !authLoading && !profile

  const value: AppContextValue = {
    user, authLoading, profile, needsSetup,
    activeUserId, activeProfile, isManagingOther, managedAccounts, teamMembers,
    account, dataLoading, dataError,
    signIn, signUp, signOut, changePassword, createProfile, updateProfile,
    switchAccount,
    inviteTeamMember, removeTeamMember,
    createCalendarType, updateCalendarType, deleteCalendarType,
    generateSlots, deleteSlot, clearAllSlots,
    confirmBooking, cancelBooking, rescheduleBooking, setBookingComment, setBookingStudents, refetchAccount,
    saveSettings,
    getAvailableDates, getAvailableSlots,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

// Read queries. Every Supabase SELECT in the app goes through here.
// Each function returns domain objects (never raw rows) and a normalized error.

import { supabase } from '../supabase'
import {
  toLecturerProfile, toProfessionalProfile, toCalendarType, toSlot, toSlotConfig,
  toBooking, toSettings, toTeamMember,
} from './mappers'
import type {
  Profile, CalendarTypeRecord, PresentationSlot, SlotConfig,
  Booking, TeamMember, ManagedAccount,
} from '../../types'

function formatCause(cause: unknown): string {
  if (cause == null) return 'unknown error'
  if (cause instanceof Error) return cause.message
  if (typeof cause === 'string') return cause
  if (typeof cause === 'object') {
    const o = cause as Record<string, unknown>
    // Supabase PostgrestError: { message, details, hint, code }
    const msg = typeof o.message === 'string' ? o.message : ''
    const details = typeof o.details === 'string' && o.details ? ` (${o.details})` : ''
    const code = typeof o.code === 'string' && o.code ? ` [${o.code}]` : ''
    if (msg) return msg + details + code
    try { return JSON.stringify(cause) } catch { return '[unserialisable error]' }
  }
  return String(cause)
}

export class DbError extends Error {
  action: string
  cause: unknown
  constructor(action: string, cause: unknown) {
    super(`${action}: ${formatCause(cause)}`)
    this.name = 'DbError'
    this.action = action
    this.cause = cause
    // Surface the underlying error to the console for production debugging
    console.error(`[DbError] ${action}`, cause)
  }
}

// Profiles ─────────────────────────────────────────────────────────────────────

export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  const [lecRes, proRes] = await Promise.all([
    supabase.from('lecturer_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('professional_profiles').select('*').eq('user_id', userId).maybeSingle(),
  ])
  if (lecRes.error) throw new DbError('getProfileByUserId.lecturer', lecRes.error)
  if (proRes.error) throw new DbError('getProfileByUserId.professional', proRes.error)
  if (lecRes.data) return toLecturerProfile(lecRes.data)
  if (proRes.data) return toProfessionalProfile(proRes.data)
  return null
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const [lecRes, proRes] = await Promise.all([
    supabase.from('lecturer_profiles').select('*').eq('username', username).eq('is_public', true).is('suspended_at', null).maybeSingle(),
    supabase.from('professional_profiles').select('*').eq('username', username).eq('is_public', true).is('suspended_at', null).maybeSingle(),
  ])
  if (lecRes.error) throw new DbError('getProfileByUsername.lecturer', lecRes.error)
  if (proRes.error) throw new DbError('getProfileByUsername.professional', proRes.error)
  if (lecRes.data) return toLecturerProfile(lecRes.data)
  if (proRes.data) return toProfessionalProfile(proRes.data)
  return null
}

export async function getPublicProfiles(): Promise<Profile[]> {
  const [lecRes, proRes] = await Promise.all([
    supabase.from('lecturer_profiles').select('*')
      .eq('is_public', true).is('suspended_at', null).not('username', 'is', null).order('name'),
    supabase.from('professional_profiles').select('*')
      .eq('is_public', true).is('suspended_at', null).not('username', 'is', null).order('name'),
  ])
  if (lecRes.error) throw new DbError('getPublicProfiles.lecturer', lecRes.error)
  if (proRes.error) throw new DbError('getPublicProfiles.professional', proRes.error)
  const profiles: Profile[] = [
    ...(lecRes.data ?? []).map(toLecturerProfile),
    ...(proRes.data ?? []).map(toProfessionalProfile),
  ]
  return profiles.sort((a, b) => a.name.localeCompare(b.name))
}

export async function getDirectoryListing(today: string): Promise<{ profile: Profile; slotCount: number }[]> {
  const profiles = await getPublicProfiles()
  const userIds = profiles.map((p) => p.userId).filter((x): x is string => !!x)
  if (userIds.length === 0) return profiles.map((profile) => ({ profile, slotCount: 0 }))

  const { data, error } = await supabase
    .from('slots').select('user_id').in('user_id', userIds).gte('date', today)
  if (error) throw new DbError('getDirectoryListing.slots', error)

  const counts: Record<string, number> = {}
  for (const r of data ?? []) {
    const uid = r.user_id as string
    counts[uid] = (counts[uid] ?? 0) + 1
  }
  return profiles.map((p) => ({ profile: p, slotCount: p.userId ? (counts[p.userId] ?? 0) : 0 }))
}

export async function isUsernameTaken(username: string): Promise<boolean> {
  const [lecRes, proRes] = await Promise.all([
    supabase.from('lecturer_profiles').select('id').eq('username', username).maybeSingle(),
    supabase.from('professional_profiles').select('id').eq('username', username).maybeSingle(),
  ])
  if (lecRes.error) throw new DbError('isUsernameTaken.lecturer', lecRes.error)
  if (proRes.error) throw new DbError('isUsernameTaken.professional', proRes.error)
  return !!lecRes.data || !!proRes.data
}

// Account data (slots, configs, calendar types, settings) ─────────────────────

export interface AccountData {
  slots: PresentationSlot[]
  slotConfigs: SlotConfig[]
  calendarTypes: CalendarTypeRecord[]
  bookings: Booking[]
  settings: { welcomeMessage: string; allowSelfCancel: boolean }
}

export async function getAccountData(userId: string): Promise<AccountData> {
  const [slotsRes, configsRes, typesRes, settingsRes] = await Promise.all([
    supabase.from('slots').select('*').eq('user_id', userId).order('date').order('time'),
    supabase.from('slot_configs').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('calendar_types').select('*').eq('user_id', userId).order('created_at'),
    supabase.from('admin_settings').select('*').eq('user_id', userId).maybeSingle(),
  ])

  const errs = [slotsRes.error, configsRes.error, typesRes.error, settingsRes.error].filter(Boolean)
  if (errs.length) throw new DbError('getAccountData', errs[0])

  const slots = (slotsRes.data ?? []).map(toSlot)
  const slotIds = slots.map((s) => s.id)

  let bookings: Booking[] = []
  if (slotIds.length > 0) {
    const { data, error } = await supabase
      .from('bookings').select('*').in('slot_id', slotIds).order('created_at', { ascending: false })
    if (error) throw new DbError('getAccountData.bookings', error)
    bookings = (data ?? []).map(toBooking)
  }

  return {
    slots,
    slotConfigs: (configsRes.data ?? []).map(toSlotConfig),
    calendarTypes: (typesRes.data ?? []).map(toCalendarType),
    bookings,
    settings: toSettings(settingsRes.data ?? null),
  }
}

// Public booking page payload ─────────────────────────────────────────────────

export interface PublicPageData {
  profile: Profile
  slots: PresentationSlot[]
  calendarTypes: CalendarTypeRecord[]
  takenSlotIds: Set<string>
  welcomeMessage: string
}

export async function getPublicPageData(username: string, today: string): Promise<PublicPageData | null> {
  const profile = await getProfileByUsername(username)
  if (!profile?.userId) return null

  const [slotsRes, typesRes, settingsRes] = await Promise.all([
    supabase.from('slots').select('*').eq('user_id', profile.userId).gte('date', today).order('date').order('time'),
    supabase.from('calendar_types').select('*').eq('user_id', profile.userId).order('created_at'),
    supabase.from('admin_settings').select('welcome_message').eq('user_id', profile.userId).maybeSingle(),
  ])

  const errs = [slotsRes.error, typesRes.error, settingsRes.error].filter(Boolean)
  if (errs.length) throw new DbError('getPublicPageData', errs[0])

  const slots = (slotsRes.data ?? []).map(toSlot)
  const slotIds = slots.map((s) => s.id)

  let takenSlotIds = new Set<string>()
  if (slotIds.length > 0) {
    const { data, error } = await supabase
      .from('bookings').select('slot_id, status').in('slot_id', slotIds).in('status', ['confirmed', 'pending'])
    if (error) throw new DbError('getPublicPageData.bookings', error)
    takenSlotIds = new Set((data ?? []).map((b) => b.slot_id as string))
  }

  return {
    profile,
    slots,
    calendarTypes: (typesRes.data ?? []).map(toCalendarType),
    takenSlotIds,
    welcomeMessage: settingsRes.data?.welcome_message ?? '',
  }
}

// Student-facing my-bookings lookup ───────────────────────────────────────────

export async function getBookingsByEmail(email: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings').select('*').eq('student_email', email).order('date')
  if (error) throw new DbError('getBookingsByEmail', error)
  return (data ?? []).map(toBooking)
}

// Slot availability check (race-safe insert pre-check) ─────────────────────────

export async function isSlotTaken(slotId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('bookings').select('id').eq('slot_id', slotId).in('status', ['confirmed', 'pending']).maybeSingle()
  if (error) throw new DbError('isSlotTaken', error)
  return !!data
}

// Platform admin lookup ───────────────────────────────────────────────────────

export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle()
  if (error) {
    // Don't throw — surface as "not admin" so a missing table on a legacy
    // install doesn't break the app shell.
    console.warn('[isPlatformAdmin]', error.message)
    return false
  }
  return !!data
}

// Team ─────────────────────────────────────────────────────────────────────────

export async function getTeam(hostUserId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('team_members').select('*').eq('host_user_id', hostUserId).order('created_at')
  if (error) throw new DbError('getTeam', error)
  return (data ?? []).map(toTeamMember)
}

export async function getManagedAccounts(userEmail: string, userId: string): Promise<ManagedAccount[]> {
  const { data: memberships, error } = await supabase
    .from('team_members').select('*').eq('member_email', userEmail).eq('status', 'active')
  if (error) throw new DbError('getManagedAccounts.memberships', error)
  if (!memberships || memberships.length === 0) return []

  // Lazily link member_user_id on first login
  const unlinkedIds = memberships.filter((m) => !m.member_user_id).map((m) => m.id)
  if (unlinkedIds.length > 0) {
    await supabase.from('team_members').update({ member_user_id: userId }).in('id', unlinkedIds)
  }

  const hostIds = memberships.map((m) => m.host_user_id)
  const [lecRes, proRes] = await Promise.all([
    supabase.from('lecturer_profiles').select('*').in('user_id', hostIds),
    supabase.from('professional_profiles').select('*').in('user_id', hostIds),
  ])
  if (lecRes.error) throw new DbError('getManagedAccounts.lecturers', lecRes.error)
  if (proRes.error) throw new DbError('getManagedAccounts.professionals', proRes.error)

  const lecturerByUid = new Map((lecRes.data ?? []).map((p) => [p.user_id as string, toLecturerProfile(p)]))
  const professionalByUid = new Map((proRes.data ?? []).map((p) => [p.user_id as string, toProfessionalProfile(p)]))

  return memberships
    .map((m) => {
      const p = lecturerByUid.get(m.host_user_id) ?? professionalByUid.get(m.host_user_id)
      return p ? { hostUserId: m.host_user_id, profile: p, role: m.role } : null
    })
    .filter((x): x is ManagedAccount => x !== null)
}

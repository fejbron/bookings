// Platform-admin read queries. Every page in src/pages/admin/ goes through
// these. RLS still applies, but is_platform_admin() lets these calls see
// every row across all users.

import { supabase } from '../../supabase'
import { DbError } from '../queries'
import {
  toLecturerProfile, toProfessionalProfile, toBooking, toSlot, toCalendarType,
  toTeamMember,
} from '../mappers'
import type {
  Profile, Booking, PresentationSlot, CalendarTypeRecord, TeamMember,
} from '../../../types'

// ── Users ──────────────────────────────────────────────────────────────────

export interface AdminUserRow {
  profile: Profile
  isAdmin: boolean
}

export async function listAllUsers(): Promise<AdminUserRow[]> {
  const [lecRes, proRes, adminRes] = await Promise.all([
    supabase.from('lecturer_profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('professional_profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('platform_admins').select('user_id'),
  ])
  if (lecRes.error) throw new DbError('listAllUsers.lecturers', lecRes.error)
  if (proRes.error) throw new DbError('listAllUsers.professionals', proRes.error)
  if (adminRes.error) throw new DbError('listAllUsers.admins', adminRes.error)

  const admins = new Set((adminRes.data ?? []).map((a) => a.user_id as string))
  const profiles: Profile[] = [
    ...(lecRes.data ?? []).map(toLecturerProfile),
    ...(proRes.data ?? []).map(toProfessionalProfile),
  ]
  return profiles
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((profile) => ({
      profile,
      isAdmin: profile.userId ? admins.has(profile.userId) : false,
    }))
}

// ── Bookings ───────────────────────────────────────────────────────────────

export async function listAllBookings(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings').select('*').order('created_at', { ascending: false }).limit(500)
  if (error) throw new DbError('listAllBookings', error)
  return (data ?? []).map(toBooking)
}

// ── Slots ──────────────────────────────────────────────────────────────────

export async function listAllSlots(): Promise<PresentationSlot[]> {
  const { data, error } = await supabase
    .from('slots').select('*').order('date', { ascending: false }).order('time').limit(1000)
  if (error) throw new DbError('listAllSlots', error)
  return (data ?? []).map(toSlot)
}

// ── Session/calendar types ─────────────────────────────────────────────────

export async function listAllTypes(): Promise<CalendarTypeRecord[]> {
  const { data, error } = await supabase
    .from('calendar_types').select('*').order('created_at', { ascending: false })
  if (error) throw new DbError('listAllTypes', error)
  return (data ?? []).map(toCalendarType)
}

// ── Team memberships ───────────────────────────────────────────────────────

export async function listAllTeams(): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('team_members').select('*').order('created_at', { ascending: false })
  if (error) throw new DbError('listAllTeams', error)
  return (data ?? []).map(toTeamMember)
}

// ── Platform settings ──────────────────────────────────────────────────────

export interface PlatformSettings {
  signupsEnabled: boolean
  bannerMessage: string
  maintenanceMessage: string
  updatedAt: string
  updatedBy: string | null
}

const EMPTY_PLATFORM_SETTINGS: PlatformSettings = {
  signupsEnabled: true,
  bannerMessage: '',
  maintenanceMessage: '',
  updatedAt: new Date(0).toISOString(),
  updatedBy: null,
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const { data, error } = await supabase
    .from('platform_settings').select('*').eq('id', 1).maybeSingle()
  if (error) throw new DbError('getPlatformSettings', error)
  if (!data) return EMPTY_PLATFORM_SETTINGS
  return {
    signupsEnabled: data.signups_enabled,
    bannerMessage: data.banner_message,
    maintenanceMessage: data.maintenance_message,
    updatedAt: data.updated_at,
    updatedBy: data.updated_by,
  }
}

// ── Admins list ────────────────────────────────────────────────────────────

export interface AdminEntry {
  userId: string
  role: string
  grantedBy: string | null
  grantedAt: string
  profile: Profile | null
}

export async function listAdmins(): Promise<AdminEntry[]> {
  const { data, error } = await supabase
    .from('platform_admins').select('*').order('granted_at', { ascending: false })
  if (error) throw new DbError('listAdmins', error)
  const rows = data ?? []
  if (rows.length === 0) return []

  const ids = rows.map((r) => r.user_id as string)
  const [lecRes, proRes] = await Promise.all([
    supabase.from('lecturer_profiles').select('*').in('user_id', ids),
    supabase.from('professional_profiles').select('*').in('user_id', ids),
  ])
  if (lecRes.error) throw new DbError('listAdmins.lecturers', lecRes.error)
  if (proRes.error) throw new DbError('listAdmins.professionals', proRes.error)

  const byUid = new Map<string, Profile>()
  for (const r of lecRes.data ?? []) byUid.set(r.user_id as string, toLecturerProfile(r))
  for (const r of proRes.data ?? []) byUid.set(r.user_id as string, toProfessionalProfile(r))

  return rows.map((r) => ({
    userId: r.user_id as string,
    role: r.role as string,
    grantedBy: r.granted_by as string | null,
    grantedAt: r.granted_at as string,
    profile: byUid.get(r.user_id as string) ?? null,
  }))
}

// ── Audit log ──────────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string
  actorUserId: string | null
  actorName: string | null
  action: string
  targetType: string | null
  targetId: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export async function listAuditLog(limit = 200): Promise<AuditEntry[]> {
  const { data, error } = await supabase
    .from('platform_audit_log').select('*').order('created_at', { ascending: false }).limit(limit)
  if (error) throw new DbError('listAuditLog', error)
  const rows = data ?? []
  if (rows.length === 0) return []

  const actorIds = Array.from(
    new Set(rows.map((r) => r.actor_user_id as string | null).filter((x): x is string => !!x)),
  )
  const nameByUid = new Map<string, string>()
  if (actorIds.length > 0) {
    const [lecRes, proRes] = await Promise.all([
      supabase.from('lecturer_profiles').select('user_id, name').in('user_id', actorIds),
      supabase.from('professional_profiles').select('user_id, name').in('user_id', actorIds),
    ])
    for (const r of lecRes.data ?? []) nameByUid.set(r.user_id as string, r.name as string)
    for (const r of proRes.data ?? []) nameByUid.set(r.user_id as string, r.name as string)
  }

  return rows.map((r) => ({
    id: r.id as string,
    actorUserId: r.actor_user_id as string | null,
    actorName: r.actor_user_id ? (nameByUid.get(r.actor_user_id) ?? null) : null,
    action: r.action as string,
    targetType: r.target_type as string | null,
    targetId: r.target_id as string | null,
    metadata: (r.metadata ?? {}) as Record<string, unknown>,
    createdAt: r.created_at as string,
  }))
}

// ── Aggregated metrics (single round-trip via RPC) ─────────────────────────

export interface PlatformMetrics {
  totalUsers: number
  lecturers: number
  professionals: number
  suspendedUsers: number
  totalBookings: number
  bookingsLast7Days: number
  bookingsPending: number
  bookingsConfirmed: number
  totalSlots: number
  slotsUpcoming: number
  totalTeams: number
  totalSessionTypes: number
  platformAdmins: number
}

export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  const { data, error } = await supabase.rpc('get_platform_metrics')
  if (error) throw new DbError('getPlatformMetrics', error)
  const m = (data ?? {}) as Record<string, number>
  return {
    totalUsers: m.total_users ?? 0,
    lecturers: m.lecturers ?? 0,
    professionals: m.professionals ?? 0,
    suspendedUsers: m.suspended_users ?? 0,
    totalBookings: m.total_bookings ?? 0,
    bookingsLast7Days: m.bookings_last_7_days ?? 0,
    bookingsPending: m.bookings_pending ?? 0,
    bookingsConfirmed: m.bookings_confirmed ?? 0,
    totalSlots: m.total_slots ?? 0,
    slotsUpcoming: m.slots_upcoming ?? 0,
    totalTeams: m.total_teams ?? 0,
    totalSessionTypes: m.total_session_types ?? 0,
    platformAdmins: m.platform_admins ?? 0,
  }
}

// Platform-admin mutations. Every write here is recorded in
// platform_audit_log via writeAudit() so admins leave a paper trail.

import { supabase } from '../../supabase'
import { DbError } from '../queries'
import type { AccountType } from '../../../types'

// ── Audit helper ───────────────────────────────────────────────────────────

interface AuditInput {
  action: string
  targetType?: string
  targetId?: string
  metadata?: Record<string, unknown>
}

async function writeAudit(input: AuditInput): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return // unauthenticated; nothing to log
  const { error } = await supabase.from('platform_audit_log').insert({
    actor_user_id: user.id,
    action: input.action,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    metadata: input.metadata ?? {},
  })
  if (error) {
    // Audit log shouldn't break the mutation; just warn.
    console.warn('[audit]', input.action, error.message)
  }
}

// ── Suspend / unsuspend ────────────────────────────────────────────────────

function profileTable(type: AccountType): 'lecturer_profiles' | 'professional_profiles' {
  return type === 'lecturer' ? 'lecturer_profiles' : 'professional_profiles'
}

export async function suspendProfile(userId: string, accountType: AccountType): Promise<void> {
  const { error } = await supabase
    .from(profileTable(accountType))
    .update({ suspended_at: new Date().toISOString() })
    .eq('user_id', userId)
  if (error) throw new DbError('suspendProfile', error)
  await writeAudit({ action: 'suspend_profile', targetType: 'user', targetId: userId, metadata: { accountType } })
}

export async function unsuspendProfile(userId: string, accountType: AccountType): Promise<void> {
  const { error } = await supabase
    .from(profileTable(accountType))
    .update({ suspended_at: null })
    .eq('user_id', userId)
  if (error) throw new DbError('unsuspendProfile', error)
  await writeAudit({ action: 'unsuspend_profile', targetType: 'user', targetId: userId, metadata: { accountType } })
}

// ── Soft delete (in-app) ───────────────────────────────────────────────────
// Deletes profile + owned data via FK cascades, but leaves auth.users intact.
// Reversible only by re-creating the profile.

export async function softDeleteUser(userId: string, accountType: AccountType): Promise<void> {
  const { error } = await supabase
    .from(profileTable(accountType))
    .delete()
    .eq('user_id', userId)
  if (error) throw new DbError('softDeleteUser', error)
  await writeAudit({ action: 'soft_delete_user', targetType: 'user', targetId: userId, metadata: { accountType } })
}

// ── Hard delete (Edge Function) ────────────────────────────────────────────

export async function hardDeleteUser(userId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('admin-delete-user', {
    body: { userId },
  })
  if (error) {
    throw new DbError('hardDeleteUser', error)
  }
  if (data && typeof data === 'object' && 'error' in data) {
    throw new DbError('hardDeleteUser', (data as { error: string }).error)
  }
  // Edge function writes its own audit entry server-side.
}

// ── Bookings ───────────────────────────────────────────────────────────────

export async function forceCancelBooking(id: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled', cancellation_reason: reason })
    .eq('id', id)
  if (error) throw new DbError('forceCancelBooking', error)
  await writeAudit({ action: 'force_cancel_booking', targetType: 'booking', targetId: id, metadata: { reason } })
}

export async function deleteBooking(id: string): Promise<void> {
  const { error } = await supabase.from('bookings').delete().eq('id', id)
  if (error) throw new DbError('deleteBooking', error)
  await writeAudit({ action: 'delete_booking', targetType: 'booking', targetId: id })
}

// ── Slots ──────────────────────────────────────────────────────────────────

export async function deleteSlots(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const { error } = await supabase.from('slots').delete().in('id', ids)
  if (error) throw new DbError('deleteSlots', error)
  await writeAudit({ action: 'bulk_delete_slots', targetType: 'slots', metadata: { count: ids.length, ids } })
}

// ── Calendar types ─────────────────────────────────────────────────────────

export async function deleteCalendarType(id: string): Promise<void> {
  const { error } = await supabase.from('calendar_types').delete().eq('id', id)
  if (error) throw new DbError('deleteCalendarType', error)
  await writeAudit({ action: 'delete_calendar_type', targetType: 'calendar_type', targetId: id })
}

// ── Team memberships ───────────────────────────────────────────────────────

export async function deleteTeamMember(id: string): Promise<void> {
  const { error } = await supabase.from('team_members').delete().eq('id', id)
  if (error) throw new DbError('deleteTeamMember', error)
  await writeAudit({ action: 'delete_team_member', targetType: 'team_member', targetId: id })
}

// ── Admin role management ──────────────────────────────────────────────────

export async function promoteAdmin(userId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('platform_admins')
    .insert({ user_id: userId, role: 'superadmin', granted_by: user?.id ?? null })
  if (error) throw new DbError('promoteAdmin', error)
  await writeAudit({ action: 'promote_admin', targetType: 'user', targetId: userId })
}

export async function demoteAdmin(userId: string): Promise<void> {
  const { error } = await supabase.from('platform_admins').delete().eq('user_id', userId)
  if (error) throw new DbError('demoteAdmin', error)
  await writeAudit({ action: 'demote_admin', targetType: 'user', targetId: userId })
}

// ── Platform settings ──────────────────────────────────────────────────────

export interface PlatformSettingsPatch {
  signupsEnabled?: boolean
  bannerMessage?: string
  maintenanceMessage?: string
}

export async function updatePlatformSettings(patch: PlatformSettingsPatch): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  const row: Record<string, unknown> = {
    id: 1,
    updated_at: new Date().toISOString(),
    updated_by: user?.id ?? null,
  }
  if (patch.signupsEnabled !== undefined) row.signups_enabled = patch.signupsEnabled
  if (patch.bannerMessage !== undefined) row.banner_message = patch.bannerMessage
  if (patch.maintenanceMessage !== undefined) row.maintenance_message = patch.maintenanceMessage

  const { error } = await supabase.from('platform_settings').upsert(row, { onConflict: 'id' })
  if (error) throw new DbError('updatePlatformSettings', error)
  await writeAudit({ action: 'update_platform_settings', metadata: { ...patch } })
}

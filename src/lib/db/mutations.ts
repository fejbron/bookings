// Write mutations. Every Supabase INSERT/UPDATE/DELETE in the app goes here.

import { eachDayOfInterval, parseISO, format } from 'date-fns'
import { supabase } from '../supabase'
import { toProfile, toCalendarType, toSlot, toBooking, toTeamMember } from './mappers'
import { DbError } from './queries'
import type {
  LecturerProfile, CalendarTypeRecord, PresentationSlot,
  Booking, BookingStudent, TeamMember, AccountType,
} from '../../types'

// Profile ──────────────────────────────────────────────────────────────────────

export interface CreateProfileInput {
  userId: string
  email: string
  name: string
  username: string
  accountType: AccountType
  title?: string
  description?: string
}

export async function upsertProfile(input: CreateProfileInput): Promise<LecturerProfile> {
  const { data, error } = await supabase
    .from('lecturer_profiles')
    .upsert({
      user_id: input.userId,
      email: input.email,
      name: input.name.trim(),
      username: input.username.trim().toLowerCase(),
      title: input.title?.trim() || null,
      description: input.description?.trim() || null,
      account_type: input.accountType,
      is_public: true,
    }, { onConflict: 'user_id' })
    .select('*').single()
  if (error) throw new DbError('upsertProfile', error)
  return toProfile(data)
}

export interface UpdateProfileInput {
  userId: string
  name?: string
  username?: string
  title?: string
  description?: string
  classGroup?: string
  accountType?: AccountType
  isPublic?: boolean
}

export async function updateProfile(input: UpdateProfileInput): Promise<LecturerProfile> {
  const patch: Record<string, unknown> = {}
  if (input.name !== undefined)        patch.name = input.name.trim()
  if (input.username !== undefined)    patch.username = input.username.trim().toLowerCase()
  if (input.title !== undefined)       patch.title = input.title.trim() || null
  if (input.description !== undefined) patch.description = input.description.trim() || null
  if (input.classGroup !== undefined)  patch.class_group = input.classGroup.trim() || null
  if (input.accountType !== undefined) patch.account_type = input.accountType
  if (input.isPublic !== undefined)    patch.is_public = input.isPublic

  const { data, error } = await supabase
    .from('lecturer_profiles').update(patch).eq('user_id', input.userId).select('*').single()
  if (error) throw new DbError('updateProfile', error)
  return toProfile(data)
}

// Calendar types ──────────────────────────────────────────────────────────────

export interface CreateCalendarTypeInput {
  userId: string
  name: string
  color: string
  description?: string
  isPresentation?: boolean
}

export async function createCalendarType(input: CreateCalendarTypeInput): Promise<CalendarTypeRecord> {
  const { data, error } = await supabase
    .from('calendar_types')
    .insert({
      user_id: input.userId,
      name: input.name.trim(),
      color: input.color,
      description: input.description?.trim() || null,
      is_presentation: input.isPresentation ?? false,
    })
    .select('*').single()
  if (error) throw new DbError('createCalendarType', error)
  return toCalendarType(data)
}

export async function deleteCalendarType(id: string): Promise<void> {
  const { error } = await supabase.from('calendar_types').delete().eq('id', id)
  if (error) throw new DbError('deleteCalendarType', error)
}

export interface UpdateCalendarTypeInput {
  id: string
  name?: string
  color?: string
  description?: string
  isPresentation?: boolean
}

export async function updateCalendarType(input: UpdateCalendarTypeInput): Promise<CalendarTypeRecord> {
  const patch: Record<string, unknown> = {}
  if (input.name !== undefined)            patch.name = input.name.trim()
  if (input.color !== undefined)           patch.color = input.color
  if (input.description !== undefined)     patch.description = input.description.trim() || null
  if (input.isPresentation !== undefined)  patch.is_presentation = input.isPresentation

  const { data, error } = await supabase
    .from('calendar_types').update(patch).eq('id', input.id).select('*').single()
  if (error) throw new DbError('updateCalendarType', error)
  return toCalendarType(data)
}

// Slots ────────────────────────────────────────────────────────────────────────

export interface GenerateSlotsInput {
  userId: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  duration: number
  breakBetween: number
  excludeWeekends: boolean
  calendarType: string
  classGroup?: string
  existingSlots: PresentationSlot[]
}

export async function generateSlots(input: GenerateSlotsInput): Promise<PresentationSlot[]> {
  const days = eachDayOfInterval({ start: parseISO(input.startDate), end: parseISO(input.endDate) })
  const [sH, sM] = input.startTime.split(':').map(Number)
  const [eH, eM] = input.endTime.split(':').map(Number)
  const startMin = sH * 60 + sM
  const endMin = eH * 60 + eM
  const step = input.duration + input.breakBetween

  const rows: Record<string, unknown>[] = []
  for (const day of days) {
    if (input.excludeWeekends && (day.getDay() === 0 || day.getDay() === 6)) continue
    const dateStr = format(day, 'yyyy-MM-dd')
    let cur = startMin
    while (cur + input.duration <= endMin) {
      const h = Math.floor(cur / 60), m = cur % 60
      const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      const exists = input.existingSlots.some(
        (s) => s.date === dateStr && s.time === time && s.calendarType === input.calendarType,
      )
      if (!exists) {
        rows.push({
          user_id: input.userId,
          date: dateStr,
          time,
          duration: input.duration,
          calendar_type: input.calendarType,
          class_group: input.classGroup ?? null,
        })
      }
      cur += step
    }
  }

  if (rows.length === 0) return []

  const { data, error } = await supabase.from('slots').insert(rows).select('*')
  if (error) throw new DbError('generateSlots.slots', error)

  await supabase.from('slot_configs').insert({
    user_id: input.userId,
    start_date: input.startDate,
    end_date: input.endDate,
    start_time: input.startTime,
    end_time: input.endTime,
    duration: input.duration,
    break_between: input.breakBetween,
    exclude_weekends: input.excludeWeekends,
    calendar_type: input.calendarType,
    class_group: input.classGroup ?? null,
  })

  return (data ?? []).map(toSlot)
}

export async function deleteSlot(slotId: string): Promise<void> {
  // Cascade: cancel any bookings holding this slot
  await supabase.from('bookings').update({ status: 'cancelled' }).eq('slot_id', slotId)
  const { error } = await supabase.from('slots').delete().eq('id', slotId)
  if (error) throw new DbError('deleteSlot', error)
}

export async function deleteAllSlots(userId: string): Promise<void> {
  const { data: ids } = await supabase.from('slots').select('id').eq('user_id', userId)
  const slotIds = (ids ?? []).map((r: { id: string }) => r.id)
  if (slotIds.length > 0) {
    await supabase.from('bookings').update({ status: 'cancelled' }).in('slot_id', slotIds)
  }
  await supabase.from('slot_configs').delete().eq('user_id', userId)
  const { error } = await supabase.from('slots').delete().eq('user_id', userId)
  if (error) throw new DbError('deleteAllSlots', error)
}

// Bookings ─────────────────────────────────────────────────────────────────────

export interface CreateBookingInput {
  slotId: string
  hostUserId: string | null
  date: string
  time: string
  duration: number
  studentName: string
  studentEmail: string
  presentationTopic: string
  notes: string
  students: BookingStudent[]
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      slot_id: input.slotId,
      host_user_id: input.hostUserId,
      date: input.date,
      time: input.time,
      duration: input.duration,
      student_name: input.studentName.trim(),
      student_email: input.studentEmail.trim().toLowerCase(),
      presentation_topic: input.presentationTopic.trim(),
      notes: input.notes.trim(),
      status: 'pending',
      students: input.students,
    })
    .select('*').single()
  if (error) throw new DbError('createBooking', error)
  return toBooking(data)
}

export async function setBookingStatus(id: string, status: Booking['status'], reason?: string): Promise<void> {
  const patch: Record<string, unknown> = { status }
  if (reason !== undefined) patch.cancellation_reason = reason.trim() || null
  const { error } = await supabase.from('bookings').update(patch).eq('id', id)
  if (error) throw new DbError('setBookingStatus', error)
}

export async function rescheduleBooking(id: string, slot: PresentationSlot): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ slot_id: slot.id, date: slot.date, time: slot.time, duration: slot.duration })
    .eq('id', id)
  if (error) throw new DbError('rescheduleBooking', error)
}

export async function setBookingComment(id: string, comment: string): Promise<void> {
  const { error } = await supabase.from('bookings').update({ admin_comment: comment }).eq('id', id)
  if (error) throw new DbError('setBookingComment', error)
}

export async function setBookingStudents(id: string, students: BookingStudent[]): Promise<void> {
  const { error } = await supabase.from('bookings').update({ students }).eq('id', id)
  if (error) throw new DbError('setBookingStudents', error)
}

// Settings ─────────────────────────────────────────────────────────────────────

export async function upsertSettings(userId: string, welcomeMessage: string, allowSelfCancel: boolean): Promise<void> {
  const { error } = await supabase
    .from('admin_settings')
    .upsert({ user_id: userId, welcome_message: welcomeMessage, allow_self_cancel: allowSelfCancel }, { onConflict: 'user_id' })
  if (error) throw new DbError('upsertSettings', error)
}

// Team ─────────────────────────────────────────────────────────────────────────

export async function inviteTeamMember(hostUserId: string, email: string): Promise<TeamMember> {
  const { data, error } = await supabase
    .from('team_members')
    .insert({ host_user_id: hostUserId, member_email: email.trim().toLowerCase() })
    .select('*').single()
  if (error) throw new DbError('inviteTeamMember', error)
  return toTeamMember(data)
}

export async function removeTeamMember(id: string): Promise<void> {
  const { error } = await supabase.from('team_members').delete().eq('id', id)
  if (error) throw new DbError('removeTeamMember', error)
}

// Single source of truth for converting DB rows to domain objects.
// Every read goes through these. No row→domain logic anywhere else.

import type {
  LecturerProfile, ProfessionalProfile, CalendarTypeRecord, PresentationSlot,
  SlotConfig, Booking, BookingStudent, TeamMember,
} from '../../types'
import type {
  LecturerProfileRow, ProfessionalProfileRow, CalendarTypeRow, SlotRow,
  SlotConfigRow, BookingRow, AdminSettingsRow, TeamMemberRow,
} from './schema'

export function toLecturerProfile(r: LecturerProfileRow): LecturerProfile {
  return {
    id: r.id,
    userId: r.user_id ?? undefined,
    username: r.username ?? undefined,
    email: r.email,
    name: r.name,
    title: r.title ?? undefined,
    description: r.description ?? undefined,
    classGroup: r.class_group ?? undefined,
    accountType: 'lecturer',
    isPublic: r.is_public,
    institution: r.institution ?? undefined,
    department: r.department ?? undefined,
    officeLocation: r.office_location ?? undefined,
    officeHours: r.office_hours ?? undefined,
    courses: r.courses ?? [],
    academicRank: r.academic_rank ?? undefined,
    suspendedAt: r.suspended_at ?? undefined,
    createdAt: r.created_at,
  }
}

export function toProfessionalProfile(r: ProfessionalProfileRow): ProfessionalProfile {
  return {
    id: r.id,
    userId: r.user_id ?? undefined,
    username: r.username ?? undefined,
    email: r.email,
    name: r.name,
    title: r.title ?? undefined,
    description: r.description ?? undefined,
    accountType: 'professional',
    isPublic: r.is_public,
    company: r.company ?? undefined,
    industry: r.industry ?? undefined,
    jobTitle: r.job_title ?? undefined,
    services: r.services ?? undefined,
    location: r.location ?? undefined,
    website: r.website ?? undefined,
    linkedinUrl: r.linkedin_url ?? undefined,
    suspendedAt: r.suspended_at ?? undefined,
    createdAt: r.created_at,
  }
}

export function toCalendarType(r: CalendarTypeRow): CalendarTypeRecord {
  return {
    id: r.id,
    userId: r.user_id ?? undefined,
    name: r.name,
    color: r.color,
    description: r.description ?? undefined,
    isPresentation: r.is_presentation,
    createdAt: r.created_at,
  }
}

export function toSlot(r: SlotRow): PresentationSlot {
  return {
    id: r.id,
    userId: r.user_id ?? undefined,
    date: r.date,
    time: r.time,
    duration: r.duration,
    calendarType: r.calendar_type,
    classGroup: r.class_group ?? undefined,
  }
}

export function toSlotConfig(r: SlotConfigRow): SlotConfig {
  return {
    id: r.id,
    userId: r.user_id ?? undefined,
    startDate: r.start_date,
    endDate: r.end_date,
    startTime: r.start_time,
    endTime: r.end_time,
    duration: r.duration,
    breakBetween: r.break_between,
    excludeWeekends: r.exclude_weekends,
    calendarType: r.calendar_type,
    classGroup: r.class_group ?? undefined,
    createdAt: r.created_at,
  }
}

function parseStudents(v: unknown): BookingStudent[] {
  if (!Array.isArray(v)) return []
  return v.flatMap((x) => {
    if (typeof x !== 'object' || x === null) return []
    const o = x as Record<string, unknown>
    if (typeof o.name !== 'string' || typeof o.indexNumber !== 'string') return []
    const score = typeof o.score === 'number' ? o.score : null
    return [{ name: o.name, indexNumber: o.indexNumber, score }]
  })
}

export function toBooking(r: BookingRow): Booking {
  return {
    id: r.id,
    slotId: r.slot_id ?? '',
    hostUserId: r.host_user_id ?? undefined,
    date: r.date,
    time: r.time,
    duration: r.duration,
    studentName: r.student_name,
    studentEmail: r.student_email,
    presentationTopic: r.presentation_topic,
    notes: r.notes,
    status: r.status,
    adminComment: r.admin_comment,
    cancellationReason: r.cancellation_reason,
    students: parseStudents(r.students),
    createdAt: r.created_at,
  }
}

export function toSettings(r: AdminSettingsRow | null) {
  return {
    welcomeMessage: r?.welcome_message ?? '',
    allowSelfCancel: r?.allow_self_cancel ?? true,
  }
}

export function toTeamMember(r: TeamMemberRow): TeamMember {
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

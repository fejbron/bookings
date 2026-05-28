// DB row types — match the snake_case columns in database.sql exactly.
// These are NEVER exposed to UI code. Pages use domain types from src/types.ts.

export interface LecturerProfileRow {
  id: string
  user_id: string | null
  username: string | null
  email: string
  name: string
  title: string | null
  description: string | null
  class_group: string | null
  is_public: boolean
  institution: string | null
  department: string | null
  office_location: string | null
  office_hours: string | null
  courses: string[] | null
  academic_rank: string | null
  suspended_at: string | null
  created_at: string
}

export interface ProfessionalProfileRow {
  id: string
  user_id: string | null
  username: string | null
  email: string
  name: string
  title: string | null
  description: string | null
  is_public: boolean
  company: string | null
  industry: string | null
  job_title: string | null
  services: string | null
  location: string | null
  website: string | null
  linkedin_url: string | null
  suspended_at: string | null
  created_at: string
}

export interface CalendarTypeRow {
  id: string
  user_id: string | null
  name: string
  color: string
  description: string | null
  is_presentation: boolean
  created_at: string
}

export interface SlotRow {
  id: string
  user_id: string | null
  date: string
  time: string
  duration: number
  calendar_type: string
  class_group: string | null
  created_at: string
}

export interface SlotConfigRow {
  id: string
  user_id: string | null
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  duration: number
  break_between: number
  exclude_weekends: boolean
  calendar_type: string
  class_group: string | null
  created_at: string
}

export interface BookingRow {
  id: string
  slot_id: string | null
  host_user_id: string | null
  date: string
  time: string
  duration: number
  student_name: string
  student_email: string
  presentation_topic: string
  notes: string
  status: 'pending' | 'confirmed' | 'cancelled'
  admin_comment: string
  cancellation_reason: string
  students: unknown
  created_at: string
}

export interface AdminSettingsRow {
  id: string
  user_id: string | null
  welcome_message: string
  allow_self_cancel: boolean
}

export interface TeamMemberRow {
  id: string
  host_user_id: string
  member_email: string
  member_user_id: string | null
  role: string
  status: 'active' | 'pending'
  created_at: string
}

// ── Platform admin tables ──────────────────────────────────────────────────

export interface PlatformAdminRow {
  user_id: string
  role: string
  granted_by: string | null
  granted_at: string
}

export interface PlatformSettingsRow {
  id: number
  signups_enabled: boolean
  banner_message: string
  maintenance_message: string
  updated_at: string
  updated_by: string | null
}

export interface PlatformAuditLogRow {
  id: string
  actor_user_id: string | null
  action: string
  target_type: string | null
  target_id: string | null
  metadata: unknown
  created_at: string
}

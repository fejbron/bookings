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

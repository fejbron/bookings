export interface LecturerProfile {
  id: string
  userId?: string
  username?: string
  name: string
  email: string
  title?: string
  classGroup?: string
  description?: string
  isPublic: boolean
  createdAt: string
}

export interface CalendarTypeRecord {
  id: string
  userId?: string
  name: string
  color: string
  description?: string
  createdAt: string
}

export const CALENDAR_TYPE_COLORS = ['blue', 'purple', 'green', 'grey', 'orange', 'pink', 'teal'] as const
export type CalendarColor = typeof CALENDAR_TYPE_COLORS[number]

export interface PresentationSlot {
  id: string
  userId?: string
  date: string
  time: string
  duration: number
  calendarType: string
  classGroup?: string
}

export interface SlotConfig {
  id: string
  userId?: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  duration: number
  breakBetween: number
  excludeWeekends: boolean
  calendarType: string
  classGroup?: string
  createdAt: string
}

export interface TeamMember {
  id: string
  hostUserId: string
  memberEmail: string
  memberUserId?: string
  role: string
  status: 'active' | 'pending'
  createdAt: string
}

export interface ManagedAccount {
  hostUserId: string
  profile: LecturerProfile
  role: string
}

export interface Booking {
  id: string
  slotId: string
  hostUserId?: string
  date: string
  time: string
  duration: number
  studentName: string
  studentEmail: string
  presentationTopic: string
  notes: string
  status: 'pending' | 'confirmed' | 'cancelled'
  adminComment: string
  cancellationReason: string
  createdAt: string
}

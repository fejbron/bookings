export interface LecturerProfile {
  id: string
  name: string
  email: string
  classGroup?: string
  description?: string
  createdAt: string
}

export interface CalendarTypeRecord {
  id: string
  name: string
  color: string
  description?: string
  createdAt: string
}

/** Colors available when creating a calendar type */
export const CALENDAR_TYPE_COLORS = ['blue', 'purple', 'green', 'grey', 'orange', 'pink', 'teal'] as const
export type CalendarColor = typeof CALENDAR_TYPE_COLORS[number]

export interface PresentationSlot {
  id: string
  date: string
  time: string
  duration: number
  calendarType: string
  lecturerName?: string
  classGroup?: string
}

export interface SlotConfig {
  id: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  duration: number
  breakBetween: number
  excludeWeekends: boolean
  calendarType: string
  lecturerName?: string
  classGroup?: string
  createdAt: string
}

export interface Booking {
  id: string
  slotId: string
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

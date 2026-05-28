export type AccountType = 'lecturer' | 'professional'

interface BaseProfile {
  id: string
  userId?: string
  username?: string
  name: string
  email: string
  title?: string
  description?: string
  isPublic: boolean
  suspendedAt?: string
  createdAt: string
}

export interface LecturerProfile extends BaseProfile {
  accountType: 'lecturer'
  classGroup?: string
  institution?: string
  department?: string
  officeLocation?: string
  officeHours?: string
  courses: string[]
  academicRank?: string
}

export interface ProfessionalProfile extends BaseProfile {
  accountType: 'professional'
  company?: string
  industry?: string
  jobTitle?: string
  services?: string
  location?: string
  website?: string
  linkedinUrl?: string
}

export type Profile = LecturerProfile | ProfessionalProfile

export interface BookingStudent {
  name: string
  indexNumber: string
  score?: number | null
}

export interface CalendarTypeRecord {
  id: string
  userId?: string
  name: string
  color: string
  description?: string
  isPresentation: boolean
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
  profile: Profile
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
  students: BookingStudent[]
  createdAt: string
}

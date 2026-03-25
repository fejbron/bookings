export interface PresentationSlot {
  id: string
  date: string
  time: string
  duration: number
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
  excludeWeekends: boolean
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
  status: 'confirmed' | 'cancelled'
  createdAt: string
}

import emailjs from '@emailjs/browser'
import { format, parseISO } from 'date-fns'

const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID  as string | undefined
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  as string | undefined

function pad(n: number) { return n.toString().padStart(2, '0') }
function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${pad(m)} ${ampm}`
}

export interface ConfirmationEmailParams {
  studentName: string
  studentEmail: string
  date: string
  time: string
  duration: number
  calendarType: string
  lecturerName?: string
  presentationTopic?: string
}

export async function sendBookingConfirmationEmail(p: ConfirmationEmailParams): Promise<void> {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) return

  await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
    to_name:            p.studentName,
    to_email:           p.studentEmail,
    booking_date:       format(parseISO(p.date), 'EEEE, MMMM d, yyyy'),
    booking_time:       fmtTime(p.time),
    booking_duration:   `${p.duration} minutes`,
    calendar_type:      p.calendarType,
    lecturer_name:      p.lecturerName ?? '',
    presentation_topic: p.presentationTopic ?? '',
  }, PUBLIC_KEY)
}

import emailjs from '@emailjs/browser'
import { format, parseISO } from 'date-fns'

const LS_SERVICE  = 'emailjs_service_id'
const LS_TEMPLATE = 'emailjs_template_id'
const LS_KEY      = 'emailjs_public_key'

function pad(n: number) { return n.toString().padStart(2, '0') }
function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${pad(m)} ${ampm}`
}

function getConfig() {
  return {
    serviceId:  (import.meta.env.VITE_EMAILJS_SERVICE_ID  as string) || localStorage.getItem(LS_SERVICE)  || '',
    templateId: (import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string) || localStorage.getItem(LS_TEMPLATE) || '',
    publicKey:  (import.meta.env.VITE_EMAILJS_PUBLIC_KEY  as string) || localStorage.getItem(LS_KEY)      || '',
  }
}

export function saveEmailConfig(serviceId: string, templateId: string, publicKey: string) {
  localStorage.setItem(LS_SERVICE, serviceId)
  localStorage.setItem(LS_TEMPLATE, templateId)
  localStorage.setItem(LS_KEY, publicKey)
}

export function clearEmailConfig() {
  localStorage.removeItem(LS_SERVICE)
  localStorage.removeItem(LS_TEMPLATE)
  localStorage.removeItem(LS_KEY)
}

export function getEmailConfig() {
  return getConfig()
}

export function isEmailConfigured(): boolean {
  const { serviceId, templateId, publicKey } = getConfig()
  return !!(serviceId && templateId && publicKey)
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
  const { serviceId, templateId, publicKey } = getConfig()
  if (!serviceId || !templateId || !publicKey) return

  await emailjs.send(serviceId, templateId, {
    to_name:            p.studentName,
    to_email:           p.studentEmail,
    booking_date:       format(parseISO(p.date), 'EEEE, MMMM d, yyyy'),
    booking_time:       fmtTime(p.time),
    booking_duration:   `${p.duration} minutes`,
    calendar_type:      p.calendarType,
    lecturer_name:      p.lecturerName ?? '',
    presentation_topic: p.presentationTopic ?? '',
  }, publicKey)
}

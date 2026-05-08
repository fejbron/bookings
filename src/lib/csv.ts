import { format } from 'date-fns'
import type { Booking } from '../types'

export function exportBookingsCSV(bookings: Booking[]) {
  const confirmed = bookings.filter((b) => b.status === 'confirmed')
  if (confirmed.length === 0) return

  const headers = ['Name', 'Email', 'Topic', 'Date', 'Time', 'Duration (min)', 'Notes', 'Comment', 'Booked At']
  const rows = confirmed.map((b) => [
    b.studentName,
    b.studentEmail,
    b.presentationTopic,
    b.date,
    b.time,
    b.duration.toString(),
    b.notes.replace(/,/g, ';'),
    (b.adminComment ?? '').replace(/,/g, ';'),
    b.createdAt,
  ])

  const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `bookings-${format(new Date(), 'yyyy-MM-dd')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

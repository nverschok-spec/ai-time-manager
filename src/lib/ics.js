function pad(n) {
  return String(n).padStart(2, '0')
}

function toIcsDateTime(dateKey, timeStr) {
  const [h, m] = (timeStr || '00:00').split(':').map(Number)
  const [y, mo, d] = dateKey.split('-').map(Number)
  return `${y}${pad(mo)}${pad(d)}T${pad(h)}${pad(m)}00`
}

function escapeIcsText(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function recurrenceRule(recurrence) {
  switch (recurrence) {
    case 'daily':
      return 'RRULE:FREQ=DAILY'
    case 'weekdays':
      return 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'
    case 'weekly':
      return 'RRULE:FREQ=WEEKLY'
    case 'yearly':
      return 'RRULE:FREQ=YEARLY'
    default:
      return null
  }
}

// Floating local time (no Z / TZID) — correct for a single-device personal
// planner where "3pm" always means 3pm on whichever device opens the event.
export function buildIcs(tasks) {
  const now = new Date()
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(
    now.getUTCHours()
  )}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`

  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AI Time Manager//RU', 'CALSCALE:GREGORIAN']

  for (const task of tasks) {
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${task.id}@ai-time-manager.local`)
    lines.push(`DTSTAMP:${stamp}`)
    lines.push(`DTSTART:${toIcsDateTime(task.date, task.startTime)}`)
    lines.push(`DURATION:PT${task.durationMinutes || 30}M`)
    lines.push(`SUMMARY:${escapeIcsText(task.title)}`)
    const rrule = recurrenceRule(task.recurrence)
    if (rrule) lines.push(rrule)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Scans a single day in fixed steps for the first gap that fits — same
// exact-date matching as buildScheduleContext in services/ai.js (recurring
// occurrences on that date aren't expanded either), so "no conflict here"
// means the same thing in both places.
export function findFreeSlotOnDate(tasks, date, durationMinutes, options = {}) {
  const { dayStartMinutes = 8 * 60, dayEndMinutes = 22 * 60, stepMinutes = 15 } = options

  const busy = tasks
    .filter((t) => t.date === date && t.startTime)
    .map((t) => ({
      start: timeToMinutes(t.startTime),
      end: timeToMinutes(t.startTime) + (t.durationMinutes || 30)
    }))

  for (let start = dayStartMinutes; start + durationMinutes <= dayEndMinutes; start += stepMinutes) {
    const end = start + durationMinutes
    const overlaps = busy.some((b) => start < b.end && b.start < end)
    if (!overlaps) return minutesToTime(start)
  }
  return null
}

import { occursOn } from './occurrences'

function toDateKey(date) {
  return date.toISOString().slice(0, 10)
}

// Counts consecutive completed occurrences ending at "today" (or "yesterday"
// if today's occurrence hasn't happened yet, so a not-yet-due task doesn't
// look like a broken streak). Non-occurrence days are skipped, not counted.
export function computeStreak(task, todayKey) {
  if (!task.recurrence) return 0
  const completed = new Set(task.completedDates || [])

  const cursor = new Date(`${todayKey}T00:00:00`)
  if (occursOn(task, todayKey) && !completed.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1)
  }

  let streak = 0
  while (true) {
    const key = toDateKey(cursor)
    if (key < task.date) break
    if (occursOn(task, key)) {
      if (!completed.has(key)) break
      streak++
    }
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

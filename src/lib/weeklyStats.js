import { expandOccurrences } from './occurrences'
import { toDateKey } from './date'

const WINDOW_DAYS = 7

// Trailing 7 days ending "today" (inclusive) — simpler and just as useful for
// a personal review as a strict Mon-Sun ISO week, and it works regardless of
// which day the review happens to be shown on.
export function computeWeeklyStats(tasks, today = new Date()) {
  const keys = Array.from({ length: WINDOW_DAYS }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (WINDOW_DAYS - 1 - i))
    return toDateKey(d)
  })

  const map = expandOccurrences(tasks, keys)
  const weekTasks = keys.flatMap((key) => map[key])

  const byCategory = {}
  const byPriority = { high: 0, medium: 0, low: 0 }
  let done = 0

  for (const task of weekTasks) {
    if (task.done) done++
    byPriority[task.priority] = (byPriority[task.priority] || 0) + 1
    const cat = task.category || 'other'
    byCategory[cat] = byCategory[cat] || { done: 0, total: 0 }
    byCategory[cat].total++
    if (task.done) byCategory[cat].done++
  }

  return { total: weekTasks.length, done, byCategory, byPriority }
}

export function toWeekKey(date) {
  // ISO week number — just needs to change once a week, not to be a
  // perfectly compliant ISO string.
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${weekNo}`
}

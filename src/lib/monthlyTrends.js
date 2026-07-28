import { expandOccurrences } from './occurrences'
import { toDateKey } from './date'

const BUSIEST_DAY_WINDOW_DAYS = 56 // ~8 weeks, enough to smooth out one-off busy days

function dateKeysBetween(start, end) {
  const keys = []
  const cursor = new Date(start)
  while (cursor <= end) {
    keys.push(toDateKey(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return keys
}

function completionRate(tasks, keys) {
  const map = expandOccurrences(tasks, keys)
  const all = keys.flatMap((k) => map[k])
  const done = all.filter((t) => t.done).length
  return { done, total: all.length, pct: all.length ? Math.round((done / all.length) * 100) : null }
}

// Month-to-date vs the full previous calendar month (not a rolling 30 days —
// "this month" should mean the same thing here as on a wall calendar), plus
// which weekday tends to carry the most tasks over the last ~8 weeks.
export function computeMonthlyTrend(tasks, today = new Date()) {
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)

  const thisMonth = completionRate(tasks, dateKeysBetween(thisMonthStart, today))
  const lastMonth = completionRate(tasks, dateKeysBetween(lastMonthStart, lastMonthEnd))

  const busiestWindowStart = new Date(today)
  busiestWindowStart.setDate(busiestWindowStart.getDate() - BUSIEST_DAY_WINDOW_DAYS)
  const keys = dateKeysBetween(busiestWindowStart, today)
  const map = expandOccurrences(tasks, keys)
  const countByWeekday = [0, 0, 0, 0, 0, 0, 0]
  for (const key of keys) {
    countByWeekday[new Date(`${key}T00:00:00`).getDay()] += map[key].length
  }
  const maxCount = Math.max(...countByWeekday)
  const busiestDay = maxCount > 0 ? countByWeekday.indexOf(maxCount) : null

  return { thisMonth, lastMonth, busiestDay }
}

// 0 (Sunday) .. 6 (Saturday) -> a real Date landing on that weekday, so the
// caller can format a localized weekday name with toLocaleDateString.
export function weekdayIndexToDate(day) {
  return new Date(2024, 0, 7 + day) // 2024-01-07 was a Sunday
}

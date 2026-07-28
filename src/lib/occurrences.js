// Recurring tasks are stored once (a template + a recurrence rule) rather than
// pre-generated per date, so occurrences are projected on demand for whichever
// date range the UI is currently showing.

import { toDateKey } from './date'

export function occursOn(task, dateKey) {
  if (!task.recurrence) return task.date === dateKey
  if (dateKey < task.date) return false

  if (task.recurrence === 'yearly') {
    return dateKey.slice(5) === task.date.slice(5) // compare MM-DD, year-independent
  }

  const day = new Date(`${dateKey}T00:00:00`).getDay()
  switch (task.recurrence) {
    case 'daily':
      return true
    case 'weekdays':
      return day >= 1 && day <= 5
    case 'weekly':
      return new Date(`${task.date}T00:00:00`).getDay() === day
    default:
      return false
  }
}

export function isOccurrenceDone(task, dateKey) {
  if (!task.recurrence) return task.done
  return (task.completedDates || []).includes(dateKey)
}

// Scans forward (inclusive of fromDateKey) for the next date this recurring
// task falls on — used to schedule a push reminder for a recurring task,
// since sendAt must always be a real future date/time, never the template's
// original (possibly long-past) anchor date.
export function nextOccurrenceOnOrAfter(task, fromDateKey) {
  if (!task.recurrence) return null
  const cursor = new Date(`${fromDateKey}T00:00:00`)
  for (let i = 0; i < 370; i++) {
    const key = toDateKey(cursor)
    if (occursOn(task, key)) return key
    cursor.setDate(cursor.getDate() + 1)
  }
  return null
}

// Returns { [dateKey]: occurrence[] }, each occurrence carrying the resolved
// `done` state and an `occurrenceDate` distinct from the template's own `date`.
export function expandOccurrences(tasks, dateKeys) {
  const map = {}
  for (const key of dateKeys) map[key] = []

  for (const task of tasks) {
    for (const key of dateKeys) {
      if (occursOn(task, key)) {
        map[key].push({ ...task, occurrenceDate: key, done: isOccurrenceDone(task, key) })
      }
    }
  }
  return map
}

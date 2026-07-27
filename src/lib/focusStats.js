import { toDateKey } from './date'

const FOCUS_MINUTES = 25

// Sessions are local-only (see useAppStore's partialize) — Pomodoro runs are
// tied to whichever device you're actually sitting at, unlike tasks/shopping
// which genuinely need to match across each person's devices.
export function computeFocusStats(sessions, today = new Date()) {
  const todayKey = toDateKey(today)
  const weekStart = new Date(today)
  weekStart.setDate(weekStart.getDate() - 6)
  const weekStartKey = toDateKey(weekStart)

  let todayMinutes = 0
  let weekMinutes = 0
  let weekSessions = 0

  for (const s of sessions) {
    if (s.date < weekStartKey || s.date > todayKey) continue
    weekMinutes += s.minutes
    weekSessions++
    if (s.date === todayKey) todayMinutes += s.minutes
  }

  return { todayMinutes, weekMinutes, weekSessions }
}

export function makeFocusSession(task, date = new Date()) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    taskId: task.id,
    taskTitle: task.title,
    minutes: FOCUS_MINUTES,
    date: toDateKey(date)
  }
}

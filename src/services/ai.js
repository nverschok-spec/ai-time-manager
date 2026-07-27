import { clearStoredToken, getStoredToken } from '../components/PinGate'
import { toDateKey } from '../lib/date'

const CONTEXT_WINDOW_DAYS = 7
const LOW_CONFIDENCE_THRESHOLD = 0.6

function buildScheduleContext(tasks, referenceDate = new Date()) {
  const start = new Date(referenceDate)
  start.setDate(start.getDate() - CONTEXT_WINDOW_DAYS)
  const end = new Date(referenceDate)
  end.setDate(end.getDate() + CONTEXT_WINDOW_DAYS)

  const startKey = toDateKey(start)
  const endKey = toDateKey(end)

  return tasks
    .filter((t) => t.date >= startKey && t.date <= endKey)
    .map((t) => ({
      date: t.date,
      start_time: t.startTime,
      duration_minutes: t.durationMinutes,
      title: t.title
    }))
}

function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function rangesOverlap(aStart, aDuration, bStart, bDuration) {
  const aEnd = aStart + aDuration
  const bEnd = bStart + bDuration
  return aStart < bEnd && bStart < aEnd
}

export async function parseUserInput(text, tasks, image) {
  const scheduleContext = buildScheduleContext(tasks)

  const token = getStoredToken()
  const res = await fetch('/api/ai-parse', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      text,
      scheduleContext,
      today: toDateKey(new Date()),
      image: image ? { base64: image.base64, mediaType: image.mediaType } : undefined
    })
  })

  if (res.status === 401) {
    clearStoredToken()
    window.location.reload()
    throw new Error('ai-parse request failed: 401')
  }

  if (!res.ok) {
    throw new Error(`ai-parse request failed: ${res.status}`)
  }

  const data = await res.json()
  const rawSuggestions = Array.isArray(data.suggestions) ? data.suggestions : []

  return rawSuggestions.map((s) => {
    const conflict = scheduleContext.some(
      (slot) =>
        slot.date === s.date &&
        rangesOverlap(
          timeToMinutes(s.start_time),
          s.duration_minutes,
          timeToMinutes(slot.start_time),
          slot.duration_minutes
        )
    )
    const lowConfidence = typeof s.confidence === 'number' && s.confidence < LOW_CONFIDENCE_THRESHOLD

    return { ...s, conflict, lowConfidence }
  })
}

// Wider window than buildScheduleContext (which only feeds conflict
// detection) — a reschedule instruction like "move next week's dentist
// appointment" needs enough of the task list in view to actually find it.
const RESCHEDULE_WINDOW_DAYS = 21

export async function fetchRescheduleOps(text, tasks) {
  const today = new Date()
  const start = new Date(today)
  start.setDate(start.getDate() - RESCHEDULE_WINDOW_DAYS)
  const end = new Date(today)
  end.setDate(end.getDate() + RESCHEDULE_WINDOW_DAYS)
  const startKey = toDateKey(start)
  const endKey = toDateKey(end)

  // Recurring templates are excluded: moving one would shift its recurrence
  // anchor date (e.g. which weekday a "weekly" series falls on) as a side
  // effect, which isn't what "reschedule this" means and is hard to undo.
  const context = tasks
    .filter((t) => !t.recurrence && t.date >= startKey && t.date <= endKey)
    .map((t) => ({
      id: t.id,
      title: t.title,
      date: t.date,
      start_time: t.startTime,
      category: t.category,
      priority: t.priority
    }))

  const token = getStoredToken()
  const res = await fetch('/api/ai-reschedule', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ text, tasks: context, today: toDateKey(today) })
  })

  if (res.status === 401) {
    clearStoredToken()
    window.location.reload()
    throw new Error('ai-reschedule request failed: 401')
  }
  if (!res.ok) {
    throw new Error(`ai-reschedule request failed: ${res.status}`)
  }

  const data = await res.json()
  const moves = Array.isArray(data.moves) ? data.moves : []
  const byId = new Map(tasks.map((t) => [t.id, t]))

  return moves
    .map((m) => {
      const task = byId.get(m.id)
      if (!task) return null
      return {
        id: m.id,
        title: task.title,
        oldDate: task.date,
        oldStartTime: task.startTime,
        newDate: m.new_date,
        newStartTime: m.new_start_time || task.startTime
      }
    })
    .filter(Boolean)
}

// Best-effort — returns '' on any failure so the caller can silently fall
// back to the plain stats card instead of blocking the weekly review.
export async function fetchWeeklyReview(stats, locale) {
  try {
    const token = getStoredToken()
    const res = await fetch('/api/ai-weekly-review', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ stats, locale })
    })
    if (!res.ok) return ''
    const data = await res.json()
    return data.review || ''
  } catch {
    return ''
  }
}

// Best-effort — returns '' on any failure so the caller can silently fall
// back to the plain task list instead of blocking the morning review.
export async function fetchDailyDigest(todayTasks, locale) {
  try {
    const token = getStoredToken()
    const res = await fetch('/api/ai-digest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        locale,
        tasks: todayTasks.map((t) => ({
          title: t.title,
          start_time: t.startTime,
          duration_minutes: t.durationMinutes,
          priority: t.priority
        }))
      })
    })
    if (!res.ok) return ''
    const data = await res.json()
    return data.digest || ''
  } catch {
    return ''
  }
}

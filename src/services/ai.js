import { clearStoredToken, getStoredToken } from '../components/PinGate'
import { toDateKey } from '../lib/date'
import { expandOccurrences } from '../lib/occurrences'

const CONTEXT_WINDOW_DAYS = 7
const LOW_CONFIDENCE_THRESHOLD = 0.6

// All AI calls go through one consolidated endpoint (see api/ai.js) — the
// Hobby plan caps a deployment at 12 serverless functions, and every
// standalone /api/ai-* file counted against that.
async function callAi(action, payload) {
  const token = getStoredToken()
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ action, ...payload })
  })

  if (res.status === 401) {
    clearStoredToken()
    window.location.reload()
    throw new Error(`ai ${action} request failed: 401`)
  }
  if (!res.ok) {
    throw new Error(`ai ${action} request failed: ${res.status}`)
  }
  return res.json()
}

// Same as callAi but never throws or forces a re-login — used by the
// best-effort digest/weekly-review calls that shouldn't block their UI over
// a background AI hiccup.
async function callAiSoft(action, payload) {
  try {
    const token = getStoredToken()
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ action, ...payload })
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

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

export async function parseUserInput(text, tasks, attachment) {
  const scheduleContext = buildScheduleContext(tasks)

  const data = await callAi('parse', {
    text,
    scheduleContext,
    today: toDateKey(new Date()),
    attachment: attachment ? { base64: attachment.base64, mediaType: attachment.mediaType } : undefined
  })
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

  const data = await callAi('reschedule', { text, tasks: context, today: toDateKey(today) })
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

// Wide enough window for "next week" / "in three weeks" style questions;
// unlike fetchRescheduleOps, recurring tasks ARE expanded into concrete
// occurrences here since a question like "when's my next yoga class" needs
// actual dates, not just the template.
const ASK_WINDOW_DAYS = 21

export async function fetchScheduleAnswer(question, tasks) {
  const today = new Date()
  const start = new Date(today)
  start.setDate(start.getDate() - ASK_WINDOW_DAYS)
  const end = new Date(today)
  end.setDate(end.getDate() + ASK_WINDOW_DAYS)

  const dateKeys = []
  const cursor = new Date(start)
  while (cursor <= end) {
    dateKeys.push(toDateKey(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  const occurrencesByDate = expandOccurrences(tasks, dateKeys)
  const context = dateKeys
    .flatMap((key) => occurrencesByDate[key])
    .map((t) => ({
      date: t.occurrenceDate,
      start_time: t.startTime,
      duration_minutes: t.durationMinutes,
      title: t.title,
      priority: t.priority,
      category: t.category,
      done: t.done
    }))

  const data = await callAi('ask', { question, tasks: context, today: toDateKey(today) })
  return data.answer || ''
}

// Best-effort — returns '' on any failure so the caller can silently fall
// back to the plain stats card instead of blocking the weekly review.
// `household` is the only cross-person context the AI ever sees for the
// partner — shared signals (upcoming family events, presence status,
// pending shopping count), never the partner's own private tasks.
export async function fetchWeeklyReview(stats, locale, household) {
  const data = await callAiSoft('weekly-review', { stats, locale, household })
  return data?.review || ''
}

// Best-effort — returns '' on any failure so the caller can silently fall
// back to the plain task list instead of blocking the morning review.
export async function fetchDailyDigest(todayTasks, locale) {
  const data = await callAiSoft('digest', {
    locale,
    tasks: todayTasks.map((t) => ({
      title: t.title,
      start_time: t.startTime,
      duration_minutes: t.durationMinutes,
      priority: t.priority
    }))
  })
  return data?.digest || ''
}

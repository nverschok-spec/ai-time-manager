import { clearStoredToken, getStoredToken } from '../components/PinGate'

const CONTEXT_WINDOW_DAYS = 7
const LOW_CONFIDENCE_THRESHOLD = 0.6

function toDateKey(date) {
  return date.toISOString().slice(0, 10)
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

export async function parseUserInput(text, tasks) {
  const scheduleContext = buildScheduleContext(tasks)

  const token = getStoredToken()
  const res = await fetch('/api/ai-parse', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ text, scheduleContext, today: toDateKey(new Date()) })
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

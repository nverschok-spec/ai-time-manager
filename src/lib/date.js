// Local calendar date as YYYY-MM-DD — deliberately NOT date.toISOString(),
// which converts to UTC first. For timezones ahead of UTC (e.g. Germany),
// that silently shifts the date back by one day (a local-midnight Date
// object always lands on the previous UTC day), so a task created "today"
// could get filed under yesterday. This reads the date the way the user's
// clock actually shows it.
export function toDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Adds minutes to a task's date+time, rolling over to the next day (or
// further) if it crosses midnight — used by the quick "snooze" action.
export function addMinutes(dateKey, startTime, minutesToAdd) {
  const [h, m] = (startTime || '00:00').split(':').map(Number)
  const base = new Date(`${dateKey}T00:00:00`)
  base.setHours(h, m + minutesToAdd)
  const newStartTime = `${String(base.getHours()).padStart(2, '0')}:${String(base.getMinutes()).padStart(2, '0')}`
  return { date: toDateKey(base), startTime: newStartTime }
}

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

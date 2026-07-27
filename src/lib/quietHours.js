// Push timestamps are computed client-side as absolute epoch ms (see
// scheduleReminder in lib/push.js) since the server has no idea what
// timezone the user is in — quiet hours are applied the same way, against
// the reminder's local wall-clock time, before it's ever sent to the server.
export function applyQuietHours(sendAt, { enabled, start, end }) {
  if (!enabled) return sendAt

  const d = new Date(sendAt)
  const minutes = d.getHours() * 60 + d.getMinutes()
  const [startH, startM] = start.split(':').map(Number)
  const [endH, endM] = end.split(':').map(Number)
  const startMin = startH * 60 + startM
  const endMin = endH * 60 + endM

  const inQuiet = startMin > endMin ? minutes >= startMin || minutes < endMin : minutes >= startMin && minutes < endMin
  if (!inQuiet) return sendAt

  const result = new Date(d)
  result.setHours(endH, endM, 0, 0)
  if (result.getTime() <= sendAt) result.setDate(result.getDate() + 1)
  return result.getTime()
}

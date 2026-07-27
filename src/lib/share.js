// One task, shared via the OS share sheet (Messages/WhatsApp/etc) as plain
// text — no backend involved, so it works even though each person's tasks
// are otherwise private to them (see useAppStore's per-person Redis keys).
function buildShareText(task) {
  const lines = [task.title, `${task.date} ${task.startTime || ''}`.trim()]
  if (task.notes) lines.push(task.notes)
  return lines.join('\n')
}

export async function shareText(text, title) {
  if (navigator.share) {
    try {
      await navigator.share({ text, title })
      return 'shared'
    } catch {
      return 'cancelled'
    }
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return 'copied'
  }
  return 'unsupported'
}

export function shareTask(task) {
  return shareText(buildShareText(task), task.title)
}

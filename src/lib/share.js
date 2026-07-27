// One task, shared via the OS share sheet (Messages/WhatsApp/etc) as plain
// text — no backend involved, so it works even though each person's tasks
// are otherwise private to them (see useAppStore's per-person Redis keys).
function buildShareText(task) {
  const lines = [task.title, `${task.date} ${task.startTime || ''}`.trim()]
  if (task.notes) lines.push(task.notes)
  return lines.join('\n')
}

export async function shareTask(task) {
  const text = buildShareText(task)
  if (navigator.share) {
    try {
      await navigator.share({ text, title: task.title })
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

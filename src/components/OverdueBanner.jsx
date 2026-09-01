import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarClock, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { toDateKey } from '../lib/date'

export default function OverdueBanner() {
  const { t } = useTranslation()
  const tasks = useAppStore((s) => s.tasks)
  const updateTask = useAppStore((s) => s.updateTask)
  const [dismissed, setDismissed] = useState(false)

  const todayKey = toDateKey(new Date())

  const overdueTasks = useMemo(
    () => tasks.filter((task) => !task.recurrence && !task.done && task.date < todayKey),
    [tasks, todayKey]
  )

  if (dismissed || overdueTasks.length === 0) return null

  function handleMoveAll() {
    for (const task of overdueTasks) {
      updateTask(task.id, { date: todayKey })
    }
    setDismissed(true)
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-priority-medium/30 bg-priority-medium/10 px-3 py-2.5">
      <CalendarClock size={18} className="shrink-0 text-priority-medium" />
      <p className="min-w-0 flex-1 text-sm text-priority-medium">
        {t('calendar.overdue_message', { count: overdueTasks.length })}
      </p>
      <button
        type="button"
        onClick={handleMoveAll}
        className="rounded-full bg-priority-medium px-2.5 py-1 text-xs font-medium text-app-bg hover:brightness-110 transition-all"
      >
        {t('calendar.overdue_move')}
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={t('ask.dismiss')}
        className="p-1 text-priority-medium/70 hover:text-priority-medium transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  )
}

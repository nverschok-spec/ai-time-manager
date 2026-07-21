import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarClock, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

function toDateKey(date) {
  return date.toISOString().slice(0, 10)
}

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
    <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
      <CalendarClock size={18} className="shrink-0 text-amber-400" />
      <p className="flex-1 text-sm text-amber-200">
        {t('calendar.overdue_message', { count: overdueTasks.length })}
      </p>
      <button
        type="button"
        onClick={handleMoveAll}
        className="rounded-md bg-amber-500 px-2.5 py-1 text-xs font-medium text-slate-950 hover:bg-amber-400 transition-colors"
      >
        {t('calendar.overdue_move')}
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-amber-400/70 hover:text-amber-200 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  )
}

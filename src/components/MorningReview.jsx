import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Sun } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { expandOccurrences } from '../lib/occurrences'
import { priorityMeta } from '../lib/priority'

function toDateKey(date) {
  return date.toISOString().slice(0, 10)
}

export default function MorningReview() {
  const { t } = useTranslation()
  const tasks = useAppStore((s) => s.tasks)
  const lastReviewDate = useAppStore((s) => s.lastReviewDate)
  const setLastReviewDate = useAppStore((s) => s.setLastReviewDate)
  const updateTask = useAppStore((s) => s.updateTask)

  const todayKey = toDateKey(new Date())

  const todayTasks = useMemo(() => {
    const map = expandOccurrences(tasks, [todayKey])
    return map[todayKey].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
  }, [tasks, todayKey])

  if (lastReviewDate === todayKey) return null

  function handlePostpone(task) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    updateTask(task.id, { date: toDateKey(tomorrow) })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-xl bg-slate-800 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sun size={20} className="text-amber-400" />
          <h2 className="text-base font-semibold text-slate-100">{t('morning.title')}</h2>
        </div>

        {todayTasks.length === 0 ? (
          <p className="text-sm text-slate-400">{t('morning.empty')}</p>
        ) : (
          <ul className="space-y-1.5 max-h-64 overflow-y-auto">
            {todayTasks.map((task) => {
              const meta = priorityMeta(task.priority)
              const Icon = meta.icon
              return (
                <li
                  key={task.id}
                  className="flex items-center gap-2 rounded-md bg-slate-900/60 px-2.5 py-1.5"
                >
                  <Icon size={13} color={meta.color} className="shrink-0" />
                  <span className="text-sm text-slate-400 tabular-nums">{task.startTime}</span>
                  <span className="flex-1 text-sm text-slate-100 truncate">{task.title}</span>
                  {!task.recurrence && (
                    <button
                      type="button"
                      onClick={() => handlePostpone(task)}
                      className="text-xs text-slate-500 hover:text-amber-300 transition-colors"
                    >
                      {t('morning.postpone')}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <button
          type="button"
          onClick={() => setLastReviewDate(todayKey)}
          className="w-full rounded-md bg-emerald-500 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 transition-colors"
        >
          {t('morning.start')}
        </button>
      </div>
    </div>
  )
}

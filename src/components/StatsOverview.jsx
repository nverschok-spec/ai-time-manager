import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/useAppStore'
import { PRIORITY_ORDER, priorityMeta } from '../lib/priority'
import ProgressCircle from './ProgressCircle'

function toDateKey(date) {
  return date.toISOString().slice(0, 10)
}

export default function StatsOverview() {
  const { t } = useTranslation()
  const tasks = useAppStore((s) => s.tasks)

  const { today, week, byPriority } = useMemo(() => {
    const todayKey = toDateKey(new Date())
    const weekKeys = new Set(
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() + i)
        return toDateKey(d)
      })
    )

    const todayTasks = tasks.filter((t) => t.date === todayKey)
    const weekTasks = tasks.filter((t) => weekKeys.has(t.date))

    const counts = { high: 0, medium: 0, low: 0 }
    for (const task of weekTasks) {
      counts[task.priority] = (counts[task.priority] || 0) + 1
    }

    return {
      today: { done: todayTasks.filter((t) => t.done).length, total: todayTasks.length },
      week: { done: weekTasks.filter((t) => t.done).length, total: weekTasks.length },
      byPriority: counts
    }
  }, [tasks])

  const priorityTotal = byPriority.high + byPriority.medium + byPriority.low

  return (
    <div className="rounded-lg bg-slate-800/40 p-4 space-y-4">
      <div className="flex items-center gap-4">
        <ProgressCircle done={today.done} total={today.total} />
        <div className="flex-1 space-y-2">
          <div>
            <p className="text-xs text-slate-500">{t('stats.today')}</p>
            <p className="text-sm text-slate-300">
              {today.done}/{today.total}
            </p>
          </div>
          <div className="border-t border-slate-700/60 pt-2">
            <p className="text-xs text-slate-500">{t('stats.week')}</p>
            <p className="text-lg font-semibold text-slate-100 tabular-nums">
              {week.done}/{week.total}
            </p>
          </div>
        </div>
      </div>

      {priorityTotal > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-1.5">{t('stats.by_priority')}</p>
          <div className="flex h-2.5 gap-0.5">
            {PRIORITY_ORDER.map((p) => {
              const count = byPriority[p]
              if (!count) return null
              const meta = priorityMeta(p)
              return (
                <div
                  key={p}
                  className="rounded-full"
                  style={{ width: `${(count / priorityTotal) * 100}%`, backgroundColor: meta.color }}
                />
              )
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {PRIORITY_ORDER.map((p) => {
              const count = byPriority[p]
              if (!count) return null
              const meta = priorityMeta(p)
              const Icon = meta.icon
              return (
                <span key={p} className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Icon size={12} color={meta.color} />
                  {t(meta.labelKey)} · {count}
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

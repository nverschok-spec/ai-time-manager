import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Timer } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { PRIORITY_ORDER, priorityMeta } from '../lib/priority'
import { expandOccurrences } from '../lib/occurrences'
import { computeFocusStats } from '../lib/focusStats'
import { computeMonthlyTrend, computeYearToDate } from '../lib/monthlyTrends'
import ProgressCircle from './ProgressCircle'
import WeatherBadge from './WeatherBadge'
import { toDateKey } from '../lib/date'

export default function StatsOverview() {
  const { t } = useTranslation()
  const tasks = useAppStore((s) => s.tasks)
  const focusSessions = useAppStore((s) => s.focusSessions)
  const focusStats = useMemo(() => computeFocusStats(focusSessions), [focusSessions])

  const { today, week, byPriority } = useMemo(() => {
    const todayKey = toDateKey(new Date())
    const weekDateKeys = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() + i)
      return toDateKey(d)
    })

    const occurrencesByDate = expandOccurrences(tasks, weekDateKeys)
    const todayTasks = occurrencesByDate[todayKey]
    const weekTasks = weekDateKeys.flatMap((key) => occurrencesByDate[key])

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

  // Separate from the week stat above — the 12-week heatmap has no view
  // past ~3 months, so "how's this month/year going" had nowhere to live.
  const monthYearStats = useMemo(() => {
    const now = new Date()
    return { month: computeMonthlyTrend(tasks, now).thisMonth, year: computeYearToDate(tasks, now) }
  }, [tasks])

  return (
    <div className="rounded-3xl border border-white/5 bg-app-card p-4 space-y-4">
      <div className="flex items-center gap-4">
        <ProgressCircle done={today.done} total={today.total} />
        <div className="flex-1 space-y-2">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">{t('stats.today')}</p>
              <WeatherBadge />
            </div>
            <p className="text-sm text-slate-300">
              {today.done}/{today.total}
            </p>
          </div>
          <div className="border-t border-white/5 pt-2">
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

      {(monthYearStats.month.total > 0 || monthYearStats.year.total > 0) && (
        <div className="flex gap-4 border-t border-white/5 pt-3 text-xs text-slate-400">
          {monthYearStats.month.total > 0 && (
            <span>
              {t('stats.month')}:{' '}
              <span className="tabular-nums text-slate-200">
                {monthYearStats.month.done}/{monthYearStats.month.total}
              </span>
            </span>
          )}
          {monthYearStats.year.total > 0 && (
            <span>
              {t('stats.year')}:{' '}
              <span className="tabular-nums text-slate-200">
                {monthYearStats.year.done}/{monthYearStats.year.total}
              </span>
            </span>
          )}
        </div>
      )}

      {focusStats.weekMinutes > 0 && (
        <div className="flex items-center gap-1.5 border-t border-white/5 pt-3 text-xs text-slate-400">
          <Timer size={13} className="shrink-0 text-brand-cta" />
          <span>
            {t('stats.focus', { today: focusStats.todayMinutes, week: focusStats.weekMinutes })}
          </span>
        </div>
      )}
    </div>
  )
}

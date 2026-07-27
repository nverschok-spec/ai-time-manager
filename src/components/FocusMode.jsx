import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { expandOccurrences } from '../lib/occurrences'
import { toDateKey } from '../lib/date'
import { priorityMeta } from '../lib/priority'
import { vibrate, HAPTIC } from '../lib/haptics'

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }

// Deliberately not a full TaskRow (icons for timer/reminder/edit/delete would
// defeat the point) — just the single most important thing left today, and
// one big button to clear it.
export default function FocusMode() {
  const { t } = useTranslation()
  const tasks = useAppStore((s) => s.tasks)
  const toggleTask = useAppStore((s) => s.toggleTask)
  const toggleTaskOccurrence = useAppStore((s) => s.toggleTaskOccurrence)
  const todayKey = toDateKey(new Date())

  const { topTask, remaining } = useMemo(() => {
    const todayTasks = expandOccurrences(tasks, [todayKey])[todayKey].filter((t) => !t.done)
    const sorted = [...todayTasks].sort(
      (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || (a.startTime || '').localeCompare(b.startTime || '')
    )
    return { topTask: sorted[0], remaining: sorted.length - 1 }
  }, [tasks, todayKey])

  function handleDone() {
    vibrate(HAPTIC.success)
    if (topTask.recurrence) toggleTaskOccurrence(topTask.id, topTask.occurrenceDate)
    else toggleTask(topTask.id)
  }

  if (!topTask) {
    return <p className="py-16 text-center text-sm text-slate-400">{t('focus.empty')}</p>
  }

  const meta = priorityMeta(topTask.priority)
  const Icon = meta.icon

  return (
    <div className="space-y-3 rounded-3xl border border-white/5 bg-app-card p-6 text-center">
      <p className="text-xs uppercase tracking-wide text-slate-500">{t('focus.now')}</p>
      <div className="space-y-1">
        <p className="text-xl font-semibold text-slate-100">
          {topTask.emoji && <span className="mr-1.5">{topTask.emoji}</span>}
          {topTask.title}
        </p>
        <p className="flex items-center justify-center gap-1.5 text-sm text-slate-400 tabular-nums">
          <Icon size={13} color={meta.color} />
          {topTask.startTime}
        </p>
      </div>
      {topTask.notes && <p className="text-sm text-slate-500">{topTask.notes}</p>}
      <button
        type="button"
        onClick={handleDone}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-cta py-3 text-base font-semibold text-app-bg hover:brightness-110 transition-all"
      >
        <Check size={18} /> {t('focus.mark_done')}
      </button>
      {remaining > 0 && <p className="text-xs text-slate-500">{t('focus.remaining', { count: remaining })}</p>}
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sun } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { expandOccurrences } from '../lib/occurrences'
import { priorityMeta } from '../lib/priority'
import { fetchDailyDigest } from '../services/ai'
import { toDateKey } from '../lib/date'

export default function MorningReview() {
  const { t, i18n } = useTranslation()
  const tasks = useAppStore((s) => s.tasks)
  const lastReviewDate = useAppStore((s) => s.lastReviewDate)
  const setLastReviewDate = useAppStore((s) => s.setLastReviewDate)
  const updateTask = useAppStore((s) => s.updateTask)
  const [digest, setDigest] = useState('')
  const [digestLoading, setDigestLoading] = useState(false)

  const todayKey = toDateKey(new Date())

  const todayTasks = useMemo(() => {
    const map = expandOccurrences(tasks, [todayKey])
    return map[todayKey].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
  }, [tasks, todayKey])

  useEffect(() => {
    if (lastReviewDate === todayKey) return
    let cancelled = false
    setDigestLoading(true)
    fetchDailyDigest(todayTasks, i18n.resolvedLanguage).then((text) => {
      if (!cancelled) {
        setDigest(text)
        setDigestLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayKey])

  if (lastReviewDate === todayKey) return null

  function handlePostpone(task) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    updateTask(task.id, { date: toDateKey(tomorrow) })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl border border-white/5 bg-app-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sun size={20} className="text-priority-medium" />
          <h2 className="text-base font-semibold text-slate-100">{t('morning.title')}</h2>
        </div>

        {digestLoading ? (
          <p className="text-sm italic text-muted">{t('morning.digest_loading')}</p>
        ) : (
          digest && <p className="text-sm text-slate-200">{digest}</p>
        )}

        {todayTasks.length === 0 ? (
          <p className="text-sm text-slate-400">{t('morning.empty')}</p>
        ) : (
          <ul className="space-y-1.5 max-h-64 overflow-y-auto overflow-x-hidden">
            {todayTasks.map((task) => {
              const meta = priorityMeta(task.priority)
              const Icon = meta.icon
              return (
                <li
                  key={task.id}
                  className="flex items-center gap-2 rounded-md bg-app-bg/60 px-2.5 py-1.5"
                >
                  <Icon size={13} color={meta.color} className="shrink-0" />
                  <span className="text-sm text-slate-400 tabular-nums">{task.startTime}</span>
                  <span className="flex-1 text-sm text-slate-100 truncate">{task.title}</span>
                  {!task.recurrence && (
                    <button
                      type="button"
                      onClick={() => handlePostpone(task)}
                      className="text-xs text-slate-500 hover:text-priority-medium transition-colors"
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
          className="w-full rounded-full bg-brand-cta py-2 text-sm font-medium text-app-bg hover:brightness-110 transition-all"
        >
          {t('morning.start')}
        </button>
      </div>
    </div>
  )
}

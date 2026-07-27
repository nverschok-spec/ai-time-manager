import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarCheck } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { computeWeeklyStats, toWeekKey } from '../lib/weeklyStats'
import { categoryMeta } from '../lib/categories'
import { fetchWeeklyReview } from '../services/ai'

// Shown once per week, on the first open that lands on Sunday or Monday —
// broad enough to catch most people without nagging on the other 5 days.
export default function WeeklyReview() {
  const { t, i18n } = useTranslation()
  const tasks = useAppStore((s) => s.tasks)
  const lastWeeklyReviewWeek = useAppStore((s) => s.lastWeeklyReviewWeek)
  const setLastWeeklyReviewWeek = useAppStore((s) => s.setLastWeeklyReviewWeek)
  const [review, setReview] = useState('')
  const [loading, setLoading] = useState(false)

  const today = new Date()
  const currentWeekKey = toWeekKey(today)
  const isReviewDay = today.getDay() === 0 || today.getDay() === 1
  const shouldShow = isReviewDay && lastWeeklyReviewWeek !== currentWeekKey

  const stats = useMemo(() => computeWeeklyStats(tasks, today), [tasks]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!shouldShow) return
    let cancelled = false
    setLoading(true)
    fetchWeeklyReview(stats, i18n.resolvedLanguage).then((text) => {
      if (!cancelled) {
        setReview(text)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShow, currentWeekKey])

  if (!shouldShow) return null

  const categories = Object.entries(stats.byCategory)
  const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl border border-white/5 bg-app-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <CalendarCheck size={20} className="text-brand-cta" />
          <h2 className="text-base font-semibold text-slate-100">{t('weekly.title')}</h2>
        </div>

        {pct !== null && (
          <p className="text-3xl font-semibold tabular-nums text-slate-100">
            {stats.done}/{stats.total}{' '}
            <span className="text-sm font-normal text-slate-500">({pct}%)</span>
          </p>
        )}

        {loading ? (
          <p className="text-sm italic text-muted">{t('weekly.loading')}</p>
        ) : (
          review && <p className="text-sm text-slate-200">{review}</p>
        )}

        {categories.length > 0 && (
          <div className="space-y-1.5">
            {categories.map(([cat, c]) => {
              const meta = categoryMeta(cat)
              const Icon = meta?.icon
              return (
                <div key={cat} className="flex items-center gap-2 text-xs text-slate-400">
                  {Icon && <Icon size={12} color={meta.color} className="shrink-0" />}
                  <span className="w-16 shrink-0 truncate">{meta ? t(meta.labelKey) : cat}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-app-bg">
                    <div
                      className="h-full rounded-full bg-brand-cta"
                      style={{ width: `${c.total ? (c.done / c.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="shrink-0 tabular-nums">
                    {c.done}/{c.total}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => setLastWeeklyReviewWeek(currentWeekKey)}
          className="w-full rounded-full bg-brand-cta py-2 text-sm font-medium text-app-bg hover:brightness-110 transition-all"
        >
          {t('weekly.close')}
        </button>
      </div>
    </div>
  )
}

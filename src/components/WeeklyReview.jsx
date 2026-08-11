import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarCheck, Share2, TrendingDown, TrendingUp } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { computeWeeklyStats, toWeekKey } from '../lib/weeklyStats'
import { computeMonthlyTrend, weekdayIndexToDate } from '../lib/monthlyTrends'
import { categoryMeta } from '../lib/categories'
import { fetchWeeklyReview } from '../services/ai'
import { shareText } from '../lib/share'
import { toDateKey } from '../lib/date'

// Shown once per week, on the first open that lands on Sunday or Monday —
// broad enough to catch most people without nagging on the other 5 days.
export default function WeeklyReview() {
  const { t, i18n } = useTranslation()
  const tasks = useAppStore((s) => s.tasks)
  const familyEvents = useAppStore((s) => s.familyEvents)
  const shoppingItems = useAppStore((s) => s.shoppingItems)
  const people = useAppStore((s) => s.people)
  const person = useAppStore((s) => s.person)
  const lastWeeklyReviewWeek = useAppStore((s) => s.lastWeeklyReviewWeek)
  const setLastWeeklyReviewWeek = useAppStore((s) => s.setLastWeeklyReviewWeek)
  const [review, setReview] = useState('')
  const [loading, setLoading] = useState(false)

  const today = new Date()
  const currentWeekKey = toWeekKey(today)
  const isReviewDay = today.getDay() === 0 || today.getDay() === 1
  const shouldShow = isReviewDay && lastWeeklyReviewWeek !== currentWeekKey

  const stats = useMemo(() => computeWeeklyStats(tasks, today), [tasks]) // eslint-disable-line react-hooks/exhaustive-deps
  const monthlyTrend = useMemo(() => computeMonthlyTrend(tasks, today), [tasks]) // eslint-disable-line react-hooks/exhaustive-deps

  // The only partner-related data point ever sent to the AI — shared family
  // events, their coarse presence status, and a shared-list count. Never
  // their private tasks (see fetchWeeklyReview).
  const todayKey = toDateKey(today)
  const weekAheadKey = toDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7))
  const partner = people.find((p) => p.id !== person?.id)
  const householdContext = {
    upcomingFamilyEvents: familyEvents
      .filter((e) => e.date >= todayKey && e.date <= weekAheadKey)
      .map((e) => ({ title: e.title, date: e.date })),
    partnerStatus: partner ? { name: partner.name, status: partner.status || null } : null,
    pendingShoppingCount: shoppingItems.filter((i) => !i.done).length
  }

  useEffect(() => {
    if (!shouldShow) return
    let cancelled = false
    setLoading(true)
    fetchWeeklyReview(stats, i18n.resolvedLanguage, householdContext).then((text) => {
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

  function handleShare() {
    const lines = [t('weekly.title'), `${stats.done}/${stats.total}${pct !== null ? ` (${pct}%)` : ''}`]
    if (review) lines.push(review)
    shareText(lines.join('\n'), t('weekly.title'))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl border border-white/5 bg-app-card p-5 space-y-4 animate-modal-in">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarCheck size={20} className="text-brand-cta" />
            <h2 className="text-base font-semibold text-slate-100">{t('weekly.title')}</h2>
          </div>
          <button
            type="button"
            onClick={handleShare}
            className="shrink-0 text-slate-500 hover:text-brand-cta transition-colors"
          >
            <Share2 size={16} />
          </button>
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

        {(monthlyTrend.thisMonth.pct !== null && monthlyTrend.lastMonth.pct !== null) ||
        monthlyTrend.busiestDay !== null ? (
          <div className="space-y-1 border-t border-white/5 pt-3 text-xs text-slate-500">
            {monthlyTrend.thisMonth.pct !== null && monthlyTrend.lastMonth.pct !== null && (
              <p className="flex items-center gap-1.5">
                {monthlyTrend.thisMonth.pct >= monthlyTrend.lastMonth.pct ? (
                  <TrendingUp size={13} className="shrink-0 text-brand-cta" />
                ) : (
                  <TrendingDown size={13} className="shrink-0 text-priority-medium" />
                )}
                {t('weekly.month_trend', {
                  thisPct: monthlyTrend.thisMonth.pct,
                  lastPct: monthlyTrend.lastMonth.pct
                })}
              </p>
            )}
            {monthlyTrend.busiestDay !== null && (
              <p>
                {t('weekly.busiest_day', {
                  day: weekdayIndexToDate(monthlyTrend.busiestDay).toLocaleDateString(i18n.resolvedLanguage, {
                    weekday: 'long'
                  })
                })}
              </p>
            )}
          </div>
        ) : null}

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

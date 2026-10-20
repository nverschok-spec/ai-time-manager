import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Sparkles } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { computeHealthWeeklySummary } from '../../lib/health'
import { fetchHealthWeeklyReview } from '../../services/ai'
import { toDateKey } from '../../lib/date'

// On-demand button (plus the Sunday "weekly_review" pinok nudging the user
// to open it) — sends only the pre-aggregated weekly numbers, never raw
// daily logs, to api/ai.js's health-weekly-review action.
export default function HealthWeeklyReview() {
  const { t } = useTranslation()
  const health = useAppStore((s) => s.health)
  const study = useAppStore((s) => s.study)
  const addHealthReview = useAppStore((s) => s.addHealthReview)
  const [loading, setLoading] = useState(false)
  const [review, setReview] = useState(null)

  async function handleRun() {
    setLoading(true)
    const summary = computeHealthWeeklySummary(health, study)
    const text = await fetchHealthWeeklyReview(summary)
    setLoading(false)
    if (!text) return
    setReview(text)
    addHealthReview({ dateKey: toDateKey(new Date()), text })
  }

  return (
    <div className="space-y-3 rounded-3xl border border-white/[0.06] bg-app-card p-4">
      <button
        type="button"
        onClick={handleRun}
        disabled={loading}
        className="flex w-full items-center justify-center gap-1.5 rounded-full bg-brand-cta py-2 text-sm font-medium text-brand-ctaForeground transition-all hover:brightness-110 disabled:opacity-60"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {t('health.weekly_review_button')}
      </button>

      {review && <p className="text-sm text-slate-200">{review}</p>}

      {(health.reviewHistory || []).length > 0 && (
        <div className="space-y-1.5 border-t border-white/[0.06] pt-3">
          <p className="text-xs text-slate-500">{t('health.weekly_review_history')}</p>
          {health.reviewHistory
            .slice(-5)
            .reverse()
            .map((r, i) => (
              <p key={i} className="text-xs text-slate-500">
                <span className="tabular-nums">{r.dateKey}</span> — {r.text}
              </p>
            ))}
        </div>
      )}
    </div>
  )
}

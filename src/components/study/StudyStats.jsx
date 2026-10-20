import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store/useAppStore'
import { blockStats } from '../../lib/testBank'

// Weakest block first, per the spec — a flat list reads the "where am I
// behind" answer faster than a chart would for just a handful of blocks.
export default function StudyStats({ topicSlug }) {
  const { t, i18n } = useTranslation()
  const answerLog = useAppStore((s) => s.study.answerLog)
  const attempts = useAppStore((s) => s.study.attempts)

  const stats = useMemo(() => blockStats(answerLog, topicSlug), [answerLog, topicSlug])
  const topicAttempts = useMemo(
    () =>
      attempts
        .filter((a) => a.topicSlug === topicSlug)
        .slice(-10)
        .reverse(),
    [attempts, topicSlug]
  )

  return (
    <div className="space-y-4">
      {stats.length > 0 ? (
        <div className="space-y-3 rounded-3xl border border-white/[0.06] bg-app-card p-4">
          <p className="text-xs text-slate-500">{t('study.stats_by_block')}</p>
          {stats.map((s) => (
            <div key={s.block} className="space-y-1">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>{s.block}</span>
                <span className="tabular-nums text-slate-400">{s.pct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-app-bg">
                <div
                  className={`h-full rounded-full ${s.pct < 60 ? 'bg-priority-high' : 'bg-brand-cta'}`}
                  style={{ width: `${s.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm italic text-slate-600">{t('study.stats_empty')}</p>
      )}

      {topicAttempts.length > 0 && (
        <div className="space-y-2 rounded-3xl border border-white/[0.06] bg-app-card p-4">
          <p className="text-xs text-slate-500">{t('study.attempt_history')}</p>
          {topicAttempts.map((a) => (
            <div key={a.id} className="flex items-center justify-between text-sm text-slate-300">
              <span>
                {new Date(`${a.dateKey}T00:00:00`).toLocaleDateString(i18n.resolvedLanguage, {
                  day: 'numeric',
                  month: 'short'
                })}
              </span>
              <span className="tabular-nums text-slate-400">
                {a.correct}/{a.total}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

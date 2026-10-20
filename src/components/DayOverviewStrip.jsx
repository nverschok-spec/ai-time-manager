import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/useAppStore'
import { dayCompletionRatio } from '../lib/health'
import { toDateKey } from '../lib/date'

// "Мой день" strip — one glance at tasks + health + study, tapping jumps
// to the Tracker tab. Lives at the top of TodayPage rather than being a
// separate page, per the Этап 5 plan.
export default function DayOverviewStrip({ todayTasks, onOpenTracker }) {
  const { t } = useTranslation()
  const dailyLog = useAppStore((s) => s.health.dailyLog)
  const answerLog = useAppStore((s) => s.study.answerLog)
  const dailyGoalQuestions = useAppStore((s) => s.study.settings.dailyGoalQuestions)

  const todayKey = toDateKey(new Date())
  const healthRatio = useMemo(() => dayCompletionRatio(dailyLog[todayKey]), [dailyLog, todayKey])
  const questionsToday = useMemo(
    () => answerLog.filter((a) => a.dateKey === todayKey).length,
    [answerLog, todayKey]
  )
  const studyRatio = Math.min(1, questionsToday / (dailyGoalQuestions || 15))
  const tasksDone = todayTasks.filter((t) => t.done).length
  const tasksRatio = todayTasks.length ? tasksDone / todayTasks.length : 0

  const items = [
    { key: 'tasks', label: t('day_overview.tasks'), ratio: tasksRatio },
    { key: 'health', label: t('day_overview.health'), ratio: healthRatio },
    { key: 'study', label: t('day_overview.study'), ratio: studyRatio }
  ]

  return (
    <button
      type="button"
      onClick={onOpenTracker}
      className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.06] bg-app-card p-3 text-left transition-colors active:scale-[0.99] hover:bg-app-cardMuted"
    >
      {items.map((item) => (
        <div key={item.key} className="flex-1 space-y-1">
          <p className="text-[11px] text-slate-500">{item.label}</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-app-bg">
            <div
              className="h-full rounded-full bg-brand-cta transition-all duration-300"
              style={{ width: `${item.ratio * 100}%` }}
            />
          </div>
        </div>
      ))}
    </button>
  )
}

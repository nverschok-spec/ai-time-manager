import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { toDateKey } from '../lib/date'
import AiSuggestionCard from './AiSuggestionCard'
import AiRescheduleCard from './AiRescheduleCard'
import AiAnswerCard from './AiAnswerCard'
import OverdueBanner from './OverdueBanner'

// These four cards render independently above whichever page is active.
// Normally at most one is live at a time, so showing it directly is fine —
// but an AI suggestion landing right as an overdue nudge is already up (or
// any other overlap) used to just stack every card on screen at once. Once
// two or more are simultaneously active, collapse them behind a single
// summary bar instead.
export default function AiActivityStack() {
  const { t } = useTranslation()
  const suggestions = useAppStore((s) => s.suggestions)
  const rescheduleOps = useAppStore((s) => s.rescheduleOps)
  const scheduleAnswer = useAppStore((s) => s.scheduleAnswer)
  const tasks = useAppStore((s) => s.tasks)
  const [expanded, setExpanded] = useState(false)

  const todayKey = toDateKey(new Date())
  const overdueCount = useMemo(
    () => tasks.filter((task) => !task.recurrence && !task.done && task.date < todayKey).length,
    [tasks, todayKey]
  )

  const activeCount = [suggestions.length > 0, rescheduleOps.length > 0, Boolean(scheduleAnswer), overdueCount > 0].filter(
    Boolean
  ).length

  if (activeCount === 0) return null

  if (activeCount === 1) {
    return (
      <>
        <AiSuggestionCard />
        <AiRescheduleCard />
        <AiAnswerCard />
        <OverdueBanner />
      </>
    )
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl border border-brand-cta/20 bg-brand-cta/10 px-3 py-2.5 text-sm font-medium text-brand-cta"
      >
        <span className="flex items-center gap-1.5">
          <Sparkles size={14} />
          {t('ai_stack.summary', { count: activeCount })}
        </span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {expanded && (
        <>
          <AiSuggestionCard />
          <AiRescheduleCard />
          <AiAnswerCard />
          <OverdueBanner />
        </>
      )}
    </div>
  )
}

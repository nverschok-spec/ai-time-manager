import { useTranslation } from 'react-i18next'
import { AlertTriangle, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { shouldShowHardKick } from '../lib/health'
import { toDateKey } from '../lib/date'

// Pure client-side check against yesterday's log, per the spec — no new
// server-side cron/check, just computed once at app open.
export default function HardKickBanner() {
  const { t } = useTranslation()
  const dailyLog = useAppStore((s) => s.health.dailyLog)
  const answerLog = useAppStore((s) => s.study.answerLog)
  const lastHardKickDismissedDate = useAppStore((s) => s.lastHardKickDismissedDate)
  const setLastHardKickDismissedDate = useAppStore((s) => s.setLastHardKickDismissedDate)

  const todayKey = toDateKey(new Date())
  if (lastHardKickDismissedDate === todayKey) return null
  if (!shouldShowHardKick(dailyLog, answerLog, todayKey)) return null

  return (
    <div className="flex items-start gap-2 rounded-2xl border border-priority-medium/30 bg-priority-medium/10 p-3 text-sm text-slate-200">
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-priority-medium" />
      <span className="flex-1">{t('health.hard_kick')}</span>
      <button
        type="button"
        onClick={() => setLastHardKickDismissedDate(todayKey)}
        aria-label={t('ask.dismiss')}
        className="shrink-0 text-slate-500 transition-colors hover:text-slate-300"
      >
        <X size={14} />
      </button>
    </div>
  )
}

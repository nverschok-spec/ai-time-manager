import { useTranslation } from 'react-i18next'
import { MessageCircleQuestion, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export default function AiAnswerCard() {
  const { t } = useTranslation()
  const scheduleAnswer = useAppStore((s) => s.scheduleAnswer)
  const setScheduleAnswer = useAppStore((s) => s.setScheduleAnswer)

  if (!scheduleAnswer) return null

  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-white/[0.06] bg-app-card p-3">
      <MessageCircleQuestion size={18} className="mt-0.5 shrink-0 text-brand-cta" />
      <p className="min-w-0 flex-1 text-sm text-slate-200">{scheduleAnswer}</p>
      <button
        type="button"
        onClick={() => setScheduleAnswer(null)}
        className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
        aria-label={t('ask.dismiss')}
      >
        <X size={16} />
      </button>
    </div>
  )
}

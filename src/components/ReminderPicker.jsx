import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

const REMINDER_OFFSET_OPTIONS = [0, 5, 15, 30, 60]

export default function ReminderPicker({ task, onClose }) {
  const { t } = useTranslation()
  const setTaskReminder = useAppStore((s) => s.setTaskReminder)

  function handlePick(minutes) {
    setTaskReminder(task.id, minutes)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
      <div className="w-full max-w-xs rounded-xl bg-app-card p-5 space-y-4 animate-modal-in">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-slate-100 truncate">{task.title}</span>
          <button type="button" onClick={onClose} className="shrink-0 text-slate-500 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-slate-400">{t('calendar.remind')}</p>
        <div className="flex flex-wrap gap-2">
          {REMINDER_OFFSET_OPTIONS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => handlePick(minutes)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                (task.reminderOffsetMinutes ?? 0) === minutes
                  ? 'bg-brand-cta text-app-bg'
                  : 'bg-app-cardMuted text-slate-200 hover:bg-white/10'
              }`}
            >
              {t(`calendar.remind_${minutes}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

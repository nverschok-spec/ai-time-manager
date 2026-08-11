import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles, X } from 'lucide-react'
import VoiceAiInput from './VoiceAiInput'

// Replaces the old input bar docked above the bottom nav — that permanent
// bar ate a full row of screen height on every page and, worse, iOS Safari
// would shove it (and the nav bar under it) up above the keyboard in a way
// that didn't always settle back down cleanly. A FAB + on-demand sheet only
// costs screen space while it's actually in use.
export default function AiInputFab({ onOpen, isLoading }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onOpen}
      title={t('input.open')}
      className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-cta text-brand-ctaForeground shadow-lg shadow-black/30 transition-transform active:scale-90"
    >
      {isLoading ? (
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-ctaForeground border-t-transparent" />
      ) : (
        <Sparkles size={22} />
      )}
    </button>
  )
}

export function AiInputSheet({ open, onClose, onSubmit, isLoading }) {
  const { t } = useTranslation()

  // Closing on Escape mirrors the other modals in this app (PomodoroTimer,
  // ReminderPicker) even though a phone keyboard rarely sends it.
  useEffect(() => {
    if (!open) return
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  function handleSubmit(payload) {
    onSubmit(payload)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 animate-backdrop-in bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative animate-sheet-up rounded-t-3xl border-t border-white/[0.06] bg-app-card px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mb-3 flex items-center justify-between">
          <span className="mx-auto h-1 w-9 rounded-full bg-white/15" />
          <button
            type="button"
            onClick={onClose}
            title={t('input.close')}
            className="absolute right-3 top-3 text-slate-500 transition-transform active:scale-90 hover:text-slate-300"
          >
            <X size={18} />
          </button>
        </div>
        <VoiceAiInput onSubmit={handleSubmit} isLoading={isLoading} autoFocus />
      </div>
    </div>
  )
}

import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const AUTO_DISMISS_MS = 5000

export default function UndoSnackbar({ label, onUndo, onDismiss }) {
  const { t } = useTranslation()

  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 shadow-lg">
        <span className="max-w-[200px] truncate text-sm text-slate-200">{label}</span>
        <button
          type="button"
          onClick={onUndo}
          className="shrink-0 text-sm font-medium text-emerald-400 hover:text-emerald-300"
        >
          {t('calendar.undo')}
        </button>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Check, CheckCheck, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import UndoSnackbar from './UndoSnackbar'

export default function AiRescheduleCard() {
  const { t } = useTranslation()
  const rescheduleOps = useAppStore((s) => s.rescheduleOps)
  const acceptRescheduleOp = useAppStore((s) => s.acceptRescheduleOp)
  const acceptAllRescheduleOps = useAppStore((s) => s.acceptAllRescheduleOps)
  const dismissRescheduleOp = useAppStore((s) => s.dismissRescheduleOp)
  const editTask = useAppStore((s) => s.editTask)
  const [pendingUndo, setPendingUndo] = useState(null)

  function handleAccept(index) {
    const op = rescheduleOps[index]
    acceptRescheduleOp(index)
    setPendingUndo([op])
  }

  function handleAcceptAll() {
    const ops = rescheduleOps
    acceptAllRescheduleOps()
    setPendingUndo(ops)
  }

  function handleUndo() {
    if (!pendingUndo) return
    for (const op of pendingUndo) editTask(op.id, { date: op.oldDate, startTime: op.oldStartTime })
    setPendingUndo(null)
  }

  if (rescheduleOps.length === 0 && !pendingUndo) return null

  return (
    <div className="space-y-3">
      {rescheduleOps.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-400">{t('reschedule.title')}</h2>
            {rescheduleOps.length > 1 && (
              <button
                type="button"
                onClick={handleAcceptAll}
                className="flex items-center gap-1 rounded-md bg-brand-cta px-2.5 py-1 text-xs font-medium text-app-bg hover:brightness-110 transition-colors"
              >
                <CheckCheck size={14} /> {t('reschedule.accept_all')}
              </button>
            )}
          </div>

          {rescheduleOps.map((op, index) => (
            <div
              key={op.id}
              className="flex items-center gap-2 rounded-2xl border border-white/5 bg-app-card p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-slate-100">{op.title}</p>
                <p className="flex items-center gap-1.5 text-xs text-slate-400 tabular-nums">
                  <span>
                    {op.oldDate} · {op.oldStartTime}
                  </span>
                  <ArrowRight size={12} className="shrink-0 text-brand-cta" />
                  <span className="text-slate-200">
                    {op.newDate} · {op.newStartTime}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleAccept(index)}
                className="shrink-0 rounded-md bg-app-cardMuted p-1.5 text-slate-300 hover:text-brand-cta transition-colors"
              >
                <Check size={16} />
              </button>
              <button
                type="button"
                onClick={() => dismissRescheduleOp(index)}
                className="shrink-0 rounded-md bg-app-cardMuted p-1.5 text-slate-300 hover:text-priority-high transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </>
      )}

      {pendingUndo && (
        <UndoSnackbar
          label={
            pendingUndo.length === 1
              ? pendingUndo[0].title
              : t('reschedule.undo_count', { count: pendingUndo.length })
          }
          onUndo={handleUndo}
          onDismiss={() => setPendingUndo(null)}
        />
      )}
    </div>
  )
}

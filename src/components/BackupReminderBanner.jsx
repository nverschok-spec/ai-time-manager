import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HardDriveDownload, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

const NUDGE_AFTER_DAYS = 30
const MIN_TASKS_TO_NUDGE = 5

export default function BackupReminderBanner() {
  const { t } = useTranslation()
  const tasks = useAppStore((s) => s.tasks)
  const lastBackupExportDate = useAppStore((s) => s.lastBackupExportDate)
  const exportAndDownload = useAppStore((s) => s.exportAndDownload)
  const [dismissed, setDismissed] = useState(false)

  // Only worth mentioning once there's actually something to lose — a
  // brand-new install with a handful of tasks doesn't need this yet.
  if (dismissed || tasks.length < MIN_TASKS_TO_NUDGE) return null

  const daysSince = lastBackupExportDate
    ? Math.floor((Date.now() - new Date(`${lastBackupExportDate}T00:00:00`).getTime()) / 86400000)
    : Infinity
  if (daysSince < NUDGE_AFTER_DAYS) return null

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-sky-400/30 bg-sky-400/10 px-3 py-2.5">
      <HardDriveDownload size={18} className="shrink-0 text-sky-400" />
      <p className="min-w-0 flex-1 text-sm text-sky-300">{t('backup.nudge')}</p>
      <button
        type="button"
        onClick={exportAndDownload}
        className="rounded-full bg-sky-400 px-2.5 py-1 text-xs font-medium text-app-bg hover:brightness-110 transition-all"
      >
        {t('settings.export')}
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={t('ask.dismiss')}
        className="p-1 text-sky-400/70 hover:text-sky-400 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  )
}

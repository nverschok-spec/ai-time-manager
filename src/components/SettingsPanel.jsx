import { useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, CalendarPlus, Download, Upload } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { buildIcs } from '../lib/ics'
import LanguageSwitcher from './LanguageSwitcher'
import PushSettings from './PushSettings'
import PeopleSettings from './PeopleSettings'

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

export default function SettingsPanel({ onClose }) {
  const { t } = useTranslation()
  const tasks = useAppStore((s) => s.tasks)
  const exportData = useAppStore((s) => s.exportData)
  const importData = useAppStore((s) => s.importData)
  const fileInputRef = useRef(null)

  const icsHref = useMemo(
    () => `data:text/calendar;charset=utf-8,${encodeURIComponent(buildIcs(tasks))}`,
    [tasks]
  )

  function handleExport() {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-time-manager-${todayKey()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        importData(reader.result)
      } catch {
        // invalid file — ignore silently, input stays empty for retry
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-app-bg">
      <div className="mx-auto max-w-md space-y-5 p-4">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-app-card p-2 text-slate-300 hover:text-slate-100"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-semibold">{t('settings.title')}</h1>
        </header>

        <div className="flex items-center justify-between rounded-3xl border border-white/5 bg-app-card p-4 text-sm">
          <span className="text-slate-300">{t('settings.language')}</span>
          <LanguageSwitcher />
        </div>

        <div className="rounded-3xl border border-white/5 bg-app-card p-4">
          <PushSettings />
        </div>

        <div className="rounded-3xl border border-white/5 bg-app-card p-4">
          <PeopleSettings />
        </div>

        <div className="space-y-3 rounded-3xl border border-white/5 bg-app-card p-4">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center justify-center gap-1.5 rounded-full bg-app-cardMuted py-2 text-sm text-slate-200 hover:bg-white/10"
            >
              <Download size={14} /> {t('settings.export')}
            </button>
            <button
              type="button"
              onClick={handleImportClick}
              className="flex items-center justify-center gap-1.5 rounded-full bg-app-cardMuted py-2 text-sm text-slate-200 hover:bg-white/10"
            >
              <Upload size={14} /> {t('settings.import')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportFile}
              className="hidden"
            />
            <a
              href={icsHref}
              className="flex items-center justify-center gap-1.5 rounded-full bg-app-cardMuted py-2 text-sm text-slate-200 hover:bg-white/10"
            >
              <CalendarPlus size={14} /> {t('settings.export_calendar')}
            </a>
          </div>
          <p className="text-xs text-slate-500">{t('settings.privacy_note')}</p>
        </div>
      </div>
    </div>
  )
}

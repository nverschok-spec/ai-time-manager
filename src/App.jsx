import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarPlus, Download, Settings as SettingsIcon, Upload } from 'lucide-react'
import LanguageSwitcher from './components/LanguageSwitcher'
import Logo from './components/Logo'
import StatsOverview from './components/StatsOverview'
import OverdueBanner from './components/OverdueBanner'
import MorningReview from './components/MorningReview'
import PushSettings from './components/PushSettings'
import CalendarView from './components/CalendarView'
import VoiceAiInput from './components/VoiceAiInput'
import AiSuggestionCard from './components/AiSuggestionCard'
import { useAppStore } from './store/useAppStore'
import { parseUserInput } from './services/ai'
import { buildIcs } from './lib/ics'

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

export default function App() {
  const { t } = useTranslation()
  const tasks = useAppStore((s) => s.tasks)
  const setSuggestions = useAppStore((s) => s.setSuggestions)
  const exportData = useAppStore((s) => s.exportData)
  const importData = useAppStore((s) => s.importData)
  const [isLoading, setIsLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const fileInputRef = useRef(null)

  const icsHref = useMemo(
    () => `data:text/calendar;charset=utf-8,${encodeURIComponent(buildIcs(tasks))}`,
    [tasks]
  )

  async function handleSubmit(text) {
    setIsLoading(true)
    try {
      const suggestions = await parseUserInput(text, tasks)
      setSuggestions(suggestions)
    } catch (err) {
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }

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
      } catch (err) {
        // invalid file — ignore silently, input stays empty for retry
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <MorningReview />

      <div className="mx-auto max-w-md p-4 space-y-5">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo />
            <h1 className="text-lg font-semibold">{t('app.title')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:text-slate-100"
            >
              <SettingsIcon size={18} />
            </button>
          </div>
        </header>

        <StatsOverview />

        <OverdueBanner />

        {showSettings && (
          <div className="rounded-lg bg-slate-800/60 p-3 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">{t('settings.language')}</span>
              <LanguageSwitcher />
            </div>
            <PushSettings />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-slate-700 py-1.5 text-sm text-slate-200 hover:bg-slate-600"
              >
                <Download size={14} /> {t('settings.export')}
              </button>
              <button
                type="button"
                onClick={handleImportClick}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-slate-700 py-1.5 text-sm text-slate-200 hover:bg-slate-600"
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
            </div>
            <a
              href={icsHref}
              className="flex items-center justify-center gap-1.5 rounded-md bg-slate-700 py-1.5 text-sm text-slate-200 hover:bg-slate-600"
            >
              <CalendarPlus size={14} /> {t('settings.export_calendar')}
            </a>
            <p className="text-xs text-slate-500">{t('settings.privacy_note')}</p>
          </div>
        )}

        <AiSuggestionCard />

        <CalendarView />
      </div>

      <div className="fixed inset-x-0 bottom-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 p-4">
        <div className="mx-auto max-w-md">
          <VoiceAiInput onSubmit={handleSubmit} isLoading={isLoading} />
        </div>
      </div>

      <div className="h-20" />
    </div>
  )
}

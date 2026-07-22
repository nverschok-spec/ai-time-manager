import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Settings as SettingsIcon } from 'lucide-react'
import LanguageSwitcher from './components/LanguageSwitcher'
import Logo from './components/Logo'
import StatsOverview from './components/StatsOverview'
import OverdueBanner from './components/OverdueBanner'
import MorningReview from './components/MorningReview'
import SettingsPanel from './components/SettingsPanel'
import CalendarView from './components/CalendarView'
import VoiceAiInput from './components/VoiceAiInput'
import AiSuggestionCard from './components/AiSuggestionCard'
import { useAppStore } from './store/useAppStore'
import { parseUserInput } from './services/ai'

export default function App() {
  const { t } = useTranslation()
  const tasks = useAppStore((s) => s.tasks)
  const setSuggestions = useAppStore((s) => s.setSuggestions)
  const [isLoading, setIsLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  async function handleSubmit({ text, image }) {
    setIsLoading(true)
    try {
      const suggestions = await parseUserInput(text, tasks, image)
      setSuggestions(suggestions)
    } catch (err) {
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <MorningReview />
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

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
              onClick={() => setShowSettings(true)}
              className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:text-slate-100"
            >
              <SettingsIcon size={18} />
            </button>
          </div>
        </header>

        <StatsOverview />

        <OverdueBanner />

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

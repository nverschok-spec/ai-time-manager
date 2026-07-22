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
    <div className="flex min-h-dvh flex-col bg-app-bg text-slate-100">
      <MorningReview />
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      <div className="flex-1 overflow-y-auto">
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
                className="rounded-lg bg-app-card p-2 text-slate-300 hover:text-slate-100"
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
      </div>

      <div className="shrink-0 border-t border-white/5 bg-app-bg/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-md">
          <VoiceAiInput onSubmit={handleSubmit} isLoading={isLoading} />
        </div>
      </div>
    </div>
  )
}

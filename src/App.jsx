import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Settings as SettingsIcon, Target } from 'lucide-react'
import LanguageSwitcher from './components/LanguageSwitcher'
import Logo from './components/Logo'
import StatsOverview from './components/StatsOverview'
import ActivityHeatmap from './components/ActivityHeatmap'
import OverdueBanner from './components/OverdueBanner'
import MorningReview from './components/MorningReview'
import WeeklyReview from './components/WeeklyReview'
import SettingsPanel from './components/SettingsPanel'
import CalendarView from './components/CalendarView'
import VoiceAiInput from './components/VoiceAiInput'
import AiSuggestionCard from './components/AiSuggestionCard'
import AiRescheduleCard from './components/AiRescheduleCard'
import FocusMode from './components/FocusMode'
import { getStoredPerson } from './components/PinGate'
import { useAppStore } from './store/useAppStore'
import { parseUserInput, fetchRescheduleOps } from './services/ai'
import { isRescheduleCommand } from './lib/rescheduleIntent'
import { migrateLegacyDataIfNeeded } from './lib/migrateLegacyData'
import { hexToRgbChannels } from './lib/color'
import { updateAppBadge } from './lib/badge'
import { expandOccurrences } from './lib/occurrences'
import { toDateKey } from './lib/date'

const REFRESH_INTERVAL_MS = 30000

export default function App() {
  const { t } = useTranslation()
  const tasks = useAppStore((s) => s.tasks)
  const person = useAppStore((s) => s.person)
  const dataLoaded = useAppStore((s) => s.dataLoaded)
  const setPerson = useAppStore((s) => s.setPerson)
  const loadAll = useAppStore((s) => s.loadAll)
  const setSuggestions = useAppStore((s) => s.setSuggestions)
  const setRescheduleOps = useAppStore((s) => s.setRescheduleOps)
  const archiveOldCompleted = useAppStore((s) => s.archiveOldCompleted)
  const [isLoading, setIsLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [focusMode, setFocusMode] = useState(false)

  useEffect(() => {
    setPerson(getStoredPerson())
    ;(async () => {
      await migrateLegacyDataIfNeeded()
      await loadAll()
      archiveOldCompleted()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAll, setPerson])

  // Personalizes the accent color per logged-in person (see tailwind.config.js
  // + index.css) — falls back to the default green when no color is set.
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', person?.color ? hexToRgbChannels(person.color) : '46 204 145')
  }, [person])

  // App-icon badge (iOS Safari, home-screen installs) — overdue plus
  // whatever's still left today, recurring occurrences included.
  useEffect(() => {
    const todayKey = toDateKey(new Date())
    const overdueCount = tasks.filter((t) => !t.recurrence && !t.done && t.date < todayKey).length
    const todayTasks = expandOccurrences(tasks, [todayKey])[todayKey]
    const todayRemaining = todayTasks.filter((t) => !t.done).length
    updateAppBadge(overdueCount + todayRemaining)
  }, [tasks])

  // Keeps the shared shopping list (and the other person's edits generally)
  // in sync without needing a websocket — cheap enough at this scale.
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible') loadAll()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') loadAll()
    }, REFRESH_INTERVAL_MS)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      clearInterval(interval)
    }
  }, [loadAll])

  async function handleSubmit({ text, image }) {
    setIsLoading(true)
    try {
      // Bulk-move commands ("move everything today to tomorrow") skip the
      // create-task flow entirely and go through a narrower endpoint that
      // can only reschedule tasks it's given, never invent new ones.
      if (!image && isRescheduleCommand(text)) {
        const ops = await fetchRescheduleOps(text, tasks)
        setRescheduleOps(ops)
      } else {
        const suggestions = await parseUserInput(text, tasks, image)
        setSuggestions(suggestions)
      }
    } catch (err) {
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }

  if (!dataLoaded) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-app-bg text-sm text-muted">
        {t('app.loading')}
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-app-bg text-slate-100">
      <MorningReview />
      <WeeklyReview />
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto max-w-md p-4 space-y-5">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Logo />
              <div>
                <h1 className="text-lg font-semibold leading-tight">{t('app.title')}</h1>
                {person && <p className="text-xs leading-tight text-muted">{person.name}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <button
                type="button"
                onClick={() => setFocusMode((v) => !v)}
                className={`rounded-lg p-2 transition-colors ${
                  focusMode ? 'bg-brand-cta text-app-bg' : 'bg-app-card text-slate-300 hover:text-slate-100'
                }`}
              >
                <Target size={18} />
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="rounded-lg bg-app-card p-2 text-slate-300 hover:text-slate-100"
              >
                <SettingsIcon size={18} />
              </button>
            </div>
          </header>

          {focusMode ? (
            <FocusMode />
          ) : (
            <>
              <StatsOverview />

              <ActivityHeatmap />

              <OverdueBanner />

              <AiSuggestionCard />

              <AiRescheduleCard />

              <CalendarView />
            </>
          )}
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

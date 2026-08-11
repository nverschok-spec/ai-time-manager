import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Target } from 'lucide-react'
import OfflineIndicator from './components/OfflineIndicator'
import PersonAvatar from './components/PersonAvatar'
import MorningReview from './components/MorningReview'
import WeeklyReview from './components/WeeklyReview'
import SettingsPanel from './components/SettingsPanel'
import AiInputFab, { AiInputSheet } from './components/AiInputSheet'
import FocusMode from './components/FocusMode'
import BottomNav from './components/BottomNav'
import TodayPage from './components/pages/TodayPage'
import CalendarPage from './components/pages/CalendarPage'
import SharedPage from './components/pages/SharedPage'
import StatsPage from './components/pages/StatsPage'
import { getStoredPerson } from './components/PinGate'
import { useAppStore } from './store/useAppStore'
import { parseUserInput, fetchRescheduleOps, fetchScheduleAnswer } from './services/ai'
import { isRescheduleCommand } from './lib/rescheduleIntent'
import { isScheduleQuestion } from './lib/scheduleQuestion'
import { migrateLegacyDataIfNeeded } from './lib/migrateLegacyData'
import { hexToRgbChannels, readableForegroundChannels } from './lib/color'
import { updateAppBadge } from './lib/badge'
import { expandOccurrences } from './lib/occurrences'
import { toDateKey } from './lib/date'

const REFRESH_INTERVAL_MS = 30000

// One job per page — Home (today), Calendar (week/month + search), Shared
// (shopping/family), Stats (progress + heatmap). Replaces the old single
// long-scrolling stack; see BottomNav for the tab bar itself.
const PAGES = {
  today: TodayPage,
  calendar: CalendarPage,
  shared: SharedPage,
  stats: StatsPage
}

export default function App() {
  const { t, i18n } = useTranslation()
  const tasks = useAppStore((s) => s.tasks)
  const shoppingItems = useAppStore((s) => s.shoppingItems)
  const person = useAppStore((s) => s.person)
  const dataLoaded = useAppStore((s) => s.dataLoaded)
  const setPerson = useAppStore((s) => s.setPerson)
  const loadAll = useAppStore((s) => s.loadAll)
  const setSuggestions = useAppStore((s) => s.setSuggestions)
  const setRescheduleOps = useAppStore((s) => s.setRescheduleOps)
  const setScheduleAnswer = useAppStore((s) => s.setScheduleAnswer)
  const archiveOldCompleted = useAppStore((s) => s.archiveOldCompleted)
  const syncRecurringReminders = useAppStore((s) => s.syncRecurringReminders)
  const flushPendingMutations = useAppStore((s) => s.flushPendingMutations)
  const addShoppingItem = useAppStore((s) => s.addShoppingItem)
  const activeTab = useAppStore((s) => s.activeTab)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const [isLoading, setIsLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [showAiSheet, setShowAiSheet] = useState(false)

  useEffect(() => {
    setPerson(getStoredPerson())
    ;(async () => {
      await migrateLegacyDataIfNeeded()
      await loadAll()
      archiveOldCompleted()
      syncRecurringReminders()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAll, setPerson])

  // Personalizes the accent color per logged-in person (see tailwind.config.js
  // + index.css) — falls back to the default green when no color is set.
  // --accent-foreground rides along so text/icons on solid accent fills
  // (buttons, the avatar initial) stay readable even on a light accent.
  useEffect(() => {
    const color = person?.color || '#2ECC91'
    document.documentElement.style.setProperty('--accent', hexToRgbChannels(color))
    document.documentElement.style.setProperty('--accent-foreground', readableForegroundChannels(color))
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
      if (document.visibilityState === 'visible') {
        flushPendingMutations().then(loadAll)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        flushPendingMutations().then(loadAll)
      }
    }, REFRESH_INTERVAL_MS)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      clearInterval(interval)
    }
  }, [loadAll, flushPendingMutations])

  // Retry any edits that failed to reach the server while offline, the
  // moment connectivity actually comes back — don't wait for the next poll.
  useEffect(() => {
    window.addEventListener('online', flushPendingMutations)
    return () => window.removeEventListener('online', flushPendingMutations)
  }, [flushPendingMutations])

  async function handleSubmit({ text, attachment }) {
    setIsLoading(true)
    try {
      // Bulk-move commands ("move everything today to tomorrow") skip the
      // create-task flow entirely and go through a narrower endpoint that
      // can only reschedule tasks it's given, never invent new ones.
      if (!attachment && isRescheduleCommand(text)) {
        const ops = await fetchRescheduleOps(text, tasks)
        setRescheduleOps(ops)
      } else if (!attachment && isScheduleQuestion(text)) {
        const answer = await fetchScheduleAnswer(text, tasks)
        setScheduleAnswer(answer)
      } else {
        const suggestions = await parseUserInput(text, tasks, attachment)
        // On the Shared page, plain text with no date/time info the AI could
        // extract is almost always meant for the shopping list ("молоко",
        // typed into the global bar out of habit) rather than an actually
        // failed task-parse — route it there instead of showing nothing.
        if (suggestions.length === 0 && activeTab === 'shared' && !attachment) {
          addShoppingItem(text)
        } else {
          setSuggestions(suggestions)
        }
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

  const ActivePage = PAGES[activeTab]

  // "12 августа, Вт" — split into two calls rather than one Intl pattern
  // string so the day-month order and weekday-abbreviation form stay
  // correct per locale instead of chasing one format across ru/de/en.
  const headerDate = useMemo(() => {
    const now = new Date()
    const dayMonth = now.toLocaleDateString(i18n.resolvedLanguage, { day: 'numeric', month: 'long' })
    const weekday = now.toLocaleDateString(i18n.resolvedLanguage, { weekday: 'short' })
    return `${dayMonth}, ${weekday}`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.resolvedLanguage, activeTab])

  return (
    <div className="flex min-h-dvh flex-col bg-app-bg text-slate-100">
      <MorningReview />
      <WeeklyReview />
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto max-w-md p-4 space-y-5">
          <header className="flex items-center justify-between gap-2">
            <span className="tabular-nums text-sm font-medium capitalize text-slate-300">{headerDate}</span>
            <div className="flex shrink-0 items-center gap-2">
              <OfflineIndicator />
              <button
                type="button"
                onClick={() => setFocusMode((v) => !v)}
                title={t('focus.toggle')}
                className={`rounded-lg p-1.5 transition-transform active:scale-90 ${
                  focusMode ? 'bg-brand-cta text-brand-ctaForeground' : 'bg-app-card text-slate-300 hover:text-slate-100'
                }`}
              >
                <Target size={18} />
              </button>
              <PersonAvatar />
            </div>
          </header>

          {focusMode ? (
            <FocusMode />
          ) : (
            <div key={activeTab} className="animate-page-in">
              <ActivePage />
            </div>
          )}
        </div>
      </div>

      {!focusMode && <AiInputFab onOpen={() => setShowAiSheet(true)} isLoading={isLoading} />}
      <AiInputSheet
        open={showAiSheet}
        onClose={() => setShowAiSheet(false)}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />

      {!focusMode && (
        <BottomNav
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenSettings={() => setShowSettings(true)}
          badges={{ shared: shoppingItems.filter((i) => !i.done).length }}
        />
      )}
    </div>
  )
}

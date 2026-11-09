import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store/useAppStore'
import GermanToday from './GermanToday'
import WordsTab from './WordsTab'
import GrammarTab from './GrammarTab'
import WritingTab from './WritingTab'
import ControlTab from './ControlTab'

const TABS = ['today', 'words', 'grammar', 'writing', 'control']

// "Deutsch B2" — everything here is plain local logic (no API calls); the
// optional AI key elsewhere in the app is irrelevant to this screen.
export default function GermanHome() {
  const { t } = useTranslation()
  const goal = useAppStore((s) => s.german.settings.goal)
  const goalMonths = useAppStore((s) => s.german.settings.goalMonths)
  const [tab, setTab] = useState('today')

  return (
    <div className="space-y-4">
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-slate-100">{goal}</p>
        <p className="text-xs text-slate-500">{t('german.goal_horizon', { months: goalMonths })}</p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg bg-app-card p-1">
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 whitespace-nowrap rounded-md px-2 py-1 text-xs transition-colors ${
              tab === key ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            {t(`german.tab_${key}`)}
          </button>
        ))}
      </div>

      {tab === 'today' && <GermanToday onOpenTab={setTab} />}
      {tab === 'words' && <WordsTab />}
      {tab === 'grammar' && <GrammarTab />}
      {tab === 'writing' && <WritingTab />}
      {tab === 'control' && <ControlTab />}
    </div>
  )
}

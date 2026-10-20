import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import HealthToday from '../health/HealthToday'
import HealthProgress from '../health/HealthProgress'
import HealthRules from '../health/HealthRules'
import StudyHome from '../study/StudyHome'

const HEALTH_TABS = [
  { key: 'today', labelKey: 'health.tab_today' },
  { key: 'progress', labelKey: 'health.tab_progress' },
  { key: 'rules', labelKey: 'health.tab_rules' }
]

// Health and Study share one bottom-nav slot instead of two, each behind its
// own internal segmented switch — see the Этап 1 navigation decision.
export default function TrackerPage() {
  const { t } = useTranslation()
  const [section, setSection] = useState('health')
  const [healthTab, setHealthTab] = useState('today')

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-lg bg-app-card p-1 gap-1">
        <button
          type="button"
          onClick={() => setSection('health')}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            section === 'health' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          {t('tracker.health')}
        </button>
        <button
          type="button"
          onClick={() => setSection('study')}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            section === 'study' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          {t('tracker.study')}
        </button>
      </div>

      {section === 'health' && (
        <div className="space-y-4">
          <div className="inline-flex flex-wrap rounded-lg bg-app-card p-1 gap-1">
            {HEALTH_TABS.map(({ key, labelKey }) => (
              <button
                key={key}
                type="button"
                onClick={() => setHealthTab(key)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  healthTab === key ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
          {healthTab === 'today' && <HealthToday />}
          {healthTab === 'progress' && <HealthProgress />}
          {healthTab === 'rules' && <HealthRules />}
        </div>
      )}

      {section === 'study' && <StudyHome />}
    </div>
  )
}

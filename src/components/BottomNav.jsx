import { useTranslation } from 'react-i18next'
import { BarChart3, CalendarDays, ListTodo, Settings as SettingsIcon, Users } from 'lucide-react'

const TABS = [
  { key: 'today', icon: ListTodo, labelKey: 'nav.today' },
  { key: 'calendar', icon: CalendarDays, labelKey: 'nav.calendar' },
  { key: 'shared', icon: Users, labelKey: 'nav.shared' },
  { key: 'stats', icon: BarChart3, labelKey: 'nav.stats' }
]

export default function BottomNav({ activeTab, onSelectTab, onOpenSettings, badges = {} }) {
  const { t } = useTranslation()

  return (
    <nav className="shrink-0 border-t border-white/5 bg-app-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-1">
        {TABS.map(({ key, icon: Icon, labelKey }) => {
          const active = activeTab === key
          const badgeCount = badges[key]
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectTab(key)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] transition-colors ${
                active ? 'text-brand-cta' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="relative">
                <Icon size={20} />
                {badgeCount > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-priority-high px-1 text-[9px] font-semibold leading-none text-white">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </span>
              {t(labelKey)}
            </button>
          )
        })}
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] text-slate-500 transition-colors hover:text-slate-300"
        >
          <SettingsIcon size={20} />
          {t('nav.settings')}
        </button>
      </div>
    </nav>
  )
}

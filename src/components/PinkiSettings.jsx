import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/useAppStore'
import { PINKI_DEFS } from '../lib/pinki'

// Toggles reuse the exact same reminder pipeline as task reminders
// (scheduleReminder/push-schedule) — no new cron, see useAppStore.js'
// syncHealthReminders. force=true re-syncs immediately so a toggle takes
// effect without waiting for the next app open.
export default function PinkiSettings() {
  const { t } = useTranslation()
  const pushEnabled = useAppStore((s) => s.pushEnabled)
  const pinki = useAppStore((s) => s.health.pinki) || {}
  const setPinokEnabled = useAppStore((s) => s.setPinokEnabled)
  const syncHealthReminders = useAppStore((s) => s.syncHealthReminders)

  function toggle(key) {
    const enabled = pinki[key] !== false
    setPinokEnabled(key, !enabled)
    syncHealthReminders(true)
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-300">{t('health.pinki_section_title')}</p>
      {!pushEnabled && <p className="text-xs text-slate-500">{t('health.pinki_hint')}</p>}
      <div className="space-y-1.5">
        {PINKI_DEFS.map((def) => {
          const enabled = pinki[def.key] !== false
          return (
            <div key={def.key} className="flex items-center justify-between text-sm text-slate-300">
              <span className="truncate pr-2">{t(def.titleKey)}</span>
              <button
                type="button"
                onClick={() => toggle(def.key)}
                role="switch"
                aria-checked={enabled}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                  enabled ? 'bg-brand-cta' : 'bg-app-cardMuted'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                    enabled ? 'translate-x-[18px]' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

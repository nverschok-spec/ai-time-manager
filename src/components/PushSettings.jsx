import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, BellOff, Share } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { isPushSupported, isIos, isStandalone, subscribeToPush, unsubscribeFromPush } from '../lib/push'

export default function PushSettings() {
  const { t } = useTranslation()
  const pushEnabled = useAppStore((s) => s.pushEnabled)
  const setPushEnabled = useAppStore((s) => s.setPushEnabled)
  const quietHoursEnabled = useAppStore((s) => s.quietHoursEnabled)
  const quietHoursStart = useAppStore((s) => s.quietHoursStart)
  const quietHoursEnd = useAppStore((s) => s.quietHoursEnd)
  const setQuietHours = useAppStore((s) => s.setQuietHours)
  const [error, setError] = useState(false)

  if (!isPushSupported()) return null

  const needsInstall = isIos() && !isStandalone()

  async function handleEnable() {
    setError(false)
    try {
      await subscribeToPush()
      setPushEnabled(true)
    } catch {
      setError(true)
    }
  }

  async function handleDisable() {
    await unsubscribeFromPush()
    setPushEnabled(false)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-300">{t('push.title')}</span>
        {!needsInstall && (
          <button
            type="button"
            onClick={pushEnabled ? handleDisable : handleEnable}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              pushEnabled
                ? 'bg-app-cardMuted text-slate-300 hover:bg-white/10'
                : 'bg-brand-cta text-brand-ctaForeground hover:brightness-110'
            }`}
          >
            {pushEnabled ? <BellOff size={13} /> : <Bell size={13} />}
            {pushEnabled ? t('push.disable') : t('push.enable')}
          </button>
        )}
      </div>
      {needsInstall && (
        <p className="flex items-start gap-1.5 text-xs text-slate-500">
          <Share size={13} className="mt-0.5 shrink-0" />
          {t('push.ios_instructions')}
        </p>
      )}
      {error && <p className="text-xs text-priority-high">{t('push.error')}</p>}

      {pushEnabled && (
        <div className="flex items-center justify-between border-t border-white/[0.06] pt-2 text-sm">
          <span className="text-slate-300">{t('push.quiet_hours')}</span>
          <div className="flex items-center gap-1.5">
            {quietHoursEnabled && (
              <>
                <input
                  type="time"
                  value={quietHoursStart}
                  onChange={(e) => setQuietHours({ quietHoursStart: e.target.value })}
                  className="w-20 rounded-md bg-app-bg px-1.5 py-1 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-brand-cta"
                />
                <span className="text-slate-500">–</span>
                <input
                  type="time"
                  value={quietHoursEnd}
                  onChange={(e) => setQuietHours({ quietHoursEnd: e.target.value })}
                  className="w-20 rounded-md bg-app-bg px-1.5 py-1 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-brand-cta"
                />
              </>
            )}
            <button
              type="button"
              onClick={() => setQuietHours({ quietHoursEnabled: !quietHoursEnabled })}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                quietHoursEnabled
                  ? 'bg-brand-cta text-brand-ctaForeground hover:brightness-110'
                  : 'bg-app-cardMuted text-slate-300 hover:bg-white/10'
              }`}
            >
              {quietHoursEnabled ? t('push.enable') : t('push.disable')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

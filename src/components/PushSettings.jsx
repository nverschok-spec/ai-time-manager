import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, BellOff, Share } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { isPushSupported, isIos, isStandalone, subscribeToPush, unsubscribeFromPush } from '../lib/push'

export default function PushSettings() {
  const { t } = useTranslation()
  const deviceId = useAppStore((s) => s.deviceId)
  const pushEnabled = useAppStore((s) => s.pushEnabled)
  const setPushEnabled = useAppStore((s) => s.setPushEnabled)
  const [error, setError] = useState(false)

  if (!isPushSupported()) return null

  const needsInstall = isIos() && !isStandalone()

  async function handleEnable() {
    setError(false)
    try {
      await subscribeToPush(deviceId)
      setPushEnabled(true)
    } catch {
      setError(true)
    }
  }

  async function handleDisable() {
    await unsubscribeFromPush(deviceId)
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
                : 'bg-brand-cta text-app-bg hover:brightness-110'
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
    </div>
  )
}

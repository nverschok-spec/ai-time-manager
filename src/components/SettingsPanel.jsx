import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, CalendarPlus, ChevronDown, ChevronUp, Download, Upload } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import LanguageSwitcher from './LanguageSwitcher'
import PushSettings from './PushSettings'
import PeopleSettings from './PeopleSettings'

const FEATURE_KEYS = ['feature_attach', 'feature_shared', 'feature_claim', 'feature_status', 'feature_search']

export default function SettingsPanel({ onClose }) {
  const { t } = useTranslation()
  const person = useAppStore((s) => s.person)
  const feedToken = useAppStore((s) => s.feedToken)
  const exportAndDownload = useAppStore((s) => s.exportAndDownload)
  const importData = useAppStore((s) => s.importData)
  const fileInputRef = useRef(null)
  const [showFeatures, setShowFeatures] = useState(false)

  // webcal:// (not https://) so iOS/macOS Calendar treats it as a live
  // subscription to add, instead of just downloading/opening the file once.
  const icsFeedUrl =
    person && feedToken ? `webcal://${window.location.host}/api/ics-feed?person=${person.id}&token=${feedToken}` : null

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        importData(reader.result)
      } catch {
        // invalid file — ignore silently, input stays empty for retry
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-app-bg">
      <div className="mx-auto max-w-md space-y-5 p-4 animate-page-in">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-app-card p-2 text-slate-300 hover:text-slate-100"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-semibold">{t('settings.title')}</h1>
        </header>

        <section className="space-y-2">
          <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            {t('settings.section_profile')}
          </h2>
          <div className="flex items-center justify-between rounded-3xl border border-white/5 bg-app-card p-4 text-sm">
            <span className="text-slate-300">{t('settings.language')}</span>
            <LanguageSwitcher />
          </div>
          <div className="rounded-3xl border border-white/5 bg-app-card p-4">
            <PeopleSettings />
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            {t('settings.section_notifications')}
          </h2>
          <div className="rounded-3xl border border-white/5 bg-app-card p-4">
            <PushSettings />
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            {t('settings.section_data')}
          </h2>
          <div className="space-y-3 rounded-3xl border border-white/5 bg-app-card p-4">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={exportAndDownload}
              className="flex items-center justify-center gap-1.5 rounded-full bg-app-cardMuted py-2 text-sm text-slate-200 hover:bg-white/10"
            >
              <Download size={14} /> {t('settings.export')}
            </button>
            <button
              type="button"
              onClick={handleImportClick}
              className="flex items-center justify-center gap-1.5 rounded-full bg-app-cardMuted py-2 text-sm text-slate-200 hover:bg-white/10"
            >
              <Upload size={14} /> {t('settings.import')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportFile}
              className="hidden"
            />
            {icsFeedUrl && (
              <a
                href={icsFeedUrl}
                className="flex items-center justify-center gap-1.5 rounded-full bg-app-cardMuted py-2 text-sm text-slate-200 hover:bg-white/10"
              >
                <CalendarPlus size={14} /> {t('settings.export_calendar')}
              </a>
            )}
          </div>
          <p className="text-xs text-slate-500">{t('settings.privacy_note')}</p>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            {t('settings.section_features')}
          </h2>
          <div className="rounded-3xl border border-white/5 bg-app-card p-4">
            <button
              type="button"
              onClick={() => setShowFeatures((v) => !v)}
              className="flex w-full items-center justify-between text-sm text-slate-300"
            >
              {t(showFeatures ? 'settings.features_hide' : 'settings.features_show')}
              {showFeatures ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showFeatures && (
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-400">
                {FEATURE_KEYS.map((key) => (
                  <li key={key}>{t(`settings.${key}`)}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

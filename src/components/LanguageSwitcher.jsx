import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  { code: 'ru', label: 'RU' },
  { code: 'de', label: 'DE' },
  { code: 'en', label: 'EN' }
]

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()

  return (
    <div className="inline-flex rounded-lg bg-slate-800 p-1 gap-1">
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => i18n.changeLanguage(code)}
          className={`px-2.5 py-1 text-sm rounded-md transition-colors ${
            i18n.resolvedLanguage === code
              ? 'bg-slate-100 text-slate-900'
              : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

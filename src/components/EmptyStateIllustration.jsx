import { useTranslation } from 'react-i18next'

export default function EmptyStateIllustration() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/5 bg-app-card px-6 py-10 text-center">
      <svg width="140" height="140" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="empty-gradient" x1="0" y1="0" x2="140" y2="140" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#00C2A8" />
            <stop offset="1" stopColor="#3DDC97" />
          </linearGradient>
        </defs>
        <circle cx="70" cy="70" r="70" fill="url(#empty-gradient)" fillOpacity="0.12" />
        <circle cx="70" cy="72" r="40" fill="url(#empty-gradient)" />
        <path
          d="M54 74 L65 85 L88 60"
          stroke="#12141C"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path d="M108 28 L110.5 36 L118.5 38.5 L110.5 41 L108 49 L105.5 41 L97.5 38.5 L105.5 36 Z" fill="#3DDC97" />
        <path d="M24 96 L25.6 101.2 L30.8 102.8 L25.6 104.4 L24 109.6 L22.4 104.4 L17.2 102.8 L22.4 101.2 Z" fill="#00C2A8" fillOpacity="0.8" />
      </svg>
      <p className="max-w-[220px] text-sm text-muted">{t('calendar.empty_state')}</p>
    </div>
  )
}

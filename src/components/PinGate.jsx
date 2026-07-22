import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Delete } from 'lucide-react'
import Logo from './Logo'

const STORAGE_KEY = 'ai-time-manager-auth'
const PIN_LENGTH = 6
const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

export function getStoredToken() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const { token, expiresAt } = JSON.parse(raw)
    if (!token || !expiresAt || expiresAt < Date.now()) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return token
  } catch {
    return null
  }
}

export function clearStoredToken() {
  localStorage.removeItem(STORAGE_KEY)
}

export default function PinGate({ children }) {
  const { t } = useTranslation()
  const [unlocked, setUnlocked] = useState(() => Boolean(getStoredToken()))
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (pin.length !== PIN_LENGTH || isSubmitting) return

    let cancelled = false
    setIsSubmitting(true)
    setError(false)

    fetch('/api/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    })
      .then(async (res) => {
        if (cancelled) return
        if (!res.ok) {
          setError(true)
          setPin('')
          return
        }
        const { token, expiresAt } = await res.json()
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, expiresAt }))
        setUnlocked(true)
      })
      .catch(() => {
        if (!cancelled) {
          setError(true)
          setPin('')
        }
      })
      .finally(() => {
        if (!cancelled) setIsSubmitting(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  function handleKeyPress(key) {
    if (isSubmitting) return
    if (key === 'del') {
      setPin((p) => p.slice(0, -1))
      return
    }
    if (key === '') return
    setError(false)
    setPin((p) => (p.length < PIN_LENGTH ? p + key : p))
  }

  if (unlocked) return children

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-10 bg-app-bg px-6 py-10 text-white">
      <div className="flex flex-col items-center gap-4">
        <Logo size={56} />
        <div className="text-center">
          <h1 className="text-lg font-semibold">{t('pin.title')}</h1>
          <p className="mt-1 h-4 text-sm text-priority-high">{error ? t('pin.error') : ''}</p>
        </div>
      </div>

      <div className={`flex gap-4 ${error ? 'animate-shake' : ''}`}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full border transition-colors ${
              i < pin.length
                ? error
                  ? 'border-priority-high bg-priority-high'
                  : 'border-brand-cta bg-brand-cta'
                : 'border-white/25 bg-transparent'
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-x-6 gap-y-4">
        {KEYPAD.map((key, i) =>
          key === '' ? (
            <div key={i} className="h-16 w-16" />
          ) : key === 'del' ? (
            <button
              key={i}
              type="button"
              onClick={() => handleKeyPress(key)}
              aria-label={t('pin.delete')}
              className="flex h-16 w-16 items-center justify-center rounded-full text-white/70 transition-colors active:bg-white/10"
            >
              <Delete size={22} />
            </button>
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => handleKeyPress(key)}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-app-card text-2xl font-medium text-white transition-colors active:bg-app-cardMuted"
            >
              {key}
            </button>
          )
        )}
      </div>
    </div>
  )
}

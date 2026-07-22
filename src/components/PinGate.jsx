import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const STORAGE_KEY = 'ai-time-manager-auth'

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

  async function handleSubmit(e) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(false)
    try {
      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      })
      if (!res.ok) {
        setError(true)
        return
      }
      const { token, expiresAt } = await res.json()
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, expiresAt }))
      setUnlocked(true)
    } catch {
      setError(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (unlocked) return children

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-900 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xs space-y-4 rounded-lg bg-slate-800 p-6 text-center"
      >
        <h1 className="text-lg font-semibold text-slate-100">{t('pin.title')}</h1>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder={t('pin.placeholder')}
          className="w-full rounded-md border border-slate-600 bg-slate-900 p-2 text-center text-slate-100 tracking-widest"
        />
        {error && <p className="text-sm text-red-400">{t('pin.error')}</p>}
        <button
          type="submit"
          disabled={isSubmitting || pin.length === 0}
          className="w-full rounded-md bg-sky-600 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {t('pin.submit')}
        </button>
      </form>
    </div>
  )
}

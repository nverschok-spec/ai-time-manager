import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Delete, Plus } from 'lucide-react'
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

export function getStoredPerson() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw).person || null
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
  const [step, setStep] = useState('pin') // 'pin' | 'person'
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [preToken, setPreToken] = useState(null)
  const [people, setPeople] = useState([])
  const [newName, setNewName] = useState('')

  useEffect(() => {
    if (step !== 'pin' || pin.length !== PIN_LENGTH || isSubmitting) return

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
        const data = await res.json()
        setPreToken(data.preToken)
        setPeople(data.people || [])
        setStep('person')
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
  }, [pin, step])

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

  async function selectPerson(personId, name) {
    if (isSubmitting) return
    setIsSubmitting(true)
    setError(false)
    try {
      const res = await fetch('/api/select-person', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${preToken}` },
        body: JSON.stringify(personId ? { personId } : { name })
      })
      if (!res.ok) {
        setError(true)
        return
      }
      const { token, expiresAt, person } = await res.json()
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, expiresAt, person }))
      setUnlocked(true)
    } catch {
      setError(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleAddNew(e) {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return
    selectPerson(null, trimmed)
  }

  if (unlocked) return children

  if (step === 'person') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-app-bg px-6 py-10 text-white">
        <div className="flex flex-col items-center gap-4">
          <Logo size={56} />
          <h1 className="text-lg font-semibold">{t('pin.who_are_you')}</h1>
        </div>

        <div className="w-full max-w-xs space-y-2">
          {people.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => selectPerson(p.id)}
              disabled={isSubmitting}
              className="flex w-full items-center gap-3 rounded-xl bg-app-card px-4 py-3 text-left transition-colors hover:bg-app-cardMuted disabled:opacity-50"
            >
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-sm font-medium">{p.name}</span>
            </button>
          ))}

          <form onSubmit={handleAddNew} className="flex gap-2 pt-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('pin.new_person')}
              className="min-w-0 flex-1 rounded-xl bg-app-card px-3 py-2.5 text-sm text-white placeholder:text-muted outline-none focus:ring-2 focus:ring-brand-cta"
            />
            <button
              type="submit"
              disabled={isSubmitting || !newName.trim()}
              className="flex shrink-0 items-center justify-center rounded-xl bg-brand-cta px-3 text-app-bg disabled:opacity-40"
            >
              <Plus size={18} />
            </button>
          </form>
          {error && <p className="text-center text-sm text-priority-high">{t('pin.error')}</p>}
        </div>
      </div>
    )
  }

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

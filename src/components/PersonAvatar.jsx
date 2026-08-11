import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/useAppStore'
import { STATUS_OPTIONS, statusMeta } from '../lib/people'
import { readableForegroundChannels } from '../lib/color'

const STATUS_DOT_COLOR = {
  home: '#3DDC97',
  work: '#60A5FA',
  away: '#F4B740',
  dnd: '#FF6B6B'
}

// Header identity + presence in one tap target: initial avatar in the
// person's own color, a small status dot overlay when a status is set, and
// tapping opens the same status picker that used to live as a row of emoji
// buttons on the Shared page (still the same updatePersonStatus action).
export default function PersonAvatar() {
  const { t } = useTranslation()
  const person = useAppStore((s) => s.person)
  const updatePersonStatus = useAppStore((s) => s.updatePersonStatus)
  const [open, setOpen] = useState(false)

  if (!person) return null

  const dotColor = person.status ? STATUS_DOT_COLOR[person.status] : null

  function pick(key) {
    updatePersonStatus(person.status === key ? null : key)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={person.name}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-transform active:scale-90"
        style={{ backgroundColor: person.color, color: `rgb(${readableForegroundChannels(person.color)})` }}
      >
        {person.name.slice(0, 1).toUpperCase()}
        {dotColor && (
          <span
            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-app-bg"
            style={{ backgroundColor: dotColor }}
          />
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="animate-modal-in absolute right-0 top-11 z-50 w-40 rounded-2xl border border-white/[0.06] bg-app-card p-1.5 shadow-xl">
            {STATUS_OPTIONS.map(({ key, emoji }) => {
              const active = person.status === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => pick(key)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors active:scale-[0.97] ${
                    active ? 'bg-brand-cta/15 text-brand-cta' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span className="text-base leading-none">{emoji}</span>
                  {t(`status.${key}`)}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// Small read-only variant for showing someone else's presence (Shared page).
export function PersonBadge({ person }) {
  const meta = statusMeta(person.status)
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-app-cardMuted px-2 py-1 text-xs text-slate-300">
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold"
        style={{ backgroundColor: person.color, color: `rgb(${readableForegroundChannels(person.color)})` }}
      >
        {person.name.slice(0, 1).toUpperCase()}
      </span>
      {meta ? meta.emoji : null} {person.name}
    </span>
  )
}

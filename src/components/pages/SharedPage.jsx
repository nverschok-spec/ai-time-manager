import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store/useAppStore'
import { STATUS_OPTIONS, statusMeta } from '../../lib/people'
import ShoppingList from '../ShoppingList'
import FamilyEventsList from '../FamilyEventsList'

// The two household-wide (not-private-per-person) lists live together here —
// everything else in the app is private to whoever's logged in.
export default function SharedPage() {
  const { t } = useTranslation()
  const person = useAppStore((s) => s.person)
  const people = useAppStore((s) => s.people)
  const updatePersonStatus = useAppStore((s) => s.updatePersonStatus)
  const [tab, setTab] = useState('shopping')

  const others = people.filter((p) => p.id !== person?.id)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/5 bg-app-card p-2.5">
        <div className="flex items-center gap-1">
          {STATUS_OPTIONS.map(({ key, emoji }) => {
            const active = person?.status === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => updatePersonStatus(active ? null : key)}
                title={t(`status.${key}`)}
                className={`rounded-full px-2 py-1 text-base transition-colors ${
                  active ? 'bg-brand-cta/20 ring-1 ring-brand-cta' : 'hover:bg-white/10'
                }`}
              >
                {emoji}
              </button>
            )
          })}
        </div>
        {others.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {others.map((p) => {
              const meta = statusMeta(p.status)
              return (
                <span
                  key={p.id}
                  className="flex items-center gap-1 rounded-full bg-app-cardMuted px-2 py-1 text-xs text-slate-300"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                  {meta ? meta.emoji : '•'} {p.name}
                </span>
              )
            })}
          </div>
        )}
      </div>

      <div className="inline-flex flex-wrap rounded-lg bg-app-card p-1 gap-1">
        <button
          type="button"
          onClick={() => setTab('shopping')}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            tab === 'shopping' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          {t('nav.shopping')}
        </button>
        <button
          type="button"
          onClick={() => setTab('family')}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            tab === 'family' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          {t('nav.family')}
        </button>
      </div>

      {tab === 'shopping' ? <ShoppingList /> : <FamilyEventsList />}
    </div>
  )
}

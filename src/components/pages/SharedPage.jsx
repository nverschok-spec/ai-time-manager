import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store/useAppStore'
import { PersonBadge } from '../PersonAvatar'
import ShoppingList from '../ShoppingList'
import FamilyEventsList from '../FamilyEventsList'

// The two household-wide (not-private-per-person) lists live together here —
// everything else in the app is private to whoever's logged in. Your own
// status toggle now lives on the header avatar; this page just shows where
// everyone else stands.
export default function SharedPage() {
  const { t } = useTranslation()
  const person = useAppStore((s) => s.person)
  const people = useAppStore((s) => s.people)
  const [tab, setTab] = useState('shopping')

  const others = people.filter((p) => p.id !== person?.id)

  return (
    <div className="space-y-5">
      {others.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {others.map((p) => (
            <PersonBadge key={p.id} person={p} />
          ))}
        </div>
      )}

      <div className="inline-flex flex-wrap rounded-lg bg-app-card p-1 gap-1">
        <button
          type="button"
          onClick={() => setTab('shopping')}
          className={`rounded-md px-3 py-1 text-sm transition-transform active:scale-[0.97] ${
            tab === 'shopping' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          {t('nav.shopping')}
        </button>
        <button
          type="button"
          onClick={() => setTab('family')}
          className={`rounded-md px-3 py-1 text-sm transition-transform active:scale-[0.97] ${
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

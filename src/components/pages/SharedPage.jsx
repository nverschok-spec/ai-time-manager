import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import ShoppingList from '../ShoppingList'
import FamilyEventsList from '../FamilyEventsList'

// The two household-wide (not-private-per-person) lists live together here —
// everything else in the app is private to whoever's logged in.
export default function SharedPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('shopping')

  return (
    <div className="space-y-5">
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

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export default function PeopleSettings() {
  const { t } = useTranslation()
  const people = useAppStore((s) => s.people)
  const addPerson = useAppStore((s) => s.addPerson)
  const removePerson = useAppStore((s) => s.removePerson)
  const [name, setName] = useState('')

  function handleAdd(e) {
    e.preventDefault()
    addPerson(name)
    setName('')
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-300">{t('settings.people')}</p>
      {people.length > 0 && (
        <ul className="space-y-1.5">
          {people.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-lg bg-app-cardMuted px-2.5 py-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="flex-1 text-sm text-slate-200">{p.name}</span>
              <button
                type="button"
                onClick={() => removePerson(p.id)}
                className="text-slate-500 hover:text-priority-high transition-colors"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('settings.add_person')}
          className="flex-1 rounded-md bg-app-bg px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-brand-cta"
        />
        <button
          type="submit"
          className="rounded-md bg-app-cardMuted px-2.5 text-slate-200 hover:bg-white/10 transition-colors"
        >
          <Plus size={16} />
        </button>
      </form>
    </div>
  )
}

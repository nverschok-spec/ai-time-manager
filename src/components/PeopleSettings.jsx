import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export default function PeopleSettings() {
  const { t } = useTranslation()
  const people = useAppStore((s) => s.people)
  const person = useAppStore((s) => s.person)
  const removePerson = useAppStore((s) => s.removePerson)

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-300">{t('settings.people')}</p>
      {people.length > 0 && (
        <ul className="space-y-1.5">
          {people.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-lg bg-app-cardMuted px-2.5 py-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="flex-1 text-sm text-slate-200">
                {p.name}
                {person?.id === p.id && <span className="ml-1 text-xs text-muted">({t('settings.you')})</span>}
              </span>
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
      <p className="text-xs text-slate-500">{t('settings.people_hint')}</p>
    </div>
  )
}

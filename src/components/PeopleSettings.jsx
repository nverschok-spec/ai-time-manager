import { useTranslation } from 'react-i18next'
import { Check, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { PEOPLE_COLORS } from '../lib/people'

export default function PeopleSettings() {
  const { t } = useTranslation()
  const people = useAppStore((s) => s.people)
  const person = useAppStore((s) => s.person)
  const removePerson = useAppStore((s) => s.removePerson)
  const updatePersonColor = useAppStore((s) => s.updatePersonColor)

  return (
    <div className="space-y-3">
      {person && (
        <div className="space-y-1.5">
          <p className="text-sm text-slate-300">{t('settings.my_color')}</p>
          <div className="flex flex-wrap gap-2">
            {PEOPLE_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => updatePersonColor(color)}
                className="flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-110"
                style={{ backgroundColor: color }}
              >
                {person.color === color && <Check size={14} className="text-app-bg" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>
      )}

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

import { useTranslation } from 'react-i18next'

function RuleList({ title, items }) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-sm font-medium text-slate-200">{title}</h3>
      <ul className="space-y-1 text-sm text-slate-400">
        {items.map((item, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="shrink-0 text-slate-600">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Static memo content from the plan — not medical advice, flagged as such
// at the bottom per the spec's explicit disclaimer requirement.
export default function HealthRules() {
  const { t } = useTranslation()

  return (
    <div className="space-y-4 rounded-3xl border border-white/[0.06] bg-app-card p-4">
      <RuleList title={t('health.rules.walking_title')} items={t('health.rules.walking', { returnObjects: true })} />
      <RuleList
        title={t('health.rules.strength_title')}
        items={t('health.rules.strength', { returnObjects: true })}
      />
      <RuleList
        title={t('health.rules.strength_rules_title')}
        items={t('health.rules.strength_rules', { returnObjects: true })}
      />
      <RuleList title={t('health.rules.food_title')} items={t('health.rules.food', { returnObjects: true })} />
      <div className="space-y-1.5 text-sm text-slate-400">
        <p>{t('health.rules.beer')}</p>
        <p>{t('health.rules.sleep')}</p>
        <p>{t('health.rules.photo')}</p>
      </div>
      <RuleList title={t('health.rules.medical_title')} items={t('health.rules.medical', { returnObjects: true })} />
      <p className="text-xs italic text-slate-600">{t('health.rules.medical_disclaimer')}</p>
    </div>
  )
}

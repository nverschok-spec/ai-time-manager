import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { toDateKey } from '../../lib/date'
import { checkTotals, daysBetween, nextControlTestDate, CONTROL_TEST_INTERVAL_DAYS } from '../../lib/german'

const inputCls =
  'w-full rounded-md bg-app-bg px-2 py-1 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-brand-cta'

const DEFAULT_PARTS = [
  { key: 'grammatik', max: 25 },
  { key: 'wortschatz', max: 25 },
  { key: 'schreiben', max: 20 }
]

// Simple SVG line of the total (% of max) over time — no chart library.
function ProgressChart({ points }) {
  if (points.length < 2) return null
  const W = 280
  const H = 90
  const pad = 8
  const x = (i) => pad + (i / (points.length - 1)) * (W - pad * 2)
  const y = (pct) => H - pad - (pct / 100) * (H - pad * 2)
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.pct).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="progress">
      <line x1={pad} x2={W - pad} y1={y(70)} y2={y(70)} className="stroke-white/20" strokeDasharray="3 3" />
      <path d={path} fill="none" className="stroke-brand-cta" strokeWidth="2" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={p.id} cx={x(i)} cy={y(p.pct)} r="3" className="fill-brand-cta" />
      ))}
    </svg>
  )
}

export default function ControlTab() {
  const { t, i18n } = useTranslation()
  const checks = useAppStore((s) => s.german.checks)
  const addCheck = useAppStore((s) => s.addGermanCheck)
  const deleteCheck = useAppStore((s) => s.deleteGermanCheck)

  const [date, setDate] = useState(toDateKey(new Date()))
  const [label, setLabel] = useState('')
  const [scores, setScores] = useState({ grammatik: '', wortschatz: '', schreiben: '' })
  const [maxes, setMaxes] = useState({ grammatik: 25, wortschatz: 25, schreiben: 20 })

  const sorted = [...checks].sort((a, b) => a.date.localeCompare(b.date))
  const points = sorted.map((c) => ({ id: c.id, ...checkTotals(c) }))
  const today = toDateKey(new Date())
  const nextDate = nextControlTestDate(checks)
  const daysLeft = nextDate ? daysBetween(today, nextDate) : null

  const partName = (key) => t(`german.part_${key}`)
  const fmtDate = (key) =>
    new Date(`${key}T00:00:00`).toLocaleDateString(i18n.resolvedLanguage, { day: 'numeric', month: 'short', year: 'numeric' })

  function handleAdd(e) {
    e.preventDefault()
    const parts = DEFAULT_PARTS.filter((p) => scores[p.key] !== '').map((p) => ({
      key: p.key,
      score: Math.min(Number(scores[p.key]) || 0, Number(maxes[p.key]) || 0),
      max: Number(maxes[p.key]) || 0
    }))
    if (!parts.length) return
    addCheck({ id: `c-${Date.now().toString(36)}`, date, label: label.trim(), parts })
    setScores({ grammatik: '', wortschatz: '', schreiben: '' })
    setLabel('')
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1 rounded-3xl border border-white/[0.06] bg-app-card p-4">
        <p className="text-xs text-slate-500">{t('german.control_next')}</p>
        {nextDate ? (
          <>
            <p className="text-lg font-semibold text-slate-100">{fmtDate(nextDate)}</p>
            <p className={`text-xs ${daysLeft <= 0 ? 'text-priority-medium' : 'text-slate-500'}`}>
              {daysLeft <= 0 ? t('german.control_due_now') : t('german.control_in_days', { count: daysLeft })}
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-400">{t('german.control_none')}</p>
        )}
        <p className="pt-1 text-xs text-slate-600">{t('german.control_rule', { days: CONTROL_TEST_INTERVAL_DAYS })}</p>
      </div>

      {points.length >= 2 && (
        <div className="space-y-1 rounded-3xl border border-white/[0.06] bg-app-card p-4">
          <p className="text-xs text-slate-500">{t('german.control_chart')}</p>
          <ProgressChart points={points} />
        </div>
      )}

      <div className="space-y-2">
        {[...sorted].reverse().map((c) => {
          const tot = checkTotals(c)
          return (
            <div key={c.id} className="space-y-1 rounded-2xl border border-white/[0.06] bg-app-card p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-200">
                  {fmtDate(c.date)}
                  {c.label ? ` · ${c.label}` : ''}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-sm font-semibold tabular-nums text-slate-100">
                    {tot.score}/{tot.max} <span className="font-normal text-slate-500">({tot.pct}%)</span>
                  </span>
                  <button type="button" onClick={() => deleteCheck(c.id)} aria-label={t('german.delete')} className="text-slate-600 transition-colors hover:text-priority-high">
                    <Trash2 size={13} />
                  </button>
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {c.parts.map((p) => `${partName(p.key)} ${p.score}/${p.max}`).join(' · ')}
              </p>
            </div>
          )
        })}
      </div>

      <form onSubmit={handleAdd} className="space-y-2 rounded-2xl border border-white/[0.06] bg-app-card p-3">
        <p className="text-sm text-slate-300">{t('german.control_add')}</p>
        <div className="flex gap-2">
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="rounded-md bg-app-bg px-2 py-1 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-brand-cta" />
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t('german.control_label')} className={inputCls} />
        </div>
        {DEFAULT_PARTS.map((p) => (
          <div key={p.key} className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-24">{partName(p.key)}</span>
            <input type="number" inputMode="numeric" min={0} value={scores[p.key]} onChange={(e) => setScores({ ...scores, [p.key]: e.target.value })} className={inputCls} />
            <span>/</span>
            <input type="number" inputMode="numeric" min={1} value={maxes[p.key]} onChange={(e) => setMaxes({ ...maxes, [p.key]: e.target.value })} className={inputCls} />
          </div>
        ))}
        <button
          type="submit"
          disabled={Object.values(scores).every((v) => v === '')}
          className="w-full rounded-md bg-brand-cta py-1.5 text-sm font-medium text-brand-ctaForeground transition-all hover:brightness-110 disabled:opacity-50"
        >
          {t('german.save')}
        </button>
      </form>
    </div>
  )
}

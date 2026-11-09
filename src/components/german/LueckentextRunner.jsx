import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store/useAppStore'
import { shuffle } from '../../lib/testBank'
import { toDateKey } from '../../lib/date'
import lueckentext from '../../data/german/lueckentext.json'
import QuestionRunner from '../study/QuestionRunner'

// Static gap-fill exercises (data/german/lueckentext.json) — no API. Reuses
// the study module's question runner; `block` = one topic, null = mixed.
export default function LueckentextRunner({ block, count, onExit }) {
  const { t } = useTranslation()
  const recordDrill = useAppStore((s) => s.recordGermanDrill)
  const checkPlanItem = useAppStore((s) => s.checkGermanPlanItem)
  const [result, setResult] = useState(null)

  const questions = useMemo(() => {
    const pool = block ? lueckentext.questions.filter((q) => q.block === block) : lueckentext.questions
    return shuffle(pool).slice(0, count)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleFinish(results) {
    checkPlanItem(toDateKey(new Date()), 'exercise')
    setResult({ correct: results.filter((r) => r.correct).length, total: results.length })
  }

  if (result) {
    return (
      <div className="space-y-3 rounded-3xl border border-white/[0.06] bg-app-card p-4 text-center">
        <p className="text-3xl font-semibold tabular-nums text-slate-100">
          {result.correct}/{result.total}
        </p>
        <p className="text-sm text-slate-400">{t('german.lt_done')}</p>
        <button
          type="button"
          onClick={onExit}
          className="w-full rounded-full bg-brand-cta py-2 text-sm font-medium text-brand-ctaForeground transition-all hover:brightness-110"
        >
          {t('german.back')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <button type="button" onClick={onExit} className="text-sm text-slate-400 transition-colors hover:text-slate-100">
        ← {t('german.back')}
      </button>
      <QuestionRunner
        questions={questions}
        immediateFeedback
        onAnswer={(q, correct) => recordDrill(q.block, correct)}
        onFinish={handleFinish}
      />
    </div>
  )
}

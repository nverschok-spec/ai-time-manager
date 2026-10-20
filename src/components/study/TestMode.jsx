import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store/useAppStore'
import { shuffle } from '../../lib/testBank'
import { toDateKey } from '../../lib/date'
import QuestionRunner from './QuestionRunner'

// "Пробный тест" — deferred feedback, timed, scored (overall + per block)
// only at the end.
export default function TestMode({ bank, topicSlug, settings, onExit }) {
  const { t } = useTranslation()
  const recordStudyAnswer = useAppStore((s) => s.recordStudyAnswer)
  const recordStudyAttempt = useAppStore((s) => s.recordStudyAttempt)
  const [finished, setFinished] = useState(null)

  const questionCount = Math.min(settings.testQuestionCount || 20, bank.questions.length)
  const questions = useMemo(() => shuffle(bank.questions).slice(0, questionCount), [bank, questionCount])
  const timerSeconds = (settings.testDurationMinutes || 60) * 60

  function handleAnswer(question, correct) {
    recordStudyAnswer({ questionId: question.id, topicSlug, block: question.block, correct })
  }

  function handleFinish(results) {
    const byBlock = {}
    for (const r of results) {
      const q = questions.find((qq) => qq.id === r.questionId)
      if (!q) continue
      byBlock[q.block] = byBlock[q.block] || { correct: 0, total: 0 }
      byBlock[q.block].total++
      if (r.correct) byBlock[q.block].correct++
    }
    const attempt = {
      id: `a-${Date.now()}`,
      topicSlug,
      mode: 'test',
      dateKey: toDateKey(new Date()),
      correct: results.filter((r) => r.correct).length,
      total: results.length,
      byBlock
    }
    recordStudyAttempt(attempt)
    setFinished(attempt)
  }

  if (finished) {
    return (
      <div className="space-y-4">
        <div className="space-y-1 rounded-3xl border border-white/[0.06] bg-app-card p-4 text-center">
          <p className="text-3xl font-semibold tabular-nums text-slate-100">
            {finished.correct}/{finished.total}
          </p>
          <p className="text-sm text-slate-500">{t('study.test_done')}</p>
        </div>
        {Object.entries(finished.byBlock).map(([block, s]) => (
          <div key={block} className="flex items-center justify-between text-sm text-slate-300">
            <span>{block}</span>
            <span className="tabular-nums text-slate-400">
              {s.correct}/{s.total}
            </span>
          </div>
        ))}
        <button
          type="button"
          onClick={onExit}
          className="w-full rounded-full bg-app-cardMuted py-2 text-sm text-slate-200 transition-colors hover:bg-white/10"
        >
          {t('study.back_to_study')}
        </button>
      </div>
    )
  }

  return (
    <QuestionRunner
      questions={questions}
      immediateFeedback={false}
      timerSeconds={timerSeconds}
      onAnswer={handleAnswer}
      onFinish={handleFinish}
    />
  )
}

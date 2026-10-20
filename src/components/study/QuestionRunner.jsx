import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, X } from 'lucide-react'
import { sanitizeExplanationHtml } from '../../lib/testBank'

// Shared mechanics for all 3 study modes — the only real behavioral
// difference between Training/Mistakes (immediate feedback) and Test
// (deferred, scored at the end) is the `immediateFeedback` flag.
export default function QuestionRunner({ questions, immediateFeedback, timerSeconds, onAnswer, onFinish }) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [results, setResults] = useState([])
  const [secondsLeft, setSecondsLeft] = useState(timerSeconds ?? null)

  const question = questions[index]

  useEffect(() => {
    if (!timerSeconds) return
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval)
          onFinish(results)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function advance(currentResults) {
    if (index + 1 >= questions.length) {
      onFinish(currentResults)
    } else {
      setIndex((i) => i + 1)
      setSelected(null)
    }
  }

  function choose(optionIndex) {
    if (selected !== null) return
    setSelected(optionIndex)
    const correct = optionIndex === question.correct
    onAnswer(question, correct)
    const nextResults = [...results, { questionId: question.id, correct }]
    setResults(nextResults)
    if (!immediateFeedback) advance(nextResults)
  }

  if (!question) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{t('study.question_counter', { current: index + 1, total: questions.length })}</span>
        {secondsLeft != null && (
          <span className="tabular-nums">
            {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-app-card p-4 space-y-2">
        <p className="text-xs text-slate-500">{question.block}</p>
        <p className="text-sm text-slate-100">{question.question}</p>
      </div>

      <div className="space-y-2">
        {question.options.map((opt, i) => {
          const isSelected = selected === i
          const isCorrectOption = i === question.correct
          let style = 'bg-app-card text-slate-200 hover:bg-app-cardMuted'
          if (immediateFeedback && selected !== null) {
            if (isCorrectOption) style = 'bg-brand-cta/20 text-slate-100 ring-1 ring-brand-cta'
            else if (isSelected) style = 'bg-priority-high/20 text-slate-100 ring-1 ring-priority-high'
          } else if (isSelected) {
            style = 'bg-app-cardMuted text-slate-100 ring-1 ring-brand-cta'
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => choose(i)}
              disabled={selected !== null}
              className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors active:scale-[0.99] ${style}`}
            >
              <span>{opt}</span>
              {immediateFeedback && selected !== null && isCorrectOption && (
                <Check size={16} className="shrink-0 text-brand-cta" />
              )}
              {immediateFeedback && selected !== null && isSelected && !isCorrectOption && (
                <X size={16} className="shrink-0 text-priority-high" />
              )}
            </button>
          )
        })}
      </div>

      {immediateFeedback && selected !== null && (
        <div className="space-y-2 rounded-2xl border border-white/[0.06] bg-app-card p-3">
          <p
            className="text-sm text-slate-300"
            dangerouslySetInnerHTML={{ __html: sanitizeExplanationHtml(question.explanation) }}
          />
          <button
            type="button"
            onClick={() => advance(results)}
            className="w-full rounded-full bg-brand-cta py-2 text-sm font-medium text-brand-ctaForeground transition-all hover:brightness-110"
          >
            {index + 1 >= questions.length ? t('study.finish') : t('study.next_question')}
          </button>
        </div>
      )}
    </div>
  )
}

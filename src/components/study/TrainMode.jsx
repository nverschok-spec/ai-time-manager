import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store/useAppStore'
import { shuffle } from '../../lib/testBank'
import QuestionRunner from './QuestionRunner'

// "Тренировка" — immediate right/wrong + explanation after every answer,
// runs through the whole bank once per session.
export default function TrainMode({ bank, topicSlug, onExit }) {
  const { t } = useTranslation()
  const recordStudyAnswer = useAppStore((s) => s.recordStudyAnswer)
  const [done, setDone] = useState(false)
  const [sessionKey, setSessionKey] = useState(0)

  const questions = useMemo(() => shuffle(bank.questions), [bank, sessionKey])

  function handleAnswer(question, correct) {
    recordStudyAnswer({ questionId: question.id, topicSlug, block: question.block, correct })
  }

  if (done) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-slate-300">{t('study.train_done')}</p>
        <button
          type="button"
          onClick={() => {
            setSessionKey((k) => k + 1)
            setDone(false)
          }}
          className="w-full rounded-full bg-brand-cta py-2 text-sm font-medium text-brand-ctaForeground transition-all hover:brightness-110"
        >
          {t('study.train_again')}
        </button>
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
    <QuestionRunner key={sessionKey} questions={questions} immediateFeedback onAnswer={handleAnswer} onFinish={() => setDone(true)} />
  )
}

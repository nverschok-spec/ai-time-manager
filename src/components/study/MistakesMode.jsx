import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store/useAppStore'
import { mistakeQuestions, shuffle } from '../../lib/testBank'
import QuestionRunner from './QuestionRunner'

// "Работа над ошибками" — only previously-missed questions, same immediate
// feedback as Training. The question list is a snapshot taken at mount
// (not reactive to `mistakes`) so retiring a question mid-session doesn't
// yank it out of the list the user is currently running through.
export default function MistakesMode({ bank, topicSlug, onExit }) {
  const { t } = useTranslation()
  const mistakes = useAppStore((s) => s.study.mistakes)
  const recordStudyAnswer = useAppStore((s) => s.recordStudyAnswer)
  const [done, setDone] = useState(false)

  const questions = useMemo(
    () => shuffle(mistakeQuestions(bank, mistakes)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bank]
  )

  function handleAnswer(question, correct) {
    recordStudyAnswer({ questionId: question.id, topicSlug, block: question.block, correct })
  }

  if (questions.length === 0) {
    return (
      <div className="space-y-3 rounded-3xl border border-white/[0.06] bg-app-card p-4 text-center text-sm text-slate-300">
        <p>{t('study.no_mistakes')}</p>
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

  if (done) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-slate-300">{t('study.mistakes_session_done')}</p>
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

  return <QuestionRunner questions={questions} immediateFeedback onAnswer={handleAnswer} onFinish={() => setDone(true)} />
}

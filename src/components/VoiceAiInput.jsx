import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Mic, MicOff, Send } from 'lucide-react'

const SpeechRecognitionClass =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

export default function VoiceAiInput({ onSubmit, isLoading }) {
  const { t, i18n } = useTranslation()
  const [text, setText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef(null)

  const voiceAvailable = useMemo(() => Boolean(SpeechRecognitionClass), [])

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || isLoading) return
    onSubmit(trimmed)
    setText('')
  }

  function toggleListening() {
    if (!voiceAvailable) return

    if (isListening) {
      recognitionRef.current?.stop()
      return
    }

    const recognition = new SpeechRecognitionClass()
    recognition.lang = i18n.resolvedLanguage === 'ru' ? 'ru-RU' : i18n.resolvedLanguage === 'de' ? 'de-DE' : 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript || ''
      setText((prev) => (prev ? `${prev} ${transcript}` : transcript))
    }
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('input.placeholder')}
        className="flex-1 rounded-lg bg-slate-800 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-400"
      />
      <button
        type="button"
        onClick={toggleListening}
        disabled={!voiceAvailable}
        title={voiceAvailable ? t('input.mic_start') : t('input.mic_unavailable')}
        className={`rounded-lg p-2.5 transition-colors ${
          !voiceAvailable
            ? 'text-slate-700 cursor-not-allowed'
            : isListening
              ? 'bg-rose-500 text-white'
              : 'bg-slate-800 text-slate-300 hover:text-slate-100'
        }`}
      >
        {voiceAvailable ? <Mic size={18} /> : <MicOff size={18} />}
      </button>
      <button
        type="submit"
        disabled={isLoading || !text.trim()}
        title={t('input.send')}
        className="rounded-lg bg-emerald-500 p-2.5 text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-400 transition-colors"
      >
        <Send size={18} />
      </button>
    </form>
  )
}

import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, Mic, MicOff, Send, X } from 'lucide-react'
import { compressImageFile } from '../lib/image'

const SpeechRecognitionClass =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

export default function VoiceAiInput({ onSubmit, isLoading }) {
  const { t, i18n } = useTranslation()
  const [text, setText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [image, setImage] = useState(null)
  const recognitionRef = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  const voiceAvailable = useMemo(() => Boolean(SpeechRecognitionClass), [])

  function autoGrow(el) {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  function handleChange(e) {
    setText(e.target.value)
    autoGrow(e.target)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if ((!trimmed && !image) || isLoading) return
    onSubmit({ text: trimmed, image })
    setText('')
    setImage(null)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const compressed = await compressImageFile(file)
      setImage(compressed)
    } catch {
      // unreadable file — ignore, user can retry
    }
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
    <form onSubmit={handleSubmit} className="space-y-2">
      {image && (
        <div className="flex items-center gap-2 rounded-lg bg-slate-800 p-2">
          <img src={image.previewUrl} alt="" className="h-12 w-12 rounded-md object-cover" />
          <span className="flex-1 text-xs text-slate-400">{t('input.photo_attached')}</span>
          <button
            type="button"
            onClick={() => setImage(null)}
            className="text-slate-500 hover:text-rose-400 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={t('input.placeholder')}
          className="flex-1 max-h-36 resize-none overflow-y-auto rounded-lg bg-slate-800 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-400"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title={t('input.photo_start')}
          className="rounded-lg bg-slate-800 p-2.5 text-slate-300 hover:text-slate-100 transition-colors"
        >
          <Camera size={18} />
        </button>
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
          disabled={isLoading || (!text.trim() && !image)}
          title={t('input.send')}
          className="rounded-lg bg-emerald-500 p-2.5 text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-400 transition-colors"
        >
          <Send size={18} />
        </button>
      </div>
    </form>
  )
}

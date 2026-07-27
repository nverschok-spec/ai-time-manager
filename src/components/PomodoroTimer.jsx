import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pause, Play, RotateCcw, X } from 'lucide-react'
import { vibrate, HAPTIC } from '../lib/haptics'
import { makeFocusSession } from '../lib/focusStats'
import { useAppStore } from '../store/useAppStore'
import ProgressCircle from './ProgressCircle'

const FOCUS_SECONDS = 25 * 60
const BREAK_SECONDS = 5 * 60

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.frequency.value = 880
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.6)
  } catch {
    // Web Audio unavailable — silently skip the beep, timer still works visually
  }
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function PomodoroTimer({ task, onClose }) {
  const { t } = useTranslation()
  const addFocusSession = useAppStore((s) => s.addFocusSession)
  const [phase, setPhase] = useState('focus')
  const [remaining, setRemaining] = useState(FOCUS_SECONDS)
  const [isRunning, setIsRunning] = useState(false)
  const intervalRef = useRef(null)

  const total = phase === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS

  useEffect(() => {
    if (!isRunning) return
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          playBeep()
          vibrate(HAPTIC.success)
          setIsRunning(false)
          setPhase((prevPhase) => {
            if (prevPhase === 'focus') addFocusSession(makeFocusSession(task))
            return prevPhase === 'focus' ? 'break' : 'focus'
          })
          return prev
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [isRunning, addFocusSession, task])

  useEffect(() => {
    setRemaining(phase === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS)
  }, [phase])

  function handleReset() {
    setIsRunning(false)
    setRemaining(total)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-xs rounded-xl bg-app-card p-5 space-y-4 text-center">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {phase === 'focus' ? t('pomodoro.focus') : t('pomodoro.break')}
          </span>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-slate-300 truncate">{task.title}</p>

        <div className="flex justify-center py-2">
          <ProgressCircle done={total - remaining} total={total}>
            <span className="text-xl font-semibold tabular-nums text-slate-100">
              {formatTime(remaining)}
            </span>
          </ProgressCircle>
        </div>

        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setIsRunning((v) => !v)}
            className="flex items-center gap-1.5 rounded-md bg-brand-cta px-4 py-1.5 text-sm font-medium text-app-bg hover:brightness-110 transition-colors"
          >
            {isRunning ? <Pause size={14} /> : <Play size={14} />}
            {isRunning ? t('pomodoro.pause') : t('pomodoro.start')}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-md bg-app-cardMuted px-3 py-1.5 text-sm text-slate-200 hover:bg-white/10 transition-colors"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

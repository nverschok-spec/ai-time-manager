import { useEffect } from 'react'

const COLORS = ['#3DDC97', '#00C2A8', '#F4B740', '#FF6B6B', '#60A5FA', '#C084FC']
const PIECE_COUNT = 36

export default function Confetti({ onDone }) {
  useEffect(() => {
    const timer = setTimeout(() => onDone?.(), 2200)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {Array.from({ length: PIECE_COUNT }, (_, i) => {
        const left = Math.random() * 100
        const delay = Math.random() * 0.3
        const duration = 1.4 + Math.random() * 0.8
        const rotate = Math.random() * 360
        return (
          <span
            key={i}
            className="absolute top-0 h-2.5 w-1.5 rounded-sm"
            style={{
              left: `${left}%`,
              backgroundColor: COLORS[i % COLORS.length],
              transform: `rotate(${rotate}deg)`,
              animation: `confetti-fall ${duration}s ease-in ${delay}s forwards`
            }}
          />
        )
      })}
    </div>
  )
}

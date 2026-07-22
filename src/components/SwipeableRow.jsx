import { useRef, useState } from 'react'
import { Check, Trash2 } from 'lucide-react'

const SWIPE_THRESHOLD = 72
const DRAG_START_THRESHOLD = 10

// Touch-only (desktop already has the icon buttons — mouse-drag would just
// fight with text selection and click handling for no real benefit there).
export default function SwipeableRow({ children, onSwipeLeft, onSwipeRight }) {
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startRef = useRef({ x: 0, y: 0, active: false })

  function handlePointerDown(e) {
    if (e.pointerType !== 'touch') return
    startRef.current = { x: e.clientX, y: e.clientY, active: true }
  }

  function handlePointerMove(e) {
    if (!startRef.current.active) return
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y

    if (!dragging) {
      if (Math.abs(dx) < DRAG_START_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return
      setDragging(true)
    }
    setDragX(dx)
  }

  function handlePointerUp() {
    if (!startRef.current.active) return
    startRef.current.active = false

    if (dragX <= -SWIPE_THRESHOLD) onSwipeLeft?.()
    else if (dragX >= SWIPE_THRESHOLD) onSwipeRight?.()

    setDragging(false)
    setDragX(0)
  }

  return (
    <div className="relative overflow-hidden rounded-lg">
      <div className="absolute inset-0 flex items-center justify-between bg-app-card/60 px-4">
        <span className="flex items-center gap-1.5 text-sm text-brand-cta">
          <Check size={16} />
        </span>
        <span className="flex items-center gap-1.5 text-sm text-priority-high">
          <Trash2 size={16} />
        </span>
      </div>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging ? 'none' : 'transform 0.2s ease',
          touchAction: 'pan-y'
        }}
        className="relative"
      >
        {children}
      </div>
    </div>
  )
}

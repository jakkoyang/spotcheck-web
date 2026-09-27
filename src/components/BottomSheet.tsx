import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { getSnapHeights, SNAP_ORDER, type SheetSnap } from '../lib/sheetSnaps'

const DRAG_THRESHOLD_PX = 6
const FLICK_VELOCITY = 0.5 // px per ms

function pickSnap(height: number, velocity: number, heights: Record<SheetSnap, number>): SheetSnap {
  if (velocity > FLICK_VELOCITY) return SNAP_ORDER.find((snap) => heights[snap] > height) ?? 'full'
  if (velocity < -FLICK_VELOCITY) {
    return [...SNAP_ORDER].reverse().find((snap) => heights[snap] < height) ?? 'peek'
  }
  return SNAP_ORDER.reduce((best, snap) =>
    Math.abs(heights[snap] - height) < Math.abs(heights[best] - height) ? snap : best,
  )
}

interface DragState {
  startY: number
  startHeight: number
  lastY: number
  lastTime: number
  // positive = moving up
  velocity: number
  moved: boolean
}

interface BottomSheetProps {
  snap: SheetSnap
  onSnapChange: (snap: SheetSnap) => void
  header: ReactNode
  children: ReactNode
}

export function BottomSheet({ snap, onSnapChange, header, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const [containerHeight, setContainerHeight] = useState(0)
  const [dragHeight, setDragHeight] = useState<number | null>(null)

  useEffect(() => {
    const container = sheetRef.current?.parentElement
    if (!container) return
    const observer = new ResizeObserver(([entry]) => setContainerHeight(entry.contentRect.height))
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const snapHeights = getSnapHeights(containerHeight)
  const height = dragHeight ?? snapHeights[snap]

  // Lets map controls (attribution, logo) sit just above the sheet.
  useEffect(() => {
    sheetRef.current?.parentElement?.style.setProperty('--sheet-height', `${height}px`)
  }, [height])

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragRef.current = {
      startY: event.clientY,
      startHeight: height,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      velocity: 0,
      moved: false,
    }
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const deltaY = drag.startY - event.clientY
    if (!drag.moved) {
      if (Math.abs(deltaY) < DRAG_THRESHOLD_PX) return
      // Capture only once a drag starts, so taps still reach buttons inside the header.
      drag.moved = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    const elapsed = event.timeStamp - drag.lastTime
    if (elapsed > 0) drag.velocity = (drag.lastY - event.clientY) / elapsed
    drag.lastY = event.clientY
    drag.lastTime = event.timeStamp
    setDragHeight(Math.min(snapHeights.full, Math.max(snapHeights.peek, drag.startHeight + deltaY)))
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag?.moved) return
    // A pause before release isn't a flick.
    const velocity = event.timeStamp - drag.lastTime > 100 ? 0 : drag.velocity
    setDragHeight(null)
    onSnapChange(pickSnap(height, velocity, snapHeights))
  }

  const cycleSnap = () => onSnapChange(snap === 'peek' ? 'half' : snap === 'half' ? 'full' : 'peek')

  return (
    <div
      ref={sheetRef}
      style={{ height }}
      className={`absolute inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-md flex-col rounded-t-2xl border border-b-0 border-neutral-700 bg-neutral-900/95 shadow-[0_-8px_24px_rgba(0,0,0,0.4)] backdrop-blur ${
        dragHeight === null ? 'transition-[height] duration-300 ease-out' : ''
      }`}
    >
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="shrink-0 cursor-grab touch-none select-none active:cursor-grabbing"
      >
        <button
          type="button"
          onClick={cycleSnap}
          aria-label={snap === 'full' ? 'Collapse sheet' : 'Expand sheet'}
          className="flex w-full justify-center pb-1 pt-2.5"
        >
          <span className="h-1 w-10 rounded-full bg-neutral-600" />
        </button>
        {header}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </div>
  )
}

import { isMobileDevice } from '@utils/mobile-device'
import { useEffect, useRef } from 'react'

// iOS can pan the visual viewport independently while the keyboard is open.
// Keep both sticky rows in that viewport without changing document scrolling.
export const useVisualViewportStickyOffset = (enabled: boolean) => {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    const viewport = window.visualViewport
    if (!enabled || !root || !viewport || !isMobileDevice()) {
      return
    }

    const property = '--app-viewport-offset-top'
    const previousValue = root.style.getPropertyValue(property)
    let frame: number | null = null

    const update = () => {
      frame = null
      // Pinch zoom should retain the browser's normal panning behavior.
      const offset =
        Math.abs(viewport.scale - 1) < 0.01
          ? Math.max(0, viewport.offsetTop)
          : 0
      root.style.setProperty(property, `${offset}px`)
    }
    const scheduleUpdate = () => {
      if (frame === null) {
        frame = window.requestAnimationFrame(update)
      }
    }

    update()
    viewport.addEventListener('resize', scheduleUpdate)
    viewport.addEventListener('scroll', scheduleUpdate)
    window.addEventListener('scroll', scheduleUpdate, { passive: true })

    return () => {
      viewport.removeEventListener('resize', scheduleUpdate)
      viewport.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('scroll', scheduleUpdate)
      if (frame !== null) {
        window.cancelAnimationFrame(frame)
      }
      if (previousValue) {
        root.style.setProperty(property, previousValue)
      } else {
        root.style.removeProperty(property)
      }
    }
  }, [enabled])

  return rootRef
}

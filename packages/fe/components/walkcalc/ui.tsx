import { X } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { getCompressImage } from '../../utils/oss'
import { useWalkcalcI18n } from './i18n'
import styles from './walkcalc.module.css'

let openDialogs = 0
let bodyStyleBeforeDialogs: { overflow: string; paddingRight: string } | null =
  null

export function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
}) {
  const { t } = useWalkcalcI18n()
  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dialogRef = useRef<HTMLElement | null>(null)
  const gesture = useRef<{ x: number; y: number; canDismiss: boolean } | null>(
    null,
  )

  useEffect(() => {
    if (openDialogs === 0) {
      const body = document.body
      bodyStyleBeforeDialogs = {
        overflow: body.style.overflow,
        paddingRight: body.style.paddingRight,
      }
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth
      if (scrollbarWidth > 0) {
        const paddingRight =
          Number.parseFloat(getComputedStyle(body).paddingRight) || 0
        body.style.paddingRight = `${paddingRight + scrollbarWidth}px`
      }
      body.style.overflow = 'hidden'
    }
    openDialogs += 1
    return () => {
      openDialogs -= 1
      if (openDialogs === 0 && bodyStyleBeforeDialogs) {
        document.body.style.overflow = bodyStyleBeforeDialogs.overflow
        document.body.style.paddingRight = bodyStyleBeforeDialogs.paddingRight
        bodyStyleBeforeDialogs = null
      }
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [])

  function requestClose() {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
    closeTimer.current = setTimeout(onClose, 220)
  }

  function canSwipeClose(target: EventTarget | null) {
    const dialog = dialogRef.current
    if (!dialog || dialog.scrollTop > 0) return false
    let node = target instanceof Element ? target : null
    while (node && node !== dialog) {
      if (
        node instanceof HTMLElement &&
        node.scrollHeight > node.clientHeight + 2 &&
        node.scrollTop > 0
      )
        return false
      node = node.parentElement
    }
    return true
  }

  return (
    <div
      className={`${styles.scrim} ${closing ? styles.scrimClosing : ''}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose()
      }}
    >
      <section
        ref={dialogRef}
        className={`${styles.dialog} ${wide ? styles.dialogWide : ''} ${
          closing ? styles.dialogClosing : ''
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onTouchStart={(event) => {
          if (event.touches.length !== 1) return
          const touch = event.touches[0]
          gesture.current = {
            x: touch.clientX,
            y: touch.clientY,
            canDismiss: canSwipeClose(event.target),
          }
        }}
        onTouchEnd={(event) => {
          const start = gesture.current
          gesture.current = null
          if (!start?.canDismiss || event.changedTouches.length !== 1) return
          const touch = event.changedTouches[0]
          const dx = touch.clientX - start.x
          const dy = touch.clientY - start.y
          if (dy > 85 && dy > Math.abs(dx) * 1.5 && canSwipeClose(event.target))
            requestClose()
        }}
        onTouchCancel={() => {
          gesture.current = null
        }}
      >
        <span className={styles.sheetHandle} aria-hidden="true" />
        <div className={styles.dialogHeader}>
          <h2>{title}</h2>
          <button
            type="button"
            className={styles.iconButton}
            onClick={requestClose}
            aria-label={t('关闭')}
          >
            <X size={19} />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}

export function Initials({
  name,
  avatar,
  size = 28,
}: { name: string; avatar?: string; size?: number }) {
  const [failedUrl, setFailedUrl] = useState('')
  const imageUrl = avatar?.trim() || ''
  return (
    <span
      className={styles.avatar}
      style={{ width: size, height: size }}
      aria-label={name}
    >
      {imageUrl && failedUrl !== imageUrl ? (
        <img
          src={getCompressImage(imageUrl, size * 2)}
          alt=""
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : (
        name.trim().slice(0, 1).toUpperCase() || '?'
      )}
    </span>
  )
}

export function ErrorNote({ message }: { message?: string }) {
  return message ? (
    <p className={styles.error} role="alert">
      {message}
    </p>
  ) : null
}

export function Empty({
  title,
  detail,
  action,
}: { title: string; detail?: string; action?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <strong>{title}</strong>
      {detail && <p>{detail}</p>}
      {action}
    </div>
  )
}

export { styles }

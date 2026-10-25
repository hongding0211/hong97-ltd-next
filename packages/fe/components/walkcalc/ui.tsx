import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import styles from './walkcalc.module.css'

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
  return (
    <div
      className={styles.scrim}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className={`${styles.dialog} ${wide ? styles.dialogWide : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.dialogHeader}>
          <h2>{title}</h2>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={19} />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}

export function Initials({ name }: { name: string }) {
  return (
    <span className={styles.avatar} aria-hidden="true">
      {name.trim().slice(0, 1).toUpperCase() || '?'}
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

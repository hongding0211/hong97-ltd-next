import { ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { money } from './api'
import { useWalkcalcI18n } from './i18n'
import { styles } from './ui'

export type CurrencyBalance = {
  currencyCode: string
  amount: string
}

export default function BalanceCarousel({
  balances,
  title,
  subtitle,
  compact = false,
  colored = false,
  onOpen,
}: {
  balances: CurrencyBalance[]
  title?: string
  subtitle?: (balance: CurrencyBalance) => string
  compact?: boolean
  colored?: boolean
  onOpen?: () => void
}) {
  const { t } = useWalkcalcI18n()
  const [selection, setSelection] = useState(0)
  const [interacted, setInteracted] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const swiped = useRef(false)
  const current = balances[Math.min(selection, balances.length - 1)]

  useEffect(() => {
    if (balances.length < 2 || interacted) return
    const timer = window.setInterval(() => {
      setSelection((value) => (value + 1) % balances.length)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [balances.length, interacted])

  function move(direction: number) {
    setInteracted(true)
    setSelection(
      (value) => (value + direction + balances.length) % balances.length,
    )
  }

  return (
    <div
      className={compact ? styles.compactBalance : styles.carouselBalance}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null || balances.length < 2) return
        const delta =
          (event.changedTouches[0]?.clientX ?? touchStartX.current) -
          touchStartX.current
        touchStartX.current = null
        if (Math.abs(delta) > 35) {
          move(delta < 0 ? 1 : -1)
          swiped.current = true
        }
      }}
      onClickCapture={(event) => {
        if (swiped.current) {
          event.preventDefault()
          event.stopPropagation()
          swiped.current = false
        }
      }}
    >
      {title && <span className={styles.balanceTitle}>{title}</span>}
      <div className={styles.carouselLine}>
        {onOpen ? (
          <button type="button" className={styles.balanceOpen} onClick={onOpen}>
            <strong
              className={
                colored && current
                  ? Number(current.amount) > 0
                    ? styles.positive
                    : Number(current.amount) < 0
                      ? styles.negative
                      : ''
                  : ''
              }
            >
              {current
                ? money(current.amount, current.currencyCode, true)
                : '—'}
            </strong>
          </button>
        ) : (
          <strong
            className={
              colored && current
                ? Number(current.amount) > 0
                  ? styles.positive
                  : Number(current.amount) < 0
                    ? styles.negative
                    : ''
                : ''
            }
          >
            {current ? money(current.amount, current.currencyCode, true) : '—'}
          </strong>
        )}
        {balances.length > 1 && !compact && (
          <span className={styles.carouselControls}>
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label={t('上一种货币')}
            >
              <ChevronUp size={13} />
            </button>
            <span
              aria-label={t(
                '第 %@ 种货币，共 %@ 种',
                selection + 1,
                balances.length,
              )}
            >
              {selection + 1}/{balances.length}
            </span>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label={t('下一种货币')}
            >
              <ChevronDown size={13} />
            </button>
          </span>
        )}
      </div>
      {subtitle && current && (
        <span className={styles.balanceSubtitle}>{subtitle(current)}</span>
      )}
    </div>
  )
}

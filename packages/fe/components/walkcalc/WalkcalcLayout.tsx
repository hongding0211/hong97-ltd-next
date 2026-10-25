import { useUser } from '@hooks/useUser'
import { useAppStore } from '@stores/general'
import { useRouter } from 'next/router'
import type { ReactNode } from 'react'
import { styles } from './ui'

export default function WalkcalcLayout({ children }: { children: ReactNode }) {
  const user = useUser()
  const isLoading = useAppStore((state) => state.isLoading)
  const isLogin = Boolean(user)
  const router = useRouter()
  return (
    <div className={styles.app}>
      <header className={styles.appHeader}>
        <a className={styles.brand} href="/walkcalc">
          <span className={styles.brandMark}>
            W<span>·</span>C
          </span>
          <span>WalkCalc</span>
        </a>
        <div className={styles.headerRight}>
          {isLogin && <span>{user?.profile?.name}</span>}
        </div>
      </header>
      {isLogin ? (
        children
      ) : isLoading ? (
        <main className={styles.auth}>
          <p>正在检查登录状态…</p>
        </main>
      ) : (
        <main className={styles.auth}>
          <span className={styles.eyebrow}>WALKCALC</span>
          <h1>一起记账，轻松结清。</h1>
          <p>登录后查看与你共享的群组、记录和余额。</p>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() =>
              router.push(
                `/sso/login?source=walkcalc&redirect=${encodeURIComponent(
                  window.location.href,
                )}`,
              )
            }
          >
            登录 WalkCalc
          </button>
        </main>
      )}
    </div>
  )
}

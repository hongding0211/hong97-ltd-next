import { useUser } from '@hooks/useUser'
import { useAppStore } from '@stores/general'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { type Page, type WalkcalcGroupSummaryDto, walkcalcApi } from './api'
import { useWalkcalcI18n } from './i18n'
import { Dialog, Empty, ErrorNote, Initials, styles } from './ui'

type AccountPanel = 'settings' | 'archived' | null

export default function WalkcalcLayout({
  children,
  secondaryHeader,
}: {
  children: ReactNode
  secondaryHeader?: ReactNode
}) {
  const user = useUser()
  const isLoading = useAppStore((state) => state.isLoading)
  const router = useRouter()
  const { t, language } = useWalkcalcI18n()
  const [panel, setPanel] = useState<AccountPanel>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const menuRef = useRef<HTMLDetailsElement | null>(null)

  useEffect(() => {
    const previous = document.documentElement.lang
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
    return () => {
      document.documentElement.lang = previous
    }
  }, [language])

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        menuRef.current.open = false
      }
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])

  function openPanel(next: AccountPanel) {
    if (menuRef.current) menuRef.current.open = false
    setPanel(next)
  }

  async function logout() {
    if (!window.confirm(t('确认登出吗？'))) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) throw new Error(t('登出失败'))
      window.location.assign('/walkcalc')
    } catch (cause) {
      setError((cause as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className={styles.app}>
      <header className={styles.appHeader}>
        <div
          className={`${styles.headerInner} ${
            user && secondaryHeader ? styles.secondaryHeaderInner : ''
          }`}
        >
          {user && secondaryHeader ? (
            secondaryHeader
          ) : (
            <>
              <Link
                className={styles.brand}
                href="/walkcalc"
                aria-label="Walking Calculator"
              >
                <img
                  className={styles.brandLight}
                  src="/walkcalc/mark-light.png"
                  alt=""
                />
                <img
                  className={styles.brandDark}
                  src="/walkcalc/mark-dark.png"
                  alt=""
                  aria-hidden="true"
                />
              </Link>
              {user && (
                <details className={styles.profileMenu} ref={menuRef}>
                  <summary aria-label={t('账号')}>
                    <Initials
                      name={user.profile?.name || t('我')}
                      avatar={user.profile?.avatar}
                      size={34}
                    />
                  </summary>
                  <div className={styles.actionMenu}>
                    <button type="button" onClick={() => openPanel('settings')}>
                      {t('设置')}
                    </button>
                    <button type="button" onClick={() => openPanel('archived')}>
                      {t('已归档群组')}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void logout()}
                    >
                      {t('登出')}
                    </button>
                  </div>
                </details>
              )}
            </>
          )}
        </div>
      </header>
      <ErrorNote message={error} />
      {user ? (
        children
      ) : isLoading ? (
        <main className={styles.auth}>
          <p>{t('正在加载群组...')}</p>
        </main>
      ) : (
        <main className={styles.auth}>
          <h1>Walking Calculator</h1>
          <p>{t('登录以继续')}</p>
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
            {t('使用 hong97.ltd 继续')}
          </button>
        </main>
      )}
      {user && panel === 'settings' && (
        <Dialog title={t('设置')} onClose={() => setPanel(null)}>
          <div className={styles.form}>
            <h3 className={styles.formSectionTitle}>{t('账号')}</h3>
            <div className={styles.listPanel}>
              <div className={styles.listRow}>
                <span className={styles.person}>
                  <Initials
                    name={user.profile?.name || t('我')}
                    avatar={user.profile?.avatar}
                    size={32}
                  />
                  {user.profile?.name}
                </span>
              </div>
              <Link className={styles.listRow} href="/sso/profile">
                {t('编辑资料')} <ChevronRight size={16} />
              </Link>
            </div>
            <Link
              className={`${styles.listRow} ${styles.listPanel}`}
              href="/privacy/walkcalc"
            >
              {t('隐私政策')} <ChevronRight size={16} />
            </Link>
          </div>
        </Dialog>
      )}
      {user && panel === 'archived' && (
        <ArchivedGroups onClose={() => setPanel(null)} />
      )}
    </div>
  )
}

function ArchivedGroups({ onClose }: { onClose: () => void }) {
  const { t } = useWalkcalcI18n()
  const [groups, setGroups] = useState<WalkcalcGroupSummaryDto[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    void walkcalcApi<Page<WalkcalcGroupSummaryDto>>(
      '/groups/my?page=1&pageSize=100&archiveState=archived',
    )
      .then((result) => setGroups(result.data))
      .catch((cause) => setError(cause.message))
  }, [])
  async function restore(code: string) {
    setBusy(true)
    try {
      await walkcalcApi(`/groups/${encodeURIComponent(code)}/unarchive`, {
        method: 'POST',
      })
      setGroups((current) => current.filter((group) => group.code !== code))
      window.dispatchEvent(new Event('walkcalc:groups-changed'))
    } catch (cause) {
      setError((cause as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog title={t('已归档群组')} onClose={onClose}>
      <div className={styles.form}>
        <ErrorNote message={error} />
        {groups.length ? (
          groups.map((group) => (
            <div key={group.code} className={styles.listRow}>
              <Link href={`/walkcalc/group/${encodeURIComponent(group.code)}`}>
                {group.name}
              </Link>
              <button
                type="button"
                className={styles.textButton}
                disabled={busy}
                onClick={() => void restore(group.code)}
              >
                {t('恢复')}
              </button>
            </div>
          ))
        ) : (
          <Empty title={t('没有已归档群组')} />
        )}
      </div>
    </Dialog>
  )
}

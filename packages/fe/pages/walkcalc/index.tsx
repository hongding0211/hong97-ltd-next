import { useUser } from '@hooks/useUser'
import {
  Archive,
  ChevronRight,
  Ellipsis,
  Plus,
  Search,
  UsersRound,
} from 'lucide-react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import WalkcalcLayout from '../../components/walkcalc/WalkcalcLayout'
import {
  currencies,
  money,
  participantName,
  queryString,
  walkcalcApi,
} from '../../components/walkcalc/api'
import type {
  Page,
  WalkcalcGroupSummaryDto,
  WalkcalcHomeSummaryDto,
} from '../../components/walkcalc/api'
import {
  Dialog,
  Empty,
  ErrorNote,
  Initials,
  styles,
} from '../../components/walkcalc/ui'

type Panel = 'create' | 'join' | 'archived' | null

export default function WalkcalcHome() {
  const user = useUser()
  const userId = user?.userId
  const [groups, setGroups] = useState<WalkcalcGroupSummaryDto[]>([])
  const [summary, setSummary] = useState<WalkcalcHomeSummaryDto | null>(null)
  const [panel, setPanel] = useState<Panel>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [currency, setCurrency] = useState('CNY')

  async function load(nextPage = 1, query = search) {
    if (!userId) return
    setLoading(true)
    setError('')
    try {
      const [list, balance] = await Promise.all([
        walkcalcApi<Page<WalkcalcGroupSummaryDto>>(
          `/groups/my${queryString({
            page: nextPage,
            pageSize: 30,
            search: query,
            archiveState: 'active',
          })}`,
        ),
        nextPage === 1
          ? walkcalcApi<WalkcalcHomeSummaryDto>('/home/summary')
          : Promise.resolve(null),
      ])
      setGroups((current) =>
        nextPage === 1 ? list.data : [...current, ...list.data],
      )
      setPage(nextPage)
      setTotal(list.total)
      if (balance) setSummary(balance)
    } catch (cause) {
      setError((cause as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userId) void load(1, '')
  }, [userId])
  useEffect(() => {
    if (!userId) return
    const timer = window.setTimeout(() => {
      void load(1, search)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [search])

  async function submitCreate() {
    if (!name.trim()) return
    setBusy(true)
    setError('')
    try {
      const result = await walkcalcApi<{ code: string }>('/groups', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), currencyCode: currency }),
      })
      window.location.href = `/walkcalc/group/${encodeURIComponent(
        result.code,
      )}`
    } catch (cause) {
      setError((cause as Error).message)
      setBusy(false)
    }
  }

  async function submitJoin() {
    if (!code.trim()) return
    setBusy(true)
    setError('')
    try {
      const result = await walkcalcApi<{ code: string }>('/groups/join', {
        method: 'POST',
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      })
      window.location.href = `/walkcalc/group/${encodeURIComponent(
        result.code,
      )}`
    } catch (cause) {
      setError((cause as Error).message)
      setBusy(false)
    }
  }

  async function groupAction(
    group: WalkcalcGroupSummaryDto,
    action: 'archive' | 'delete',
  ) {
    if (action === 'archive' && group.hasUnresolvedBalance) {
      setError('请先结清余额，再归档群组。')
      return
    }
    if (
      !window.confirm(
        action === 'delete'
          ? `删除“${group.name}”？未结清的余额会先自动结清。`
          : `归档“${group.name}”？`,
      )
    )
      return
    setBusy(true)
    setError('')
    try {
      await walkcalcApi(
        `/groups/${encodeURIComponent(group.code)}${
          action === 'archive' ? '/archive' : ''
        }`,
        { method: action === 'archive' ? 'POST' : 'DELETE' },
      )
      await load(1)
    } catch (cause) {
      setError((cause as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Head>
        <title>WalkCalc · hong97</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <WalkcalcLayout>
        <main className={styles.shell}>
          <div className={styles.topline}>
            <div>
              <span className={styles.eyebrow}>WALKCALC</span>
              <h1>群组</h1>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setPanel('archived')}
                aria-label="已归档群组"
              >
                <Archive size={19} />
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  setError('')
                  setPanel('join')
                }}
              >
                加入群组
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => {
                  setError('')
                  setPanel('create')
                }}
              >
                <Plus size={17} /> 创建群组
              </button>
            </div>
          </div>
          <ErrorNote message={error} />
          {summary && (
            <div className={styles.balanceCard}>
              <div>
                <span className={styles.muted}>我的总余额</span>
                <div className={styles.balanceGrid}>
                  {(summary.balances?.length
                    ? summary.balances
                    : [{ currencyCode: 'CNY', totalBalance: '0' }]
                  ).map((item) => (
                    <div key={item.currencyCode}>
                      <span className={styles.currencyCode}>
                        {item.currencyCode}
                      </span>
                      <strong
                        className={
                          Number(item.totalBalance) > 0
                            ? styles.positive
                            : Number(item.totalBalance) < 0
                              ? styles.negative
                              : ''
                        }
                      >
                        {money(item.totalBalance, item.currencyCode)}
                      </strong>
                      <small>
                        {Number(item.totalBalance) > 0
                          ? '待收回'
                          : Number(item.totalBalance) < 0
                            ? '待支付'
                            : '已结清'}
                      </small>
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.balanceIcon}>
                <UsersRound size={24} />
              </div>
            </div>
          )}
          <div className={styles.sectionHead}>
            <h2>
              全部群组 <span>{total}</span>
            </h2>
            <label className={styles.search}>
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索群组"
                aria-label="搜索群组"
              />
            </label>
          </div>
          <div className={styles.groupGrid}>
            {groups.map((group) => (
              <article key={group.code} className={styles.groupCard}>
                <Link
                  className={styles.groupLink}
                  href={`/walkcalc/group/${encodeURIComponent(group.code)}`}
                >
                  <div className={styles.groupTitle}>
                    <div>
                      <h3>{group.name}</h3>
                      <span>
                        {group.participantCount} 位成员 · {group.currencyCode}
                      </span>
                    </div>
                    <ChevronRight size={19} />
                  </div>
                  <div className={styles.groupBottom}>
                    <div className={styles.avatarStack}>
                      {group.participantPreview?.slice(0, 4).map((member) => (
                        <Initials
                          key={member.participantId}
                          name={participantName(member)}
                        />
                      ))}
                    </div>
                    <div className={styles.groupAmount}>
                      <span>我的余额</span>
                      {(group.currentUserCurrencyBalances?.length
                        ? group.currentUserCurrencyBalances
                        : [
                            {
                              currencyCode: group.currencyCode,
                              balance: group.currentUserBalance,
                            },
                          ]
                      ).map((row) => (
                        <strong
                          key={row.currencyCode}
                          className={
                            Number(row.balance) > 0
                              ? styles.positive
                              : Number(row.balance) < 0
                                ? styles.negative
                                : ''
                          }
                        >
                          {money(row.balance, row.currencyCode)}
                        </strong>
                      ))}
                    </div>
                  </div>
                </Link>
                <details className={styles.cardMenu}>
                  <summary aria-label={`${group.name}的操作`}>
                    <Ellipsis size={18} />
                  </summary>
                  <div>
                    <button
                      type="button"
                      onClick={() => groupAction(group, 'archive')}
                      disabled={busy}
                    >
                      归档
                    </button>
                    {group.isOwner && (
                      <button
                        type="button"
                        className={styles.negative}
                        onClick={() => groupAction(group, 'delete')}
                        disabled={busy}
                      >
                        删除
                      </button>
                    )}
                  </div>
                </details>
              </article>
            ))}
          </div>
          {!loading && !groups.length && (
            <Empty
              title={search ? '没有找到群组' : '还没有群组'}
              detail={
                search ? '试试其他关键词。' : '创建一个群组，开始记录共同花费。'
              }
              action={
                !search && (
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => setPanel('create')}
                  >
                    创建群组
                  </button>
                )
              }
            />
          )}
          {loading && <p className={styles.muted}>加载中…</p>}
          {groups.length < total && (
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={loading}
              onClick={() => load(page + 1)}
            >
              加载更多
            </button>
          )}
        </main>
      </WalkcalcLayout>
      {panel === 'create' && (
        <Dialog title="创建群组" onClose={() => setPanel(null)}>
          <div className={styles.form}>
            <label>
              群组名称
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                placeholder="例如：周末旅行"
              />
            </label>
            <label>
              默认货币
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
              >
                {currencies.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <ErrorNote message={error} />
            <button
              type="button"
              className={styles.primaryButton}
              disabled={busy || !name.trim()}
              onClick={submitCreate}
            >
              创建群组
            </button>
          </div>
        </Dialog>
      )}
      {panel === 'join' && (
        <Dialog title="加入群组" onClose={() => setPanel(null)}>
          <div className={styles.form}>
            <label>
              群组 ID
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="输入群组 ID"
              />
            </label>
            <ErrorNote message={error} />
            <button
              type="button"
              className={styles.primaryButton}
              disabled={busy || !code.trim()}
              onClick={submitJoin}
            >
              加入群组
            </button>
          </div>
        </Dialog>
      )}
      {panel === 'archived' && (
        <ArchivedGroups
          onClose={() => {
            setPanel(null)
            void load(1)
          }}
        />
      )}
    </>
  )
}

function ArchivedGroups({ onClose }: { onClose: () => void }) {
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
    } catch (cause) {
      setError((cause as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog title="已归档群组" onClose={onClose}>
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
                onClick={() => restore(group.code)}
              >
                恢复
              </button>
            </div>
          ))
        ) : (
          <Empty title="没有已归档群组" />
        )}
      </div>
    </Dialog>
  )
}

export async function getServerSideProps({ locale = 'cn' }) {
  return {
    props: { ...(await serverSideTranslations(locale, ['common', 'toast'])) },
  }
}

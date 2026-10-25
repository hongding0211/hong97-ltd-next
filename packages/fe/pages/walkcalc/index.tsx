import { useUser } from '@hooks/useUser'
import { Plus } from 'lucide-react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import BalanceCarousel from '../../components/walkcalc/BalanceCarousel'
import WalkcalcLayout from '../../components/walkcalc/WalkcalcLayout'
import {
  currencies,
  participantName,
  queryString,
  walkcalcApi,
} from '../../components/walkcalc/api'
import type {
  Page,
  WalkcalcGroupSummaryDto,
  WalkcalcHomeSummaryDto,
  WalkcalcPublicUserDto,
} from '../../components/walkcalc/api'
import { useWalkcalcI18n } from '../../components/walkcalc/i18n'
import {
  Dialog,
  Empty,
  ErrorNote,
  Initials,
  styles,
} from '../../components/walkcalc/ui'

type Panel = 'add' | 'create' | 'join' | null

export default function WalkcalcHome() {
  const { t } = useWalkcalcI18n()
  const router = useRouter()
  const user = useUser()
  const userId = user?.userId
  const [groups, setGroups] = useState<WalkcalcGroupSummaryDto[]>([])
  const [summary, setSummary] = useState<WalkcalcHomeSummaryDto | null>(null)
  const [panel, setPanel] = useState<Panel>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [currency, setCurrency] = useState('CNY')
  const [memberSearch, setMemberSearch] = useState('')
  const [memberResults, setMemberResults] = useState<WalkcalcPublicUserDto[]>(
    [],
  )
  const [initialMembers, setInitialMembers] = useState<WalkcalcPublicUserDto[]>(
    [],
  )
  const [tempMemberName, setTempMemberName] = useState('')
  const [tempMembers, setTempMembers] = useState<string[]>([])
  const [createdGroupCode, setCreatedGroupCode] = useState('')

  useEffect(() => {
    if (!memberSearch.trim()) {
      setMemberResults([])
      return
    }
    const timer = window.setTimeout(() => {
      void walkcalcApi<WalkcalcPublicUserDto[]>(
        `/users/search${queryString({ name: memberSearch.trim() })}`,
      )
        .then(setMemberResults)
        .catch(() => setMemberResults([]))
    }, 300)
    return () => window.clearTimeout(timer)
  }, [memberSearch])

  async function load(nextPage = 1) {
    if (!userId) return
    setLoading(true)
    setError('')
    try {
      const [list, balance] = await Promise.all([
        walkcalcApi<Page<WalkcalcGroupSummaryDto>>(
          `/groups/my${queryString({
            page: nextPage,
            pageSize: 30,
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
    if (userId) void load(1)
  }, [userId])

  useEffect(() => {
    const reload = () => {
      void load(1)
    }
    window.addEventListener('walkcalc:groups-changed', reload)
    return () => window.removeEventListener('walkcalc:groups-changed', reload)
  }, [])

  async function submitCreate() {
    if (!name.trim() || createdGroupCode) return
    setBusy(true)
    setError('')
    let createdCode = ''
    try {
      const result = await walkcalcApi<{ code: string }>('/groups', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), currencyCode: currency }),
      })
      createdCode = result.code
      setCreatedGroupCode(result.code)
      if (initialMembers.length) {
        await walkcalcApi(`/groups/${encodeURIComponent(result.code)}/invite`, {
          method: 'POST',
          body: JSON.stringify({
            userIds: initialMembers.map((person) => person.userId),
          }),
        })
      }
      for (const member of tempMembers) {
        await walkcalcApi(
          `/groups/${encodeURIComponent(result.code)}/temp-users`,
          {
            method: 'POST',
            body: JSON.stringify({ name: member }),
          },
        )
      }
      await router.push(`/walkcalc/group/${encodeURIComponent(result.code)}`)
    } catch (cause) {
      setError(
        createdCode
          ? `${t('群组已创建，添加初始成员时出错：')} ${
              (cause as Error).message
            }`
          : (cause as Error).message,
      )
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
      await router.push(`/walkcalc/group/${encodeURIComponent(result.code)}`)
    } catch (cause) {
      setError((cause as Error).message)
      setBusy(false)
    }
  }

  return (
    <>
      <Head>
        <title>WalkCalc · hong97</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="WalkCalc" />
        <meta
          name="theme-color"
          content="#fafafa"
          media="(prefers-color-scheme: light)"
        />
        <meta
          name="theme-color"
          content="#0a0a0a"
          media="(prefers-color-scheme: dark)"
        />
        <link rel="apple-touch-icon" href="/walkcalc/app-icon.png" />
        <link rel="manifest" href="/walkcalc/manifest.webmanifest" />
      </Head>
      <WalkcalcLayout>
        <main className={styles.shell}>
          <ErrorNote message={error} />
          {groups.length > 0 && summary && (
            <div className={`${styles.balanceCard} ${styles.homeBalanceCard}`}>
              <BalanceCarousel
                title={t('总余额')}
                balances={(summary.balances || []).map((item) => ({
                  currencyCode: item.currencyCode,
                  amount: item.totalBalance,
                }))}
                subtitle={(balance) => {
                  const count = groups.filter((group) =>
                    group.currentUserCurrencyBalances?.some(
                      (row) =>
                        row.currencyCode === balance.currencyCode &&
                        (row.recordCount > 0 || Number(row.balance) !== 0),
                    ),
                  ).length
                  return t('来自 %@ 个账本', count || total)
                }}
              />
            </div>
          )}
          {groups.length > 0 && (
            <div className={styles.sectionHead}>
              <h2>{t('全部群组')}</h2>
            </div>
          )}
          <div className={styles.groupGrid}>
            {groups.map((group) => (
              <article key={group.code} className={styles.groupCard}>
                <Link
                  className={styles.groupLink}
                  href={`/walkcalc/group/${encodeURIComponent(group.code)}`}
                >
                  <div className={styles.groupIdentity}>
                    <h3>{group.name}</h3>
                    <div className={styles.avatarStack}>
                      {group.participantPreview?.slice(0, 4).map((member) => (
                        <Initials
                          key={member.participantId}
                          name={participantName(member)}
                          avatar={member.profile?.avatar}
                        />
                      ))}
                    </div>
                  </div>
                  <BalanceCarousel
                    compact
                    colored
                    balances={(group.currentUserCurrencyBalances?.length
                      ? group.currentUserCurrencyBalances
                      : [
                          {
                            currencyCode: group.currencyCode,
                            balance: group.currentUserBalance,
                          },
                        ]
                    ).map((row) => ({
                      currencyCode: row.currencyCode,
                      amount: row.balance,
                    }))}
                  />
                </Link>
              </article>
            ))}
          </div>
          {!loading && !groups.length && (
            <Empty
              title={t('暂无群组')}
              detail={t('创建群组，或加入朋友、室友、旅行伙伴共享的群组。')}
              action={
                <div className={styles.emptyActions}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => setPanel('create')}
                  >
                    {t('创建群组')}
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setPanel('join')}
                  >
                    {t('加入一个群组')}
                  </button>
                </div>
              }
            />
          )}
          {loading && <p className={styles.muted}>{t('正在加载群组...')}</p>}
          {groups.length < total && (
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={loading}
              onClick={() => load(page + 1)}
            >
              {t('正在加载更多...')}
            </button>
          )}
        </main>
        <div className={styles.fabWrap}>
          <button
            type="button"
            className={styles.groupAddButton}
            aria-label={t('添加群组')}
            onClick={() => setPanel('add')}
          >
            <Plus size={21} />
          </button>
        </div>
      </WalkcalcLayout>
      {panel === 'add' && (
        <Dialog title={t('添加群组')} onClose={() => setPanel(null)}>
          <div className={styles.form}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => setPanel('create')}
            >
              {t('创建群组')}
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setPanel('join')}
            >
              {t('加入一个群组')}
            </button>
          </div>
        </Dialog>
      )}
      {panel === 'create' && (
        <Dialog title={t('创建群组')} onClose={() => setPanel(null)}>
          <div className={styles.form}>
            <h3 className={styles.formSectionTitle}>{t('群组')}</h3>
            <label>
              {t('群名')}
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                placeholder={t('名称')}
              />
            </label>
            <label>
              {t('默认货币')}
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
              >
                {currencies.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <h3 className={styles.formSectionTitle}>{t('初始成员')}</h3>
            <div className={styles.listPanel}>
              <div className={styles.listRow}>
                <span className={styles.person}>
                  <Initials
                    name={user?.profile?.name || t('我')}
                    avatar={user?.profile?.avatar}
                  />
                  {user?.profile?.name || t('我')}
                </span>
              </div>
              {initialMembers.map((person) => (
                <div className={styles.listRow} key={person.userId}>
                  <span className={styles.person}>
                    <Initials
                      name={person.profile?.name || t('成员')}
                      avatar={person.profile?.avatar}
                    />
                    {person.profile?.name}
                  </span>
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={() =>
                      setInitialMembers((current) =>
                        current.filter((item) => item.userId !== person.userId),
                      )
                    }
                  >
                    {t('移除')}
                  </button>
                </div>
              ))}
              {tempMembers.map((member) => (
                <div className={styles.listRow} key={member}>
                  <span className={styles.person}>
                    <Initials name={member} />
                    {member}
                  </span>
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={() =>
                      setTempMembers((current) =>
                        current.filter((item) => item !== member),
                      )
                    }
                  >
                    {t('移除')}
                  </button>
                </div>
              ))}
            </div>
            <label>
              {t('添加成员')}
              <input
                value={memberSearch}
                onChange={(event) => setMemberSearch(event.target.value)}
                placeholder={t('搜索用户名')}
              />
            </label>
            {memberResults
              .filter(
                (person) =>
                  person.userId !== userId &&
                  !initialMembers.some((item) => item.userId === person.userId),
              )
              .map((person) => (
                <button
                  type="button"
                  className={`${styles.listRow} ${styles.listPanel}`}
                  key={person.userId}
                  onClick={() => {
                    setInitialMembers((current) => [...current, person])
                    setMemberSearch('')
                  }}
                >
                  <span className={styles.person}>
                    <Initials
                      name={person.profile?.name || person.userId}
                      avatar={person.profile?.avatar}
                    />
                    {person.profile?.name || person.userId}
                  </span>
                  <Plus size={16} />
                </button>
              ))}
            <label>
              {t('添加临时成员')}
              <div className={styles.inputAction}>
                <input
                  value={tempMemberName}
                  onChange={(event) => setTempMemberName(event.target.value)}
                  placeholder={t('名称')}
                />
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={!tempMemberName.trim()}
                  onClick={() => {
                    const next = tempMemberName.trim()
                    if (!tempMembers.includes(next))
                      setTempMembers((current) => [...current, next])
                    setTempMemberName('')
                  }}
                >
                  {t('添加')}
                </button>
              </div>
            </label>
            <ErrorNote message={error} />
            {createdGroupCode && (
              <Link
                className={styles.secondaryButton}
                href={`/walkcalc/group/${encodeURIComponent(createdGroupCode)}`}
              >
                {t('前往已创建的群组')}
              </Link>
            )}
            <button
              type="button"
              className={styles.primaryButton}
              disabled={busy || !name.trim() || Boolean(createdGroupCode)}
              onClick={submitCreate}
            >
              {t('创建群组')}
            </button>
          </div>
        </Dialog>
      )}
      {panel === 'join' && (
        <Dialog title={t('加入一个群组')} onClose={() => setPanel(null)}>
          <div className={styles.form}>
            <label>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder={t('群组 ID')}
              />
            </label>
            <p className={styles.muted}>
              {t('输入其他成员分享给你的群组 ID。')}
            </p>
            <ErrorNote message={error} />
            <button
              type="button"
              className={styles.primaryButton}
              disabled={busy || !code.trim()}
              onClick={submitJoin}
            >
              {t('加入')}
            </button>
          </div>
        </Dialog>
      )}
    </>
  )
}

export async function getServerSideProps({ locale = 'cn' }) {
  return {
    props: { ...(await serverSideTranslations(locale, ['common', 'toast'])) },
  }
}

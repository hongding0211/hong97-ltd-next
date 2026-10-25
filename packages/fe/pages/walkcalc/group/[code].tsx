import { useUser } from '@hooks/useUser'
import {
  ArrowLeft,
  ArrowLeftRight,
  Banknote,
  BedDouble,
  CarFront,
  Check,
  ChevronRight,
  Coffee,
  Gamepad2,
  House,
  Pencil,
  Plane,
  Plus,
  Search,
  ShoppingBag,
  Tag,
  Ticket,
  UsersRound,
  UtensilsCrossed,
} from 'lucide-react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import BalanceCarousel from '../../../components/walkcalc/BalanceCarousel'
import WalkcalcLayout from '../../../components/walkcalc/WalkcalcLayout'
import {
  categories,
  categoryName,
  currencies,
  groupPath,
  money,
  participantName,
  queryString,
  walkcalcApi,
} from '../../../components/walkcalc/api'
import type {
  Page,
  WalkcalcGroupDto,
  WalkcalcParticipantProjectionDto,
  WalkcalcPublicUserDto,
  WalkcalcRecordDto,
  WalkcalcSettlementSuggestionDto,
  WalkcalcStatisticsDto,
} from '../../../components/walkcalc/api'
import { useWalkcalcI18n } from '../../../components/walkcalc/i18n'
import {
  Dialog,
  Empty,
  ErrorNote,
  Initials,
  styles,
} from '../../../components/walkcalc/ui'

type Panel =
  | 'expense'
  | 'settlement'
  | 'balances'
  | 'members'
  | 'settings'
  | 'search'
  | 'statistics'
  | null

export default function WalkcalcGroup() {
  const { t, language } = useWalkcalcI18n()
  const router = useRouter()
  const user = useUser()
  const userId = user?.userId
  const code = typeof router.query.code === 'string' ? router.query.code : ''
  const [group, setGroup] = useState<WalkcalcGroupDto | null>(null)
  const [records, setRecords] = useState<WalkcalcRecordDto[]>([])
  const [recordTotal, setRecordTotal] = useState(0)
  const [recordPage, setRecordPage] = useState(1)
  const [panel, setPanel] = useState<Panel>(null)
  const [balanceSelected, setBalanceSelected] =
    useState<WalkcalcParticipantProjectionDto | null>(null)
  const [personalTransfers, setPersonalTransfers] = useState<
    { currencyCode: string; fromId: string; toId: string; amount: string }[]
  >([])
  const [membersReturnToSettings, setMembersReturnToSettings] = useState(false)
  const [editRecord, setEditRecord] = useState<WalkcalcRecordDto | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadMoreFailed, setLoadMoreFailed] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const loadingMoreRef = useRef(false)

  const loadGroup = useCallback(async () => {
    if (!code || !userId) return
    setLoading(true)
    setError('')
    try {
      const [detail, page] = await Promise.all([
        walkcalcApi<WalkcalcGroupDto>(groupPath(code)),
        walkcalcApi<Page<WalkcalcRecordDto>>(
          `${groupPath(code)}/records?page=1&pageSize=30`,
        ),
      ])
      setGroup(detail)
      setRecords(page.data)
      setRecordTotal(page.total)
      setRecordPage(1)
      setLoadMoreFailed(false)
    } catch (cause) {
      setError((cause as Error).message)
    } finally {
      setLoading(false)
    }
  }, [code, userId])

  useEffect(() => {
    void loadGroup()
  }, [loadGroup])

  const moreRecords = useCallback(async () => {
    if (
      !code ||
      loading ||
      loadingMoreRef.current ||
      records.length >= recordTotal
    )
      return
    loadingMoreRef.current = true
    setLoading(true)
    try {
      const page = await walkcalcApi<Page<WalkcalcRecordDto>>(
        `${groupPath(code)}/records${queryString({
          page: recordPage + 1,
          pageSize: 30,
        })}`,
      )
      setRecords((current) => [...current, ...page.data])
      setRecordPage(page.page)
      setLoadMoreFailed(false)
    } catch (cause) {
      setError((cause as Error).message)
      setLoadMoreFailed(true)
    } finally {
      loadingMoreRef.current = false
      setLoading(false)
    }
  }, [code, loading, records.length, recordTotal, recordPage])

  useEffect(() => {
    const node = loadMoreRef.current
    if (!node || loading || loadMoreFailed || records.length >= recordTotal)
      return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void moreRecords()
      },
      { rootMargin: '180px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [loading, loadMoreFailed, records.length, recordTotal, moreRecords])

  const participants = group?.participants || []
  const byId = (id?: string) =>
    participantName(
      participants.find((person) => person.participantId === id) ||
        group?.removedParticipants.find(
          (person) => person.participantId === id,
        ),
    )
  const me = participants.find((person) => person.userId === user?.userId)
  const activeIds = new Set(participants.map((person) => person.participantId))
  const canMutate = (record: WalkcalcRecordDto) =>
    record.type === 'expense'
      ? Boolean(record.payerId && activeIds.has(record.payerId)) &&
        Boolean(record.participantIds?.every((id) => activeIds.has(id)))
      : Boolean(
          record.fromId &&
            record.toId &&
            activeIds.has(record.fromId) &&
            activeIds.has(record.toId),
        )
  const balanceRows = me?.currencyBalances?.length
    ? me.currencyBalances
    : [
        {
          currencyCode: group?.currencyCode || 'CNY',
          balance: me?.balance || '0',
          expenseShare: me?.expenseShare || '0',
        },
      ]
  const visibleBalanceRows = balanceRows.filter(
    (row) => row.recordCount > 0 || Number(row.balance) !== 0,
  )
  const groupCode = group?.code
  const participantId = me?.participantId
  const visibleBalanceCodes = visibleBalanceRows
    .map((row) => row.currencyCode)
    .join(',')
  useEffect(() => {
    if (!groupCode || !participantId) {
      setPersonalTransfers([])
      return
    }
    let active = true
    const codes = visibleBalanceCodes ? visibleBalanceCodes.split(',') : []
    void Promise.all(
      codes.map((currencyCode) =>
        walkcalcApi<WalkcalcSettlementSuggestionDto>(
          `${groupPath(groupCode)}/settlement-suggestion${queryString({
            currencyCode,
          })}`,
        )
          .then((result) =>
            result.transfers.map((transfer) => ({ ...transfer, currencyCode })),
          )
          .catch(() => []),
      ),
    ).then((all) => {
      if (active)
        setPersonalTransfers(
          all
            .flat()
            .filter(
              (transfer) =>
                transfer.fromId === participantId ||
                transfer.toId === participantId,
            ),
        )
    })
    return () => {
      active = false
    }
  }, [groupCode, participantId, visibleBalanceCodes])
  function openBalances(
    person: WalkcalcParticipantProjectionDto | null = null,
  ) {
    setBalanceSelected(person)
    setPanel('balances')
  }

  return (
    <>
      <Head>
        <title>{group?.name || t('群组')} · WalkCalc</title>
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
      <WalkcalcLayout
        secondaryHeader={
          <>
            <Link
              className={styles.groupBack}
              href="/walkcalc"
              aria-label={t('返回群组')}
            >
              <ArrowLeft size={21} />
            </Link>
            <h1
              className={styles.groupNavTitle}
              title={group?.name || t('群组')}
            >
              {group?.name || t('群组')}
            </h1>
            <div className={styles.groupTopActions}>
              <button
                type="button"
                className={styles.groupMore}
                onClick={() => setPanel('search')}
                aria-label={t('搜索记录')}
              >
                <Search size={21} />
              </button>
              <button
                type="button"
                className={styles.groupMore}
                onClick={() => setPanel('settings')}
                aria-label={t('群组设置')}
              >
                <Pencil size={19} />
              </button>
            </div>
          </>
        }
      >
        <main className={`${styles.shell} ${styles.groupShell}`}>
          <ErrorNote message={error} />
          {group && (
            <>
              {participants.length === 1 && recordTotal === 0 ? (
                <div className={styles.peopleSetup}>
                  <span className={styles.peopleSetupIcon}>
                    <UsersRound size={30} />
                  </span>
                  <strong>{t('添加成员')}</strong>
                  <p>{t('当它成为共同支出群组时，可以添加成员或临时成员。')}</p>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => {
                      setMembersReturnToSettings(false)
                      setPanel('members')
                    }}
                  >
                    {t('添加成员')}
                  </button>
                </div>
              ) : (
                <>
                  <div className={styles.balanceCard}>
                    {visibleBalanceRows.length ? (
                      <BalanceCarousel
                        title={t('总余额')}
                        balances={visibleBalanceRows.map((row) => ({
                          currencyCode: row.currencyCode,
                          amount: row.balance,
                        }))}
                        subtitle={(balance) =>
                          Number(balance.amount) > 0
                            ? t('别人欠你')
                            : Number(balance.amount) < 0
                              ? t('你欠别人')
                              : t('已结清')
                        }
                        onOpen={() => openBalances(me || null)}
                      />
                    ) : (
                      <div className={styles.carouselBalance}>
                        <span className={styles.balanceTitle}>
                          {t('总余额')}
                        </span>
                        <strong className={styles.balanceDash}>—</strong>
                      </div>
                    )}
                  </div>
                  <div className={styles.sectionHead}>
                    <h2>
                      {personalTransfers.length ? t('建议结清') : t('余额')}
                    </h2>
                  </div>
                  <div className={styles.listPanel}>
                    {personalTransfers.length
                      ? personalTransfers.slice(0, 3).map((transfer, index) => {
                          const isPayer = transfer.fromId === me?.participantId
                          const otherName = byId(
                            isPayer ? transfer.toId : transfer.fromId,
                          )
                          return (
                            <button
                              type="button"
                              className={`${styles.listRow} ${styles.balanceMemberRow}`}
                              key={`${transfer.fromId}-${transfer.toId}-${transfer.currencyCode}-${index}`}
                              onClick={() => openBalances()}
                            >
                              <span className={styles.person}>
                                <Initials
                                  name={otherName}
                                  avatar={
                                    participants.find(
                                      (person) =>
                                        person.participantId ===
                                        (isPayer
                                          ? transfer.toId
                                          : transfer.fromId),
                                    )?.profile?.avatar
                                  }
                                />
                                <span>
                                  <strong>
                                    {isPayer
                                      ? t('你欠 %@', otherName)
                                      : t('%@ 欠你', otherName)}
                                  </strong>
                                  <small>{t('与 %@ 结清', otherName)}</small>
                                </span>
                              </span>
                              <span
                                className={`${styles.balanceMemberValue} ${
                                  isPayer ? styles.negative : styles.positive
                                }`}
                              >
                                {isPayer ? '-' : ''}
                                {money(transfer.amount, transfer.currencyCode)}
                              </span>
                            </button>
                          )
                        })
                      : participants.slice(0, 3).map((person) => (
                          <button
                            type="button"
                            className={`${styles.listRow} ${styles.balanceMemberRow}`}
                            key={person.participantId}
                            onClick={() => openBalances(person)}
                          >
                            <span className={styles.person}>
                              <Initials
                                name={participantName(person)}
                                avatar={person.profile?.avatar}
                              />
                              <span>
                                <strong>{participantName(person)}</strong>
                                <small>
                                  {t('%@ 条记录', person.recordCount)}
                                </small>
                              </span>
                            </span>
                            <span className={styles.balanceMemberValue}>
                              {money(person.balance, group.currencyCode)}{' '}
                              <ChevronRight size={16} />
                            </span>
                          </button>
                        ))}
                    <button
                      type="button"
                      className={`${styles.listRow} ${styles.listFooter}`}
                      onClick={() => openBalances()}
                    >
                      {personalTransfers.length
                        ? t('查看详情')
                        : participants.length > 3
                          ? t('查看全部')
                          : t('查看详情')}{' '}
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  <div className={styles.sectionHead}>
                    <h2>{t('支出')}</h2>
                  </div>
                  <div className={styles.recordList}>
                    {records.map((record) => (
                      <article
                        className={styles.recordRow}
                        key={record.recordId}
                      >
                        <button
                          type="button"
                          className={styles.recordMain}
                          onClick={() => {
                            setEditRecord(record)
                            setPanel(
                              record.type === 'settlement'
                                ? 'settlement'
                                : 'expense',
                            )
                          }}
                        >
                          <span
                            className={styles.recordIcon}
                            data-category={
                              record.type === 'settlement'
                                ? 'transfer'
                                : record.category || 'other'
                            }
                          >
                            {record.type === 'settlement' ? (
                              <ArrowLeftRight size={16} />
                            ) : record.category === 'food' ? (
                              <UtensilsCrossed size={16} />
                            ) : record.category === 'beverage' ? (
                              <Coffee size={16} />
                            ) : record.category === 'shopping' ? (
                              <ShoppingBag size={16} />
                            ) : record.category === 'traffic' ? (
                              <CarFront size={16} />
                            ) : record.category === 'accommodation' ? (
                              <BedDouble size={16} />
                            ) : record.category === 'stay' ? (
                              <House size={16} />
                            ) : record.category === 'vacation' ? (
                              <Plane size={16} />
                            ) : record.category === 'transfer' ? (
                              <Banknote size={16} />
                            ) : record.category === 'ticket' ? (
                              <Ticket size={16} />
                            ) : record.category === 'game' ? (
                              <Gamepad2 size={16} />
                            ) : (
                              <Tag size={16} />
                            )}
                          </span>
                          <span className={styles.recordText}>
                            <strong>
                              {record.note ||
                                (record.type === 'settlement'
                                  ? `${byId(record.fromId)} → ${byId(
                                      record.toId,
                                    )}`
                                  : categoryName(record.category))}
                            </strong>
                            <small>
                              {record.type === 'settlement'
                                ? t('结算')
                                : `@${byId(record.payerId)}`}
                            </small>
                          </span>
                          <span className={styles.recordTrailing}>
                            <strong className={styles.recordAmount}>
                              {money(record.amount, record.currencyCode)}
                            </strong>
                            <small>
                              {new Date(record.occurredAt).toLocaleString(
                                language === 'zh' ? 'zh-CN' : 'en-US',
                                {
                                  month: 'numeric',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                },
                              )}
                            </small>
                          </span>
                        </button>
                      </article>
                    ))}
                    {!records.length && !loading && (
                      <div className={styles.listRow}>
                        <span className={styles.muted}>{t('暂无支出')}</span>
                      </div>
                    )}
                  </div>
                  {records.length < recordTotal && (
                    <div ref={loadMoreRef} className={styles.loadMoreFooter}>
                      {loadMoreFailed ? (
                        <button
                          type="button"
                          className={styles.textButton}
                          onClick={() => void moreRecords()}
                        >
                          {t('重试')}
                        </button>
                      ) : (
                        <span>{t('正在加载更多...')}</span>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </main>
        {group && (
          <div className={styles.fabWrap}>
            <button
              type="button"
              className={styles.groupAddButton}
              aria-label={t('新增支出')}
              onClick={() => {
                setEditRecord(null)
                setPanel('expense')
              }}
            >
              <Plus size={21} />
            </button>
          </div>
        )}
      </WalkcalcLayout>
      {group && panel === 'expense' && (
        <RecordEditor
          group={group}
          record={editRecord}
          type="expense"
          readOnly={Boolean(editRecord && !canMutate(editRecord))}
          onClose={() => setPanel(null)}
          onSaved={() => {
            setPanel(null)
            void loadGroup()
          }}
        />
      )}
      {group && panel === 'settlement' && (
        <RecordEditor
          group={group}
          record={editRecord}
          type="settlement"
          readOnly={Boolean(editRecord && !canMutate(editRecord))}
          onClose={() => setPanel(null)}
          onSaved={() => {
            setPanel(null)
            void loadGroup()
          }}
        />
      )}
      {group && panel === 'balances' && (
        <Balances
          group={group}
          initialSelected={balanceSelected}
          onClose={() => setPanel(null)}
          onChanged={loadGroup}
        />
      )}
      {group && panel === 'members' && (
        <Members
          group={group}
          onClose={() => setPanel(membersReturnToSettings ? 'settings' : null)}
          onChanged={loadGroup}
        />
      )}
      {group && panel === 'settings' && (
        <GroupSettings
          group={group}
          onClose={() => setPanel(null)}
          onChanged={loadGroup}
          onOpenMembers={() => {
            setMembersReturnToSettings(true)
            setPanel('members')
          }}
          onOpenStatistics={() => setPanel('statistics')}
          onLeave={() => void router.push('/walkcalc')}
        />
      )}
      {group && panel === 'search' && (
        <RecordSearch
          group={group}
          onClose={() => setPanel(null)}
          onEdit={(record) => {
            setEditRecord(record)
            setPanel(record.type === 'settlement' ? 'settlement' : 'expense')
          }}
        />
      )}
      {group && panel === 'statistics' && (
        <Statistics group={group} onClose={() => setPanel(null)} />
      )}
    </>
  )
}

const expenseCategoryIcons = {
  food: UtensilsCrossed,
  beverage: Coffee,
  accommodation: BedDouble,
  shopping: ShoppingBag,
  traffic: CarFront,
  stay: House,
  vacation: Plane,
  transfer: Banknote,
  ticket: Ticket,
  game: Gamepad2,
  other: Tag,
}

function currencySymbol(code: string, locale: string) {
  try {
    return (
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: code,
        currencyDisplay: 'narrowSymbol',
      })
        .formatToParts(0)
        .find((part) => part.type === 'currency')?.value || code
    )
  } catch {
    return code
  }
}

function RecordEditor({
  group,
  record,
  type,
  readOnly,
  onClose,
  onSaved,
}: {
  group: WalkcalcGroupDto
  record: WalkcalcRecordDto | null
  type: 'expense' | 'settlement'
  readOnly: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const { t, language } = useWalkcalcI18n()
  const user = useUser()
  const people = group.participants
  const currentPerson = people.find((person) => person.userId === user?.userId)
  const [amount, setAmount] = useState(record?.amount || '')
  const [currency, setCurrency] = useState(
    record?.currencyCode || group.currencyCode,
  )
  const [payerId, setPayerId] = useState(
    record?.payerId ||
      currentPerson?.participantId ||
      people[0]?.participantId ||
      '',
  )
  const [participantIds, setParticipantIds] = useState<string[]>(
    record?.participantIds || people.map((person) => person.participantId),
  )
  const [fromId, setFromId] = useState(
    record?.fromId || people[0]?.participantId || '',
  )
  const [toId, setToId] = useState(
    record?.toId || people[1]?.participantId || '',
  )
  const [category, setCategory] = useState(record?.category || 'food')
  const [note, setNote] = useState(record?.note || '')
  const [occurredAt, setOccurredAt] = useState(() => {
    const date = new Date(record?.occurredAt || Date.now())
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16)
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false)
  const [currencySearch, setCurrencySearch] = useState('')
  const currencyItems = useMemo(() => {
    const locale = language === 'zh' ? 'zh-CN' : 'en-US'
    const names = new Intl.DisplayNames([locale], { type: 'currency' })
    return currencies.map((code) => ({
      code,
      name: names.of(code) || code,
      symbol: currencySymbol(code, locale),
    }))
  }, [language])
  const filteredCurrencyItems = useMemo(() => {
    const query = currencySearch.trim().toLocaleLowerCase()
    return currencyItems.filter(({ code, name, symbol }) =>
      `${code} ${name} ${symbol}`.toLocaleLowerCase().includes(query),
    )
  }, [currencyItems, currencySearch])

  useEffect(() => {
    if (!record) {
      const preferred = window.localStorage.getItem(
        `walkcalc-record-currency-${group.code}`,
      )
      if (preferred) setCurrency(preferred)
    }
  }, [group.code, record])

  async function save() {
    if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
      setError(t('请输入有效金额，最多两位小数。'))
      return
    }
    if (type === 'expense' && (!payerId || !participantIds.length)) {
      setError(t('请选择付款人和分摊成员。'))
      return
    }
    if (type === 'settlement' && (!fromId || !toId || fromId === toId)) {
      setError(t('请选择不同的付款人与收款人。'))
      return
    }
    if (!occurredAt || !Number.isFinite(new Date(occurredAt).getTime())) {
      setError(t('请选择有效日期和时间。'))
      return
    }
    setBusy(true)
    setError('')
    const body = {
      groupCode: group.code,
      recordId: record?.recordId,
      type,
      amount,
      currencyCode: currency,
      note: note.trim(),
      occurredAt: new Date(occurredAt).getTime(),
      ...(type === 'expense'
        ? { payerId, participantIds, category }
        : { fromId, toId }),
    }
    try {
      await walkcalcApi(record ? '/records/update' : '/records', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (type === 'expense')
        window.localStorage.setItem(
          `walkcalc-record-currency-${group.code}`,
          currency,
        )
      onSaved()
    } catch (cause) {
      setError((cause as Error).message)
      setBusy(false)
    }
  }

  async function deleteRecord() {
    if (!record || readOnly || busy || !window.confirm(t('删除这条记录？')))
      return
    setBusy(true)
    setError('')
    try {
      await walkcalcApi('/records/drop', {
        method: 'POST',
        body: JSON.stringify({
          groupCode: group.code,
          recordId: record.recordId,
        }),
      })
      onSaved()
    } catch (cause) {
      setError((cause as Error).message)
      setBusy(false)
    }
  }

  return (
    <>
      <Dialog
        title={
          record
            ? readOnly
              ? t('记录详情')
              : record.note ||
                (record.type === 'settlement'
                  ? t('结算')
                  : categoryName(record.category))
            : type === 'expense'
              ? t('新增支出')
              : t('添加结算')
        }
        onClose={onClose}
      >
        <div className={styles.form}>
          <fieldset className={styles.fieldset} disabled={readOnly || busy}>
            <div className={styles.expenseAmountRow}>
              <button
                type="button"
                className={styles.currencyTrigger}
                disabled={readOnly || busy}
                onClick={() => setCurrencyPickerOpen(true)}
                aria-label={`${t('选择货币')}，${currency}`}
              >
                <span>
                  {currencySymbol(
                    currency,
                    language === 'zh' ? 'zh-CN' : 'en-US',
                  )}
                </span>
              </button>
              <input
                className={styles.amountInput}
                inputMode="decimal"
                aria-label={t('金额')}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
              />
            </div>
            {type === 'expense' ? (
              <>
                <div className={styles.editorSection}>
                  <span className={styles.fieldLabel}>{t('付款人')}</span>
                  <div className={styles.avatarChoices}>
                    {people.map((person) => {
                      const selected = payerId === person.participantId
                      const displayName =
                        person.participantId === currentPerson?.participantId
                          ? t('你')
                          : participantName(person)
                      return (
                        <button
                          type="button"
                          key={person.participantId}
                          className={styles.avatarChoice}
                          aria-pressed={selected}
                          onClick={() => setPayerId(person.participantId)}
                        >
                          <span
                            className={`${styles.choiceAvatar} ${
                              selected ? styles.choiceSelected : ''
                            }`}
                          >
                            <Initials
                              name={participantName(person)}
                              avatar={person.profile?.avatar}
                              size={38}
                            />
                            {selected && (
                              <span className={styles.choiceCheck}>
                                <Check size={10} strokeWidth={3} />
                              </span>
                            )}
                          </span>
                          <small>{displayName}</small>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className={styles.editorSection}>
                  <div className={styles.splitHeading}>
                    <span className={styles.fieldLabel}>{t('分摊')}</span>
                    <button
                      type="button"
                      className={styles.textButton}
                      aria-pressed={participantIds.length === people.length}
                      onClick={() =>
                        setParticipantIds(
                          participantIds.length === people.length
                            ? []
                            : people.map((person) => person.participantId),
                        )
                      }
                    >
                      {t('全部')}
                    </button>
                  </div>
                  <div className={styles.avatarChoices}>
                    {people.map((person) => {
                      const selected = participantIds.includes(
                        person.participantId,
                      )
                      const displayName =
                        person.participantId === currentPerson?.participantId
                          ? t('你')
                          : participantName(person)
                      return (
                        <button
                          type="button"
                          key={person.participantId}
                          className={styles.avatarChoice}
                          aria-pressed={selected}
                          onClick={() =>
                            setParticipantIds((current) =>
                              selected
                                ? current.filter(
                                    (id) => id !== person.participantId,
                                  )
                                : [...current, person.participantId],
                            )
                          }
                        >
                          <span
                            className={`${styles.choiceAvatar} ${
                              selected ? styles.choiceSelected : ''
                            }`}
                          >
                            <Initials
                              name={participantName(person)}
                              avatar={person.profile?.avatar}
                              size={38}
                            />
                            {selected && (
                              <span className={styles.choiceCheck}>
                                <Check size={10} strokeWidth={3} />
                              </span>
                            )}
                          </span>
                          <small>{displayName}</small>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className={styles.editorSection}>
                  <span className={styles.fieldLabel}>{t('类别')}</span>
                  <div className={styles.avatarChoices}>
                    {categories.map(([id, label]) => {
                      const Icon = expenseCategoryIcons[id]
                      return (
                        <button
                          type="button"
                          key={id}
                          className={styles.avatarChoice}
                          aria-pressed={category === id}
                          onClick={() => setCategory(id)}
                        >
                          <span
                            data-category={id}
                            className={`${styles.categoryChoiceIcon} ${
                              category === id ? styles.choiceSelected : ''
                            }`}
                          >
                            <Icon size={18} />
                          </span>
                          <small>{t(label)}</small>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.inlineFields}>
                <label>
                  {t('付款人')}
                  <select
                    value={fromId}
                    onChange={(event) => setFromId(event.target.value)}
                  >
                    {people.map((person) => (
                      <option
                        key={person.participantId}
                        value={person.participantId}
                      >
                        {participantName(person)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('收款人')}
                  <select
                    value={toId}
                    onChange={(event) => setToId(event.target.value)}
                  >
                    {people.map((person) => (
                      <option
                        key={person.participantId}
                        value={person.participantId}
                      >
                        {participantName(person)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            <label>
              {t('可选备注')}
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={t('可选备注')}
              />
            </label>
            <label>
              {t('日期')}
              <input
                type="datetime-local"
                value={occurredAt}
                onChange={(event) => setOccurredAt(event.target.value)}
              />
            </label>
          </fieldset>
          <ErrorNote message={error} />
          {!readOnly && (
            <div className={styles.recordActions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={save}
                disabled={busy}
              >
                {t('保存')}
              </button>
              {record && (
                <button
                  type="button"
                  className={`${styles.secondaryButton} ${styles.negative}`}
                  onClick={() => void deleteRecord()}
                  disabled={busy}
                >
                  {t('删除')}
                </button>
              )}
            </div>
          )}
        </div>
      </Dialog>
      {currencyPickerOpen && (
        <Dialog title={t('货币')} onClose={() => setCurrencyPickerOpen(false)}>
          <div className={styles.currencyPicker}>
            <input
              className={styles.currencySearch}
              value={currencySearch}
              onChange={(event) => setCurrencySearch(event.target.value)}
              placeholder={t('搜索货币')}
            />
            <div className={styles.currencyResults}>
              {filteredCurrencyItems.map(({ code, name, symbol }) => (
                <button
                  type="button"
                  key={code}
                  className={styles.currencyResult}
                  aria-pressed={currency === code}
                  onClick={() => {
                    setCurrency(code)
                    setCurrencyPickerOpen(false)
                    setCurrencySearch('')
                  }}
                >
                  <span className={styles.currencyResultSymbol}>{symbol}</span>
                  <span>
                    <strong>{code}</strong>
                    <small>{name}</small>
                  </span>
                  {currency === code && <Check size={18} />}
                </button>
              ))}
            </div>
          </div>
        </Dialog>
      )}
    </>
  )
}

function Balances({
  group,
  initialSelected,
  onClose,
  onChanged,
}: {
  group: WalkcalcGroupDto
  initialSelected: WalkcalcParticipantProjectionDto | null
  onClose: () => void
  onChanged: () => Promise<void>
}) {
  const { t } = useWalkcalcI18n()
  const [currency, setCurrency] = useState(group.currencyCode)
  const [suggestion, setSuggestion] =
    useState<WalkcalcSettlementSuggestionDto | null>(null)
  const [selected, setSelected] =
    useState<WalkcalcParticipantProjectionDto | null>(initialSelected)
  const [detail, setDetail] = useState<WalkcalcRecordDto[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const currencyOptions = Array.from(
    new Set([
      group.currencyCode,
      ...group.participants.flatMap((person) =>
        person.currencyBalances.map((row) => row.currencyCode),
      ),
    ]),
  )
  const byId = (id: string) =>
    participantName(
      group.participants.find((person) => person.participantId === id),
    )
  useEffect(() => {
    void walkcalcApi<WalkcalcSettlementSuggestionDto>(
      `${groupPath(group.code)}/settlement-suggestion${queryString({
        currencyCode: currency,
      })}`,
    )
      .then(setSuggestion)
      .catch((cause) => setError(cause.message))
  }, [group.code, currency])
  async function resolve() {
    if (
      !suggestion?.transfers.length ||
      !window.confirm(
        t('结清 %@ 的 %@ 笔转账？', currency, suggestion.transfers.length),
      )
    )
      return
    setBusy(true)
    setError('')
    try {
      await walkcalcApi(`${groupPath(group.code)}/settlements/resolve`, {
        method: 'POST',
        body: JSON.stringify({ currencyCode: currency }),
      })
      await onChanged()
      onClose()
    } catch (cause) {
      setError((cause as Error).message)
      setBusy(false)
    }
  }
  async function showDetail(person: WalkcalcParticipantProjectionDto) {
    setSelected(person)
    try {
      const result = await walkcalcApi<{ records: WalkcalcRecordDto[] }>(
        `${groupPath(group.code)}/balances/${encodeURIComponent(
          person.participantId,
        )}/records?page=1&pageSize=50`,
      )
      setDetail(result.records)
    } catch (cause) {
      setError((cause as Error).message)
    }
  }
  useEffect(() => {
    if (initialSelected) void showDetail(initialSelected)
  }, [initialSelected])
  return (
    <Dialog title={t('余额')} onClose={onClose} wide>
      <div className={styles.form}>
        <label>
          {t('货币')}
          <select
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
          >
            {currencyOptions.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <div className={styles.listPanel}>
          {group.participants.map((person) => {
            const projection = person.currencyBalances.find(
              (row) => row.currencyCode === currency,
            )
            const value = projection?.balance || '0'
            return (
              <button
                type="button"
                className={styles.listRow}
                key={person.participantId}
                onClick={() => showDetail(person)}
              >
                <span className={styles.person}>
                  <Initials
                    name={participantName(person)}
                    avatar={person.profile?.avatar}
                  />
                  {participantName(person)}
                </span>
                <strong
                  className={
                    Number(value) > 0
                      ? styles.positive
                      : Number(value) < 0
                        ? styles.negative
                        : ''
                  }
                >
                  {money(value, currency)}
                </strong>
              </button>
            )
          })}
        </div>
        {selected && (
          <section className={styles.subSection}>
            <h3>
              {participantName(selected)} · {t('相关记录')}
            </h3>
            {detail.map((record) => (
              <div className={styles.listRow} key={record.recordId}>
                <span>{record.note || categoryName(record.category)}</span>
                <strong>{money(record.amount, record.currencyCode)}</strong>
              </div>
            ))}
          </section>
        )}
        <section className={styles.subSection}>
          <h3>{t('建议结清')}</h3>
          {suggestion?.transfers.length ? (
            suggestion.transfers.map((transfer, index) => (
              <div
                className={styles.listRow}
                key={`${transfer.fromId}-${transfer.toId}-${index}`}
              >
                <span>
                  {byId(transfer.fromId)} → {byId(transfer.toId)}
                </span>
                <strong>{money(transfer.amount, currency)}</strong>
              </div>
            ))
          ) : (
            <p className={styles.muted}>{t('当前货币已结清。')}</p>
          )}
        </section>
        <ErrorNote message={error} />
        {Boolean(suggestion?.transfers.length) && (
          <button
            type="button"
            className={styles.primaryButton}
            disabled={busy}
            onClick={resolve}
          >
            {t('结清')}
          </button>
        )}
      </div>
    </Dialog>
  )
}

function Members({
  group,
  onClose,
  onChanged,
}: {
  group: WalkcalcGroupDto
  onClose: () => void
  onChanged: () => Promise<void>
}) {
  const { t } = useWalkcalcI18n()
  const [tempName, setTempName] = useState('')
  const [search, setSearch] = useState('')
  const [found, setFound] = useState<WalkcalcPublicUserDto[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!search.trim()) {
      setFound([])
      return
    }
    const timer = setTimeout(() => {
      void walkcalcApi<WalkcalcPublicUserDto[]>(
        `/users/search${queryString({ name: search })}`,
      )
        .then(setFound)
        .catch(() => setFound([]))
    }, 300)
    return () => clearTimeout(timer)
  }, [search])
  async function mutate(path: string, method: string, body?: object) {
    setBusy(true)
    setError('')
    try {
      await walkcalcApi(path, {
        method,
        body: body ? JSON.stringify(body) : undefined,
      })
      await onChanged()
      setTempName('')
      setSearch('')
    } catch (cause) {
      setError((cause as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog title={t('成员')} onClose={onClose}>
      <div className={styles.form}>
        <div className={styles.listPanel}>
          {group.participants.map((person) => (
            <div className={styles.listRow} key={person.participantId}>
              <span className={styles.person}>
                <Initials
                  name={participantName(person)}
                  avatar={person.profile?.avatar}
                />
                {participantName(person)}
                {person.userId === group.ownerUserId && (
                  <small>{t('创建者')}</small>
                )}
              </span>
              {group.isOwner && person.userId !== group.ownerUserId && (
                <button
                  type="button"
                  className={styles.textButton}
                  disabled={
                    busy ||
                    person.currencyBalances.some(
                      (row) => Number(row.balance) !== 0,
                    )
                  }
                  onClick={() => {
                    if (window.confirm(t('移除 %@？', participantName(person))))
                      void mutate(
                        `${groupPath(group.code)}/members/${encodeURIComponent(
                          person.participantId,
                        )}`,
                        'DELETE',
                      )
                  }}
                >
                  {t('移除')}
                </button>
              )}
            </div>
          ))}
        </div>
        <label>
          {t('添加临时成员')}
          <div className={styles.inputAction}>
            <input
              value={tempName}
              onChange={(event) => setTempName(event.target.value)}
              placeholder={t('姓名')}
            />
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={busy || !tempName.trim()}
              onClick={() =>
                mutate(`${groupPath(group.code)}/temp-users`, 'POST', {
                  name: tempName.trim(),
                })
              }
            >
              {t('添加')}
            </button>
          </div>
        </label>
        <label>
          {t('邀请已有用户')}
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('搜索用户名')}
          />
        </label>
        {found
          .filter(
            (person) =>
              !group.participants.some(
                (member) => member.userId === person.userId,
              ),
          )
          .map((person) => (
            <div className={styles.listRow} key={person.userId}>
              <span className={styles.person}>
                <Initials
                  name={person.profile?.name || person.userId}
                  avatar={person.profile?.avatar}
                />
                {person.profile?.name || person.userId}
              </span>
              <button
                type="button"
                className={styles.textButton}
                disabled={busy}
                onClick={() =>
                  mutate(`${groupPath(group.code)}/invite`, 'POST', {
                    userIds: [person.userId],
                  })
                }
              >
                {t('邀请')}
              </button>
            </div>
          ))}
        <ErrorNote message={error} />
      </div>
    </Dialog>
  )
}

function GroupSettings({
  group,
  onClose,
  onChanged,
  onOpenMembers,
  onOpenStatistics,
  onLeave,
}: {
  group: WalkcalcGroupDto
  onClose: () => void
  onChanged: () => Promise<void>
  onOpenMembers: () => void
  onOpenStatistics: () => void
  onLeave: () => void
}) {
  const { t } = useWalkcalcI18n()
  const [name, setName] = useState(group.name)
  const [currency, setCurrency] = useState(group.currencyCode)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function save(path: string, body: object) {
    setBusy(true)
    setError('')
    try {
      await walkcalcApi(`${groupPath(group.code)}${path}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      await onChanged()
    } catch (cause) {
      setError((cause as Error).message)
    } finally {
      setBusy(false)
    }
  }
  async function groupAction(action: 'archive' | 'delete') {
    if (action === 'archive' && group.hasUnresolvedBalance) {
      setError(t('请先结清群组余额，再归档群组。'))
      return
    }
    if (
      !window.confirm(action === 'archive' ? t('归档群组？') : t('删除群组？'))
    )
      return
    setBusy(true)
    setError('')
    try {
      await walkcalcApi(
        `${groupPath(group.code)}${action === 'archive' ? '/archive' : ''}`,
        {
          method: action === 'archive' ? 'POST' : 'DELETE',
        },
      )
      onLeave()
    } catch (cause) {
      setError((cause as Error).message)
      setBusy(false)
    }
  }
  return (
    <Dialog title={t('群组设置')} onClose={onClose}>
      <div className={styles.form}>
        <h3 className={styles.formSectionTitle}>{t('群组')}</h3>
        <label>
          {t('群组名称')}
          <div className={styles.inputAction}>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={busy || !name.trim() || name === group.name}
              onClick={() => save('/name', { name: name.trim() })}
            >
              {t('保存')}
            </button>
          </div>
        </label>
        <div className={`${styles.listRow} ${styles.listPanel}`}>
          <span>{t('群组 ID')}</span>
          <strong>{group.code}</strong>
        </div>
        {group.isOwner ? (
          <label>
            {t('默认货币')}
            <div className={styles.inputAction}>
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
              >
                {Array.from(new Set([currency, ...currencies])).map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={busy || currency === group.currencyCode}
                onClick={() => save('/currency', { currencyCode: currency })}
              >
                {t('保存')}
              </button>
            </div>
          </label>
        ) : (
          <div className={`${styles.listRow} ${styles.listPanel}`}>
            <span>{t('默认货币')}</span>
            <strong>{group.currencyCode}</strong>
          </div>
        )}
        <h3 className={styles.formSectionTitle}>{t('成员')}</h3>
        <div className={styles.listPanel}>
          <button
            type="button"
            className={styles.listRow}
            onClick={onOpenMembers}
          >
            <span>{t('成员')}</span>
            <span className={styles.person}>
              {group.participants.slice(0, 4).map((person) => (
                <Initials
                  key={person.participantId}
                  name={participantName(person)}
                  avatar={person.profile?.avatar}
                />
              ))}
              <ChevronRight size={16} />
            </span>
          </button>
          <button
            type="button"
            className={styles.listRow}
            onClick={onOpenMembers}
          >
            {t('添加成员')} <ChevronRight size={16} />
          </button>
          <button
            type="button"
            className={styles.listRow}
            onClick={onOpenMembers}
          >
            {t('添加临时成员')} <ChevronRight size={16} />
          </button>
        </div>
        <div className={styles.listPanel}>
          <button
            type="button"
            className={styles.listRow}
            onClick={onOpenStatistics}
          >
            {t('我的支出')} <ChevronRight size={16} />
          </button>
          <button
            type="button"
            className={styles.listRow}
            disabled={busy}
            onClick={() => void groupAction('archive')}
          >
            {t('归档群组')} <ChevronRight size={16} />
          </button>
          {group.isOwner && (
            <button
              type="button"
              className={`${styles.listRow} ${styles.negative}`}
              disabled={busy}
              onClick={() => void groupAction('delete')}
            >
              {t('删除群组')} <ChevronRight size={16} />
            </button>
          )}
        </div>
        <ErrorNote message={error} />
      </div>
    </Dialog>
  )
}

function RecordSearch({
  group,
  onClose,
  onEdit,
}: {
  group: WalkcalcGroupDto
  onClose: () => void
  onEdit: (record: WalkcalcRecordDto) => void
}) {
  const { t } = useWalkcalcI18n()
  const [query, setQuery] = useState('')
  const [records, setRecords] = useState<WalkcalcRecordDto[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    if (!query.trim()) {
      setRecords([])
      return
    }
    const timer = setTimeout(() => {
      void walkcalcApi<Page<WalkcalcRecordDto>>(
        `${groupPath(group.code)}/records${queryString({
          page: 1,
          pageSize: 100,
          search: JSON.stringify({
            operator: 'or',
            conditions: [
              { field: 'note', query: query.trim() },
              { field: 'categoryName', query: query.trim() },
            ],
          }),
        })}`,
      )
        .then((result) => setRecords(result.data))
        .catch((cause) => setError(cause.message))
    }, 300)
    return () => clearTimeout(timer)
  }, [group.code, query])
  return (
    <Dialog title={t('搜索记录')} onClose={onClose} wide>
      <div className={styles.form}>
        <label className={styles.search}>
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('搜索备注和分类')}
          />
        </label>
        <ErrorNote message={error} />
        {records.map((record) => (
          <button
            type="button"
            className={styles.listRow}
            key={record.recordId}
            onClick={() => onEdit(record)}
          >
            <span>{record.note || categoryName(record.category)}</span>
            <strong>{money(record.amount, record.currencyCode)}</strong>
          </button>
        ))}
        {query && !records.length && <Empty title={t('没有匹配记录')} />}
      </div>
    </Dialog>
  )
}

function Statistics({
  group,
  onClose,
}: { group: WalkcalcGroupDto; onClose: () => void }) {
  const { t } = useWalkcalcI18n()
  const [statistics, setStatistics] = useState<WalkcalcStatisticsDto | null>(
    null,
  )
  const [error, setError] = useState('')
  useEffect(() => {
    void walkcalcApi<WalkcalcStatisticsDto>(
      `${groupPath(group.code)}/statistics`,
    )
      .then(setStatistics)
      .catch((cause) => setError(cause.message))
  }, [group.code])
  return (
    <Dialog title={t('我的支出')} onClose={onClose}>
      <div className={styles.form}>
        <ErrorNote message={error} />
        {statistics?.totals.map((total) => (
          <section className={styles.subSection} key={total.currencyCode}>
            <p className={styles.muted}>
              {total.currencyCode} · {t('%@ 笔', total.recordCount)}
            </p>
            <strong className={styles.statAmount}>
              {money(total.expenseShare, total.currencyCode)}
            </strong>
            {statistics.byCategory
              .filter((row) => row.currencyCode === total.currencyCode)
              .map((row) => (
                <div className={styles.listRow} key={row.categoryId || 'other'}>
                  <span>{categoryName(row.categoryId || undefined)}</span>
                  <strong>{money(row.expenseShare, row.currencyCode)}</strong>
                </div>
              ))}
          </section>
        ))}
        {statistics && !statistics.totals.length && (
          <Empty title={t('还没有支出')} />
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

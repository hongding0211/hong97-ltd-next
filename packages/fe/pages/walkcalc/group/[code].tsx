import { useUser } from '@hooks/useUser'
import {
  ArrowLeft,
  ArrowRight,
  Ellipsis,
  Plus,
  Search,
  Settings2,
} from 'lucide-react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
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
  const router = useRouter()
  const user = useUser()
  const code = typeof router.query.code === 'string' ? router.query.code : ''
  const [group, setGroup] = useState<WalkcalcGroupDto | null>(null)
  const [records, setRecords] = useState<WalkcalcRecordDto[]>([])
  const [recordTotal, setRecordTotal] = useState(0)
  const [recordPage, setRecordPage] = useState(1)
  const [panel, setPanel] = useState<Panel>(null)
  const [editRecord, setEditRecord] = useState<WalkcalcRecordDto | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  async function loadGroup() {
    if (!code || !user) return
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
    } catch (cause) {
      setError((cause as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadGroup()
  }, [code, user?.userId])

  async function moreRecords() {
    if (!code) return
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
    } catch (cause) {
      setError((cause as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function deleteRecord(record: WalkcalcRecordDto) {
    if (!window.confirm('删除这条记录？')) return
    setBusy(true)
    try {
      await walkcalcApi('/records/drop', {
        method: 'POST',
        body: JSON.stringify({ groupCode: code, recordId: record.recordId }),
      })
      await loadGroup()
    } catch (cause) {
      setError((cause as Error).message)
    } finally {
      setBusy(false)
    }
  }

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

  return (
    <>
      <Head>
        <title>{group?.name || '群组'} · WalkCalc</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <WalkcalcLayout>
        <main className={styles.shell}>
          <Link className={styles.back} href="/walkcalc">
            <ArrowLeft size={17} /> 所有群组
          </Link>
          <div className={styles.topline}>
            <div>
              <span className={styles.eyebrow}>WALKCALC / {code}</span>
              <h1>{group?.name || '群组'}</h1>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setPanel('settings')}
                aria-label="群组设置"
              >
                <Settings2 size={19} />
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setPanel('search')}
              >
                <Search size={17} /> 搜索
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => {
                  setEditRecord(null)
                  setPanel('expense')
                }}
              >
                <Plus size={17} /> 记一笔
              </button>
            </div>
          </div>
          <ErrorNote message={error} />
          {group && (
            <>
              <div className={styles.detailGrid}>
                <section className={styles.balanceCard}>
                  <span className={styles.muted}>我的余额</span>
                  <div className={styles.balanceGrid}>
                    {balanceRows.map((row) => (
                      <div key={row.currencyCode}>
                        <span className={styles.currencyCode}>
                          {row.currencyCode}
                        </span>
                        <strong
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
                        <small>
                          {Number(row.balance) > 0
                            ? '待收回'
                            : Number(row.balance) < 0
                              ? '待支付'
                              : '已结清'}
                        </small>
                      </div>
                    ))}
                  </div>
                </section>
                <section className={styles.sideCard}>
                  <span className={styles.muted}>群组成员</span>
                  <div className={styles.memberPreview}>
                    {participants.slice(0, 5).map((person) => (
                      <Initials
                        key={person.participantId}
                        name={participantName(person)}
                      />
                    ))}
                    <strong>{participants.length} 人</strong>
                  </div>
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={() => setPanel('members')}
                  >
                    查看与管理 <ArrowRight size={15} />
                  </button>
                </section>
              </div>
              <div className={styles.tabs}>
                <button type="button" onClick={() => setPanel('balances')}>
                  余额与结算 <ArrowRight size={16} />
                </button>
                <button type="button" onClick={() => setPanel('statistics')}>
                  我的支出 <ArrowRight size={16} />
                </button>
              </div>
              <div className={styles.sectionHead}>
                <h2>
                  记录 <span>{recordTotal}</span>
                </h2>
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={() => setPanel('search')}
                >
                  <Search size={16} /> 搜索记录
                </button>
              </div>
              <div className={styles.recordList}>
                {records.map((record) => (
                  <article className={styles.recordRow} key={record.recordId}>
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
                      <span className={styles.recordIcon}>
                        {record.type === 'settlement'
                          ? '↔'
                          : categoryName(record.category).slice(0, 1)}
                      </span>
                      <span className={styles.recordText}>
                        <strong>
                          {record.note ||
                            (record.type === 'settlement'
                              ? `${byId(record.fromId)} → ${byId(record.toId)}`
                              : categoryName(record.category))}
                        </strong>
                        <small>
                          {record.type === 'settlement'
                            ? '结算'
                            : categoryName(record.category)}{' '}
                          ·{' '}
                          {new Date(record.occurredAt).toLocaleDateString(
                            'zh-CN',
                          )}
                        </small>
                      </span>
                      <strong className={styles.recordAmount}>
                        {money(record.amount, record.currencyCode)}
                      </strong>
                    </button>
                    {canMutate(record) && (
                      <details className={styles.recordMenu}>
                        <summary aria-label="记录操作">
                          <Ellipsis size={17} />
                        </summary>
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditRecord(record)
                              setPanel(
                                record.type === 'settlement'
                                  ? 'settlement'
                                  : 'expense',
                              )
                            }}
                          >
                            编辑
                          </button>
                          <button
                            type="button"
                            className={styles.negative}
                            disabled={busy}
                            onClick={() => deleteRecord(record)}
                          >
                            删除
                          </button>
                        </div>
                      </details>
                    )}
                  </article>
                ))}
              </div>
              {!records.length && !loading && (
                <Empty
                  title="还没有记录"
                  detail="添加一笔共同花费，余额就会自动更新。"
                  action={
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={() => setPanel('expense')}
                    >
                      记一笔
                    </button>
                  }
                />
              )}
              {loading && <p className={styles.muted}>加载中…</p>}
              {records.length < recordTotal && (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={loading}
                  onClick={moreRecords}
                >
                  加载更多
                </button>
              )}
            </>
          )}
        </main>
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
          onClose={() => setPanel(null)}
          onChanged={loadGroup}
        />
      )}
      {group && panel === 'members' && (
        <Members
          group={group}
          onClose={() => setPanel(null)}
          onChanged={loadGroup}
        />
      )}
      {group && panel === 'settings' && (
        <GroupSettings
          group={group}
          onClose={() => setPanel(null)}
          onChanged={loadGroup}
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
  const people = group.participants
  const [amount, setAmount] = useState(record?.amount || '')
  const [currency, setCurrency] = useState(
    record?.currencyCode || group.currencyCode,
  )
  const [payerId, setPayerId] = useState(
    record?.payerId || people[0]?.participantId || '',
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

  async function save() {
    if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
      setError('请输入有效金额，最多两位小数。')
      return
    }
    if (type === 'expense' && (!payerId || !participantIds.length)) {
      setError('请选择付款人和分摊成员。')
      return
    }
    if (type === 'settlement' && (!fromId || !toId || fromId === toId)) {
      setError('请选择不同的付款人与收款人。')
      return
    }
    if (!occurredAt || !Number.isFinite(new Date(occurredAt).getTime())) {
      setError('请选择有效日期和时间。')
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
      onSaved()
    } catch (cause) {
      setError((cause as Error).message)
      setBusy(false)
    }
  }

  return (
    <Dialog
      title={
        record
          ? readOnly
            ? '记录详情'
            : '编辑记录'
          : type === 'expense'
            ? '记一笔'
            : '添加结算'
      }
      onClose={onClose}
    >
      <div className={styles.form}>
        <fieldset className={styles.fieldset} disabled={readOnly || busy}>
          <div className={styles.inlineFields}>
            <label>
              金额
              <input
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
              />
            </label>
            <label>
              货币
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
              >
                {Array.from(new Set([currency, ...currencies])).map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>
          {type === 'expense' ? (
            <>
              <label>
                付款人
                <select
                  value={payerId}
                  onChange={(event) => setPayerId(event.target.value)}
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
              <div>
                <span className={styles.fieldLabel}>分摊成员</span>
                <div className={styles.checkboxGrid}>
                  {people.map((person) => (
                    <label key={person.participantId}>
                      <input
                        type="checkbox"
                        checked={participantIds.includes(person.participantId)}
                        onChange={(event) =>
                          setParticipantIds((current) =>
                            event.target.checked
                              ? [...current, person.participantId]
                              : current.filter(
                                  (id) => id !== person.participantId,
                                ),
                          )
                        }
                      />{' '}
                      {participantName(person)}
                    </label>
                  ))}
                </div>
              </div>
              <label>
                分类
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  {categories.map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <div className={styles.inlineFields}>
              <label>
                付款人
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
                收款人
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
            备注
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="可选"
            />
          </label>
          <label>
            日期
            <input
              type="datetime-local"
              value={occurredAt}
              onChange={(event) => setOccurredAt(event.target.value)}
            />
          </label>
        </fieldset>
        <ErrorNote message={error} />
        {!readOnly && (
          <button
            type="button"
            className={styles.primaryButton}
            onClick={save}
            disabled={busy}
          >
            保存
          </button>
        )}
      </div>
    </Dialog>
  )
}

function Balances({
  group,
  onClose,
  onChanged,
}: {
  group: WalkcalcGroupDto
  onClose: () => void
  onChanged: () => Promise<void>
}) {
  const [currency, setCurrency] = useState(group.currencyCode)
  const [suggestion, setSuggestion] =
    useState<WalkcalcSettlementSuggestionDto | null>(null)
  const [selected, setSelected] =
    useState<WalkcalcParticipantProjectionDto | null>(null)
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
        `结清 ${currency} 的 ${suggestion.transfers.length} 笔转账？`,
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
  return (
    <Dialog title="余额与结算" onClose={onClose} wide>
      <div className={styles.form}>
        <label>
          货币
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
                  <Initials name={participantName(person)} />
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
            <h3>{participantName(selected)} · 相关记录</h3>
            {detail.map((record) => (
              <div className={styles.listRow} key={record.recordId}>
                <span>{record.note || categoryName(record.category)}</span>
                <strong>{money(record.amount, record.currencyCode)}</strong>
              </div>
            ))}
          </section>
        )}
        <section className={styles.subSection}>
          <h3>建议转账</h3>
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
            <p className={styles.muted}>当前货币已结清。</p>
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
            全部结清
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
      onClose()
    } catch (cause) {
      setError((cause as Error).message)
      setBusy(false)
    }
  }
  return (
    <Dialog title="成员" onClose={onClose}>
      <div className={styles.form}>
        <div className={styles.listPanel}>
          {group.participants.map((person) => (
            <div className={styles.listRow} key={person.participantId}>
              <span className={styles.person}>
                <Initials name={participantName(person)} />
                {participantName(person)}
                {person.userId === group.ownerUserId && <small>创建者</small>}
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
                    if (window.confirm(`移除 ${participantName(person)}？`))
                      void mutate(
                        `${groupPath(group.code)}/members/${encodeURIComponent(
                          person.participantId,
                        )}`,
                        'DELETE',
                      )
                  }}
                >
                  移除
                </button>
              )}
            </div>
          ))}
        </div>
        <label>
          添加临时成员
          <div className={styles.inputAction}>
            <input
              value={tempName}
              onChange={(event) => setTempName(event.target.value)}
              placeholder="姓名"
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
              添加
            </button>
          </div>
        </label>
        <label>
          邀请已有用户
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索用户名"
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
              <span>{person.profile?.name || person.userId}</span>
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
                邀请
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
}: {
  group: WalkcalcGroupDto
  onClose: () => void
  onChanged: () => Promise<void>
}) {
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
      onClose()
    } catch (cause) {
      setError((cause as Error).message)
      setBusy(false)
    }
  }
  return (
    <Dialog title="群组设置" onClose={onClose}>
      <div className={styles.form}>
        <p className={styles.muted}>群组 ID：{group.code}</p>
        <label>
          群组名称
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
              保存
            </button>
          </div>
        </label>
        <label>
          默认货币
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
              保存
            </button>
          </div>
        </label>
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
    <Dialog title="搜索记录" onClose={onClose} wide>
      <div className={styles.form}>
        <label className={styles.search}>
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索备注或分类"
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
        {query && !records.length && <Empty title="没有找到记录" />}
      </div>
    </Dialog>
  )
}

function Statistics({
  group,
  onClose,
}: { group: WalkcalcGroupDto; onClose: () => void }) {
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
    <Dialog title="我的支出" onClose={onClose}>
      <div className={styles.form}>
        <ErrorNote message={error} />
        {statistics?.totals.map((total) => (
          <section className={styles.subSection} key={total.currencyCode}>
            <p className={styles.muted}>
              {total.currencyCode} · {total.recordCount} 笔
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
          <Empty title="还没有支出" />
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

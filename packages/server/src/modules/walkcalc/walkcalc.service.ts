import { Injectable } from '@nestjs/common'
import { InjectConnection, InjectModel } from '@nestjs/mongoose'
import { ClientSession, Connection, Model } from 'mongoose'
import { GeneralException } from 'src/exceptions/general-exceptions'
import { v4 as uuidv4 } from 'uuid'
import { PaginationResponseDto } from '../../dtos/pagination.dto'
import { UserService } from '../user/user.service'
import { CreateWalkcalcGroupDto, QueryWalkcalcGroupsDto } from './dto/group.dto'
import {
  AddWalkcalcRecordDto,
  BulkResolveWalkcalcDebtsDto,
  QueryWalkcalcRecordsDto,
  UpdateWalkcalcRecordDto,
} from './dto/record.dto'
import {
  WalkcalcDropRecordMutationDto,
  WalkcalcGroupDto,
  WalkcalcPublicUserDto,
  WalkcalcRecordDto,
  WalkcalcRecordMutationDto,
  WalkcalcRecordsMutationDto,
} from './dto/response.dto'
import {
  WalkcalcGroup,
  WalkcalcGroupDocument,
  WalkcalcMember,
  WalkcalcRecord,
  WalkcalcTempUser,
} from './schema/walkcalc-group.schema'
import { generateGroupCode } from './utils/group-code'
import {
  MoneyMinor,
  addMoneyMinor,
  assertNonZeroMoneyMinor,
  assertPositiveMoneyMinor,
  legacyNumberToMoneyMinor,
  moneyMinorToLegacyNumber,
  negateMoneyMinor,
  splitMoneyMinor,
} from './utils/money'

type Participant =
  | { type: 'member'; value: WalkcalcMember }
  | { type: 'temp'; value: WalkcalcTempUser }

type MoneyParticipant = WalkcalcMember | WalkcalcTempUser

type RecordSearchField = 'note' | 'categoryName'
type RecordSearchOperator = 'or' | 'and'

interface StructuredRecordSearchCondition {
  field: RecordSearchField
  query: string
}

interface StructuredRecordSearch {
  operator: RecordSearchOperator
  conditions: StructuredRecordSearchCondition[]
}

const recordSearchFields = new Set<RecordSearchField>(['note', 'categoryName'])
const recordCategoryNames: Record<string, string[]> = {
  food: ['meal', '餐饮'],
  beverage: ['drink', '饮品'],
  accommodation: ['hotel', '酒店'],
  shopping: ['shopping', '购物'],
  traffic: ['transport', '交通'],
  stay: ['stay', '住宿'],
  vacation: ['vacation', '旅行'],
  transfer: ['transfer', '转账'],
  ticket: ['ticket', '票务'],
  game: ['game', '娱乐'],
  other: ['other', '其他'],
  debtResolve: ['transfer', '转账'],
  'debt-resolve': ['transfer', '转账'],
}

@Injectable()
export class WalkcalcService {
  private readonly maxRecordsPerGroup = 5000
  private readonly maxGroupCodeAttempts = 20

  constructor(
    @InjectModel(WalkcalcGroup.name)
    private walkcalcGroupModel: Model<WalkcalcGroupDocument>,
    @InjectConnection() private connection: Connection,
    private userService: UserService,
  ) {}

  async currentUser(userId: string): Promise<WalkcalcPublicUserDto> {
    return this.getPublicUserOrThrow(userId)
  }

  async users(userIds: string[]): Promise<WalkcalcPublicUserDto[]> {
    return this.userService.findPublicUsersByIds(userIds)
  }

  async searchUsers(name?: string): Promise<WalkcalcPublicUserDto[]> {
    if (!name) {
      return []
    }
    return this.userService.searchPublicUsersByName(name, 10)
  }

  async createGroup(
    userId: string,
    dto: CreateWalkcalcGroupDto,
  ): Promise<{ code: string }> {
    await this.getPublicUserOrThrow(userId)
    for (let attempt = 0; attempt < this.maxGroupCodeAttempts; attempt += 1) {
      const code = generateGroupCode()
      const exists = await this.walkcalcGroupModel.exists({ code })
      if (exists) {
        continue
      }

      const now = Date.now()
      const group = new this.walkcalcGroupModel({
        code,
        ownerUserId: userId,
        name: dto.name,
        members: [{ userId, debtMinor: '0', costMinor: '0' }],
        tempUsers: [],
        records: [],
        archivedUserIds: [],
        isDeleted: false,
        createdAtMs: now,
        modifiedAt: now,
      })
      try {
        await group.save()
        return { code }
      } catch (err) {
        if (this.isDuplicateGroupCodeError(err)) {
          continue
        }
        throw err
      }
    }
    throw new GeneralException('walkcalc.groupCodeUnavailable')
  }

  async joinGroup(userId: string, code: string): Promise<{ code: string }> {
    await this.getPublicUserOrThrow(userId)
    const group = await this.walkcalcGroupModel
      .findOne(this.activeGroupFilter({ code }))
      .exec()
    if (!group) {
      throw new GeneralException('walkcalc.groupNotFound')
    }
    if (this.isGroupMember(group, userId)) {
      throw new GeneralException('walkcalc.userAlreadyInGroup')
    }

    group.members.push({ userId, debtMinor: '0', costMinor: '0' })
    group.modifiedAt = Date.now()
    await group.save()
    return { code }
  }

  async dismissGroup(userId: string, code: string): Promise<{ code: string }> {
    const now = Date.now()
    const result = await this.walkcalcGroupModel
      .updateOne(this.activeGroupFilter({ code, ownerUserId: userId }), {
        $set: {
          isDeleted: true,
          deletedAt: now,
          deletedBy: userId,
          modifiedAt: now,
        },
      })
      .exec()
    if (result.modifiedCount < 1) {
      throw new GeneralException('walkcalc.groupOwnerRequired')
    }
    return { code }
  }

  async addTempUser(userId: string, code: string, name: string) {
    const group = await this.loadOwnedGroup(code, userId)
    if (group.tempUsers.some((tempUser) => tempUser.name === name)) {
      throw new GeneralException('walkcalc.tempUserNameExists')
    }

    const tempUser = {
      uuid: uuidv4(),
      name,
      debtMinor: '0',
      costMinor: '0',
    }
    group.tempUsers.push(tempUser)
    group.modifiedAt = Date.now()
    await group.save()
    return tempUser
  }

  async inviteUsers(
    userId: string,
    code: string,
    userIds: string[],
  ): Promise<{ code: string; userIds: string[] }> {
    const group = await this.loadGroupForMember(code, userId)
    const existingIds = new Set(group.members.map((member) => member.userId))
    const users = await this.userService.findPublicUsersByIds(userIds)
    const invitedIds = users
      .map((user) => user.userId)
      .filter((targetUserId) => !existingIds.has(targetUserId))

    group.members.push(
      ...invitedIds.map((targetUserId) => ({
        userId: targetUserId,
        debtMinor: '0',
        costMinor: '0',
      })),
    )
    if (invitedIds.length) {
      group.modifiedAt = Date.now()
      await group.save()
    }

    return { code, userIds: invitedIds }
  }

  async myGroups(
    userId: string,
    query: QueryWalkcalcGroupsDto,
  ): Promise<PaginationResponseDto<WalkcalcGroupDto>> {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 10
    const filter = this.withGroupSearch(
      this.activeGroupFilter(this.memberFilter(userId)),
      query.search,
    )
    const [groups, total] = await Promise.all([
      this.walkcalcGroupModel
        .find(filter)
        .sort({ modifiedAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .exec(),
      this.walkcalcGroupModel.countDocuments(filter).exec(),
    ])

    return {
      data: await Promise.all(
        groups.map((group) => this.mapGroupToDto(group, userId)),
      ),
      total,
      page,
      pageSize,
    }
  }

  async getGroup(userId: string, code: string): Promise<WalkcalcGroupDto> {
    const group = await this.loadGroupForMember(code, userId)
    return this.mapGroupToDto(group, userId)
  }

  async archiveGroup(
    userId: string,
    code: string,
    isArchive: boolean,
  ): Promise<{ code: string }> {
    const group = await this.loadGroupForMember(code, userId)
    const archivedUserIds = new Set(group.archivedUserIds)
    if (isArchive) {
      archivedUserIds.add(userId)
    } else {
      archivedUserIds.delete(userId)
    }
    group.archivedUserIds = [...archivedUserIds]
    group.modifiedAt = Date.now()
    await group.save()
    return { code }
  }

  async renameGroup(
    userId: string,
    code: string,
    name: string,
  ): Promise<{ code: string; name: string }> {
    const group = await this.loadOwnedGroup(code, userId)
    group.name = name
    group.modifiedAt = Date.now()
    await group.save()
    return { code, name }
  }

  async addRecord(
    userId: string,
    dto: AddWalkcalcRecordDto,
  ): Promise<WalkcalcRecordMutationDto> {
    return this.runInOptionalTransaction(async (session) => {
      const group = await this.loadGroupForMember(
        dto.groupCode,
        userId,
        session,
      )
      this.assertRecordPayload(dto, group)
      if (group.records.length >= this.maxRecordsPerGroup) {
        throw new GeneralException('walkcalc.recordLimitReached')
      }

      const now = Date.now()
      const createdAt = dto.createdAt ?? now
      const paidMinor = this.resolveRecordPaidMinor(dto)
      const record: WalkcalcRecord = {
        recordId: uuidv4(),
        who: dto.who,
        paidMinor,
        forWhom: dto.forWhom,
        type: dto.type,
        text: dto.text,
        long: dto.long,
        lat: dto.lat,
        isDebtResolve: !!dto.isDebtResolve,
        createdAt,
        modifiedAt: now,
        createdBy: userId,
      }

      this.applyRecordBalance(group, record, 1)
      group.records.push(record)
      group.modifiedAt = now
      this.markGroupFinancialStateModified(group)
      await group.save({ session })
      return this.mapRecordMutationToDto(group, userId, record)
    })
  }

  async resolveDebts(
    userId: string,
    dto: BulkResolveWalkcalcDebtsDto,
  ): Promise<WalkcalcRecordsMutationDto> {
    return this.runInOptionalTransaction(async (session) => {
      const group = await this.loadGroupForMember(
        dto.groupCode,
        userId,
        session,
      )
      this.assertBulkDebtTransfers(dto, group)

      const now = Date.now()
      const records: WalkcalcRecord[] = dto.transfers.map((transfer) => {
        const amountMinor = this.resolveTransferAmountMinor(transfer)
        return {
          recordId: uuidv4(),
          who: transfer.from,
          paidMinor: amountMinor,
          forWhom: [transfer.to],
          type: 'debtResolve',
          text: 'Debt Resolve',
          long: '',
          lat: '',
          isDebtResolve: true,
          createdAt: now,
          modifiedAt: now,
          createdBy: userId,
        }
      })

      records.forEach((record) => this.applyRecordBalance(group, record, 1))
      group.records.push(...records)
      group.modifiedAt = now
      this.markGroupFinancialStateModified(group)
      await group.save({ session })
      return {
        records: records.map((record) => this.mapRecordToDto(record)),
        group: await this.mapGroupToDto(group, userId),
      }
    })
  }

  async dropRecord(
    userId: string,
    groupCode: string,
    recordId: string,
  ): Promise<WalkcalcDropRecordMutationDto> {
    return this.runInOptionalTransaction(async (session) => {
      const group = await this.loadGroupForMember(groupCode, userId, session)
      const recordIndex = group.records.findIndex(
        (record) => record.recordId === recordId,
      )
      if (recordIndex < 0) {
        throw new GeneralException('walkcalc.recordNotFound')
      }

      const record = group.records[recordIndex]
      this.applyRecordBalance(group, record, -1)
      group.records.splice(recordIndex, 1)
      group.modifiedAt = Date.now()
      this.markGroupFinancialStateModified(group)
      await group.save({ session })
      return {
        groupCode,
        recordId,
        group: await this.mapGroupToDto(group, userId),
      }
    })
  }

  async updateRecord(
    userId: string,
    dto: UpdateWalkcalcRecordDto,
  ): Promise<WalkcalcRecordMutationDto> {
    return this.runInOptionalTransaction(async (session) => {
      const group = await this.loadGroupForMember(
        dto.groupCode,
        userId,
        session,
      )
      this.assertRecordPayload(dto, group)
      const recordIndex = group.records.findIndex(
        (record) => record.recordId === dto.recordId,
      )
      if (recordIndex < 0) {
        throw new GeneralException('walkcalc.recordNotFound')
      }

      const previousRecord = group.records[recordIndex]
      if (previousRecord.isDebtResolve) {
        throw new GeneralException('walkcalc.debtResolveRecordImmutable')
      }

      this.applyRecordBalance(group, previousRecord, -1)

      const now = Date.now()
      const paidMinor = this.resolveRecordPaidMinor(dto)
      const createdAt = dto.createdAt ?? previousRecord.createdAt
      const updatedRecord: WalkcalcRecord = {
        recordId: previousRecord.recordId,
        who: dto.who,
        paidMinor,
        forWhom: dto.forWhom,
        type: dto.type,
        text: dto.text,
        long: dto.long,
        lat: dto.lat,
        isDebtResolve: !!dto.isDebtResolve,
        createdAt,
        modifiedAt: now,
        createdBy: previousRecord.createdBy,
        modifiedBy: userId,
      }
      this.applyRecordBalance(group, updatedRecord, 1)
      group.records[recordIndex] = updatedRecord
      group.modifiedAt = now
      this.markGroupFinancialStateModified(group)
      await group.save({ session })
      return this.mapRecordMutationToDto(group, userId, updatedRecord)
    })
  }

  async getRecord(
    userId: string,
    recordId: string,
  ): Promise<WalkcalcRecordDto> {
    const group = await this.walkcalcGroupModel
      .findOne({
        ...this.activeGroupFilter(),
        ...this.memberFilter(userId),
        'records.recordId': recordId,
      })
      .exec()
    if (!group) {
      throw new GeneralException('walkcalc.recordNotFound')
    }
    const record = group.records.find((item) => item.recordId === recordId)
    if (!record) {
      throw new GeneralException('walkcalc.recordNotFound')
    }
    return this.mapRecordToDto(record)
  }

  async groupRecords(
    userId: string,
    groupCode: string,
    query: QueryWalkcalcRecordsDto,
  ): Promise<PaginationResponseDto<WalkcalcRecordDto>> {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 10
    const group = await this.loadGroupForMember(groupCode, userId)
    const records = this.filterRecords(group, query).sort(
      (a, b) => b.createdAt - a.createdAt,
    )
    const skip = (page - 1) * pageSize

    return {
      data: records
        .slice(skip, skip + pageSize)
        .map((record) => this.mapRecordToDto(record)),
      total: records.length,
      page,
      pageSize,
    }
  }

  private async getPublicUserOrThrow(
    userId: string,
  ): Promise<WalkcalcPublicUserDto> {
    try {
      return await this.userService.findUserById(userId)
    } catch {
      throw new GeneralException('walkcalc.userNotFound')
    }
  }

  private activeGroupFilter<T extends Record<string, unknown>>(filter?: T) {
    return {
      ...(filter ?? {}),
      isDeleted: { $ne: true },
    }
  }

  private memberFilter(userId: string) {
    return {
      $or: [{ ownerUserId: userId }, { 'members.userId': userId }],
    }
  }

  private withGroupSearch<T extends Record<string, unknown>>(
    filter: T,
    search?: string,
  ) {
    const regex = this.searchRegex(search)
    if (!regex) {
      return filter
    }
    return {
      $and: [
        filter,
        {
          $or: [{ name: regex }, { code: regex }],
        },
      ],
    }
  }

  private filterRecords(
    group: WalkcalcGroup,
    query: QueryWalkcalcRecordsDto,
  ): WalkcalcRecord[] {
    let records = [...group.records]
    const participantId = query.participantId?.trim()
    if (participantId) {
      this.resolveParticipant(group, participantId)
      records = records.filter(
        (record) =>
          record.who === participantId ||
          record.forWhom.includes(participantId),
      )
    }

    const search = this.parseRecordSearch(query.search)
    if (search) {
      records = records.filter((record) =>
        this.recordMatchesSearch(record, search),
      )
    }

    return records
  }

  private parseRecordSearch(
    search?: string,
  ): StructuredRecordSearch | undefined {
    const trimmed = search?.trim()
    if (!trimmed) {
      return undefined
    }

    let raw: unknown
    try {
      raw = JSON.parse(trimmed)
    } catch {
      throw new GeneralException('walkcalc.invalidRecordSearch')
    }

    if (!this.isPlainObject(raw)) {
      throw new GeneralException('walkcalc.invalidRecordSearch')
    }

    const operator = raw.operator
    const conditions = raw.conditions
    if (
      (operator !== 'or' && operator !== 'and') ||
      !Array.isArray(conditions) ||
      conditions.length === 0
    ) {
      throw new GeneralException('walkcalc.invalidRecordSearch')
    }

    return {
      operator,
      conditions: conditions.map((condition) =>
        this.parseRecordSearchCondition(condition),
      ),
    }
  }

  private parseRecordSearchCondition(
    condition: unknown,
  ): StructuredRecordSearchCondition {
    if (!this.isPlainObject(condition)) {
      throw new GeneralException('walkcalc.invalidRecordSearch')
    }
    const field = condition.field
    const query = condition.query
    if (
      typeof field !== 'string' ||
      !recordSearchFields.has(field as RecordSearchField) ||
      typeof query !== 'string' ||
      !query.trim()
    ) {
      throw new GeneralException('walkcalc.invalidRecordSearch')
    }

    return {
      field: field as RecordSearchField,
      query: query.trim().toLowerCase(),
    }
  }

  private recordMatchesSearch(
    record: WalkcalcRecord,
    search: StructuredRecordSearch,
  ): boolean {
    const matches = search.conditions.map((condition) =>
      this.recordMatchesSearchCondition(record, condition),
    )
    return search.operator === 'and'
      ? matches.every(Boolean)
      : matches.some(Boolean)
  }

  private recordMatchesSearchCondition(
    record: WalkcalcRecord,
    condition: StructuredRecordSearchCondition,
  ): boolean {
    switch (condition.field) {
      case 'note':
        return (record.text ?? '').toLowerCase().includes(condition.query)
      case 'categoryName':
        return this.recordCategorySearchValues(record).some((value) =>
          value.includes(condition.query),
        )
    }
  }

  private recordCategorySearchValues(record: WalkcalcRecord): string[] {
    return (
      recordCategoryNames[record.type ?? 'other'] ?? recordCategoryNames.other
    ).map((value) => value.toLowerCase())
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  private searchRegex(search?: string): RegExp | undefined {
    const trimmed = search?.trim()
    if (!trimmed) {
      return undefined
    }
    return new RegExp(this.escapeRegExp(trimmed), 'i')
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  private isGroupMember(group: WalkcalcGroup, userId: string): boolean {
    return (
      group.ownerUserId === userId ||
      group.members.some((member) => member.userId === userId)
    )
  }

  private async loadGroupForMember(
    code: string,
    userId: string,
    session?: ClientSession,
  ): Promise<WalkcalcGroupDocument> {
    const group = await this.walkcalcGroupModel
      .findOne({
        ...this.activeGroupFilter(),
        code,
        ...this.memberFilter(userId),
      })
      .session(session ?? null)
      .exec()
    if (!group) {
      throw new GeneralException('walkcalc.groupNotFoundOrNoAccess')
    }
    return group
  }

  private async loadOwnedGroup(
    code: string,
    userId: string,
  ): Promise<WalkcalcGroupDocument> {
    const group = await this.walkcalcGroupModel
      .findOne(this.activeGroupFilter({ code, ownerUserId: userId }))
      .exec()
    if (!group) {
      throw new GeneralException('walkcalc.groupOwnerRequired')
    }
    return group
  }

  private assertRecordPayload(dto: AddWalkcalcRecordDto, group: WalkcalcGroup) {
    if (!dto.forWhom.length) {
      throw new GeneralException('walkcalc.forWhomRequired')
    }
    this.resolveRecordPaidMinor(dto)
    this.resolveParticipant(group, dto.who)
    dto.forWhom.forEach((participantId) => {
      this.resolveParticipant(group, participantId)
    })
  }

  private assertBulkDebtTransfers(
    dto: BulkResolveWalkcalcDebtsDto,
    group: WalkcalcGroup,
  ) {
    if (!dto.transfers.length) {
      throw new GeneralException('walkcalc.forWhomRequired')
    }
    if (group.records.length + dto.transfers.length > this.maxRecordsPerGroup) {
      throw new GeneralException('walkcalc.recordLimitReached')
    }

    dto.transfers.forEach((transfer) => {
      this.resolveTransferAmountMinor(transfer)
      this.resolveParticipant(group, transfer.from)
      this.resolveParticipant(group, transfer.to)
    })
  }

  private resolveParticipant(
    group: WalkcalcGroup,
    participantId: string,
  ): Participant {
    const member = group.members.find((item) => item.userId === participantId)
    if (member) {
      return { type: 'member', value: member }
    }
    const tempUser = group.tempUsers.find((item) => item.uuid === participantId)
    if (tempUser) {
      return { type: 'temp', value: tempUser }
    }
    throw new GeneralException('walkcalc.invalidParticipant')
  }

  private applyRecordBalance(
    group: WalkcalcGroup,
    record: Pick<
      WalkcalcRecord,
      'who' | 'paid' | 'paidMinor' | 'forWhom' | 'isDebtResolve'
    >,
    direction: 1 | -1,
  ) {
    const paidMinor = this.resolvePersistedRecordPaidMinor(record)
    const splitAmounts = splitMoneyMinor(paidMinor, record.forWhom.length)
    const forWhomParticipants = record.forWhom.map(
      (participantId) => this.resolveParticipant(group, participantId).value,
    )
    const payer = this.resolveParticipant(group, record.who).value

    for (const [index, participant] of forWhomParticipants.entries()) {
      const amount = splitAmounts[index]
      this.addParticipantDebtMinor(
        participant,
        this.directedAmount(amount, this.reverseDirection(direction)),
      )
      if (!record.isDebtResolve) {
        this.addParticipantCostMinor(
          participant,
          this.directedAmount(amount, direction),
        )
      }
    }

    this.addParticipantDebtMinor(
      payer,
      this.directedAmount(paidMinor, direction),
    )
  }

  private async mapGroupToDto(
    group: WalkcalcGroup,
    userId: string,
  ): Promise<WalkcalcGroupDto> {
    const users = await this.userService.findPublicUsersByIds(
      group.members.map((member) => member.userId),
    )
    const userMap = new Map(users.map((user) => [user.userId, user]))

    return {
      code: group.code,
      name: group.name,
      ownerUserId: group.ownerUserId,
      members: group.members.map((member) => {
        const user = userMap.get(member.userId)
        return {
          userId: member.userId,
          profile: user?.profile ?? { name: member.userId },
          debt: moneyMinorToLegacyNumber(this.getParticipantDebtMinor(member)),
          cost: moneyMinorToLegacyNumber(this.getParticipantCostMinor(member)),
          debtMinor: this.getParticipantDebtMinor(member),
          costMinor: this.getParticipantCostMinor(member),
        }
      }),
      tempUsers: group.tempUsers.map((tempUser) => ({
        uuid: tempUser.uuid,
        name: tempUser.name,
        debt: moneyMinorToLegacyNumber(this.getParticipantDebtMinor(tempUser)),
        cost: moneyMinorToLegacyNumber(this.getParticipantCostMinor(tempUser)),
        debtMinor: this.getParticipantDebtMinor(tempUser),
        costMinor: this.getParticipantCostMinor(tempUser),
      })),
      archivedUserIds: group.archivedUserIds,
      isOwner: group.ownerUserId === userId,
      createdAt: group.createdAtMs,
      modifiedAt: group.modifiedAt,
    }
  }

  private mapRecordToDto(record: WalkcalcRecord): WalkcalcRecordDto {
    return {
      recordId: record.recordId,
      who: record.who,
      paid: moneyMinorToLegacyNumber(
        this.resolvePersistedRecordPaidMinor(record),
      ),
      paidMinor: this.resolvePersistedRecordPaidMinor(record),
      forWhom: record.forWhom,
      type: record.type,
      text: record.text,
      long: record.long,
      lat: record.lat,
      isDebtResolve: record.isDebtResolve,
      createdAt: record.createdAt,
      modifiedAt: record.modifiedAt,
      createdBy: record.createdBy,
      modifiedBy: record.modifiedBy,
    }
  }

  private async mapRecordMutationToDto(
    group: WalkcalcGroup,
    userId: string,
    record: WalkcalcRecord,
  ): Promise<WalkcalcRecordMutationDto> {
    return {
      ...this.mapRecordToDto(record),
      group: await this.mapGroupToDto(group, userId),
    }
  }

  private resolveRecordPaidMinor(
    dto: Pick<AddWalkcalcRecordDto, 'paidMinor' | 'paid'>,
  ): MoneyMinor {
    try {
      const paidMinor =
        dto.paidMinor !== undefined
          ? dto.paidMinor
          : legacyNumberToMoneyMinor(dto.paid)
      return assertNonZeroMoneyMinor(paidMinor)
    } catch {
      throw new GeneralException('walkcalc.zeroAmountRecord')
    }
  }

  private resolveTransferAmountMinor(
    transfer: Pick<
      BulkResolveWalkcalcDebtsDto['transfers'][number],
      'amountMinor' | 'amount'
    >,
  ): MoneyMinor {
    try {
      const amountMinor =
        transfer.amountMinor !== undefined
          ? transfer.amountMinor
          : legacyNumberToMoneyMinor(transfer.amount)
      return assertPositiveMoneyMinor(amountMinor)
    } catch {
      throw new GeneralException('walkcalc.zeroAmountRecord')
    }
  }

  private resolvePersistedRecordPaidMinor(
    record: Pick<WalkcalcRecord, 'paidMinor' | 'paid'>,
  ): MoneyMinor {
    return record.paidMinor ?? legacyNumberToMoneyMinor(record.paid)
  }

  private getParticipantDebtMinor(participant: MoneyParticipant): MoneyMinor {
    return participant.debtMinor ?? legacyNumberToMoneyMinor(participant.debt)
  }

  private getParticipantCostMinor(participant: MoneyParticipant): MoneyMinor {
    return participant.costMinor ?? legacyNumberToMoneyMinor(participant.cost)
  }

  private addParticipantDebtMinor(
    participant: MoneyParticipant,
    amount: MoneyMinor,
  ) {
    participant.debtMinor = addMoneyMinor(
      this.getParticipantDebtMinor(participant),
      amount,
    )
  }

  private addParticipantCostMinor(
    participant: MoneyParticipant,
    amount: MoneyMinor,
  ) {
    participant.costMinor = addMoneyMinor(
      this.getParticipantCostMinor(participant),
      amount,
    )
  }

  private directedAmount(amount: MoneyMinor, direction: 1 | -1): MoneyMinor {
    return direction === 1 ? amount : negateMoneyMinor(amount)
  }

  private reverseDirection(direction: 1 | -1): 1 | -1 {
    return direction === 1 ? -1 : 1
  }

  private markGroupFinancialStateModified(group: WalkcalcGroup) {
    const markModified = (group as WalkcalcGroupDocument).markModified
    if (typeof markModified !== 'function') {
      return
    }
    markModified.call(group, 'members')
    markModified.call(group, 'tempUsers')
    markModified.call(group, 'records')
  }

  private async runInOptionalTransaction<T>(
    operation: (session?: ClientSession) => Promise<T>,
  ): Promise<T> {
    const session = await this.connection.startSession()
    try {
      let result: T | undefined
      await session.withTransaction(async () => {
        result = await operation(session)
      })
      return result as T
    } catch (err) {
      if (this.isTransactionUnsupported(err)) {
        return operation()
      }
      throw err
    } finally {
      await session.endSession()
    }
  }

  private isTransactionUnsupported(err: unknown): boolean {
    if (!(err instanceof Error)) {
      return false
    }
    return /Transaction numbers|replica set|sharded cluster|sessions are not supported/i.test(
      err.message,
    )
  }

  private isDuplicateGroupCodeError(err: unknown): boolean {
    const duplicateError = err as {
      code?: number
      keyPattern?: Record<string, unknown>
      keyValue?: Record<string, unknown>
      message?: string
    }

    return (
      !!err &&
      typeof err === 'object' &&
      duplicateError.code === 11000 &&
      (duplicateError.keyPattern?.code === 1 ||
        duplicateError.keyValue?.code !== undefined ||
        /code_1/.test(duplicateError.message ?? ''))
    )
  }
}

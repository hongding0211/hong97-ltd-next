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
  QueryWalkcalcRecordsDto,
  ResolveWalkcalcSettlementsDto,
  UpdateWalkcalcRecordDto,
} from './dto/record.dto'
import {
  WalkcalcBalanceDetailDto,
  WalkcalcBalanceListDto,
  WalkcalcDropRecordMutationDto,
  WalkcalcGroupDto,
  WalkcalcGroupSummaryDto,
  WalkcalcHomeSummaryDto,
  WalkcalcParticipantProjectionDto,
  WalkcalcPublicUserDto,
  WalkcalcRecordDto,
  WalkcalcRecordMutationDto,
  WalkcalcRecordsMutationDto,
  WalkcalcSettlementSuggestionDto,
} from './dto/response.dto'
import {
  WalkcalcGroup,
  WalkcalcGroupDocument,
  WalkcalcParticipant,
  WalkcalcParticipantDocument,
  WalkcalcParticipantProjection,
  WalkcalcParticipantProjectionDocument,
  WalkcalcRecord,
  WalkcalcRecordDocument,
} from './schema/walkcalc-group.schema'
import { generateGroupCode } from './utils/group-code'
import {
  LedgerDelta,
  buildExpenseLedgerDeltas,
  buildSettlementLedgerDeltas,
  involvedExpenseParticipants,
  involvedSettlementParticipants,
  reverseLedgerDeltas,
} from './utils/ledger-effects'
import {
  MoneyValue,
  addMoneyValues,
  assertPositiveMoneyAmount,
  formatMoneyAmount,
  fromMoneyValueBigInt,
  toMoneyValueBigInt,
} from './utils/money'

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

interface SettlementBalance {
  participantId: string
  value: bigint
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
  settlement: ['transfer', '转账'],
}

const exactSettlementParticipantLimit = 12

@Injectable()
export class WalkcalcService {
  private readonly maxGroupCodeAttempts = 20

  constructor(
    @InjectModel(WalkcalcGroup.name)
    private walkcalcGroupModel: Model<WalkcalcGroupDocument>,
    @InjectModel(WalkcalcParticipant.name)
    private walkcalcParticipantModel: Model<WalkcalcParticipantDocument>,
    @InjectModel(WalkcalcRecord.name)
    private walkcalcRecordModel: Model<WalkcalcRecordDocument>,
    @InjectModel(WalkcalcParticipantProjection.name)
    private walkcalcProjectionModel: Model<WalkcalcParticipantProjectionDocument>,
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

  async homeSummary(userId: string): Promise<WalkcalcHomeSummaryDto> {
    const projections = await this.walkcalcProjectionModel
      .find({ userId })
      .exec()
    const total = projections.reduce(
      (sum, projection) => addMoneyValues(sum, projection.balanceValue),
      '0',
    )
    return { totalBalance: formatMoneyAmount(total) }
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

      try {
        await this.runInOptionalTransaction(async (session) => {
          const now = Date.now()
          const group = new this.walkcalcGroupModel({
            code,
            ownerUserId: userId,
            name: dto.name,
            archivedUserIds: [],
            isDeleted: false,
            createdAtMs: now,
            modifiedAt: now,
          })
          await group.save({ session })
          await this.createParticipantWithProjection(
            {
              groupCode: code,
              participantId: userId,
              kind: 'user',
              userId,
            },
            session,
          )
        })
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
    return this.runInOptionalTransaction(async (session) => {
      const group = await this.loadActiveGroup(code, session)
      const existing = await this.walkcalcParticipantModel
        .exists({ groupCode: code, kind: 'user', userId })
        .session(session ?? null)
        .exec()
      if (existing) {
        throw new GeneralException('walkcalc.userAlreadyInGroup')
      }

      await this.createParticipantWithProjection(
        {
          groupCode: code,
          participantId: userId,
          kind: 'user',
          userId,
        },
        session,
      )
      group.modifiedAt = Date.now()
      await group.save({ session })
      return { code }
    })
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
    return this.runInOptionalTransaction(async (session) => {
      const group = await this.loadOwnedGroup(code, userId, session)
      const exists = await this.walkcalcParticipantModel
        .exists({ groupCode: code, kind: 'tempUser', tempName: name })
        .session(session ?? null)
        .exec()
      if (exists) {
        throw new GeneralException('walkcalc.tempUserNameExists')
      }

      const participant = await this.createParticipantWithProjection(
        {
          groupCode: code,
          participantId: uuidv4(),
          kind: 'tempUser',
          tempName: name,
        },
        session,
      )
      group.modifiedAt = Date.now()
      await group.save({ session })
      return {
        participantId: participant.participantId,
        kind: participant.kind,
        tempName: participant.tempName,
      }
    })
  }

  async inviteUsers(
    userId: string,
    code: string,
    userIds: string[],
  ): Promise<{ code: string; userIds: string[] }> {
    return this.runInOptionalTransaction(async (session) => {
      const group = await this.loadGroupForMember(code, userId, session)
      const users = await this.userService.findPublicUsersByIds(userIds)
      const existingParticipants = await this.walkcalcParticipantModel
        .find({
          groupCode: code,
          kind: 'user',
          userId: { $in: users.map((user) => user.userId) },
        })
        .session(session ?? null)
        .exec()
      const existingIds = new Set(
        existingParticipants.map((participant) => participant.userId),
      )
      const invitedIds = users
        .map((user) => user.userId)
        .filter((targetUserId) => !existingIds.has(targetUserId))

      await Promise.all(
        invitedIds.map((targetUserId) =>
          this.createParticipantWithProjection(
            {
              groupCode: code,
              participantId: targetUserId,
              kind: 'user',
              userId: targetUserId,
            },
            session,
          ),
        ),
      )
      if (invitedIds.length) {
        group.modifiedAt = Date.now()
        await group.save({ session })
      }

      return { code, userIds: invitedIds }
    })
  }

  async myGroups(
    userId: string,
    query: QueryWalkcalcGroupsDto,
  ): Promise<PaginationResponseDto<WalkcalcGroupSummaryDto>> {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 10
    const memberships = await this.walkcalcParticipantModel
      .find({ kind: 'user', userId })
      .select({ groupCode: 1 })
      .exec()
    const groupCodes = memberships.map((membership) => membership.groupCode)
    const filter = this.withGroupSearch(
      this.activeGroupFilter({ code: { $in: groupCodes } }),
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
      data: await this.mapGroupsToSummaryDtos(groups, userId),
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
    return this.runInOptionalTransaction(async (session) => {
      const group = await this.loadGroupForMember(code, userId, session)
      const archivedUserIds = new Set(group.archivedUserIds)
      if (isArchive) {
        const unsettled = await this.walkcalcProjectionModel
          .exists({
            groupCode: code,
            balanceValue: { $ne: '0' },
          })
          .session(session ?? null)
          .exec()
        if (unsettled) {
          throw new GeneralException('walkcalc.groupUnsettled')
        }
        archivedUserIds.add(userId)
      } else {
        archivedUserIds.delete(userId)
      }
      group.archivedUserIds = [...archivedUserIds]
      group.modifiedAt = Date.now()
      await group.save({ session })
      return { code }
    })
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
      const record = await this.createRecordDocument(dto, userId, session)
      await this.applyRecordProjectionEffects(record, 1, session)
      group.modifiedAt = Date.now()
      await group.save({ session })
      return {
        record: this.mapRecordToDto(record),
        group: await this.mapGroupToDto(group, userId, session),
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
      const record = await this.loadRecordForGroup(groupCode, recordId, session)
      await this.applyRecordProjectionEffects(record, -1, session)
      await this.walkcalcRecordModel
        .deleteOne({ groupCode, recordId })
        .session(session ?? null)
        .exec()
      group.modifiedAt = Date.now()
      await group.save({ session })
      return {
        groupCode,
        recordId,
        group: await this.mapGroupToDto(group, userId, session),
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
      const previousRecord = await this.loadRecordForGroup(
        dto.groupCode,
        dto.recordId,
        session,
      )
      const nextRecord = await this.buildRecordDocument(
        dto,
        userId,
        previousRecord,
        session,
      )

      await this.applyRecordProjectionEffects(previousRecord, -1, session)
      await this.walkcalcRecordModel
        .replaceOne(
          { groupCode: dto.groupCode, recordId: dto.recordId },
          this.documentToPlainObject(nextRecord),
        )
        .session(session ?? null)
        .exec()
      await this.applyRecordProjectionEffects(nextRecord, 1, session)
      group.modifiedAt = Date.now()
      await group.save({ session })
      return {
        record: this.mapRecordToDto(nextRecord),
        group: await this.mapGroupToDto(group, userId, session),
      }
    })
  }

  async getRecord(
    userId: string,
    recordId: string,
  ): Promise<WalkcalcRecordDto> {
    const record = await this.walkcalcRecordModel.findOne({ recordId }).exec()
    if (!record) {
      throw new GeneralException('walkcalc.recordNotFound')
    }
    await this.loadGroupForMember(record.groupCode, userId)
    return this.mapRecordToDto(record)
  }

  async groupRecords(
    userId: string,
    groupCode: string,
    query: QueryWalkcalcRecordsDto,
  ): Promise<PaginationResponseDto<WalkcalcRecordDto>> {
    await this.loadGroupForMember(groupCode, userId)
    return this.queryRecords(groupCode, query)
  }

  async groupBalances(
    userId: string,
    groupCode: string,
  ): Promise<WalkcalcBalanceListDto> {
    await this.loadGroupForMember(groupCode, userId)
    return {
      groupCode,
      participants: await this.loadParticipantProjectionDtos(groupCode),
    }
  }

  async participantBalanceDetail(
    userId: string,
    groupCode: string,
    participantId: string,
    query: QueryWalkcalcRecordsDto,
  ): Promise<WalkcalcBalanceDetailDto> {
    await this.loadGroupForMember(groupCode, userId)
    const [participant] = await this.loadParticipantProjectionDtos(
      groupCode,
      participantId,
    )
    if (!participant) {
      throw new GeneralException('walkcalc.invalidParticipant')
    }
    const records = await this.queryRecords(groupCode, {
      ...query,
      participantId,
    })
    return {
      ...participant,
      records: records.data as WalkcalcRecordDto[],
      total: records.total,
      page: records.page,
      pageSize: records.pageSize,
    }
  }

  async settlementSuggestion(
    userId: string,
    groupCode: string,
  ): Promise<WalkcalcSettlementSuggestionDto> {
    await this.loadGroupForMember(groupCode, userId)
    return this.buildSettlementSuggestion(groupCode)
  }

  async resolveSettlements(
    userId: string,
    groupCode: string,
    _dto: ResolveWalkcalcSettlementsDto,
  ): Promise<WalkcalcRecordsMutationDto> {
    return this.runInOptionalTransaction(async (session) => {
      const group = await this.loadGroupForMember(groupCode, userId, session)
      const suggestion = await this.buildSettlementSuggestion(
        groupCode,
        session,
      )
      const records = await Promise.all(
        suggestion.transfers.map((transfer) =>
          this.createRecordDocument(
            {
              groupCode,
              type: 'settlement',
              amount: transfer.amount,
              fromId: transfer.fromId,
              toId: transfer.toId,
            },
            userId,
            session,
          ),
        ),
      )
      for (const record of records) {
        await this.applyRecordProjectionEffects(record, 1, session)
      }
      group.modifiedAt = Date.now()
      await group.save({ session })
      return {
        records: records.map((record) => this.mapRecordToDto(record)),
        group: await this.mapGroupToDto(group, userId, session),
      }
    })
  }

  async rebuildProjectionsForGroup(groupCode: string): Promise<void> {
    const participants = await this.walkcalcParticipantModel
      .find({ groupCode })
      .exec()
    await this.walkcalcProjectionModel.deleteMany({ groupCode }).exec()
    await Promise.all(
      participants.map((participant) =>
        this.createProjectionForParticipant(participant),
      ),
    )
    const records = await this.walkcalcRecordModel.find({ groupCode }).exec()
    for (const record of records) {
      await this.applyRecordProjectionEffects(record, 1)
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

  private async createParticipantWithProjection(
    participant: Pick<
      WalkcalcParticipant,
      'groupCode' | 'participantId' | 'kind' | 'userId' | 'tempName'
    >,
    session?: ClientSession,
  ): Promise<WalkcalcParticipantDocument> {
    const now = Date.now()
    const participantDocument = new this.walkcalcParticipantModel({
      ...participant,
      createdAtMs: now,
      modifiedAt: now,
    })
    await participantDocument.save({ session })
    await this.createProjectionForParticipant(participantDocument, session)
    return participantDocument
  }

  private async createProjectionForParticipant(
    participant: Pick<
      WalkcalcParticipant,
      'groupCode' | 'participantId' | 'kind' | 'userId'
    >,
    session?: ClientSession,
  ) {
    const projection = new this.walkcalcProjectionModel({
      groupCode: participant.groupCode,
      participantId: participant.participantId,
      kind: participant.kind,
      userId: participant.userId,
      balanceValue: '0',
      expenseShareValue: '0',
      paidTotalValue: '0',
      recordCount: 0,
      settlementInValue: '0',
      settlementOutValue: '0',
      modifiedAt: Date.now(),
    })
    await projection.save({ session })
  }

  private activeGroupFilter<T extends Record<string, unknown>>(filter?: T) {
    return {
      ...(filter ?? {}),
      isDeleted: { $ne: true },
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
      $and: [filter, { $or: [{ name: regex }, { code: regex }] }],
    }
  }

  private async loadActiveGroup(
    code: string,
    session?: ClientSession,
  ): Promise<WalkcalcGroupDocument> {
    const group = await this.walkcalcGroupModel
      .findOne(this.activeGroupFilter({ code }))
      .session(session ?? null)
      .exec()
    if (!group) {
      throw new GeneralException('walkcalc.groupNotFound')
    }
    return group
  }

  private async loadGroupForMember(
    code: string,
    userId: string,
    session?: ClientSession,
  ): Promise<WalkcalcGroupDocument> {
    const group = await this.walkcalcGroupModel
      .findOne(this.activeGroupFilter({ code }))
      .session(session ?? null)
      .exec()
    if (!group) {
      throw new GeneralException('walkcalc.groupNotFoundOrNoAccess')
    }
    const membership = await this.walkcalcParticipantModel
      .exists({ groupCode: code, kind: 'user', userId })
      .session(session ?? null)
      .exec()
    if (!membership) {
      throw new GeneralException('walkcalc.groupNotFoundOrNoAccess')
    }
    return group
  }

  private async loadOwnedGroup(
    code: string,
    userId: string,
    session?: ClientSession,
  ): Promise<WalkcalcGroupDocument> {
    const group = await this.walkcalcGroupModel
      .findOne(this.activeGroupFilter({ code, ownerUserId: userId }))
      .session(session ?? null)
      .exec()
    if (!group) {
      throw new GeneralException('walkcalc.groupOwnerRequired')
    }
    return group
  }

  private async loadRecordForGroup(
    groupCode: string,
    recordId: string,
    session?: ClientSession,
  ): Promise<WalkcalcRecordDocument> {
    const record = await this.walkcalcRecordModel
      .findOne({ groupCode, recordId })
      .session(session ?? null)
      .exec()
    if (!record) {
      throw new GeneralException('walkcalc.recordNotFound')
    }
    return record
  }

  private async createRecordDocument(
    dto: AddWalkcalcRecordDto,
    userId: string,
    session?: ClientSession,
  ): Promise<WalkcalcRecordDocument> {
    const record = await this.buildRecordDocument(
      dto,
      userId,
      undefined,
      session,
    )
    await record.save({ session })
    return record
  }

  private async buildRecordDocument(
    dto: AddWalkcalcRecordDto,
    userId: string,
    previousRecord?: WalkcalcRecord,
    session?: ClientSession,
  ): Promise<WalkcalcRecordDocument> {
    const now = Date.now()
    const amountValue = this.resolveAmountValue(dto.amount)
    const createdAt = dto.createdAt ?? previousRecord?.createdAt ?? now

    if (dto.type === 'expense') {
      const payerId = this.requiredParticipantId(dto.payerId)
      const participantIds = this.requiredParticipantIds(dto.participantIds)
      const involvedParticipantIds = involvedExpenseParticipants({
        payerId,
        participantIds,
      })
      await this.assertParticipantsExist(
        dto.groupCode,
        involvedParticipantIds,
        session,
      )
      buildExpenseLedgerDeltas({
        amount: dto.amount,
        payerId,
        participantIds,
      })
      return new this.walkcalcRecordModel({
        groupCode: dto.groupCode,
        recordId: previousRecord?.recordId ?? uuidv4(),
        type: dto.type,
        amountValue,
        payerId,
        participantIds,
        involvedParticipantIds,
        category: dto.category,
        note: dto.note,
        long: dto.long,
        lat: dto.lat,
        createdAt,
        updatedAt: now,
        createdBy: previousRecord?.createdBy ?? userId,
        updatedBy: previousRecord ? userId : undefined,
      })
    }

    if (dto.type === 'settlement') {
      const fromId = this.requiredParticipantId(dto.fromId)
      const toId = this.requiredParticipantId(dto.toId)
      const involvedParticipantIds = involvedSettlementParticipants({
        fromId,
        toId,
      })
      await this.assertParticipantsExist(
        dto.groupCode,
        involvedParticipantIds,
        session,
      )
      buildSettlementLedgerDeltas({ amount: dto.amount, fromId, toId })
      return new this.walkcalcRecordModel({
        groupCode: dto.groupCode,
        recordId: previousRecord?.recordId ?? uuidv4(),
        type: dto.type,
        amountValue,
        fromId,
        toId,
        involvedParticipantIds,
        category: dto.category ?? 'settlement',
        note: dto.note,
        long: dto.long,
        lat: dto.lat,
        createdAt,
        updatedAt: now,
        createdBy: previousRecord?.createdBy ?? userId,
        updatedBy: previousRecord ? userId : undefined,
      })
    }

    throw new GeneralException('walkcalc.invalidRecordType')
  }

  private resolveAmountValue(amount: string): MoneyValue {
    try {
      return assertPositiveMoneyAmount(amount)
    } catch {
      throw new GeneralException('walkcalc.invalidMoneyAmount')
    }
  }

  private requiredParticipantId(participantId?: string): string {
    const trimmed = participantId?.trim()
    if (!trimmed) {
      throw new GeneralException('walkcalc.invalidParticipant')
    }
    return trimmed
  }

  private requiredParticipantIds(participantIds?: string[]): string[] {
    if (!participantIds?.length) {
      throw new GeneralException('walkcalc.forWhomRequired')
    }
    return participantIds.map((participantId) =>
      this.requiredParticipantId(participantId),
    )
  }

  private async assertParticipantsExist(
    groupCode: string,
    participantIds: string[],
    session?: ClientSession,
  ) {
    const participants = await this.walkcalcParticipantModel
      .find({ groupCode, participantId: { $in: participantIds } })
      .session(session ?? null)
      .exec()
    const foundIds = new Set(
      participants.map((participant) => participant.participantId),
    )
    if (participantIds.some((participantId) => !foundIds.has(participantId))) {
      throw new GeneralException('walkcalc.invalidParticipant')
    }
  }

  private async applyRecordProjectionEffects(
    record: WalkcalcRecord,
    direction: 1 | -1,
    session?: ClientSession,
  ) {
    const deltas =
      direction === 1
        ? this.buildDeltasForRecord(record)
        : reverseLedgerDeltas(this.buildDeltasForRecord(record))

    for (const delta of deltas) {
      await this.applyProjectionDelta(record.groupCode, delta, session)
    }
  }

  private buildDeltasForRecord(record: WalkcalcRecord): LedgerDelta[] {
    const amount = formatMoneyAmount(record.amountValue)
    if (record.type === 'expense') {
      return buildExpenseLedgerDeltas({
        amount,
        payerId: this.requiredParticipantId(record.payerId),
        participantIds: this.requiredParticipantIds(record.participantIds),
      })
    }
    return buildSettlementLedgerDeltas({
      amount,
      fromId: this.requiredParticipantId(record.fromId),
      toId: this.requiredParticipantId(record.toId),
    })
  }

  private async applyProjectionDelta(
    groupCode: string,
    delta: LedgerDelta,
    session?: ClientSession,
  ) {
    const projection = await this.walkcalcProjectionModel
      .findOne({ groupCode, participantId: delta.participantId })
      .session(session ?? null)
      .exec()
    if (!projection) {
      throw new GeneralException('walkcalc.invalidParticipant')
    }

    projection.balanceValue = addMoneyValues(
      projection.balanceValue,
      delta.balanceValue,
    )
    projection.expenseShareValue = addMoneyValues(
      projection.expenseShareValue,
      delta.expenseShareValue,
    )
    projection.paidTotalValue = addMoneyValues(
      projection.paidTotalValue,
      delta.paidTotalValue,
    )
    projection.settlementInValue = addMoneyValues(
      projection.settlementInValue,
      delta.settlementInValue,
    )
    projection.settlementOutValue = addMoneyValues(
      projection.settlementOutValue,
      delta.settlementOutValue,
    )
    projection.recordCount += delta.recordCount
    if (projection.recordCount < 0) {
      throw new GeneralException('walkcalc.invalidProjectionState')
    }
    projection.modifiedAt = Date.now()
    await projection.save({ session })
  }

  private async queryRecords(
    groupCode: string,
    query: QueryWalkcalcRecordsDto,
  ): Promise<PaginationResponseDto<WalkcalcRecordDto>> {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 10
    const filter: Record<string, unknown> = { groupCode }
    const participantId = query.participantId?.trim()
    if (participantId) {
      await this.assertParticipantsExist(groupCode, [participantId])
      filter.involvedParticipantIds = participantId
    }
    const searchFilter = this.recordSearchFilter(query.search)
    const finalFilter = searchFilter ? { $and: [filter, searchFilter] } : filter
    const [records, total] = await Promise.all([
      this.walkcalcRecordModel
        .find(finalFilter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .exec(),
      this.walkcalcRecordModel.countDocuments(finalFilter).exec(),
    ])

    return {
      data: records.map((record) => this.mapRecordToDto(record)),
      total,
      page,
      pageSize,
    }
  }

  private recordSearchFilter(
    search?: string,
  ): Record<string, unknown> | undefined {
    const parsedSearch = this.parseRecordSearch(search)
    if (!parsedSearch) {
      return undefined
    }

    const filters = parsedSearch.conditions.map((condition) =>
      this.recordSearchConditionFilter(condition),
    )
    return parsedSearch.operator === 'and'
      ? { $and: filters }
      : { $or: filters }
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

  private recordSearchConditionFilter(
    condition: StructuredRecordSearchCondition,
  ): Record<string, unknown> {
    switch (condition.field) {
      case 'note':
        return { note: this.searchRegex(condition.query) ?? /$a/ }
      case 'categoryName': {
        const categories = Object.entries(recordCategoryNames)
          .filter(([, names]) =>
            names.some((name) => name.toLowerCase().includes(condition.query)),
          )
          .map(([category]) => category)
        return categories.length
          ? { category: { $in: categories } }
          : { category: '__walkcalc_no_category_match__' }
      }
    }
  }

  private async mapGroupsToSummaryDtos(
    groups: WalkcalcGroup[],
    userId: string,
  ): Promise<WalkcalcGroupSummaryDto[]> {
    const groupCodes = groups.map((group) => group.code)
    const projections = await this.walkcalcProjectionModel
      .find({ groupCode: { $in: groupCodes }, participantId: userId })
      .exec()
    const projectionMap = new Map(
      projections.map((projection) => [projection.groupCode, projection]),
    )
    return groups.map((group) => {
      const projection = projectionMap.get(group.code)
      return {
        code: group.code,
        name: group.name,
        ownerUserId: group.ownerUserId,
        archivedUserIds: group.archivedUserIds,
        isOwner: group.ownerUserId === userId,
        createdAt: group.createdAtMs,
        modifiedAt: group.modifiedAt,
        currentUserBalance: formatMoneyAmount(projection?.balanceValue ?? '0'),
        currentUserExpenseShare: formatMoneyAmount(
          projection?.expenseShareValue ?? '0',
        ),
        currentUserPaidTotal: formatMoneyAmount(
          projection?.paidTotalValue ?? '0',
        ),
        currentUserRecordCount: projection?.recordCount ?? 0,
      }
    })
  }

  private async mapGroupToDto(
    group: WalkcalcGroup,
    userId: string,
    session?: ClientSession,
  ): Promise<WalkcalcGroupDto> {
    return {
      code: group.code,
      name: group.name,
      ownerUserId: group.ownerUserId,
      archivedUserIds: group.archivedUserIds,
      isOwner: group.ownerUserId === userId,
      createdAt: group.createdAtMs,
      modifiedAt: group.modifiedAt,
      participants: await this.loadParticipantProjectionDtos(
        group.code,
        undefined,
        session,
      ),
    }
  }

  private async loadParticipantProjectionDtos(
    groupCode: string,
    participantId?: string,
    session?: ClientSession,
  ): Promise<WalkcalcParticipantProjectionDto[]> {
    const participantFilter: Record<string, unknown> = { groupCode }
    if (participantId) {
      participantFilter.participantId = participantId
    }
    const [participants, projections] = await Promise.all([
      this.walkcalcParticipantModel
        .find(participantFilter)
        .session(session ?? null)
        .exec(),
      this.walkcalcProjectionModel
        .find(participantFilter)
        .session(session ?? null)
        .exec(),
    ])
    const projectionMap = new Map(
      projections.map((projection) => [projection.participantId, projection]),
    )
    const userIds = participants
      .map((participant) => participant.userId)
      .filter((value): value is string => !!value)
    const users = await this.userService.findPublicUsersByIds(userIds)
    const userMap = new Map(users.map((user) => [user.userId, user]))

    return participants.map((participant) => {
      const projection = projectionMap.get(participant.participantId)
      return {
        participantId: participant.participantId,
        kind: participant.kind,
        userId: participant.userId,
        tempName: participant.tempName,
        profile: participant.userId
          ? userMap.get(participant.userId)?.profile
          : undefined,
        balance: formatMoneyAmount(projection?.balanceValue ?? '0'),
        expenseShare: formatMoneyAmount(projection?.expenseShareValue ?? '0'),
        paidTotal: formatMoneyAmount(projection?.paidTotalValue ?? '0'),
        recordCount: projection?.recordCount ?? 0,
        settlementIn: formatMoneyAmount(projection?.settlementInValue ?? '0'),
        settlementOut: formatMoneyAmount(projection?.settlementOutValue ?? '0'),
      }
    })
  }

  private mapRecordToDto(record: WalkcalcRecord): WalkcalcRecordDto {
    return {
      recordId: record.recordId,
      groupCode: record.groupCode,
      type: record.type,
      amount: formatMoneyAmount(record.amountValue),
      payerId: record.payerId,
      participantIds:
        record.type === 'expense' ? record.participantIds : undefined,
      fromId: record.fromId,
      toId: record.toId,
      involvedParticipantIds: record.involvedParticipantIds,
      category: record.category,
      note: record.note,
      long: record.long,
      lat: record.lat,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      createdBy: record.createdBy,
      updatedBy: record.updatedBy,
    }
  }

  private async buildSettlementSuggestion(
    groupCode: string,
    session?: ClientSession,
  ): Promise<WalkcalcSettlementSuggestionDto> {
    const projections = await this.walkcalcProjectionModel
      .find({ groupCode })
      .session(session ?? null)
      .exec()
    const balances = projections
      .map((projection) => ({
        participantId: projection.participantId,
        value: toMoneyValueBigInt(projection.balanceValue),
      }))
      .filter((balance) => balance.value !== 0n)

    if (balances.length > exactSettlementParticipantLimit) {
      throw new GeneralException('walkcalc.settlementLimitExceeded')
    }

    return {
      groupCode,
      strategy: 'exact',
      transfers: this.minimizeSettlementTransfers(balances).map((transfer) => ({
        ...transfer,
        amount: formatMoneyAmount(transfer.amount),
      })),
    }
  }

  private minimizeSettlementTransfers(
    balances: SettlementBalance[],
  ): Array<{ fromId: string; toId: string; amount: MoneyValue }> {
    const ids = balances.map((balance) => balance.participantId)
    const values = balances.map((balance) => balance.value)
    let best:
      | Array<{ fromId: string; toId: string; amount: bigint }>
      | undefined

    const search = (
      currentValues: bigint[],
      plan: Array<{ fromId: string; toId: string; amount: bigint }>,
    ) => {
      if (best && plan.length >= best.length) {
        return
      }
      let index = 0
      while (index < currentValues.length && currentValues[index] === 0n) {
        index += 1
      }
      if (index === currentValues.length) {
        best = plan
        return
      }

      for (let next = index + 1; next < currentValues.length; next += 1) {
        if (currentValues[index] * currentValues[next] >= 0n) {
          continue
        }
        const valuesCopy = [...currentValues]
        const indexValue = valuesCopy[index]
        const nextValue = valuesCopy[next]
        const amount =
          absBigInt(indexValue) < absBigInt(nextValue)
            ? absBigInt(indexValue)
            : absBigInt(nextValue)
        const transfer =
          indexValue < 0n
            ? { fromId: ids[index], toId: ids[next], amount }
            : { fromId: ids[next], toId: ids[index], amount }

        if (indexValue < 0n) {
          valuesCopy[index] += amount
          valuesCopy[next] -= amount
        } else {
          valuesCopy[index] -= amount
          valuesCopy[next] += amount
        }
        search(valuesCopy, [...plan, transfer])
      }
    }

    search(values, [])
    return (best ?? []).map((transfer) => ({
      fromId: transfer.fromId,
      toId: transfer.toId,
      amount: fromMoneyValueBigInt(transfer.amount),
    }))
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

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
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

  private documentToPlainObject(document: unknown): Record<string, unknown> {
    if (
      document &&
      typeof document === 'object' &&
      'toObject' in document &&
      typeof (document as { toObject: () => unknown }).toObject === 'function'
    ) {
      return (
        document as { toObject: () => Record<string, unknown> }
      ).toObject()
    }

    return { ...(document as Record<string, unknown>) }
  }
}

function absBigInt(value: bigint): bigint {
  return value < 0n ? -value : value
}

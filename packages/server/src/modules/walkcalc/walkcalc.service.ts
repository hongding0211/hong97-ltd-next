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
  WalkcalcGroupDto,
  WalkcalcPublicUserDto,
  WalkcalcRecordDto,
} from './dto/response.dto'
import {
  WalkcalcGroup,
  WalkcalcGroupDocument,
  WalkcalcMember,
  WalkcalcRecord,
  WalkcalcTempUser,
} from './schema/walkcalc-group.schema'
import { generateGroupCode } from './utils/group-code'

type Participant =
  | { type: 'member'; value: WalkcalcMember }
  | { type: 'temp'; value: WalkcalcTempUser }

@Injectable()
export class WalkcalcService {
  private readonly maxRecordsPerGroup = 5000

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
    const idx = await this.getNextGroupIndex()
    const availableGroupCode = await this.getAvailableGroupCode(idx)
    const now = Date.now()

    const group = new this.walkcalcGroupModel({
      idx: availableGroupCode.idx,
      code: availableGroupCode.code,
      ownerUserId: userId,
      name: dto.name,
      members: [{ userId, debt: 0, cost: 0 }],
      tempUsers: [],
      records: [],
      archivedUserIds: [],
      createdAtMs: now,
      modifiedAt: now,
    })
    await group.save()
    return { code: availableGroupCode.code }
  }

  async joinGroup(userId: string, code: string): Promise<{ code: string }> {
    await this.getPublicUserOrThrow(userId)
    const group = await this.walkcalcGroupModel.findOne({ code }).exec()
    if (!group) {
      throw new GeneralException('walkcalc.groupNotFound')
    }
    if (this.isGroupMember(group, userId)) {
      throw new GeneralException('walkcalc.userAlreadyInGroup')
    }

    group.members.push({ userId, debt: 0, cost: 0 })
    group.modifiedAt = Date.now()
    await group.save()
    return { code }
  }

  async dismissGroup(userId: string, code: string): Promise<{ code: string }> {
    const result = await this.walkcalcGroupModel
      .deleteOne({ code, ownerUserId: userId })
      .exec()
    if (result.deletedCount < 1) {
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
      debt: 0,
      cost: 0,
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
        debt: 0,
        cost: 0,
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
    const filter = this.memberFilter(userId)
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
  ): Promise<WalkcalcRecordDto> {
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
      const record: WalkcalcRecord = {
        recordId: uuidv4(),
        who: dto.who,
        paid: dto.paid,
        forWhom: dto.forWhom,
        type: dto.type,
        text: dto.text,
        long: dto.long,
        lat: dto.lat,
        isDebtResolve: !!dto.isDebtResolve,
        createdAt: now,
        modifiedAt: now,
        createdBy: userId,
      }

      this.applyRecordBalance(group, record, 1)
      group.records.push(record)
      group.modifiedAt = now
      await group.save({ session })
      return this.mapRecordToDto(record)
    })
  }

  async resolveDebts(
    userId: string,
    dto: BulkResolveWalkcalcDebtsDto,
  ): Promise<WalkcalcRecordDto[]> {
    return this.runInOptionalTransaction(async (session) => {
      const group = await this.loadGroupForMember(
        dto.groupCode,
        userId,
        session,
      )
      this.assertBulkDebtTransfers(dto, group)

      const now = Date.now()
      const records: WalkcalcRecord[] = dto.transfers.map((transfer) => ({
        recordId: uuidv4(),
        who: transfer.from,
        paid: transfer.amount,
        forWhom: [transfer.to],
        type: 'debtResolve',
        text: 'Debt Resolve',
        long: '',
        lat: '',
        isDebtResolve: true,
        createdAt: now,
        modifiedAt: now,
        createdBy: userId,
      }))

      records.forEach((record) => this.applyRecordBalance(group, record, 1))
      group.records.push(...records)
      group.modifiedAt = now
      await group.save({ session })
      return records.map(this.mapRecordToDto)
    })
  }

  async dropRecord(
    userId: string,
    groupCode: string,
    recordId: string,
  ): Promise<{ groupCode: string; recordId: string }> {
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
      await group.save({ session })
      return { groupCode, recordId }
    })
  }

  async updateRecord(
    userId: string,
    dto: UpdateWalkcalcRecordDto,
  ): Promise<WalkcalcRecordDto> {
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
      const updatedRecord: WalkcalcRecord = {
        recordId: previousRecord.recordId,
        who: dto.who,
        paid: dto.paid,
        forWhom: dto.forWhom,
        type: dto.type,
        text: dto.text,
        long: dto.long,
        lat: dto.lat,
        isDebtResolve: !!dto.isDebtResolve,
        createdAt: previousRecord.createdAt,
        modifiedAt: now,
        createdBy: previousRecord.createdBy,
        modifiedBy: userId,
      }
      this.applyRecordBalance(group, updatedRecord, 1)
      group.records[recordIndex] = updatedRecord
      group.modifiedAt = now
      await group.save({ session })
      return this.mapRecordToDto(updatedRecord)
    })
  }

  async getRecord(
    userId: string,
    recordId: string,
  ): Promise<WalkcalcRecordDto> {
    const group = await this.walkcalcGroupModel
      .findOne({
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
    const records = [...group.records].sort((a, b) => b.createdAt - a.createdAt)
    const skip = (page - 1) * pageSize

    return {
      data: records.slice(skip, skip + pageSize).map(this.mapRecordToDto),
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

  private async getNextGroupIndex(): Promise<number> {
    const latest = await this.walkcalcGroupModel
      .findOne({}, { idx: 1 })
      .sort({ idx: -1 })
      .exec()
    return latest ? latest.idx + 1 : 0
  }

  private async getAvailableGroupCode(
    startIndex: number,
  ): Promise<{ idx: number; code: string }> {
    let idx = startIndex
    let code = generateGroupCode(idx)
    while (await this.walkcalcGroupModel.exists({ code })) {
      idx += 1
      code = generateGroupCode(idx)
    }
    return { idx, code }
  }

  private memberFilter(userId: string) {
    return {
      $or: [{ ownerUserId: userId }, { 'members.userId': userId }],
    }
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
      .findOne({ code, ownerUserId: userId })
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
    if (dto.paid === 0) {
      throw new GeneralException('walkcalc.zeroAmountRecord')
    }
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
      if (transfer.amount <= 0) {
        throw new GeneralException('walkcalc.zeroAmountRecord')
      }
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
    record: Pick<WalkcalcRecord, 'who' | 'paid' | 'forWhom' | 'isDebtResolve'>,
    direction: 1 | -1,
  ) {
    const avg = record.paid / record.forWhom.length
    const forWhomParticipants = record.forWhom.map(
      (participantId) => this.resolveParticipant(group, participantId).value,
    )
    const payer = this.resolveParticipant(group, record.who).value

    for (const participant of forWhomParticipants) {
      participant.debt += direction * -avg
      if (!record.isDebtResolve) {
        participant.cost += direction * avg
      }
    }

    payer.debt += direction * record.paid
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
          debt: member.debt,
          cost: member.cost,
        }
      }),
      tempUsers: group.tempUsers.map((tempUser) => ({
        uuid: tempUser.uuid,
        name: tempUser.name,
        debt: tempUser.debt,
        cost: tempUser.cost,
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
      paid: record.paid,
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
}

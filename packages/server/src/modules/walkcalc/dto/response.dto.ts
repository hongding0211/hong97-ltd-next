import { UserProfile } from '../../user/schema/user.schema'

export type MoneyAmount = string
export type WalkcalcParticipantKindDto = 'user' | 'tempUser'
export type WalkcalcRecordTypeDto = 'expense' | 'settlement'

export interface WalkcalcPublicUserDto {
  userId: string
  profile: UserProfile
}

export interface WalkcalcParticipantDto {
  participantId: string
  kind: WalkcalcParticipantKindDto
  userId?: string
  tempName?: string
  profile?: UserProfile
}

export interface WalkcalcParticipantProjectionDto
  extends WalkcalcParticipantDto {
  balance: MoneyAmount
  expenseShare: MoneyAmount
  paidTotal: MoneyAmount
  recordCount: number
  settlementIn: MoneyAmount
  settlementOut: MoneyAmount
}

export interface WalkcalcRecordDto {
  recordId: string
  groupCode: string
  type: WalkcalcRecordTypeDto
  amount: MoneyAmount
  payerId?: string
  participantIds?: string[]
  fromId?: string
  toId?: string
  involvedParticipantIds: string[]
  category?: string
  note?: string
  long?: string
  lat?: string
  createdAt: number
  updatedAt: number
  createdBy: string
  updatedBy?: string
}

export interface WalkcalcGroupDto {
  code: string
  name: string
  ownerUserId: string
  archivedUserIds: string[]
  isOwner: boolean
  createdAt: number
  modifiedAt: number
  participants: WalkcalcParticipantProjectionDto[]
}

export interface WalkcalcGroupSummaryDto {
  code: string
  name: string
  ownerUserId: string
  archivedUserIds: string[]
  isOwner: boolean
  createdAt: number
  modifiedAt: number
  currentUserBalance: MoneyAmount
  currentUserExpenseShare: MoneyAmount
  currentUserPaidTotal: MoneyAmount
  currentUserRecordCount: number
}

export interface WalkcalcHomeSummaryDto {
  totalBalance: MoneyAmount
}

export interface WalkcalcBalanceListDto {
  groupCode: string
  participants: WalkcalcParticipantProjectionDto[]
}

export interface WalkcalcBalanceDetailDto
  extends WalkcalcParticipantProjectionDto {
  records: WalkcalcRecordDto[]
  total: number
  page: number
  pageSize: number
}

export interface WalkcalcSettlementTransferDto {
  fromId: string
  toId: string
  amount: MoneyAmount
}

export interface WalkcalcSettlementSuggestionDto {
  groupCode: string
  strategy: 'exact'
  transfers: WalkcalcSettlementTransferDto[]
}

export interface WalkcalcRecordMutationDto {
  record: WalkcalcRecordDto
  group: WalkcalcGroupDto
}

export interface WalkcalcDropRecordMutationDto {
  groupCode: string
  recordId: string
  group: WalkcalcGroupDto
}

export interface WalkcalcRecordsMutationDto {
  records: WalkcalcRecordDto[]
  group: WalkcalcGroupDto
}

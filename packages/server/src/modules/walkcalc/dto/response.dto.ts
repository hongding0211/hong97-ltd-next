import { UserProfile } from '../../user/schema/user.schema'

export type MoneyMinor = string

export interface WalkcalcPublicUserDto {
  userId: string
  profile: UserProfile
}

export interface WalkcalcMemberDto extends WalkcalcPublicUserDto {
  debt: number
  cost: number
  debtMinor: MoneyMinor
  costMinor: MoneyMinor
}

export interface WalkcalcTempUserDto {
  uuid: string
  name: string
  debt: number
  cost: number
  debtMinor: MoneyMinor
  costMinor: MoneyMinor
}

export interface WalkcalcRecordDto {
  recordId: string
  who: string
  paid: number
  paidMinor: MoneyMinor
  forWhom: string[]
  type?: string
  text?: string
  long?: string
  lat?: string
  isDebtResolve?: boolean
  createdAt: number
  modifiedAt: number
  createdBy: string
  modifiedBy?: string
}

export interface WalkcalcGroupDto {
  code: string
  name: string
  ownerUserId: string
  members: WalkcalcMemberDto[]
  tempUsers: WalkcalcTempUserDto[]
  archivedUserIds: string[]
  isOwner: boolean
  createdAt: number
  modifiedAt: number
}

export interface WalkcalcRecordMutationDto extends WalkcalcRecordDto {
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

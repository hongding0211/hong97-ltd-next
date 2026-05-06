import { UserProfile } from '../../user/schema/user.schema'

export interface WalkcalcPublicUserDto {
  userId: string
  profile: UserProfile
}

export interface WalkcalcMemberDto extends WalkcalcPublicUserDto {
  debt: number
  cost: number
}

export interface WalkcalcTempUserDto {
  uuid: string
  name: string
  debt: number
  cost: number
}

export interface WalkcalcRecordDto {
  recordId: string
  who: string
  paid: number
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

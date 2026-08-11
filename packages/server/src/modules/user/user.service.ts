import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { UserResponseDto } from './dto/user.response.dto'
import { User, UserDocument } from './schema/user.schema'

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  mapUserToResponse(user: UserDocument): UserResponseDto {
    return {
      userId: user.userId,
      profile: user.profile,
    }
  }

  async findUsersByIds(userIds: string[]): Promise<UserResponseDto[]> {
    const users = await this.userModel.find({ userId: { $in: userIds } })
    return users.map((user) => this.mapUserToResponse(user))
  }

  async findUserById(userId: string): Promise<UserResponseDto> {
    const users = await this.findUsersByIds([userId])
    if (!users.length) {
      throw new Error('User not found')
    }
    return users[0]
  }

  async findPublicUsersByIds(userIds: string[]): Promise<UserResponseDto[]> {
    if (!userIds.length) {
      return []
    }
    return this.findUsersByIds([...new Set(userIds)])
  }

  async searchPublicUsersByName(
    name: string,
    limit = 10,
  ): Promise<UserResponseDto[]> {
    const trimmedName = name.trim()
    if (!trimmedName) {
      return []
    }

    const users = await this.userModel
      .find({
        'profile.name': {
          $regex: trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          $options: 'i',
        },
      })
      .limit(limit)
    return users.map((user) => this.mapUserToResponse(user))
  }

  async listPublicUsers(limit = 100): Promise<UserResponseDto[]> {
    const users = await this.userModel
      .find()
      .select({ userId: 1, profile: 1 })
      .sort({ 'profile.name': 1 })
      .limit(limit)
    return users.map((user) => this.mapUserToResponse(user))
  }

  async searchPublicUsers(
    search: string | undefined,
    page: number,
    pageSize: number,
  ): Promise<{ users: UserResponseDto[]; total: number }> {
    const trimmedSearch = search?.trim()
    const escapedSearch = trimmedSearch?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const filter = escapedSearch
      ? {
          $or: [
            { userId: { $regex: escapedSearch, $options: 'i' } },
            { 'profile.name': { $regex: escapedSearch, $options: 'i' } },
          ],
        }
      : {}

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select({ userId: 1, profile: 1 })
        .sort({ 'profile.name': 1, userId: 1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      this.userModel.countDocuments(filter),
    ])

    return {
      users: users.map((user) => this.mapUserToResponse(user)),
      total,
    }
  }
}

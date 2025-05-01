import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { UserResponseDto } from './dto/user.response.dto'
import {
  UserApp,
  UserAppDocument,
  UserAppType,
} from './schemas/user-apps.schema'
import { User, UserDocument } from './schemas/user.schema'

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(UserApp.name) private userAppModel: Model<UserAppDocument>,
  ) {}

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

  async readUserAppData(userId: string, app: keyof UserAppType) {
    const user = await this.userAppModel.findOne({
      userId,
    })

    if (!user) {
      return null
    }

    return user.data?.[app] ?? {}
  }

  async writeUserAppData(
    userId: string,
    app: keyof UserAppType,
    data: UserAppType[keyof UserAppType],
  ): Promise<any>
  async writeUserAppData(
    userId: string,
    app: keyof UserAppType,
    fn: (
      data: UserAppType[keyof UserAppType],
    ) => UserAppType[keyof UserAppType],
  ): Promise<any>

  async writeUserAppData(
    userId: string,
    app: keyof UserAppType,
    dataOrFn:
      | UserAppType[keyof UserAppType]
      | ((
          data: UserAppType[keyof UserAppType],
        ) => UserAppType[keyof UserAppType]),
  ): Promise<any> {
    const user = await this.userAppModel.findOne({ userId })
    if (!user) return null

    if (!user.data?.[app]) {
      user.data = { ...user.data, [app]: {} }
    }

    if (typeof dataOrFn === 'function') {
      user.data[app] = dataOrFn(user.data[app])
    } else {
      user.data[app] = dataOrFn
    }

    await user.save()

    return user.data[app]
  }
}

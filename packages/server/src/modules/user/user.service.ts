import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { UserResponseDto } from './dto/user.response.dto'
import { User, UserDocument } from './schemas/user.schema'

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
}

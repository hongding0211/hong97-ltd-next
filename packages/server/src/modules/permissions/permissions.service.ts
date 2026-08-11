import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { UserService } from '../user/user.service'
import { PermissionPointResponseDto } from './dto/permission.dto'
import { PermissionMatch } from './permission.constants'
import {
  PermissionGrant,
  PermissionGrantDocument,
} from './schema/permission-grant.schema'

@Injectable()
export class PermissionsService {
  constructor(
    @InjectModel(PermissionGrant.name)
    private permissionGrantModel: Model<PermissionGrantDocument>,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  configuredKeys(): string[] {
    return this.configService.get<string[]>('permissions.keys') ?? []
  }

  async assertUserHasPermissions(
    userId: string | undefined,
    requestedKeys: readonly string[],
    match: PermissionMatch = 'any',
  ): Promise<void> {
    const keys = [...new Set(requestedKeys.map((key) => key.trim()))].filter(
      Boolean,
    )
    if (!keys.length) {
      return
    }

    const configuredKeys = new Set(this.configuredKeys())
    if (keys.some((key) => !configuredKeys.has(key))) {
      throw new ForbiddenException('Permission denied')
    }
    if (!userId) {
      throw new ForbiddenException('Permission denied')
    }

    const rootUsers = this.configService.get<string[]>('auth.rootUsers') ?? []
    if (rootUsers.includes(userId)) {
      return
    }

    const grantedKeys = await this.permissionGrantModel.distinct(
      'permissionKey',
      {
        userId,
        permissionKey: { $in: keys },
      },
    )
    const allowed =
      match === 'all'
        ? grantedKeys.length === keys.length
        : grantedKeys.length > 0
    if (!allowed) {
      throw new ForbiddenException('Permission denied')
    }
  }

  async listPermissionPoints(): Promise<PermissionPointResponseDto[]> {
    const keys = this.configuredKeys()
    const grants = await this.permissionGrantModel
      .find({ permissionKey: { $in: keys } })
      .lean()
    const users = await this.userService.findUsersByIds(
      grants.map((grant) => grant.userId),
    )
    const usersById = new Map(users.map((user) => [user.userId, user]))

    return keys.map((key) => ({
      key,
      grants: grants
        .filter((grant) => grant.permissionKey === key)
        .map((grant) => ({
          userId: grant.userId,
          profile: usersById.get(grant.userId)?.profile,
          createdAt: (grant as PermissionGrantDocument & { createdAt?: Date })
            .createdAt,
        })),
    }))
  }

  async listUsers() {
    return this.userService.listPublicUsers(100)
  }

  async addGrant(permissionKey: string, userId: string, createdBy: string) {
    this.assertConfigured(permissionKey)
    await this.userService.findUserById(userId)
    await this.permissionGrantModel.updateOne(
      { permissionKey, userId },
      { $setOnInsert: { permissionKey, userId, createdBy } },
      { upsert: true },
    )
    return { permissionKey, userId }
  }

  async deleteGrant(permissionKey: string, userId: string) {
    this.assertConfigured(permissionKey)
    const result = await this.permissionGrantModel.deleteOne({
      permissionKey,
      userId,
    })
    if (!result.deletedCount) {
      throw new NotFoundException('Permission grant not found')
    }
    return { permissionKey, userId }
  }

  private assertConfigured(permissionKey: string) {
    if (!this.configuredKeys().includes(permissionKey)) {
      throw new NotFoundException('Permission point not found')
    }
  }
}

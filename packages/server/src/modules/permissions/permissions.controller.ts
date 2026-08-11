import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common'
import { RootOnly } from '../../decorators/root-only.decorator'
import { UserId } from '../../decorators/user-id.decorator'
import {
  CreatePermissionGrantDto,
  PermissionUsersQueryDto,
} from './dto/permission.dto'
import { PermissionsService } from './permissions.service'

@Controller('permissions')
@RootOnly()
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  async list() {
    return { points: await this.permissionsService.listPermissionPoints() }
  }

  @Get(':permissionKey/users')
  async listUsers(
    @Param('permissionKey') permissionKey: string,
    @Query() query: PermissionUsersQueryDto,
  ) {
    return this.permissionsService.listPermissionUsers(permissionKey, query)
  }

  @Post(':permissionKey/grants')
  async addGrant(
    @Param('permissionKey') permissionKey: string,
    @Body() body: CreatePermissionGrantDto,
    @UserId() actorUserId: string,
  ) {
    return this.permissionsService.addGrant(
      permissionKey,
      body.userId,
      actorUserId,
    )
  }

  @Delete(':permissionKey/grants/:userId')
  async deleteGrant(
    @Param('permissionKey') permissionKey: string,
    @Param('userId') userId: string,
  ) {
    return this.permissionsService.deleteGrant(permissionKey, userId)
  }
}

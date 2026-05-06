import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { UserId } from '../../decorators/user-id.decorator'
import {
  CreateWalkcalcGroupDto,
  CreateWalkcalcTempUserDto,
  InviteWalkcalcUsersDto,
  JoinWalkcalcGroupDto,
  QueryWalkcalcGroupsDto,
  RenameWalkcalcGroupDto,
} from './dto/group.dto'
import {
  AddWalkcalcRecordDto,
  DropWalkcalcRecordDto,
  QueryWalkcalcRecordsDto,
  UpdateWalkcalcRecordDto,
} from './dto/record.dto'
import { SearchWalkcalcUsersDto, WalkcalcUsersLookupDto } from './dto/user.dto'
import { WalkcalcService } from './walkcalc.service'

@Controller('walkcalc')
export class WalkcalcController {
  constructor(private readonly walkcalcService: WalkcalcService) {}

  @Get('users/me')
  @HttpCode(HttpStatus.OK)
  async currentUser(@UserId() userId: string) {
    return this.walkcalcService.currentUser(userId)
  }

  @Post('users')
  @HttpCode(HttpStatus.OK)
  async users(@Body() dto: WalkcalcUsersLookupDto) {
    return this.walkcalcService.users(dto.userIds)
  }

  @Get('users/search')
  @HttpCode(HttpStatus.OK)
  async searchUsers(@Query() query: SearchWalkcalcUsersDto) {
    return this.walkcalcService.searchUsers(query.name)
  }

  @Post('groups')
  @HttpCode(HttpStatus.OK)
  async createGroup(
    @UserId() userId: string,
    @Body() dto: CreateWalkcalcGroupDto,
  ) {
    return this.walkcalcService.createGroup(userId, dto)
  }

  @Post('groups/join')
  @HttpCode(HttpStatus.OK)
  async joinGroup(@UserId() userId: string, @Body() dto: JoinWalkcalcGroupDto) {
    return this.walkcalcService.joinGroup(userId, dto.code)
  }

  @Get('groups/my')
  @HttpCode(HttpStatus.OK)
  async myGroups(
    @UserId() userId: string,
    @Query() query: QueryWalkcalcGroupsDto,
  ) {
    return this.walkcalcService.myGroups(userId, query)
  }

  @Get('groups/:code')
  @HttpCode(HttpStatus.OK)
  async getGroup(@UserId() userId: string, @Param('code') code: string) {
    return this.walkcalcService.getGroup(userId, code)
  }

  @Delete('groups/:code')
  @HttpCode(HttpStatus.OK)
  async dismissGroup(@UserId() userId: string, @Param('code') code: string) {
    return this.walkcalcService.dismissGroup(userId, code)
  }

  @Post('groups/:code/temp-users')
  @HttpCode(HttpStatus.OK)
  async addTempUser(
    @UserId() userId: string,
    @Param('code') code: string,
    @Body() dto: CreateWalkcalcTempUserDto,
  ) {
    return this.walkcalcService.addTempUser(userId, code, dto.name)
  }

  @Post('groups/:code/invite')
  @HttpCode(HttpStatus.OK)
  async inviteUsers(
    @UserId() userId: string,
    @Param('code') code: string,
    @Body() dto: InviteWalkcalcUsersDto,
  ) {
    return this.walkcalcService.inviteUsers(userId, code, dto.userIds)
  }

  @Post('groups/:code/archive')
  @HttpCode(HttpStatus.OK)
  async archiveGroup(@UserId() userId: string, @Param('code') code: string) {
    return this.walkcalcService.archiveGroup(userId, code, true)
  }

  @Post('groups/:code/unarchive')
  @HttpCode(HttpStatus.OK)
  async unarchiveGroup(@UserId() userId: string, @Param('code') code: string) {
    return this.walkcalcService.archiveGroup(userId, code, false)
  }

  @Patch('groups/:code/name')
  @HttpCode(HttpStatus.OK)
  async renameGroup(
    @UserId() userId: string,
    @Param('code') code: string,
    @Body() dto: RenameWalkcalcGroupDto,
  ) {
    return this.walkcalcService.renameGroup(userId, code, dto.name)
  }

  @Post('records')
  @HttpCode(HttpStatus.OK)
  async addRecord(@UserId() userId: string, @Body() dto: AddWalkcalcRecordDto) {
    return this.walkcalcService.addRecord(userId, dto)
  }

  @Post('records/drop')
  @HttpCode(HttpStatus.OK)
  async dropRecord(
    @UserId() userId: string,
    @Body() dto: DropWalkcalcRecordDto,
  ) {
    return this.walkcalcService.dropRecord(userId, dto.groupCode, dto.recordId)
  }

  @Post('records/update')
  @HttpCode(HttpStatus.OK)
  async updateRecord(
    @UserId() userId: string,
    @Body() dto: UpdateWalkcalcRecordDto,
  ) {
    return this.walkcalcService.updateRecord(userId, dto)
  }

  @Get('records/group/:groupCode')
  @HttpCode(HttpStatus.OK)
  async groupRecords(
    @UserId() userId: string,
    @Param('groupCode') groupCode: string,
    @Query() query: QueryWalkcalcRecordsDto,
  ) {
    return this.walkcalcService.groupRecords(userId, groupCode, query)
  }

  @Get('records/:recordId')
  @HttpCode(HttpStatus.OK)
  async getRecord(
    @UserId() userId: string,
    @Param('recordId') recordId: string,
  ) {
    return this.walkcalcService.getRecord(userId, recordId)
  }
}

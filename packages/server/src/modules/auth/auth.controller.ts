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
  Req,
  Res,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { RootOnly } from '../../decorators/root-only.decorator'
import { UserId } from '../../decorators/user-id.decorator'
import { AuthService } from './auth.service'
import { CreateApiTokenDto, DeleteApiTokenParamsDto } from './dto/api-token.dto'
import { LoginDto } from './dto/login.dto'
import { ModifyPasswordDto } from './dto/modify-password.dto'
import { RegisterDto } from './dto/register.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto)
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(loginDto, res)
  }

  @Get('github')
  async githubLogin(
    @Query('redirect') redirect: string | undefined,
    @Res() res: Response,
  ) {
    res.redirect(this.authService.getGithubAuthorizationRedirect(redirect))
  }

  @Get('github/callback')
  async githubCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    const redirectUrl = await this.authService.handleGithubCallback(
      { code, state, error },
      res,
    )
    res.redirect(redirectUrl)
  }

  @Get('info')
  @HttpCode(HttpStatus.OK)
  async info(@UserId() userId: string) {
    return this.authService.info(userId)
  }

  @Post('refreshToken')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.refreshToken(req, res)
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @UserId() userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(userId, updateProfileDto)
  }

  @Post('modifyPassword')
  @HttpCode(HttpStatus.OK)
  async modifyPassword(
    @UserId() userId: string,
    @Body() modifyPasswordDto: ModifyPasswordDto,
  ) {
    return this.authService.modifyPassword(userId, modifyPasswordDto)
  }

  @Get('hasLocalAuth')
  @HttpCode(HttpStatus.OK)
  async hasLocalAuth(@UserId() userId: string) {
    return this.authService.hasLocalAuth(userId)
  }

  @Get('isAdmin')
  @HttpCode(HttpStatus.OK)
  async isAdmin(@UserId() userId: string) {
    return this.authService.isAdmin(userId)
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.logout(req, res)
  }

  @Get('api-tokens')
  @RootOnly()
  @HttpCode(HttpStatus.OK)
  async listApiTokens(@UserId() userId: string) {
    return this.authService.listApiTokens(userId)
  }

  @Post('api-tokens')
  @RootOnly()
  @HttpCode(HttpStatus.OK)
  async createApiToken(
    @UserId() userId: string,
    @Body() createApiTokenDto: CreateApiTokenDto,
  ) {
    return this.authService.createApiToken(userId, createApiTokenDto)
  }

  @Delete('api-tokens/:tokenId')
  @RootOnly()
  @HttpCode(HttpStatus.OK)
  async deleteApiToken(
    @UserId() userId: string,
    @Param() params: DeleteApiTokenParamsDto,
  ) {
    return this.authService.deleteApiToken(userId, params.tokenId)
  }
}

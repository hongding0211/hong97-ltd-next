import { createHash, randomBytes } from 'crypto'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { InjectModel } from '@nestjs/mongoose'
import * as bcrypt from 'bcrypt'
import type { CookieOptions, Request, Response } from 'express'
import { Model } from 'mongoose'
import { v4 as uuidv4 } from 'uuid'
import { GeneralException } from '../../exceptions/general-exceptions'
import { ServiceResponse } from '../../interceptors/response/types'
import { parseJwtExpiresInToMs } from '../../utils/time-parser'
import { User, UserDocument } from '../user/schema/user.schema'
import { UserService } from '../user/user.service'
import { HasLocalAuthResponseDto } from './dto/hasLocalAuth.dto'
import {
  LocalLoginDto,
  LoginDto,
  OAuthLoginDto,
  PhoneLoginDto,
} from './dto/login.dto'
import { ModifyPasswordDto } from './dto/modify-password.dto'
import { RefreshTokenDto } from './dto/refresh-token-dto'
import {
  LocalRegisterDto,
  OAuthRegisterDto,
  PhoneRegisterDto,
  RegisterDto,
} from './dto/register.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import {
  RefreshSession,
  RefreshSessionDocument,
} from './schema/refresh-session.schema'

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(RefreshSession.name)
    private refreshSessionModel: Model<RefreshSessionDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private userService: UserService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { type, credentials } = registerDto

    switch (type) {
      case 'local':
        return this.registerWithLocal(credentials as LocalRegisterDto)
      case 'phone':
        return this.registerWithPhone(credentials as PhoneRegisterDto)
      case 'github':
        return this.registerWithOAuth(credentials as OAuthRegisterDto)
      default:
        throw new GeneralException('auth.invalidRegisterType')
    }
  }

  private async registerWithLocal(credentials: LocalRegisterDto) {
    const { email, phoneNumber, password, profile } = credentials

    if (!email && !phoneNumber) {
      throw new GeneralException('auth.emailOrPhoneRequired')
    }

    if (password.length < 6) {
      throw new GeneralException('auth.passwordTooShort')
    }

    // 检查邮箱是否已存在
    if (email) {
      const existingEmail = await this.userModel.findOne({
        'authData.local.email': email,
      })
      if (existingEmail) {
        throw new GeneralException('auth.emailExists')
      }
    }

    // 检查手机号是否已存在
    if (phoneNumber) {
      const existingPhone = await this.userModel.findOne({
        'authData.local.phoneNumber': phoneNumber,
      })
      if (existingPhone) {
        throw new GeneralException('auth.phoneExists')
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = new this.userModel({
      userId: uuidv4(),
      profile,
      authProviders: ['local'],
      authData: {
        local: {
          email,
          phoneNumber,
          passwordHash: hashedPassword,
        },
      },
      isActive: true,
    })

    await user.save()
    return this.userService.mapUserToResponse(user)
  }

  private async registerWithPhone(_credentials: PhoneRegisterDto) {
    throw new GeneralException('auth.phoneRegistrationNotImplemented')
  }

  private async registerWithOAuth(_credentials: OAuthRegisterDto) {
    throw new GeneralException('auth.oauthRegistrationNotImplemented')
  }

  async login(loginDto: LoginDto, res?: Response) {
    const { type, credentials } = loginDto

    switch (type) {
      case 'local':
        return this.loginWithLocal(credentials as LocalLoginDto, res)
      case 'phone':
        return this.loginWithPhone(credentials as PhoneLoginDto, res)
      case 'github':
        return this.loginWithOAuth(credentials as OAuthLoginDto, res)
      default:
        throw new GeneralException('auth.invalidLoginType')
    }
  }

  private getAccessTokenExpiresIn(): string {
    return (
      this.configService.get<string>('auth.jwt.accessExpiresIn') ||
      this.configService.get<string>('auth.jwt.expiresIn') ||
      '15m'
    )
  }

  private getRefreshTokenExpiresIn(): string {
    return this.configService.get<string>('auth.jwt.refreshExpiresIn') || '30d'
  }

  private getAccessCookieName(): string {
    return (
      this.configService.get<string>('auth.cookies.accessTokenName') ||
      'accessToken'
    )
  }

  private getRefreshCookieName(): string {
    return (
      this.configService.get<string>('auth.cookies.refreshTokenName') ||
      'refreshToken'
    )
  }

  private getLegacyCookieName(): string {
    return (
      this.configService.get<string>('auth.cookies.legacyTokenName') || 'token'
    )
  }

  private generateAccessToken(user: UserDocument): string {
    if (!user.userId) {
      throw new UnauthorizedException('User ID not found')
    }

    const payload = { sub: user.userId }
    return this.jwtService.sign(payload, {
      expiresIn: this.getAccessTokenExpiresIn() as any,
    })
  }

  private getCookieOptions(expiresIn: string, path = '/'): CookieOptions {
    const sameSite =
      this.configService.get<'strict' | 'lax' | 'none'>(
        'auth.cookies.sameSite',
      ) || 'strict'

    return {
      httpOnly: true,
      secure:
        this.configService.get<boolean>('auth.cookies.secure') ||
        process.env.NODE_ENV === 'production',
      sameSite,
      maxAge: parseJwtExpiresInToMs(expiresIn),
      path,
    }
  }

  private getClearCookieOptions(path = '/'): CookieOptions {
    const sameSite =
      this.configService.get<'strict' | 'lax' | 'none'>(
        'auth.cookies.sameSite',
      ) || 'strict'

    return {
      httpOnly: true,
      secure:
        this.configService.get<boolean>('auth.cookies.secure') ||
        process.env.NODE_ENV === 'production',
      sameSite,
      path,
    }
  }

  private setAccessTokenCookie(res: Response, accessToken: string): void {
    res.cookie(
      this.getAccessCookieName(),
      accessToken,
      this.getCookieOptions(this.getAccessTokenExpiresIn()),
    )
  }

  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    res.cookie(
      this.getRefreshCookieName(),
      refreshToken,
      this.getCookieOptions(this.getRefreshTokenExpiresIn()),
    )
  }

  private clearAuthCookies(res: Response): void {
    res.clearCookie(this.getAccessCookieName(), this.getClearCookieOptions())
    res.clearCookie(this.getRefreshCookieName(), this.getClearCookieOptions())
    res.clearCookie(this.getLegacyCookieName(), this.getClearCookieOptions())
  }

  private generateRefreshToken(sessionId = uuidv4()): string {
    return `${sessionId}.${randomBytes(32).toString('base64url')}`
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex')
  }

  private getRefreshSessionId(refreshToken: string): string {
    const [sessionId, tokenPart] = refreshToken.split('.')
    if (!sessionId || !tokenPart) {
      throw new UnauthorizedException('Invalid refresh token')
    }
    return sessionId
  }

  private getRefreshExpiresAt(): Date {
    return new Date(
      Date.now() + parseJwtExpiresInToMs(this.getRefreshTokenExpiresIn()),
    )
  }

  private async createRefreshSession(userId: string): Promise<string> {
    const refreshToken = this.generateRefreshToken()
    await this.refreshSessionModel.create({
      sessionId: this.getRefreshSessionId(refreshToken),
      userId,
      tokenHash: this.hashRefreshToken(refreshToken),
      expiresAt: this.getRefreshExpiresAt(),
      revokedAt: null,
      rotatedAt: null,
    })
    return refreshToken
  }

  private async rotateRefreshSession(
    session: RefreshSessionDocument,
  ): Promise<string> {
    const refreshToken = this.generateRefreshToken(session.sessionId)
    session.tokenHash = this.hashRefreshToken(refreshToken)
    session.expiresAt = this.getRefreshExpiresAt()
    session.rotatedAt = new Date()
    session.revokedAt = null
    await session.save()
    return refreshToken
  }

  private async revokeRefreshSession(
    session: RefreshSessionDocument,
  ): Promise<void> {
    if (!session.revokedAt) {
      session.revokedAt = new Date()
      await session.save()
    }
  }

  private extractRefreshToken(req?: Request): string | undefined {
    return req?.cookies?.[this.getRefreshCookieName()]
  }

  private async validateRefreshSession(
    refreshToken?: string,
  ): Promise<RefreshSessionDocument> {
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided')
    }

    const sessionId = this.getRefreshSessionId(refreshToken)
    const session = await this.refreshSessionModel.findOne({ sessionId })

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token')
    }

    if (session.tokenHash !== this.hashRefreshToken(refreshToken)) {
      await this.revokeRefreshSession(session)
      throw new UnauthorizedException('Invalid refresh token')
    }

    return session
  }

  private async loginWithLocal(credentials: LocalLoginDto, res?: Response) {
    const { email, phoneNumber, password } = credentials

    if (!email && !phoneNumber) {
      throw new GeneralException('auth.emailOrPhoneRequired')
    }

    // 构建查询条件
    const query = email
      ? { 'authData.local.email': email }
      : { 'authData.local.phoneNumber': phoneNumber }

    const user = await this.userModel.findOne(query)

    if (!user || !user.authData?.local?.passwordHash) {
      throw new GeneralException('auth.userNotFound')
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.authData.local.passwordHash,
    )

    if (!isPasswordValid) {
      throw new GeneralException('auth.wrongPassword')
    }

    // 更新最后登录时间
    user.lastLoginAt = new Date()
    await user.save()

    const accessToken = this.generateAccessToken(user)
    const refreshToken = await this.createRefreshSession(user.userId)

    if (res) {
      this.clearAuthCookies(res)
      this.setAccessTokenCookie(res, accessToken)
      this.setRefreshTokenCookie(res, refreshToken)
    }

    return {
      accessToken,
      accessTokenExpiresIn: this.getAccessTokenExpiresIn(),
      refreshTokenExpiresIn: this.getRefreshTokenExpiresIn(),
      user: this.userService.mapUserToResponse(user),
    }
  }

  private async loginWithPhone(_: PhoneLoginDto, _res?: Response) {
    throw new GeneralException('auth.phoneLoginNotImplemented')
  }

  private async loginWithOAuth(_: OAuthLoginDto, _res?: Response) {
    throw new GeneralException('auth.oauthLoginNotImplemented')
  }

  async info(userId: string) {
    const user = await this.userModel.findOne({ userId })
    if (!user) {
      throw new GeneralException('auth.userNotFound')
    }
    return {
      ...this.userService.mapUserToResponse(user),
      isAdmin: (await this.isAdmin(userId)).isAdmin || false,
    }
  }

  async refreshToken(req?: Request, res?: Response): Promise<RefreshTokenDto> {
    const session = await this.validateRefreshSession(
      this.extractRefreshToken(req),
    )
    const user = await this.userModel.findOne({ userId: session.userId })
    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    const accessToken = this.generateAccessToken(user)
    const refreshToken = await this.rotateRefreshSession(session)

    if (res) {
      this.clearAuthCookies(res)
      this.setAccessTokenCookie(res, accessToken)
      this.setRefreshTokenCookie(res, refreshToken)
    }

    return {
      accessToken,
      accessTokenExpiresIn: this.getAccessTokenExpiresIn(),
      refreshTokenExpiresIn: this.getRefreshTokenExpiresIn(),
    }
  }

  async logout(req?: Request, res?: Response): Promise<Record<string, never>> {
    const refreshToken = this.extractRefreshToken(req)
    if (refreshToken) {
      try {
        const session = await this.validateRefreshSession(refreshToken)
        await this.revokeRefreshSession(session)
      } catch {
        // Logout is best-effort; stale refresh credentials should still be cleared.
      }
    }

    if (res) {
      this.clearAuthCookies(res)
    }

    return {}
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.userModel.findOne({ userId })
    if (!user) {
      throw new GeneralException('auth.userNotFound')
    }

    // Update profile fields
    if (updateProfileDto.name) {
      user.profile.name = updateProfileDto.name
    }
    if (updateProfileDto.avatar) {
      user.profile.avatar = updateProfileDto.avatar
    }
    if (updateProfileDto.birthday) {
      user.profile.birthday = updateProfileDto.birthday
    }
    if (updateProfileDto.gender) {
      user.profile.gender = updateProfileDto.gender
    }
    if (updateProfileDto.bio !== undefined && updateProfileDto.bio !== null) {
      user.profile.bio = updateProfileDto.bio
    }
    if (updateProfileDto.metadata) {
      user.profile.metadata = updateProfileDto.metadata
    }

    await user.save()
    return this.userService.mapUserToResponse(user)
  }

  async modifyPassword(userId: string, modifyPasswordDto: ModifyPasswordDto) {
    const { originalPassword, newPassword } = modifyPasswordDto

    if (newPassword.length < 6) {
      throw new GeneralException('auth.passwordTooShort')
    }

    if (!originalPassword || originalPassword === newPassword) {
      throw new GeneralException('auth.passwordCannotBeSameAsOriginalPassword')
    }

    const user = await this.userModel.findOne({ userId })

    if (!user || !user.authData?.local?.passwordHash) {
      throw new GeneralException('auth.userNotFound')
    }

    if (user.authProviders.indexOf('local') === -1) {
      throw new GeneralException('auth.userHasNoLocalAuth')
    }

    const isPasswordValid = await bcrypt.compare(
      originalPassword,
      user.authData.local.passwordHash,
    )

    if (!isPasswordValid) {
      throw new GeneralException('auth.wrongOldPassword')
    }

    await user.updateOne({
      'authData.local.passwordHash': await bcrypt.hash(newPassword, 10),
    })

    return this.userService.mapUserToResponse(user)
  }

  async hasLocalAuth(userId: string): ServiceResponse<HasLocalAuthResponseDto> {
    const user = await this.userModel.findOne({ userId })
    if (!user) {
      throw new GeneralException('auth.userNotFound')
    }
    return {
      hasLocalAuth: user.authProviders.includes('local'),
    }
  }

  async isAdmin(userId: string): ServiceResponse<{ isAdmin: boolean }> {
    const rootUsers = this.configService.get<string[]>('auth.rootUsers') || []
    return {
      isAdmin: rootUsers.includes(userId),
    }
  }
}

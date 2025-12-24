import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { InjectModel } from '@nestjs/mongoose'
import * as bcrypt from 'bcrypt'
import type { Response } from 'express'
import { Model } from 'mongoose'
import { GeneralException } from 'src/exceptions/general-exceptions'
import { ServiceResponse } from 'src/interceptors/response/types'
import { parseJwtExpiresInToMs } from 'src/utils/time-parser'
import { v4 as uuidv4 } from 'uuid'
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

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
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

  private async generateTokens(user: UserDocument): Promise<string> {
    if (!user.userId) {
      throw new UnauthorizedException('User ID not found')
    }

    const payload = { sub: user.userId }
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<number>('auth.jwt.expiresIn'),
    })

    return accessToken
  }

  private setAuthCookie(res: Response, token: string): void {
    const expiresIn =
      this.configService.get<string>('auth.jwt.expiresIn') || '1d'
    const maxAge = parseJwtExpiresInToMs(expiresIn)

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: maxAge,
    })
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

    const token = await this.generateTokens(user)

    if (res) {
      this.setAuthCookie(res, token)
    }

    return {
      token,
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

  async refreshToken(userId: string, res?: Response): Promise<RefreshTokenDto> {
    const user = await this.userModel.findOne({ userId })
    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    const token = await this.generateTokens(user)

    if (res) {
      this.setAuthCookie(res, token)
    }

    return {
      token,
    }
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

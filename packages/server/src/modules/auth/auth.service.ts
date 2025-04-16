import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { InjectModel } from '@nestjs/mongoose'
import * as bcrypt from 'bcrypt'
import { Model } from 'mongoose'
import { ErrorResponse } from 'src/common/response/err-response'
import { v4 as uuidv4 } from 'uuid'
import { AuthProvider, User, UserDocument } from '../../schemas/user.schema'
import { UserService } from '../user/user.service'
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
      case 'oauth':
        return this.registerWithOAuth(credentials as OAuthRegisterDto)
      default:
        return new ErrorResponse('auth.invalidRegisterType')
    }
  }

  private async registerWithLocal(credentials: LocalRegisterDto) {
    const { email, phoneNumber, password, profile } = credentials

    if (!email && !phoneNumber) {
      return new ErrorResponse('auth.emailOrPhoneRequired')
    }

    // 检查邮箱是否已存在
    if (email) {
      const existingEmail = await this.userModel.findOne({
        'authData.local.email': email,
      })
      if (existingEmail) {
        return new ErrorResponse('auth.emailExists')
      }
    }

    // 检查手机号是否已存在
    if (phoneNumber) {
      const existingPhone = await this.userModel.findOne({
        'authData.local.phoneNumber': phoneNumber,
      })
      if (existingPhone) {
        return new ErrorResponse('auth.phoneExists')
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = new this.userModel({
      userId: uuidv4(),
      profile,
      authProviders: [AuthProvider.LOCAL],
      authData: {
        [AuthProvider.LOCAL]: {
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
    return new ErrorResponse('auth.phoneRegistrationNotImplemented')
  }

  private async registerWithOAuth(_credentials: OAuthRegisterDto) {
    return new ErrorResponse('auth.oauthRegistrationNotImplemented')
  }

  async login(loginDto: LoginDto) {
    const { type, credentials } = loginDto

    switch (type) {
      case 'local':
        return this.loginWithLocal(credentials as LocalLoginDto)
      case 'phone':
        return this.loginWithPhone(credentials as PhoneLoginDto)
      case 'oauth':
        return this.loginWithOAuth(credentials as OAuthLoginDto)
      default:
        return new ErrorResponse('auth.invalidLoginType')
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

  private async loginWithLocal(credentials: LocalLoginDto) {
    const { email, phoneNumber, password } = credentials

    if (!email && !phoneNumber) {
      return new ErrorResponse('auth.emailOrPhoneRequired')
    }

    // 构建查询条件
    const query = email
      ? { 'authData.local.email': email }
      : { 'authData.local.phoneNumber': phoneNumber }

    const user = await this.userModel.findOne(query)

    if (!user || !user.authData?.local?.passwordHash) {
      return new ErrorResponse('auth.userNotFound')
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.authData.local.passwordHash,
    )

    if (!isPasswordValid) {
      return new ErrorResponse('auth.wrongPassword')
    }

    // 更新最后登录时间
    user.lastLoginAt = new Date()
    await user.save()

    return {
      token: await this.generateTokens(user),
      user: this.userService.mapUserToResponse(user),
    }
  }

  private async loginWithPhone(_: PhoneLoginDto) {
    return new ErrorResponse('auth.phoneLoginNotImplemented')
  }

  private async loginWithOAuth(_: OAuthLoginDto) {
    return new ErrorResponse('auth.oauthLoginNotImplemented')
  }

  async info(userId: string) {
    const user = await this.userModel.findOne({ userId })
    if (!user) {
      return new ErrorResponse('auth.userNotFound')
    }
    return this.userService.mapUserToResponse(user)
  }

  async refreshToken(userId: string): Promise<RefreshTokenDto> {
    const user = await this.userModel.findOne({ userId })
    if (!user) {
      throw new UnauthorizedException('User not found')
    }
    return {
      token: await this.generateTokens(user),
    }
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.userModel.findOne({ userId })
    if (!user) {
      return new ErrorResponse('auth.userNotFound')
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
    user.profile.bio = updateProfileDto.bio
    if (updateProfileDto.metadata) {
      user.profile.metadata = updateProfileDto.metadata
    }

    await user.save()
    return this.userService.mapUserToResponse(user)
  }

  async modifyPassword(modifyPasswordDto: ModifyPasswordDto) {
    const { email, phoneNumber, originalPassword, newPassword } =
      modifyPasswordDto

    if (!email && !phoneNumber) {
      return new ErrorResponse('auth.emailOrPhoneRequired')
    }

    const user = await this.userModel.findOne({
      $or: [
        { 'authData.local.email': email },
        { 'authData.local.phoneNumber': phoneNumber },
      ],
    })

    if (!user || !user.authData?.local?.passwordHash) {
      return new ErrorResponse('auth.userNotFound')
    }

    const isPasswordValid = await bcrypt.compare(
      originalPassword,
      user.authData.local.passwordHash,
    )

    if (!isPasswordValid) {
      return new ErrorResponse('auth.wrongOldPassword')
    }

    user.authData.local.passwordHash = await bcrypt.hash(newPassword, 10)
    await user.save()

    return this.userService.mapUserToResponse(user)
  }
}

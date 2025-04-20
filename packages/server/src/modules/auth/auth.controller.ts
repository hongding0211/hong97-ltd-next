import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common'
import { UserId } from 'src/decorators/user-id.decorator'
import { AuthService } from './auth.service'
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
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto)
  }

  @Get('info')
  @HttpCode(HttpStatus.OK)
  async info(@UserId() userId: string) {
    return this.authService.info(userId)
  }

  @Get('refreshToken')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@UserId() userId: string) {
    return this.authService.refreshToken(userId)
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
}

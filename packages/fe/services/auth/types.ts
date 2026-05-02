import {
  ApiTokenResponseDto,
  CreateApiTokenDto,
  CreateApiTokenResponseDto,
  DeleteApiTokenParamsDto,
} from '@server/modules/auth/dto/api-token.dto'
import { HasLocalAuthResponseDto } from '@server/modules/auth/dto/hasLocalAuth.dto'
import { LoginDto, LoginResponseDto } from '@server/modules/auth/dto/login.dto'
import { ModifyPasswordDto } from '@server/modules/auth/dto/modify-password.dto'
import { RefreshTokenDto } from '@server/modules/auth/dto/refresh-token-dto'
import { RegisterDto } from '@server/modules/auth/dto/register.dto'
import { UpdateProfileDto } from '@server/modules/auth/dto/update-profile.dto'
import { UserResponseDto } from '@server/modules/user/dto/user.response.dto'
import { API } from '../types'

export interface IsAdminResponseDto {
  isAdmin: boolean
}

export type AuthAPIS = {
  PostLogin: API<undefined, typeof LoginDto, typeof LoginResponseDto>
  PostRegister: API<undefined, typeof RegisterDto, typeof UserResponseDto>
  GetInfo: API<undefined, undefined, typeof UserResponseDto>
  PatchProfile: API<undefined, typeof UpdateProfileDto, typeof UserResponseDto>
  PostModifyPassword: API<
    undefined,
    typeof ModifyPasswordDto,
    typeof UserResponseDto
  >
  PostRefreshToken: API<undefined, undefined, typeof RefreshTokenDto>
  GetHasLocalAuth: API<undefined, undefined, typeof HasLocalAuthResponseDto>
  GetIsAdmin: API<undefined, undefined, IsAdminResponseDto>
  PostLogout: API<undefined, undefined, null>
  GetApiTokens: API<undefined, undefined, ApiTokenResponseDto[]>
  PostApiToken: API<
    undefined,
    typeof CreateApiTokenDto,
    CreateApiTokenResponseDto
  >
  DeleteApiToken: API<DeleteApiTokenParamsDto, undefined, null>
}

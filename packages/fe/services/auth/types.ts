import { LoginDto } from '@server/modules/auth/dto/login.dto'
import { ModifyPasswordDto } from '@server/modules/auth/dto/modify-password.dto'
import { RegisterDto } from '@server/modules/auth/dto/register.dto'
import { UpdateProfileDto } from '@server/modules/auth/dto/update-profile.dto'
import { UserResponseDto } from '@server/modules/user/dto/user.response.dto'
import { API } from '../types'

export type AuthAPIS = {
  PostLogin: API<undefined, typeof LoginDto, typeof UserResponseDto>
  PostRegister: API<undefined, typeof RegisterDto, typeof UserResponseDto>
  GetInfo: API<undefined, undefined, typeof UserResponseDto>
  PatchProfile: API<undefined, typeof UpdateProfileDto, typeof UserResponseDto>
  PostModifyPassword: API<
    undefined,
    typeof ModifyPasswordDto,
    typeof UserResponseDto
  >
}

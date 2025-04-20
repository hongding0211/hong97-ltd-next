import {
  Avatar as AvatarComponent,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { UserResponseDto } from '@server/modules/user/dto/user.response.dto'
import { getCompressImage } from '@utils/oss'
import { UserRound } from 'lucide-react'
import React, { useMemo } from 'react'

interface IAvatar {
  user?: InstanceType<typeof UserResponseDto>
  borderWidth?: number
  className?: string
  width?: number
}

const COLOR_PALLETTE = [
  '#ffc800',
  '#f6992d',
  '#ed6a5a',
  '#a75a5a',
  '#60495a',
  '#4c7680',
  '#38a3a5',
  '#7dba60',
  '#c2d11b',
]

const getIdxFromString = (str: string) => {
  return (
    str.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0)
    }, 0) % COLOR_PALLETTE.length
  )
}

const Avatar: React.FC<IAvatar> = (props) => {
  const { user, className, borderWidth = 2, width = 36 } = props

  const subComponent = useMemo(() => {
    if (user?.profile.avatar) {
      return (
        <>
          <AvatarImage
            className="object-cover"
            src={getCompressImage(user.profile.avatar, width * 2)}
          />
          <AvatarFallback delayMs={300} className="animate-pulse">
            <div className="w-full h-full bg-neutral-200 dark:bg-neutral-800" />
          </AvatarFallback>
        </>
      )
    }

    if (user && !user.profile.avatar) {
      return (
        <div
          className={
            'w-full h-full flex items-center justify-center text-neutral-100 '
          }
          style={{
            fontSize: `${width * 0.5}px`,
            backgroundColor:
              COLOR_PALLETTE[getIdxFromString(user.profile.name)],
          }}
        >
          {user.profile.name.slice(0, 1).toUpperCase()}
        </div>
      )
    }

    return (
      <AvatarFallback delayMs={500}>
        <UserRound className="w-[60%] h-[60%]" />
      </AvatarFallback>
    )
  }, [user, width])

  return (
    <AvatarComponent
      className={cn(className, 'border-neutral-200 dark:border-neutral-800')}
      style={{
        width: `${width}px`,
        height: `${width}px`,
        borderWidth: `${borderWidth}px`,
      }}
    >
      {subComponent}
    </AvatarComponent>
  )
}

export default Avatar

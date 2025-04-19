import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { http } from '@services/http'
import { useAppStore } from '@stores/general'
import { uploadFile2Oss } from '@utils/oss'
import { time } from '@utils/time'
import { toast } from '@utils/toast'
import { enUS, zhCN } from 'date-fns/locale'
import {
  CalendarIcon,
  Check,
  Loader2,
  LogOut,
  Pencil,
  UserRound,
  X,
} from 'lucide-react'
import { GetStaticPropsContext } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import { useRouter } from 'next/router'
import React, { useEffect, useId, useState } from 'react'
import AppLayout from '../../components/app-layout/AppLayout'
import Avatar from '../../components/common/Avatar'

const ProfileItem: React.FC<{
  label: string
  value?: string
}> = ({ label, value }) => (
  <div className="flex flex-col gap-y-1.5">
    <span className="text-sm font-semibold text-neutral-500">{label}</span>
    <span className="text-base">{value || '-'}</span>
  </div>
)

const ProfileEditItem: React.FC<{
  label: string
  value?: string
  children: React.ReactNode
  badge?: string
}> = ({ label, children, badge }) => {
  return (
    <div className="flex flex-col gap-y-2.5">
      <div className="flex gap-x-2 items-center">
        <span className="text-sm font-semibold text-neutral-500">{label}</span>
        {badge && (
          <Badge className="relative px-1.5 py-0.5 text-[0.6rem]">
            {badge}
          </Badge>
        )}
      </div>
      {children}
    </div>
  )
}

export const Profile: React.FC = () => {
  const [uploadLoading, setUploadLoading] = useState(false)
  const [profileApplying, setProfileApplying] = useState(false)

  const [profileEditing, setProfileEditing] = useState(false)

  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [birthday, setBirthday] = useState<number | undefined>()
  const [bio, setBio] = useState('')

  const { locale } = useRouter()

  const { t } = useTranslation('profile')

  const router = useRouter()

  const uid = useId()

  const { user, isLoading, refresh, logout } = useAppStore((state) => ({
    user: state.user,
    isLoading: state.isLoading,
    refresh: state.refresh,
    logout: state.logout,
  }))

  const handleUploadAvatar = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.id = uid
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) {
        return
      }
      setUploadLoading(true)
      uploadFile2Oss(file)
        .then((p) => {
          if (!p) {
            return
          }
          return http.patch('PatchProfile', {
            avatar: p,
          })
        })
        .then((r) => {
          if (r.isSuccess) {
            toast('updateAvatarSuccess', {
              type: 'success',
            })
            refresh()
          } else {
            toast(r.msg)
          }
        })
        .finally(setUploadLoading.bind(null, false))
    }
    document.body.appendChild(input)
    input.click()
    document.body.removeChild(input)
  }

  const handleLogout = () => {
    logout()
  }

  const handleApplyEditing = () => {
    const _name = name.trim()
    if (!_name) {
      toast('nameRequired', {
        type: 'error',
      })
      return
    }
    setProfileApplying(true)
    http
      .patch('PatchProfile', {
        name: _name,
        gender,
        birthday: birthday || undefined,
        bio: bio.trim() || undefined,
      })
      .then((v) => {
        if (v.isSuccess) {
          toast('updateProfileSuccess', {
            type: 'success',
          })
          setProfileEditing(false)
          refresh()
        } else {
          toast(v.msg)
        }
      })
      .finally(setProfileApplying.bind(null, false))
  }

  const uploadAvatarButton = (
    <Button
      size="sm"
      variant="outline"
      className="w-full"
      onClick={handleUploadAvatar}
      disabled={uploadLoading || profileEditing}
    >
      {uploadLoading ? (
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
      ) : (
        <UserRound className="w-4 h-4" />
      )}
      {t('updateAvatar')}
    </Button>
  )

  const editProfileButton = (
    <Button
      size="sm"
      variant="outline"
      className="w-full"
      onClick={() => setProfileEditing(true)}
      disabled={uploadLoading || profileEditing}
    >
      <Pencil className="w-4 h-4" />
      {t('editProfile')}
    </Button>
  )

  const logoutButton = (
    <Button
      size="sm"
      variant="destructive"
      className="w-full"
      onClick={handleLogout}
      disabled={uploadLoading || profileEditing}
    >
      <LogOut className="w-4 h-4" />
      {t('logout')}
    </Button>
  )

  const applyEditingButton = (
    <Button
      size="sm"
      className="w-full"
      onClick={handleApplyEditing}
      disabled={profileApplying}
    >
      {profileApplying ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Check className="w-4 h-4" />
      )}
      {t('apply')}
    </Button>
  )

  const cancelEditingButton = (
    <Button
      size="sm"
      className="w-full"
      variant="outline"
      onClick={() => setProfileEditing(false)}
      disabled={profileApplying}
    >
      <X className="w-4 h-4" />
      {t('cancel')}
    </Button>
  )

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(
        `/sso/login?redirect=${encodeURIComponent(window.location.href)}`,
      )
    }
  }, [isLoading, router, user])

  useEffect(() => {
    setGender(user?.profile.gender || '')
    setBirthday(new Date(user?.profile.birthday).valueOf())
    setBio(user?.profile.bio || '')
    setName(user?.profile.name || '')
  }, [user])

  return (
    <>
      <Head>
        <title>{t('title')}</title>
      </Head>
      <AppLayout>
        {/* 桌面端 */}
        <div className="max-w-[600px] mx-auto justify-between hidden md:flex mt-[40px]">
          <div className="flex flex-col items-center">
            <Avatar user={user} className="mb-8" width={240} />
            <div className="text-2xl font-semibold">@{user?.profile.name}</div>
            <div className="text-[0.7rem] mt-1.5 text-neutral-500">
              #{user?.userId}
            </div>
            <div className="flex flex-col w-full gap-y-4 mt-8">
              {uploadAvatarButton}
              {editProfileButton}
              {logoutButton}
            </div>
          </div>
          <div className="flex flex-col gap-y-6 ml-24 lg:ml-32 mt-4 w-full">
            {profileEditing ? (
              <>
                <div className="w-[320px]">
                  <ProfileEditItem label={t('name')} badge={t('required')}>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('name')}
                    />
                  </ProfileEditItem>
                </div>
                <div className="w-[320px]">
                  <ProfileEditItem
                    label={t('gender')}
                    value={user?.profile.gender}
                  >
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('gender')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="male">
                            {t('genderEnum.male')}
                          </SelectItem>
                          <SelectItem value="female">
                            {t('genderEnum.female')}
                          </SelectItem>
                          <SelectItem value="other">
                            {t('genderEnum.other')}
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </ProfileEditItem>
                </div>
                <div className="w-[320px]">
                  <ProfileEditItem label={t('birthday')}>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !birthday && 'text-muted-foreground',
                          )}
                        >
                          <CalendarIcon />
                          {birthday ? (
                            time.format(birthday)
                          ) : (
                            <span>{t('birthday')}</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        avoidCollisions={false}
                        className="flex w-auto flex-col space-y-2 p-2"
                      >
                        <div className="rounded-md border">
                          <Calendar
                            mode="single"
                            selected={new Date(birthday ?? Date.now())}
                            onSelect={(v) => setBirthday(v.valueOf())}
                            locale={locale === 'cn' ? zhCN : enUS}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </ProfileEditItem>
                </div>
                <div className="w-[320px]">
                  <ProfileEditItem label={t('bio')}>
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="resize-none w-full text-sm"
                      placeholder={t('emptyBio')}
                      rows={6}
                    />
                  </ProfileEditItem>
                </div>
                <div className="flex flex-col gap-y-2.5">
                  {applyEditingButton}
                  {cancelEditingButton}
                </div>
              </>
            ) : (
              <>
                <ProfileItem
                  label={t('gender')}
                  value={
                    user?.profile.gender
                      ? t(`genderEnum.${user?.profile.gender}`)
                      : ''
                  }
                />
                <ProfileItem
                  label={t('birthday')}
                  value={
                    user?.profile?.birthday
                      ? time.format(user?.profile?.birthday)
                      : ''
                  }
                />
                <ProfileItem label={t('bio')} value={user?.profile.bio} />
              </>
            )}
          </div>
        </div>

        {/* 移动端 */}
        <div className="flex mx-8 mt-8 flex-col items-center md:hidden">
          <Avatar user={user} className="mb-8" width={180} />
          <div className="text-2xl font-semibold">@{user?.profile.name}</div>
          <div className="text-[0.7rem] mt-1.5 truncate text-neutral-500">
            #{user?.userId}
          </div>
          <div className="flex flex-col w-full gap-y-6 mt-12">
            <div className="grid grid-cols-2 gap-4">
              {profileEditing ? (
                <>
                  <div className="col-span-2">
                    <ProfileEditItem label={t('name')} badge={t('required')}>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('name')}
                      />
                    </ProfileEditItem>
                  </div>
                  <div className="col-span-2">
                    <ProfileEditItem
                      label={t('gender')}
                      value={user?.profile.gender}
                    >
                      <Select value={gender} onValueChange={setGender}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t('gender')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="male">
                              {t('genderEnum.male')}
                            </SelectItem>
                            <SelectItem value="female">
                              {t('genderEnum.female')}
                            </SelectItem>
                            <SelectItem value="other">
                              {t('genderEnum.other')}
                            </SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </ProfileEditItem>
                  </div>
                  <div className="col-span-2">
                    <ProfileEditItem label={t('birthday')}>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !birthday && 'text-muted-foreground',
                            )}
                          >
                            <CalendarIcon />
                            {birthday ? (
                              time.format(birthday)
                            ) : (
                              <span>{t('birthday')}</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          avoidCollisions={false}
                          className="flex w-auto flex-col space-y-2 p-2"
                        >
                          <div className="rounded-md border">
                            <Calendar
                              mode="single"
                              selected={new Date(birthday ?? Date.now())}
                              onSelect={(v) => setBirthday(v.valueOf())}
                              locale={locale === 'cn' ? zhCN : enUS}
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                    </ProfileEditItem>
                  </div>
                  <div className="col-span-2">
                    <ProfileEditItem label={t('bio')}>
                      <Textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="resize-none w-full text-sm"
                        placeholder={t('emptyBio')}
                      />
                    </ProfileEditItem>
                  </div>
                </>
              ) : (
                <>
                  <ProfileItem
                    label={t('gender')}
                    value={
                      user?.profile.gender
                        ? t(`genderEnum.${user?.profile.gender}`)
                        : ''
                    }
                  />
                  <ProfileItem
                    label={t('birthday')}
                    value={
                      user?.profile?.birthday
                        ? time.format(user?.profile?.birthday)
                        : ''
                    }
                  />
                  <div className="col-span-2">
                    <ProfileItem label={t('bio')} value={user?.profile.bio} />
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col w-full gap-y-4 mt-8">
            {profileEditing ? (
              <>
                {applyEditingButton}
                {cancelEditingButton}
              </>
            ) : (
              <>
                {uploadAvatarButton}
                {editProfileButton}
                {logoutButton}
              </>
            )}
          </div>
        </div>
      </AppLayout>
    </>
  )
}

export default Profile

export async function getStaticProps(context: GetStaticPropsContext) {
  const { locale = 'cn' } = context

  http.setLocale(locale)
  time.setLocal(locale)

  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'profile', 'toast'])),
    },
  }
}

'use client'

import React, { useEffect, useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { http } from '@services/http'
import { useAppStore } from '@stores/general'
import { toast } from '@utils/toast'
import { AlertCircle, Ban, Check, Eye, EyeClosed, Loader2 } from 'lucide-react'
import { useTranslation } from 'next-i18next'
import { InputWithLabel } from '../common/input-with-label'

const Form: React.FC<{
  oldPassword: string
  newPassword: string
  setOldPassword: (value: string) => void
  setNewPassword: (value: string) => void
  disabled?: boolean
  onKeyApply?: () => void
}> = (props) => {
  const {
    oldPassword,
    newPassword,
    setOldPassword,
    setNewPassword,
    disabled,
    onKeyApply,
  } = props

  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  const OldPasswordRight = showOldPassword ? Eye : EyeClosed
  const NewPasswordRight = showNewPassword ? Eye : EyeClosed

  const { t } = useTranslation('profile')

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') {
      return
    }
    onKeyApply?.()
  }

  return (
    <>
      <div className="flex flex-col gap-y-6 pb-4">
        <InputWithLabel
          value={oldPassword}
          onInput={(e) => setOldPassword(e.currentTarget.value)}
          label={t('oldPassword')}
          type={showOldPassword ? 'text' : 'password'}
          placeholder={t('oldPassword') + ''}
          disabled={disabled}
          onKeyDown={handleKeyDown}
          right={
            disabled ? null : (
              <div
                className="cursor-pointer p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700"
                onClick={setShowOldPassword.bind(null, !showOldPassword)}
              >
                <OldPasswordRight className="h-4 w-4" />
              </div>
            )
          }
          autoComplete="current-password"
        />
        <InputWithLabel
          value={newPassword}
          onInput={(e) => setNewPassword(e.currentTarget.value)}
          label={t('newPassword')}
          type={showNewPassword ? 'text' : 'password'}
          placeholder={t('newPassword') + ''}
          disabled={disabled}
          onKeyDown={handleKeyDown}
          right={
            disabled ? null : (
              <div
                className="cursor-pointer p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700"
                onClick={setShowNewPassword.bind(null, !showNewPassword)}
              >
                <NewPasswordRight className="h-4 w-4" />
              </div>
            )
          }
          autoComplete="new-password"
        />
      </div>
    </>
  )
}

const ModifyPassword: React.FC<{
  show: boolean
  onShowChange?: (show: boolean) => void
}> = (props) => {
  const { show, onShowChange } = props

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const [alertMsg, setAlertMsg] = useState('')

  const [loading, setLoading] = useState(false)

  const { refresh } = useAppStore((state) => ({
    refresh: state.refresh,
  }))

  const { t } = useTranslation('profile')
  const { t: tCommon } = useTranslation('common')

  const isDesktop =
    typeof window !== 'undefined' &&
    window.matchMedia('(min-width: 768px)').matches

  const handleApply = async () => {
    if (!oldPassword || !newPassword) {
      setAlertMsg('oldOrNewPasswordRequired')
      return
    }

    setLoading(true)
    try {
      const res = await http.post('PostModifyPassword', {
        originalPassword: oldPassword,
        newPassword,
      })
      if (res.isSuccess) {
        toast(t('modifyPasswordSuccess'), {
          type: 'success',
        })
        onShowChange?.(false)
        refresh()
      } else {
        toast(t(res.msg), {
          type: 'error',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    return () => {
      setOldPassword('')
      setNewPassword('')
      setAlertMsg('')
    }
  }, [])

  if (isDesktop) {
    return (
      <Dialog open={show} onOpenChange={onShowChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('changePassword')}</DialogTitle>
          </DialogHeader>
          {!!alertMsg && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{tCommon('error')}</AlertTitle>
              <AlertDescription>{t(alertMsg)}</AlertDescription>
            </Alert>
          )}
          <div className="pt-4">
            <Form
              oldPassword={oldPassword}
              newPassword={newPassword}
              setOldPassword={setOldPassword}
              setNewPassword={setNewPassword}
              disabled={loading}
              onKeyApply={handleApply}
            />
          </div>
          <div className="grid mt-2 grid-cols-2 gap-x-2">
            <DrawerClose asChild>
              <Button variant="outline" disabled={loading}>
                <Ban className="w-4 h-4" />
                {t('cancel')}
              </Button>
            </DrawerClose>
            <Button disabled={loading} onClick={handleApply}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {t('apply')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={show} onOpenChange={onShowChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{t('changePassword')}</DrawerTitle>
        </DrawerHeader>
        {!!alertMsg && (
          <div className="px-4 pt-1">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{tCommon('error')}</AlertTitle>
              <AlertDescription>{t(alertMsg)}</AlertDescription>
            </Alert>
          </div>
        )}
        <div className="py-6 pt-4 px-4">
          <Form
            oldPassword={oldPassword}
            newPassword={newPassword}
            setOldPassword={setOldPassword}
            setNewPassword={setNewPassword}
            disabled={loading}
            onKeyApply={handleApply}
          />
        </div>
        <DrawerFooter className="pt-2">
          <div className="grid grid-cols-2 gap-x-2">
            <DrawerClose asChild>
              <Button variant="outline" disabled={loading}>
                <Ban className="w-4 h-4" />
                {t('cancel')}
              </Button>
            </DrawerClose>
            <Button disabled={loading} onClick={handleApply}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {t('apply')}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

export default ModifyPassword

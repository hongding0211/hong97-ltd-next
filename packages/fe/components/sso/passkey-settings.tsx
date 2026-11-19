import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import type { Passkey } from '@services/sso/passkeys'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'next-i18next'
import { useEffect, useRef, useState } from 'react'

type PasskeySettingsProps = {
  show: boolean
  onShowChange: (show: boolean) => void
  passkeys: Passkey[]
  busy: boolean
  onRevoke: (id: string) => Promise<boolean>
}

export function PasskeySettings({
  show,
  onShowChange,
  passkeys,
  busy,
  onRevoke,
}: PasskeySettingsProps) {
  const { t, i18n } = useTranslation('passkeys')
  const [selectedId, setSelectedId] = useState('')
  const [confirming, setConfirming] = useState(false)
  const cancelButton = useRef<HTMLButtonElement>(null)
  const selected = passkeys.find(({ id }) => id === selectedId) || passkeys[0]
  const isDesktop =
    typeof window !== 'undefined' &&
    window.matchMedia('(min-width: 768px)').matches

  useEffect(() => {
    if (confirming) cancelButton.current?.focus()
  }, [confirming])

  const onOpenChange = (open: boolean) => {
    if (busy) return
    if (!open) setConfirming(false)
    onShowChange(open)
  }

  const revoke = async () => {
    if (await onRevoke(selected.id)) {
      setConfirming(false)
      onShowChange(false)
    }
  }

  const dateFormat = new Intl.DateTimeFormat(
    i18n.language === 'cn' ? 'zh-CN' : i18n.language,
    {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    },
  )
  const details = (passkey: Passkey) => (
    <span className="block min-w-0 space-y-1">
      <span className="block text-sm font-medium">
        {[passkey.device, passkey.browser].filter(Boolean).join(' · ') ||
          t('unknownSource')}
      </span>
      <span className="block text-xs text-neutral-500">
        <time dateTime={passkey.createdAt}>
          {dateFormat.format(new Date(passkey.createdAt))}
        </time>
      </span>
    </span>
  )

  const body = (
    <div className="min-h-0 overflow-y-auto py-3">
      {confirming || passkeys.length === 1 ? (
        details(selected)
      ) : (
        <fieldset className="divide-y">
          <legend className="sr-only">{t('chooseToRevoke')}</legend>
          {passkeys.map((passkey) => (
            <label key={passkey.id} className="flex items-center gap-3 py-3">
              <input
                type="radio"
                name="passkey-to-revoke"
                checked={passkey.id === selected.id}
                onChange={() => setSelectedId(passkey.id)}
              />
              {details(passkey)}
            </label>
          ))}
        </fieldset>
      )}
    </div>
  )

  const actions = (
    <div className="grid grid-cols-2 gap-2">
      <Button
        ref={cancelButton}
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => {
          if (confirming) setConfirming(false)
          else onOpenChange(false)
        }}
      >
        {t(confirming ? 'cancel' : 'close')}
      </Button>
      <Button
        type="button"
        variant="destructive"
        disabled={busy}
        onClick={() => {
          if (confirming) void revoke()
          else setConfirming(true)
        }}
      >
        {busy && (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        )}
        {t('remove')}
      </Button>
    </div>
  )

  const title = t(confirming ? 'removeTitle' : 'title')
  const description = t(confirming ? 'removeDescription' : 'manageDescription')
  const descriptionClass = confirming ? undefined : 'sr-only'

  if (isDesktop) {
    return (
      <Dialog open={show} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className={descriptionClass}>
              {description}
            </DialogDescription>
          </DialogHeader>
          {body}
          {actions}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={show} onOpenChange={onOpenChange} dismissible={!busy}>
      <DrawerContent className="max-h-[85dvh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription className={descriptionClass}>
            {description}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex min-h-0 flex-col px-4 pb-2">{body}</div>
        <DrawerFooter>{actions}</DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

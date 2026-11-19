import {
  type Passkey,
  PasskeyRequestError,
  createPasskey,
  isPasskeyCancelled,
  listPasskeys,
  passkeyCreationError,
  removePasskey,
  supportsSsoPasskeys,
} from '@services/sso/passkeys'
import { toast } from '@utils/toast'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'

export function useProfilePasskeys(userId?: string) {
  const { t } = useTranslation('passkeys')
  const [binding, setBinding] = useState<{
    userId: string
    passkeys: Passkey[]
  }>()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!userId || !supportsSsoPasskeys()) return

    const controller = new AbortController()
    listPasskeys(controller.signal)
      .then((passkeys) => {
        if (!controller.signal.aborted) setBinding({ userId, passkeys })
      })
      .catch(() => {
        if (!controller.signal.aborted)
          toast(t('loadFailed'), { type: 'error' })
      })
    return () => controller.abort()
  }, [t, userId])

  const update = (passkeys: Passkey[]) => {
    setBinding((current) =>
      current && current.userId === userId ? { ...current, passkeys } : current,
    )
  }

  const create = async () => {
    if (busy) return
    setBusy(true)
    try {
      update([await createPasskey()])
      toast(t('created'), { type: 'success' })
    } catch (error) {
      if (error instanceof PasskeyRequestError && error.status === 409) {
        toast(t('alreadyBound'), { type: 'error' })
        await listPasskeys()
          .then(update)
          .catch(() => undefined)
      } else if (!isPasskeyCancelled(error)) {
        toast(t(passkeyCreationError(error)), { type: 'error' })
      }
    } finally {
      setBusy(false)
    }
  }

  const revoke = async (id: string) => {
    if (busy) return false
    setBusy(true)
    try {
      update(await removePasskey(id))
      toast(t('revoked'), { type: 'success' })
      return true
    } catch {
      toast(t('removeFailed'), { type: 'error' })
      return false
    } finally {
      setBusy(false)
    }
  }

  return {
    passkeys: binding?.userId === userId ? binding?.passkeys : undefined,
    busy,
    create,
    revoke,
  }
}

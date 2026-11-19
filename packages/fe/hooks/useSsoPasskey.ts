import {
  type PasskeyLogin,
  PasskeyVerificationError,
  authenticateWithPasskey,
  supportsSsoPasskeys,
} from '@services/sso/passkeys'
import { browserSupportsWebAuthnAutofill } from '@simplewebauthn/browser'
import { useCallback, useEffect, useRef, useState } from 'react'

export function useSsoPasskey(
  enabled: boolean,
  redirect: string,
  completeLogin: (result: PasskeyLogin) => void,
) {
  const [supported, setSupported] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const active = useRef<AbortController | null>(null)

  useEffect(() => setSupported(supportsSsoPasskeys()), [])

  const clearError = useCallback(() => setFailed(false), [])

  const cancel = useCallback(() => {
    if (!active.current) return
    active.current.abort()
    active.current = null
    setBusy(false)
  }, [])

  const start = useCallback(
    async (autofill: boolean) => {
      if (!enabled || !supportsSsoPasskeys() || (autofill && active.current))
        return

      cancel()
      const controller = new AbortController()
      active.current = controller
      if (!autofill) {
        setBusy(true)
        setFailed(false)
      }
      try {
        if (
          autofill &&
          (!(await browserSupportsWebAuthnAutofill()) ||
            controller.signal.aborted)
        ) {
          return
        }
        const session = await authenticateWithPasskey(
          autofill,
          redirect,
          controller.signal,
        )
        if (!controller.signal.aborted) completeLogin(session)
      } catch (error) {
        if (controller.signal.aborted) return
        if (
          error instanceof PasskeyVerificationError ||
          (!autofill &&
            !(error instanceof Error && error.name === 'AbortError'))
        ) {
          setFailed(true)
        }
      } finally {
        if (active.current === controller) {
          active.current = null
          if (!autofill) setBusy(false)
        }
      }
    },
    [cancel, completeLogin, enabled, redirect],
  )

  useEffect(() => {
    if (!enabled) cancel()
  }, [cancel, enabled])

  useEffect(() => cancel, [cancel])

  return {
    supported,
    busy,
    failed,
    clearError,
    cancel,
    start: () => start(false),
    startAutofill: () => start(true),
  }
}

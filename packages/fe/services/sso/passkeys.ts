import type { LoginResponseDto } from '@server/modules/auth/dto/login.dto'
import {
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  WebAuthnAbortService,
  base64URLStringToBuffer,
  browserSupportsWebAuthn,
  bufferToBase64URLString,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser'

export type Passkey = {
  id: string
  createdAt: string
  device?: string
  browser?: string
}
export type PasskeyLogin = LoginResponseDto & { destination?: string }

export class PasskeyVerificationError extends Error {}

export class PasskeyTimeoutError extends Error {}

export class PasskeyRequestError extends Error {
  constructor(readonly status: number) {
    super(`Passkey request failed (${status})`)
  }
}

export function supportsSsoPasskeys() {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    /\b(?:Macintosh|iPhone|iPad|iPod)\b/i.test(window.navigator.userAgent) &&
    browserSupportsWebAuthn()
  )
}

async function request<T>(path = '', init?: RequestInit): Promise<T> {
  const caller = init?.signal
  if (caller?.aborted) throw caller.reason

  const controller = new AbortController()
  const abort = () => controller.abort(caller?.reason)
  caller?.addEventListener('abort', abort, { once: true })
  const timeout = window.setTimeout(
    () => controller.abort(new PasskeyTimeoutError()),
    10_000,
  )
  try {
    const response = await fetch(`/api/auth/passkeys${path}`, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok) throw new PasskeyRequestError(response.status)
    const result: { isSuccess: boolean; data: T } = await response.json()
    if (!result.isSuccess) throw new Error('Passkey request failed')
    return result.data
  } catch (error) {
    if (controller.signal.aborted) throw controller.signal.reason
    throw error
  } finally {
    window.clearTimeout(timeout)
    caller?.removeEventListener('abort', abort)
  }
}

async function runPasskeyPrompt<T>(
  start: () => Promise<T>,
  signal?: AbortSignal,
) {
  if (signal?.aborted) throw signal.reason

  let timeout: number
  let abort: () => void
  const interrupted = new Promise<never>((_, reject) => {
    const stop = (reason: unknown) => {
      reject(reason)
      WebAuthnAbortService.cancelCeremony()
    }
    abort = () => stop(signal?.reason)
    signal?.addEventListener('abort', abort, { once: true })
    timeout = window.setTimeout(() => stop(new PasskeyTimeoutError()), 60_000)
  })
  try {
    return await Promise.race([start(), interrupted])
  } finally {
    window.clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}

async function getAutofillAssertion(
  options: PublicKeyCredentialRequestOptionsJSON,
  signal: AbortSignal,
): Promise<AuthenticationResponseJSON> {
  // Own the conditional request's signal so an explicit prompt can cancel it
  // without depending on the library's shared prompt controller.
  const credential = (await navigator.credentials.get({
    publicKey: {
      rpId: options.rpId,
      challenge: base64URLStringToBuffer(options.challenge),
      userVerification: options.userVerification,
      timeout: options.timeout,
      allowCredentials: [],
    },
    mediation: 'conditional',
    signal,
  })) as PublicKeyCredential | null
  if (!credential) throw new Error('No passkey was selected')

  const response = credential.response as AuthenticatorAssertionResponse
  return {
    id: credential.id,
    rawId: bufferToBase64URLString(credential.rawId),
    type: 'public-key',
    response: {
      authenticatorData: bufferToBase64URLString(response.authenticatorData),
      clientDataJSON: bufferToBase64URLString(response.clientDataJSON),
      signature: bufferToBase64URLString(response.signature),
      userHandle: response.userHandle
        ? bufferToBase64URLString(response.userHandle)
        : undefined,
    },
    clientExtensionResults: credential.getClientExtensionResults(),
  }
}

function post(body?: unknown, signal?: AbortSignal): RequestInit {
  return {
    method: 'POST',
    signal,
    ...(body === undefined
      ? {}
      : {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
  }
}

export const listPasskeys = (signal?: AbortSignal) =>
  request<Passkey[]>('', { signal })

export const removePasskey = (id: string) =>
  request<Passkey[]>(`/${encodeURIComponent(id)}`, { method: 'DELETE' })

export async function claimPasskeyInvite() {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 1500)
  try {
    const { show } = await request<{ show: boolean }>(
      '/invite',
      post(undefined, controller.signal),
    )
    return show
  } catch {
    return false
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function createPasskey() {
  const options = await request<PublicKeyCredentialCreationOptionsJSON>(
    '/register/options',
    post(),
  )
  const response = await runPasskeyPrompt(() =>
    startRegistration({ optionsJSON: options }),
  )
  return request<Passkey>(
    '/register/verify',
    post({
      challenge: options.challenge,
      response,
      touchDevice: navigator.maxTouchPoints > 1,
    }),
  )
}

export async function authenticateWithPasskey(
  useBrowserAutofill: boolean,
  redirect: string,
  signal: AbortSignal,
) {
  const options = await request<PublicKeyCredentialRequestOptionsJSON>(
    '/authenticate/options',
    post(undefined, signal),
  )
  if (signal.aborted) throw signal.reason

  const response = useBrowserAutofill
    ? await getAutofillAssertion(options, signal)
    : await runPasskeyPrompt(
        () => startAuthentication({ optionsJSON: options }),
        signal,
      )
  if (signal.aborted) throw signal.reason

  try {
    return await request<PasskeyLogin>(
      '/authenticate/verify',
      post(
        {
          challenge: options.challenge,
          redirect: redirect || undefined,
          response,
        },
        signal,
      ),
    )
  } catch {
    throw new PasskeyVerificationError()
  }
}

export function isPasskeyCancelled(error: unknown) {
  return (
    error instanceof Error &&
    ['AbortError', 'NotAllowedError'].includes(error.name)
  )
}

export function passkeyCreationError(error: unknown) {
  if (error instanceof PasskeyTimeoutError) return 'createTimeout'
  if (error instanceof Error && error.name === 'InvalidStateError')
    return 'createStalePasskey'
  return 'createFailed'
}

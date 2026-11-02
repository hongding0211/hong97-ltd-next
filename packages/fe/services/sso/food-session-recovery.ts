const RECOVERY_KEY = 'canieat_session_return_at'
const RECOVERY_COOLDOWN_MS = 60_000

export function getFoodSessionReturnPath(redirect: string, origin: string) {
  try {
    const url = new URL(redirect, origin)
    if (
      url.origin !== origin ||
      !['/mucaa/food', '/mucaa/food/'].includes(url.pathname)
    ) {
      return undefined
    }
    url.searchParams.delete('token')
    url.searchParams.delete('password')
    return `/mucaa/food/${url.search}`
  } catch {
    return undefined
  }
}

// A restored SSO identity should not leave CanIEat on the login form. Verify
// the gateway in a same-origin request before returning, and bound retries in
// case a browser still fails to retain/send its session cookies on navigation.
export async function recoverFoodSession({
  redirect,
  origin,
  fetch,
  storage,
  replace,
  signal,
  now = Date.now(),
}: {
  redirect: string
  origin: string
  fetch: typeof window.fetch
  storage: Pick<Storage, 'getItem' | 'setItem'>
  replace: (path: string) => void
  signal: AbortSignal
  now?: number
}) {
  const returnPath = getFoodSessionReturnPath(redirect, origin)
  if (!returnPath || signal.aborted) return false
  try {
    const previous = Number(storage.getItem(RECOVERY_KEY))
    if (previous && now - previous < RECOVERY_COOLDOWN_MS) return false
    const response = await fetch('/mucaa/food/api/health', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal,
    })
    if (signal.aborted || ![200, 403].includes(response.status)) return false
    storage.setItem(RECOVERY_KEY, String(now))
    replace(returnPath)
    return true
  } catch {
    return false
  }
}

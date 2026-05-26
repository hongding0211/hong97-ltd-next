export type SourcePrivacyLink = {
  href: string
  labelKey: string
}

export type SsoSourceConfig = {
  hideNavBar: boolean
  hideLogout: boolean
  stayOnAccountDeleted: boolean
  privacyLink?: SourcePrivacyLink
}

const DEFAULT_SOURCE_CONFIG: SsoSourceConfig = {
  hideNavBar: false,
  hideLogout: false,
  stayOnAccountDeleted: false,
}

const SOURCE_CONFIGS: Partial<Record<string, SsoSourceConfig>> = {
  walkcalc: {
    hideNavBar: true,
    hideLogout: true,
    stayOnAccountDeleted: true,
    privacyLink: {
      href: '/privacy/walkcalc',
      labelKey: 'walkcalcPrivacyPolicy',
    },
  },
}

export const readSsoSourceQuery = (source: string | string[] | undefined) => {
  if (typeof source === 'string') {
    return source
  }
  if (Array.isArray(source)) {
    return source[0] ?? ''
  }
  if (typeof window === 'undefined') {
    return ''
  }

  return new URLSearchParams(window.location.search).get('source') ?? ''
}

export const resolveSsoSourceConfig = (source: string): SsoSourceConfig => {
  return SOURCE_CONFIGS[source] ?? DEFAULT_SOURCE_CONFIG
}

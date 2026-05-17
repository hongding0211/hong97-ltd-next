import { registerAs } from '@nestjs/config'

export type PushProviderName = 'apns'
export type PushPlatform = 'ios'
export type PushEnvironment = 'sandbox' | 'production'

export interface ApnsTokenCredentialConfig {
  credentialRef: string
  authType: 'token'
  teamId: string
  keyId: string
  privateKey?: string
  privateKeyPath?: string
}

export interface ApnsCertificateCredentialConfig {
  credentialRef: string
  authType: 'certificate'
  certificatePath: string
  certificateKeyPath: string
}

export type ApnsCredentialConfig =
  | ApnsTokenCredentialConfig
  | ApnsCertificateCredentialConfig

export interface PushAppConfig {
  appId: string
  platform: PushPlatform
  provider: PushProviderName
  topic: string
  environment: PushEnvironment
  credentialRef: string
  supportedLocales: string[]
  defaultLocale: string
}

export interface PushConfig {
  apps: PushAppConfig[]
  apnsCredentials: Record<string, ApnsCredentialConfig>
}

interface RawPushAppConfig {
  appId?: string
  platform?: string
  provider?: string
  topic?: string
  bundleId?: string
  environment?: string
  credentialRef?: string
  supportedLocales?: string[]
  defaultLocale?: string
}

const VALID_ENVIRONMENTS = new Set<PushEnvironment>(['sandbox', 'production'])

function envKey(ref: string, suffix: string) {
  return `PUSH_APNS_${ref
    .replace(/[^a-zA-Z0-9]/g, '_')
    .toUpperCase()}_${suffix}`
}

function parseAppsJson(value?: string): RawPushAppConfig[] {
  if (!value) {
    return []
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch (error) {
    throw new Error(`Invalid PUSH_APPS_JSON: ${(error as Error).message}`)
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Invalid PUSH_APPS_JSON: expected an array')
  }

  return parsed as RawPushAppConfig[]
}

function normalizeLocale(locale?: string) {
  return locale?.trim().toLowerCase()
}

function normalizeAppConfig(raw: RawPushAppConfig): PushAppConfig {
  const topic = raw.topic || raw.bundleId
  const supportedLocales = (raw.supportedLocales || [])
    .map(normalizeLocale)
    .filter(Boolean) as string[]
  const defaultLocale = normalizeLocale(raw.defaultLocale)

  if (!raw.appId) {
    throw new Error('Invalid push app config: appId is required')
  }
  if (raw.platform !== 'ios') {
    throw new Error(
      `Invalid push app config for ${raw.appId}: platform must be ios`,
    )
  }
  if (raw.provider !== 'apns') {
    throw new Error(
      `Invalid push app config for ${raw.appId}: provider must be apns`,
    )
  }
  if (!topic) {
    throw new Error(
      `Invalid push app config for ${raw.appId}: topic or bundleId is required`,
    )
  }
  if (!raw.credentialRef) {
    throw new Error(
      `Invalid push app config for ${raw.appId}: credentialRef is required`,
    )
  }
  if (!VALID_ENVIRONMENTS.has(raw.environment as PushEnvironment)) {
    throw new Error(
      `Invalid push app config for ${raw.appId}: environment must be sandbox or production`,
    )
  }
  if (!defaultLocale) {
    throw new Error(
      `Invalid push app config for ${raw.appId}: defaultLocale is required`,
    )
  }

  const locales = supportedLocales.length ? supportedLocales : [defaultLocale]
  if (!locales.includes(defaultLocale)) {
    throw new Error(
      `Invalid push app config for ${raw.appId}: defaultLocale must be supported`,
    )
  }

  return {
    appId: raw.appId,
    platform: 'ios',
    provider: 'apns',
    topic,
    environment: raw.environment as PushEnvironment,
    credentialRef: raw.credentialRef,
    supportedLocales: locales,
    defaultLocale,
  }
}

function loadApnsCredential(credentialRef: string): ApnsCredentialConfig {
  const teamId = process.env[envKey(credentialRef, 'TEAM_ID')]
  const keyId = process.env[envKey(credentialRef, 'KEY_ID')]
  const privateKey = process.env[envKey(credentialRef, 'PRIVATE_KEY')]
  const privateKeyPath = process.env[envKey(credentialRef, 'PRIVATE_KEY_PATH')]
  const certificatePath = process.env[envKey(credentialRef, 'CERT_PATH')]
  const certificateKeyPath = process.env[envKey(credentialRef, 'CERT_KEY_PATH')]

  if (certificatePath || certificateKeyPath) {
    if (!certificatePath) {
      throw new Error(
        `Missing APNs certificate path for credential ${credentialRef}`,
      )
    }
    if (!certificateKeyPath) {
      throw new Error(
        `Missing APNs certificate key path for credential ${credentialRef}`,
      )
    }

    return {
      credentialRef,
      authType: 'certificate',
      certificatePath,
      certificateKeyPath,
    }
  }

  if (!teamId) {
    throw new Error(`Missing APNs team ID for credential ${credentialRef}`)
  }
  if (!keyId) {
    throw new Error(`Missing APNs key ID for credential ${credentialRef}`)
  }
  if (!privateKey && !privateKeyPath) {
    throw new Error(
      `Missing APNs private key or private key path for credential ${credentialRef}`,
    )
  }

  return {
    credentialRef,
    authType: 'token',
    teamId,
    keyId,
    privateKey,
    privateKeyPath,
  }
}

export function loadPushConfig(): PushConfig {
  const apps = parseAppsJson(process.env.PUSH_APPS_JSON).map(normalizeAppConfig)
  const credentialRefs = [...new Set(apps.map((app) => app.credentialRef))]
  const apnsCredentials: Record<string, ApnsCredentialConfig> = {}
  for (const credentialRef of credentialRefs) {
    apnsCredentials[credentialRef] = loadApnsCredential(credentialRef)
  }

  return {
    apps,
    apnsCredentials,
  }
}

export default registerAs('push', loadPushConfig)

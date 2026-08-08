import { registerAs } from '@nestjs/config'

const DEFAULT_VIEW_DEDUP_TTL_SECONDS = 10 * 60
const DEFAULT_VISITOR_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60

function positiveSeconds(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export default registerAs('blog', () => ({
  viewDedupTtlMs:
    positiveSeconds(
      process.env.BLOG_VIEW_DEDUP_TTL_SECONDS,
      DEFAULT_VIEW_DEDUP_TTL_SECONDS,
    ) * 1000,
  visitorCookieName:
    process.env.BLOG_VIEW_VISITOR_COOKIE_NAME || 'blogVisitorId',
  visitorCookieMaxAgeMs:
    positiveSeconds(
      process.env.BLOG_VIEW_VISITOR_COOKIE_MAX_AGE_SECONDS,
      DEFAULT_VISITOR_COOKIE_MAX_AGE_SECONDS,
    ) * 1000,
  identitySecret:
    process.env.BLOG_VIEW_IDENTITY_SECRET ||
    process.env.JWT_SECRET ||
    'local-blog-view-identity-secret',
}))

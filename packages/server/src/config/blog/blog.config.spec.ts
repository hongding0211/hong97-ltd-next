import blogConfig from './blog.config'

describe('blog config', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.BLOG_VIEW_DEDUP_TTL_SECONDS
    delete process.env.BLOG_VIEW_VISITOR_COOKIE_MAX_AGE_SECONDS
    delete process.env.BLOG_VIEW_VISITOR_COOKIE_NAME
    delete process.env.BLOG_VIEW_IDENTITY_SECRET
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('uses a ten-minute view deduplication window by default', () => {
    expect(blogConfig()).toMatchObject({
      viewDedupTtlMs: 600_000,
      visitorCookieName: 'blogVisitorId',
    })
  })

  it('allows the view deduplication window to be configured in seconds', () => {
    process.env.BLOG_VIEW_DEDUP_TTL_SECONDS = '90'

    expect(blogConfig().viewDedupTtlMs).toBe(90_000)
  })
})

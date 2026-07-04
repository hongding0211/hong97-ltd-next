import { CustomThrottleGuard } from './throttle'

class TestThrottleGuard extends CustomThrottleGuard {
  readTracker(req: Record<string, any>) {
    return this.getTracker(req)
  }
}

describe('CustomThrottleGuard', () => {
  const guard = new TestThrottleGuard({} as any, {} as any, {} as any)

  it('uses authenticated user id before IP headers', async () => {
    await expect(
      guard.readTracker({
        user: { id: 'user-1' },
        headers: { 'x-forwarded-for': '203.0.113.1' },
        ip: '127.0.0.1',
      }),
    ).resolves.toBe('user-1')
  })

  it('reads lowercase x-real-ip from Express headers', async () => {
    await expect(
      guard.readTracker({
        headers: { 'x-real-ip': '203.0.113.2' },
        ip: '127.0.0.1',
      }),
    ).resolves.toBe('203.0.113.2')
  })

  it('uses the first x-forwarded-for address', async () => {
    await expect(
      guard.readTracker({
        headers: { 'x-forwarded-for': '203.0.113.3, 10.0.0.1' },
        ip: '127.0.0.1',
      }),
    ).resolves.toBe('203.0.113.3')
  })
})

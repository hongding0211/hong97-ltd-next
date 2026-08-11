import permissionsConfig, { parsePermissionKeys } from './permissions.config'

describe('permissions config', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.PERMISSION_KEYS
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('uses no permission points when the environment is not configured', () => {
    expect(permissionsConfig().keys).toEqual([])
  })

  it('trims, filters, and deduplicates configured permission points', () => {
    expect(parsePermissionKeys(' alpha, beta,alpha, ,')).toEqual([
      'alpha',
      'beta',
    ])
  })
})

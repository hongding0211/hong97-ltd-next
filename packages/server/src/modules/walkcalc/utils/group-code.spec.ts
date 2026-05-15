import { generateGroupCode } from './group-code'

describe('generateGroupCode', () => {
  it('generates uppercase 4-character base36 codes', () => {
    for (let index = 0; index < 100; index += 1) {
      expect(generateGroupCode()).toMatch(/^[0-9A-Z]{4}$/)
    }
  })

  it('generates non-deterministic codes', () => {
    const codes = new Set(
      Array.from({ length: 100 }, () => generateGroupCode()),
    )

    expect(codes.size).toBeGreaterThan(1)
  })
})

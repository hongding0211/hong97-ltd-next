import { generateGroupCode } from './group-code'

describe('generateGroupCode', () => {
  it('ports the legacy 4-character group code generator', () => {
    expect(generateGroupCode(0)).toBe('0000')
    expect(generateGroupCode(1)).toBe('B8JK')
    expect(generateGroupCode(2)).toBe('5M9S')
    expect(generateGroupCode(35)).toBe('H7GG')
  })
})

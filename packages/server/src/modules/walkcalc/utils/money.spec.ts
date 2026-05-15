import {
  addMoneyValues,
  assertMoneyValue,
  assertPositiveMoneyAmount,
  compareMoneyValues,
  formatMoneyAmount,
  fromMoneyValueBigInt,
  isZeroMoneyValue,
  negateMoneyValue,
  parseMoneyAmount,
  splitMoneyValue,
  toMoneyValueBigInt,
} from './money'

describe('walkcalc money helper', () => {
  it('parses decimal strings into exact cent values and formats canonical amounts', () => {
    expect(parseMoneyAmount('0')).toBe('0')
    expect(parseMoneyAmount('0.01')).toBe('1')
    expect(parseMoneyAmount('1')).toBe('100')
    expect(parseMoneyAmount('1.2')).toBe('120')
    expect(parseMoneyAmount('1.23')).toBe('123')
    expect(parseMoneyAmount('-1.23')).toBe('-123')

    expect(formatMoneyAmount('0')).toBe('0.00')
    expect(formatMoneyAmount('1')).toBe('0.01')
    expect(formatMoneyAmount('120')).toBe('1.20')
    expect(formatMoneyAmount('-123')).toBe('-1.23')
  })

  it('rejects invalid input shapes, precision, leading zeroes, and out-of-range values', () => {
    expect(() => parseMoneyAmount(1)).toThrow('decimal string')
    expect(() => parseMoneyAmount('')).toThrow('Invalid money amount')
    expect(() => parseMoneyAmount('abc')).toThrow('Invalid money amount')
    expect(() => parseMoneyAmount('01.00')).toThrow('Invalid money amount')
    expect(() => parseMoneyAmount('1.234')).toThrow('Invalid money amount')
    expect(() => parseMoneyAmount('Infinity')).toThrow('Invalid money amount')
    expect(() => parseMoneyAmount('10000000000000000.00')).toThrow(
      'out of range',
    )
    expect(() => assertMoneyValue('01')).toThrow('Invalid money value')
    expect(() => assertMoneyValue('1000000000000000000')).toThrow(
      'out of range',
    )
  })

  it('validates positive amounts separately from parseable zero and negative values', () => {
    expect(assertPositiveMoneyAmount('0.01')).toBe('1')
    expect(() => assertPositiveMoneyAmount('0')).toThrow('positive')
    expect(() => assertPositiveMoneyAmount('0.00')).toThrow('positive')
    expect(() => assertPositiveMoneyAmount('-1.00')).toThrow('positive')
  })

  it('compares, adds, negates, and detects zero using exact cent values', () => {
    expect(addMoneyValues('125', '-25')).toBe('100')
    expect(negateMoneyValue('-125')).toBe('125')
    expect(compareMoneyValues('100', '99')).toBe(1)
    expect(compareMoneyValues('100', '100')).toBe(0)
    expect(compareMoneyValues('-1', '0')).toBe(-1)
    expect(isZeroMoneyValue('0')).toBe(true)
    expect(isZeroMoneyValue('-0')).toBe(true)
    expect(isZeroMoneyValue('1')).toBe(false)
    expect(toMoneyValueBigInt('123')).toBe(123n)
    expect(fromMoneyValueBigInt(-123n)).toBe('-123')
  })

  it('splits whole cents deterministically without residuals', () => {
    expect(splitMoneyValue('10000', 3)).toEqual(['3334', '3333', '3333'])
    expect(splitMoneyValue('1', 3)).toEqual(['1', '0', '0'])
    expect(splitMoneyValue('-10000', 3)).toEqual(['-3334', '-3333', '-3333'])

    const split = splitMoneyValue(parseMoneyAmount('100.00'), 3)
    const total = split.reduce((sum, value) => addMoneyValues(sum, value), '0')
    expect(split.map(formatMoneyAmount)).toEqual(['33.34', '33.33', '33.33'])
    expect(total).toBe(parseMoneyAmount('100.00'))
    expect(() => splitMoneyValue('100', 0)).toThrow('positive')
  })
})

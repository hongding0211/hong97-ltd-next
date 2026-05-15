import { randomInt } from 'crypto'

const GROUP_CODE_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
export const GROUP_CODE_LENGTH = 4

export function generateGroupCode(): string {
  return Array.from(
    { length: GROUP_CODE_LENGTH },
    () => GROUP_CODE_ALPHABET[randomInt(GROUP_CODE_ALPHABET.length)],
  ).join('')
}

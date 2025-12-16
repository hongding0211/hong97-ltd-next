/**
 * Converts JWT expiresIn time format to milliseconds
 * Supports: s (seconds), m (minutes), h (hours), d (days)
 * Examples: '30d' → 2592000000, '1h' → 3600000, '60s' → 60000
 */
export function parseJwtExpiresInToMs(expiresIn: string | number): number {
  if (typeof expiresIn === 'number') {
    // If already in seconds, convert to milliseconds
    return expiresIn * 1000
  }

  const regex = /^(\d+)([smhd])$/
  const match = expiresIn.match(regex)

  if (!match) {
    throw new Error(
      `Invalid expiresIn format: ${expiresIn}. Expected format: <number><unit> (e.g., '30d', '1h')`,
    )
  }

  const value = Number.parseInt(match[1], 10)
  const unit = match[2]

  const multipliers = {
    s: 1000, // seconds to milliseconds
    m: 60 * 1000, // minutes to milliseconds
    h: 60 * 60 * 1000, // hours to milliseconds
    d: 24 * 60 * 60 * 1000, // days to milliseconds
  }

  return value * multipliers[unit as keyof typeof multipliers]
}

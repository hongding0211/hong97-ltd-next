import { registerAs } from '@nestjs/config'

export function parsePermissionKeys(value?: string): string[] {
  return [
    ...new Set(
      (value ?? '')
        .split(',')
        .map((key) => key.trim())
        .filter(Boolean),
    ),
  ]
}

export default registerAs('permissions', () => ({
  keys: parsePermissionKeys(process.env.PERMISSION_KEYS),
}))

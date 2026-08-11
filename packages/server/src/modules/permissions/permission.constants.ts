export const REQUIRED_PERMISSIONS_HEADER = 'x-permissions'
export const PERMISSION_MATCH_HEADER = 'x-permission-match'
export const REQUIRED_PERMISSIONS_METADATA = 'hong97:required-permissions'

export type PermissionMatch = 'any' | 'all'

export interface RequiredPermissions {
  keys: string[]
  match: PermissionMatch
}

export function parsePermissionHeader(value?: string): string[] {
  return [
    ...new Set(
      (value ?? '')
        .split(',')
        .map((key) => key.trim())
        .filter(Boolean),
    ),
  ]
}

export function parsePermissionMatch(value?: string): PermissionMatch {
  return value?.trim().toLowerCase() === 'all' ? 'all' : 'any'
}

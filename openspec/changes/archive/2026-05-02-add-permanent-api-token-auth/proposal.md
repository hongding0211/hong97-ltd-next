## Why

Automation and external clients currently need to authenticate with browser-oriented access tokens that expire and are coupled to login/refresh sessions. This makes long-running integrations brittle and requires scripts to periodically refresh credentials.

Adding permanent API tokens lets authenticated users create revocable bearer credentials for API access while keeping browser sessions short-lived.

## What Changes

- Add persistent API token records owned by users, storing only hashed token secrets.
- Allow protected APIs to authenticate with `Authorization: Bearer <apiToken>` in addition to existing access-token cookies/JWT bearer tokens.
- Add root-only API token management endpoints to create, list, and revoke/delete tokens.
- Show the raw API token only once at creation time.
- Add a Tools page for managing API tokens.

## Capabilities

### New Capabilities
- `api-token-auth`: Defines permanent API token creation, listing, revocation, and bearer authentication behavior.

### Modified Capabilities
- `auth-token-flow`: Protected requests also accept valid API tokens as bearer credentials.

## Impact

- Affected backend code: `packages/server/src/modules/auth/*`, `packages/server/src/guards/auth.guard.ts`.
- Affected frontend code: `packages/fe/pages/tools/*`, `packages/fe/services/auth/*`, locale files.
- Persistence impact: new MongoDB collection for API token metadata and hashed token secrets.

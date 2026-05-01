## Why

Current authentication uses a single JWT named `token` for both request authentication and session renewal. This makes the flow ambiguous: `refreshToken` refreshes from the current auth token rather than a separate refresh credential, logout only clears one cookie, and API contracts do not distinguish access tokens from refresh tokens.

Standardizing the flow around short-lived access tokens and longer-lived refresh tokens will make login, refresh, authorization, and logout behavior easier to reason about and safer to evolve.

## What Changes

- Introduce distinct `accessToken` and `refreshToken` concepts in backend DTOs, cookies, configuration, and frontend API types.
- Return `accessToken`, `accessTokenExpiresIn`, `refreshTokenExpiresIn`, and user data from login.
- Issue the access token through a cookie dedicated to request authentication, and issue the refresh token through a separate httpOnly cookie dedicated to renewal.
- Replace the current `GET /auth/refreshToken` behavior with a refresh flow that verifies a valid refresh token, rotates refresh credentials, and returns a new access token response.
- Update auth guard behavior so protected APIs authenticate only with the access token.
- Update logout to clear both auth cookies and invalidate the active refresh session.
- Add server tests for token issuance, refresh-token-only renewal, invalid refresh rejection, logout invalidation, and protected route access-token validation.

## Capabilities

### New Capabilities
- `auth-token-flow`: Defines the standard login, access token, refresh token, token refresh, protected request authentication, and logout contract.

### Modified Capabilities

## Impact

- Affected backend code: `packages/server/src/modules/auth/*`, `packages/server/src/guards/auth.guard.ts`, `packages/server/src/config/auth/auth.config.ts`, and auth-related DTOs.
- Affected frontend code: `packages/fe/services/auth/*`, `packages/fe/stores/general.ts`, `packages/fe/stores/sso.ts`, and callers that read `loginRes.data.token`.
- API contract impact: `token` response fields are renamed to `accessToken`; refresh becomes a refresh-token-based operation instead of using the current authenticated access token.
- Persistence impact: implementation needs a way to store and invalidate refresh sessions, either on the user document or in a dedicated token/session model.

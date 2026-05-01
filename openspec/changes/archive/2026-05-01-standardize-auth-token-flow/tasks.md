## 1. Token Configuration And Contracts

- [x] 1.1 Add auth config entries for access-token expiry, refresh-token expiry, access-cookie name, refresh-cookie name, and cookie security attributes.
- [x] 1.2 Update `LoginResponseDto` to return `accessToken`, `accessTokenExpiresIn`, `refreshTokenExpiresIn`, and `user`.
- [x] 1.3 Update `RefreshTokenDto` to return `accessToken`, `accessTokenExpiresIn`, and `refreshTokenExpiresIn`.
- [x] 1.4 Replace in-repo references to auth response `token` with `accessToken`.

## 2. Refresh Session Persistence

- [x] 2.1 Add a Mongoose refresh-session schema/model with `sessionId`, `userId`, `tokenHash`, `expiresAt`, `revokedAt`, `createdAt`, and `rotatedAt`.
- [x] 2.2 Register the refresh-session model in `AuthModule`.
- [x] 2.3 Add indexes for `sessionId`, `userId`, and refresh-session expiry.
- [x] 2.4 Implement helpers to generate opaque refresh tokens, hash refresh tokens, compare refresh tokens, and calculate expiry timestamps.

## 3. Backend Auth Flow

- [x] 3.1 Split token generation in `AuthService` into access-token signing and refresh-session creation.
- [x] 3.2 Update login to issue an access-token cookie, refresh-token cookie, refresh-session record, and standardized response body.
- [x] 3.3 Update cookie helpers so access and refresh cookies can be set and cleared independently.
- [x] 3.4 Replace the current refresh implementation with refresh-token validation, refresh-session rotation, new access-token issuance, and standardized response body.
- [x] 3.5 Reject missing, expired, revoked, mismatched, or reused refresh tokens with unauthorized errors.
- [x] 3.6 Update logout to clear both cookies and revoke the active refresh session when a refresh token is present.
- [x] 3.7 Update `AuthGuard` to read only the configured access-token cookie or `Authorization: Bearer` access token for protected routes.
- [x] 3.8 Clear the legacy `token` cookie during login, refresh, and logout to migrate existing browsers away from the old cookie name.

## 4. API Routes And Frontend Integration

- [x] 4.1 Change refresh from the current GET API entry to a POST refresh endpoint in the backend controller.
- [x] 4.2 Update `packages/fe/services/auth/urls.ts` and auth API types to expose the POST refresh endpoint.
- [x] 4.3 Update app initialization in `packages/fe/stores/general.ts` to call the POST refresh endpoint.
- [x] 4.4 Update SSO login handling in `packages/fe/stores/sso.ts` to use `loginRes.data.accessToken`.
- [x] 4.5 Search the frontend for stale `token` response-field usage and update all auth login/refresh callers.

## 5. Tests

- [x] 5.1 Add server tests for successful login returning `accessToken` fields, setting both cookies, and omitting `token`/refresh token from JSON.
- [x] 5.2 Add server tests showing protected routes accept access tokens and reject refresh-token-only requests.
- [x] 5.3 Add server tests for successful refresh rotating refresh credentials and returning a new access token.
- [x] 5.4 Add server tests for missing, expired, revoked, mismatched, and reused refresh tokens.
- [x] 5.5 Add server tests confirming logout clears both cookies and prevents subsequent refresh with the old refresh token.
- [x] 5.6 Add frontend type or unit coverage for the renamed login/refresh response fields where existing test infrastructure supports it.

## 6. Verification

- [x] 6.1 Run the relevant server test suite.
- [x] 6.2 Run TypeScript/build verification for the server.
- [x] 6.3 Run frontend lint/type verification.
- [x] 6.4 Manually verify login, page refresh/session restoration, protected page access, token refresh, and logout in local development.

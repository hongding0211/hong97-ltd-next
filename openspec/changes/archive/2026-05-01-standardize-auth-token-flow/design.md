## Context

The backend currently signs one JWT from `{ sub: userId }`, returns it as `token`, and writes it to a `token` cookie. `AuthGuard` accepts that same cookie or an `Authorization: Bearer` header for protected requests.

`GET /auth/refreshToken` is protected by the same auth token it refreshes. It does not verify a separate refresh credential, rotate any server-side state, or make logout meaningful beyond clearing the current cookie. The frontend also reads `loginRes.data.token`, while `ACCESS_TOKEN_KEY` exists but is not part of a consistent token lifecycle.

This change introduces an explicit access-token and refresh-token flow while preserving the existing NestJS, Mongoose, cookie-based, and axios `withCredentials` architecture.

## Goals / Non-Goals

**Goals:**
- Separate short-lived request authentication from longer-lived session renewal.
- Make token names explicit across DTOs, cookie names, frontend service types, and store code.
- Authenticate protected routes with access tokens only.
- Refresh sessions only with valid refresh tokens, then rotate refresh credentials.
- Allow logout and password-sensitive events to invalidate refresh sessions.
- Add focused tests that lock the behavior before and after refresh/logout.

**Non-Goals:**
- Implement phone or OAuth login.
- Add a full device/session management UI.
- Replace the existing response envelope or HTTP client abstraction.
- Move authentication to a third-party identity provider.

## Decisions

1. Use short-lived JWT access tokens and opaque refresh tokens.

   Access tokens remain JWTs so `AuthGuard` can validate protected requests without a database lookup. Refresh tokens will be cryptographically random opaque values, stored only as hashes server-side, so refresh credentials can be revoked and are not self-validating after logout.

   Alternative considered: make refresh tokens JWTs too. This is simpler but makes revocation and rotation harder unless every refresh still checks server-side state. Opaque tokens make that stateful behavior explicit.

2. Store refresh sessions in a dedicated Mongoose model.

   Create an auth refresh-session collection with `sessionId`, `userId`, `tokenHash`, `expiresAt`, `revokedAt`, `createdAt`, `rotatedAt`, and optional metadata such as user agent or IP. Keep it separate from the user document so session growth does not bloat user records and future session management can query sessions directly.

   Alternative considered: embed refresh token data under `User.authData`. That is less code initially but becomes awkward for multiple devices, revocation history, and indexes on expiry.

3. Keep refresh tokens in httpOnly cookies only.

   The login and refresh responses will expose the new access token details to existing SSO-style flows, but the refresh token MUST NOT be returned in JSON. The server sets `refreshToken` as an httpOnly, secure-in-production cookie with a path limited to auth refresh/logout routes where practical.

   Alternative considered: store refresh tokens in localStorage. That is easier for frontend code but exposes the long-lived credential to browser JavaScript.

4. Rename public token fields to `accessToken`.

   `LoginResponseDto` and `RefreshTokenDto` should use `accessToken` instead of `token`, with expiry metadata. Frontend callers that currently read `loginRes.data.token` must move to `loginRes.data.accessToken`.

   Alternative considered: return both `token` and `accessToken` temporarily. The proposal is meant to standardize the contract, so retaining the ambiguous name would keep the main footgun alive. Implementation can still clear the legacy `token` cookie during migration.

5. Use a POST refresh endpoint.

   Refresh mutates session state by rotating the refresh token, so it should be a POST operation. The frontend API map should move from `GetRefreshToken` to `PostRefreshToken` and call it during app initialization when an access token is missing or expired.

   Alternative considered: keep `GET /auth/refreshToken`. That matches current code but hides a state-changing operation behind GET and makes caches/proxies more surprising.

## Risks / Trade-offs

- [Risk] Existing callers may rely on `token` in the login response. -> Mitigation: update all in-repo callers and TypeScript DTOs in the same change; tests should fail on stale field usage.
- [Risk] Cookie path or SameSite settings can break cross-origin development if frontend and backend run on different hosts. -> Mitigation: keep the current `withCredentials` model, configure cookie attributes from environment when needed, and verify local frontend/server auth flows.
- [Risk] Refresh-session persistence adds database work during login, refresh, and logout. -> Mitigation: index `userId`, `sessionId`, and `expiresAt`; keep access-token validation stateless for normal protected requests.
- [Risk] Refresh token reuse after rotation may indicate theft. -> Mitigation: revoke the session when a rotated or mismatched refresh token is presented and reject the request.

## Migration Plan

1. Add auth token config for access-token expiry, refresh-token expiry, and cookie names while clearing the legacy `token` cookie on login/logout.
2. Add the refresh-session schema/model and service helpers for creating, hashing, rotating, validating, and revoking refresh sessions.
3. Update login, refresh, logout, DTOs, guard extraction, and frontend API/store callers together.
4. Run server auth tests and frontend type/lint checks.
5. Roll back by reverting to the prior single-token endpoints and deleting newly-created refresh sessions; existing access-token cookies will naturally expire.

## Open Questions

- Exact default expiries should be chosen during implementation. A reasonable baseline is 15 minutes for access tokens and 30 days for refresh tokens.
- The implementation should confirm whether the SSO redirect hash still needs an access token in the URL, or whether cookie-based login can cover that flow.

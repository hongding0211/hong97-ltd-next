## Why

Users should be able to sign in with GitHub instead of creating or remembering a local password. This is especially useful now because the project already has a standardized access/refresh cookie flow, so OAuth can plug into the existing session model rather than creating a parallel auth path.

## What Changes

- Add a GitHub OAuth login entrypoint that redirects users to GitHub with the configured dev callback URL.
- Add a GitHub OAuth callback endpoint that exchanges the authorization code, fetches the GitHub profile, and signs the user into the existing auth session.
- Persist the GitHub account identity locally using GitHub's stable user id, along with cached profile fields such as login, display name, avatar URL, profile URL, and verified primary email when available.
- Create a new local user on first successful GitHub login, or update the cached GitHub profile data for an existing linked user.
- Reuse the existing access-token and refresh-token cookie contract after OAuth login succeeds.
- Redirect the browser back to the configured frontend URL after successful or failed OAuth handling.

## Capabilities

### New Capabilities
- `github-oauth-login`: Covers GitHub OAuth authorization, callback handling, local account creation/linking, and cached GitHub profile data.

### Modified Capabilities
- `auth-token-flow`: Extends the existing login/session requirements so successful GitHub OAuth login issues the same standardized access and refresh credentials as local login.

## Impact

- `packages/server/src/modules/auth/*`: Add GitHub OAuth routes, service methods, DTO or helper types, token exchange, callback handling, and ignored auth paths.
- `packages/server/src/modules/user/schema/user.schema.ts`: Use the existing GitHub auth data shape or extend it to store cached GitHub profile fields.
- `packages/server/src/config/auth/auth.config.ts`: Add OAuth routes to the auth guard ignore list and read GitHub OAuth/frontend configuration.
- `packages/server/.env`: Add local development GitHub OAuth configuration.
- `packages/fe`: Add or wire a GitHub login trigger and any callback/result handling needed after the backend redirect.
- External dependency: GitHub OAuth and REST user APIs.

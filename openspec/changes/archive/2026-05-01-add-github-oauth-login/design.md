## Context

The project uses a split frontend/backend architecture: Next.js runs on `localhost:3000` in development, and its dev rewrite proxies `/api/:path*` to the Nest server on `localhost:3500`. The existing Nest auth module exposes `/auth/*` routes and already issues standardized access-token and refresh-token httpOnly cookies for local login.

GitHub OAuth should therefore use the externally configured callback URL `http://localhost:3000/api/auth/github/callback`, while the backend implementation remains `GET /auth/github/callback` after the Next rewrite. The backend should remain the authority for code exchange, GitHub API calls, local user creation/linking, and session cookie issuance.

## Goals / Non-Goals

**Goals:**
- Add a browser-based GitHub OAuth login flow that starts from the backend and returns through the configured callback URL.
- Store GitHub identity locally using GitHub's stable numeric/string id, not mutable username.
- Cache useful profile fields locally so normal app rendering does not call GitHub on every request.
- Reuse the existing access/refresh cookie session behavior, refresh-session storage, logout, and `auth/info` flow.
- Keep OAuth secrets server-side only.

**Non-Goals:**
- Do not add GitHub repository permissions, GitHub App installation behavior, or any non-login GitHub API features.
- Do not support production/staging OAuth apps in this change beyond environment-variable configuration.
- Do not implement manual account linking between an already logged-in local user and GitHub unless it falls out naturally from matching an existing GitHub id.
- Do not store or expose GitHub access tokens unless a future capability needs them.

## Decisions

1. Use backend-owned OAuth endpoints.

   Add `GET /auth/github` to build the GitHub authorization URL and redirect the browser to GitHub. Add `GET /auth/github/callback` to validate `state`, exchange `code`, fetch GitHub user data, create or update the local user, issue app cookies, and redirect back to the frontend.

   Alternative considered: have the frontend build the GitHub authorization URL. Keeping it backend-owned avoids duplicating OAuth configuration in Next and keeps future state signing/nonce logic close to token exchange.

2. Treat GitHub as an identity provider, not a per-request profile source.

   Store `authData.github.githubId` as the lookup key, and cache fields such as `login`, `name`, `avatarUrl`, `htmlUrl`, `email`, and `lastSyncedAt`. Update these cached fields on each successful GitHub login.

   Alternative considered: call GitHub from `auth/info` every time. That would add latency, rate-limit exposure, and a runtime dependency on GitHub for normal app pages.

3. Do not persist GitHub OAuth access tokens for now.

   The callback only needs the token long enough to call GitHub's user APIs. The app session should continue to be represented by its own JWT access token and refresh session. If a later feature needs GitHub API access on behalf of the user, token persistence and refresh behavior should be designed separately.

   Alternative considered: store `authData.github.accessToken` because the schema already allows it. Avoiding persistence reduces blast radius if user records are exposed and keeps this change focused on login.

4. Reuse local session issuing code.

   Extract the common "issue app session" behavior from local login into a helper that updates `lastLoginAt`, creates access/refresh credentials, clears old cookies, sets new cookies, and returns the standardized login response. GitHub login should call that same helper.

   Alternative considered: duplicate cookie issuance in the OAuth callback. Sharing the helper keeps local and OAuth login behavior aligned with the existing `auth-token-flow` spec.

5. Redirect with minimal callback result state.

   After success, redirect to `FRONTEND_URL` or a validated `redirect` value carried in signed state. After failure, redirect to a safe frontend login URL with a compact error indicator. The backend must not accept arbitrary redirect URLs from unsigned query parameters.

   Alternative considered: return JSON from the callback. GitHub callback is browser navigation, so redirect behavior is a better user experience and matches OAuth expectations.

## Risks / Trade-offs

- [Risk] OAuth callback can become an open redirect if `redirect` is trusted directly. -> Mitigation: carry redirect targets in signed `state` and only allow same-origin or relative frontend redirects.
- [Risk] GitHub user email can be missing from `/user`. -> Mitigation: request `user:email` scope and fetch verified primary email from GitHub's email endpoint when needed; allow user creation without email if GitHub does not provide one.
- [Risk] A mutable GitHub username could incorrectly identify accounts. -> Mitigation: key lookup and uniqueness on `githubId`, using `login` only as cached display data.
- [Risk] Reusing strict same-site cookies may interact poorly with cross-site OAuth redirects in some browsers. -> Mitigation: verify the dev flow after implementation; if needed, adjust callback cookie options deliberately rather than loosening all cookies by default.
- [Risk] Existing `github` DTO paths currently imply token-based API login/registration. -> Mitigation: keep or deprecate those DTO cases separately, and implement the browser OAuth flow through explicit routes.

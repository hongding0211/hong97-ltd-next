## 1. Configuration and Routing

- [x] 1.1 Add typed GitHub OAuth configuration access for client id, client secret, callback URL, and frontend URL.
- [x] 1.2 Add `/auth/github` and `/auth/github/callback` to the auth guard ignore list.
- [x] 1.3 Add `GET /auth/github` and `GET /auth/github/callback` controller routes with redirect responses.

## 2. GitHub OAuth Service Flow

- [x] 2.1 Implement signed OAuth state creation and validation with support for safe frontend redirect targets.
- [x] 2.2 Implement GitHub authorization URL construction with minimal scopes.
- [x] 2.3 Implement server-side authorization code exchange against GitHub.
- [x] 2.4 Implement GitHub profile fetch, including verified primary email lookup when available.
- [x] 2.5 Handle callback failures by redirecting to a safe frontend error destination without creating or authenticating a user.

## 3. Local User and Session Integration

- [x] 3.1 Extend the GitHub user auth data shape to store stable GitHub id and cached profile fields.
- [x] 3.2 Create a first-login local user for unknown GitHub accounts.
- [x] 3.3 Update cached GitHub profile fields for existing linked users on each successful GitHub login.
- [x] 3.4 Extract shared session issuance from local login and reuse it for GitHub OAuth login.
- [x] 3.5 Ensure GitHub OAuth login sets the same access-token and refresh-token httpOnly cookies as local login.

## 4. Frontend Login Entry

- [x] 4.1 Add a GitHub login action on the existing SSO login page that navigates to `/api/auth/github`.
- [x] 4.2 Add minimal callback/error handling on the frontend destination after backend redirect.

## 5. Verification

- [x] 5.1 Add or update auth service tests for GitHub user creation, existing-user login, profile cache updates, and session issuance.
- [x] 5.2 Add callback failure tests for invalid state and failed GitHub token exchange.
- [x] 5.3 Run the server test suite and manually verify the dev OAuth flow through `http://localhost:3000/api/auth/github/callback`.

---
name: hong97-auth
description: Use when working with hong97-ltd-next authentication flows, including local login, GitHub OAuth login, register, refresh token, logout, profile, hasLocalAuth, isAdmin, or authenticated API calls that need accessToken cookies or Bearer tokens.
---

# Hong97 Auth

Use this skill for authentication in `hong97-ltd-next`.

## Context

- Backend controller: `packages/server/src/modules/auth/auth.controller.ts`
- Frontend service paths: `packages/fe/services/auth/urls.ts`
- Frontend API types: `packages/fe/services/auth/types.ts`
- Server default port is `3001`; frontend default port is `3000`.
- HTTP responses are normally wrapped as `{ "isSuccess": true, "data": ... }` or `{ "isSuccess": false, "msg": "...", "errCode": ..., "data": null }`.
- Auth accepts either an `accessToken` cookie or `Authorization: Bearer <token>`. Login and refresh also set cookies on the response.
- Use a cookie jar for command-line flows so protected calls reuse auth cookies.

## Local Login

Endpoint: `POST /auth/login`

Local email login body:

```json
{
  "type": "local",
  "credentials": {
    "email": "user@example.com",
    "password": "password123"
  }
}
```

Phone login body:

```json
{
  "type": "phone",
  "credentials": {
    "phoneNumber": "+8613800000000",
    "verificationCode": "123456"
  }
}
```

Example:

```bash
curl -i -c /tmp/hong97-cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"type":"local","credentials":{"email":"user@example.com","password":"password123"}}' \
  http://localhost:3001/auth/login
```

The response data shape is:

```ts
{
  accessToken: string
  accessTokenExpiresIn: string
  refreshTokenExpiresIn: string
  user: UserResponseDto
}
```

## GitHub Login

Browser redirect flow:

- Start: `GET /auth/github?redirect=<frontend-path-or-url>`
- Callback: `GET /auth/github/callback?code=...&state=...`

The server redirects to GitHub, handles the callback, sets auth cookies, then redirects to the frontend URL from config.

## Session Calls

Use the same cookie jar after login:

```bash
curl -b /tmp/hong97-cookies.txt http://localhost:3001/auth/info
```

Common routes:

| Operation | Method | Path | Notes |
| --- | --- | --- | --- |
| Register | `POST` | `/auth/register` | Public |
| Login | `POST` | `/auth/login` | Public, sets cookies |
| Current user | `GET` | `/auth/info` | Requires auth |
| Refresh token | `POST` | `/auth/refreshToken` | Public route, uses refresh cookie |
| Update profile | `PATCH` | `/auth/profile` | Requires auth |
| Modify password | `POST` | `/auth/modifyPassword` | Requires auth |
| Has local auth | `GET` | `/auth/hasLocalAuth` | Requires auth |
| Is admin | `GET` | `/auth/isAdmin` | Soft-auth route |
| Logout | `POST` | `/auth/logout` | Public route, clears auth state |

## Frontend Service Names

Use `http` from `packages/fe/services/http.ts` with these names:

```ts
await http.post('PostLogin', body)
await http.get('GetInfo')
await http.post('PostRefreshToken')
await http.patch('PatchProfile', body)
await http.post('PostLogout')
```

## Notes

- Root-only APIs elsewhere require the authenticated user id to be listed in `ROOT_USERS`.
- Do not print real passwords, tokens, or cookies in final answers.
- If a protected request fails with `401`, first check whether the cookie jar contains `accessToken`; if it expired, call `POST /auth/refreshToken`.

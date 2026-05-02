---
name: hong97-ltd
description: Use when helping someone use hong97.ltd, including browsing the site, signing in, managing API tokens, and using the blog, trash, and auth APIs from scripts or third-party clients.
---

# Hong97 Ltd

Use this skill to explain how to use `https://hong97.ltd` as a website and API service.
The audience is a user or integrator of the live site.

## What The Site Provides

- Website: `https://hong97.ltd`
- API base URL: `https://hong97.ltd/api`
- Main areas:
  - Blog: read posts, fetch post metadata/content/comments, like, comment, and view posts.
  - Trash: read short posts, filter by tags, like, and comment.
  - Tools: authenticated utilities, including permanent API token management.
  - Account: local login, GitHub OAuth login, profile, password, session, and logout.

Most API responses are wrapped as:

```json
{ "isSuccess": true, "data": {} }
```

or:

```json
{ "isSuccess": false, "msg": "...", "errCode": "...", "data": null }
```

## Authentication

hong97.ltd supports two practical auth modes:

- Browser/session auth: log in on the website or call `/auth/login`; the site sets an `accessToken` cookie and a refresh cookie.
- Permanent API token auth: create an API token once, then send it as `Authorization: Bearer <apiToken>` from scripts or third-party clients.

For command-line cookie flows, keep cookies in a jar:

```bash
curl -i -c /tmp/hong97-cookies.txt ...
curl -b /tmp/hong97-cookies.txt ...
```

For API token flows, pass the token in the `Authorization` header:

```bash
curl -H 'Authorization: Bearer h97_your_api_token_here' \
  https://hong97.ltd/api/auth/info
```

Do not print real passwords, tokens, or cookies in final answers.

## API Tokens

API tokens are permanent Bearer tokens for automation. They are useful for scripts, cron jobs, CLI tools, and third-party clients that should not depend on browser cookies.

Important behavior:

- Tokens start with `h97_`.
- The full token is shown only once immediately after creation.
- Store the token securely; later list responses only show metadata and a short prefix.
- Deleting a token revokes it immediately.
- API token management is root/admin-only on the site.
- API tokens can authenticate protected API requests through `Authorization: Bearer <token>`.

Create a token in the website:

1. Sign in at `https://hong97.ltd`.
2. Open `https://hong97.ltd/tools/api-tokens`.
3. Enter a name such as `CLI` or `Zapier`.
4. Create the token and copy the full value immediately.

Create a token through the API, using an existing authenticated cookie session:

```bash
curl -b /tmp/hong97-cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"name":"CLI"}' \
  https://hong97.ltd/api/auth/api-tokens
```

Example creation response data:

```json
{
  "tokenId": "uuid",
  "name": "CLI",
  "tokenPrefix": "h97_...",
  "lastUsedAt": null,
  "createdAt": "2026-05-02T00:00:00.000Z",
  "apiToken": "h97_full_token_shown_once"
}
```

List tokens:

```bash
curl -b /tmp/hong97-cookies.txt \
  https://hong97.ltd/api/auth/api-tokens
```

Delete a token:

```bash
curl -X DELETE -b /tmp/hong97-cookies.txt \
  https://hong97.ltd/api/auth/api-tokens/<tokenId>
```

Use a token for API calls:

```bash
curl -H 'Authorization: Bearer h97_your_api_token_here' \
  https://hong97.ltd/api/auth/info
```

## Account And Sessions

Routes:

| Operation | Method | Path | Notes |
| --- | --- | --- | --- |
| Register | `POST` | `/auth/register` | Public |
| Login | `POST` | `/auth/login` | Public, sets cookies |
| GitHub login | `GET` | `/auth/github?redirect=...` | Browser redirect |
| GitHub callback | `GET` | `/auth/github/callback` | OAuth callback |
| Current user | `GET` | `/auth/info` | Requires auth |
| Refresh session | `POST` | `/auth/refreshToken` | Uses refresh cookie |
| Update profile | `PATCH` | `/auth/profile` | Requires auth |
| Modify password | `POST` | `/auth/modifyPassword` | Requires auth |
| Has local auth | `GET` | `/auth/hasLocalAuth` | Requires auth |
| Is admin | `GET` | `/auth/isAdmin` | Optional auth |
| Logout | `POST` | `/auth/logout` | Public route |
| List API tokens | `GET` | `/auth/api-tokens` | Root/admin-only |
| Create API token | `POST` | `/auth/api-tokens` | Root/admin-only |
| Delete API token | `DELETE` | `/auth/api-tokens/:tokenId` | Root/admin-only |

Local email login:

```bash
curl -i -c /tmp/hong97-cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"type":"local","credentials":{"email":"user@example.com","password":"password123"}}' \
  https://hong97.ltd/api/auth/login
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

Check the current session:

```bash
curl -b /tmp/hong97-cookies.txt https://hong97.ltd/api/auth/info
```

Refresh a browser/cookie session:

```bash
curl -X POST -b /tmp/hong97-cookies.txt -c /tmp/hong97-cookies.txt \
  https://hong97.ltd/api/auth/refreshToken
```

## Trash

Use Trash for short posts. Reading is public; liking and commenting can work anonymously or with optional auth. Root/admin auth is required to create or delete posts.

Routes:

| Operation | Method | Path | Notes |
| --- | --- | --- | --- |
| Create trash | `POST` | `/trash/create` | Root/admin-only |
| List trash | `GET` | `/trash/list` | Optional auth |
| Trash detail | `GET` | `/trash/detail/:id` | Public |
| Delete trash | `DELETE` | `/trash/:id` | Root/admin-only |
| Like trash | `POST` | `/trash/like` | Optional auth |
| Add comment | `POST` | `/trash/comment/append` | Optional auth |
| Delete comment | `DELETE` | `/trash/comment/delete` | Optional auth |

List query:

```ts
{
  page?: number
  pageSize?: number
  tags?: string[]
}
```

Fetch list:

```bash
curl 'https://hong97.ltd/api/trash/list?page=1&pageSize=10'
```

Fetch detail:

```bash
curl 'https://hong97.ltd/api/trash/detail/665000000000000000000000'
```

Create trash with an API token:

```bash
curl -H 'Authorization: Bearer h97_your_api_token_here' \
  -H 'Content-Type: application/json' \
  -d '{"content":"short text","tags":["life"]}' \
  https://hong97.ltd/api/trash/create
```

Create body:

```ts
{
  content?: string
  media?: { imageUrl: string; videoUrl?: string }[]
  tags?: string[]
}
```

Like:

```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  -d '{"trashId":"665000000000000000000000"}' \
  https://hong97.ltd/api/trash/like
```

Comment:

```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  -d '{"trashId":"665000000000000000000000","content":"nice","anonymous":true}' \
  https://hong97.ltd/api/trash/comment/append
```

Use cookies or an API token for optional-auth routes when user-specific fields such as `isLiked` should reflect the current user.

## Blog

Use Blog to read long-form posts and interact with them. Reading is public or optional-auth; creating, updating, and deleting posts requires root/admin auth.

Routes:

| Operation | Method | Path | Notes |
| --- | --- | --- | --- |
| Create blog | `POST` | `/blog/new2` | Root/admin-only |
| List blogs | `GET` | `/blog/list` | Optional auth |
| Record view | `POST` | `/blog/view` | Optional auth |
| Blog metadata | `GET` | `/blog/meta` | Optional auth |
| Update metadata | `PUT` | `/blog/meta` | Root/admin-only |
| Blog content | `GET` | `/blog/content` | Optional auth |
| Update content | `POST` | `/blog/content` | Root/admin-only |
| Like blog | `POST` | `/blog/like` | Optional auth |
| Add comment | `POST` | `/blog/comment` | Optional auth |
| List comments | `GET` | `/blog/comments` | Public |
| Delete comment | `DELETE` | `/blog/comment` | Optional auth |
| Delete blog | `DELETE` | `/blog` | Root/admin-only |

List query:

```ts
{
  page?: number
  pageSize?: number
  search?: string
}
```

Fetch blogs:

```bash
curl 'https://hong97.ltd/api/blog/list?page=1&pageSize=10'
```

Fetch metadata, content, and comments:

```bash
curl 'https://hong97.ltd/api/blog/meta?blogId=my-blog-id'
curl 'https://hong97.ltd/api/blog/content?blogId=my-blog-id'
curl 'https://hong97.ltd/api/blog/comments?blogId=my-blog-id'
```

Record view, like, and comment:

```bash
curl -X POST -H 'Content-Type: application/json' \
  -d '{"blogId":"my-blog-id"}' \
  https://hong97.ltd/api/blog/view

curl -X POST -H 'Content-Type: application/json' \
  -d '{"blogId":"my-blog-id"}' \
  https://hong97.ltd/api/blog/like

curl -X POST -H 'Content-Type: application/json' \
  -d '{"blogId":"my-blog-id","content":"nice post","anonymous":true}' \
  https://hong97.ltd/api/blog/comment
```

Root/admin authoring with an API token:

```bash
curl -H 'Authorization: Bearer h97_your_api_token_here' \
  -H 'Content-Type: application/json' \
  -d '{"title":"New post","keywords":["note"],"coverImg":"https://example.com/cover.jpg"}' \
  https://hong97.ltd/api/blog/new2

curl -X PUT \
  -H 'Authorization: Bearer h97_your_api_token_here' \
  -H 'Content-Type: application/json' \
  -d '{"blogId":"my-blog-id","blogTitle":"Updated title","keywords":["note"],"hasPublished":true}' \
  https://hong97.ltd/api/blog/meta

curl -X POST \
  -H 'Authorization: Bearer h97_your_api_token_here' \
  -H 'Content-Type: application/json' \
  -d '{"blogId":"my-blog-id","content":"# Markdown or MDX content"}' \
  https://hong97.ltd/api/blog/content
```

In list responses, the blog id is named `key`; in metadata/content APIs it is named `blogId`.

## Troubleshooting

- If a protected route returns `401`, send either a valid `accessToken` cookie or `Authorization: Bearer <token>`.
- If cookie auth returns `401`, try `POST /auth/refreshToken` with the refresh cookie.
- If an API token returns `401`, verify that it starts with `h97_`, was copied fully, and has not been deleted.
- If a root/admin-only route returns `403`, the authenticated user is not allowed to perform that operation.
- If array query params such as `tags` do not bind, retry with repeated params: `tags=a&tags=b`.

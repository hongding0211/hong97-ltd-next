---
name: hong97-ltd
description: Use when working with hong97-ltd-next project APIs, including login, GitHub OAuth, refresh/logout/session calls, fetching blog lists or content, fetching trash posts, and creating, liking, commenting, updating, or deleting blog/trash resources.
---

# Hong97 Ltd

Use this skill for API work in `hong97-ltd-next`.

## Context

- Backend default port: `3001`
- Frontend default port: `3000`
- Most server responses are wrapped as `{ "isSuccess": true, "data": ... }` or `{ "isSuccess": false, "msg": "...", "errCode": ..., "data": null }`.

Auth accepts either:

- an `accessToken` cookie, usually set by login/refresh, or
- `Authorization: Bearer <token>`.

For command-line flows, use a cookie jar:

```bash
curl -i -c /tmp/hong97-cookies.txt ...
curl -b /tmp/hong97-cookies.txt ...
```

Root-only APIs require an authenticated user whose id is listed in `ROOT_USERS`.

## Auth

Routes:

| Operation | Method | Path | Notes |
| --- | --- | --- | --- |
| Register | `POST` | `/auth/register` | Public |
| Login | `POST` | `/auth/login` | Public, sets cookies |
| GitHub login | `GET` | `/auth/github?redirect=...` | Browser redirect |
| GitHub callback | `GET` | `/auth/github/callback` | OAuth callback |
| Current user | `GET` | `/auth/info` | Requires auth |
| Refresh token | `POST` | `/auth/refreshToken` | Uses refresh cookie |
| Update profile | `PATCH` | `/auth/profile` | Requires auth |
| Modify password | `POST` | `/auth/modifyPassword` | Requires auth |
| Has local auth | `GET` | `/auth/hasLocalAuth` | Requires auth |
| Is admin | `GET` | `/auth/isAdmin` | Soft-auth route |
| Logout | `POST` | `/auth/logout` | Public route |

Local email login:

```bash
curl -i -c /tmp/hong97-cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"type":"local","credentials":{"email":"user@example.com","password":"password123"}}' \
  http://localhost:3001/auth/login
```

Phone login:

```json
{
  "type": "phone",
  "credentials": {
    "phoneNumber": "+8613800000000",
    "verificationCode": "123456"
  }
}
```

Session check:

```bash
curl -b /tmp/hong97-cookies.txt http://localhost:3001/auth/info
```

Do not print real passwords, tokens, or cookies in final answers.

## Trash

Routes:

| Operation | Method | Path | Notes |
| --- | --- | --- | --- |
| Create trash | `POST` | `/trash/create` | Root-only |
| List trash | `GET` | `/trash/list` | Optional auth |
| Trash detail | `GET` | `/trash/detail/:id` | Public |
| Delete trash | `DELETE` | `/trash/:id` | Root-only |
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
curl 'http://localhost:3001/trash/list?page=1&pageSize=10'
```

Fetch detail:

```bash
curl 'http://localhost:3001/trash/detail/665000000000000000000000'
```

Create trash:

```bash
curl -b /tmp/hong97-cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"content":"short text","tags":["life"]}' \
  http://localhost:3001/trash/create
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
  http://localhost:3001/trash/like
```

Comment:

```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  -d '{"trashId":"665000000000000000000000","content":"nice","anonymous":true}' \
  http://localhost:3001/trash/comment/append
```

Use cookies for optional-auth routes when `isLiked` should reflect the current user.

## Blog

Routes:

| Operation | Method | Path | Notes |
| --- | --- | --- | --- |
| Create blog | `POST` | `/blog/new2` | Root-only |
| List blogs | `GET` | `/blog/list` | Optional auth |
| Record view | `POST` | `/blog/view` | Optional auth |
| Blog metadata | `GET` | `/blog/meta` | Optional auth |
| Update metadata | `PUT` | `/blog/meta` | Root-only |
| Blog content | `GET` | `/blog/content` | Optional auth |
| Update content | `POST` | `/blog/content` | Root-only |
| Like blog | `POST` | `/blog/like` | Optional auth |
| Add comment | `POST` | `/blog/comment` | Optional auth |
| List comments | `GET` | `/blog/comments` | Public |
| Delete comment | `DELETE` | `/blog/comment` | Optional auth |
| Delete blog | `DELETE` | `/blog` | Root-only |

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
curl 'http://localhost:3001/blog/list?page=1&pageSize=10'
```

Fetch metadata, content, and comments:

```bash
curl 'http://localhost:3001/blog/meta?blogId=my-blog-id'
curl 'http://localhost:3001/blog/content?blogId=my-blog-id'
curl 'http://localhost:3001/blog/comments?blogId=my-blog-id'
```

Record view, like, and comment:

```bash
curl -X POST -H 'Content-Type: application/json' \
  -d '{"blogId":"my-blog-id"}' \
  http://localhost:3001/blog/view

curl -X POST -H 'Content-Type: application/json' \
  -d '{"blogId":"my-blog-id"}' \
  http://localhost:3001/blog/like

curl -X POST -H 'Content-Type: application/json' \
  -d '{"blogId":"my-blog-id","content":"nice post","anonymous":true}' \
  http://localhost:3001/blog/comment
```

Root-only authoring:

```bash
curl -b /tmp/hong97-cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"title":"New post","keywords":["note"],"coverImg":"https://example.com/cover.jpg"}' \
  http://localhost:3001/blog/new2

curl -X PUT -b /tmp/hong97-cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"blogId":"my-blog-id","blogTitle":"Updated title","keywords":["note"],"hasPublished":true}' \
  http://localhost:3001/blog/meta

curl -X POST -b /tmp/hong97-cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"blogId":"my-blog-id","content":"# Markdown or MDX content"}' \
  http://localhost:3001/blog/content
```

In list responses, the blog id is named `key`; in metadata/content APIs it is named `blogId`.

## Troubleshooting

- If a protected route returns `401`, check the cookie jar for `accessToken`; then try `POST /auth/refreshToken`.
- If a root-only route returns `403`, verify the logged-in user id is in `ROOT_USERS`.
- If array query params such as `tags` do not bind, retry with repeated params: `tags=a&tags=b`.

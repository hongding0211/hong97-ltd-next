---
name: hong97-trash
description: Use when working with hong97-ltd-next trash posts, including fetching trash lists, fetching trash details, creating trash entries, liking trash, commenting on trash, deleting trash, or deleting trash comments.
---

# Hong97 Trash

Use this skill for the `trash` feature in `hong97-ltd-next`.

## Context

- Backend controller: `packages/server/src/modules/trash/trash.controller.ts`
- Frontend paths: `packages/fe/services/trash/urls.ts`
- Frontend types: `packages/fe/services/trash/types.ts`
- DTOs live under `packages/server/src/modules/trash/dto/`.
- Server default port is `3001`.
- Responses are usually wrapped as `{ "isSuccess": true, "data": ... }`.
- `GET /trash/list`, `GET /trash/detail/:id`, `POST /trash/like`, and trash comments support anonymous or optional-auth access.
- `POST /trash/create` and `DELETE /trash/:id` are root-only and need a logged-in root user.

## Fetch Trash List

Endpoint: `GET /trash/list`

Query params:

```ts
{
  page?: number
  pageSize?: number
  tags?: string[]
}
```

Example:

```bash
curl 'http://localhost:3001/trash/list?page=1&pageSize=10'
```

Expected data shape:

```ts
{
  data: TrashResponseDto[]
  total: number
  page: number
  pageSize: number
}
```

`TrashResponseDto`:

```ts
{
  _id: string
  content?: string
  media?: { imageUrl: string; videoUrl?: string }[]
  tags: string[]
  timestamp: number
  likeCount: number
  isLiked: boolean
  comments: TrashComment[]
  createdAt: string
  updatedAt: string
}
```

## Fetch Trash Detail

Endpoint: `GET /trash/detail/:id`

Example:

```bash
curl 'http://localhost:3001/trash/detail/665000000000000000000000'
```

## Create Trash

Endpoint: `POST /trash/create`

Requires root auth.

Body:

```json
{
  "content": "short text",
  "media": [
    {
      "imageUrl": "https://example.com/image.jpg",
      "videoUrl": "https://example.com/video.mov"
    }
  ],
  "tags": ["life"]
}
```

Example:

```bash
curl -b /tmp/hong97-cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"content":"short text","tags":["life"]}' \
  http://localhost:3001/trash/create
```

## Like And Comment

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

Delete comment:

```bash
curl -X DELETE \
  'http://localhost:3001/trash/comment/delete?trashId=665000000000000000000000&commentId=comment-id'
```

## Frontend Service Names

Use `http` from `packages/fe/services/http.ts`:

```ts
await http.get('GetTrashList', { page: 1, pageSize: 10 })
await http.get('GetTrashById', { id })
await http.post('PostCreateTrash', body)
await http.post('PostLikeTrash', { trashId })
await http.post('PostCommentTrash', { trashId, content, anonymous })
await http.delete('DeleteCommentTrash', { trashId, commentId })
```

## Notes

- For authenticated optional routes, pass cookies so `isLiked` is accurate for the current user.
- For root-only routes, use `$hong97-auth` first and keep the cookie jar.
- Query array serialization follows the caller. If tags do not bind, retry with repeated params such as `tags=a&tags=b`.

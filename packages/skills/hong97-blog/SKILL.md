---
name: hong97-blog
description: Use when working with hong97-ltd-next blogs, including fetching blog lists, metadata, content, comments, recording views, liking blogs, creating or updating blog posts, editing metadata, and deleting blogs or blog comments.
---

# Hong97 Blog

Use this skill for the `blog` feature in `hong97-ltd-next`.

## Context

- Backend controller: `packages/server/src/modules/blog/blog.controller.ts`
- Frontend paths: `packages/fe/services/blog/urls.ts`
- Frontend API types: `packages/fe/services/blog/types.ts`
- DTOs live under `packages/server/src/modules/blog/dto/`.
- Server default port is `3001`.
- Responses are usually wrapped as `{ "isSuccess": true, "data": ... }`.
- Most read and interaction routes are soft-auth: they work anonymously, but cookies improve `isLiked` and authorization-sensitive behavior.
- Create, update, and delete routes are root-only.

## Fetch Blog List

Endpoint: `GET /blog/list`

Query params:

```ts
{
  page?: number
  pageSize?: number
  search?: string
}
```

Example:

```bash
curl 'http://localhost:3001/blog/list?page=1&pageSize=10'
```

Expected data shape:

```ts
{
  data: {
    key: string
    title: string
    time: number
    keywords: string[]
    coverImg?: string
    authRequired?: boolean
  }[]
  total: number
  page: number
  pageSize: number
}
```

## Fetch Blog Metadata And Content

Metadata:

```bash
curl 'http://localhost:3001/blog/meta?blogId=my-blog-id'
```

Content:

```bash
curl 'http://localhost:3001/blog/content?blogId=my-blog-id'
```

Comments:

```bash
curl 'http://localhost:3001/blog/comments?blogId=my-blog-id'
```

## Record View, Like, And Comment

Record view:

```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  -d '{"blogId":"my-blog-id"}' \
  http://localhost:3001/blog/view
```

Like:

```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  -d '{"blogId":"my-blog-id"}' \
  http://localhost:3001/blog/like
```

Comment:

```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  -d '{"blogId":"my-blog-id","content":"nice post","anonymous":true}' \
  http://localhost:3001/blog/comment
```

## Root-Only Authoring

Create a blog shell:

```bash
curl -b /tmp/hong97-cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"title":"New post","keywords":["note"],"coverImg":"https://example.com/cover.jpg"}' \
  http://localhost:3001/blog/new2
```

Update metadata:

```bash
curl -X PUT -b /tmp/hong97-cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"blogId":"my-blog-id","blogTitle":"Updated title","keywords":["note"],"hasPublished":true}' \
  http://localhost:3001/blog/meta
```

Update content:

```bash
curl -X POST -b /tmp/hong97-cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"blogId":"my-blog-id","content":"# Markdown or MDX content"}' \
  http://localhost:3001/blog/content
```

Delete a blog:

```bash
curl -X DELETE -b /tmp/hong97-cookies.txt \
  'http://localhost:3001/blog?blogId=my-blog-id'
```

## Frontend Service Names

Use `http` from `packages/fe/services/http.ts`:

```ts
await http.get('GetBlogList', { page: 1, pageSize: 10 })
await http.get('GetBlogMeta', { blogId })
await http.get('GetBlogContent', { blogId })
await http.get('GetBlogComments', { blogId })
await http.post('PostBlogView', { blogId })
await http.post('PostBlogLike', { blogId })
await http.post('PostBlogComment', { blogId, content, anonymous })
await http.post('PostBlogNew', { title, keywords, coverImg })
await http.put('PutBlogMeta', body)
await http.post('PostBlogContent', { blogId, content })
await http.delete('DeleteBlog', { blogId })
```

## Notes

- Use `$hong97-auth` before root-only authoring calls.
- `blogId` is called `key` in list responses and `blogId` in metadata/content APIs.
- Auth-required posts may need cookies for content or privileged edits.

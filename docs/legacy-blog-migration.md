# File-backed blog migration (2026-11-13)

The five existing posts in `pages/blog/markdowns/` are migrated in place to
MongoDB-backed MDX. Their blog IDs, publication `time`, database `createdAt` and
`updatedAt`, titles, tags, covers, pins, short links, comments, views and likes are
preserved. No new blog records are created. The existing source pages are retained
as a fallback and redirect to `/blog/id/<id>` only when online content exists,
including the current locale.

The existing editor component registry now supports the original 2024 Summary
blocks and Live Photo galleries. Migration changes only their MDX representation;
text, code, original media URLs and interactive implementations are retained.

## Article update dates

`lastUpdateTime` is reconstructed from substantive body diffs using the author
date, excluding SSR, locale and routing changes. Initial versions without later
body edits use their original publication time. A squashed 2024 Summary commit
has an author date earlier than its publication, so it is not evidence of a later
article update. Rebase/committer timestamps are not substituted for author dates.

- 2024 Summary, Mood Closet and Mood Closet II: original publication time.
- 给我的妙卡: 2025-10-01 23:01:39 +08:00, typo fix in `838c966`.
- Live Photos Get Support Now: 2025-06-14 22:30:11 +08:00, code example in `be55661`.

Migration uses raw MongoDB collection updates to avoid Mongoose timestamps and
normal save endpoints replacing historical times with the migration date. It
writes only content, `hasPublished: true`, `hidden2Public: false`, and historical
`lastUpdateTime`, with optimistic checks and a pre-write backup. Drafts/nonempty
online bodies must block migration. Compare all unaffected fields and list order
before and after. Audit files and rollback inputs are stored privately in MUCAA's
`output/hong97-legacy-migration-20261113/`.

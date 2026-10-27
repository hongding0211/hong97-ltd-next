# Group pinning

`PATCH /walkcalc/groups/:code/pin` accepts `{ "isPinned": true | false }` for the authenticated active member. It returns `{ "code": "AB12", "pinnedAt": 1234567890000 | null }`. Pin time lives on the membership; other users, ledger balances, and shared group activity timestamps are unaffected. Repeated Pin is idempotent; Unpin then Pin joins the end of the pin order. Membership authorization applies to both operations.

The existing `GET /walkcalc/groups/my` response includes `pinnedAt` on each summary. Filtering by search/archive/deletion/membership happens before pagination. Pinned groups come first in ascending pin time (code breaks simultaneous ties), followed by unpinned groups in descending `modifiedAt` order (code breaks ties). Page sizes and total counts retain their existing semantics. Group detail also returns the requesting member's `pinnedAt`; legacy memberships without the field are unpinned. No data backfill is required.

Clients consume the normal pages in order and do not fetch a separate pinned list. After a mutation they refresh page 1 and discard old pagination responses.

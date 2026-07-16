## Context

The Pages Router application intentionally uses `_app.getInitialProps` so the shared navigation avatar is correct in the initial server-rendered HTML. That behavior remains in scope and must not be weakened. Independent inefficiencies exist in translation configuration, blog document reads, and an import path that connects the runtime MDX renderer to editor-only extensions.

The blog model stores content and unbounded interaction arrays in the same MongoDB document. List and metadata paths currently hydrate full Mongoose documents even when they return only a small subset. The runtime MDX registry also imports the Tiptap node definition to reuse its component map, pulling Tiptap/ProseMirror into reading routes.

## Goals / Non-Goals

**Goals:**

- Stop production-time next-i18next resource reloading while retaining development translation refreshes.
- Reduce MongoDB data transfer and Mongoose hydration on blog read endpoints without changing response values or authorization behavior.
- Ensure blog reading routes depend only on runtime MDX components and not editor extensions.
- Demonstrate the changes with tests and a production bundle comparison.

**Non-Goals:**

- Remove `_app.getInitialProps`, alter server-rendered user/avatar behavior, or migrate to App Router.
- Change endpoint paths, DTOs, visibility rules, pagination, sorting, localization, or error behavior.
- Introduce ISR, CDN caching, new indexes, or change the blog data model.
- Redesign editor or reader UI.

## Decisions

### Keep translation reload configuration in next-i18next only

`reloadOnPrerender` is a next-i18next option, not a Next.js `i18n` option. It will be removed from `next.config.mjs` and expressed as a development-only boolean in `next-i18next.config.js`. This removes the Next.js configuration warning and avoids production reloads while preserving the existing development workflow.

### Project fields at the query boundary

Blog list, metadata, and content reads will select only the fields consumed by their existing response transformations. Read-only results will use `.lean()` where document mutation or instance methods are unnecessary. Authorization-derived response fields remain computed exactly as before.

Combining metadata and content endpoints was considered but rejected for this change because it would alter API boundaries and increase regression risk.

### Make the runtime component registry editor-independent

A new registry module will contain component metadata and runtime render components without importing Tiptap. The reader will consume this module directly. The editor's Tiptap node definition will import the same registry for validation and rendering metadata while continuing to own editor-only NodeView, input-rule, and paste-plugin behavior.

The runtime registry must preserve the existing `img`, `lazy.wrapped25`, and `lazy.foo` entries and lazy loader behavior.

## Risks / Trade-offs

- [Risk] A projection omits a field used indirectly in an existing response. → Keep projections adjacent to response construction and cover the affected service methods with focused tests or type/build verification.
- [Risk] Lean objects differ from Mongoose documents. → Use lean only on read-only code paths that access plain properties and update response typing where required.
- [Risk] Moving the registry changes dynamic import chunking or editor behavior. → Preserve component names, default props, import targets, and test both reader and editor production bundles.
- [Trade-off] `_app.getInitialProps` continues to make some routes dynamic. → Accepted to preserve the server-rendered avatar requirement; it is outside this change.

## Migration Plan

1. Apply configuration, query, and module-boundary changes independently.
2. Run relevant backend tests and the frontend production build.
3. Compare route classifications and gzip sizes against the recorded baseline.
4. Deploy through the normal release flow. Each change can be rolled back independently if translation loading, blog responses, or MDX rendering regress.

## Open Questions

None for this scoped change.

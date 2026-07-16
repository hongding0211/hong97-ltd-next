## Why

The frontend currently performs avoidable translation reloads, transfers oversized blog documents from MongoDB for read-only responses, and includes editor-only Tiptap/ProseMirror code in blog reading bundles. These costs can be reduced without changing user-visible behavior, API contracts, authentication, routing, or content rendering.

## What Changes

- Keep `reloadOnPrerender` in the next-i18next configuration only for development and remove it from the unsupported Next.js i18n configuration.
- Add explicit MongoDB projections and lean read results to blog list, metadata, and content queries while preserving their response shapes and authorization-dependent fields.
- Split the runtime MDX component registry from editor extensions so blog reading pages no longer import editor-only Tiptap/ProseMirror modules.
- Verify the existing frontend production build, relevant backend tests, route rendering behavior, and resulting reading-page bundle size.

## Capabilities

### New Capabilities

- `ssr-blog-delivery-optimization`: Defines behavior-preserving requirements for translation loading, blog read queries, and separation of reader and editor dependencies.

### Modified Capabilities

None.

## Impact

- Frontend configuration under `packages/fe/next.config.mjs` and `packages/fe/next-i18next.config.js`.
- Blog read paths in `packages/server/src/modules/blog/blog.service.ts`.
- Blog MDX runtime/editor module boundaries under `packages/fe/components/blog`.
- No endpoint, DTO, route, permission, locale, or rendered-content contract changes are intended.

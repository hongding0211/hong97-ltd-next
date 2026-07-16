## 1. Translation Configuration

- [x] 1.1 Remove the unsupported `reloadOnPrerender` key from Next.js i18n configuration
- [x] 1.2 Make next-i18next prerender reloads development-only

## 2. Blog Read Queries

- [x] 2.1 Add behavior-preserving projections and lean results to blog metadata and content reads
- [x] 2.2 Add behavior-preserving projections and lean results to blog list and pinned-list reads
- [x] 2.3 Add focused blog service tests for projected list, metadata, and content behavior

## 3. Reader and Editor Dependency Boundary

- [x] 3.1 Extract a Tiptap-independent runtime MDX component registry
- [x] 3.2 Update reader and editor modules to consume the shared registry without changing supported components

## 4. Verification

- [x] 4.1 Run relevant backend tests and static checks
- [x] 4.2 Run the frontend production build and confirm route/config behavior
- [x] 4.3 Compare blog reader and editor bundle sizes with the recorded baseline

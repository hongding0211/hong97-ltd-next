## ADDED Requirements

### Requirement: Environment-appropriate translation loading
The frontend SHALL configure translation resource reloading through next-i18next and SHALL enable prerender reloads only in development.

#### Scenario: Production build loads translations efficiently
- **WHEN** the frontend is built or rendered with `NODE_ENV=production`
- **THEN** next-i18next prerender resource reloading is disabled and Next.js receives only supported i18n configuration keys

#### Scenario: Development translation workflow is preserved
- **WHEN** the frontend runs with `NODE_ENV=development`
- **THEN** next-i18next prerender resource reloading remains enabled

### Requirement: Behavior-preserving blog read projections
Blog read operations SHALL retrieve only fields needed for their existing responses and authorization decisions while preserving endpoint response shapes, values, visibility rules, ordering, and pagination.

#### Scenario: Blog list response remains compatible
- **WHEN** a public or administrator client requests a blog list
- **THEN** the returned list, pinned items, counts, visibility-dependent fields, ordering, and pagination match the behavior before optimization

#### Scenario: Blog metadata response remains compatible
- **WHEN** a client requests blog metadata with or without an authenticated user
- **THEN** metadata counts, liked state, publication fields, and administrator-only fields match the behavior before optimization

#### Scenario: Blog content response remains compatible
- **WHEN** a client requests content for an existing blog
- **THEN** the endpoint returns the same blog identifier and content and retains the existing not-found behavior

### Requirement: Reader bundles exclude editor-only modules
The runtime MDX reader SHALL resolve all supported component registry entries without importing Tiptap, ProseMirror, editor NodeViews, or editor paste plugins.

#### Scenario: Existing runtime component renders
- **WHEN** published MDX references an existing non-lazy or lazy registered component
- **THEN** the reader resolves the same component name, default metadata, runtime component, and lazy loader behavior as before optimization

#### Scenario: Editor retains registry behavior
- **WHEN** the editor validates, inserts, or renders a registered MDX component node
- **THEN** it uses the shared registry while retaining its existing Tiptap input rules, NodeView, Markdown serialization, and paste behavior

### Requirement: SSR user rendering remains unchanged
The optimization SHALL retain the current initial server-rendered user information used by the shared navigation.

#### Scenario: Authenticated initial request
- **WHEN** an authenticated user directly requests a page using the shared application layout
- **THEN** the initial server-rendered navigation continues to receive that user's information for the avatar

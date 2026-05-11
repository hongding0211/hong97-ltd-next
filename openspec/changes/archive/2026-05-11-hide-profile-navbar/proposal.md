## Why

The SSO profile page can be opened from external login flows where it is acting as an account-consumption surface rather than a normal site page. In those cases, showing the global navbar exposes unrelated hong97.ltd navigation and makes the embedded/external login journey feel like a full website entry point.

## What Changes

- Add an `AppLayout` prop that can hide the top navbar while preserving the rest of the layout.
- Keep the footer visible when the navbar is hidden.
- Make `/sso/profile` read `hideNavBar=1` and pass the resulting state into `AppLayout`.
- Preserve existing default behavior for all pages that do not opt into hiding the navbar.

## Capabilities

### New Capabilities
- `profile-navigation-visibility`: Defines when the SSO profile page hides global navigation for external or embedded login flows.

### Modified Capabilities

## Impact

- Affected frontend code: `packages/fe/components/app-layout/AppLayout.tsx`, `packages/fe/pages/sso/profile.tsx`.
- No backend API, persistence, or dependency changes are expected.

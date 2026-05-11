## 1. Layout

- [x] 1.1 Add an optional `hideNavBar` prop to `packages/fe/components/app-layout/AppLayout.tsx`.
- [x] 1.2 Render the top navbar only when `hideNavBar` is not enabled.
- [x] 1.3 Suppress the mobile menu overlay when `hideNavBar` is enabled.
- [x] 1.4 Update the content min-height resize calculation so hidden-navbar pages do not reserve the navbar height.

## 2. Profile Page

- [x] 2.1 Read the profile page query state from Next.js router.
- [x] 2.2 Treat only `hideNavBar=1` as enabled.
- [x] 2.3 Pass the derived `hideNavBar` value into `AppLayout`.

## 3. Verification

- [x] 3.1 Verify `/sso/profile` still renders the navbar and footer by default.
- [x] 3.2 Verify `/sso/profile?hideNavBar=1` hides the navbar and mobile menu affordance while keeping profile content and footer visible.
- [x] 3.3 Run the relevant frontend type/lint check if available.

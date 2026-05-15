## Context

`AppLayout` currently always renders the sticky top navbar and then renders page content plus the footer. `/sso/profile` uses `AppLayout` as a normal site page, but the same page can also be reached from external login flows where only account/profile management should be exposed.

The desired behavior is a page-level opt-in: callers that pass `hideNavBar=1` to `/sso/profile` get the profile content without the site navbar, while the footer remains present.

## Goals / Non-Goals

**Goals:**

- Add a reusable `AppLayout` prop for hiding the navbar.
- Make `/sso/profile?hideNavBar=1` consume that prop.
- Keep existing navbar behavior unchanged for all pages that do not opt in.
- Keep the footer visible when the navbar is hidden.

**Non-Goals:**

- Do not hide the footer.
- Do not introduce a separate profile layout or duplicate `AppLayout`.
- Do not change authentication, profile editing, logout, locale, or SSO API behavior.
- Do not make hidden navbar behavior implicit for all SSO routes.

## Decisions

1. Add an optional `hideNavBar?: boolean` prop to `AppLayout`.
   - Rationale: the layout already owns navbar rendering, so a prop keeps the behavior reusable and avoids page-specific navbar branching outside the layout.
   - Alternative considered: create a separate embedded layout for SSO pages. This would duplicate layout behavior and make footer/content spacing easier to drift.

2. Gate both desktop and mobile navbar surfaces behind the same prop.
   - Rationale: hiding the `<nav>` alone is not enough if the mobile menu overlay can remain open; the `showMenu` overlay must also be suppressed when the navbar is hidden.
   - Alternative considered: hide only the desktop nav. That would leave mobile external flows able to reveal site navigation, which is the core behavior being avoided.

3. Let `/sso/profile` interpret only `hideNavBar=1` as enabled.
   - Rationale: this gives external callers a stable URL switch while keeping defaults unchanged.
   - Alternative considered: treat any truthy `hideNavBar` query value as enabled. A strict `1` avoids accidental hiding from unrelated query strings.

## Risks / Trade-offs

- Hidden navbar removes the normal profile-page navigation path back to other site areas -> Mitigation: scope the behavior to the explicit query parameter and leave the footer visible.
- AppLayout's content height currently subtracts the navbar height in a resize effect -> Mitigation: update that calculation to account for hidden navbar so the profile page does not reserve invisible top-nav height.
- Query parsing in Next.js can return arrays during hydration -> Mitigation: handle only the string value `1`; array values do not enable hidden navbar unless implementation explicitly normalizes the first value.

## Migration Plan

- Add the `AppLayout` prop with a default of `false`.
- Update `/sso/profile` to pass `hideNavBar` when `router.query.hideNavBar === '1'`.
- No data migration or backend deployment order is required.

## Open Questions

- None.

## ADDED Requirements

### Requirement: Profile can hide global navigation
The system SHALL hide global site navigation on the SSO profile page when the page is opened with the explicit `hideNavBar=1` query parameter.

#### Scenario: External profile flow hides navbar
- **WHEN** an authenticated user opens `/sso/profile?hideNavBar=1`
- **THEN** the profile page renders without the top navbar or mobile navigation menu affordance
- **AND** the profile page still renders its profile management content
- **AND** the footer remains visible

#### Scenario: Normal profile flow keeps navbar
- **WHEN** an authenticated user opens `/sso/profile` without `hideNavBar=1`
- **THEN** the profile page renders with the existing top navbar behavior
- **AND** the footer remains visible

### Requirement: Layout supports opt-in navbar hiding
The shared app layout SHALL provide an opt-in property for hiding its top navbar while preserving existing default layout behavior.

#### Scenario: Layout hides only the navbar
- **WHEN** a page renders the shared app layout with navbar hiding enabled
- **THEN** the layout does not render the top navbar
- **AND** the layout does not render the mobile menu overlay
- **AND** the layout still renders page content and the footer

#### Scenario: Layout default behavior remains unchanged
- **WHEN** a page renders the shared app layout without navbar hiding enabled
- **THEN** the layout renders the top navbar, page content, and footer as before

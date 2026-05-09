# walkcalc-server Specification

## Purpose
Define the migrated backend contract for walkcalc group, record, and participant APIs using the current server authentication and user services.

## Requirements
### Requirement: Walkcalc APIs require current auth
The system SHALL protect all walkcalc group, record, and walkcalc user-helper APIs with the current server authentication mechanism.

#### Scenario: Authenticated request is accepted
- **WHEN** a request to a walkcalc endpoint includes a valid current access token or permanent API token
- **THEN** the request is handled as the authenticated current user

#### Scenario: Unauthenticated request is rejected
- **WHEN** a request to a walkcalc endpoint omits valid current authentication
- **THEN** the request is rejected as unauthorized

#### Scenario: Legacy login endpoints are not added
- **WHEN** the walkcalc server migration is complete
- **THEN** the server does not expose migrated `/user/login`, `/user/refreshToken`, SSO, WeChat, or legacy token-wrapping endpoints for walkcalc

### Requirement: Walkcalc user data comes from current user service
The system SHALL resolve formal walkcalc participant data from the current auth user service and SHALL keep temporary users as group-local participants.

#### Scenario: Current user profile is returned
- **WHEN** an authenticated user requests their walkcalc profile helper
- **THEN** the response uses the current auth user's `userId`, profile name, and avatar data

#### Scenario: Multiple formal users are resolved
- **WHEN** a request asks for formal participants by current `userId`
- **THEN** the response returns matching current users without exposing auth provider secrets or password data

#### Scenario: Users can be searched by display name
- **WHEN** an authenticated user searches walkcalc users by a non-empty name query
- **THEN** the response returns at most a bounded list of matching current users with public profile fields

#### Scenario: Empty user search returns no results
- **WHEN** an authenticated user searches walkcalc users without a name query
- **THEN** the response returns an empty list

### Requirement: Users can manage walkcalc groups
The system SHALL allow authenticated users to create, join, list, read, archive, unarchive, rename, invite users to, and dismiss walkcalc groups according to owner/member authorization.

#### Scenario: Create group
- **WHEN** an authenticated user creates a group with a valid name
- **THEN** the system creates a group with a unique join code
- **AND** the current user is recorded as owner and initial member with zero debt and zero cost

#### Scenario: Join group
- **WHEN** an authenticated user joins an existing group by join code
- **THEN** the system adds the user as a member with zero debt and zero cost

#### Scenario: Duplicate join is rejected
- **WHEN** an authenticated user attempts to join a group they already belong to
- **THEN** the request is rejected without adding a duplicate member

#### Scenario: Owner dismisses group
- **WHEN** the owner dismisses one of their groups
- **THEN** the group is removed
- **AND** non-owner members can no longer read that group

#### Scenario: Non-owner dismiss is rejected
- **WHEN** a member who is not the owner attempts to dismiss a group
- **THEN** the request is rejected

#### Scenario: Add temporary user
- **WHEN** the group owner adds a temporary user with a unique name
- **THEN** the system adds a group-local participant with a generated UUID, zero debt, and zero cost

#### Scenario: Duplicate temporary user name is rejected
- **WHEN** the group owner adds a temporary user with a name already used by another temporary user in the group
- **THEN** the request is rejected

#### Scenario: Invite formal users
- **WHEN** a group owner or member invites current users who are not already members
- **THEN** the system adds those users as members with zero debt and zero cost

#### Scenario: List my groups
- **WHEN** an authenticated user lists their groups
- **THEN** the response includes groups where the user is owner or member
- **AND** groups are sorted by most recently modified first
- **AND** the response includes member public profile data with member debt and cost

#### Scenario: Read group detail
- **WHEN** a group owner or member reads a group by join code
- **THEN** the response includes group metadata, temporary users, archive state, `isOwner`, and member public profile data with member debt and cost

#### Scenario: Non-member group read is rejected
- **WHEN** an authenticated user who is not owner or member reads a group
- **THEN** the request is rejected

#### Scenario: Archive and unarchive group
- **WHEN** a group owner or member archives or unarchives a group
- **THEN** the system adds or removes the current user from the group's archived-user list

#### Scenario: Owner renames group
- **WHEN** the group owner changes the group name to a valid non-empty value
- **THEN** the system updates the group name

#### Scenario: Non-owner rename is rejected
- **WHEN** a member who is not the owner attempts to rename a group
- **THEN** the request is rejected

### Requirement: Users can manage walkcalc records
The system SHALL allow group owners and members to add, delete, update, read, and list records while maintaining member and temporary-user balance totals.

#### Scenario: Add expense record
- **WHEN** a group owner or member adds a record with a positive or negative non-zero paid amount, a payer, and at least one participant in `forWhom`
- **THEN** the system creates a record with a generated `recordId`
- **AND** each `forWhom` participant's debt decreases by `paid / forWhom.length`
- **AND** each `forWhom` participant's cost increases by `paid / forWhom.length` unless the record resolves debt
- **AND** the payer's debt increases by `paid`
- **AND** the group modified time is updated

#### Scenario: Add record with no participants is rejected
- **WHEN** a group owner or member adds a record with an empty `forWhom` list
- **THEN** the request is rejected without changing balances

#### Scenario: Add zero-amount record is rejected
- **WHEN** a group owner or member adds a record with `paid` equal to zero
- **THEN** the request is rejected without changing balances

#### Scenario: Add record beyond group limit is rejected
- **WHEN** a group already has 5,000 records and a user adds another record
- **THEN** the request is rejected without changing balances

#### Scenario: Non-member add record is rejected
- **WHEN** an authenticated user who is not owner or member adds a record to a group
- **THEN** the request is rejected without changing balances

#### Scenario: Delete record
- **WHEN** a group owner or member deletes an existing record
- **THEN** the system removes the record
- **AND** reverses the deleted record's debt and cost effects for formal and temporary participants
- **AND** updates the group modified time

#### Scenario: Delete missing record is rejected
- **WHEN** a group owner or member deletes a record that does not exist in the group
- **THEN** the request is rejected without changing balances

#### Scenario: Update normal record
- **WHEN** a group owner or member updates an existing non-debt-resolution record
- **THEN** the system reverses the prior record's balance effects
- **AND** applies the updated record's balance effects
- **AND** updates the record fields, `modifiedAt`, and modifier identity

#### Scenario: Debt-resolution record update is rejected
- **WHEN** a group owner or member attempts to update a record marked as debt resolution
- **THEN** the request is rejected without changing balances

#### Scenario: Read record
- **WHEN** a group owner or member reads a record by `recordId`
- **THEN** the response includes the record fields without exposing database internals

#### Scenario: List group records
- **WHEN** a group owner or member lists records for a group
- **THEN** the response returns the group's records sorted by newest creation time first
- **AND** pagination limits the returned records

#### Scenario: Non-member record read is rejected
- **WHEN** an authenticated user who is not owner or member reads or lists records for a group
- **THEN** the request is rejected

### Requirement: Walkcalc migration excludes push delivery
The system SHALL NOT migrate or invoke the legacy push notification service from walkcalc flows.

#### Scenario: Join does not send push
- **WHEN** a user joins a walkcalc group
- **THEN** the group membership is updated without calling an APNs, Bark, or legacy push service

#### Scenario: Invite does not send push
- **WHEN** users are invited to a walkcalc group
- **THEN** the group membership is updated without calling an APNs, Bark, or legacy push service

#### Scenario: Record changes do not send push
- **WHEN** a walkcalc record is added, deleted, or updated
- **THEN** balances and records are updated without calling an APNs, Bark, or legacy push service

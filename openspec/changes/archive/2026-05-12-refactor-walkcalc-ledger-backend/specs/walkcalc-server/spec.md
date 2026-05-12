## MODIFIED Requirements

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

#### Scenario: Formal participant display data is not copied
- **WHEN** the system stores a formal user as a WalkCalc participant
- **THEN** it stores only the formal user identity needed for membership and accounting
- **AND** profile name and avatar are resolved from the current user service when building responses

### Requirement: Users can manage walkcalc groups
The system SHALL allow authenticated users to create, join, list, read, archive, unarchive, rename, invite users to, and dismiss walkcalc groups according to owner/member authorization and backend ledger constraints.

#### Scenario: Create group
- **WHEN** an authenticated user creates a group with a valid name
- **THEN** the system creates a group with a unique join code
- **AND** the current user is recorded as owner and initial participant with zero balance and zero statistics

#### Scenario: Join group
- **WHEN** an authenticated user joins an existing group by join code
- **THEN** the system adds the user as a formal participant with zero balance and zero statistics

#### Scenario: Duplicate join is rejected
- **WHEN** an authenticated user attempts to join a group they already belong to
- **THEN** the request is rejected without adding a duplicate participant

#### Scenario: Owner dismisses group
- **WHEN** the owner dismisses one of their groups
- **THEN** the group is removed from normal WalkCalc access
- **AND** non-owner members can no longer read that group

#### Scenario: Non-owner dismiss is rejected
- **WHEN** a member who is not the owner attempts to dismiss a group
- **THEN** the request is rejected

#### Scenario: Add temporary user
- **WHEN** the group owner adds a temporary user with a unique name
- **THEN** the system adds a group-local participant with a generated participant id, zero balance, and zero statistics

#### Scenario: Duplicate temporary user name is rejected
- **WHEN** the group owner adds a temporary user with a name already used by another temporary user in the group
- **THEN** the request is rejected

#### Scenario: Invite formal users
- **WHEN** a group owner or member invites current users who are not already participants
- **THEN** the system adds those users as formal participants with zero balance and zero statistics

#### Scenario: List my groups
- **WHEN** an authenticated user lists their groups
- **THEN** the response includes groups where the user is a formal participant
- **AND** groups are sorted by most recently modified first
- **AND** the response includes the current user's backend-authoritative group balance and statistics

#### Scenario: Home summary includes all groups
- **WHEN** an authenticated user requests their WalkCalc home summary
- **THEN** the response includes total balance across all groups they participate in
- **AND** archived groups and groups outside the current pagination page are included in the total

#### Scenario: Read group detail
- **WHEN** a group owner or member reads a group by join code
- **THEN** the response includes group metadata, temporary users, archive state, `isOwner`, participant identities, public profile data for formal participants, and backend-authoritative participant projections

#### Scenario: Non-member group read is rejected
- **WHEN** an authenticated user who is not owner or member reads a group
- **THEN** the request is rejected

#### Scenario: Archive settled group
- **WHEN** a group owner or member archives a group where every participant balance is zero
- **THEN** the system adds the current user to the group's archived-user list

#### Scenario: Archive unsettled group is rejected
- **WHEN** a group owner or member archives a group where any participant balance is non-zero
- **THEN** the request is rejected
- **AND** the archived-user list is unchanged

#### Scenario: Unarchive group
- **WHEN** a group owner or member unarchives a group
- **THEN** the system removes the current user from the group's archived-user list

#### Scenario: Owner renames group
- **WHEN** the group owner changes the group name to a valid non-empty value
- **THEN** the system updates the group name

#### Scenario: Non-owner rename is rejected
- **WHEN** a member who is not the owner attempts to rename a group
- **THEN** the request is rejected

### Requirement: Users can manage walkcalc records
The system SHALL allow group owners and members to add, delete, update, read, search, and list expense and settlement records while maintaining backend-authoritative participant projections.

#### Scenario: Add expense record
- **WHEN** a group owner or member adds an expense record with a positive amount, a payer, and at least one participant
- **THEN** the system creates a record with a generated record id
- **AND** each participant's balance decreases by their exact split share
- **AND** each participant's expense share increases by their exact split share
- **AND** the payer's balance and paid total increase by the full amount
- **AND** each involved participant's record count increases by one
- **AND** the group modified time is updated

#### Scenario: Add settlement record
- **WHEN** the backend creates a settlement record with a positive amount, sender, and receiver
- **THEN** the sender's balance increases by the amount
- **AND** the receiver's balance decreases by the amount
- **AND** sender settlement out, receiver settlement in, and both record counts are updated
- **AND** expense share is unchanged
- **AND** the group modified time is updated

#### Scenario: Add record with no participants is rejected
- **WHEN** a group owner or member adds an expense record with an empty participant list
- **THEN** the request is rejected without changing records or projections

#### Scenario: Add non-positive record is rejected
- **WHEN** a group owner or member adds an expense or settlement record with an amount less than or equal to zero
- **THEN** the request is rejected without changing records or projections

#### Scenario: Non-member add record is rejected
- **WHEN** an authenticated user who is not owner or member adds a record to a group
- **THEN** the request is rejected without changing records or projections

#### Scenario: Delete record
- **WHEN** a group owner or member deletes an existing record
- **THEN** the system hard deletes the record
- **AND** reverses the deleted record's exact projection effects for all involved participants
- **AND** updates the group modified time

#### Scenario: Delete missing record is rejected
- **WHEN** a group owner or member deletes a record that does not exist in the group
- **THEN** the request is rejected without changing projections

#### Scenario: Update expense record
- **WHEN** a group owner or member updates an existing expense record
- **THEN** the system reverses the prior record's exact projection effects
- **AND** replaces the record fields
- **AND** applies the updated record's exact projection effects
- **AND** updates the record `updatedAt`, modifier identity, and group modified time

#### Scenario: Update settlement record
- **WHEN** a group owner or member updates an existing settlement record
- **THEN** the system reverses the prior settlement effects
- **AND** replaces the settlement fields
- **AND** applies the updated settlement effects
- **AND** updates the record `updatedAt`, modifier identity, and group modified time

#### Scenario: Read record
- **WHEN** a group owner or member reads a record by record id
- **THEN** the response includes the record fields with semantic money names without exposing database internals

#### Scenario: List group records
- **WHEN** a group owner or member lists records for a group
- **THEN** the response returns the group's records sorted by newest creation time first
- **AND** pagination limits the returned records
- **AND** the total reflects all matching records before pagination

#### Scenario: Search group records
- **WHEN** a group owner or member searches records by supported note or category criteria
- **THEN** the backend filters matching records before pagination
- **AND** the search does not depend on records already loaded by the client

#### Scenario: List participant records
- **WHEN** a group owner or member lists records for a participant
- **THEN** the response includes records where the participant is involved as expense payer, expense participant, settlement sender, or settlement receiver
- **AND** the total reflects all matching participant records before pagination

#### Scenario: Non-member record read is rejected
- **WHEN** an authenticated user who is not owner or member reads, searches, or lists records for a group
- **THEN** the request is rejected

### Requirement: Users can inspect and resolve walkcalc balances
The system SHALL provide backend-authoritative balance views, participant record counts, settlement suggestions, and settlement resolution operations for group members.

#### Scenario: List balances
- **WHEN** a group owner or member lists balances for a group
- **THEN** the response includes every formal and temporary participant
- **AND** each participant includes balance, expense share, paid total, record count, settlement in, and settlement out from backend projections

#### Scenario: Balance detail uses selected participant
- **WHEN** a group owner or member opens a participant balance detail
- **THEN** the backend returns the selected participant's projection
- **AND** the backend returns that participant's records with accurate pagination total

#### Scenario: Suggested settlement is calculated by backend
- **WHEN** a group owner or member requests suggested settlement
- **THEN** the backend calculates the suggestion from current participant projections
- **AND** the response contains transfers from participants with negative balances to participants with positive balances

#### Scenario: Resolve suggested settlement
- **WHEN** a group owner or member resolves settlement for a group
- **THEN** the backend creates settlement records based on current participant projections
- **AND** all participant balances become zero if no concurrent change prevents settlement

#### Scenario: Non-member balance access is rejected
- **WHEN** an authenticated user who is not owner or member requests balances or settlement for a group
- **THEN** the request is rejected

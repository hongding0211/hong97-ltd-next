## MODIFIED Requirements

### Requirement: Users can manage walkcalc records
The system SHALL allow group owners and members to add, delete, update, read,
search, and list expense and settlement records while maintaining
backend-authoritative participant projections and structured validation
responses.

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

#### Scenario: Add record with invalid ledger participants is rejected
- **WHEN** a group owner or member adds or updates a record with duplicate participants, empty participant ids, a missing payer, missing settlement parties, or identical settlement sender and receiver
- **THEN** the request is rejected with `isSuccess` false in the structured response envelope
- **AND** the request does not fail as an unhandled HTTP 500
- **AND** records and projections are unchanged

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
- **AND** updates the record fields while preserving the existing `recordId`, stored Mongo `_id`, `createdBy`, and `createdAt`
- **AND** applies the updated record's exact projection effects
- **AND** updates the record `updatedAt`, modifier identity, and group modified time
- **AND** leaves record and projection state unchanged if any update step fails

#### Scenario: Update settlement record
- **WHEN** a group owner or member updates an existing settlement record
- **THEN** the system reverses the prior settlement effects
- **AND** updates the settlement fields while preserving the existing `recordId`, stored Mongo `_id`, `createdBy`, and `createdAt`
- **AND** applies the updated settlement effects
- **AND** updates the record `updatedAt`, modifier identity, and group modified time
- **AND** leaves record and projection state unchanged if any update step fails

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

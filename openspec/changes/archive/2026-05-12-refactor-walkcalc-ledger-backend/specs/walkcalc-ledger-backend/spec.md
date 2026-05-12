## ADDED Requirements

### Requirement: Money APIs use semantic decimal strings
The system SHALL expose WalkCalc money fields as semantic decimal strings and SHALL keep exact integer-cent arithmetic as an internal backend detail.

#### Scenario: Money response uses semantic field names
- **WHEN** a WalkCalc API returns a record amount or participant projection
- **THEN** the response uses fields such as `amount`, `balance`, `expenseShare`, and `paidTotal`
- **AND** the response does not expose `Minor` money field names

#### Scenario: Money input is validated
- **WHEN** a client submits a money amount
- **THEN** the backend accepts only canonical decimal money strings with at most two fractional digits
- **AND** the backend rejects invalid, zero, negative, non-finite, or floating-point-only money values for positive-amount operations

#### Scenario: Money splitting is exact
- **WHEN** an expense amount is split across multiple participants
- **THEN** the backend allocates integer cents deterministically
- **AND** the sum of all split shares exactly equals the original amount

### Requirement: Ledger storage is normalized and indexed
The system SHALL store WalkCalc groups, participants, records, and participant projections separately so queries can use backend indexes instead of loading full group documents.

#### Scenario: Records are stored outside group metadata
- **WHEN** a group contains many records
- **THEN** record list, search, and participant-detail queries read from a record collection scoped by group
- **AND** the backend does not require loading an embedded full record array from the group document

#### Scenario: Participant membership supports group list queries
- **WHEN** an authenticated formal user lists their WalkCalc groups
- **THEN** the backend locates groups through indexed participant membership data
- **AND** the result is not limited by records loaded by the native client

#### Scenario: Formal profile data is resolved from user service
- **WHEN** a response includes formal WalkCalc participants
- **THEN** the backend resolves public profile data from the current user service by `userId`
- **AND** WalkCalc participant storage does not duplicate formal user names or avatars

### Requirement: Participant projections are authoritative
The system SHALL maintain a participant projection for each participant in each group and SHALL use it as the authoritative source for balances and participant statistics.

#### Scenario: Projection fields are maintained
- **WHEN** the backend reads a participant balance view
- **THEN** each participant projection includes `balance`, `expenseShare`, `paidTotal`, `recordCount`, `settlementIn`, and `settlementOut`

#### Scenario: Balance sum remains zero
- **WHEN** a group has any number of expense and settlement records
- **THEN** the sum of `balance` across all group participants is exactly zero

#### Scenario: Expense share excludes settlement records
- **WHEN** a settlement record is created
- **THEN** the sender and receiver balances are updated
- **AND** neither participant's `expenseShare` changes

#### Scenario: Record count includes settlements
- **WHEN** a participant appears in an expense or settlement record
- **THEN** that participant's `recordCount` includes the record exactly once

### Requirement: Record mutations update projections transactionally
The system SHALL add, update, and hard delete records through backend transactions that keep records and participant projections consistent.

#### Scenario: Add expense record applies projection effects
- **WHEN** a group member creates an expense with a positive amount, payer, and non-empty participants
- **THEN** the backend creates the record
- **AND** applies exact balance, expense share, paid total, and record count changes for involved participants in the same transaction

#### Scenario: Add settlement record applies transfer effects
- **WHEN** the backend creates a settlement from one participant to another with a positive amount
- **THEN** the sender's balance increases by the amount
- **AND** the receiver's balance decreases by the amount
- **AND** settlement totals and record counts are updated without changing expense share

#### Scenario: Update record replaces old effects
- **WHEN** a group member updates an existing record
- **THEN** the backend reverses the previous record's projection effects
- **AND** replaces the record fields
- **AND** applies the updated record's projection effects in the same transaction

#### Scenario: Delete record hard deletes and reverses effects
- **WHEN** a group member deletes an existing record
- **THEN** the backend reverses that record's projection effects
- **AND** hard deletes the record
- **AND** leaves no deleted record in normal record queries

#### Scenario: Failed mutation is atomic
- **WHEN** validation, authorization, or persistence fails during a record mutation
- **THEN** no partial record or projection change is committed

### Requirement: Backend provides client view APIs
The system SHALL provide backend APIs that match WalkCalc client consumption surfaces without requiring clients to infer full-data facts from paginated records.

#### Scenario: Home summary includes total balance
- **WHEN** an authenticated user loads the home summary
- **THEN** the backend returns the user's total balance across all joined groups
- **AND** archived groups and groups not included in the current page are included in that total

#### Scenario: Balances list includes full record counts
- **WHEN** a group member opens the balances view
- **THEN** the backend returns every group participant with their projection and full `recordCount`
- **AND** the count includes expense and settlement records from all pages

#### Scenario: Participant records are filtered on the backend
- **WHEN** a group member opens a participant balance detail
- **THEN** the backend returns records where that participant is involved
- **AND** the backend returns an accurate total before pagination

### Requirement: Settlement suggestions are backend-authoritative
The system SHALL compute settlement suggestions from current participant projections on the backend.

#### Scenario: Suggestion clears balances
- **WHEN** a group has non-zero participant balances
- **THEN** the backend returns settlement transfers from participants with negative balances to participants with positive balances
- **AND** applying the returned transfers would make every participant balance zero

#### Scenario: Suggestion does not trust client-calculated balances
- **WHEN** a client requests settlement suggestions
- **THEN** the backend uses persisted participant projections as input
- **AND** ignores client-provided record lists or balance values

#### Scenario: Resolve creates settlement records from current state
- **WHEN** a group member resolves suggested settlements
- **THEN** the backend re-reads current participant projections
- **AND** creates settlement records and projection changes from the current backend state

#### Scenario: Exact strategy is bounded
- **WHEN** the number of non-zero participants is within the configured exact-settlement limit
- **THEN** the backend returns a settlement plan with the minimum number of transfers

### Requirement: Archive requires settled group balances
The system SHALL allow group archive only when the entire group is financially settled.

#### Scenario: Settled group can be archived
- **WHEN** every participant in a group has `balance` equal to `0.00`
- **THEN** a group member can archive the group for themselves

#### Scenario: Unsettled group archive is rejected
- **WHEN** any participant in a group has a non-zero `balance`
- **THEN** an archive request is rejected
- **AND** the group's archive state is unchanged

## MODIFIED Requirements

### Requirement: Record mutations update projections transactionally
The system SHALL add, update, and hard delete records through backend
transactions or explicit compensation that keep records and participant
projections consistent.

#### Scenario: Add expense record applies projection effects
- **WHEN** a group member creates an expense with a positive amount, payer, and non-empty participants
- **THEN** the backend creates the record
- **AND** applies exact balance, expense share, paid total, and record count changes for involved participants in the same transaction or compensated mutation

#### Scenario: Add settlement record applies transfer effects
- **WHEN** the backend creates a settlement from one participant to another with a positive amount
- **THEN** the sender's balance increases by the amount
- **AND** the receiver's balance decreases by the amount
- **AND** settlement totals and record counts are updated without changing expense share

#### Scenario: Update record replaces old effects
- **WHEN** a group member updates an existing record
- **THEN** the backend preserves the existing record identity and original creation metadata
- **AND** reverses the previous record's projection effects
- **AND** persists the updated record fields without replacing the stored Mongo `_id`
- **AND** applies the updated record's projection effects in the same transaction or compensated mutation

#### Scenario: Delete record hard deletes and reverses effects
- **WHEN** a group member deletes an existing record
- **THEN** the backend reverses that record's projection effects
- **AND** hard deletes the record
- **AND** leaves no deleted record in normal record queries

#### Scenario: Failed mutation is atomic
- **WHEN** validation, authorization, or persistence fails during a record mutation
- **THEN** no partial record or projection change is committed
- **AND** this guarantee holds when MongoDB transactions are unavailable by using explicit compensation or an equivalent safe ordering

## ADDED Requirements

### Requirement: Ledger validation errors are business errors
The system SHALL report invalid ledger input as structured WalkCalc business
errors rather than generic server failures.

#### Scenario: Duplicate expense participants are rejected
- **WHEN** a client submits an expense with duplicate `participantIds`
- **THEN** the backend rejects the request with a structured unsuccessful response
- **AND** the HTTP response is not an unhandled 500 caused by a plain runtime error

#### Scenario: Invalid ledger participants are rejected
- **WHEN** a client submits empty participant ids, a missing expense payer, missing settlement parties, or the same settlement sender and receiver
- **THEN** the backend rejects the request with a structured WalkCalc business error
- **AND** records and projections are unchanged

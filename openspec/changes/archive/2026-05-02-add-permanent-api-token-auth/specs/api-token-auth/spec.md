## ADDED Requirements

### Requirement: Root users can create permanent API tokens
The system SHALL allow an authenticated root user to create permanent API tokens for their own account.

#### Scenario: Create token returns one-time secret
- **WHEN** an authenticated root user creates an API token with a name
- **THEN** the response includes token metadata and the raw `apiToken` value
- **AND** the raw token is shown only in the create response
- **AND** the stored database record contains only a hash of the raw token

#### Scenario: Non-root create is rejected
- **WHEN** an authenticated non-root user creates an API token
- **THEN** the request is rejected with a forbidden response

### Requirement: Root users can list their API token metadata
The system SHALL allow an authenticated root user to list API tokens owned by their own account.

#### Scenario: List excludes raw secrets
- **WHEN** an authenticated root user lists API tokens
- **THEN** each item includes metadata such as `tokenId`, `name`, `tokenPrefix`, `createdAt`, and `lastUsedAt`
- **AND** no raw token secret is included

### Requirement: Root users can revoke API tokens
The system SHALL allow an authenticated root user to revoke an API token they own.

#### Scenario: Delete token prevents future API token auth
- **WHEN** an authenticated root user deletes one of their API tokens
- **THEN** that token no longer authenticates protected API requests

### Requirement: API tokens authenticate protected API requests
The system SHALL authenticate protected API requests with valid API tokens supplied as bearer credentials.

#### Scenario: Valid API token grants access
- **WHEN** a protected API request includes `Authorization: Bearer <apiToken>` for an existing API token
- **THEN** the request is authenticated as the token owner
- **AND** the token's `lastUsedAt` is updated

#### Scenario: Invalid API token is rejected
- **WHEN** a protected API request includes an unknown or revoked API token
- **THEN** the request is rejected with an unauthorized response

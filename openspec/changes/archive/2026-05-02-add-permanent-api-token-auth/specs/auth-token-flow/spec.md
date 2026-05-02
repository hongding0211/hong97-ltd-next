## MODIFIED Requirements

### Requirement: Protected requests use access tokens
The system SHALL authenticate protected API requests with a valid access token or a valid permanent API token.

#### Scenario: Valid access token grants access
- **WHEN** a protected API request includes a valid access-token cookie or `Authorization: Bearer` access token
- **THEN** the request is authenticated as the token subject

#### Scenario: Valid API token grants access
- **WHEN** a protected API request includes `Authorization: Bearer <apiToken>` for an existing API token
- **THEN** the request is authenticated as the API token owner

#### Scenario: Missing access token is rejected
- **WHEN** a protected API request omits an access token and the path is not ignored or soft-ignored
- **THEN** the request is rejected with an unauthorized response

#### Scenario: Refresh token cannot authorize protected APIs
- **WHEN** a protected API request includes only a refresh-token cookie
- **THEN** the request is rejected with an unauthorized response

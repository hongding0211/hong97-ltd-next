# auth-token-flow Specification

## Purpose
TBD - created by archiving change standardize-auth-token-flow. Update Purpose after archive.
## Requirements
### Requirement: Login issues distinct auth credentials
The system SHALL issue a short-lived access token and a longer-lived refresh credential when a user logs in successfully through any supported login provider.

#### Scenario: Successful local login
- **WHEN** a user submits valid local login credentials
- **THEN** the response data includes `accessToken`, `accessTokenExpiresIn`, `refreshTokenExpiresIn`, and `user`
- **AND** the response data does not include a `token` field
- **AND** the server sets separate httpOnly cookies for the access token and refresh token

#### Scenario: Successful GitHub OAuth login
- **WHEN** a user completes GitHub OAuth login successfully
- **THEN** the server sets separate httpOnly cookies for the access token and refresh token
- **AND** the issued access token authenticates protected API requests as the local user linked to the GitHub account
- **AND** the refresh-token cookie can be used with the standard refresh endpoint

#### Scenario: Refresh token is not exposed to browser JavaScript
- **WHEN** login succeeds
- **THEN** the response body does not include the refresh token value
- **AND** the refresh token is available only through the refresh-token cookie

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

### Requirement: Refresh rotates credentials
The system SHALL refresh authentication only from a valid refresh token and SHALL rotate the refresh credential on each successful refresh.

#### Scenario: Valid refresh token renews access
- **WHEN** a client calls the refresh endpoint with a valid, unexpired, unrevoked refresh-token cookie
- **THEN** the response data includes a new `accessToken`, `accessTokenExpiresIn`, and `refreshTokenExpiresIn`
- **AND** the server sets a new access-token cookie
- **AND** the server rotates the refresh-token cookie

#### Scenario: Refresh token reuse is rejected
- **WHEN** a client presents a refresh token that was already rotated or no longer matches the active stored token hash
- **THEN** the refresh request is rejected with an unauthorized response
- **AND** the related refresh session is revoked

#### Scenario: Missing or expired refresh token is rejected
- **WHEN** a client calls the refresh endpoint without a refresh token or with an expired refresh token
- **THEN** the refresh request is rejected with an unauthorized response

### Requirement: Logout invalidates the active session
The system SHALL clear access and refresh cookies and invalidate the active refresh session when a user logs out.

#### Scenario: Logout clears auth cookies
- **WHEN** a client calls logout
- **THEN** the server clears both access-token and refresh-token cookies

#### Scenario: Logout prevents later refresh
- **WHEN** a client calls logout and then calls the refresh endpoint with the prior refresh token
- **THEN** the refresh request is rejected with an unauthorized response

### Requirement: Frontend uses the standard token contract
The frontend SHALL consume the standardized auth API fields and routes.

#### Scenario: Login caller reads access token
- **WHEN** frontend login succeeds
- **THEN** frontend code reads `loginRes.data.accessToken` instead of `loginRes.data.token`

#### Scenario: App initialization refreshes through refresh endpoint
- **WHEN** the frontend initializes an authenticated session
- **THEN** it calls the POST refresh endpoint to renew access using the refresh-token cookie

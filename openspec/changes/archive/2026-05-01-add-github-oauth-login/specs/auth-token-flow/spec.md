## MODIFIED Requirements

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

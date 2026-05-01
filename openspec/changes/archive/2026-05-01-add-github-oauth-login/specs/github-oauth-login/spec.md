## ADDED Requirements

### Requirement: GitHub OAuth login can be initiated
The system SHALL provide a backend endpoint that starts GitHub OAuth login by redirecting the browser to GitHub with the configured client id, callback URL, scopes, and state.

#### Scenario: Start GitHub OAuth login
- **WHEN** a browser requests the GitHub OAuth login endpoint
- **THEN** the system redirects the browser to GitHub's OAuth authorization URL
- **AND** the authorization URL includes the configured callback URL
- **AND** the authorization URL includes state that can be validated by the callback

### Requirement: GitHub OAuth callback authenticates the user
The system SHALL handle GitHub OAuth callbacks by validating state, exchanging the authorization code server-side, fetching the GitHub account profile, and signing the user into the local application.

#### Scenario: Successful callback for a new GitHub account
- **WHEN** GitHub redirects back with a valid code and state for a GitHub account that is not yet linked locally
- **THEN** the system creates a local user with the `github` auth provider
- **AND** the local user stores the GitHub account's stable id
- **AND** the system issues the standard local application session
- **AND** the browser is redirected to the configured frontend destination

#### Scenario: Successful callback for an existing GitHub account
- **WHEN** GitHub redirects back with a valid code and state for a GitHub account that is already linked locally
- **THEN** the system updates the cached GitHub profile fields for that user
- **AND** the system issues the standard local application session
- **AND** the browser is redirected to the configured frontend destination

#### Scenario: Callback with invalid state
- **WHEN** the GitHub callback receives a missing or invalid state value
- **THEN** the system rejects the callback without creating or authenticating a user
- **AND** the browser is redirected to a safe frontend error destination

#### Scenario: Callback with failed GitHub token exchange
- **WHEN** the GitHub callback cannot exchange the authorization code for a GitHub access token
- **THEN** the system rejects the callback without creating or authenticating a user
- **AND** the browser is redirected to a safe frontend error destination

### Requirement: GitHub profile data is cached locally
The system SHALL store GitHub identity and profile data locally after successful GitHub OAuth login so normal application user reads do not call GitHub.

#### Scenario: Profile data stored after GitHub login
- **WHEN** GitHub OAuth login succeeds
- **THEN** the local user record stores the GitHub stable id
- **AND** the local user record stores cached profile fields including login, display name when available, avatar URL when available, profile URL when available, verified primary email when available, and sync time

#### Scenario: App user info uses local profile data
- **WHEN** the frontend requests the authenticated user's app profile after GitHub OAuth login
- **THEN** the system returns locally stored user data
- **AND** the system does not call GitHub as part of the user info request

### Requirement: GitHub OAuth configuration stays server-side
The system SHALL read GitHub OAuth client id, client secret, callback URL, and frontend redirect configuration from server environment variables.

#### Scenario: Missing GitHub OAuth configuration
- **WHEN** a GitHub OAuth endpoint is requested while required OAuth configuration is missing
- **THEN** the system fails safely without redirecting to GitHub with incomplete credentials
- **AND** the system does not expose the client secret in any response

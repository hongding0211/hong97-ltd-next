## ADDED Requirements

### Requirement: Push service boundary

The system SHALL provide a `PushService` that is injectable by backend services, SHALL expose authenticated device registration endpoints for mobile clients, and SHALL NOT expose external notification sending endpoints as part of this capability.

#### Scenario: Business service sends a notification

- **WHEN** a backend service calls `PushService.sendNotification` with `appId`, `recipientId`, notification `type`, and payload
- **THEN** the push service resolves destinations and provider payloads without requiring the caller to construct APNs-specific fields

#### Scenario: Device registration endpoint is authenticated

- **WHEN** a mobile client registers an APNs device token through `/push/devices`
- **THEN** the system uses the authenticated user ID as `recipientId` and ignores any client-provided recipient identity

#### Scenario: No external send endpoint is registered

- **WHEN** the push module is imported by the application
- **THEN** it exposes no controller method that allows external clients to send arbitrary notifications

### Requirement: App-scoped push configuration

The system SHALL load mobile app push registrations from runtime configuration and MUST NOT require real APNs credentials or private key material to be committed to the repository.

#### Scenario: App registry is loaded

- **WHEN** the server starts with a configured push app registry
- **THEN** each app registration includes an `appId`, platform provider, APNs bundle topic, environment, and credential reference

#### Scenario: Missing required app config

- **WHEN** a configured push app is missing required APNs metadata or credential references
- **THEN** startup validation fails with a configuration error

#### Scenario: Secret values remain external

- **WHEN** APNs credentials are configured
- **THEN** private key material is read from environment-backed secret values or secret file paths, not from hardcoded source files

### Requirement: Device registration persistence

The system SHALL persist mobile device registrations per app, recipient, platform, provider token, environment, and locale.

#### Scenario: Register a new iOS device

- **WHEN** an authenticated app flow calls the internal registration method with an APNs token, app ID, recipient ID, environment, and locale
- **THEN** the system stores an enabled device registration for that app and recipient

#### Scenario: Re-register an existing iOS device

- **WHEN** the same app, environment, platform, and provider token are registered again
- **THEN** the system updates mutable fields such as recipient ID, locale, app version, metadata, and `lastRegisteredAt` instead of creating a duplicate registration

#### Scenario: Disable invalid provider token

- **WHEN** a provider reports that a device token is invalid or unregistered
- **THEN** the system marks that device registration disabled and excludes it from future sends

### Requirement: Platform-neutral send contract

The system SHALL define notification types and modes in a provider-neutral catalog so callers send typed business payloads instead of platform payloads.

#### Scenario: Known notification type

- **WHEN** a caller sends a configured notification type with all required payload fields
- **THEN** the system validates the payload, resolves the notification mode, and attempts delivery to matching enabled device registrations

#### Scenario: Unknown notification type

- **WHEN** a caller sends a notification type that is not registered for the target app
- **THEN** the system rejects the request before contacting any push provider

#### Scenario: Recipient has no enabled devices

- **WHEN** a caller sends a valid notification to a recipient with no enabled device registrations for the target app
- **THEN** the system returns a no-destination result without treating the business request as a provider failure

### Requirement: Notification localization

The system SHALL support both server-rendered localized notification copy and APNs client-localized payload keys.

#### Scenario: Server-rendered locale

- **WHEN** a notification type uses server-rendered localization
- **THEN** the system selects the locale from device registration, user preference if available, or app default, and renders title/body before sending

#### Scenario: Client-localized APNs payload

- **WHEN** a notification type uses client-localized APNs copy
- **THEN** the APNs payload uses localization keys and args such as `title-loc-key`, `title-loc-args`, `loc-key`, and `loc-args` instead of final title/body text

#### Scenario: Unsupported locale fallback

- **WHEN** a device registration has a locale that the target app does not support
- **THEN** the system falls back to the app default locale

### Requirement: APNs provider adapter

The system SHALL implement APNs delivery behind a provider adapter that maps neutral messages to APNs payloads, headers, topics, and authentication.

#### Scenario: Alert notification

- **WHEN** the neutral message mode is `alert`
- **THEN** the APNs adapter sends an `aps.alert` payload and required APNs headers for the app topic and environment

#### Scenario: Silent notification

- **WHEN** the neutral message mode is `silent`
- **THEN** the APNs adapter sends a background update payload using `content-available` and the appropriate APNs push type

#### Scenario: Badge notification

- **WHEN** the neutral message includes a badge value
- **THEN** the APNs adapter maps it to `aps.badge`

#### Scenario: Provider authentication

- **WHEN** the APNs adapter sends a notification using token-based authentication
- **THEN** it signs APNs provider tokens from configured team ID, key ID, and private key material and refreshes them before expiration

### Requirement: Normalized delivery results

The system SHALL return normalized delivery results and handle provider-specific failures without leaking provider details into business services.

#### Scenario: Provider accepts notification

- **WHEN** APNs accepts a notification request
- **THEN** the push service returns an accepted result for that destination

#### Scenario: Provider rejects notification

- **WHEN** APNs rejects a notification request
- **THEN** the push service maps the provider response to a normalized result code such as invalid token, bad request, auth error, rate limited, provider unavailable, or unknown error

#### Scenario: Partial delivery

- **WHEN** a recipient has multiple device registrations and only some deliveries fail
- **THEN** the push service returns per-destination results and does not fail successful destinations because of unrelated destination failures

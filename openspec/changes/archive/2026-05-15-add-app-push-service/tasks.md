## 1. Configuration

- [x] 1.1 Add `push` config namespace and export it from `packages/server/src/config/index.ts`.
- [x] 1.2 Define and validate runtime app registry fields for app ID, platform, APNs topic, environment, credential reference, supported locales, and default locale.
- [x] 1.3 Document required environment variables with fake example values only.

## 2. Device Registration

- [x] 2.1 Create `PushDevice` Mongoose schema with app, recipient, platform, provider token, environment, locale, enabled status, timestamps, and metadata fields.
- [x] 2.2 Add indexes for unique provider tokens per app/environment and destination lookup by app/recipient/enabled status.
- [x] 2.3 Implement internal registration methods to upsert and disable device registrations idempotently.
- [x] 2.4 Add tests for new registration, re-registration update, locale update, and disabled-token exclusion.

## 3. Notification Catalog and Localization

- [x] 3.1 Define notification request/result types and a typed notification catalog for initial app push notification types.
- [x] 3.2 Implement payload validation for configured notification types.
- [x] 3.3 Implement server-rendered localization using registration locale, user preference fallback if available, and app default locale.
- [x] 3.4 Implement APNs client-localized payload rendering with `title-loc-key`, `title-loc-args`, `loc-key`, and `loc-args`.
- [x] 3.5 Add tests for known type rendering, unknown type rejection, unsupported locale fallback, and client-localized output.

## 4. Push Service

- [x] 4.1 Create `PushModule`, exported `PushService`, and keep notification sending internal-only.
- [x] 4.2 Implement `sendNotification` to resolve app config, validate type payload, find enabled destinations, render messages, and dispatch through provider adapters.
- [x] 4.3 Return normalized per-destination delivery results, including no-destination behavior.
- [x] 4.4 Add tests that business callers do not need APNs-specific fields and receive per-destination results.

## 5. APNs Adapter

- [x] 5.1 Add APNs provider dependency or local HTTP/2 client wrapper.
- [x] 5.2 Implement APNs provider token signing and refresh from runtime team ID, key ID, and private key material.
- [x] 5.3 Map neutral alert, silent, badge, and data modes to APNs payloads and required headers.
- [x] 5.4 Scope APNs clients or connection pools by credential, team, environment, and topic constraints.
- [x] 5.5 Map APNs responses to normalized result codes and disable invalid/unregistered device tokens.
- [x] 5.6 Add adapter tests for payload/header mapping, auth token refresh, invalid-token cleanup, and provider error normalization.

## 6. Integration and Verification

- [x] 6.1 Import `PushModule` in `AppModule` and export `PushService` for use by future business modules.
- [x] 6.2 Add or update tests proving the push module exposes only device registration endpoints and no external send endpoint.
- [x] 6.3 Run targeted backend unit tests for push configuration, registration, localization, service dispatch, and APNs adapter behavior.
- [x] 6.4 Run server build or type check.

## 7. Device Registration Endpoint

- [x] 7.1 Add authenticated `POST /push/devices` endpoint that derives `recipientId` from the current auth user.
- [x] 7.2 Add authenticated `DELETE /push/devices/:deviceId` endpoint that disables only the current user's device registration.
- [x] 7.3 Add DTO validation and response mapping that excludes APNs provider tokens.
- [x] 7.4 Add controller tests for authenticated registration and disable behavior.

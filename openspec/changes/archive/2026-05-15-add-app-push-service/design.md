## Context

The server is a NestJS app with global `ConfigModule`, Mongoose schemas, and `nestjs-i18n` using the `x-locale` header. Bark push currently exists as a separate global module and stays independent.

Mobile app push has different constraints:

- APNs device tokens are unique per device and app, so one user can have multiple app/platform destinations.
- APNs sends to a bundle topic and device token over HTTP/2; token-based auth uses a private `.p8` signing key, key ID, team ID, and short-lived JWTs.
- APNs supports alert, badge, sound, background update, category, thread ID, and localized alert keys such as `loc-key`, `loc-args`, `title-loc-key`, and `title-loc-args`.
- APNs can localize on the device only when the payload references keys that exist in the app bundle's `Localizable.strings`; the provider server still needs stored locale data if it renders final notification text itself.

References:

- Apple: registering an app with APNs and forwarding the device token to the provider server: https://developer.apple.com/documentation/UserNotifications/registering-your-app-with-apns
- Apple: token-based APNs authentication, `.p8` signing key, key ID, team ID, JWT refresh, and team/topic connection constraints: https://developer.apple.com/documentation/usernotifications/establishing-a-token-based-connection-to-apns
- Apple: APNs payload keys, background notifications, and localization payload keys: https://developer.apple.com/library/archive/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/PayloadKeyReference.html

## Goals / Non-Goals

**Goals:**

- Provide an internal `PushService` API for business modules while exposing only authenticated device registration endpoints for mobile clients.
- Support multiple apps, where each app can map to different bundle topics, credentials, environments, and notification catalogs.
- Hide APNs and future platform/provider details behind adapters.
- Persist device registrations and language preferences per app/platform/device.
- Support server-rendered localized copy and APNs client-localized copy.
- Keep credentials and app registration secrets outside the public repository.
- Return structured send results so callers can log, retry, or degrade gracefully.

**Non-Goals:**

- Replace or couple to the existing Bark module.
- Build a public notification sending or notification management API in this change.
- Guarantee delivery after provider acceptance; APNs only confirms request acceptance or rejection.
- Build a full user preference center, scheduling system, or marketing campaign system.
- Implement Android/FCM immediately, though the adapter boundary must allow it later.

## Decisions

### 1. Internal Push Module

Add `PushModule` with exported `PushService`. Other services call a high-level API such as:

```ts
await pushService.sendNotification({
  appId: 'hong97-ios',
  recipientId: userId,
  type: 'comment.created',
  payload: { postId, commentId, actorName },
})
```

The service also exposes registration methods, for example `upsertDeviceRegistration(...)`, `disableDeviceRegistration(...)`, and `disableDeviceForRecipient(...)`. Mobile-facing token registration is handled by an authenticated `PushController` under `/push/devices`; this controller only binds device tokens to the current authenticated user and does not expose notification sending.

Alternative considered: put device registration under `AuthController`. Rejected because auth should own identity/session concerns, while push owns device-token lifecycle. Another alternative was to let each business module call APNs directly. Rejected because it duplicates credentials, payload rules, language handling, and invalid-token cleanup.

### 2. App Registry Comes From Configuration, Not Hardcoded Secrets

Use a `push` config namespace loaded by `ConfigModule`. The registry should be environment-backed and validated at startup:

- `PUSH_APPS_JSON`: non-secret app routing metadata, preferably supplied by deployment env/config map.
- `PUSH_APNS_<APP_OR_CREDENTIAL>_TEAM_ID`
- `PUSH_APNS_<APP_OR_CREDENTIAL>_KEY_ID`
- `PUSH_APNS_<APP_OR_CREDENTIAL>_PRIVATE_KEY` or `PUSH_APNS_<APP_OR_CREDENTIAL>_PRIVATE_KEY_PATH`
- `PUSH_APNS_<APP>_BUNDLE_ID`
- `PUSH_APNS_<APP>_ENVIRONMENT=sandbox|production`

The private key value or file path is a runtime secret. The repository can include only documented variable names and examples with fake values.

The app registry should allow multiple apps to share one APNs signing key when they belong to the same Apple team, but provider connection pools must be scoped by credential/team/environment, with topic selected per app. If future apps belong to different Apple developer accounts, they require separate credential scopes and APNs connections.

Alternative considered: hardcode app IDs and bundle IDs in code, with only secrets in `.env`. Rejected because adding apps would require code changes and would still risk leaking operational routing details in a public repo.

### 3. Device Registration Model

Create `PushDevice` Mongoose schema:

- `deviceId`: server-generated stable ID or client installation ID
- `recipientId`: user or domain recipient identifier
- `appId`
- `platform`: `ios` initially, extensible to `android`/`web`
- `provider`: `apns`
- `providerToken`: APNs device token
- `environment`: `sandbox` or `production`
- `locale`: BCP-47-ish value normalized to supported app locales, such as `en` or `cn`
- `appVersion`, `bundleId`, `deviceModel`, optional metadata
- `enabled`, `lastRegisteredAt`, `lastSuccessAt`, `lastFailureAt`, `failureReason`

Indexes:

- unique `{ appId, platform, providerToken, environment }`
- lookup `{ appId, recipientId, enabled }`
- cleanup/diagnostics `{ lastRegisteredAt }`

APNs invalid-token responses must disable or mark the device registration so future sends skip it.

Alternative considered: store push tokens on the `User` document. Rejected because a user can have multiple devices, apps, environments, and languages.

### 4. Platform-Neutral Notification Types

Define a notification catalog per app or shared namespace. Each entry declares:

- `type`
- supported modes: `alert`, `silent`, `badge`, `data`
- required payload fields
- default category/thread behavior
- localization strategy
- provider overrides, such as APNs `apns-push-type`, `priority`, `collapseId`, `category`, or `threadId`

Business modules pass `type` and typed `payload`; `PushService` validates the type, resolves destinations, renders content, and delegates to provider adapters. This keeps business code stable even if APNs payload shape changes.

Alternative considered: accept arbitrary title/body strings from every caller. Rejected because it makes i18n, validation, notification grouping, and provider-specific limits inconsistent.

### 5. Localization Strategy

Use two supported modes:

1. `serverResolved`: `PushService` selects a locale per device registration and renders `title`/`body` using the server i18n catalog. Locale priority: registration locale, user preference if available, app default locale.
2. `clientLocalized`: `PushService` sends APNs localization keys and args, such as `title-loc-key`, `title-loc-args`, `loc-key`, and `loc-args`. iOS resolves them using the user's current device language and the app bundle's `Localizable.strings`.

The client must send locale during device registration and update it when the app observes a language change. APNs itself does not tell the provider server which language the device will use for a final alert. Client-localized APNs payloads are useful for stable notification copy that ships with the app; server-resolved payloads are better for copy that changes without an app release.

Alternative considered: rely only on APNs localization. Rejected because it cannot cover dynamic server-managed copy or apps that have not shipped the needed localizable keys.

### 6. Provider Adapter Boundary

Introduce a provider interface, for example:

```ts
interface PushProviderAdapter {
  send(device: PushDevice, message: PushMessage): Promise<PushDeliveryResult>
}
```

Implement `ApnsPushProvider` first. It maps neutral messages to APNs payload and headers:

- `alert` -> `aps.alert`, optional `sound`, `badge`, `category`, `thread-id`
- `silent` -> `aps.content-available = 1` and APNs background push headers
- `badge` -> `aps.badge`
- `data` -> custom top-level payload keys, excluding sensitive data

The adapter owns APNs auth token creation/caching and provider responses. It returns normalized result codes: `accepted`, `invalid-token`, `bad-request`, `auth-error`, `rate-limited`, `provider-unavailable`, `unknown-error`.

Alternative considered: make APNs the service implementation directly. Rejected because Android/FCM or future providers would leak through the public service contract.

## Risks / Trade-offs

- Secret handling mistakes could leak APNs private keys -> keep real key material in deployment secrets only, validate config at startup, and document fake examples only.
- Client locale can become stale -> update registration on app launch and when language changes; use app default fallback.
- Server-rendered localization may not match the user's current iOS language exactly -> allow `clientLocalized` for copy that must follow device language at display time.
- APNs accepts a request but device delivery can still fail later -> expose provider acceptance result only and avoid promising final delivery.
- Multiple Apple teams or environments can break connection reuse -> scope connection pools by credential/team/environment and recreate connections after credential or topic changes.
- Notification payloads can leak sensitive data -> keep payload data minimal, reference server-side IDs, and avoid secrets or private content in APNs custom keys.
- Device-token churn can cause noisy failures -> disable invalid tokens and make re-registration idempotent.

## Migration Plan

1. Add config schema and examples for `push` app registry and APNs credentials.
2. Add `PushModule`, `PushDevice` schema, provider adapter interfaces, and APNs adapter.
3. Add notification catalog and localization renderer.
4. Add authenticated `/push/devices` registration and disable endpoints that use the current auth user as `recipientId`.
5. Add tests for config validation, registration upsert, destination selection, localization, APNs payload mapping, device registration endpoints, and invalid-token cleanup.
6. Import `PushModule` in `AppModule` and export `PushService` for future business modules.

Rollback is low-risk before callers adopt the service: remove `PushModule` import and leave the collection unused. After callers adopt it, callers should treat send failures as non-blocking so push outages do not fail primary business workflows.

## Open Questions

- Which first app IDs, bundle IDs, and APNs environments should be registered for the initial rollout?
- Should notification catalogs live entirely in TypeScript for type safety, or in JSON/config for runtime edits?
- Do we need durable delivery attempt records now, or only logs/metrics until there is a concrete audit requirement?

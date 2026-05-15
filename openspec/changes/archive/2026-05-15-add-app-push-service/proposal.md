## Why

Backend services need a single internal API for mobile app notifications instead of each business module knowing APNs payloads, app credentials, device-token routing, and localization details. This is needed before adding multiple apps or more notification types, because destination, language, and provider behavior will diverge by app and platform.

## What Changes

- Add a NestJS push module with an internal `PushService` that other services can inject; only authenticated device registration endpoints are exposed, and notification sending remains internal-only.
- Add app-scoped notification routing so callers can send by `appId`, `recipientId`, notification `type`, and typed payload without handling platform-specific details.
- Persist mobile device registrations with app, platform, provider token, user/recipient binding, locale, environment, status, and timestamps.
- Add APNs provider support behind an adapter interface, using environment-backed credentials and app registration metadata rather than hardcoded secrets.
- Add a localization layer that can resolve notification titles/bodies server-side and can also emit APNs localization keys/args for client-bundled strings when appropriate.
- Define notification modes for visible alerts, silent/background pushes, badge updates, and data-only/custom payloads in a platform-neutral request model.
- Keep the existing Bark push mechanism independent and unchanged.

## Capabilities

### New Capabilities

- `app-push-notifications`: Internal mobile app push notification service, device registration model, app/provider configuration, localization behavior, and platform-neutral send contract.

### Modified Capabilities

- None.

## Impact

- Affected backend code: new `packages/server/src/modules/push/*` module, authenticated device registration endpoints, new config under `packages/server/src/config/push/*`, and `AppModule` imports.
- Persistence impact: new MongoDB collection for app device registrations and optional delivery attempt records.
- Configuration impact: new environment variables for app registrations and APNs credentials; secret key material must stay outside the public repository.
- Dependency impact: likely add an APNs HTTP/2/provider library or a small APNs client wrapper.

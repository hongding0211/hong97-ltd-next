## Overview

API tokens are permanent bearer credentials intended for scripts and integrations. They are tied to a root user account, stored as one-way SHA-256 hashes, and can be revoked by deleting the token record.

## Token Format

Generated tokens use a readable prefix and random secret:

- Format: `h97_<base64url random bytes>`
- Storage: SHA-256 hash of the full token string
- Display: raw token is returned only from create; lists show metadata and the token prefix

## Backend

- Add `ApiToken` Mongoose schema with `tokenId`, `userId`, `name`, `tokenHash`, `tokenPrefix`, `lastUsedAt`, and timestamps.
- Add DTOs for creating and returning token metadata.
- Add root-only endpoints under `/auth/api-tokens`:
  - `GET /auth/api-tokens` lists current user's tokens.
  - `POST /auth/api-tokens` creates a token and returns its one-time secret.
  - `DELETE /auth/api-tokens/:tokenId` revokes one current-user token.
- Extend `AuthGuard` bearer handling:
  1. Authenticate existing JWT access tokens first.
  2. If JWT verification fails for a bearer token, check whether the bearer value matches an active API token hash.
  3. On match, set `request.user.id` to the owner and update `lastUsedAt` asynchronously.

Cookie access tokens remain JWT-only. API tokens are accepted only through `Authorization: Bearer` to avoid accidental browser cookie persistence.

## Frontend

Add `/tools/api-tokens` with a minimal management UI:

- list existing token metadata;
- create a named token;
- show the raw token after creation with copy affordance and warning that it is shown once;
- revoke/delete existing tokens.

## Security Notes

- Never persist raw token values.
- Deleting a token immediately prevents future authentication.
- Tokens are permanent by default; user-controlled revocation is the validity boundary.

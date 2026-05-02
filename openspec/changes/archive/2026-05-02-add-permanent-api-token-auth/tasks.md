## 1. Specification

- [x] Document new API token auth capability.
- [x] Document protected request behavior changes.

## 2. Backend

- [x] Add API token schema and DTOs.
- [x] Add create/list/delete API token endpoints.
- [x] Extend auth guard to accept valid API tokens via `Authorization: Bearer`.
- [x] Add/update backend tests for API token creation, listing, revocation, and guard auth.

## 3. Frontend

- [x] Add auth service types and paths for API token endpoints.
- [x] Add Tools entry and `/tools/api-tokens` management page.
- [x] Add CN/EN locale copy.

## 4. Verification

- [x] Run targeted backend tests.
- [x] Run build/type checks where practical.

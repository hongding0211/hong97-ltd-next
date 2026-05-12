## Why

WalkCalc client E2E exposed backend record update failures that return HTTP 500 and can leave participant projections inconsistent on single-node MongoDB deployments without transaction support. Ledger validation errors such as duplicate participants also leak as generic server errors instead of structured business failures.

## What Changes

- Fix record update so replacement never writes a fresh Mongo `_id` over an existing record document.
- Preserve `recordId`, `createdBy`, and `createdAt` semantics on update while setting `updatedAt` and `updatedBy` from the mutation.
- Guarantee update atomicity for record and projection state when transactions are available.
- Add explicit rollback or reorder persistence so the no-transaction fallback path leaves both record and projections unchanged if any update step fails.
- Convert ledger validation failures such as duplicate participants, empty participant ids, missing payer, and invalid settlement parties into structured WalkCalc business errors instead of HTTP 500.
- Add backend integration/regression tests that exercise real or Mongoose-equivalent update behavior for expense updates, settlement updates, failed updates, and duplicate participant API responses.

## Capabilities

### New Capabilities

### Modified Capabilities
- `walkcalc-ledger-backend`: tighten record mutation atomicity and ledger validation error behavior.
- `walkcalc-server`: ensure record update APIs preserve documented identity/timestamp semantics and return structured errors for invalid ledger input.

## Impact

- Affected docs/specs: `docs/walkcalc-ledger-api.md`, `openspec/specs/walkcalc-ledger-backend`, `openspec/specs/walkcalc-server`.
- Affected backend modules: `packages/server/src/modules/walkcalc/walkcalc.service.ts`, `packages/server/src/modules/walkcalc/utils/ledger-effects.ts`, WalkCalc DTO/controller tests as needed.
- Affected behavior: `POST /walkcalc/records/update`, record add/update validation, and structured response error handling.
- No iOS client changes.

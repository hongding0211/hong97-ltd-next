## Context

WalkCalc records and participant projections are stored separately. `updateRecord` currently builds a fresh Mongoose document for the replacement record, reverses the old projection, calls `replaceOne`, then applies the new projection. On real MongoDB, replacing an existing document with a plain object that contains a different generated `_id` can fail because `_id` is immutable. In the single-node MongoDB path where transactions are unavailable, an error after reversing projections can leave the record unchanged while projections are partially changed.

Ledger effect helpers also throw plain `Error` for invalid participants. Those errors bypass the structured business error path and surface as HTTP 500.

## Goals / Non-Goals

**Goals:**
- Update existing expense and settlement records without replacing or mutating Mongo `_id`.
- Preserve documented record identity fields: `recordId`, `createdBy`, and `createdAt`; update `updatedAt` and `updatedBy`.
- Keep record and projection state atomic when update succeeds or fails, including the no-transaction fallback path.
- Convert ledger validation failures into existing or new WalkCalc `GeneralException` codes so API responses are structured.
- Add integration/regression coverage that exercises real Mongoose replacement/update behavior and API envelope behavior.

**Non-Goals:**
- No iOS client changes.
- No migration of existing data shape beyond fixing mutation behavior.
- No change to the ledger money-splitting algorithm except validation error normalization.

## Decisions

1. Update records through field-level `$set` rather than full replacement.
   - Rationale: `$set` avoids carrying a new document `_id` into the write path and aligns with MongoDB's immutable `_id` constraint.
   - Alternative considered: mutate the loaded document and call `save`. This is valid but can leave fields from the previous record type unless every old type-specific field is explicitly unset. A targeted update with `$set` and `$unset` makes the persisted shape clear.

2. Split record construction into a validated mutation payload plus response document shape.
   - Rationale: update needs to preserve prior identity metadata while changing type-specific fields. A plain payload is easier to write safely than a new unsaved Mongoose document.
   - Alternative considered: keep `buildRecordDocument` for update and strip `_id`. This fixes the immediate immutable `_id` error but still encourages replacement semantics and makes rollback harder to reason about.

3. Use transactional execution when available and compensate explicitly when it is not.
   - Rationale: replica-set MongoDB can keep the existing transaction flow. Single-node MongoDB requires a fallback that restores the previous record and previously applied projection deltas if a later step fails.
   - Alternative considered: update the record before projections and never compensate. That still leaves record/projection divergence if a projection update fails after the record update.

4. Convert ledger helper validation to typed business errors at service boundaries.
   - Rationale: controller/interceptor behavior already understands `GeneralException`; ledger validation should not escape as generic errors.
   - Alternative considered: make low-level utility functions import `GeneralException`. Keeping utilities framework-light is preferable, so the service wraps ledger validation failures.

## Risks / Trade-offs

- Projection rollback can fail after an earlier failure, leaving state ambiguous. Mitigation: perform rollback in reverse order, rethrow the original error, and cover the intended path with tests; transaction-capable deployments remain protected by MongoDB.
- Type-changing updates can leave stale fields if unset logic is incomplete. Mitigation: update expense and settlement with explicit `$unset` for opposite-type fields and test both paths.
- Existing mock-only tests may miss Mongoose-specific replacement behavior. Mitigation: add tests against real or Mongoose-equivalent models and keep the regression focused on `_id` preservation and projection state.

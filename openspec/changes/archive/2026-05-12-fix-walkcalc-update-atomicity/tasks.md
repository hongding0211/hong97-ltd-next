## 1. Record Update Safety

- [x] 1.1 Refactor `updateRecord` so updating an existing record never writes a replacement payload containing a fresh Mongo `_id`.
- [x] 1.2 Preserve `recordId`, `createdBy`, and `createdAt` on update while setting current `updatedAt` and `updatedBy`.
- [x] 1.3 Explicitly clear stale expense-only or settlement-only fields when a record changes type.
- [x] 1.4 Add no-transaction compensation so failed update steps restore the previous record and reverse any projection changes already applied.

## 2. Ledger Validation Errors

- [x] 2.1 Normalize ledger helper validation failures into WalkCalc `GeneralException` business errors.
- [x] 2.2 Ensure duplicate participant ids, empty participant ids, missing payer, missing settlement party, and same settlement endpoints do not escape as plain `Error`.
- [x] 2.3 Add or reuse i18n entries for the selected WalkCalc business error codes.

## 3. Test Coverage

- [x] 3.1 Add integration/regression coverage with real or Mongoose-equivalent update behavior to prove replacement does not carry a new `_id`.
- [x] 3.2 Test expense update with the documented A/B/C/T projection values and subsequent drop returning projections to the second-expense-only state.
- [x] 3.3 Test settlement update and record/projection state after update.
- [x] 3.4 Test update failure leaves both the record and projections unchanged on the fallback path.
- [x] 3.5 Test duplicate `participantIds` returns a structured `isSuccess: false` response instead of HTTP 500.
- [x] 3.6 Run the full server test suite and address regressions.

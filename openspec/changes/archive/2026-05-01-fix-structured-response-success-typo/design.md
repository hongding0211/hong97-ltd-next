## Context

The server installs `StructuredResponseInterceptor` globally. It wraps normal controller return values into `{ isSuccess: true, data }`, attempts to pass through already-structured responses, and catches `GeneralException` errors to return a translated application error response.

The handled error branch currently returns `iSuccess: false` and `code`, while the shared backend response types and frontend `HttpResponse` type expect `isSuccess` and `errCode`. That mismatch means callers checking `response.isSuccess` can misread handled errors, and error codes are not exposed under the documented field.

Two adjacent bugs are in the same contract boundary: non-`GeneralException` errors can be swallowed because the `catchError` callback returns nothing for them, and `isApiResponse` requires optional fields that the response interfaces do not require.

## Goals / Non-Goals

**Goals:**
- Make the backend structured response contract consistent across success, passthrough, and handled application error responses.
- Fix the `isSuccess` typo in the handled error branch.
- Align the error code field with the existing `errCode` interface.
- Pass through already-structured responses even when optional fields such as `msg` or `errCode` are absent.
- Re-throw unexpected errors so Nest's default exception handling can process them.
- Add focused server tests that fail if the structured response shape regresses.

**Non-Goals:**
- Redesign the frontend HTTP client.
- Introduce a new response envelope format or rename the public `isSuccess` contract.
- Change business module response DTOs unrelated to the interceptor.

## Decisions

1. Keep `isSuccess` as the public response flag.

   The frontend already relies on `isSuccess`, and the backend type definitions already name it that way. Renaming to another spelling or adding an alias would expand the API surface without solving the contract mismatch.

2. Return `errCode` for handled application errors.

   `IStructureResponse`, `IStructureErrorResponse`, and frontend `HttpResponse` all use `errCode`. The implementation should match those types instead of introducing `code`.

3. Preserve passthrough for already-structured responses without requiring optional fields.

   Existing code has an `isApiResponse` guard to avoid double-wrapping custom response objects. The guard should key on the fields that are required by the contract, such as `isSuccess`, while accepting optional `data`, `msg`, and `errCode` fields according to the response types.

4. Re-throw errors the interceptor does not intentionally handle.

   `GeneralException` is the application error type that the interceptor translates. Other errors should continue through the normal Nest exception pipeline instead of becoming an `undefined` response.

5. Cover the interceptor directly in unit tests.

   Testing the interceptor directly is enough to verify response mapping without requiring a full Nest application or database-backed modules. The tests should exercise success wrapping, passthrough, `GeneralException` mapping, and unexpected error propagation.

## Risks / Trade-offs

- [Risk] Some caller may have accidentally started reading `iSuccess` or `code` from handled errors. -> Mitigation: these fields contradict existing shared types, and the fix restores the documented contract.
- [Risk] Re-throwing unexpected errors may surface failures that were previously hidden as empty responses. -> Mitigation: this restores Nest's default exception behavior and prevents silent data loss.
- [Risk] `map(async ...)` currently returns a promise from the RxJS map callback. -> Mitigation: implementation should either keep observable behavior covered by tests or simplify the callback if no await is needed, but must not alter the external response contract.

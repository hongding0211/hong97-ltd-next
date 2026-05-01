## Why

The backend structured response interceptor has a typo in its error response shape: it returns `iSuccess` instead of `isSuccess`, and uses `code` instead of the typed `errCode` field. Frontend callers and shared response types expect `isSuccess`, so handled backend errors can arrive in a shape that clients cannot reliably interpret.

## What Changes

- Fix handled `GeneralException` responses to use `isSuccess: false`.
- Align handled error payloads with the shared structured response contract by returning `errCode` instead of `code`.
- Preserve successful response wrapping as `{ isSuccess: true, data }`.
- Preserve passthrough behavior for responses that are already structured, including shapes where optional fields are absent.
- Ensure unexpected non-`GeneralException` errors are not swallowed by the interceptor.
- Add tests around success wrapping, structured passthrough, handled error response shape, and unexpected error propagation so this contract does not regress.

## Capabilities

### New Capabilities
- `structured-response`: Defines the backend response envelope contract for successful responses, handled application errors, and already-structured responses.

### Modified Capabilities

## Impact

- Affected backend code: `packages/server/src/interceptors/response/structured-response.ts` and `packages/server/src/interceptors/response/types.ts`.
- Affected frontend contract: `packages/fe/services/types.ts` already expects `isSuccess` and `errCode`; implementation should align with that contract.
- Tests should be added under the server test suite for the response interceptor behavior.

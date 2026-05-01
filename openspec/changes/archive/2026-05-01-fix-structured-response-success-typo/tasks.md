## 1. Response Contract Fix

- [x] 1.1 Update the `GeneralException` branch in `StructuredResponseInterceptor` to return `isSuccess: false`.
- [x] 1.2 Return handled exception codes as `errCode` instead of `code`.
- [x] 1.3 Ensure handled error responses include `msg` and `data: null` while matching `IStructureErrorResponse`/`IStructureResponse`.
- [x] 1.4 Update `isApiResponse` passthrough logic so optional fields such as `msg` and `errCode` are not required.
- [x] 1.5 Re-throw non-`GeneralException` errors from the interceptor instead of returning `undefined`.
- [x] 1.6 Remove unnecessary async response mapping if it is not needed for the interceptor behavior.

## 2. Regression Tests

- [x] 2.1 Add server unit tests for successful response wrapping.
- [x] 2.2 Add server unit tests for already-structured response passthrough.
- [x] 2.3 Add server unit tests for passthrough when optional structured response fields are omitted.
- [x] 2.4 Add server unit tests for `GeneralException` mapping with `isSuccess: false`, translated `msg`, `errCode`, and no `iSuccess`.
- [x] 2.5 Add server unit tests that assert unexpected non-`GeneralException` errors are rethrown.

## 3. Verification

- [x] 3.1 Run the relevant server test suite.
- [x] 3.2 Run TypeScript/build verification for the server if the test suite does not typecheck the changed files.

## ADDED Requirements

### Requirement: Successful Responses Are Wrapped
The backend SHALL wrap non-structured successful controller results in a structured response envelope with `isSuccess: true` and the original result in `data`.

#### Scenario: Plain controller result
- **WHEN** a controller returns a plain value that is not already a structured response
- **THEN** the backend response contains `isSuccess: true`
- **AND** the backend response `data` equals the original controller result

### Requirement: Structured Responses Are Passed Through
The backend SHALL return already-structured responses without wrapping them again.

#### Scenario: Controller returns structured response
- **WHEN** a controller returns an object containing the canonical structured response fields
- **THEN** the backend response equals that object
- **AND** the backend does not nest it inside another `data` envelope

#### Scenario: Structured response omits optional fields
- **WHEN** a controller returns an object with `isSuccess` and omits optional fields such as `msg` or `errCode`
- **THEN** the backend response equals that object
- **AND** the backend does not require optional fields before treating the object as structured

### Requirement: Handled Application Errors Use Canonical Fields
The backend SHALL map handled `GeneralException` errors to a structured error response that uses `isSuccess: false`, translated `msg`, optional `errCode`, and `data: null`.

#### Scenario: GeneralException is thrown
- **WHEN** a controller flow throws a `GeneralException`
- **THEN** the backend response contains `isSuccess: false`
- **AND** the backend response contains the translated error message in `msg`
- **AND** the backend response exposes the exception code as `errCode` when present
- **AND** the backend response contains `data: null`
- **AND** the backend response does not contain the typo field `iSuccess`

### Requirement: Unexpected Errors Are Propagated
The backend SHALL NOT convert unexpected non-`GeneralException` errors into successful or empty structured responses.

#### Scenario: Unexpected error is thrown
- **WHEN** a controller flow throws an error that is not a `GeneralException`
- **THEN** the interceptor rethrows the error
- **AND** the error remains available to the default Nest exception handling pipeline

---
kind: error_handling
name: Spring REST Error Model with Centralized Exception Handling and Browser Status Messages
category: error_handling
scope:
    - '**'
source_files:
    - backend/src/main/java/com/onevictoria/mahjong/web/ApiProblem.java
    - backend/src/main/java/com/onevictoria/mahjong/web/ApiExceptionHandler.java
    - backend/src/main/java/com/onevictoria/mahjong/web/AuthInterceptor.java
    - backend/src/main/java/com/onevictoria/mahjong/service/AuthService.java
    - backend/src/main/java/com/onevictoria/mahjong/web/ApiController.java
    - mj.js
    - mahjong-suite/app.js
---

## Backend (Spring Boot)

The backend uses a small, explicit error model built around a single custom exception type:

- **`ApiProblem`** (`web/ApiProblem.java`) is a `RuntimeException` carrying an `HttpStatus` and a user-facing message. It exposes static factory methods — `badRequest`, `unauthorized`, `notFound`, `conflict` — that are thrown from service and controller code to signal client errors. There are no checked application exceptions; business validation failures are expressed by throwing the appropriate `ApiProblem` variant.
- **`ApiExceptionHandler`** (`web/ApiExceptionHandler.java`) is a `@RestControllerAdvice` that centralizes all HTTP error responses. It maps:
  - `ApiProblem` → its embedded status + message
  - `MethodArgumentNotValidException` → 400 Bad Request with a generic Chinese message
  - `DataIntegrityViolationException` → 409 Conflict (duplicate / unique constraint violation)
  - `OptimisticLockingFailureException` → 409 Conflict with a message telling the user to reload
  Any other unhandled exception falls through to Spring's default handler.
- The response body is a uniform JSON map: `{ timestamp, status, error, message }`, produced by a private `response(HttpStatus, String)` helper.
- **Authorization** is enforced in `AuthInterceptor.preHandle`, which throws `ApiProblem.unauthorized()` when the `Authorization` header is missing or malformed. This integrates seamlessly with the centralized handler.
- In `AuthService`, input validation helpers (`normalizeEmail`, `validatePassword`, `requireText`) throw `ApiProblem.badRequest(...)` with descriptive Chinese messages. Cryptographic hashing errors wrap `NoSuchAlgorithmException` into `IllegalStateException` since it should never occur at runtime.
- In `ApiController`, JSON serialization/deserialization errors are caught locally: serialization failures become `ApiProblem.badRequest(...)`, while parsing failures currently bubble up as `IllegalStateException` (inconsistent with the rest of the codebase).

## Frontend (Browser JavaScript)

The browser-side mahjong calculator (`mj.js`) does not define a formal error class hierarchy. Errors surface in two ways:

1. **User-visible feedback** via a `showStatusMessage(message, type)` helper called with `type = 'error'` for invalid game actions (e.g., illegal chi/peng/kong selections). These are UI-level validation messages rather than propagated exceptions.
2. **Diagnostic logging** via `console.error(...)` for DOM-related issues (missing elements, drop handler failures).

The suite host (`mahjong-suite/app.js`) wraps cross-frame communication in try/catch blocks, converting any caught exception into a user-facing `Error` and propagating it through promise rejections so the host can display a toast notification. An iframe `error` event listener marks the scorekeeper frame as failed and rejects the startup promise.

## Conventions Observed

- All API errors go through `ApiProblem` + `ApiExceptionHandler`; controllers and services do not return raw `ResponseEntity`s for error cases.
- Validation errors use `ApiProblem.badRequest` with localized (Chinese) messages describing the field and rule violated.
- Authentication failures consistently use `ApiProblem.unauthorized`.
- Database concurrency conflicts are mapped to 409 Conflict with a user-friendly reload prompt.
- Frontend errors are surfaced to users through status messages and toasts rather than thrown across module boundaries.
- No `try/catch` is used for control flow in the backend; exceptions are reserved for exceptional conditions.
---
kind: error_handling
name: Spring Boot REST Error Handling with ApiProblem and Centralized Exception Mapping
category: error_handling
scope:
    - '**'
source_files:
    - backend/src/main/java/com/onevictoria/mahjong/web/ApiProblem.java
    - backend/src/main/java/com/onevictoria/mahjong/web/ApiExceptionHandler.java
    - backend/src/main/java/com/onevictoria/mahjong/web/AuthInterceptor.java
    - backend/src/main/java/com/onevictoria/mahjong/web/ApiController.java
---

## Overview

The backend of the Taiwanese Mahjong Scoring Suite uses a Spring Boot-based error handling strategy centered on a custom `ApiProblem` exception type and a single global `@RestControllerAdvice` handler. Client-facing errors are expressed as typed exceptions carrying an HTTP status, while framework-level issues (validation, database integrity) are mapped to consistent JSON responses.

## Core Components

- **`ApiProblem`** (`backend/src/main/java/com/onevictoria/mahjong/web/ApiProblem.java`): A `RuntimeException` subclass that carries an `HttpStatus` and message. It provides static factory methods for common cases: `badRequest`, `unauthorized`, `notFound`, `conflict`. Business logic throws these to signal client errors.
- **`ApiExceptionHandler`** (`backend/src/main/java/com/onevictoria/mahjong/web/ApiExceptionHandler.java`): A `@RestControllerAdvice` that maps exceptions to uniform JSON bodies shaped as `{timestamp, status, error, message}`. It handles:
  - `ApiProblem` → returns the embedded status and message.
  - `MethodArgumentNotValidException` → 400 Bad Request with message `輸入資料無效`.
  - `DataIntegrityViolationException` → 409 Conflict with message `資料已存在或違反唯一限制`.
  - `OptimisticLockingFailureException` → 409 Conflict with message `牌局已在另一位置更新，請重新載入`.
- **`AuthInterceptor`** (`backend/src/main/java/com/onevictoria/mahjong/web/AuthInterceptor.java`): A `HandlerInterceptor` that enforces Bearer-token authentication on all `/api/*` endpoints except `/api/health`, `/api/auth/register`, and `/api/auth/login`. Missing or malformed Authorization headers throw `ApiProblem.unauthorized()`.
- **`ApiController`** (`backend/src/main/java/com/onevictoria/mahjong/web/ApiController.java`): The main REST controller. It throws `ApiProblem` from business validation paths — e.g., missing sessions (`notFound("找不到牌局")`), version conflicts (`conflict("牌局版本已變更，請重新載入")`), invalid payloads (`badRequest(...)`). Payload validation is centralized in `validatePayload`, which checks schema version, player count, field ranges, entry types, and payload size (2 MB limit).

## Architecture & Conventions

1. **Throw-first, catch-later**: Controllers and interceptors throw `ApiProblem` (or let Spring's built-in exceptions propagate); no try/catch around normal flow. The global `ApiExceptionHandler` converts them into HTTP responses.
2. **Uniform error envelope**: Every error response is a JSON map with keys `timestamp` (ISO instant), `status` (numeric code), `error` (reason phrase), and `message` (localized Chinese string). This gives clients a stable contract regardless of error source.
3. **Domain-specific error factories**: Instead of raw `throw new RuntimeException(...)`, callers use `ApiProblem.badRequest/notFound/unauthorized/conflict`, which makes the intended HTTP semantics explicit at the call site.
4. **Validation split between Bean Validation and manual checks**: Controller method parameters annotated with `@Valid` + Jakarta validation constraints handle structural input validation; domain rules (schema version, player IDs, hand-entry invariants) are enforced in `validatePayload` via `ApiProblem.badRequest` calls.
5. **Concurrency control via optimistic locking**: Session updates and deletes check `expectedVersion`; mismatches raise `ApiProblem.conflict`, which the handler translates to 409 with a user-facing message instructing reload.
6. **Authentication as middleware**: Auth is enforced uniformly by `AuthInterceptor` before any controller runs, so controllers can assume a valid `accountId` request attribute.
7. **No panics / recover pattern**: As a Java/Spring application, there is no Go-style panic/recover. Unhandled checked exceptions (e.g., `JsonProcessingException` in `readJson`) are wrapped in `IllegalStateException`, which will fall through to Spring's default error page rather than the structured API format — this is a gap relative to the rest of the error strategy.

## Key Files

- `backend/src/main/java/com/onevictoria/mahjong/web/ApiProblem.java` — Custom exception with HTTP status.
- `backend/src/main/java/com/onevictoria/mahjong/web/ApiExceptionHandler.java` — Global exception-to-JSON mapper.
- `backend/src/main/java/com/onevictoria/mahjong/web/AuthInterceptor.java` — Bearer-token enforcement interceptor.
- `backend/src/main/java/com/onevictoria/mahjong/web/ApiController.java` — Controller throwing `ApiProblem` throughout business logic and payload validation.
- `backend/src/main/java/com/onevictoria/mahjong/service/AuthService.java` — Authentication service used by the interceptor.

## Constraints Observed

- All client-facing errors go through `ApiProblem` or Spring's built-in exceptions; ad-hoc `throw new RuntimeException(...)` is avoided in controller code.
- Error messages are written in Traditional Chinese, indicating the UI language target.
- Payloads are rejected early with `ApiProblem.badRequest` before persistence, enforcing schema version, four-player constraint, entry limits (≤5000 entries), and 2 MB size cap.
- Versioned writes require `expectedVersion`; absent or mismatched versions produce 409 Conflict.
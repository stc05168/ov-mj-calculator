---
kind: configuration_system
name: Spring Boot Properties + Environment Variables with Profile-based Datasource Switching
category: configuration_system
scope:
    - '**'
source_files:
    - backend/src/main/resources/application.properties
    - backend/src/main/resources/application-postgresql.properties
    - backend/src/test/resources/application.properties
    - backend/pom.xml
    - backend/src/main/java/com/onevictoria/mahjong/web/WebConfig.java
    - backend/src/main/java/com/onevictoria/mahjong/service/AuthService.java
    - app-config.js
    - ov-mj-calculator/app-config.js
---

## What system/approach is used

The repository uses a standard Spring Boot configuration approach layered on top of environment variables. The backend (`backend/`) is a Spring Boot 3.5.7 application that loads configuration from `application.properties` and an optional profile-specific override file, while all secrets and deployment-sensitive values are supplied exclusively through environment variables (prefixed `OVMJ_`). Frontend apps use a small in-browser JavaScript config object (`OVMJ_APP_CONFIG`) to discover the API base URL and entry pages.

## Key files and packages

- **Backend properties**
  - `backend/src/main/resources/application.properties` — default configuration for local development; defines server port, H2 datasource, JPA settings, CORS origins, and token lifetime, all parameterized via `${ENV_VAR:default}` syntax.
  - `backend/src/main/resources/application-postgresql.properties` — activated by `--spring.profiles.active=postgresql`; switches datasource driver, URL template, dialect, and intentionally removes defaults for `OVMJ_DB_USERNAME` / `OVMJ_DB_PASSWORD` so production cannot start without credentials.
  - `backend/src/test/resources/application.properties` — test-only H2 in-memory database and a 1-day token for fast tests.
  - `backend/pom.xml` — declares Spring Boot parent, JPA, validation, security-crypto, H2 (runtime), PostgreSQL (runtime) dependencies and the `spring-boot-maven-plugin` build plugin.
- **Java config consumers**
  - `backend/src/main/java/com/onevictoria/mahjong/web/WebConfig.java` — injects `app.allowed-origins` via `@Value` to configure CORS.
  - `backend/src/main/java/com/onevictoria/mahjong/service/AuthService.java` — injects `app.token-days` via `@Value` to set bearer-token TTL.
- **Frontend config**
  - `app-config.js` (root) and `ov-mj-calculator/app-config.js` — expose a frozen `global.OVMJ_APP_CONFIG` object containing `apiBaseUrl`, `guestEntryUrl`, `accountEntryUrl`, and `requestTimeoutMs`. Both files carry an explicit comment forbidding secrets because the file is served publicly to every browser.

## Architecture and conventions

1. **Single source of truth per profile**: `application.properties` holds shared defaults; `application-postgresql.properties` overrides only what changes for PostgreSQL deployments. There is no `.env` file checked in — environment variables are the mechanism for overriding anything beyond defaults.
2. **Environment-variable-first for sensitive data**: Every secret or deployment-specific value uses the `${VAR:default}` placeholder form. The property comments explicitly state: "Secrets must be supplied through environment variables; do not commit real credentials." In the PostgreSQL profile, `username` and `password` have no default, enforcing that they are always provided externally.
3. **Profile-driven datasource switching**: The default profile ships an embedded H2 file-backed database (`jdbc:h2:file:${OVMJ_DATA_PATH:./data/mahjong};AUTO_SERVER=TRUE`) with `ddl-auto=${OVMJ_DB_DDL_AUTO:update}`, enabling zero-setup local development. Production activates the `postgresql` profile to switch to the PostgreSQL driver and dialect. The comment in the PostgreSQL profile documents that `OVMJ_DB_DDL_AUTO` should be switched to `validate` after schema provisioning.
4. **Application-level properties under `app.*`**: Custom application settings (`app.allowed-origins`, `app.token-days`) are kept separate from Spring-managed properties and injected into services/controllers via `@Value`.
5. **Frontend runtime configuration via a global object**: Browser code reads `window.OVMJ_APP_CONFIG` rather than reading a separate JSON file at runtime. The config is created as an IIFE that computes relative URLs from `document.currentScript.src`, allowing the same file to work when loaded from different paths.
6. **Test isolation**: Tests ship their own `application.properties` that pins an in-memory H2 database and disables the console, ensuring tests never touch the dev file store.

## Conventions and constraints

- **No secrets in source control**: Both frontend `app-config.js` files contain a comment stating that the file is public and must never hold database credentials, API tokens, or other secrets. Backend `application.properties` carries the same rule.
- **All secrets come from environment variables**: Property placeholders use the `${VAR:default}` pattern; production profiles omit defaults for credentials so startup fails if they are missing.
- **Profiles are used only for datasource/runtime toggles**: The only active profile demonstrated is `postgresql`; there is no `dev`/`prod` profile naming convention beyond this one.
- **CORS origins are configurable per deployment**: `app.allowed-origins` is read from `OVMJ_ALLOWED_ORIGINS` (defaulting to localhost origins) and wired into `WebConfig`.
- **Token lifetime is externalized**: `app.token-days` defaults to 30 but can be overridden via `OVMJ_TOKEN_DAYS`; tests override it to 1 day.
- **Frontend config is immutable at runtime**: `Object.freeze` is used on the config object so callers cannot mutate it after load.
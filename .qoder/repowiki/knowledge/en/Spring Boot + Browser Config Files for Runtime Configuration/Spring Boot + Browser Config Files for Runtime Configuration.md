---
kind: configuration_system
name: Spring Boot + Browser Config Files for Runtime Configuration
category: configuration_system
scope:
    - '**'
source_files:
    - backend/src/main/resources/application.properties
    - backend/src/main/resources/application-postgresql.properties
    - backend/src/test/resources/application.properties
    - backend/src/main/java/com/onevictoria/mahjong/web/WebConfig.java
    - backend/src/main/java/com/onevictoria/mahjong/MahjongBackendApplication.java
    - app-config.js
    - ov-mj-calculator/app-config.js
---

## What system/approach is used

The project uses two complementary configuration mechanisms:

1. **Spring Boot `application.properties`** with environment-variable substitution and Spring profiles for the Java backend (`backend/src/main/resources/application.properties`, `application-postgresql.properties`).
2. **A browser-side JavaScript config file** (`app-config.js`, duplicated under `ov-mj-calculator/app-config.js`) that exposes a frozen `window.OVMJ_APP_CONFIG` object consumed by all client entry points.

There is no centralized secrets manager, feature-flag framework, or YAML/TOML-based config server — configuration is file + env-var driven.

## Key files and packages

- `backend/src/main/resources/application.properties` — default (H2) profile: server port, datasource URL/credentials, JPA DDL mode, H2 console toggle, CORS origins list, token lifetime.
- `backend/src/main/resources/application-postgresql.properties` — PostgreSQL profile activated via `--spring.profiles.active=postgresql`; overrides datasource driver, URL template, dialect, and DDL strategy.
- `backend/src/test/resources/application.properties` — in-memory H2 test DB with `create-drop` DDL and a 1-day token for integration tests.
- `backend/src/main/java/com/onevictoria/mahjong/web/WebConfig.java` — injects `app.allowed-origins` via `@Value` and applies it to both CORS and the auth interceptor path.
- `backend/src/main/java/com/onevictoria/mahjong/MahjongBackendApplication.java` — Spring Boot bootstrap; no programmatic config loading.
- `app-config.js` and `ov-mj-calculator/app-config.js` — public JS config exposing `OVMJ_APP_CONFIG` with `apiBaseUrl`, `guestEntryUrl`, `accountEntryUrl`, `requestTimeoutMs`.

## Architecture and conventions

### Backend (Spring Boot)

- **Environment variables override everything.** Every property uses `${VAR:default}` syntax. The comment in `application.properties` explicitly states: *"Secrets must be supplied through environment variables; do not commit real credentials."*
- **Profiles separate environments.** The default profile ships an embedded H2 database for local development. Production switches to PostgreSQL by activating the `postgresql` profile (`--spring.profiles.active=postgresql`). The PostgreSQL profile intentionally has no defaults for `OVMJ_DB_USERNAME` / `OVMJ_DB_PASSWORD`, forcing them to be provided at runtime.
- **Database schema management.** `spring.jpa.hibernate.ddl-auto` is set to `update` by default (overridable via `OVMJ_DB_DDL_AUTO`). The PostgreSQL profile comments note that production should switch to `validate` after schema provisioning or use migrations.
- **CORS and auth are parameterized.** `app.allowed-origins` is a comma-separated list injected into `WebConfig` via `@Value`, split and trimmed per origin. `app.token-days` controls API token expiry.
- **No `@ConfigurationProperties` class** is used — all values are read directly via `@Value` or Spring's built-in property resolution.

### Frontend (browser)

- A single IIFE writes a frozen `global.OVMJ_APP_CONFIG` object. All client HTML pages reference this script before their own logic, reading `window.OVMJ_APP_CONFIG` to discover the API base URL, guest vs. account entry pages, and request timeout.
- The config file carries a prominent comment warning that it is publicly downloadable and must never contain secrets such as database credentials or API tokens.
- The same `app-config.js` content is duplicated under `ov-mj-calculator/` so each standalone bundle ships its own copy of the config.

### Test configuration

- Tests override the datasource to an in-memory H2 (`jdbc:h2:mem:testdb`) with `create-drop` DDL so each run starts clean.
- Token lifetime is shortened to 1 day for faster test cycles.
- H2 console is disabled in tests.

## Conventions and constraints

- **All secrets come from environment variables**, never from committed properties files. This is enforced by the explicit comment in `application.properties` and by the PostgreSQL profile omitting defaults for username/password.
- **Profile selection is CLI-driven** via `--spring.profiles.active=postgresql`; there is no auto-detection based on host or OS.
- **Frontend config is immutable at runtime**: `Object.freeze(...)` prevents client code from mutating `OVMJ_APP_CONFIG`.
- **CORS origins are configured as a single comma-delimited string** in `application.properties` and parsed in `WebConfig` by splitting on `,` and trimming whitespace.
- **Test resources live under `src/test/resources`** and fully replace the main `application.properties` for the test classpath, ensuring tests never hit the dev H2 file or any external database.
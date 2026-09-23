---
kind: dependency_management
name: Maven (Spring Boot) dependency management with GitHub Dependabot for Actions only
category: dependency_management
scope:
    - '**'
source_files:
    - backend/pom.xml
    - .github/dependabot.yml
    - .gitignore
---

## What system/approach is used

The repository uses **Maven** as the sole package manager, driven by a Spring Boot parent POM. The backend (`backend/pom.xml`) declares all third-party libraries via Maven `<dependency>` elements and inherits managed versions from `org.springframework.boot:spring-boot-starter-parent:3.5.7`. Java source targets JDK 17.

Frontend code (the mahjong calculator, session scorekeeper apps under `mahjong-suite/`, `session-scorekeeper/`, `session-scorekeeper-online/`, and root-level `.js` files) contains **no Node.js manifest** (`package.json`), no lockfile, and no vendored `node_modules`; they are plain browser scripts loaded directly in HTML. A `.gitignore` entry for `node_modules/` exists but is not actively used — `CONTRIBUTING.md` explicitly states that Node.js and npm are not required.

Automated updates are configured only for **GitHub Actions** workflows via `.github/dependabot.yml`, which runs monthly against the root directory. No Dependabot configuration exists for Maven or any other ecosystem.

## Key files and packages

- `backend/pom.xml` — single source of truth for all backend dependencies; defines Spring Boot starter-web, starter-data-jpa, starter-validation, spring-security-crypto, H2 (runtime), PostgreSQL JDBC (runtime), and spring-boot-starter-test (test scope).
- `.github/dependabot.yml` — enables Dependabot for `github-actions` ecosystem on a monthly schedule.
- `.gitignore` — ignores `node_modules/` (unused convention for this repo).

## Architecture and conventions

- **Parent POM version pinning**: All Spring-related artifacts derive their versions from the `spring-boot-starter-parent` BOM, so individual `<version>` tags are omitted in `<dependency>` blocks. This centralizes version alignment across the stack.
- **Runtime vs test scoping**: Database drivers (`h2`, `postgresql`) are scoped to `runtime` since they are needed at deploy time but not during compilation; testing dependencies use `test` scope.
- **No frontend dependency manifests**: The JavaScript UIs are self-contained single-page scripts with no build step, no bundler, and no external JS library imports — they rely on browser globals. Consequently there is no npm/yarn/pnpm lockfile to keep up to date.
- **No vendoring**: There is no `vendor/`, `lib/`, or checked-in third-party JARs; all artifacts are resolved from Maven Central (or whatever remote repository is configured in the local Maven settings).
- **Dependency update automation is partial**: Only GitHub Actions workflows receive Dependabot PRs; Maven dependencies must be updated manually.

## Conventions and constraints

- Backend dependencies are declared exclusively in `backend/pom.xml` using Maven coordinates; no other build tool is present.
- Versions are inherited from the Spring Boot parent BOM rather than pinned per-dependency, enforcing consistent Spring ecosystem compatibility.
- Frontend code intentionally avoids a package manager; adding one would require introducing a `package.json` and updating the build/test process accordingly.
- Dependabot is enabled solely for `github-actions`; there is no `maven` or `npm` ecosystem entry, so library upgrades do not trigger automated pull requests.
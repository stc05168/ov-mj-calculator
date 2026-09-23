---
kind: dependency_management
name: Maven (Spring Boot) with No Frontend Dependency Manifests
category: dependency_management
scope:
    - '**'
source_files:
    - backend/pom.xml
    - .github/dependabot.yml
---

## What system/approach is used

This repository uses a single, Maven-based dependency management system for the Java backend. The frontend components are pure browser applications (vanilla JavaScript, HTML, CSS) and therefore have no package manager or lockfile at all — dependencies are inlined directly into `.js`/`.html` files.

- **Backend**: Apache Maven (`backend/pom.xml`) using Spring Boot as a parent POM to manage transitive dependency versions.
- **Frontend**: Zero dependency manifests. There is no `package.json`, `requirements.txt`, `go.mod`, `Cargo.toml`, `build.gradle`, or any other manifest anywhere in the repo. All third-party code is either absent (the apps are self-contained) or vendored inline.
- **CI automation**: Dependabot is configured only for GitHub Actions workflows (monthly updates); it does not monitor Maven or any frontend ecosystem because none exist.

## Key files and packages

- `backend/pom.xml` — sole source of dependency declarations for the project. Declares:
  - Parent: `org.springframework.boot:spring-boot-starter-parent:3.5.7`
  - Runtime deps: `spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `spring-boot-starter-validation`, `spring-security-crypto`, `com.h2database:h2` (runtime), `org.postgresql:postgresql` (runtime)
  - Test scope: `spring-boot-starter-test`
  - Build plugin: `spring-boot-maven-plugin`
- `.github/dependabot.yml` — enables Dependabot solely for the `github-actions` ecosystem on a monthly schedule.

## Architecture and conventions

- **Version pinning via Spring Boot BOM**: All Spring-related artifacts derive their versions from the `spring-boot-starter-parent` BOM; individual `<version>` tags are omitted, so version upgrades are coordinated through bumping the parent version.
- **Runtime vs compile-time scoping**: Database drivers (`h2`, `postgresql`) are declared with `<scope>runtime</scope>`, keeping them out of the compile classpath while still being packaged for deployment. Test-only dependencies use `<scope>test</scope>`.
- **No private registry configuration**: The POM contains no `<repositories>` or `<pluginRepositories>` sections, so Maven resolves artifacts exclusively from the default Maven Central mirror.
- **No lockfile**: Because the project relies on the Spring Boot parent BOM rather than explicit version pins, there is no `pom.lock` / `dependency-management` lockfile checked in. Reproducibility depends on the fixed parent version `3.5.7`.
- **Frontend has no dependency layer**: Every UI module (`mahjong-suite/`, `session-scorekeeper/`, `session-scorekeeper-online/`, plus root-level `mj.js`, `app-config.js`, etc.) is a flat collection of static files. Third-party behavior is implemented in-house (e.g., scoring logic in `mjConst.js`, `checkHandType.js`), so no npm/yarn/pip/bundler is involved.

## Conventions and constraints

- **All Java dependencies must be declared in `backend/pom.xml`** under the existing `<dependencies>` block; adding new libraries requires choosing an artifact already managed by the Spring Boot parent BOM (no explicit `<version>` needed).
- **Database driver scopes are enforced by convention**: drivers are always marked `<scope>runtime</scope>` (see `h2` and `postgresql` entries), separating runtime-only jars from compile-time APIs.
- **Dependency updates are automated only for GitHub Actions**: Dependabot watches `.github/workflows/*` monthly; Maven dependencies are updated manually by editing the parent version in `backend/pom.xml`.
- **No vendoring or offline cache policy is declared**: The build assumes network access to Maven Central; there is no `settings.xml`, `.m2/repository` snapshot, or vendor directory checked in.
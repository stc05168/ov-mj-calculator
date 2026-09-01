# 部署與營運手冊

## 1. 部署模式

### 1.1 訪客／免登入版

純靜態 host 提供 root redirect、整合殼層、單局計番器與記憶體整場記分器。執行時不需要 Java、DB、Node.js、API key 或 package install。

訪客資料只存在目前頁面記憶體，沒有保存、匯入、匯出或分享；重新整理、關頁或導航即消失。

### 1.2 戶口／DB 版

在相同靜態前端之外，部署：

- `session-scorekeeper-online/`；
- Spring Boot executable JAR；
- H2 persistent volume 或 PostgreSQL；
- HTTPS／reverse proxy／CORS／backup／monitoring。

內層記分器仍是 memory-only，durable persistence 只由 authenticated outer app 寫入 DB。

## 2. 前端 runtime tree

訪客整合版必須保留相對路徑：

```text
index.html
app-config.js
mahjong-suite/index.html
mahjong-suite/styles.css
mahjong-suite/app.js
mj.html
mj.css
mjConst.js
mj.js
checkHandType.js
session-scorekeeper/index.html
session-scorekeeper/styles.css
session-scorekeeper/app.js
```

戶口版另加：

```text
session-scorekeeper-online/index.html
session-scorekeeper-online/styles.css
session-scorekeeper-online/app.js
```

不要 flatten 目錄。`mahjong-suite/`、`mj.html`、`session-scorekeeper/`、`session-scorekeeper-online/` 與 `app-config.js` 必須可由同一 origin 存取，因為 runtime 使用 same-origin iframe facade。

## 3. 本機 smoke deployment

前端，在 repository root：

```bat
python -m http.server 8000
```

入口：

```text
訪客：http://127.0.0.1:8000/
訪客：http://127.0.0.1:8000/mahjong-suite/
登入：http://127.0.0.1:8000/session-scorekeeper-online/
```

預設 API：

```text
http://127.0.0.1:8080/api
```

Java 17／Maven：

```bat
set "JAVA_HOME=D:\openjdk-17+35_windows-x64_bin\jdk-17"
set "PATH=%JAVA_HOME%\bin;D:\itdev\apache-maven-3.6.3\bin;%PATH%"
mvn -f "backend\pom.xml" test
mvn -f "backend\pom.xml" package
java -jar "backend\target\mahjong-scorekeeper-backend-1.0.0.jar"
```

Python HTTP server 只適合本機 smoke，不是 hardened public server。

## 4. 前端 API 設定

部署前修改根目錄 `app-config.js` 的公開值。最常見設定：

### 本機 API

```js
apiBaseUrl: 'http://127.0.0.1:8080/api'
```

### 同來源 reverse proxy（建議）

```js
apiBaseUrl: '/api'
```

### 分開的 HTTPS API origin

```js
apiBaseUrl: 'https://api.example.com/api'
```

安全 validator 只接受：

- 同來源 root-relative path；
- absolute HTTPS；
- loopback HTTP。

禁止遠端 HTTP、URL embedded username/password、query 與 fragment。

`app-config.js` 是公開 static asset，不可放 DB credential、token 或秘密。DB username／password／IP 只在 backend environment 設定。

## 5. Static host 與 security headers

設定：

- HTTPS；
- UTF-8；
- 正確 HTML／CSS／JavaScript MIME types；
- coordinated HTML/JS cache invalidation；
- `index.html` root mapping；
- 不需要 third-party CDN/font/script origins；
- CSP 允許 same-origin scripts 與 frames。

由於 iframe facade 需要直接 same-origin window access，不可把 suite、calculator、scorekeeper 分散到不同 origins，除非另行設計、版本化並審核 `postMessage` protocol。

建議 security headers 至少包括合理的 CSP、`X-Content-Type-Options: nosniff`、frame policy（允許本站需要的 same-origin frames）、Referrer Policy 與 HTTPS HSTS（確認全站 HTTPS 後）。

## 6. Reverse proxy 建議拓撲

```text
https://mahjong.example.com
    |-- /                         static frontend
    |-- /mahjong-suite/           static
    |-- /session-scorekeeper/     static
    |-- /session-scorekeeper-online/ static
    +-- /api/                     reverse proxy -> Spring Boot :8080
                                                  |
                                                  +-> H2 volume／PostgreSQL
```

同來源 `/api` 最簡單，可減少 CORS 與 mixed-content 問題。若 API 分開 origin：

- API 必須 HTTPS；
- `OVMJ_ALLOWED_ORIGINS` 設為前端**精確** HTTPS origin；
- 不要使用寬鬆 `*` 代替 credential-aware origin policy；
- 同時檢查 proxy 對 Authorization header、methods、status codes 與 response content type 的轉送。

## 7. H2 部署

環境變數：

```bat
set "PORT=8080"
set "OVMJ_DATA_PATH=D:\secure-data\mahjong"
set "OVMJ_DB_USERNAME=sa"
set "OVMJ_DB_PASSWORD=replace-with-secret"
set "OVMJ_DB_DDL_AUTO=update"
set "OVMJ_H2_CONSOLE_ENABLED=false"
set "OVMJ_ALLOWED_ORIGINS=https://mahjong.example.com"
set "OVMJ_TOKEN_DAYS=30"
java -jar "backend\target\mahjong-scorekeeper-backend-1.0.0.jar"
```

也可用 `OVMJ_DB_URL` 指定完整 H2 JDBC URL。資料目錄必須：

- 非 ephemeral；
- Java service account 可讀寫；
- 其他使用者無權讀取；
- 納入 database-aware backup；
- 容量與 backup failure 有監控。

不要在 public deployment 開啟 H2 console。

## 8. PostgreSQL 部署

必要 profile 與 credential：

```bat
set "SPRING_PROFILES_ACTIVE=postgresql"
set "OVMJ_DB_HOST=db.example.internal"
set "OVMJ_DB_PORT=5432"
set "OVMJ_DB_NAME=mahjong"
set "OVMJ_DB_USERNAME=mahjong_app"
set "OVMJ_DB_PASSWORD=replace-with-secret"
set "OVMJ_DB_DDL_AUTO=update"
set "OVMJ_ALLOWED_ORIGINS=https://mahjong.example.com"
java -jar "backend\target\mahjong-scorekeeper-backend-1.0.0.jar"
```

完整 URL override：

```bat
set "OVMJ_DB_URL=jdbc:postgresql://db.example.internal:5432/mahjong"
```

`OVMJ_DB_USERNAME`、`OVMJ_DB_PASSWORD` 沒有 checked-in default，PostgreSQL profile 必須提供。

使用 OS secret mechanism、service manager environment、container secret 或 managed secret store；不要把真實秘密寫進 `app-config.js`、Git、公開 build log 或 deployment script repository。

## 9. JPA 首次建表

`application.properties` 與 `application-postgresql.properties` 預設：

```text
OVMJ_DB_DDL_AUTO=update
```

首次啟動會依 entities 建立缺少的：

```text
app_account
api_token
player_profile
game_session
```

首次初始化的 DB user 必須有 create／alter／index 所需權限。啟動後檢查 schema、indexes、constraints 與 API smoke。

正式穩定後建議：

```bat
set "OVMJ_DB_DDL_AUTO=validate"
```

並使用 Flyway／Liquibase／等效 versioned migrations 管理後續 schema。`update` 不提供 migration audit、可預測 destructive change 或 rollback，不應被當成完整 production migration 系統。

## 10. Build artifact 與 service 啟動

Build：

```bat
mvn -f "backend\pom.xml" test
mvn -f "backend\pom.xml" package
```

主 artifact：

```text
backend/target/mahjong-scorekeeper-backend-1.0.0.jar
```

Spring Boot repackage 保留原始 artifact：

```text
backend/target/mahjong-scorekeeper-backend-1.0.0.jar.original
```

Production service manager 應設定：

- Java 17 executable；
- working directory／data path；
- environment／secret injection；
- restart policy；
- stdout/stderr log rotation；
- startup、readiness 與 `/api/health` probes；
- memory／CPU limit；
- graceful stop timeout。

## 11. Pre-deployment validation

在 repository root：

```bat
python -u run_tests.py --self-test
python -u run_scorekeeper_tests.py --browser all --timeout 120
python -u run_tests.py --browser all --timeout 120
mvn -f "backend\pom.xml" test
mvn -f "backend\pom.xml" package
```

要求：

```text
Scorekeeper/guest/account/contracts
Chrome 47/47，Edge 47/47，0 failures/errors

Scoring
Chrome 137/137，Edge 137/137，0 failures/errors

Java
3/3，0 failures/errors/skips，BUILD SUCCESS

Package
BUILD SUCCESS，JAR 存在且非零大小
```

Smoke checklist：

- `/` 與 `/mahjong-suite/` 顯示訪客警告及登入 CTA。
- 訪客計番、轉移、提交、餘額／圖表正常。
- 訪客刷新後資料消失，且沒有 import/export/share。
- 無效計番停用轉移；有效計番分開顯示 hand/dealer/total。
- 草稿只帶 `handTai` 且不自動建立 history。
- 登入前 workspace iframe 未載入。
- 登入後 `/me`、`/sessions`、`/players` 全部成功才顯示。
- DB save/load/versioned delete/server exports 正常。
- logout 與 forced 401 清 token/UI/version 並卸載 iframe。
- Cross-account ownership isolation。
- PostgreSQL staging 首次建表或 `validate`／migrations 正常。
- Browser console、Java logs 無 missing file 或例外。

## 12. GitHub Pages

GitHub Pages 可直接提供訪客 static app，因 root `index.html` 會導向 `./mahjong-suite/`。現有 `.github/workflows/` 是 GitHub Skills 課程自動化，不是經審核的 production deployment pipeline。

若使用 branch publishing，repository root 的其他檔案也可能公開。若不希望公開測試、docs 或 source metadata，建立 least-privilege workflow，只複製第 2 節 runtime tree，並 pin third-party action versions。

登入版仍需要可由 browser 存取的 HTTPS Java API、正確 `app-config.js` 與 CORS；Pages 本身不會代管 Java process。

## 13. Cache 與相容性

- `mahjong-suite/app.js`、`mj.js`、`session-scorekeeper/app.js`、online adapter 與 HTML 是 coordinated release。
- 不要讓新 shell 搭配 CDN 中舊的 frame JS。
- Contract 或 schema 變更時一起 purge HTML/JS caches。
- 可用 hashed artifact／release directory，但必須保留 runtime relative URL contract。
- `ov-mj-calculation-result/v1` 或 `ov-mj-session/v1` 的不相容變更必須建立新 version。

訪客沒有 origin-scoped persistent session，因此換 domain 不需要匯出／搬移訪客資料；它本來就只在目前頁面。DB 版搬遷則須保留 database records、API URL、CORS 與 token policy。

## 14. Backup、rollback 與災難復原

### Static rollback

1. 重新部署上一個完整、coordinated runtime tree。
2. Purge proxy/CDN/browser-relevant caches。
3. Smoke root、guest transfer、login bootstrap 與 iframe paths。

### Backend rollback

1. 停止或排空寫入。
2. 備份目前 DB。
3. 套用 migration rollback plan，或 restore 相容 backup。
4. 啟動上一個相容 JAR。
5. 驗證 health、login、owned session read/write、version conflict、export。

### 定期演練

- H2／PostgreSQL backups 必須實際 restore 才算有效。
- 保留 artifact、environment manifest、schema version 與 deployment revision 對應。
- 舊 JSON evidence 不可證明新 deployment；timestamp、source hash／revision 必須一致。

## 15. Privacy 與上線安全

訪客版不把牌局送到應用 API，也不做 browser persistent storage；hosting provider 仍可能保存 HTTP access logs。

登入版會傳送 credential 與牌局 aggregate。Public deployment 必須使用 HTTPS、精確 CORS、受保護 DB、strong secret、backup、monitoring、rate limit、incident response 與 token revocation procedure。上線前應進行 threat review、dependency review 與 security testing。

# Java／資料庫登入版使用與管理手冊

## 1. 系統組成

登入版重用同一套計番與整場記分邏輯，Java 只負責戶口、驗證、ownership、版本與持久化：

```text
session-scorekeeper-online/   登入、戶口 UI、玩家與 DB 同步控制
        |
        +-- iframe（登入並完成驗證後才建立）
        v
mahjong-suite/                計番 + 整場記分整合殼層
        |-- mj.html            單局計番
        +-- session-scorekeeper/  記憶體 aggregate、付款與 replay

session-scorekeeper-online/ --fetch--> Spring Boot /api --> H2／PostgreSQL
```

Java 後端儲存並驗證完整 `ov-mj-session/v1` payload，但不重新計算牌型、付款、連莊、拉莊、斷拉、圖表或找數。這些 domain 規則仍只由前端既有實作負責。

## 2. 已驗證技術基線

- Java：17（`backend/pom.xml` 的 `<java.version>17</java.version>`）
- Spring Boot：3.5.7
- Maven：已使用 3.6.3 驗證
- Spring Web、Validation、Data JPA、Security Crypto
- 預設 H2 file database
- 可選 PostgreSQL JDBC profile
- Browser token：目前分頁的 `sessionStorage`
- DB session：目前戶口擁有的 persistent record

本機驗證工具：

```text
Java 17: D:\openjdk-17+35_windows-x64_bin\jdk-17
Maven:   D:\itdev\apache-maven-3.6.3\bin
```

## 3. H2 快速啟動

### 3.1 測試與打包

在專案根目錄開啟 Windows `cmd`：

```bat
set "JAVA_HOME=D:\openjdk-17+35_windows-x64_bin\jdk-17"
set "PATH=%JAVA_HOME%\bin;D:\itdev\apache-maven-3.6.3\bin;%PATH%"
mvn -f "backend\pom.xml" test
mvn -f "backend\pom.xml" package
```

成功 artifact：

```text
backend\target\mahjong-scorekeeper-backend-1.0.0.jar
backend\target\mahjong-scorekeeper-backend-1.0.0.jar.original
```

### 3.2 啟動 API

```bat
java -jar "backend\target\mahjong-scorekeeper-backend-1.0.0.jar"
```

或開發時：

```bat
mvn -f "backend\pom.xml" spring-boot:run
```

預設：

```text
API:      http://127.0.0.1:8080/api
H2 URL:   jdbc:h2:file:./data/mahjong;AUTO_SERVER=TRUE
H2 user:  sa
H2 pass:  空字串
DDL:      update
CORS:     http://127.0.0.1:8000,http://localhost:8000
```

`./data/mahjong` 以 Java process 的目前工作目錄為基準。正式使用時建議透過 `OVMJ_DATA_PATH` 或 `OVMJ_DB_URL` 指定明確、受保護且會備份的位置。

### 3.3 啟動前端

另一個 terminal 在專案根目錄執行：

```bat
python -m http.server 8000
```

開啟：

```text
http://127.0.0.1:8000/session-scorekeeper-online/
```

## 4. 登入 lifecycle

### 4.1 登入前

- 整合工作區 iframe 只有 `data-src="../mahjong-suite/?embedded=1&account=1"`。
- 頁面不設定真正 `src`，所以不會在未驗證戶口前載入牌局 UI。
- 訪客可返回 `/mahjong-suite/`，但訪客版資料只存在該頁記憶體。

### 4.2 登入或註冊後

API 發出 token 後，前端必須全部成功取得：

```text
GET /api/me
GET /api/sessions
GET /api/players
```

只有三項都成功，`ensureWorkspace()` 才設定 iframe `src` 並顯示工作區。若其中一項失敗，不會把未完整驗證的戶口工作區顯示給使用者。

### 4.3 登出或未授權

使用者按「安全登出」時，若 host 回報 dirty 會先確認；取消不會清除工作區。使用者確認後，`clearAuthentication()` 會：

1. 移除 `sessionStorage` token；
2. 清除清單列版本及工作區 payload 綁定版本；
3. 清空戶口、牌局及玩家 UI；
4. 呼叫 `unloadWorkspace()` 移除 iframe `src`；
5. 登出流程同時 best-effort 呼叫 `/api/auth/logout` 撤銷 DB token。

所有受保護 API 與 export 遇到 HTTP 401 都會立即採用相同清除／卸載，不會讓 dirty confirmation 阻擋安全 teardown。每個非 bootstrap continuation 也會比對發出時 token 與 `workspaceGeneration`，所以舊戶口的 late response 不可套用到重新登入後的新 iframe。這不是單純以 CSS 隱藏 iframe，而是實際卸載。

## 5. 戶口版操作

1. 註冊或登入。
2. 等待戶口、牌局、玩家三項資料全部驗證完成。
3. 初始工作區顯示「新增未儲存」；可按「新增獨立牌局」為每一場建立不同隨機 ID／名稱，或從清單載入既有 DB 牌局。
4. 在工作區計番，並把 `handTai` 帶入本局草稿；草稿本身不 dirty，提交牌局或其他 session mutation 才會顯示「有未儲存變更」。
5. 按「儲存目前牌局到 DB」。這是明確操作，沒有 autosave；保存按鈕在請求期間鎖定，載入／刪除 transition 也會暫時停用 iframe 與競爭控制，避免 double save、途中新增修改或 response 亂序覆蓋。
6. 可從自己的 DB 清單載入、刪除或匯出牌局；載入／新建／登出／訪客導航／關頁只在 dirty 時提示。
7. 常用玩家可新增、刪除，並在每列選東／南／西／北把名稱複製到牌局。牌局玩家名稱最多 20 字，較長 profile 會被明確拒絕而非靜默截斷；這不是 player profile 與 session 的 DB 關聯，也不會複製 profile 顏色。
8. 刪除目前開啟的 DB 牌局後，前端會改成 clean、隨機新 ID、尚未保存的工作區；完成後可安全登出。

保存前，外層只透過 delegated `OVMJSessionHost`：

```text
await ready -> getSessionStatus() -> getSession() -> normalizeSession()
            -> choose workspace-bound expectedVersion -> PUT
            -> bind returned SessionView.version -> markSaved()
```

載入時：

```text
GET owned payload + version -> normalize -> replaceSession()
                            -> bind GET version -> markSaved()
                            -> current-page memory workspace
```

`listSessionVersions` 只反映最近清單，供列狀態／刪除；`workspaceVersions` 只由實際 GET payload 或成功 PUT 回傳值更新。玩家 CRUD 與一般 refresh 可以更新清單，但不得推進 workspace optimistic base。若清單已有相同 ID 而 workspace 沒有 binding，PUT 會在前端被拒絕並要求先載入；409 不會取代或清除本頁工作。

內層記分器不寫 `localStorage`。DB 是唯一 durable session persistence；使用者必須看到儲存成功才代表資料已永久寫入。

## 6. 前端 API 設定

根目錄 `app-config.js`：

```js
(function (global) {
    const applicationRoot = new URL('./', document.currentScript?.src || location.href);
    global.OVMJ_APP_CONFIG = Object.freeze({
        apiBaseUrl: 'http://127.0.0.1:8080/api',
        guestEntryUrl: new URL('mahjong-suite/index.html', applicationRoot).href,
        accountEntryUrl: new URL('session-scorekeeper-online/index.html', applicationRoot).href,
        requestTimeoutMs: 15000
    });
}(window));
```

正式部署若由同一 origin 反向代理 API，建議：

```js
apiBaseUrl: '/api'
```

可接受 root-relative `/api`、絕對 HTTPS、或 loopback HTTP。會拒絕遠端 HTTP、URL 帳密、query 與 fragment。所有請求受 `requestTimeoutMs` 控制。

此檔案會傳到每一個 browser，禁止放入：

- DB username／password；
- API bearer token；
- 私有網路秘密；
- 任何只應存在伺服器的 credential。

## 7. 後端 common properties

正式設定檔：

```text
backend/src/main/resources/application.properties
backend/src/main/resources/application-postgresql.properties
```

測試隔離設定：

```text
backend/src/test/resources/application.properties
```

專案不再並存 YAML，避免 Spring 設定 precedence 混淆。

Common／H2 環境變數：

| 變數 | 預設 | 用途 |
|---|---|---|
| `PORT` | `8080` | Java HTTP port |
| `OVMJ_DB_URL` | H2 file URL | 完整 JDBC URL；設定後覆蓋組合值 |
| `OVMJ_DATA_PATH` | `./data/mahjong` | H2 file prefix |
| `OVMJ_DB_USERNAME` | `sa` | datasource user |
| `OVMJ_DB_PASSWORD` | 空 | datasource password |
| `OVMJ_DB_DDL_AUTO` | `update` | Hibernate schema 動作 |
| `OVMJ_H2_CONSOLE_ENABLED` | `false` | 是否開啟 H2 console |
| `OVMJ_ALLOWED_ORIGINS` | 本機 port 8000 兩個 origin | 逗號分隔的精確 CORS origins |
| `OVMJ_TOKEN_DAYS` | `30` | bearer token 有效日數 |

正式環境請使用強密碼，保持 H2 console 關閉，並將資料檔放在限制權限、可備份的 volume。

## 8. PostgreSQL 設定

### 8.1 必要與可選變數

| 變數 | 預設／要求 | 用途 |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | 設為 `postgresql` | 啟用 PostgreSQL profile |
| `OVMJ_DB_HOST` | `127.0.0.1` | DB host／IP |
| `OVMJ_DB_PORT` | `5432` | DB port |
| `OVMJ_DB_NAME` | `mahjong` | database name |
| `OVMJ_DB_URL` | 由 host/port/name 組合 | 可選完整 JDBC URL override |
| `OVMJ_DB_USERNAME` | **必填，無預設** | PostgreSQL user |
| `OVMJ_DB_PASSWORD` | **必填，無預設** | PostgreSQL password |
| `OVMJ_DB_DDL_AUTO` | `update` | 首次建表／schema 行為 |

完整 URL 例子：

```text
jdbc:postgresql://127.0.0.1:5432/mahjong
```

### 8.2 Windows `cmd` 啟動例子

請把 placeholder 改為部署環境的秘密，不要提交到 Git：

```bat
set "SPRING_PROFILES_ACTIVE=postgresql"
set "OVMJ_DB_HOST=127.0.0.1"
set "OVMJ_DB_PORT=5432"
set "OVMJ_DB_NAME=mahjong"
set "OVMJ_DB_USERNAME=mahjong_app"
set "OVMJ_DB_PASSWORD=replace-with-secret"
set "OVMJ_DB_DDL_AUTO=update"
set "OVMJ_ALLOWED_ORIGINS=https://mahjong.example.com"
java -jar "backend\target\mahjong-scorekeeper-backend-1.0.0.jar"
```

若使用完整 JDBC URL：

```bat
set "OVMJ_DB_URL=jdbc:postgresql://db.example.internal:5432/mahjong"
```

`OVMJ_DB_URL` 設定後不再需要由 host／port／name 組合 URL，但 username 與 password 仍必須提供。

## 9. JPA 首次建表與正式 schema 管理

H2 與 PostgreSQL profile 都預設：

```properties
spring.jpa.hibernate.ddl-auto=${OVMJ_DB_DDL_AUTO:update}
```

首次啟動時，連線戶口必須有建立／修改 schema 權限。Hibernate 會依 entities 建立缺少的 tables／columns，包括：

- `app_account`
- `api_token`
- `player_profile`
- `game_session`

`update` 適合首次建置與受控開發環境，但不是完整 production migration 策略；它不會代替經審核的資料轉換、rollback 或破壞性變更管理。

建議正式流程：

1. 在測試／staging 以 `update` 建立或檢查初始 schema，或先由管理員 provision schema。
2. 檢查 tables、indexes、constraints 及 backup／restore。
3. 穩定後把 production `OVMJ_DB_DDL_AUTO` 改成 `validate`。
4. 後續 schema 變更使用 Flyway、Liquibase 或等效的版本化 migration。
5. 部署新 JAR 前先備份，並確保舊 JAR 與 DB schema 的 rollback 相容性。

若使用 `validate` 而 schema 尚未建立，啟動會失敗；這是正確的 fail-fast 行為。

## 10. REST API

公開：

| Method | Path | 用途 |
|---|---|---|
| `GET` | `/api/health` | health check |
| `POST` | `/api/auth/register` | 建立戶口並發出 token |
| `POST` | `/api/auth/login` | 驗證密碼並發出 token |

受保護請求使用：

```http
Authorization: Bearer <token>
```

| Method | Path | 用途 |
|---|---|---|
| `POST` | `/api/auth/logout` | 撤銷目前 token |
| `GET` | `/api/me` | 目前戶口 |
| `GET/POST` | `/api/players` | 列出／建立常用玩家 |
| `PUT/DELETE` | `/api/players/{id}` | 修改／刪除自己的玩家 |
| `GET` | `/api/sessions` | 列出自己的牌局 |
| `GET` | `/api/sessions/{id}` | 取得自己的完整牌局 |
| `PUT` | `/api/sessions/{id}` | 建立或版本化取代 |
| `DELETE` | `/api/sessions/{id}?expectedVersion={version}` | 版本化刪除 |
| `GET` | `/api/sessions/{id}/export.json` | 完整 JSON |
| `GET` | `/api/sessions/{id}/export.txt` | 可閱讀標頭與完整資料 |

建立使用 `expectedVersion: null`；更新只使用目前 workspace 由 GET／成功 PUT 綁定的 version，刪除則使用所點清單列的 version。清單 refresh 或 player CRUD 不會替 workspace 猜測／推進版本。過期版本回傳 HTTP 409，前端保留未儲存 payload。

## 11. 資料模型與安全

- `app_account`：正規化 unique email、BCrypt hash、顯示名稱、建立時間。
- `api_token`：unique SHA-256 token hash、owner、建立／到期時間；不保存 bearer token 明文。
- `player_profile`：owner、顯示名稱、顏色。
- `game_session`：owner、標題、schema、完整 JSON、JPA `@Version`、timestamps。

安全基線：

- 密碼使用 BCrypt cost 12，並限制在 BCrypt 的 72-byte UTF-8 上限。
- token 使用加密安全亂數；DB 只存 SHA-256 hash。
- 所有非 health／register／login 的 `/api/**` 都由 interceptor 保護。
- 玩家與牌局 query 都以 owner 限制。
- 其他戶口不能認領已存在的 session ID；跨戶口查詢回傳 not found。
- payload 驗證 schema、四名 unique 玩家、entry IDs/types、winner/discarder/bao 關係、數值範圍、最多 5,000 entries 與 2 MB UTF-8。
- CORS 只允許設定的精確 origins／methods／headers。

這是應用基線，不代表已完成 penetration test。公開 Internet 上線前應再加入 rate limit、帳戶復原／驗證、全裝置撤銷、audit log、監控、告警與 managed secret store。

## 12. 測試與打包結果

Java 17 指令：

```bat
mvn -f "backend\pom.xml" test
mvn -f "backend\pom.xml" package
```

目前結果：

```text
Tests run: 3, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

`ApiIntegrationTest` 使用 MockMvc 與 in-memory H2，涵蓋 health、受保護 route、註冊、登入、目前戶口、logout token 撤銷、玩家、session CRUD、過期 update/delete、跨戶口隔離、payload rejection 與 JSON/TXT export。

Browser lifecycle 與整合測試另有：

```text
Chrome 47/47，Edge 47/47
Chrome 計番 137/137，Edge 計番 137/137
```

瀏覽器測試不取代 Java test，Java test 也不取代實際 PostgreSQL staging smoke test。

## 13. 備份、更新與營運

### H2

- 備份 `OVMJ_DATA_PATH` 對應的 `.mv.db`，最好在停止寫入或使用 database-aware 流程時進行。
- 不要把 DB 放在 ephemeral 工作目錄。
- 保持 console 關閉並限制檔案權限。

### PostgreSQL

- 使用定期 full／incremental backup 與實際 restore drill。
- 應用 user 使用最小權限；首次建表權限與穩定後 runtime 權限可分開。
- 監控連線、容量、錯誤、慢查詢與 backup 狀態。

### 更新／rollback

1. 執行 Chrome、Edge、Java tests。
2. 備份 DB。
3. 部署 coordinated frontend 與 JAR。
4. 驗證 health、登入、三項 bootstrap API、save/load/delete/export。
5. rollback 時使用上一個相容 JAR、前端 tree 與相容 DB backup／migration down plan。

詳細 static／reverse-proxy 佈署見 [部署手冊](DEPLOYMENT.md)。

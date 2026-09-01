# 測試與驗證手冊

## 1. 驗證範圍

本專案把驗證分為三套，結果必須分開報告：

1. **記分器／訪客／登入 lifecycle／跨 app contracts**：47 項，Chrome 與 Edge。
2. **Canonical 計番規則**：137 項，Chrome 與 Edge。
3. **Java API／JPA integration**：3 項，Java 17、MockMvc 與 in-memory H2。

Browser 通過不代表 Java 已編譯；Java 通過也不代表完整 browser UI 已驗證。正式 release 必須同時取得三類成功證據。

## 2. 環境需求

### Browser suites

- Python 3，可由 `python` 執行。
- Google Chrome 與 Microsoft Edge。
- Repository canonical files。
- 計番 runner 的 protected-material check 需要 sibling 文件：

```text
../台灣牌規則_OV_2.7.docx
```

Python runners 只使用 standard library，不需要 pip package。Node.js 不參與 browser suites。

### Java suite

目前已驗證路徑：

```text
Java 17: D:\openjdk-17+35_windows-x64_bin\jdk-17
Maven:   D:\itdev\apache-maven-3.6.3\bin
```

## 3. 一次完成所有主要驗證

在專案根目錄：

```bat
python -u run_scorekeeper_tests.py --browser all --timeout 120
python -u run_tests.py --browser all --timeout 120
set "JAVA_HOME=D:\openjdk-17+35_windows-x64_bin\jdk-17"
set "PATH=%JAVA_HOME%\bin;D:\itdev\apache-maven-3.6.3\bin;%PATH%"
mvn -f "backend\pom.xml" test
mvn -f "backend\pom.xml" package
```

目前驗證基線：

```text
Scorekeeper / guest / account lifecycle / contracts
Chrome: 47 discovered, 47 executed, 47 passed, 0 failed, 0 errors
Edge:   47 discovered, 47 executed, 47 passed, 0 failed, 0 errors

Canonical scoring
Chrome: 137 discovered, 137 executed, 137 passed, 0 failed, 0 errors
Edge:   137 discovered, 137 executed, 137 passed, 0 failed, 0 errors

Java 17 MockMvc/H2
Tests run: 3, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS

Java package
BUILD SUCCESS
backend/target/mahjong-scorekeeper-backend-1.0.0.jar
backend/target/mahjong-scorekeeper-backend-1.0.0.jar.original
```

## 4. 47 項記分器與整合 suite

### 4.1 檔案角色

| 檔案 | 角色 |
|---|---|
| `scorekeeper-tests.html` | 正式記分器、訪客、config、suite、登入 lifecycle 與 bridge cases |
| `run_scorekeeper_tests.py` | Standard-library loopback Chrome／Edge runner |
| `test-results/scorekeeper-latest.json` | 最近一次生成證據 |

Browser payload schema：

```text
ov-mj-scorekeeper-tests/v1
```

Outer evidence schema：

```text
ov-mj-scorekeeper-runner/v1
```

Runner 為每個 browser 建立獨立 temporary profile 與 loopback HTTP server。頁面完成後，以同來源 callback POST versioned payload 給 runner；這可避免 headless browser 對 nested iframe `--dump-dom` 的差異被誤判為測試結果。

### 4.2 執行方式

```bat
python -u run_scorekeeper_tests.py --browser all --timeout 120
python -u run_scorekeeper_tests.py --browser chrome --timeout 120
python -u run_scorekeeper_tests.py --browser edge --timeout 120
```

Release evidence 必須使用 `--browser all`。

### 4.3 覆蓋內容

- 正式 `session-scorekeeper/` startup、四名玩家與 UI。
- 出銃、自摸、包牌、一炮多響、流局、調整。
- 莊家延續／過莊、拉莊、斷拉、倍率、自訂規則。
- 初始餘額、replay、統計、圖表、篩選、undo／redo。
- schema rejection、scale 與 report formatting。
- 記憶體模式忽略舊 `localStorage` 值，且不覆寫。
- 無 storage conflict，顯示「此頁暫存」。
- 訪客 JSON／CSV／TXT／import／share controls 隱藏且不可達。
- `app-config.js` 公開設定與 guest/account entry。
- 訪客／戶口 shell mode。
- 登入前 no iframe load。
- 登入後 `/me`、`/sessions`、`/players` 全部驗證。
- save 使用 optimistic `expectedVersion`。
- host-based DB load。
- logout 立即卸載、清 token、server revoke。
- global 401 卸載與清 token。

必須保留的 stable IDs：

- `scorekeeper-draft-001`：填入 tai／note／self-draw，但 session history 不變。
- `calculator-bridge-001`：result、array、items immutable；`handTai=13`、`dealerBonusTai=5`、`totalTai=18`。
- `unified-shell-001`：草稿收到 13，而不是包含莊番的 18。

## 5. 137 項 canonical 計番 suite

### 5.1 檔案角色

| 檔案 | 角色 | 是否直接編輯 |
|---|---|---|
| `test.html` | Canonical cases 與 browser assertions | 是 |
| `mjConst.js` | Tile constants | 只有刻意更改牌種時 |
| `checkHandType.js` | Scoring runtime | 是 |
| `build_test.py` | 驗證並 inline canonical sources | 是 |
| `run_tests.py` | Strict runner 與 evidence validator | 是 |
| `test_standalone.html` | Generated standalone suite | 否 |
| `test-results/latest.json` | Generated evidence | 否 |

### 5.2 建置與執行

```bat
python -u build_test.py
python -u run_tests.py --browser all --timeout 120
```

單一 browser：

```bat
python -u run_tests.py --browser chrome --timeout 120
python -u run_tests.py --browser edge --timeout 120
```

自動選第一個可用 browser：

```bat
python -u run_tests.py --browser auto
```

指定 executable：

```bat
python -u run_tests.py --browser "C:\Path\To\browser.exe" --timeout 120
```

驗證 runner 本身會拒絕錯誤／不完整 evidence：

```bat
python -u run_tests.py --self-test
```

### 5.3 Builder 保證

`build_test.py`：

1. 驗證 required markers／completion elements；
2. 拒絕 missing、duplicate、empty、malformed extraction；
3. hash canonical sources；
4. 注入 build metadata；
5. inline `mjConst.js` 與 `checkHandType.js`；
6. normalise deterministic output；
7. atomic replace `test_standalone.html`。

`run_tests.py` 會自動呼叫 builder。

### 5.4 Case 與 completion contract

每個 case 有 stable ID、setup、required／prohibited result、category／seed 及可選 preservation baseline。預設 exact name／score；family match 必須明確宣告。min／max count 用來抓 missing 或 duplicate results。

Browser payload schema：

```text
mahjong-test-result/v1
```

成功不變條件：

```text
discovered = executed = passed
failed = 0
errors = 0
invariant = true
status = success
```

Outer evidence schema：

```text
mahjong-runner-evidence/v1
```

它記錄 timestamp、invocation、browser executable/version、source hashes、protected material、Git revision（可取得時）、build output、manual/automatic parity 及完整 nested payload。

目前基線亦包含：

- 原 canonical IDs：117/117；
- preservation：3/3；
- 14 個無字與 3 個嚦咕修訂 IDs 全部存在；
- automatic/manual harness parity 通過。

### 5.5 `run_tests.py` exit codes

| Code | 意義 |
|---:|---|
| `0` | 成功 |
| `1` | 一個或以上 browser assertions 失敗 |
| `2` | Runner 內 standalone build 失敗 |
| `3` | 指定 browser 不存在 |
| `4` | Hard timeout |
| `5` | Infrastructure、evidence 或 protected-material 失敗 |
| `6` | Runner self-test 失敗 |

`argparse` 對無效 command syntax／數值也可能回傳 2。診斷時必須一起查看 console、exit code 與 JSON evidence。

## 6. Java API／JPA tests

Test config：

```text
backend/src/test/resources/application.properties
```

它固定使用：

```text
jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1
spring.jpa.hibernate.ddl-auto=create-drop
H2 console disabled
```

執行：

```bat
set "JAVA_HOME=D:\openjdk-17+35_windows-x64_bin\jdk-17"
set "PATH=%JAVA_HOME%\bin;D:\itdev\apache-maven-3.6.3\bin;%PATH%"
mvn -f "backend\pom.xml" test
```

`ApiIntegrationTest` 涵蓋：

- public health 與 protected authentication；
- register、login、`/me`、logout token revocation；
- player create/list；
- session create/update/delete；
- stale update/delete HTTP 409；
- cross-account same-ID GET／PUT isolation；
- schema／invalid bao rejection；
- JSON／TXT exports。

Package 會再次執行 tests 並產生 executable Spring Boot JAR：

```bat
mvn -f "backend\pom.xml" package
```

## 7. Evidence 核對

### `test-results/scorekeeper-latest.json`

至少確認每個 browser：

```text
status = success
discovered = executed = passed = 47
failed = errors = 0
browserAppState = ready
```

### `test-results/latest.json`

至少確認每個 browser：

```text
status = success
discovered = executed = passed = 137
failed = errors = 0
invariant = true
```

生成 JSON 不應手動編輯。Source 改變後要重新執行，不可用舊 timestamp／hash 當作新 revision 證據。

## 8. Release checklist

1. 執行 `run_tests.py --self-test`。
2. 執行 47 項 Chrome／Edge suite。
3. 執行 137 項 Chrome／Edge suite。
4. 確認兩份 evidence 的 counts、status、timestamp 與 source revision。
5. 用 Java 17 執行 `mvn test`。
6. 執行 `mvn package` 並核對 JAR 存在及非零大小。
7. 啟動 API，smoke `/api/health`。
8. Smoke 訪客入口、登入入口、API default。
9. 驗證訪客重新整理資料消失且無 import/export/share。
10. 驗證登入前 no iframe；登入後三個 bootstrap APIs 才顯示。
11. 驗證 save/load/delete/export/logout 與 forced 401。
12. 驗證 transfer 只使用 `handTai` 且不自動 commit。
13. PostgreSQL release 另在 staging 驗證首次建表或 `validate`／migrations。
14. 檢查 `git status --short` 與所有 generated／deleted files。

## 9. 本次 runner 環境注意事項

- Browser suites 是 JavaScript runtime 的主要驗證證據。
- Node 19.2.0 位於 `D:\itdev\node-v19.2.0-win-x64`，但 Node 並非 suites 的必要條件。
- 此自動 command wrapper 對直接 `node --check` 與帶 `set` 的同步 Maven 呼叫曾無 JavaScript／Maven diagnostic 地回傳 exit 1。
- 完整 Chrome／Edge payload 與背景 Maven terminal 的 `BUILD SUCCESS` 才是本次可重現的有效證據；不能把無 diagnostic 的 wrapper code 當作程式失敗。

## 10. 疑難排解

- **找不到 browser**：安裝 Chrome／Edge、加入 PATH，或傳入 executable full path。
- **protected material fail**：確認 `台灣牌規則_OV_2.7.docx` 位於 repository 上一層。
- **timeout**：結束遺留 browser process，確認 headless 可啟動，再合理增加 timeout；不要以 timeout 掩蓋 hang。
- **evidence stale／malformed**：不要手改 JSON；從 canonical sources 重跑。
- **手動頁面正常但 runner fail**：先看 schema、counts、source hash、parity、callback 與 startup error。
- **記分器 case fail**：用 stable ID 判斷是 domain、UI、memory lifecycle、config、auth mock 或 infrastructure。
- **Java test fail**：確認實際 `java -version` 是 17、Maven 使用同一 `JAVA_HOME`，再看 Surefire 完整 stack trace。
- **PostgreSQL startup fail**：確認 profile、JDBC URL、required username/password、network、schema 權限與 `OVMJ_DB_DDL_AUTO`。

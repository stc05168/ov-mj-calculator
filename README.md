# One Victoria 台灣麻將計番與整場記分

這是一套使用繁體中文、支援台灣 16 張麻將的瀏覽器應用程式。專案將單局計番與四人整場記分整合成同一個流程，並提供兩種清楚分離的使用模式：免登入訪客版，以及登入後由 Java API／資料庫保存的戶口版。

計番核心與瀏覽器測試依照專案的台灣麻將 v2.7 規則參考，包括 2026 年 2 月的無字排除與嚦咕嚦咕修訂。

## 兩種模式

| 模式 | 入口 | 資料保存 | 適合情境 |
|---|---|---|---|
| 訪客／免登入 | `/index.html` 或 `/mahjong-suite/index.html` | **只存在目前頁面的記憶體** | 即時計番、臨時記錄整場食糊結果 |
| 戶口／資料庫 | `/session-scorekeeper-online/index.html` | 登入戶口擁有的 H2 或 PostgreSQL 記錄 | 長期保存、載入、刪除、匯出牌局與管理常用玩家 |

重要行為：

- 訪客版不讀寫 `localStorage`，也不監聽跨分頁 `storage` 事件。
- 訪客版沒有 JSON／CSV／TXT 匯入匯出或分享功能；重新整理、關閉頁面或前往登入頁後，未保存資料會消失。
- 按下「登入／建立戶口」會前往戶口版，但**不會把訪客頁面的暫存資料搬過去**。
- 戶口版在登入前不載入計番／記分 iframe；登入後必須成功驗證 `/me`、`/sessions`、`/players` 才顯示工作區。
- 登出或 API 回傳未授權（HTTP 401）時，前端會清除 token、清單／工作區版本與戶口 UI，並卸載工作區 iframe，避免下一位使用者看到前一戶口的頁面狀態。HTTP 401 的安全卸載不會被未儲存提示阻擋。
- 共用記分器本身永遠是記憶體模式；持久化只由已登入的外層應用透過 Java API 寫入資料庫。
- 戶口版不會自動保存。外層會顯示目前牌局名稱，以及「新增未儲存」、「有未儲存變更」或「已儲存 · DB 版本」；載入、另開新牌局、登出、前往訪客版及關閉／重新整理前，只在有未儲存變更時提示。
- 「新增獨立牌局」會建立新的隨機 ID 與可命名工作區，可在同一戶口保存多場互不影響的牌局。常用玩家會套用到穩定的「我／玩家 2／玩家 3／玩家 4」身份；之後調位只改變快速帳的上家／對家／下家顯示，不會改名、改分數或建立 DB 關聯。

完整說明請參閱：[整合應用手冊](docs/UNIFIED_APP.md)、[訪客記分器手冊](docs/SESSION_SCOREKEEPER.md)、[Java／資料庫管理手冊](docs/FULL_STACK.md)。

## 快速開始

### 1. 啟動靜態前端

在專案根目錄執行：

```bat
python -m http.server 8000
```

訪客入口：

```text
http://127.0.0.1:8000/index.html
http://127.0.0.1:8000/mahjong-suite/index.html
```

根目錄 `index.html` 會導向 `mahjong-suite/index.html`。獨立工具仍可使用：

```text
http://127.0.0.1:8000/mj.html
http://127.0.0.1:8000/session-scorekeeper/index.html
```

登入入口：

```text
http://127.0.0.1:8000/session-scorekeeper-online/index.html
```

停止本機靜態伺服器請按 `Ctrl+C`。Python 只用於方便地提供本機 HTTP 與執行測試；前端正式執行不需要 Python、Node.js 或套件安裝。

### 2. 啟動 Java API（登入版需要）

目前驗證使用：

- Java 17：`D:\openjdk-17+35_windows-x64_bin\jdk-17`
- Maven：`D:\itdev\apache-maven-3.6.3\bin`

Windows `cmd`：

```bat
set "JAVA_HOME=D:\openjdk-17+35_windows-x64_bin\jdk-17"
set "PATH=%JAVA_HOME%\bin;D:\itdev\apache-maven-3.6.3\bin;%PATH%"
mvn -f "backend\pom.xml" test
mvn -f "backend\pom.xml" package
java -jar "backend\target\mahjong-scorekeeper-backend-1.0.0.jar"
```

沒有指定 profile 時會使用本機 H2 檔案資料庫，預設 API 為：

```text
http://127.0.0.1:8080/api
```

PostgreSQL、CORS、JPA 建表與正式環境設定請參閱 [Java／資料庫管理手冊](docs/FULL_STACK.md)。

## 前端公開設定

所有瀏覽器入口共用根目錄的 `app-config.js`：

```js
window.OVMJ_APP_CONFIG = Object.freeze({
    apiBaseUrl: 'http://127.0.0.1:8080/api',
    guestEntryUrl: /* 依 app-config.js 所在位置自動產生 */,
    accountEntryUrl: /* 依 app-config.js 所在位置自動產生 */,
    requestTimeoutMs: 15000
});
```

部署時通常只需調整 `apiBaseUrl`，同網域反向代理建議使用 `/api`。可接受的 API 位址只有：

- 同來源、由 `/` 開始的 root-relative 路徑，例如 `/api`；
- 絕對 HTTPS URL；
- 本機 loopback 的 HTTP URL，例如 `http://127.0.0.1:8080/api` 或 `http://localhost:8080/api`。

遠端 HTTP、URL 內含帳密、query string 或 fragment 都會被拒絕。

`app-config.js` 是公開下載的前端檔案，**絕對不可放入 DB username、DB password、API token 或任何秘密**。資料庫連線資料只能設定在 Java 後端環境變數。

## 使用流程

### 訪客版

1. 開啟訪客入口；預設顯示三欄快速帳，以第一位玩家 `p1` 為固定的「我（記分者）」。左、中、右依次是上家 `p4`、對家 `p3`、下家 `p2`；這只是舊牌局的預設 mapping，不是風位身份。
2. 玩家名稱可直接修改。每欄輸入番數後按「我食」或「被食」；同方向連續輸入會讓較早各鋪按每個後續輸入再乘 `1.5`。
3. 例如依次輸入 10、20、8 番，拉番為 `10 × 2.25 + 20 × 1.5 + 8 = 60.5 番`，不是 `×1.5、×2` 的線性倍率。
4. 若尚未結算便由「我食」轉成「被食」或相反，系統會先按正常整欄向外取整規則結算舊方向，再只保留新方向第一筆；不會折半或建立斷拉。
5. 按該欄「結算」後，結果才以既有零和 `adjustment` entry 寫入牌局；pending 會清空，四家目前總分繼續累計。頁首「復原」可整體撤銷快速輸入、結算或方向反轉結算。
6. 玩家重新執位時按「調整座位」：可拖曳、先點兩張卡交換，或用鍵盤操作。`我` 固定；上家／對家／下家可交換。確認只更新 `physicalSeats`，pending 會跟玩家 ID 移動，分數、莊家與歷史不變；取消不會改動牌局。每完成 4 局會出現可略過的非阻塞提示。
7. 自摸、一炮多響、流局、莊家覆寫或由計番器帶入時，展開「進階記一局」。計番轉移只填草稿，不會自動新增歷史。
8. 三欄未結算項目只存在目前畫面，不在 `ov-mj-session/v1` aggregate 內；重新整理、換牌局或關頁會消失。訪客資料本身不能保存或匯出。

手機 390px 仍保留三欄並排，常用按鈕至少 44px；嵌入戶口版時會收起重複的整合／記分標頭及提示。

### 戶口版

1. 開啟登入入口，註冊或登入。
2. 系統完成戶口、牌局清單與常用玩家驗證後才載入工作區。
3. 按外層「新增獨立牌局」，以日期／時間建議名稱建立另一場隨機 ID 牌局；也可直接載入已保存牌局。每一場都要分別保存。
4. 使用與訪客版相同的三欄快速帳；**先按欄內「結算」**，該筆才會進入 aggregate 並標示為未儲存。未結算列不會被「儲存目前牌局到 DB」保存。
5. 需要完整牌局語意時使用「進階記一局」；計番器仍只帶入牌型番草稿。狀態顯示「有未儲存變更」時，內容仍只在目前頁面，並非 autosave。
6. 按「儲存目前牌局到 DB」。第一次成功會顯示「建立」，之後以已載入／已保存 payload 綁定的版本「更新」；版本衝突不會清除本頁修改。
7. 常用玩家可新增或刪除；在 profile 列選「我（記分者）」或玩家 2／3／4再按「套用」，只會把名稱複製到穩定玩家 ID。之後調位不會改變名稱 ownership，也不會連動 profile 或顏色。
8. 可刪除自己的 DB 牌局，並從伺服器匯出 JSON 或 TXT。完成後登出；HTTP 401 會立即清除 token、版本與 iframe 工作區。

## 三欄快速帳計算與限制

同一方向內，第 `i` 鋪的倍率為：

```text
multiplier(i) = 1.5 ^（位於該鋪之後的輸入數）
```

快速帳輸入的番數已包含底，不另加 `baseAmount`。整欄先計算 signed 拉番，再依正負方向向外取整，最後乘每番值：

```text
column fan = Σ(direction × fan × multiplier)
rounded fan = sign(column fan) × ceil(abs(column fan))
amount = rounded fan × taiValue
```

例如預設每番 1，連續輸入三鋪 10 番：

```text
10 × 2.25 + 10 × 1.5 + 10 = 47.5
ceil(47.5) × 1 = 48
```

「被食」先對絕對值採相同規則再恢復負方向，付款正負對稱。方向反轉會先用同一正常 `ceil` 規則結算舊方向，再以新方向第一鋪重新開始。產品不再提供快速或全桌斷拉控制；舊 payload 中既有 `breakPull`／`breakPullAfter` 仍可載入、重播、顯示及刪除，避免破壞歷史牌局。

快速帳是 compatibility adapter：pending 不擴充 schema，結算才產生 `adjustment`。因此快速帳不會更新胡牌／自摸統計，也不會改變莊家、連莊或拉莊狀態；需要這些語意時應使用「進階記一局」。

## 計番轉移安全規則

計番器顯示合計已包含其固定莊番：

```text
calculator totalTai = handTai + dealerBonusTai
```

整場記分器會依目前牌桌狀態另外計算：

```text
session dealer tai = dealerBaseTai + streak × streakTai + pull × pullTai
```

因此整合殼層只會帶入 `handTai`，絕不帶入 `totalTai`，避免莊番重複收取。轉移只填寫未提交的本局草稿，不會自動新增歷史記錄。

## 主要功能

- 三欄上家／對家／下家快速帳、可直接改名、我食／被食、回溯 `×1.5` 拉番、整欄向外取整、四家累計總分、方向反轉自動正常結算及快速復原。
- 觸控友善調位：Pointer Events 拖曳、點兩張卡互換、鍵盤 fallback、確認／取消草稿、pending 跟玩家 ID 移動，以及每 4 局非阻塞提示。
- 新牌局預設底 5／每番 1；舊牌局明載的自訂設定保持不變。
- 滑鼠、觸控、點擊及拖放輸入牌張。
- 手牌、食糊牌、上牌、碰牌、明槓、暗槓、花牌與特殊條件。
- 自動判斷牌型、排除規則及番數合計。
- 四名純姓名玩家、初始分數、按姓名選擇起始莊家，以及自訂底／番／貨幣／莊番／連莊／拉莊規則。
- 進階表單支援出銃、自摸、包自摸、一炮多響、流局、手動賞罰與莊家覆寫；不再建立新斷拉紀錄。
- 舊 `breakPull`／`breakPullAfter` payload 保持 normalization、replay、顯示及刪除相容。
- 由不可變更的歷史重播餘額、莊家狀態、統計、SVG 圖表及精簡找數建議。
- 編輯／刪除、30 步 undo／redo 與篩選。
- 登入版提供多場獨立牌局、明確 dirty／DB 版本狀態、常用玩家名稱套用、戶口隔離、BCrypt 密碼、雜湊 bearer token、樂觀版本控制及 DB JSON／TXT 匯出。

## 自動驗證結果

在目前工作樹與指定工具路徑完成的驗證：

| 套件 | Chrome | Edge | 結果 |
|---|---:|---:|---|
| 三欄快速帳真實互動／375×812 smoke | PASS | 未另跑 | 19/19：47.5 正常→48、斷拉／方向反轉→23、整段處理非逐筆取整、負方向對稱、每番2→46、零值清理、多 segment、四家累計及無水平溢位均通過 |
| 既有記分器／訪客／登入 lifecycle／橋接 contracts | 37/47 | 37/47 | 各 10 個舊預設值 assertion 失敗、0 errors；47 項全部有執行 |
| 計番規則 | 137/137 | 137/137 | 各自 0 failures、0 errors |
| Java 17 MockMvc/H2 | 3/3 | 不適用 | 0 failures、0 errors、0 skipped，`BUILD SUCCESS` |

既有記分 suite 的 10 個固定失敗是 `settle-001`、`settle-002`、`dealer-002`、`selfdraw-001`、`selfdraw-002`、`selfdraw-003`、`multi-001`、`config-002`、`initial-001`、`ui-001`。它們仍硬編碼舊預設底 30／每番 10，而產品需求已改為 5／1；依要求沒有修改、刪除或弱化既有測試。兩個瀏覽器均為 37 passed、10 failed、0 errors，應用狀態為 ready。

指令：

```bat
python -u run_scorekeeper_tests.py --browser all --timeout 120
python -u run_tests.py --browser all --timeout 120
mvn -f "backend\pom.xml" test
```

證據：

- `test-results/scorekeeper-latest.json`
- `test-results/latest.json`

詳細測試方法見 [測試手冊](docs/TESTING.md)。

## 部署時必須保留的前端結構

```text
index.html
app-config.js
mahjong-suite/
mj.html
mj.css
mjConst.js
mj.js
checkHandType.js
session-scorekeeper/
session-scorekeeper-online/   # 只有提供登入版時需要
```

`mahjong-suite/`、計番器、記分器與登入殼層必須同來源部署，因為它們透過 same-origin iframe facade 協作。詳細部署方式見 [部署手冊](docs/DEPLOYMENT.md)。

## 專案結構

```text
.
├── index.html                    訪客入口導向頁
├── app-config.js                 公開前端 API／入口／逾時設定
├── mahjong-suite/                計番與整場記分整合殼層
├── mj.html / mj*.js / mj.css     原始單局計番器
├── session-scorekeeper/          記憶體整場記分器
├── session-scorekeeper-online/   登入與 DB 同步殼層
├── backend/                      Spring Boot 戶口／牌局 REST API
├── test.html                     137 項計番規則定義
├── scorekeeper-tests.html        47 項記分／整合 contracts
├── run_tests.py                  Chrome／Edge 計番 runner
├── run_scorekeeper_tests.py      Chrome／Edge 整合 runner
├── test-results/                 最近一次機器可讀證據
└── docs/                         維護中的繁中說明文件
```

## 文件索引

- [整合應用與使用手冊](docs/UNIFIED_APP.md)
- [訪客整場記分器](docs/SESSION_SCOREKEEPER.md)
- [Java／資料庫管理手冊](docs/FULL_STACK.md)
- [架構](docs/ARCHITECTURE.md)
- [測試](docs/TESTING.md)
- [部署](docs/DEPLOYMENT.md)
- [原計番器使用指南](docs/USER_GUIDE.md)
- [規則與計分行為](docs/RULES.md)

Chrome 與 Edge 有自動化通過證據。Firefox 與 Safari 可能可用，但本專案目前沒有它們的自動化證據。

## 授權

本專案採用 [MIT License](LICENSE)。

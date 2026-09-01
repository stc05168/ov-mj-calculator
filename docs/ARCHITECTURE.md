# 系統架構

## 1. 架構目標

專案把三個責任清楚分開：

1. **單局計番**：牌型、排除與番數。
2. **整場記分**：本局付款、莊家、拉莊、歷史 replay、圖表與找數。
3. **戶口持久化**：驗證、ownership、樂觀版本與 DB 儲存。

訪客與登入版共用同一個計番器及同一個記分器，避免兩套規則逐漸不一致。

## 2. 訪客資料流

```text
index.html
    |
    v
mahjong-suite/
    |-- iframe --> mj.html
    |                   |
    |                   +--> immutable OVMJCalculator result/event
    |
    +-- iframe --> session-scorekeeper/
                            ^
                            |
                    OVMJSessionHost.fillRoundDraft()
```

所有 session 狀態只在目前頁面記憶體：

- 沒有 `localStorage` read/write；
- 沒有 `storage` listener；
- 沒有 import/export/share；
- 關頁、重新整理或導航後消失。

殼層有登入 CTA，但前往登入版不會傳送訪客 aggregate。

## 3. 登入資料流與 lifecycle

```text
session-scorekeeper-online/
    |
    |  login/register
    +------------ fetch ------------> Spring Boot /api
    |                                     |
    |  /me + /sessions + /players         +--> JPA --> H2/PostgreSQL
    |
    +-- 全部成功後 ensureWorkspace()
            |
            +-- iframe --> mahjong-suite/?embedded=1&account=1
                              |-- mj.html
                              +-- session-scorekeeper/（仍為記憶體）
```

登入頁初始 iframe 只有 `data-src`。成功取得 token 並完成三個 bootstrap API 後才設定 `src`。

持久化資料流：

```text
OVMJSessionHost.getSession()
        -> online adapter
        -> authenticated PUT /api/sessions/{id}
        -> payload validator
        -> account-owned game_session

account-owned DB payload
        -> online adapter
        -> OVMJSessionHost.normalizeSession()
        -> replaceSession()
        -> current iframe memory
```

登出或任何 protected HTTP 401：

```text
clear token + version map + account UI
        -> unloadWorkspace()
        -> remove iframe src
```

因此戶口隔離不依賴 CSS 隱藏，也不讓未驗證 iframe 留在 DOM 中繼續執行。

## 4. 單局計番器

Runtime：

- `mj.html`：手牌、副露、食糊牌、條件、設定與結果 UI。
- `mj.css`：互動與 responsive layout。
- `mjConst.js`：`TILE_TYPES`、`ALL_TILES`、`FLOWER_TILES`。
- `mj.js`：狀態、事件、拖放／觸控、驗證、render 與 result bridge。
- `checkHandType.js`：牌型 predicates、exclusions、特殊牌與最終排序。

Script order 是 contract：

```html
<script src="mjConst.js"></script>
<script src="mj.js"></script>
<script src="checkHandType.js"></script>
```

`calculateScore()` 驗證實體牌數為 `17 + 槓數`，取得 detector 最終 `{ name, score }`，加總 `handTai`，再由 `mj.js` 加計番器固定莊番。

```text
dealerBonusTai = isDealer ? 2 × dealerCount + 1 : 0
totalTai = handTai + dealerBonusTai
```

## 5. 計番結果 boundary

`mj.js` 發布 schema `ov-mj-calculation-result/v1`、事件 `ovmj:calculation-result` 與 `window.OVMJCalculator`。

```js
{
  schemaVersion,
  valid,
  handTai,
  dealerBonusTai,
  totalTai,
  handTypes,
  isSelfDraw,
  isDealer,
  dealerCount
}
```

payload、`handTypes` array 及 records 都 frozen。消費者較晚掛載時可用 `getLastResult()`；無效輸入會發布 `valid: false`，不能沿用舊的可轉移結果。

## 6. 整場記分器

`session-scorekeeper/app.js` 擁有 `ov-mj-session/v1` domain：

- 四名玩家及初始分數；
- 底／番／貨幣／莊家設定；
- 出銃、自摸、包牌、一炮多響、流局、調整、斷拉 entries；
- 自動／強制莊家 transition；
- 零和 transfers 與 chronological replay；
- 圖表、統計、篩選與找數。

所有 derived 值從 `players`、`config`、`entries` replay。修改早期 entry 會重新計算之後所有餘額與莊家狀態。

整場莊番獨立於計番器：

```text
dealerBaseTai + streak × streakTai + pull × pullTai
```

Production facade：

```js
window.OVMJSessionHost = {
  ready,
  getSession(),
  getSessionStatus(),
  normalizeSession(value),
  hasStorageConflict(),
  markSaved(),
  createSession(title, { clearHistory }),
  applyPlayerName(seat, name),
  fillRoundDraft(value),
  replaceSession(value)
};
```

`getSessionStatus()` 以 O(1) 回傳 `id/title/dirty`；初始 blank clean，所有 committed mutation／new／undo／redo／replacement dirty，durable outer adapter 以 `markSaved()` 清除。`createSession()` 產生新 ID 並可清 history；`applyPlayerName()` 經正常 mutation 只複製名稱。`fillRoundDraft()` 不提交 entry 或改 dirty；`replaceSession()` 正規化、derive 後只裝入目前頁面記憶體。`hasStorageConflict()` 為相容性保留，在現行 memory-only runtime 永遠為 false。

## 7. 整合殼層

`mahjong-suite/app.js`：

1. 接收 immutable calculation result；
2. 顯示牌型番、計番器莊番、顯示合計與 tags；
3. 只有有效 schema/result 才開放轉移；
4. 使用 `handTai`、牌型備註與自摸狀態建立草稿；
5. 等待正式 `OVMJSessionHost`；
6. 填草稿並切換至整場記分；
7. 對外代理同一個 host，供登入 outer adapter 使用。

殼層永遠不能傳 `totalTai`，否則計番器固定莊番會與 session 連莊／拉莊重複。

iframe 組合刻意保留成熟 UI 與單一規則來源。所有前端檔案必須同 origin，且整合不得使用 DOM scraping。

## 8. 公開前端設定 boundary

`app-config.js` 是唯一集中式 browser config：

```text
apiBaseUrl
guestEntryUrl
accountEntryUrl
requestTimeoutMs
```

它由 browser 公開下載，只能含公開路由／timeout。DB host、username、password 不可放入前端。

API URL validator 接受：

- root-relative `/api`；
- absolute HTTPS；
- loopback HTTP。

拒絕 remote HTTP、embedded credentials、query、fragment。`fetchWithTimeout()` 統一 timeout 行為。

## 9. Online adapter

`session-scorekeeper-online/app.js` 只負責：

- API URL 驗證及 request timeout；
- register／login／logout 與 tab-scoped token；
- `/me`、sessions、players bootstrap；
- workspace ensure／unload；
- common player 建立／刪除，以及經 host 把 profile 名稱複製到固定座位；
- 多個獨立 session 的 new／save／load／delete／server export；
- dirty 狀態顯示與自願離開 guards；
- 分離的 list-row version 與 workspace payload-bound version；
- PUT lock、optimistic `expectedVersion` 與 409 local-work preservation；
- global 401 無條件清理。

它只透過 delegated `OVMJSessionHost` 取得／安裝 aggregate，不使用 `OVMJSessionTest`、private iframe DOM 或 storage key。

## 10. Java backend

Spring Boot 3.5.7／Java 17 boundaries：

- `AuthInterceptor`：除 health/register/login 外保護 `/api/**`。
- `AuthService`：email/password 驗證、BCrypt、random token、SHA-256 token hash、到期／撤銷。
- `ApiController`：account-scoped player/session CRUD、payload 驗證、exports、version conflict。
- repositories：owner-aware queries。
- entities：explicit snake_case columns/indexes；session 使用 JPA `@Version`。

資料表：`app_account`、`api_token`、`player_profile`、`game_session`。

H2 與 PostgreSQL 初次啟動預設 `ddl-auto=update`，可建立缺少的 tables。穩定 production 建議改 `validate` 並使用版本化 migrations。

## 11. 測試架構

### 11.1 計番規則

```text
test.html + mjConst.js + checkHandType.js
          -> build_test.py
          -> test_standalone.html
          -> run_tests.py
          -> isolated Chrome/Edge
          -> test-results/latest.json
```

目前每個 browser 137 項。

### 11.2 記分與整合

```text
scorekeeper-tests.html
    |-- production session-scorekeeper/
    |-- calculator bridge fixture
    |-- mahjong-suite contracts
    +-- mocked online auth lifecycle
          -> run_scorekeeper_tests.py
          -> same-origin completion callback
          -> test-results/scorekeeper-latest.json
```

目前每個 browser 47 項。callback 避免 nested iframe 在 headless `--dump-dom` 的序列化差異影響判定。

測試 facades `OVMJSuiteTest`、`OVMJOnlineTest` 只公開 deterministic 最小介面且 frozen。

### 11.3 Java

`backend/src/test/.../ApiIntegrationTest.java` 使用 MockMvc 與 test-only in-memory H2／`create-drop`。目前 Java 17 驗證 3/3 通過。

## 12. Sources of truth

| 項目 | 權威來源 |
|---|---|
| 牌型與 exclusions | `checkHandType.js` |
| 計番期待 | `test.html` |
| 計番 controller／bridge | `mj.js` |
| session replay／settlement | `session-scorekeeper/app.js` |
| 跨 app transfer | `mahjong-suite/app.js` |
| auth lifecycle／DB adapter | `session-scorekeeper-online/app.js` |
| browser integration expectations | `scorekeeper-tests.html` |
| backend API／persistence | `backend/src/main/` |
| backend integration expectations | `backend/src/test/` |
| 維護說明 | `README.md`、`docs/` |
| 最近環境證據 | `test-results/*.json` |

`.qoder/repowiki/` 是生成快照，不是 runtime／test authority。

## 13. 必須維持的不變條件

- 實體手牌數為 17 加每一個槓的一張額外牌。
- 消費者只使用 detector exclusions 後的最終結果。
- `handTai` 不含計番器莊番；`totalTai` 包含。
- 整合轉移永遠只用 `handTai`。
- 草稿轉移永遠不自動提交歷史。
- 訪客 aggregate 永遠不進 browser persistent storage。
- 登入前不載入 workspace iframe。
- `/me`、`/sessions`、`/players` 全部成功才顯示 workspace。
- logout／401 必須卸載 workspace 並清 auth state。
- durable persistence 只能由 authenticated outer app 到 DB。
- 每個 session entry 零和，所有 derived 值 replay。
- account-owned record 不能被其他戶口讀取、覆蓋或刪除。
- 每個 discovered browser test 必須恰好執行一次；failure 與 error 分開。
- Browser 與 Java 結果必須分開報告。

## 14. Extension 原則

- **新增牌型**：修改 `checkHandType.js` 的對應 family／exclusion，並在 `test.html` 加 exact-score cases。
- **新增 session 規則**：同步更新 normalization、replay、UI、exports 與 `scorekeeper-tests.html`。
- **更改 transfer payload**：版本化 schema，並一起更新 calculator、suite、host 與 contracts。
- **更改 DB**：保持 `OVMJSessionHost` boundary，不把 settlement 邏輯搬入 Java；保留 ownership/version checks。
- **不相容 session 變更**：建立新 schema version 與明確 migration，不可無聲改變 `ov-mj-session/v1` 意義。

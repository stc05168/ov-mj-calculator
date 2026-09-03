# 整合應用使用手冊

## 1. 入口與模式

先在專案根目錄啟動靜態 HTTP 服務：

```bat
python -m http.server 8000
```

精確入口：

```text
訪客：http://127.0.0.1:8000/index.html
訪客：http://127.0.0.1:8000/mahjong-suite/index.html
登入：http://127.0.0.1:8000/session-scorekeeper-online/index.html
API： http://127.0.0.1:8080/api
```

根目錄 `index.html` 會導向 `/mahjong-suite/index.html`。整合殼層保留原有單局計番器與整場記分器為獨立應用，再透過 same-origin browser facade 提供「三家快速帳（預設）／進階記一局／牌型計番（可選）」的單頁流程。一般兩家對食直接在上家、對家、下家三欄輸入；自摸、多響、流局、莊家狀態或不確定番數時才使用進階表單與計番器。

| 模式 | 需要登入 | 持久化來源 | 重新整理／關頁 |
|---|---|---|---|
| 訪客版 | 否 | 無，只存在目前頁面記憶體 | 所有牌局資料消失 |
| 戶口版 | 是 | Java API 所屬戶口的 H2／PostgreSQL 記錄 | 已儲存至 DB 的資料可再次載入 |

訪客版沒有 JSON／CSV／TXT 匯入匯出或圖片分享功能。按下登入按鈕會離開訪客頁面，訪客暫存資料不會自動搬到戶口版。

## 2. 訪客使用流程

### 2.1 三家快速帳（預設）

1. 開啟 `/index.html` 或 `/mahjong-suite/index.html`；預設顯示三欄快速帳，頁面會標示「此頁暫存」。第一位玩家 `p1` 固定為「我（記分者）」；舊 payload 預設左欄 `p4` 上家、中欄 `p3` 對家、右欄 `p2` 下家。
2. 名稱可直接修改。每欄輸入番數後按「我食」或「被食」，大字番數、逐鋪倍率與預計結算會立即更新。
3. 同一方向內，較早各鋪按每個後續輸入再乘 `1.5`：

```text
multiplier(i) = 1.5 ^（其後輸入鋪數）
10、20、8 番 = 10 × 2.25 + 20 × 1.5 + 8 = 60.5 番
```

4. 快速帳輸入的番數已包含底，不另加 `baseAmount`。整欄 signed 番數以 `sign(fan) × ceil(abs(fan))` 向外取整，再乘每番值。例如每番 1、三鋪 10 番為 `47.5`，結算為 `48`。
5. 未結算時反轉我食／被食，系統會先用同一正常 `ceil` 規則結算舊方向，再留下新方向第一筆。新 UI 不再提供斷拉，也不會折半或向下取整。
6. 玩家執位後按「調整座位」；可拖曳、點選兩張卡或使用鍵盤交換上家／對家／下家。確認只修改 `physicalSeats`，pending 跟 player ID 移動，分數、莊家、玩家順序及歷史不變；取消不 dirty。每 4 局提示一次但不會自動打開 dialog。
7. 按欄內「結算」後才產生零和 `adjustment` entry。pending 清空後，目前總分仍由 canonical 歷史累計；頁首「復原」可回復快速輸入、結算或方向反轉造成的整體變更。

未結算列是 UI memory adapter，不屬於 `ov-mj-session/v1`，不會被登入版 DB 儲存、匯出或 `getSession()` 帶走。重新整理、換牌局或關頁前必須先結算。快速帳以 `adjustment` 保存，因此不會改變胡牌／自摸統計、莊家、連莊或全桌拉莊；需要這些牌局語意時使用進階表單。

### 2.2 進階記一局

展開「進階記一局」後可處理胡牌、自摸、一炮多響、流局、賞罰、包自摸、倍率與莊家覆寫。直接輸入牌型番，確認付款預覽及莊家處理後提交；提交後頁面會 replay 歷史並更新餘額、莊家、統計、圖表與找數建議。

- 莊家食糊會自動增加連莊及拉莊。
- 閒家食糊（莊家被食）會依穩定玩家順序輪到下一位並清除連／拉。
- 現行 UI 不建立新斷拉紀錄；舊 payload 的 `breakPull`／`breakPullAfter` 仍可正規化及 replay。

### 2.3 不確定番數：選用牌型計番

1. 切到「牌型計番（可選）」，輸入手牌、副露、食糊牌、花牌、風位、莊家及特殊條件。
2. 確認最新結果有效，並檢查牌型番 `handTai`、計番器莊番 `dealerBonusTai`、顯示合計 `totalTai`、最終牌型與自摸狀態。
3. 按「帶入本局番數」。殼層會等待整場記分器 ready、展開「進階記一局」、驗證實際回填番數，再聚焦番數欄；成功提示出現前不視為完成。
4. 只會帶入 `handTai`、牌型備註與自摸狀態，不會帶入 `totalTai`，也不會自動提交歷史。贏家、出銃者、包牌者、倍率與莊家處理仍須確認。
5. 若橋接未 ready、逾時或回填值不符，頁面會顯示失敗提示；可重試或直接輸入番數，不會誤新增一局。

390×844 手機版仍保持三欄並排、無水平溢位，常用按鈕至少 44px；嵌入登入版時，整合殼層與內層記分器的重複標頭／提示會收起，轉送列只在「牌型計番（可選）」顯示。

要清空目前頁面可使用重設／新牌局；重新整理或關閉頁面也會清除全部資料。訪客版刻意不提供保存、匯入、匯出或分享捷徑，避免使用者誤以為資料已永久保存。

## 3. 從訪客前往登入版

在整合頁按「登入／建立戶口」會使用 `app-config.js` 的 `accountEntryUrl` 前往：

```text
/session-scorekeeper-online/index.html
```

前往前請先確認：

- 訪客資料只在原頁面記憶體中；
- 導航、重新整理或關頁會失去這些資料；
- 系統不會把未登入資料自動併入任何戶口；
- 登入後會得到一個新的記憶體工作區，再由使用者選擇保存或載入 DB 牌局。

## 4. 戶口版使用流程

### 4.1 登入與註冊

1. 啟動 Java API，並開啟 `/session-scorekeeper-online/index.html`。
2. 選擇註冊或登入，輸入戶口資料。
3. 成功取得 bearer token 後，頁面同時要求且必須全部成功取得：
   - `GET /api/me`；
   - `GET /api/sessions`；
   - `GET /api/players`。
4. 三個資源都成功後，`ensureWorkspace()` 才會建立並顯示整合工作區 iframe。

登入前 iframe 只有 `data-src`，不會預先載入。這可防止登入前或戶口切換期間留下不屬於目前使用者的記憶體 UI。

### 4.2 建立、記錄與保存多場牌局

1. 登入後的初始工作區是乾淨、但尚未存在 DB 的新牌局。外層會顯示目前名稱與「新增未儲存」。
2. 要同時管理另一場牌局，按「新增獨立牌局」，接受日期／時間預設名稱或輸入有意義的名稱。它會建立新的隨機 ID 並清除跨場 undo 歷史，不會覆蓋已保存的其他場次。
3. 在工作區使用與訪客版相同的三欄快速帳；未結算列只是 UI memory，不會改 dirty，也不會進入 DB payload。按欄內「結算」後產生 canonical adjustment，或在進階表單提交完整一局，才會標示「有未儲存變更」。設定、套用玩家、undo／redo、替換或新建等 aggregate 變更同樣會 dirty；計番帶入草稿則不會。
4. 按外層「儲存目前牌局到 DB」，系統透過 `OVMJSessionHost.getSession()` 取得完整 `ov-mj-session/v1` aggregate。這是明確儲存，系統沒有 autosave。
5. 全新隨機 ID 以 `expectedVersion: null` 建立；已載入或成功保存的 payload 則使用其工作區綁定版本更新。建立與更新會顯示不同成功訊息。
6. Java 後端驗證 schema、四名玩家、entry 關聯、類型、範圍與大小後，才寫入目前戶口擁有的 DB 記錄。
7. PUT 成功時，外層直接採用回傳 `SessionView.version` 綁定目前 payload，再呼叫 `markSaved()` 清除 dirty；即使之後清單重新整理失敗，工作區基準版本仍不會倒退。
8. 清單列版本只供清單與刪除操作；玩家 CRUD 或一般清單 refresh 不會推進工作區版本。若某 ID 已在清單出現但目前 payload 未綁定版本，儲存會安全拒絕並要求先載入，而不是猜版本。HTTP 409 會保留本頁工作。

### 4.3 載入、刪除與匯出

- **載入**：只有目前工作區 dirty 時才先提示；確認後會暫時鎖定 iframe 與競爭操作，取得目前戶口的 DB payload 及其 `version`，經 `normalizeSession()` 驗證後，以 `replaceSession()` 安裝到目前記憶體工作區、綁定該 GET 版本，再標成 clean。
- **刪除**：送出清單列 ID 與該列 `expectedVersion`；版本過期時 API 回傳 409，避免覆蓋他處較新的修改。若刪除的是目前開啟記錄，前端會立即換成乾淨、隨機新 ID、尚未保存的工作區，避免下一次保存悄悄重建被刪除的 ID。
- **匯出 JSON**：由伺服器輸出可保存的完整資料。
- **匯出 TXT**：由伺服器輸出可閱讀標頭及完整資料。
- **常用玩家**：可建立、刪除自己的 profile。每列可選「我（記分者）」或玩家 2／3／4並按「套用」，以穩定 player ID 經 production host 複製姓名，因此會變成未儲存變更。之後 `physicalSeats` 調位只改顯示關係，不會把姓名換到另一身份。牌局玩家名稱上限 20 字；profile 與牌局沒有 live DB foreign-key 關聯，刪除 profile 不會改回牌局名稱，profile 顏色也不會覆蓋玩家顏色。

共用內層記分器仍然不寫 `localStorage`。DB 儲存／載入／匯出只由已驗證的外層戶口版完成。

### 4.4 登出與 401

按「安全登出」時，若目前牌局有未儲存變更，頁面會先要求確認；取消可留在工作區。確認後：

1. `clearAuthentication()` 立即清除目前分頁的 token、清單版本、工作區 payload 版本與戶口 UI；
2. `unloadWorkspace()` 移除 iframe `src` 並卸載工作區；
3. 前端同時 best-effort 呼叫 `/api/auth/logout` 撤銷伺服器 token。

自願載入、另開新牌局、前往訪客版，以及 browser reload／close 也只在 dirty 時提示。任何非登入 API 或匯出請求收到 HTTP 401 時則**不顯示 dirty 阻擋**，而是立即執行相同清除／卸載，確保過期身份不能繼續存取 iframe 中的私人工作區。每個 session／player／export continuation 都綁定發出時的 token 與 workspace generation；登出、401 或切換戶口後才回來的舊 response 會被丟棄，不能改寫新戶口工作區。重新登入後必須重新完成 `/me`、`/sessions`、`/players` 驗證。

## 5. 莊番避免重複的核心規則

單局計番器顯示：

```text
calculator dealer bonus = isDealer ? (2 × dealerCount + 1) : 0
calculator totalTai = handTai + dealerBonusTai
```

整場記分器另外依牌桌狀態計算：

```text
session dealer tai = dealerBaseTai + streak × streakTai + pull × pullTai
```

因此整合殼層只傳 `handTai`。若錯把 `totalTai` 當作本局番數，計番器固定莊番與整場連莊／拉莊番會被收兩次。

轉移備註由最終牌型組成，例如：

```text
固定A (5番)、固定B (8番)
```

自摸狀態可以帶入；贏家、付款者、包牌、倍率與莊家轉換仍由使用者在整場記分器確認。轉移永遠只填草稿，不會自動提交歷史。

## 6. 資料生命週期與安全邊界

### 訪客版

```text
使用者操作 -> iframe JavaScript 記憶體 -> 同一頁顯示
```

- 不讀寫 `localStorage`。
- 不監聽 `storage` 事件。
- 不向 Java API 傳送牌局。
- 不提供 import／export／share 控制項。
- 頁面生命週期結束時資料即消失。

### 戶口版

```text
登入 -> 驗證 /me + /sessions + /players -> 載入記憶體工作區
                                              |
                                              v
                                   使用者明確儲存／載入
                                              |
                                              v
                                      Java API -> DB
```

- bearer token 只放在目前分頁的 `sessionStorage`。
- 牌局持久化在戶口擁有的 DB 記錄。
- iframe 記憶體不是 DB；只有看到儲存成功才代表已持久化。
- 戶口記錄具 ownership isolation 與 JPA optimistic version。

## 7. 前端公開設定

根目錄 `app-config.js` 的預設值：

```js
apiBaseUrl: 'http://127.0.0.1:8080/api'
requestTimeoutMs: 15000
```

`guestEntryUrl` 與 `accountEntryUrl` 會依 `app-config.js` 的實際部署位置產生。所有入口都讀取同一個 frozen `window.OVMJ_APP_CONFIG`。

API URL 安全規則：

| URL 類型 | 結果 |
|---|---|
| `/api` 等同來源 root-relative path | 接受 |
| `https://api.example.com/api` | 接受 |
| `http://127.0.0.1:8080/api`、`http://localhost:8080/api` | 接受 |
| 遠端 `http://` | 拒絕 |
| 帶 `user:password@host` | 拒絕 |
| 帶 query 或 fragment | 拒絕 |

`fetchWithTimeout()` 會套用設定的請求逾時。任何 DB 帳號、密碼、內部秘密或 token 都不可放進公開 JavaScript。

## 8. Browser contracts

### 計番結果

`mj.js` 發布：

```text
schema: ov-mj-calculation-result/v1
event:  ovmj:calculation-result
```

```js
window.OVMJCalculator = {
  eventName,
  getLastResult(),
  buildResult(handTypes, options)
};
```

payload、牌型陣列及每個牌型 record 都是 frozen；無效／未完成手牌會發布 `valid: false` 並停用轉移。

### 記分器 host

```js
window.OVMJSessionHost = {
  ready,
  getSession(),
  getSessionStatus(),             // { id, title, dirty }
  normalizeSession(value),
  hasStorageConflict(),
  markSaved(),
  createSession(title, { clearHistory }),
  applyPlayerName(playerId, name),
  fillRoundDraft(value),
  replaceSession(value)
};
```

現行記分器是記憶體模式，`hasStorageConflict()` 保留作相容介面且永遠為 false。dirty 是 O(1) boolean：初始空白工作區 clean；已提交 mutation、新建、undo、redo 及 replacement 會 dirty；外層確認 PUT／GET payload 綁定後以 `markSaved()` 清除。`createSession()` 使用新的隨機 ID，並可選擇清除歷史；`applyPlayerName()` 以穩定 `p1…p4` ID 複製姓名。`physicalSeats` 是獨立 display mapping，調位不重排 `players`。`fillRoundDraft()` 仍只更新表單與預覽，不提交 entry、不推 history，也不改 dirty；`replaceSession()` 驗證後只安裝到目前頁面記憶體。

### 整合與登入 lifecycle

- `mahjong-suite/app.js` 代理正式的 `OVMJSessionHost`，外層不抓取私人 DOM。
- `OVMJSuiteTest` 與 `OVMJOnlineTest` 是 frozen、最小化的 deterministic test facade，不是持久化 API。
- Java/DB 外層不使用 `OVMJSessionTest`、不直接操作記分器 storage，也不做 DOM scraping。

必須保留的整合案例：

- `scorekeeper-draft-001`：填草稿不改變歷史；
- `calculator-bridge-001`：不可變的 hand/dealer/total 拆分；
- `unified-shell-001`：傳入 13 牌型番，而不是包含莊番的 18 顯示番。

## 9. Runtime 與同來源要求

訪客版：

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
```

戶口版另外需要：

```text
session-scorekeeper-online/
backend/
```

所有前端 iframe 必須同來源。請使用 HTTP／HTTPS 伺服器，不要直接以 `file://` 開啟，也不要把殼層、計番器與記分器分散到不同 origin。

## 10. 已驗證結果

```text
quick-ledger Chrome interaction + 390×844 smoke
PASS（19/19）：三欄映射、回溯 ×1.5、47.5 正常→48、手動／方向反轉斷拉先整段 ÷2→23、非逐筆取整、負方向對稱、每番2時斷拉→46、零值清理、多 segment→22、四家累計總分及無水平溢位

scorekeeper/guest/account/contracts
Chrome: 47 discovered, 47 executed, 37 passed, 10 failed, 0 errors
Edge:   47 discovered, 47 executed, 37 passed, 10 failed, 0 errors

canonical scoring
Chrome: 137 discovered, 137 executed, 137 passed, 0 failed, 0 errors
Edge:   137 discovered, 137 executed, 137 passed, 0 failed, 0 errors

Java 17 MockMvc/H2
3 tests, 0 failures, 0 errors, 0 skipped, BUILD SUCCESS
```

記分 suite 的 10 個固定失敗是 `settle-001`、`settle-002`、`dealer-002`、`selfdraw-001`、`selfdraw-002`、`selfdraw-003`、`multi-001`、`config-002`、`initial-001`、`ui-001`。這些既有 assertion 仍以舊預設底 30／每番 10 計算，而產品預設已按需求改為 5／1；兩個瀏覽器的應用狀態均為 ready，沒有 runtime error。依要求未修改既有測試。

執行方式見 [測試手冊](TESTING.md)，機器可讀結果見 `test-results/scorekeeper-latest.json` 與 `test-results/latest.json`。

## 11. 疑難排解

- **轉移按鈕無法使用**：最新計番結果仍無效或手牌未完整。
- **莊番比預期多**：確認草稿使用「牌型番」，不是計番器「顯示合計」。
- **草稿出現但歷史沒有新增**：這是正確行為；仍需確認玩家與付款資料後提交。
- **重新整理後訪客資料消失**：這是訪客版設計，不是故障。
- **找不到匯入／匯出／分享**：訪客版刻意移除；登入後可使用 DB 儲存及伺服器 JSON／TXT 匯出。
- **登入後工作區沒有出現**：檢查 API、CORS，以及 `/me`、`/sessions`、`/players` 是否全部成功。
- **API URL 被拒絕**：遠端必須用 HTTPS，且 URL 不可帶帳密、query 或 fragment。
- **收到 401 後工作區消失**：安全 lifecycle 的正常行為；HTTP 401 不會等待未儲存確認，請重新登入。
- **顯示「未綁定 DB 版本」而不能保存**：該 ID 已存在於清單，但目前記憶體 payload 不是由 GET／成功 PUT 綁定；請先按該列「載入」，不要以清單版本猜測覆寫。
- **顯示「新增未儲存」但沒有 dirty**：表示目前是乾淨的新 ID，尚未建立 DB 記錄；需要保存時仍要明確按 DB 儲存。
- **套用常用玩家後 DB profile 沒有改變**：這是正確行為；套用只把名稱複製到穩定玩家 ID。要改左右顯示請另用「調整座位」，目前牌局則會成為未儲存。
- **iframe 一直載入**：確認所有前端檔案同來源且相對路徑沒有遺漏。

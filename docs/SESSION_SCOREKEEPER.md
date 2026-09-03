# 訪客版整場記分器手冊

## 1. 用途與入口

`session-scorekeeper/` 是不依賴框架的四人整場麻將記分器。它可以計算付款、莊家、連莊、拉莊、餘額、統計與找數，並可唯讀相容重播舊斷拉紀錄；現行版本刻意採用**純記憶體模式**。

最友善的使用方式是從整合殼層進入，因為可把單局計番結果帶入本局草稿：

```text
http://127.0.0.1:8000/index.html
http://127.0.0.1:8000/mahjong-suite/index.html
```

獨立記分器入口：

```text
http://127.0.0.1:8000/session-scorekeeper/index.html
```

本機啟動：

```bat
python -m http.server 8000
```

## 2. 「此頁暫存」代表甚麼

整場資料只存在目前頁面的 JavaScript 記憶體：

- 不讀取或寫入 `localStorage`；
- 不監聽其他分頁的 `storage` 事件；
- 不會在重新整理後還原；
- 不會在關閉分頁後保留；
- 前往登入頁時不會把資料傳到戶口；
- 不提供 JSON／CSV／TXT 匯入匯出或圖片分享按鈕。

因此「此頁暫存」不是備份，也不是自動儲存。若需要長期保存，請使用登入版，並在登入後明確按下 DB 儲存。

## 3. 三欄快速帳、進階記一局與計番帶入

### 3.1 三欄快速帳（預設）

記分頁以第一位玩家 `p1` 為固定的「我（記分者）」，並以可持久化 `physicalSeats` 決定三欄顯示。舊 payload 沒有此欄位時使用相容預設：

| 位置 | 關係 | 預設玩家 ID |
|---|---|---|
| 固定 | 我（記分者） | `p1` |
| 左欄 | 上家 | `p4` |
| 中欄 | 對家 | `p3` |
| 右欄 | 下家 | `p2` |

這些 ID 是穩定玩家身份，不是東／南／西／北設定。按「調整座位」可拖曳、點兩張卡交換，或使用 Enter／Space 與方向鍵；`p1` 固定，只交換上家／對家／下家。確認只更新 mapping，pending 快速列按 player ID 跟人移動，分數、莊家、玩家順序及歷史不變；Escape／取消不 dirty。每完成 4 局會顯示可略過的非阻塞提示。

每欄可直接修改名稱、輸入番數，再按「我食」或「被食」。同方向、同一段的回溯倍率為：

```text
multiplier(i) = 1.5 ^（同段內位於第 i 鋪之後的輸入數）
```

所以依次輸入 10、20、8 番時：

```text
10 × 1.5 × 1.5 + 20 × 1.5 + 8
= 10 × 2.25 + 20 × 1.5 + 8
= 60.5 番
```

這不是 `×1、×1.5、×2` 的線性序列；新鋪本身由 `×1` 開始，較早鋪才因後續同段輸入再次乘 `1.5`。

- **方向反轉**：若目前有「我食」pending 後輸入「被食」，或相反，系統會先按正常整欄 `ceil` 規則結算舊方向，再留下新方向第一筆。
- **結算**：把該欄結果轉成既有零和 `adjustment` entry，然後清空該欄。
- **復原**：頁首按鈕回復最近一次快速輸入或結算；方向反轉的自動結算與新 pending 會一起回復。
- **改名**：欄首名稱修改穩定 player ID 對應的姓名，這是一般 session mutation。

快速帳輸入的番數已包含底，結算不會再另加 `baseAmount`。整欄先計 signed 拉番，再依正負方向向外取整，最後乘每番值：

```text
column fan = Σ(direction × fan × multiplier)
rounded fan = sign(column fan) × ceil(abs(column fan))
amount = rounded fan × taiValue
```

例如每番 1、三鋪 10 番：

```text
10 × 2.25 + 10 × 1.5 + 10 = 47.5
ceil(47.5) × 1 = 48
```

正負方向採相同絕對值規則。產品已移除快速帳及進階表單所有新斷拉入口，方向反轉也不再折半；但舊 `breakPull`／`breakPullAfter` 仍可載入與 replay。按「結算」後 pending 清空，四家目前總分繼續由 canonical entries 累計。

**保存限制：**每欄未結算列只存在目前畫面，不在 aggregate 內，也不會令登入工作區 dirty。重新整理、關頁、載入另一場或直接按 DB 儲存都不會保存 pending；必須先按欄內「結算」。快速結算以 `adjustment` 保存，所以不會增加胡牌／自摸統計，也不會改變莊家、連莊或全桌拉莊。

### 3.2 進階記一局

需要出銃、自摸、包自摸、一炮多響、流局、莊家 override 或完整統計時，展開「進階記一局」：

1. 選擇結果與玩家，直接輸入牌型番。
2. 確認倍率、莊家處理及付款預覽。
3. 提交後才新增完整 hand／draw／adjustment entry，並 replay 餘額、莊家、統計與圖表。

新 UI 不再建立 `breakPull` 或 `breakPullAfter`；相容 parser 只為舊牌局保留。

### 3.3 不確定番數時選用計番器

1. 完成有效手牌，檢查牌型番、計番器莊番、顯示合計、最終牌型與自摸狀態。
2. 按「帶入本局番數」。整合殼層會等待記分器 ready，自動展開進階表單，填入草稿後核對實際回傳 `tai`，成功才聚焦番數欄。
3. 草稿只收到：
   - `tai = handTai`；
   - 最終牌型與各自番數組成的備註；
   - 自摸或出銃狀態。
4. 確認贏家、出銃者、包牌者、倍率與莊家處理，再預覽付款並提交。

轉移不會自動新增歷史。`fillRoundDraft()` 只改進階表單及預覽，既有 session aggregate、undo／redo 與 dirty 狀態保持不變。若記分器啟動逾時、橋接失敗或回填番數不符，頁面會提示重試或直接輸入，不會誤提交。

計番器顯示合計不可直接當作本局番數，因為它已包含固定莊番；記分器會再套用本桌的連莊／拉莊公式。詳細安全規則見 [整合應用手冊](UNIFIED_APP.md)。

## 4. 可用功能

- 上家／對家／下家三欄快速帳、可改名、我食／被食、回溯 `×1.5`、整欄向外取整、四家累計總分、方向反轉正常結算及快速復原。
- 調位 dialog 支援 Pointer Events 拖曳、點選互換、鍵盤操作、aria-live、focus return、pending 警告及確認／取消草稿。
- 新牌局與缺省 config 使用底 5／每番 1；另提供 30／10、50／20、100／50 preset，舊牌局明載設定保持不變。
- 進階表單直接輸入本局牌型番並預覽付款。
- 四名純姓名玩家、可修改姓名及初始分數；起始莊家按姓名選擇，顯示位置由 `physicalSeats` 獨立管理。
- 自訂底、每番價值、貨幣、莊家基本番、連莊番與拉莊番。
- 出銃、自摸、包自摸、一炮多響、流局及手動賞罰。
- 自動或強制連莊／過莊；新 UI 不提供斷拉操作，但舊斷拉 entries 保持 replay 相容。
- 依不可變 entry ledger 重新計算全部結果。
- 編輯／刪除歷史、30 步 undo／redo、篩選、統計及 SVG 圖表。
- 依最終淨額產生「精簡找數建議」。
- 390px 手機版仍顯示三欄、無水平溢位，常用按鈕至少 44px；嵌入整合頁時收起重複標頭與訪客提示。
- 新牌局／重設目前頁面資料。「新牌局」會提示輸入日期／時間建議名稱並建立新的隨機 ID；只有目前 aggregate dirty 時才先提示捨棄變更。登入版外層另有「新增獨立牌局」，可把多個不同 ID 分別保存到 DB。

訪客模式不可用：

- 自動保存；
- JSON import／export；
- CSV 或 TXT export；
- PNG 分享；
- 跨分頁同步；
- DB 儲存或載入。

登入版會在外層另行提供 DB 保存、載入、刪除及伺服器 JSON／TXT 匯出，不會重新啟用內層訪客控制項。未結算快速列仍不在 DB payload 內。

## 5. 莊家、連莊、拉莊與舊斷拉相容

每局開始前：

```text
dealer tai = dealerBaseTai + streak × streakTai + pull × pullTai
```

預設為 `1 + streak + pull`。提交與 replay 的主要狀態轉換：

- **莊家食糊／自摸**：莊家不變，`streak + 1`、`pull + 1`。
- **閒家食糊（莊家被食）**：按穩定的 `session.players` 順序由下一位接莊，`streak`、`pull` 歸零；調整 `physicalSeats` 不會改變此順序。
- **流局**：依設定決定是否續莊，以及續莊時是否增加拉莊；預設續莊並增加連／拉。
- **強制續莊／下莊**：只有使用者明確覆寫時取代預設轉換。
- **過莊**：莊家輪到下一位玩家，連莊及拉莊重設。

現行 UI 不再提供立即斷拉或本局後斷拉，也不會建立新 `breakPull`。為保持舊 DB／匯出資料相容，normalization 仍接受 `breakPull` entry 與 hand 上的 `breakPullAfter`，replay 結果及歷史顯示保持原意，使用者亦可刪除舊紀錄。

## 6. 計算與 replay 模型

Canonical aggregate schema：

```text
ov-mj-session/v1
```

資料包含：

- `players`：四名穩定 ID 玩家、姓名與初始分數；陣列順序繼續決定莊家輪轉；
- `physicalSeats`：optional 的 `{me, upper, opposite, lower}` player-ID permutation；舊 payload 缺省時補成 `p1/p4/p3/p2`，`me` 必須是第一位玩家；
- `config`：底、番、貨幣及莊家規則；
- `entries`：按時間排列的本局／調整記錄，以及只為舊資料保留的斷拉記錄。

目前餘額、每個圖表點、統計、莊家狀態及找數都由 entries 依序 replay。修改或刪除較早記錄時，後續結果會全部重新計算。每個 entry 都必須保持四人 transfer 零和。

三欄 quick ledger 是刻意放在 schema 外的 compatibility adapter：pending rows 不會出現在 `players`、`config` 或 `entries`；只有按「結算」或方向反轉自動結算後，才寫入既有 `adjustment`。這保持舊牌局、Java payload、ownership、optimistic version、401 lifecycle 與 calculator bridge 不變，也表示 DB 儲存前必須先結算。

因為 canonical aggregate 只在記憶體，頁面結束時 aggregate 會消失；尚未結算的 quick pending 更不會隨 aggregate 匯出或保存。

## 7. Production host facade

正式整合邊界：

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
  fillRoundDraft({ tai, note, isSelfDraw }),
  replaceSession(value)
};
```

行為：

- `ready`：記分器可供外層呼叫時完成。
- `getSession()`：回傳 clone-safe 的目前 aggregate。
- `getSessionStatus()`：以 O(1) 讀取目前 `id`、`title`、`dirty`，不用序列化或比較整份牌局。
- `normalizeSession(value)`：驗證並正規化 `ov-mj-session/v1`。
- `hasStorageConflict()`：為舊整合相容性保留；記憶體版不使用 storage，因此永遠為 false。
- `markSaved()`：由 durable 外層確認 GET／PUT 成功後清除 dirty；它本身不寫 DB。
- `createSession(title, { clearHistory })`：以指定名稱建立隨機新 ID；外層建立獨立牌局／刪除後重設時可清除跨場 history。
- `applyPlayerName(playerId, name)`：經正常 session mutation 把 profile 名稱複製到穩定的 `p1…p4` 玩家身份；之後 `physicalSeats` 調位不會改變姓名 ownership。牌局玩家名稱上限為 20 字，超長 profile 會清楚報錯。
- `fillRoundDraft()`：只填本局草稿，不提交 entry、不推 history，也不改 dirty。
- `replaceSession(value)`：正規化、derive 後替換目前頁面記憶體並標成 dirty；外層載入並綁定 DB version 後再呼叫 `markSaved()`。不寫入瀏覽器持久儲存。

初始空白 aggregate 是 clean。快速帳只輸入尚未結算列時仍是 clean；按欄內結算後才成為 canonical mutation 並設 dirty。進階表單提交、設定／玩家名稱 mutation、新建、一般 undo／redo 或 replacement 同樣以常數時間把 dirty 設為 true；只有 `markSaved()` 清除。快速「復原」若撤銷剛產生的 adjustment，也會恢復結算前的 aggregate／dirty snapshot。這個旗標不是 autosave，也不改變 aggregate schema。

整合殼層與登入版只透過此 facade 取用牌局，不抓取 render 後的 DOM、不依賴私有變數、不使用 browser-test facade，也不直接讀寫 storage。

## 8. 登入版如何保存同一份牌局

登入版的持久化邊界在 `session-scorekeeper-online/`：

```text
記憶體記分器 --getSession()--> 登入外層 --Bearer token--> Java API --> DB
DB payload --------replaceSession()------------------------------------> 記憶體記分器
```

這表示：

- 內層記分器不因為在登入頁就開始寫 `localStorage`；
- 外層可用 `createSession(..., { clearHistory: true })` 建立多個不同隨機 ID 的獨立牌局，每一場都必須分別明確保存；
- 「新增未儲存」表示此 ID 尚無 DB 記錄，「有未儲存變更」表示 memory aggregate 已改動，「已儲存 · DB 版本 N」才表示目前 payload 已綁定 durable version；沒有 autosave；
- 只有外層顯示建立／更新成功後，資料才算進入 DB；
- 載入 DB 記錄會替換目前工作區的記憶體 aggregate，綁定 GET 回傳版本並標成 clean；
- 常用玩家的套用以 `p1…p4` 穩定 ID 呼叫 `applyPlayerName()`；只複製姓名，不會把 session 接到 player profile foreign key，也不會被之後的顯示調位改名；
- ownership、驗證、版本衝突與匯出由 Java API 負責；
- 付款、莊家、拉莊、圖表及 replay 邏輯仍只有前端記分器一份實作。

## 9. 找數建議

最終淨額為目前總分減去初始分數。應用會把欠款者與收款者配對，產生簡潔的付款清單。介面名稱為「精簡找數建議」，不是對所有可能排列都保證全域最少交易筆數的數學證明。

## 10. 測試

```bat
python -u run_scorekeeper_tests.py --browser all --timeout 120
```

既有 suite 每個瀏覽器 47 項，涵蓋：

- 正式記分器 startup 與四名玩家；
- 付款、莊家延續、拉莊／斷拉、自摸、包牌、一炮多響與流局；
- 自訂規則、倍率、初始分數、replay、統計、圖表、篩選、undo／redo；
- 記憶體模式不讀寫舊 `localStorage` 值；
- 訪客 import／export／share 控制項不可達；
- 公開 config、訪客／戶口殼層模式；
- 登入前不載入 iframe、登入後三項 API 驗證、登出及 401 卸載；
- 計番與草稿 contracts。

目前結果：

```text
Chrome: 47 discovered/executed, 37 passed, 10 failed, 0 errors
Edge:   47 discovered/executed, 37 passed, 10 failed, 0 errors
```

10 個失敗全部來自既有測試硬編碼舊預設底 30／每番 10，而產品預設已改為 5／1：`settle-001`、`settle-002`、`dealer-002`、`selfdraw-001`、`selfdraw-002`、`selfdraw-003`、`multi-001`、`config-002`、`initial-001`、`ui-001`。兩個瀏覽器均沒有 runtime error，47 項全部執行；依要求沒有修改既有測試。

另以真實 Chrome 375×812 smoke 完成 19/19 項針對性驗證：三鋪 10 番回溯倍率為 47.5、正常結算 48、手動／方向反轉斷拉先整段除 2 後結算 23、負方向對稱、`+1,+1` 證明非逐筆取整、折半取整為 0 時清除 pending 且不寫 adjustment、每番 2 時正常 96／斷拉 46、多 segment 分別處理後相加、四家 canonical 累計及無水平溢位，結果全部通過。

必須保留：

- `scorekeeper-draft-001`
- `calculator-bridge-001`
- `unified-shell-001`

證據：`test-results/scorekeeper-latest.json`。此 suite 不取代 Chrome／Edge 各 137/137 的計番規則或 Java MockMvc/H2 3/3 測試。

## 11. Runtime 檔案

獨立記分器：

```text
session-scorekeeper/index.html
session-scorekeeper/styles.css
session-scorekeeper/app.js
```

整合入口另需：

```text
index.html
app-config.js
mahjong-suite/index.html
mahjong-suite/styles.css
mahjong-suite/app.js
```

執行時不需要 Node.js package、前端框架、外部字型、分析服務或 API。殼層、計番器與記分器必須部署在同一 origin。

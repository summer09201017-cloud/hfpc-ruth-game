# 🗺️ 保羅大富翁 — 進度藍圖（已完成 vs 真正待做）

> 🛕 **2026-06-15 晚（feat/noah-minigames，PR #15，未併 main）**：挪亞方舟**兩個 in-repo 小遊戲**。
> - `?demo=arkpairs`「一公一母進方舟」：①翻牌記憶配對（同種一公♂一母♀，母的戴 🎀）→ ②**安排房間解謎**
>   （點兩格交換；猛獸獅🦁/虎🐯/熊🐻/狐🦊 旁邊只能放大象或飛鳥，全平安才過關，賽 11:6）。可選 6/8/10/12 對、**有背景音樂**(🎵/🔇)、保證每局有解。
> - `?demo=arkbuild`「一步一步蓋方舟」：**操作挪亞**拿鎚子沿木板那排走，抓準在釘點 ✛ 上鎚下去才釘得上（沒對準歪掉重來）；
>   旁邊 3 人**嘲笑**挪亞（氣氛+教導，不影響過關）；分 5 段配經文，收尾來 11:7。
> - 嵌入契約同 sling/elijah；可重用機制抽成 skill **`match-pairs-minigame`**。大廳（hfpc-bible-games）已加「挪亞方舟」合輯卡。
> - **待辦**：合併 PR #15 → main → Netlify 部署（大廳連結與線上才會通）；之後接真正的挪亞棋盤旅程。
>
> 🆕 **2026-06-15（已上線 main）**：🥉「盼望」**動作版**——以利亞重得力（收集餅🍞水💧恢復體力，王上 19）。
> 自成一體引擎 `src/minigames/elijah/`（仿大衛甩石，約拿 fork 之外）。線上預覽 `?demo=elijah-action`，
> 已接進**大廳「逆轉奇兵」合輯的「盼望奇兵」卡片**（hfpc-bible-games）。⚠ 教導文案 AI 草擬，牧者請過目（可隨時 revert）。
> 🕊️ **福音奇兵（cornelius）卡片關亦於 2026-06-15 併入 main**（?demo=cornelius，牧者已審）；盼望/大光的「卡片版」文案仍待審、未連結。
> 🌊 **紅海奔逃動作關（出 14, level 8）已做好**（約拿引擎 redsea.js）並 sync 進保羅、接到出埃及「過紅海」站——
> **但 `feat/redsea-exodus`（paul PR #2）尚未併 main**，待「紅海放哪」決策（出埃及旅程 vs 大廳獨立 ?demo=redsea；使用者傾向動作版獨立）。
> 🔴 **兩個開放決策（紅海放哪、大廳逆轉奇兵每奇兵卡片版+動作版並列）+ 完整 CP 排序 todo + 奇兵卡片/動作矩陣，
> 全部見 `讀我-HANDOFF.txt`（已更新到 2026-06-15 早）。**
>
> 對齊現況：**2026-06-15 早**。GitHub：`summer09201017-cloud/hfpc-paul-game`。
> **逆轉奇兵三卡片關 + 系列九個卡片關**升級成「L6 等級」手繪 Canvas 動畫 + 卡片關 3 條命（原 `feat/cornelius-card`，已併）。
> 這份是給接手的人 / AI 看的「目前到哪了、接下來做什麼」。技術細節看 `CLAUDE.md`，玩法/編輯看 `README.md`，
> **完整跨機交接看 `讀我-HANDOFF.txt` 最上方「2026-06-15 早」整段**（含 repo/站點地圖＋奇兵矩陣＋開放決策＋CP 排序）。

## 🆕 2026-06-14 晚 進度（feat/cornelius-card，未併 main）

- **逆轉奇兵三卡片關（福音/盼望/大光）全做完**，並升級成「L6 等級」逐幕手繪 Canvas 動畫（像約拿蓖麻樹），不再只有 emoji。
- **系列九個卡片關全部 L6 化**：福音/盼望/大光 + 但以理(金像/牆上字/神掌權) + 出埃及(十災/十誡/會幕)，約 40 幕場景。
- **新架構 `src/minigames/cards/`**：`scenes.js`（drawBackdrop 通用背景 + person 等道具 + 各書卷場景 drawer）、`CardScene.jsx`（canvas+rAF+ResizeObserver+reduced-motion）、`CardGame.jsx`（SceneArea 決定 bespoke/通用/輕量底；spec.canvas 預設 fallback）。心法見 skill **`card-canvas-scenes`**。
- **卡片關 3 條命（opt-in `spec.lives`）**：奇兵關答錯扣命、扣完 💔 可重來；但以理/出埃及反思關維持「不會失敗」。
- **卡片關背景音樂**：`cardAudio.js`（零音檔 Web Audio，可離線），各關不同曲風（`spec.music`）+ 🎵/🔇 靜音鈕（記憶）。
- **大衛甩石**：牧者調整（瞄準角 0–90、石子 5→3、命中區微縮）。
- 測試：`npm test` 32 項全綠；每關 `?demo=` 用 Playwright 截圖驗收、零 JS 錯誤。
- ⚠ 部署閘：福音文案牧者已審；**盼望/大光文案待審**。上線前決定「只上福音」或「三卡一起」，再併 main（自動部署），並把大廳對應 soon 拿掉。

## 🔮 未來功能 / Skill / Tool Calling（CP 值排序）
完整清單見 `讀我-HANDOFF.txt`「🚀 接下來可做的」「🧩 Skill」「🛠️ Tool Calling」三段。重點：離線啟動選單頁、通關獎狀、得分進大廳計分板（半天內）；reverse-rpg-design / quiz-authoring skill；Playwright 截圖驗收與送審清單自動化。

> ### 📌 現況速覽（2026-06-13 晚 · 旅程部分）
> - **線上 main = 七條旅程**（保羅 1/2/3/4 + 約拿 + 出埃及 + 但以理；牧者已審、已部署）。
> - **總入口大廳上線**：https://hfpc-bible-games.netlify.app （獨立 repo，卡片連各遊戲）。
> - **四條已驗證、待併 main 的分支**（使用者明示暫不重部署保羅站）：
>   `feat/deeplink-preselect`（?journey= 預選，大廳深連結要它）、
>   `feat/mobile-install-and-zoomfix`（手機放大全白修正＋安裝鈕）、
>   `feat/journey-picker-cards`（首頁分類卡片）、
>   `feat/david-sling`（大衛甩石**拋射引擎**，可重用、尚未接成旅程）。
> - 乾淨併序：deeplink → mobile → picker；david-sling 獨立。

---

## ✅ 已完成（並有 CI / 自我對戰護住）

**架構與品質**
- 純規則引擎 + 可抽換畫面（`core/engine.js` 不碰 React/DOM；隨機值外部注入；單一 `getGameStatus`）。
- 自我對戰護欄：**6 條旅程 × 1~4 人 × 300 種子 = 每條 1200 場**，全部正常結束。
- 內容驗證器 `npm run validate`（現在一次驗**全部六個 journey JSON**：重複 id、選項越界、effect 拼錯、牌庫規則、座標範圍）。
- CI（GitHub Actions）：push/PR 自動跑 validate + selfplay + build + **真實瀏覽器實機玩一整局**；actions 已升 `@v5`（無 Node 20 警告）。
- 真實地理棋盤：用真經緯度投影海岸線、站點座標自動產生（`gen-map.mjs`，多旅程版）。
- PWA 可安裝 / 離線；Netlify 部署設定（Node 釘 20）。

**玩法內容**
- **四條旅程 + 旅程選單**：
  - 第一次宣教旅程（**20 站**，含 6 機會/命運卡站 + 2 必停闖關站）。
  - 第二次宣教旅程（**20 站**，福音首次進歐洲：腓立比/帖撒羅尼迦/庇哩亞/雅典/哥林多…；含 ⛰️ 翻越托魯斯山、🌊 地中海長航 2 個必停闖關站）。
  - 第三次宣教旅程（**20 站**，2026-06-11 完成且牧者過審：以弗所三年事件群/羅馬書/米利都道別…；含 ⛰️ 高原趕路、🌊 趕路的海程 2 個必停闖關站）。
  - 約拿宣教之旅（**20 站**，約拿書 1–4 章，**6 個必停闖關站＝約拿全六關**）。
  - **🆕 出埃及記之旅（2026-06-12 骨架完成）**：**22 站**（歌珊地→十災→逾越節→過紅海→嗎哪→西奈十誡→金牛犢→會幕榮光），真實地理底圖（gen-map 新 region：尼羅河三角洲→西奈半島），3 個闖關站（過紅海 L1 mustStop / 撿嗎哪 L4 / 舉手禱告 L2）+ 十誡 mustStop 問答站。**完整六關設計（含卡片流程關）見 skill `bible-journey-planner/references/出埃及記-設計.md`。**
  - **🆕 但以理在巴比倫（2026-06-12 骨架完成）**：**20 站**（耶路撒冷被圍→王膳考驗→金像之夢→火窯→牆上的字→獅子坑→七十年的盼望），**手繪「七十年時間軸」棋盤**（`region-map-daniel.json` 是手寫的、不走 gen-map——這是全系列第一個非地理棋盤），火窯 L2 mustStop 闖關站。**完整設計見 `bible-journey-planner/references/但以理-設計.md`。**
- **手機體驗（2026-06-11 晚）**：強制橫式全螢幕（manifest landscape + 直向蓋版 + 手勢全螢幕，見 `force-landscape-pwa` skill）；橫向版面地圖填滿左欄約 8 成（cover 不變形、可平移）、骰子排最上；縮放白屏根治（transform scale → 實際版面放大）；闖關彈窗以視口高度反推上限不再切底。
- 每城**多題隨機抽**（`quizzes[]`，落格抽一題）。
- **機會 / 命運卡**：頂層 `decks`、`drawCard` 觸發、**點牌翻牌** UI；規則「每張卡都必須加或減點數」（validate 強制）。
- **嵌入式即時小遊戲（路線 A）— 約拿全六關都可嵌（2026-06-10）**：
  - **1/2/4 純 Canvas 關**（跑酷／暴風雨／曠野→尼尼微）：配空殼 NullUI；同一跑酷引擎被多條旅程重用（保羅＝翻山越嶺用 L4 曠野美術 / 約拿＝逃往約帕用 L1 港口美術），HUD 地名由站點 `minigame.hudLabels` 或引擎各關預設決定。
  - **3/5/6 卡片流程關**（大魚肚禱告／尼尼微傳道／蓖麻樹）：`MiniGameModal.jsx` 的 `makeEmbedUI` 把引擎的 `showFish*/showPreach*/showGourd*` 畫成 React 卡片，按鈕回呼 `game.handleXxxAction`（嵌入契約見約拿 CLAUDE.md 第 4 點）。
  - **已用 Playwright 全自動 e2e 驗證**：約拿之旅整條 20 站、6 個小遊戲全部可玩到結束、零 JS 錯誤。
- **🆕 挪亞方舟兩關（2026-06-15 晚，`feat/noah-minigames` / PR #15，未併 main）**：
  - `arkpairs`「一公一母進方舟」= 翻牌記憶配對（母的戴 🎀，6/8/10/12 對可選、**有背景音樂**）+ **安排房間相鄰約束解謎**（猛獸旁只能大象/飛鳥，賽 11:6；`composeRound` 保證有解）。
  - `arkbuild`「一步一步蓋方舟」= 操作挪亞鎚擊瞄準放木板（對準釘點才上、各排位置不同＝難度）+ 旁人嘲笑（來 11:7）。
  - 都是 in-repo Canvas、零美術檔、可離線、嵌入契約同 sling/elijah；`?demo=arkpairs`/`?demo=arkbuild` 單獨可玩；可重用機制 = skill `match-pairs-minigame`。
- **3D 骰子**（CSS 3D 立方體：擲骰立體翻滾、停下平滑轉到擲出面，對面相加＝7；轉 3 秒、純 CSS 不動引擎）；地圖縮放連續可調（拉桿 + 可輸入百分比，100–250%）。
- 勝負＝**福音點數最高**（不是最先到）。
- **一點點 RPG（資料驅動，兩條保羅旅程＋約拿頭銜都有）**：同工被動加成（第一次＝巴拿巴/馬可；第二次＝西拉/提摩太/路加/亞居拉百基拉）、屬靈裝備/恩賜（全副軍裝 弗 6：真理腰帶/信德盾牌/聖靈寶劍，靠機會卡 `addGift`；盾牌 `guard` 擋一次暫停）、分數頭銜（保羅：蒙召的人→門徒→傳道者→使徒；約拿：→回轉的人→順服的僕人→憐憫的使者）。只加分、不卡關。詳見 README「🎒 一點點 RPG」。
- **宣教接力（paul1 → paul2 → paul3 全接通）**：旅程走完，結束畫面可「接續下一段」——名字/福音點數/裝備帶過去、同工換新旅程起點同工（`JOURNEYS.nextKey`；journey4「海路到羅馬」完成後接 `paul3 → paul4`）。
- **步數透明**：卡片 `move` 效果真的移動棋子（「神安排大魚：前進 2 格」）；必停站/終點提前停下顯示 `moveNote` 說明條（玩家不再誤以為步數和骰子不符是 bug）。結算每筆加分標來源（事件「…」：/機會卡：/劇情：），答錯明確寫「這一題沒有加分」。

**Skill 庫（全域 `~/.claude/skills/`，可跨專案重用；壓縮檔內附 claude-skills\）**
- 大富翁三件套：`roll-and-move-game`、`game-content-validator`、`real-geography-board`。
- 闖關三件套：`embed-minigame`、`add-challenge-station`、`arcade-game-kit`。
- **🆕 配對解謎（2026-06-15）**：`match-pairs-minigame`（翻牌記憶配對 + 選用「相鄰約束安排解謎」；活範例 arkpairs，含「保證有解」回溯與座標換算坑）。
- 系列／品質／交付：`bible-game-studio`（內容神學慣例）、`game-smoke-test`（上課前煙霧測試，約拿 `npm test` 是活範例，可補本專案離線檢查）、`classroom-game-deploy`、`web-launch`、`packer-theology`、`board-game-designer`、`force-landscape-pwa`。
- **🆕 新書卷三件套（2026-06-12）**：`bible-journey-planner`（書卷→遊戲五步設計法；**但以理/出埃及記完整設計稿在它的 references/**）、`bible-rpg-items`（輕 RPG 道具/裝備/同伴/頭銜層：設計心法＋四卷書道具庫＋effect 映射表）、`bible-game-scaffold`（設計稿→新專案：加旅程 vs 開新 repo 決策、複製清單、驗證鏈、完工定義）。

---

## 🆕 2026-06-13 進度

- **三條新旅程牧者審核通過並上線**：merge `feat/daniel-exodus`（但以理 20 站＋出埃及記 22 站，含卡片闖關 6 關/RPG 層/棋盤美化/終局反思）與 `feat/journey4-rome`（海路到羅馬 20 站，宣教接力終點）入 main → Netlify 自動部署。**線上版現為七條旅程**。
- 測試證據：validate 七檔全過、selfplay 七旅程各 1200 場全部結束、煙霧 23 項、離線就緒 45 項全綠。
- 分支整理待辦：`feat/daniel-exodus-2026-06-12` 是被終版取代的舊骨架分支（commit f55ad30），確認無人引用後可刪。

---

## 🆕 2026-06-12 進度

- **測試門升級(已併入 main)**:`npm run validate` 無參數時自動驗**全部** `journey*.json`(CI 同步受惠);新增 `scripts/smoke-test.mjs`(src 語法 + 嵌入契約守門 + `--offline` 離線就緒,逐檔檢查 Workbox 預快取);`npm test` = validate+selfplay+煙霧、`npm run test:offline` 44 項全綠。
- **版本收斂**:06-11 深夜未 commit 的文件最終版已救回(8946d1c);GitHub 是唯一真相,一律在 git 工作樹工作。
- **機器註記**:HFP 那台(Node 24.14.1)實測 `vite build` 連跑 3 次全部成功——「Node 24 build 地雷」是 agape250 那台的機器特性,非 Node 24 通病。
- **`feat/rpg-items-batch1` 分支(待牧者審)**:牧師 06-12 道具設計的零引擎改動資料層——三旅程全副軍裝補齊 6 件、journey2 獄中讚美詩/製帳棚、journey3 羅馬公民證/書信羽毛筆、約拿之旅 gifts(禱告卷軸/蓖麻樹蔭)+蟲蟲卡+船票卡。設計總表見 skill `bible-rpg-items`。
- **新書卷管線 skill ×3**:`bible-journey-planner`(含但以理/出埃及記完成設計稿)、`bible-game-scaffold`、`bible-rpg-items`。

---

## 🔧 真正待做（依優先序）

0. **牧者審核 feature branch**：約拿 repo `feat/quiz-ch3-4`(題庫 3–4 章)——實測滿意才 merge main(main 自動部署)。題目已納入「題庫送審清單」。（✅ 本 repo `feat/rpg-items-batch1` 道具第一批＝牧師本人設計的資料層，2026-06-12 下午已併入 main：validate＋selfplay＋煙霧全綠後推送，線上可實測，不滿意可 revert。）
0b. **但以理 / 出埃及記：從骨架到完整（2026-06-12 新坑，按 CP 值排序）** —— 骨架（站點/題庫/卡庫/3+1 闖關站/頭銜）已可玩且全鏈綠；設計稿在 `bible-journey-planner` skill 的 references/。進度：
   - ~~a. 題庫神學審核~~ **✅ 已完成（2026-06-13 牧者審核通過）**：但以理＋出埃及兩條旅程（含卡片流程關文案）已併入 main 並上線（merge 3bbac4f；validate＋selfplay 七旅程×1200＋煙霧＋離線就緒全綠後推送）。
   - ~~b. 但以理時間軸棋盤美化~~ **✅ 已完成（2026-06-12 下午）**：`region-map-daniel.json` 新增 `decor` 裝飾剪影層（城牆垛口/塔廟/金像柱/空中花園/王宮/河波）＋點綴 emoji；`MapBackground.jsx` 支援 `map.decor`（向下相容，地理棋盤不受影響）。**手寫檔，不會被 gen:map 覆蓋，可放心再編輯。**
   - ~~c. 卡片流程闖關 4 關~~ **✅ 已完成（2026-06-12 下午）**：金像之夢排序（但2）、牆上的字解碼（但5）、十災順序（出7–11）、十誡配對（出20）——純 React 卡片，新框架在 `src/minigames/cards/`（specs.js 內容規格 + CardGame.jsx 播放器；站點用 `minigame.cards` 指定，**在約拿 fork 之外，sync:jonah 不會碰**）。不會失敗、答錯溫柔重試（同約拿 3/5/6 精神）。
   - ~~d. RPG 道具層~~ **✅ 已完成（2026-06-12 下午）**：照道具庫填好——但以理 6 件裝備（素菜清水/開窗禱告/解夢智慧/第四個人/封獅口天使/紫袍金鏈）＋三友＋王膳美酒陷阱卡；出埃及 7 件（摩西的杖/羔羊的血/雲柱火柱/嗎哪罐/磐石活水/法版/會幕藍圖）＋亞倫(起始)/米利暗/約書亞/戶珥＋嗎哪生蟲陷阱卡（出 16:20 還原劇情的代價）。
   - ~~e. 反思終局關 ×2~~ **✅ 已完成（2026-06-12 下午）**：神掌權五幕（但 7/9/12）接在「七十年的盼望」終點站、會幕榮光五幕（出 32–34/40）接在「會幕建成」終點站——用同一套卡片框架（cards: danielFinale / exodusFinale）。
   - **f. 收集機制換皮（仍待做，需引擎端協調）**：撿嗎哪「多撿生蟲」、王膳考驗「接素菜閃美酒」——要重用約拿 spawner 加權寶物系統，屬上游引擎改動（嵌入契約），請與約拿引擎端（目前在做美術換皮 art-kenney-sprites）協調後再動，避免 fork 漂移。
1. **神學 / 題庫審核（最重要）**：`journey2.json`（第二次旅程）與 `journey-jonah.json` 的題目、卡牌，請德義老師 / 牧者依 README 的「題庫審核清單」過目後再正式上線。第二次旅程的題目是 AI 草擬，務必人工把關。
   - **✅ 2026-06-10 部分審核通過（牧者本人）**：當日「新增」的站點題目與卡片文案——含 約拿之旅新 5 站（下約帕的路上/沉入深海/魚腹禱告·仰望/曠野趕路/三日路程的大城）、尼尼微全城悔改與蓖麻樹的功課的補題、第二次旅程新 8 站（敘利亞與基利家/托魯斯山/弗呂家加拉太/尼亞波利/暗妃波里/愛琴海航路/堅革哩/地中海長航）、全副軍裝機會卡（兩條旅程）、同工/頭銜文案。**仍待審**：journey2 與 journey-jonah「原有」的題目卡牌（2026-06-10 之前草擬的部分）。
2. ~~第三次宣教旅程~~ **✅ 已完成並上線（2026-06-11）**：`journey3.json` 20 站（以弗所三年事件群/推喇奴/士基瓦/焚書/底米丟/羅馬書/猶推古/米利都道別/亞迦布/耶路撒冷）+ 2 闖關站（高原 L4、海程 L2）+ RPG 層；`gen-map.mjs` region3 真實愛琴海地圖；宣教接力 `paul2 → paul3` 已接通；四旅程 selfplay 全綠。**✅ journey3 題目與文案 牧者審核通過（2026-06-11）。**
   ~~仍待做：「海路到羅馬」~~ **✅ 已完成並上線（2026-06-13 牧者審核通過）**：`journey4.json` 20 站（徒 27–28：被押解/狂風友拉革羅/船難馬耳他/抵達羅馬）＋ 2 個 L2 必停闖關站；`paul3` 的 `nextKey` 已接上 `paul4`——宣教接力 paul1→2→3→4 就是完整保羅一生（merge da8132f）。
3. ~~約拿地圖改用真實「尼尼微 → 地中海」底圖~~ **✅ 已完成（2026-06-10）**：`gen-map.mjs` 新增「約拿宣教之旅」region（框 lon 30–44.5°E、lat 29.5–37.8°N），約帕/迦特希弗/尼尼微等用真經緯度，海上途中站給地中海座標，他施以西邊海外箭頭示意；`region-map-jonah.json` 已是真實海岸線、站點座標自動產生。視覺上看得出約拿被召去東邊的尼尼微、卻往西逃出海，魚後再往東去尼尼微。
4. ~~闖關美術 / 主題對齊~~ **✅ 已完成（2026-06-10）**：兩條保羅旅程的「翻山」闖關站改用第四關曠野美術（`level: 4`，旱路+城門），L1 港口美術留給約拿「逃往約帕」；暴風雨難度仍可在 `src/minigames/jonah/config.js` 的 `STORM` 微調。更多城市闖關用 `add-challenge-station`。
4. **更深的大富翁機制**：同工卡牌、植堂計分、機會/命運再擴充。
5. **雲端存檔 / 班級排行榜**（Supabase）。
6. **AI 輔助產題**：檢索式、附經文出處，由牧者審核（先用在「幫忙產題並校對」最安全）。
7. ~~正式部署~~ **✅ 已上線（2026-06-11）：https://hfpc-paul-game.netlify.app/**（連 GitHub `main` 自動部署，Netlify 雲端用 Node 20 建置——本機 Node 24 的 vite build 地雷不影響雲端；首次部署一次全綠，Playwright 已實機驗證線上版可開局/擲骰/進闖關站）。**剩**：手機「加入主畫面」安裝 → 關 Wi-Fi 離線煙霧測試。

### 技術債 / 注意事項
- `src/minigames/jonah/` 是約拿專案（`hfpc-jonah-game`）的**純複製 copy**；上游更新後跑 **`npm run sync:jonah`** 一鍵同步（約拿端守住其 CLAUDE.md「嵌入契約」，這裡就不必重套改動）。
- 🚀 **未來功能點子（跨兩專案，按 CP 值排序）見 `讀我-HANDOFF.txt` 的「未來功能點子」**。
- `useGame.js` 的 `JOURNEYS` 已支援多旅程；新增旅程只要加一筆 + 對應 `journeyX.json` 與 `region-mapX.json`。
- 站點 `x`/`y` 與 `region-map*.json` 都是 `gen-map.mjs` 的**產生物**，請勿手改；要動地圖改 `CITIES` 經緯度再 `npm run gen:map`。

---

## 一次跑完所有檢查
```bash
npm install
npm test                   # validate(全部 journey*.json,含但以理/出埃及)+ selfplay(六條各 1200 場)+ 煙霧測試
npm run test:offline       # build + dist 離線就緒(Workbox 預快取逐檔檢查)
npm run build              # 打包；CI 另會跑真實瀏覽器實機測試
npm run dev                # 本機開發（區網可連，給平板/投影）
```

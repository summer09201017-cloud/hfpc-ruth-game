# 📖 路得記 · 從空到滿

互動式聖經大富翁關卡遊戲。跟著路得，從饑荒、喪親、寄居的「空」，走到拾穗蒙恩、城門贖回、家譜得名的「滿」——
看神藉著**至近的親屬救贖者（go'el）波阿斯**施行救贖（波阿斯是基督的影子）。

擲**骰子（1～6 點）**→ 沿「摩押 → 死海/約旦河 → 伯利恆」的手繪棋盤前進 → 停在每一站看「**劇情 + 歷史小檔案**」、
答「**那一站的聖經問答**」賺「**恩慈點數**（hesed）」。大家走完後，**恩慈點數最高的人獲勝**（重點是答對、把握恩典，不是比誰先到）。

- 🎯 擲骰 1～6 ＋移動＋踩格事件＋每站問答
- 🗺️ 手繪「從空到滿」棋盤（14 站，摩押↔伯利恆，非方形迴圈）——救贖與恩慈的旅程
- 📚 每站連到和合本經文（**經文以本機 cuv MCP 逐節查證過**），邊玩邊學
- 🎒 輕 RPG：同伴（拿俄米／波阿斯）、6 件道具（拾穗的籃、故意留下的麥穗、外衣、脫下的鞋、至近親屬的盟約、俄備得）、頭銜（寄居摩押的→委身的路得→拾穗蒙恩的→蒙贖之婦→大衛的曾祖母）
- 👥 1～4 人（平板單機 / 教室投影對戰）
- 📱 PWA：可安裝到手機/平板/PC，裝好可**離線玩**

> **現況（2026-06-19）— 已完成 vs 待做**
> ✅ **可玩棋盤 MVP**：14 站 + 題庫 + 機會/命運卡 + 輕 RPG + 手繪底圖；`validate` 全綠、`selfplay` 1200 場全部正常結束、`build` 成功（PWA 離線就緒）、本機 `preview` 實測 HTTP 200。
> 🔜 **拾麥穗 Canvas 收集關**（signature 關，得 2）：目前第 6 站「拾麥穗蒙恩」先以問答呈現；下一步把 `collect-recover` 引擎（elijah）換皮成「路得在麥田撿麥穗、波阿斯故意撥落、撐到日暮裝滿一籃」的即時關。
> 🔜 其餘卡片關（路得的抉擇／禾場求贖／城門贖回）與**家譜→基督反思終局五幕**、部署 Netlify + 加進大廳合輯。
> 設計全稿見 `bible-journey-planner` skill 的 `references/路得記-設計.md`。

---

## 🚀 怎麼跑

需要 [Node.js](https://nodejs.org/)（18 以上；本機實測 Node 24 可用）。

- **最簡單**：雙擊 **`start-game.bat`**（會自動找空埠、首次自動 `npm install`、開好瀏覽器）。
- **或手動**：
  ```bash
  npm install        # 第一次先裝套件
  npm run dev        # 開發模式，瀏覽器開 http://localhost:5173
  ```

正式 / 給別人玩：`npm run build` 打包到 `dist/`，再 `npm run preview` 本機預覽。

### 教室投影多人玩
`npm run dev` 後終端機會顯示 **Network** 網址（如 `http://192.168.x.x:5173`）；同一 Wi-Fi 的平板/手機直接開那個網址，看投影輪流擲骰搶答。

---

## ✏️ 怎麼改內容（老師最常動這裡）

所有劇情、事件、題目、道具都在一個檔：**`src/data/journey-ruth.json`**。改完存檔，開發模式畫面自動更新，**不用碰程式**。

- 站點 `stations[]`：`id`（唯一英文代號）、`name`、`type`（`start`/`story`/`event`/`quiz`/`end`）、`x`/`y`（手排 0–100，蛇形 4 列；**這是手繪棋盤，請勿跑 `gen:map`**）、`scripture`、`text`、`history`、`quizzes[]`。
- 問答：`quizzes[]` 每題 `question` / `options` / `answerIndex`（從 0 算）/ `explanation` / `reward`。
- 效果 `effect`：`gospelPoints`（恩慈點數加減）、`addCompanion`、`addGift`、`skipNext`、`drawCard`（`"chance"`/`"fate"`）。
- 機會/命運牌庫在頂層 `decks`；輕 RPG 在頂層 `companions` / `gifts` / `titles`（不想要可整段刪，核心不受影響；只加分、不卡關）。
- 改完務必跑 `npm run validate`（會檢查選項過少、`answerIndex` 越界、`addGift` 對應到真實 `gifts`、座標越界等）。

> ⚠️ **經文請以和合本為準**：本機已接 `cuv` 經文查詢 MCP（`lookup(書,章,節)`）。新增/修改經文後，可跑 `/cuv-check` 全 repo 比對，或讓 `bible-game-reviewer` 送審。寧可查「沒有」也不要給孩子錯的經文。

---

## 🗺️ 棋盤底圖（手繪，可自由編輯）

`src/data/region-map-ruth.json` 是**手繪**底圖（摩押高原 → 死海/約旦河谷 → 伯利恆城牆/城門/麥田/禾場），
仿但以理「時間軸棋盤」做法：`lands`（陸塊 SVG path）、`decor`（裝飾剪影層）、`labels`（地名/emoji）。
站點 `x`/`y` 也是手排的——**這條旅程不走 `gen-map`**（故事 80% 在伯利恆一地，用真經緯度會擠成一團）。

---

## 🧪 測試

```bash
npm run validate       # 內容驗證（題庫/effect/道具/座標）
npm run test:selfplay  # 純引擎自我對戰：1–4 人 × 300 seed，確認每局都會正常結束
npm test               # validate + selfplay + 煙霧測試（語法/嵌入契約/PWA）
npm run test:offline   # 再加 build + PWA 離線就緒檢查（上課/裝機前跑）
```

---

## 🏗️ 程式架構（給工程師看）

「**純規則引擎 + 可抽換畫面**」——複製自已驗證的 `hfpc-paul-game` 母體。

```
src/
  core/engine.js          ← 純規則引擎（建立/擲骰/移動/結算/回合/結束判定）；不 import React，可單測。
  data/journey-ruth.json  ← 遊戲內容（老師改這裡）。
  data/region-map-ruth.json ← 手繪棋盤底圖。
  state/useGame.js         ← 接引擎 + 動畫計時的 React hook（JOURNEYS 只掛 ruth 一條）。
  components/              ← 純畫面：地圖、骰子、玩家卡、彈窗、結束畫面。
  minigames/              ← （繼承自母體；路得記目前未掛 Canvas 關，待加「拾麥穗」收集關）。
```

**核心原則**：規則只活在 `core/`，畫面只「讀狀態、送出點擊」。

---

## 🚢 部署

Netlify 連 GitHub repo 自動部署（`netlify.toml` 已設好：`npm run build` → `dist`，Node 20）。
部署後把線上網址加進總入口大廳 `hfpc-bible-games` 的卡片牆（用 `add-to-collection` skill）。

---

榮耀歸神。經文寧可查 cuv 也不要憑記憶——寧可說「沒有」，不要給孩子錯的經文。

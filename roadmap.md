# 🌾 路得記·從空到滿 — 進度藍圖(已完成 vs 真正待做)

> ## ⭐ 對齊現況:2026-07-05(最新,接手 AI 先讀這段)
>
> **✅ 已完成(別重做):**
> - **可玩棋盤 MVP(2026-06-20 初始 commit 就有)**:唯一旅程 `ruth`(`src/data/journey-ruth.json`,14 站手繪蛇形棋盤,**不走 gen-map**,x/y 手擺——同 paul 的 daniel 例外);恩慈點數(hesed);輕 RPG(companions/gifts);`validate` 全綠、`selfplay` 1200 場全 `all_finished`、`build` 成功(PWA 11 項預快取)。
> - **🌾 拾麥穗蒙恩收集關(gleaning)——已完整可玩**(⚠ 舊 CLAUDE.md 一度標「待做」是文件漂移,引擎其實隨初始 commit 就在):`src/minigames/gleaning/` 8 模組(elijah 收集引擎換皮:邊跑邊撿麥穗回體力、波阿斯「故意撥落」恩典、日暮裝滿一籃過關、體力歸零=溫柔歇息非失敗);`?demo=gleaning` 單獨玩、第 6 站 `minigame:{engine:'gleaning'}` 接進棋盤、`play-gleaning.bat` 雙擊即玩。
> - **2026-07-05(agape250 機)驗收+經文修正**:引擎 8 模組 node --check 全過;Playwright 實測(開場卡/遊玩/波阿斯對話/低體力提示)console 零錯誤;**content.js 全部引文用 cuv MCP 逐字複驗,修正 5 處**(得 2:8 跳句未標省略、2:9 漏「可以」、2:2-3 漏字、2:7 與 2:16 的「她」改回和合本原文「他」);省略一律明標「……」。roadmap/HANDOFF 由 paul 舊內容重寫為路得記專屬(原文件債清掉)。
>
> **🔜 真正待做(CP 值 × 工時排序):**
> | # | 項目 | ⏱ | 備註 |
> |---|---|---|---|
> | 1 | **文案送牧者審**(gleaning content.js + journey-ruth.json 題庫) | 牧師時間 | 過審前不上線;用 `/review-queue` 盤點、pastor-review 打包 |
> | 2 | **journey-ruth.json 題庫經文 /cuv-check 全面複驗** | ~1hr | content.js 自稱「已查證」仍被抓 5 處,journey 的自稱同樣不可盡信 |
> | 3 | **部署 Netlify(A 站)** | ~30min | netlify.toml 已備;建站→push main 自動部署→`/ship-check` 驗線上 |
> | 4 | **加進大廳**(add-to-collection) | ~10min | 部署+過審後;大廳金句 `ruth-1-16` 已 verified、等這張卡點亮 |
> | 5 | 卡片三關:抉擇(得 1)/禾場求贖(得 3)/城門贖回(得 4) | 各~半天 | card-flow-minigame + L6 手繪;設計稿見 bible-journey-planner references/路得記-設計.md |
> | 6 | 家譜→基督 五幕反思終局 | ~半天 | bible-card-finale(俄備得→耶西→大衛→基督,波阿斯預表救贖主) |
> | 7 | 清 `src/minigames/` 繼承母體死碼(jonah/sling/cards/ark*) | ~1hr | 先確認 MiniGameModal/路由沒引用再刪;走 PR |
>
> **🚫 刻意不做**:gen-map(蛇形手繪棋盤是刻意設計);把恩慈點數改成競爭性計分(路得記的核心是 hesed 不是輸贏)。

---

## 歷史段(重寫前的記錄)

- 2026-06-20:`chore: 初始化路得記·從空到滿(git + Netlify 部署設定)`——單一 commit 含棋盤 MVP + gleaning 引擎全部。
- 2026-07-05 前:本檔與 讀我-HANDOFF.txt 整份仍是 paul 母體舊內容(全系列文件債最重的一筆),2026-07-05 重寫。

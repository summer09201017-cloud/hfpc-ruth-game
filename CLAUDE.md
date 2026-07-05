# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> 📌 **現況速覽(2026-07-05)**:從 `hfpc-paul-game` 母體複製、瘦身成的**獨立路得記 repo**。
> ✅ **可玩棋盤 MVP**:唯一旅程 `ruth`(`src/data/journey-ruth.json`,14 站手繪蛇形棋盤,不走 gen-map);`validate` 全綠、
> `selfplay` 1200 場全 `all_finished`、`build` 成功(PWA 11 項預快取)。
> ✅ **🌾 拾麥穗蒙恩收集關(gleaning)已完成可玩**(舊版本段曾標「待做」是文件漂移——引擎隨初始 commit 就在):
> `src/minigames/gleaning/` 8 模組(elijah 換皮:撿麥穗回體力/波阿斯故意撥落/日暮裝滿一籃/歸零=溫柔歇息);
> `?demo=gleaning` 單獨玩、第 6 站 `engine:'gleaning'` 已接、`play-gleaning.bat` 雙擊即玩。
> ✅ **2026-07-05 驗收+經文修正**:Playwright 實測 console 零錯誤;content.js 引文 cuv 逐字複驗**修 5 處**
> (跳句/漏字/「她」→和合本原文「他」),省略一律明標「……」——**檔頭自稱「已查證」不可信,改引文必先 lookup**。
> ✅ 2026-07-06:牧者已過審(她→他 4 處裁定改回「她」,以 cuv MCP 為準)、/cuv-check 完整複驗 🔴0/🟠0、Netlify 已接 GitHub 自動部署(07-05 深夜)。
> 🔜 待做(照序):大廳 ruth 卡確認指向正確 →
> 卡片三關 + 家譜→基督五幕終局 → 清 minigames/ 繼承死碼(jonah/sling/cards/ark*,路得未掛用)。
> 設計全稿 → `bible-journey-planner` skill 的 `references/路得記-設計.md`;`roadmap.md`/`讀我-HANDOFF.txt` 已於 2026-07-05 重寫為路得記專屬。

## What this is

「路得記 · 從空到滿」(Ruth: From Empty to Full) — a single-page React + Vite PWA. A Monopoly-style board game where 1–4 players roll dice and walk Ruth's journey (Moab → Bethlehem, the book of Ruth), triggering story / event / Bible-quiz tiles and gathering 恩慈點數 (hesed points). Theme: 救贖與恩慈 — Boaz the kinsman-redeemer (go'el) foreshadows Christ. Built for classroom projection and tablet/phone (installable, offline-capable). Content and UI are in **Traditional Chinese**; preserve that in user-facing strings. The engine/architecture sections below are inherited verbatim from the proven `hfpc-paul-game`母體 and remain accurate.

## Commands

```bash
npm install            # first-time setup (Node 18+)
npm run dev            # dev server on :5173, host exposed for LAN tablets/projector
npm run build          # bundle to dist/
npm run preview        # serve the built bundle on :4173

npm run test:selfplay  # pure-engine self-play (1–4 players × 300 seeds); fast, no browser
npm run test:browser   # Playwright plays a full game in a real browser — REQUIRES a running
                       #   preview server first (defaults to URL=http://localhost:4173/)
npm run gen:icons      # regenerate PWA icons in public/
npm run gen:map        # regenerate the real-geography board map + station coordinates
                       #   (downloads Natural Earth 50m data to scripts/_geodata/ on first run)
```

There is no lint step and no per-test runner — the two `test:*` scripts are plain Node scripts, not a test framework. To run a single self-play scenario, edit/duplicate `scripts/selfplay.mjs` (e.g. call `playOneGame(2, 42)`).

## Architecture: pure engine + swappable view

The whole design intent is **"game rules live only in `core/`; the view only reads state and dispatches clicks."** Honor this when extending — it's what makes future Phaser/3D/online-multiplayer swaps possible without touching rules.

- **`src/core/engine.js`** — the only place game rules exist. Imports nothing from React/DOM. Three hard invariants, do not break them:
  1. Every function **returns a new state**; it never mutates its input (see `clonefPlayers`).
  2. **Randomness is injected**, not generated here — `roll(state, value)` takes the dice value, and `advance(state, quizRoll, cardRoll)` takes the random floats [0,1) used to pick which quiz (from a `quizzes[]` pool) and which card (from a deck) this landing draws. This is what makes deterministic seeded self-play possible — never call `Math.random()` inside the engine.
  3. **`getGameStatus()` is the single source of truth** for "is the game over?" The game ends when **all** players have finished the journey (`reason: 'all_finished'`) *or* the `turnCap` safety limit is hit. The **winner is the player with the most 福音點數 (gospel points)** — not whoever reaches the end first (gospel points break to finished-state then board position only on a tie). Don't add a competing end-game or win check elsewhere.

- **`src/state/useGame.js`** — the React hook that wires the engine to the screen and owns all animation timing (`ROLL_MS`, `MOVE_MS`) and timer cleanup.

- **`src/data/journey1.json`** — all game content (stations, story text, events, quiz questions, card decks). Non-programmers (teachers) edit only this file. Top-level fields: `title`, `subtitle`, `scoreLabel`, `turnCap`, `decks` (機會/命運 card decks `chance`/`fate`), and the optional **輕 RPG** layer `companions` / `gifts` / `titles` (see below), then `stations[]`.

  **輕 RPG 層（data-driven，可整段刪掉而不影響核心；目前只 journey1 有）：** 引擎在 `resolve()` 結算問答/闖關時，會加上「被動加成」——
  - `companions{ "<名字>": { label, quizBonus?, minigameBonus?, blurb } }`：隊上有這位同工(玩家 `companions[]`，靠 `addCompanion`/`startCompanions` 取得)就生效。例：巴拿巴 `quizBonus:1`、馬可 `minigameBonus:1`(他在旁非利亞 `removeCompanion` 後失效)。
  - `gifts{ "<id>": { name, ref, icon?, quizBonus?, minigameBonus?, guard?, blurb } }`：屬靈裝備/恩賜(全副軍裝 弗 6)。玩家靠 effect `addGift:"<id>"`(機會卡)取得，存在 `player.gifts[]`。`guard:true`(信德的盾牌)會擋下一次 `skipNext`。
  - `titles[{ min, name, quizBonus? }]`：依 `gospelPoints` 門檻給頭銜(門徒→傳道者→使徒)，可帶小 `quizBonus` 特權。`getTitle(board, points)` 取目前頭銜(畫面 `PlayerPanel` 用)。
  - effect 字彙因此多了 `addGift`/`removeGift`(validate 已檢查它們指向真實 `gifts`)。加成只「加分」，不影響回合終止，三旅程 selfplay 各 1200 場仍全數正常結束。 The README documents the per-station schema and the `effect` fields (`gospelPoints`, `addCompanion`, `removeCompanion`, `skipNext`, `drawCard`). A station can carry **multiple quiz questions** via a `quizzes[]` array (one is drawn at random on landing); the legacy single `quiz` still works. Each station also carries a `history` block (`year` / `companions` / `willMeet`) shown as a "歷史小檔案" card in the arrival popup — keep it historically accurate (Acts 13–14, first journey ≈ AD 46–48).

- **`src/components/`** — presentational only (Board, DicePanel, PlayerPanel, StationModal, SetupScreen, GameOverScreen, MapBackground).

### The board map is real geography (generated, do not hand-edit)

The board background is a **real coastline map** of the eastern Mediterranean, and each station sits at its **true latitude/longitude** (Syrian Antioch is on the east/right, the route climbs north-west to Pisidian Antioch, Cyprus is an island in the sea). This is produced by a pipeline, not hand-placed:

- **`scripts/gen-map.mjs`** owns the truth. It holds each city's real `lat`/`lon` in its `CITIES` map, projects Natural Earth 50m country outlines (equirectangular, cosine-corrected) into the board's 0–100 space, and emits **`src/data/region-map.json`** (coastline SVG paths + `aspect` ratio + projected city marks). It also **writes `x`/`y`/`lat`/`lon` back into `journey1.json`**.
- Therefore **station `x`/`y` in `journey1.json` are generated output — do not hand-edit them.** To move or add a city, edit its `lat`/`lon` in the `CITIES` map in `gen-map.mjs` and re-run `npm run gen:map`. To widen/shift the visible map frame, edit the `LON_MIN/LON_MAX/LAT_MIN/LAT_MAX` bounds there.
- `Board.jsx` reads `region-map.json` for the `aspect` ratio (applied as the board's `aspect-ratio`, which is what keeps the geography undistorted) and renders `MapBackground.jsx` (sea rect + land paths + HTML labels/compass). Route legs are drawn per-segment: a leg is styled as a **sea voyage** (blue dashes) when the arrival station has `arriveBy: "sea"`, otherwise overland (brown dashes).

### Two distinct phase vocabularies (common confusion)

The engine and the UI hook use **different `phase` enums** — don't conflate them:

- **Engine** (`engine.js`): `idle → rolled → resolving → turnEnd → gameover`. Each step is one pure function: `roll` → `advance` → `resolve` → `endTurn`.
- **UI** (`useGame.js`): `setup → idle → rolling → moving → station → result → gameover`. The hook collapses the engine's `rolled`/`resolving` steps into the `rolling`/`moving`/`station` animation phases, advancing the engine instantly behind dice/pawn animations.

A board tile is resolved in **two UI steps**: `station` (show story/quiz, not yet scored) then `result` (scored, show outcome). `resolveStation({ answerIndex })` carries the chosen answer whenever the landed tile **has a `quiz` block** (see below) — any tile type can; tiles without one ignore the payload.

### Station types & turn flow

Tile `type` is one of `start | story | event | quiz | chance | fate | challenge | end` (it drives the icon/label and the narrative effect). **Quizzes and cards are decoupled from type:** `resolve` applies the tile's event/story `effect`, *then* applies any drawn 機會/命運 card's effect, *then* scores the drawn quiz if the tile carries one — so every city you can land on can have a question for points (use `getActiveQuiz`/`getActiveCard`, not `station.quiz`, since multi-question pools and cards mean "what was drawn this turn" lives in `state.pendingQuizIndex`/`state.pendingCard`). Cards fire when `type` is `chance`/`fate` **or** any tile's `effect`/`event.effect` carries `drawCard: "chance"|"fate"` (the latter is preferred on the real-geography board so you don't insert non-city tiles). Movement is driven by an injected **1–6** value (a standard die — `roll(state, value)`; the UI shows a pip die in `DicePanel`). Movement clamps at the last station (can't overshoot the destination) **and at any `mustStop: true` checkpoint** in range (you can't jump past a forced station like the storm mini-game — `advance` stops you on the first such tile); landing on the last station sets `finished`. In `nextActiveIndex`, **`finished` (reached the end, permanently out) and `skipNext` (paused one turn) are different things** — the game must not be declared over just because everyone is currently paused. That termination logic and the `turnCap` are exactly what the self-play harness exists to guard; if you touch turn order, effects, dice range, or end conditions, run `npm run test:selfplay`.

## Adding a new journey

**Multi-journey is now wired.** `useGame.js` holds a `JOURNEYS` array — currently `paul` (journey1, 20 tiles), `paul2` (journey2, into Europe, 20 tiles), `paul3` (journey3, Ephesus years → Jerusalem, 20 tiles), **`paul4` (journey4 海路到羅馬, Acts 27–28, 20 tiles, 2026-06-12 晚)**, `jonah` (journey-jonah, 20 tiles), **`exodus` (journey-exodus, 22 tiles, 2026-06-12)** and **`daniel` (journey-daniel, 20 tiles, 2026-06-12)**. Each entry can carry `nextKey` (宣教接力: finishing a journey offers "continue to the next one", carrying name/points/gifts; companions reset to the new journey's `startCompanions`) — the relay now runs `paul1 → paul2 → paul3 → paul4`. `SetupScreen` shows a journey picker. To add another:
1. Create `src/data/journeyN.json` (copy an existing one; edit content — see [[roll-and-move-game]]).
2. Add its cities (real `lat`/`lon`) as a new `buildRegion({...})` call in `gen-map.mjs` (each region has its own bounds + ISO country set + output `region-mapN.json`), then `npm run gen:map` — this writes `x`/`y` back and emits the coastline.
3. Add `{ key, journey, map }` to `JOURNEYS` in `useGame.js`.
4. `npm run test:selfplay` already loops over all journey files — add the new one to its `JOURNEYS` list too. `npm run validate` chains all journey files in package.json — add it there as well.

**⚠️ `daniel` is the one exception to the gen-map rule:** 但以理 90% 的劇情都在巴比倫一座城，so it uses a **hand-drawn "seventy-years timeline" board** — `region-map-daniel.json` is hand-written (NOT a gen-map artifact; edit it freely) and the station `x`/`y` in `journey-daniel.json` are hand-placed (a 4-row serpentine across four dynasties). gen-map skips it entirely (it has no `buildRegion` entry); never run gen:map expecting it to manage daniel. All other journeys (including `exodus`) follow the normal generated-geography rule above. The daniel map also carries a **`decor` layer** (Babylon city silhouettes: walls/ziggurat/gardens/palace + river waves) — `MapBackground.jsx` renders any `map.decor` array of `{ d, fill?, stroke?, sw?, opacity? }` paths after the lands (backward-compatible; generated maps simply don't have it), plus `kind: "deco"` emoji labels.

> **但以理 / 出埃及記的完整遊戲設計**（六關闖關表、RPG 道具表、開發順序）live in the `bible-journey-planner` skill's `references/` (但以理-設計.md / 出埃及記-設計.md); the RPG item vocabulary and per-book item tables live in `bible-rpg-items`. Current state: 旅程骨架 done (stations/quizzes/decks/titles + challenge stations reusing Jonah levels); 待做 = card-flow minigames, RPG gifts layer, reflection finales — see roadmap.md item 0.

> **目前進度（已完成 vs 真正待做）見 `roadmap.md`。** Embedded mini-games live in `src/minigames/` (see [[embed-minigame]]); challenge stations use `type: "challenge"` + `minigame` + optional `mustStop` (see [[add-challenge-station]]).

## Embedded mini-games (`src/minigames/`)

A station can trigger a real-time 2D mini-game by carrying a `minigame: { level, mode?, winPoints, label?, how?, hudLabels?, cast? }` field (`cast: false` on Paul's sea-challenge stations skips the storm level's「拋約拿入海」ending — that beat belongs only to the Jonah story; the engine option is `opts.stormCast`) (decoupled from `type`, like quiz/card; the dedicated tile uses `type: "challenge"`). `src/minigames/jonah/` is a **copy of the `約拿闖關` (Jonah) arcade engine** (vanilla Canvas, zero deps) driven in **embed mode**: `new Game(canvas, { ui, embed: true, level, mode, hudLabels, onComplete })` — `embed` skips the title screen + suppresses fullscreen/orientation takeover, and the level-finish paths call `onComplete({ won, score, level })` instead of the Jonah overlay. `Game.destroy()` stops the loop, removes listeners (`Input.detach()`), and stops its audio.

**In-repo card-flow minigames (2026-06-12, `src/minigames/cards/`):** a station can instead carry `minigame: { cards: "<key>", winPoints, label? }` — `MiniGameModal` then renders the pure-React `CardGame.jsx` player with the spec from `specs.js` (goldImage / wallWriting / tenPlagues / tenCommandments / danielFinale / exodusFinale) and never boots the Canvas engine. These live **outside the Jonah fork**, so `sync:jonah` never touches them; they cannot lose (wrong answers gently retry; order-steps shake), and finish via the same `onComplete({ won:true, score })` path. To add one, write a spec in `specs.js` (step kinds: `info` / `question` / `order`) and point a station's `minigame.cards` at it. Their copy goes through the same pastoral review gate as quizzes (`scripts/export-quiz-review.mjs --cards=src/minigames/cards/specs.js`).

**Card-flow upgrades (2026-06-14, `feat/cornelius-card`):** the card player gained three orthogonal, opt-in layers — see skill [[card-canvas-scenes]] for the full pattern:
- **L6-style hand-drawn Canvas scenes** (`scenes.js` + `CardScene.jsx`): a `drawBackdrop` generic animated background (gradient/glow/motes) behind *every* card, plus per-beat bespoke `drawer(ctx,w,h,t)` functions (the `person()` helper + props, `rays`/`flame`/`dove`/etc) that replace emoji. Scenes are grouped per book (`CORNELIUS`/`ELIJAH`/`SAUL`/`DANIEL`/`EXODUS`), registered in `CardScene`'s `DRAWERS`, and selected by a step's `scene.canvas` key (or a spec-level `canvas` default with `SceneArea`'s `fallback`). `CardScene` runs a rAF loop, re-measures via `ResizeObserver`/per-frame `size()` (else the canvas gets squashed), and respects `prefers-reduced-motion`. Zero art files, offline. **Because there are no art assets, always screenshot-verify each beat with Playwright at `?demo=<key>` after editing** (`.jsx` can't be `node --check`ed). The nine card games (5 commandos + daniel/exodus) are all L6 as of 2026-06-14; blueprint = Jonah's `_drawGourd`.
- **Opt-in 3-lives** (`spec.lives = 3`): wrong answers cost a life, 0 → a 💔 lose screen with restart; hearts show in the header. Specs **without** `lives` keep the gentle "cannot lose" behavior (daniel/exodus reflection finales stay gentle).
- **Per-game background music** (`cardAudio.js`, zero-file Web Audio): `spec.music` picks a mood track (`warm`/`tender`/`bright`/`majestic`/`solemn`); `CardGame` plays on mount, stops on unmount, with a 🎵/🔇 mute toggle (localStorage-remembered). Audio only sounds after a user gesture (browser rule) — the card container resumes it on `pointerdown`.

**In-repo projectile engine (2026-06-13, `src/minigames/sling/`, branch `feat/david-sling`):** a real-time aim+power throwing minigame (David's sling vs Goliath). A station carries `minigame: { engine: 'sling', winPoints, label }`; `MiniGameModal` boots `SlingGame` on the canvas (same `boot()`/`destroy()`/`onComplete` contract as the Jonah engine). **Outside the Jonah fork** (`sync:jonah` never touches it), self-contained: `config.js` (tunables), `projectile.js` (pure physics — shared by the game loop AND `scripts/sling-physics-test.mjs`), `game.js` (fixed-timestep loop + state machine intro→aim→flying→win/miss→lose), `renderer.js` (humanoid figures + scripture beats), `input.js`, `audio.js`, `content.js`. Difficulty = tolerance-window(sec) = hit-band(deg) / sweep(deg·s⁻¹); fair floor ≈ 0.10s — tune by shrinking the hit zone in `config.js`, not by speeding the sweep. Dev preview: `?demo=sling` (mounts `SlingDemo`). The reusable core is meant for **all future throwing levels** (spear/bow/Gideon/Jericho); blueprint = the `projectile-minigame` skill. **Not yet wired to a journey** — a future David journey plugs it in as a challenge station.

**In-repo Noah engines (2026-06-15, `feat/noah-minigames`, PR #15):** two self-contained Canvas minigames outside the Jonah fork (`sync:jonah` never touches them), same embed contract (`new Game(canvas,{embed,onComplete,...})`/`boot()`/`destroy()`). A station carries `minigame: { engine: 'arkpairs' | 'arkbuild', winPoints, ... }`; dev preview `?demo=arkpairs` / `?demo=arkbuild`.
- **`src/minigames/arkpairs/` — 一公一母進方舟**: two phases. ① **memory-match** (flip cards, same species ♂+♀ — female wears 🎀 — pair up into ark rooms); ② **constraint-arrangement puzzle** (tap a room, tap another = swap; predators 獅/虎/熊/狐 may only neighbor a `safe` animal = elephant or a bird; all-peaceful wins, Isa 11:6). Each animal has `role: predator|safe|prey`; `composeRound(pairs)` **guarantees solvability** (always includes a lion + enough `safe` buffer + dog/rabbit). `opts.pairs` (6/8/10/12, default 8). Room geometry + neighbor relation are shared between renderer/game via `config.arkRoomRects()` / `roomNeighbors()` (don't duplicate the layout math — it drifts and mis-hits). Cannot lose. Reusable pattern = skill [[match-pairs-minigame]].
- **`src/minigames/arkbuild/` — 一步一步蓋方舟**: **operate Noah** — he walks the current plank row with a hammer; tap/space when he's over the glowing nail-point ✛ to nail the plank (within `AIM.tol`); a miss wobbles and retries. Per-row nail positions differ (`config.STUDS`); **difficulty ramps with progress** — `game.aimSpeed()`/`aimTol()` interpolate `AIM.speed→speedMax` and `AIM.tol→tolMin` by `placedCount/total` (fair floor ≈0.10s window; renderer reads `game.aimTol()` so the ✛ tolerance brackets match). **Noah has a face** (eyes/eyebrows/mouth that react: smile when aligned, grimace on miss, squint mid-swing) and a **beard that grows longer and fades black→white as the ark rises** (driven by `game.progress`) — visually "he built it for many years". Three mockers stand on dry land jeering (rotating taunts, atmosphere+teaching, no scoring effect); the flood hasn't come so the ground is dry, not sea. Five sections (hull/3-deck walls/door/window/roof) each gated by a scripture beat; closes on Heb 11:7. Cannot lose.

**All six Jonah levels are embeddable (2026-06-10), in two classes:**
- **Levels 1/2/4 (pure-Canvas)** — parkour / storm / desert-run: pass the no-op `NullUI` Proxy as `ui`.
- **Levels 3/5/6 (card-flow)** — fish-belly prayer / Nineveh preaching / gourd reflection: their card steps call `ui.showFishIntro/Question/Reveal/TryAgain`, `showPreach*`, `showGourd*`. `MiniGameModal.jsx`'s `makeEmbedUI(setCard)` implements那組方法 as React cards over the canvas; card buttons dispatch back via `game.handleFishAction/handlePreachAction/handleGourdAction(act, ds)`. These three levels cannot lose (`_finish(true)` on completion). The contract lives in the Jonah `CLAUDE.md` (item 4).

`MiniGameModal.jsx` mounts the canvas (boot is deferred to a "開始挑戰" click for the audio-unlock gesture), passes `hudLabels` (level 1 defaults to generic 起點/終點 so the parkour engine fits any journey; other levels fall back to the engine's per-level defaults), and on completion calls `resolveStation({ minigameWon, minigameScore })` — the engine scores it in `resolve` (pure, result injected like a quiz answer).

**Re-syncing the Jonah copy is now one command: `npm run sync:jonah`** (`scripts/sync-jonah-engine.mjs`). The upstream Jonah engine is **embed-aware and backward-compatible** — `ui` is injected (so `game.js` does NOT `import './ui.js'`), and `new Game(canvas, { embed, level, mode, hudLabels, onComplete })` drives the embed path. Because of that contract the sync is a **safe verbatim copy**, not a re-patch: the script follows `import` from `game.js`, copies the whole module graph into `src/minigames/jonah/`, and hard-excludes the DOM shell (`ui.js`/`main.js`). It auto-includes any new upstream module (e.g. a future level), errors loudly if the embed contract breaks (engine re-imports `ui.js`) or an import dangles, and reports orphans. Point it at a non-default upstream with `--from=<jonah/src>` or `JONAH_SRC=…`; preview with `--check`. After syncing, run `npm run build` + `npm run test:selfplay`. Add more challenge stations by giving a station a `minigame` field (+ a `gen-map` coordinate if it's a new tile) — see the `add-challenge-station` skill. If upstream adds a new card-flow level, also extend `makeEmbedUI` in `MiniGameModal.jsx` with its `showXxx*` methods.

## Machine gotcha: silent `vite build` death on the agape250 PC

On the agape250 machine (Node 24), `npm run build` can die **silently** right after「✓ 67 modules transformed」(the write/`emptyOutDir` phase), leaving `dist/` stale — exit code is unreliable, so **check the `dist/index.html` timestamp** to know whether a build really happened. Verified fix (2026-06-12): **delete `dist/` manually first** (`Remove-Item dist -Recurse -Force`), then run `npm run build` — with no old dist to recursively remove, the build completes. The HFPC machine does not have this problem; Netlify cloud builds (Node 20) are unaffected.

## Conventions

- Comments and identifiers in this codebase are written in Chinese; match that style when editing existing files.
- `vite.config.js` sets `base: './'` (relative paths) so the build deploys to any subdirectory; PWA is configured to precache all static assets for offline play. Keep the relative base.

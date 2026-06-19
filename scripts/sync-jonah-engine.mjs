// ===========================================================================
// sync-jonah-engine — 一鍵把「約拿闖關」引擎同步進保羅大富翁的嵌入小遊戲
// ---------------------------------------------------------------------------
// 約拿闖關(hfpc-jonah-game)是即時 2D Canvas 小遊戲;保羅大富翁把它的「跑酷/暴
// 風雨」當棋盤挑戰站嵌入。src/minigames/jonah/ 是約拿引擎的一份 copy。約拿那邊
// 改完(修手感、加關卡…),在保羅這邊跑這支腳本,就把最新引擎同步過來。
//
// 為什麼可以「純複製」而不必手動重套 embed 改動:
//   約拿引擎已做成「嵌入感知」且「向後相容」——
//     • ui 由外部注入(單機 main.js 傳 new UI();嵌入這裡的 MiniGameModal 傳 NullUI),
//       所以 game.js 不再 import './ui.js'。
//     • new Game(canvas, { embed:true, level, mode, hudLabels, onComplete }) 走嵌入分支。
//   這份契約記在約拿的 CLAUDE.md;只要約拿端守住它,這支腳本就只是安全的逐檔複製。
//
// 做法:從 game.js 出發,沿著 import './x.js' 把「會被用到的本地模組」全找出來
//       (自動含括未來新增的關卡模組),逐一複製到 src/minigames/jonah/。
//       一律排除 DOM 外殼 ui.js / main.js / index.html。
//
// 用法:
//   node scripts/sync-jonah-engine.mjs                 (自動尋找約拿 src)
//   node scripts/sync-jonah-engine.mjs --from=<約拿的 src 路徑>
//   JONAH_SRC=<約拿的 src 路徑> node scripts/sync-jonah-engine.mjs
//   node scripts/sync-jonah-engine.mjs --check         (只報告會變動什麼,不寫檔)
//
// ⚠️ 這台 Windows + Node 24:用逐檔 copyFileSync,不用遞迴 cpSync/rmSync(會無聲被殺)。
// ===========================================================================
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..')
const DEST_DIR = path.join(PROJECT_ROOT, 'src', 'minigames', 'jonah')

// 從這個檔開始追 import(保羅的 MiniGameModal 就是 import 它)。
const ENTRY = 'game.js'
// 永遠不要複製過來的「app 外殼」(嵌入用 React + NullUI 取代)。
const NEVER_COPY = new Set(['ui.js', 'main.js'])

const args = process.argv.slice(2)
const CHECK_ONLY = args.includes('--check') || args.includes('--dry-run')
const fromArg = args.find((a) => a.startsWith('--from='))

// --- 找出約拿的 src 目錄 -------------------------------------------------
function resolveJonahSrc() {
  const candidates = []
  if (fromArg) candidates.push(fromArg.slice('--from='.length))
  if (process.env.JONAH_SRC) candidates.push(process.env.JONAH_SRC)
  // 預設:0609 底下的姊妹專案(本機常見擺法)
  candidates.push(path.resolve(PROJECT_ROOT, '..', '..', '聖經遊戲', '聖經遊戲', 'src'))
  candidates.push(path.resolve(PROJECT_ROOT, '..', '..', '..', '聖經遊戲', '聖經遊戲', 'src'))
  for (const c of candidates) {
    if (!c) continue
    const abs = path.resolve(c)
    if (existsSync(path.join(abs, ENTRY))) return abs
  }
  console.error('✗ 找不到約拿引擎的 src 目錄(裡面要有 game.js)。試過:')
  for (const c of candidates) if (c) console.error('    ' + path.resolve(c))
  console.error('  請用 --from=<約拿的 src 路徑> 或設環境變數 JONAH_SRC 指定。')
  process.exit(1)
}

// --- 追 import:從 entry 出發,收集所有本地 './x.js' 模組 ------------------
const LOCAL_IMPORT = /\bfrom\s+['"]\.\/([\w.-]+\.js)['"]/g
function collectModules(srcDir) {
  const seen = new Set()
  const queue = [ENTRY]
  while (queue.length) {
    const file = queue.shift()
    if (seen.has(file)) continue
    seen.add(file)
    const full = path.join(srcDir, file)
    if (!existsSync(full)) {
      console.error(`✗ ${file} 被 import 卻不存在於約拿 src:${full}`)
      process.exit(1)
    }
    const code = readFileSync(full, 'utf8')
    for (const m of code.matchAll(LOCAL_IMPORT)) {
      const dep = m[1]
      if (NEVER_COPY.has(dep)) {
        // 嵌入契約:引擎不可 import ui.js(ui 必須由外部注入)。
        console.error(`✗ 嵌入契約被破壞:${file} import 了 ${dep}。`)
        console.error('  約拿引擎必須「注入 ui」而非「import ui.js」(見約拿 CLAUDE.md 的嵌入契約)。')
        console.error('  請約拿端改回由 main.js 注入 new UI(),這支同步腳本才能安全純複製。')
        process.exit(1)
      }
      if (!seen.has(dep)) queue.push(dep)
    }
  }
  return [...seen].sort()
}

// --- 主流程 --------------------------------------------------------------
const JONAH_SRC = resolveJonahSrc()
console.log(`約拿引擎 src:${JONAH_SRC}`)
console.log(`同步目標   :${DEST_DIR}`)
console.log(CHECK_ONLY ? '模式:--check(只報告,不寫檔)\n' : '')

const modules = collectModules(JONAH_SRC)

let changed = 0
let same = 0
const written = []
for (const file of modules) {
  const src = path.join(JONAH_SRC, file)
  const dst = path.join(DEST_DIR, file)
  const srcBuf = readFileSync(src)
  const dstExists = existsSync(dst)
  const identical = dstExists && Buffer.compare(srcBuf, readFileSync(dst)) === 0
  if (identical) {
    same++
    continue
  }
  changed++
  const tag = dstExists ? '更新' : '新增'
  console.log(`  [${tag}] ${file}  (${srcBuf.length} bytes)`)
  if (!CHECK_ONLY) {
    writeFileSync(dst, srcBuf) // 逐檔寫,不用遞迴複製(避開 Node24 地雷)
    written.push(file)
  }
}

// --- 警告:嵌入資料夾裡有、但約拿已不再使用的「孤兒」檔 --------------------
const keep = new Set(modules)
const orphans = []
if (existsSync(DEST_DIR)) {
  for (const f of readdirSync(DEST_DIR)) {
    if (!f.endsWith('.js')) continue
    if (statSync(path.join(DEST_DIR, f)).isDirectory()) continue
    if (!keep.has(f)) orphans.push(f)
  }
}

console.log('')
console.log(`同步模組(${modules.length}):${modules.join(', ')}`)
console.log(`變動 ${changed} 檔、相同 ${same} 檔${CHECK_ONLY ? '(未寫入)' : ''}。`)
if (orphans.length) {
  console.log(`⚠ 孤兒檔(約拿已不 import,可考慮刪掉):${orphans.join(', ')}`)
}
if (!CHECK_ONLY && changed > 0) {
  console.log('\n下一步建議:')
  console.log('  npm run build           # 確認嵌入引擎接得起來、能打包')
  console.log('  npm run test:selfplay   # 確認桌遊流程(小遊戲那格用沒玩贏結算)仍會正常結束')
}
console.log('✓ 完成。')

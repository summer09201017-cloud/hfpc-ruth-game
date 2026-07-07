// 路得記 — 煙霧測試(零相依、不需瀏覽器;改自跨專案 skill「game-smoke-test」的可攜模板)
//
// 這支補的是 validate(內容)與 selfplay(規則)之外的三個缺口:
//   1. 原始碼語法:src/ 下所有 .js/.mjs 都能被 node --check 解析(.jsx 交給 build)。
//   2. 嵌入契約:src/minigames/gleaning/ 是路得的簽名關引擎(2026-07-07 起 jonah 死碼已清,
//      契約檢查改守 gleaning)——game.js 絕不可自己 import './ui.js'(ui/嵌入由外部注入)。
//   3. PWA 離線就緒(--offline):build 後檢查 dist/ 真的能離線跑——無外部資產、
//      manifest/圖示齊備、Workbox SW 的預快取清單涵蓋 app shell 且每個檔都存在。
//
// 用法: npm test                 (= validate + selfplay + 本檔快速段)
//       npm run test:offline     (本檔 + --offline:再加 build 與離線就緒)
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join, extname } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const CONFIG = {
  srcDir: 'src',
  syntaxExts: ['.js', '.mjs'], // .jsx 無法 node --check,由 vite build / CI 把關
  // 嵌入契約(見 CLAUDE.md「Embedded mini-games」與約拿 CLAUDE.md「嵌入契約」)
  embedEngine: 'src/minigames/gleaning/game.js',
  embedForbid: [/from\s+['"]\.\/ui\.js['"]/],
  embedMustInclude: ['onComplete', 'destroy', 'this.embed'],
  // PWA 離線(--offline)
  buildCmd: 'npm run build',
  siteDir: 'dist',
  entryHtml: 'index.html',
  swFile: 'sw.js',
  manifestFile: 'manifest.webmanifest',
}

const WANT_OFFLINE = process.argv.includes('--offline')
let pass = 0
let fail = 0
const fails = []
const warns = []
const ok = (m) => { pass++; console.log(`  \x1b[32m✓\x1b[0m ${m}`) }
const bad = (m) => { fail++; fails.push(m); console.log(`  \x1b[31m✗\x1b[0m ${m}`) }
const warn = (m) => { warns.push(m); console.log(`  \x1b[33m!\x1b[0m ${m}`) }
const check = (cond, m) => { cond ? ok(m) : bad(m); return cond }
const section = (t) => console.log(`\n\x1b[1m${t}\x1b[0m`)
const isStr = (v) => typeof v === 'string' && v.trim().length > 0

// 單檔 readdir 走訪(不用遞迴 fs API——照 arcade-game-kit 的 Node 24 慣例)
function walk(dir, out = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name)
    if (ent.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

// ── 1. 原始碼語法 ────────────────────────────────────────────────────
function checkSyntax() {
  section('1. 原始碼語法 (node --check)')
  const files = walk(join(root, CONFIG.srcDir)).filter((f) => CONFIG.syntaxExts.includes(extname(f)))
  if (!check(files.length > 0, `找到 ${files.length} 個 .js/.mjs 原始檔`)) return
  for (const f of files) {
    try {
      execSync(`node --check "${f}"`, { stdio: 'pipe' })
      pass++ // 逐檔成功不洗版,只計數
    } catch (e) {
      bad(`語法錯誤:${f.slice(root.length + 1)} — ${String(e.stderr || e.message).split('\n')[0]}`)
    }
  }
  ok(`全部 ${files.length} 檔解析 OK`)
}

// ── 2. 嵌入契約(守住 gleaning 簽名關)──────────────────────────────────────
function checkEmbedContract() {
  section('2. 嵌入契約 (src/minigames/gleaning/game.js)')
  let src
  try {
    src = readFileSync(join(root, CONFIG.embedEngine), 'utf8')
  } catch (e) {
    return bad(`讀不到 ${CONFIG.embedEngine}:${e.message}`)
  }
  for (const re of CONFIG.embedForbid)
    check(!re.test(src), `game.js 未自行 import ui.js(ui 必須由外部注入)`)
  for (const tok of CONFIG.embedMustInclude)
    check(src.includes(tok), `包含嵌入關鍵字「${tok}」`)
  // 複製進來的引擎模組 import 不可懸空(防 sync 漏檔)
  const dir = join(root, 'src/minigames/gleaning')
  let dangling = 0
  for (const f of walk(dir).filter((p) => extname(p) === '.js')) {
    const body = readFileSync(f, 'utf8')
    for (const m of body.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const target = join(dirname(f), m[1])
      if (!existsSync(target) && !existsSync(target + '.js')) {
        bad(`懸空 import:${f.slice(root.length + 1)} → ${m[1]}`)
        dangling++
      }
    }
  }
  if (!dangling) ok('嵌入引擎模組 import 全部接得起來(無懸空)')
}

// ── 3. PWA 離線就緒(--offline;Workbox / vite-plugin-pwa 版)──────────
function checkOffline() {
  section('3. PWA 離線就緒(build → 檢查 dist/)')
  try {
    console.log(`  · 執行 ${CONFIG.buildCmd} …`)
    execSync(CONFIG.buildCmd, { cwd: root, stdio: 'pipe' })
    ok('build 成功')
  } catch (e) {
    return bad(`build 失敗:${String(e.stderr || e.message).split('\n')[0]}`)
  }
  const site = join(root, CONFIG.siteDir)
  if (!check(existsSync(site), `產生了 ${CONFIG.siteDir}/`)) return

  const allFiles = walk(site).map((f) => f.slice(site.length + 1).replace(/\\/g, '/'))
  // base:'./' 的 vite 輸出資產是 ./xxx 相對路徑;一律正規化再比對
  const norm = (p) => p.replace(/^\.?\//, '')
  const inSite = (p) => allFiles.includes(norm(p) === '' ? CONFIG.entryHtml : norm(p))

  check(inSite(CONFIG.entryHtml), `${CONFIG.entryHtml} 已輸出`)

  const html = readFileSync(join(site, CONFIG.entryHtml), 'utf8')
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1])
  const external = refs.filter((r) => /^https?:\/\//.test(r))
  check(external.length === 0, `index.html 無外部資產參照(離線安全)${external.length ? ':' + external.join(', ') : ''}`)
  for (const r of refs.filter((r) => r.startsWith('./') || r.startsWith('/')))
    check(inSite(r), `index.html 參照存在:${r}`)

  const cssRel = refs.find((r) => r.endsWith('.css'))
  if (cssRel && inSite(cssRel)) {
    const css = readFileSync(join(site, norm(cssRel)), 'utf8')
    check(!/@import|https?:\/\//.test(css), `${cssRel} 無外部字型/@import(離線安全)`)
  }

  // manifest 有效 + 圖示齊備
  if (check(inSite(CONFIG.manifestFile), `${CONFIG.manifestFile} 已輸出`)) {
    try {
      const man = JSON.parse(readFileSync(join(site, CONFIG.manifestFile), 'utf8'))
      check(isStr(man.name) && isStr(man.display), 'manifest 有 name/display')
      check(man.orientation === 'landscape', `manifest orientation=landscape(手機橫式,實際:${man.orientation ?? '未設'})`)
      check(Array.isArray(man.icons) && man.icons.length > 0, `manifest 有 icons(${man.icons?.length ?? 0})`)
      for (const ic of man.icons || []) check(inSite(ic.src), `圖示存在:${ic.src}`)
    } catch (e) {
      bad(`manifest 不是合法 JSON:${e.message}`)
    }
  }

  // Workbox SW:預快取清單涵蓋 app shell,且每個 url 都真的在 dist/
  if (check(inSite(CONFIG.swFile), `${CONFIG.swFile} 已輸出(Workbox generateSW)`)) {
    const sw = readFileSync(join(site, CONFIG.swFile), 'utf8')
    const urls = [...sw.matchAll(/\burl["']?\s*:\s*["']([^"']+)["']/g)]
      .map((m) => m[1])
      .filter((u) => !/^https?:\/\//.test(u))
    if (check(urls.length > 0, `SW 預快取清單有 ${urls.length} 筆`)) {
      let missing = 0
      for (const u of urls) {
        if (!inSite(u.split('?')[0])) {
          bad(`預快取檔不存在:${u}`)
          missing++
        }
      }
      if (!missing) ok('預快取清單的檔案全部存在')
      check(urls.some((u) => norm(u).startsWith('index.html')), '入口 index.html 已預快取')
      const entryJs = refs.find((r) => r.endsWith('.js'))
      if (entryJs) check(urls.some((u) => norm(u) === norm(entryJs)), `入口 JS 已預快取:${entryJs}`)
      const entryCss = refs.find((r) => r.endsWith('.css'))
      if (entryCss) check(urls.some((u) => norm(u) === norm(entryCss)), `入口 CSS 已預快取:${entryCss}`)
    }
  } else {
    warn('沒有 sw.js——安裝後將無法離線執行')
  }
}

// ── 跑 ────────────────────────────────────────────────────────────────
console.log('\x1b[1m保羅大富翁 · 煙霧測試\x1b[0m' + (WANT_OFFLINE ? '(含離線就緒)' : ''))
checkSyntax()
checkEmbedContract()
if (WANT_OFFLINE) checkOffline()
else console.log('\n\x1b[2m(略過 PWA 離線檢查;npm run test:offline 可一併檢查 build + sw + manifest)\x1b[0m')

section('結果')
console.log(`  通過 ${pass}　失敗 ${fail}　提醒 ${warns.length}`)
if (fail > 0) {
  console.log('\n\x1b[31m有失敗項目:\x1b[0m')
  fails.forEach((f) => console.log('  · ' + f))
  process.exit(1)
}
console.log('\n\x1b[32m全部通過 ✓\x1b[0m')

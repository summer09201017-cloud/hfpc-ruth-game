// 盼望·以利亞重得力(?demo=elijah-action)的 Playwright 截圖驗收 + 零 JS 錯誤檢查。
// roadmap 規定:無美術檔的 Canvas 關一律截圖驗收。用法:
//   1) 另開一個終端機跑  npm run dev   (vite,預設 :5173)
//   2) node scripts/elijah-shots.mjs   (或 URL=http://localhost:4173/?demo=elijah-action node scripts/...)
// 截四幕:intro(React 提示卡)/ canvas 開場經文 / 收集前進 / 癱坐 / 何烈山過關。
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const URL = process.env.URL || 'http://localhost:5173/?demo=elijah-action'
const OUT = process.env.OUT || join(tmpdir(), 'elijah-shots')
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

const shot = (name) => page.screenshot({ path: join(OUT, name) })

await page.goto(URL, { waitUntil: 'domcontentloaded' })
await page.getByText('起來吃吧').waitFor({ timeout: 15000 })
await shot('1-intro-react.png')

// 啟動引擎(手勢中 boot)
await page.getByRole('button', { name: /起來吃吧/ }).click()
await page.waitForTimeout(500)
await shot('2-intro-canvas.png') // canvas 上的開場經文(王上 19:4)

// 點 canvas 開始前進
const canvas = page.locator('canvas')
await canvas.click()
await page.waitForTimeout(1600)
await shot('3-playing.png') // 曠野收集中

// 強制癱坐(體力歸零的溫柔停頓),用開發掛勾
await page.evaluate(() => window.__elijah && window.__elijah._faint())
await page.waitForTimeout(250)
await shot('4-faint.png')

// 強制顯示過關畫面(到何烈山),用開發掛勾
await page.evaluate(() => window.__elijah && window.__elijah.win())
await page.waitForTimeout(250)
await shot('5-win.png')

await browser.close()
console.log('截圖輸出到:', OUT)
console.log('JS 錯誤:', errors.length ? errors : '無 ✓')
if (errors.length) process.exit(1)

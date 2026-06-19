// 大衛甩石「實機煙霧」測試：開 ?demo=sling，狂點放手，確認：能命中得勝、
// onComplete 有觸發、零 JS 錯誤、canvas 有在畫（尺寸正常）。需先 npm run preview。
// 執行：node scripts/sling-smoke-check.mjs
import { chromium } from 'playwright'

const URL = (process.env.URL || 'http://localhost:4173/') + '?demo=sling'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 960, height: 600 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

await page.goto(URL, { waitUntil: 'networkidle' })
await page.getByText('開始甩石').click()
await page.waitForTimeout(300)

const canvas = page.locator('canvas')
const box = await canvas.boundingBox()
const canvasOK = box && box.width > 100 && box.height > 100

// 在「命中帶內(實測 50.25–54.75°，取安全內側 50.5–54.5°)」放手 → 必中，走完整 win 路徑(_win→_finish(won))。
// 讀 dev 掛勾 window.__sling 的即時 aimDeg/state，只在帶內、且在 aim 階段才點擊放手。
let resultText = ''
let firedInBand = false
for (let i = 0; i < 400; i++) {
  const st = await page.evaluate(() => {
    const g = window.__sling
    return g ? { state: g.state, aimDeg: g.aimDeg } : null
  })
  if (st && st.state === 'aim') {
    if (st.aimDeg >= 50.5 && st.aimDeg <= 54.5) { // 只在命中帶內放手
      await canvas.click({ position: { x: 480, y: 300 } })
      firedInBand = true
    }
  } else if (st && (st.state === 'intro' || st.state === 'miss' || st.state === 'win' || st.state === 'lose')) {
    await canvas.click({ position: { x: 480, y: 300 } }) // 開場/落空/結算面板都點一下推進 → 最終觸發 onComplete
  }
  await page.waitForTimeout(30)
  const header = await page.locator('div').first().innerText().catch(() => '')
  if (header.includes('結果')) { resultText = header; break }
}

await browser.close()

console.log(`canvas 尺寸正常：${canvasOK ? '✅' : '❌'}`)
console.log(`結果列：${resultText || '(未出現——可能沒在點擊次數內結束)'}`)
const won = /命中得勝/.test(resultText)
let ok = canvasOK && errors.length === 0 && won
console.log(`在命中帶內放手 → 命中得勝（走完 win 路徑）：${won ? '✅' : '❌'}`)
if (errors.length) console.error('❌ 瀏覽器錯誤：', errors.slice(0, 6))
if (!/結果/.test(resultText)) { console.error('❌ onComplete 沒觸發'); ok = false }
if (!won) { console.error('❌ 在命中帶內放手卻沒得勝——win 路徑或物理/繪製座標對不上'); ok = false }
if (!ok) process.exit(1)
console.log('✅ 大衛甩石實機煙霧通過（命中帶放手必中、走完 win、零錯誤）')

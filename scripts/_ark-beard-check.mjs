// 臨時：截「開頭(黑短鬍)」與「後段(白長鬍)」對比 + 確認漸進難度蓋得完、無錯誤。
import { chromium } from 'playwright'
const BASE = process.env.URL || 'http://localhost:4189'
const browser = await chromium.launch()
const errors = []
const page = await browser.newPage({ viewport: { width: 1100, height: 680 } })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()) })
await page.goto(`${BASE}/?demo=arkbuild`, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /開始動工/ }).click()
await page.waitForTimeout(300)
const fire = async () => { const c = await page.evaluate(() => { const r = window.__arkbuild.canvas.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }); await page.mouse.click(c.x, c.y) }
await fire(); await page.waitForTimeout(120); await fire(); await page.waitForTimeout(200) // 過 intro/sectionIntro
await page.waitForFunction(() => window.__arkbuild?.state === 'building', { timeout: 4000 }).catch(() => {})
// 自動瞄準命中放板，途中在 progress~0.15 與 ~0.85 各截一張，順便驗難度蓋得完
const result = await page.evaluate(async () => {
  const g = window.__arkbuild
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const fireK = () => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }))
  let guard = 0, hits = 0, misses = 0, shotEarly = false, shotLate = false
  window.__shot = null
  while (!g.finished && guard < 9000) {
    guard++
    if (['intro', 'sectionIntro', 'won'].includes(g.state)) { fireK(); await sleep(110); continue }
    if (g.state === 'building') {
      const p = g._nextPlank(); if (!p) { await sleep(20); continue }
      // 用「有效容差」的一半當瞄準窗，模擬玩家
      const tol = g.aimTol()
      if (g.progress > 0.1 && !shotEarly) { window.__shot = 'early'; shotEarly = true; await sleep(60) }
      if (g.progress > 0.8 && !shotLate) { window.__shot = 'late'; shotLate = true; await sleep(60) }
      if (Math.abs(g.noahX - p.targetX) <= tol * 0.5) {
        const before = g.placedCount; fireK()
        let w = 0; while (g.placedCount === before && g.state === 'building' && w < 30) { await sleep(14); w++ }
        if (g.placedCount > before) hits++; else misses++
      } else await sleep(12)
      continue
    }
    await sleep(20)
  }
  return { finished: g.finished, placed: g.placedCount, total: g.total, hits, misses }
})
await page.waitForTimeout(150)
await page.screenshot({ path: 'scripts/_beard-final.png' })
await browser.close()
console.log(`finished=${result.finished} placed=${result.placed}/${result.total} hits=${result.hits} misses=${result.misses}`)
if (errors.length) errors.forEach((e) => console.log('  ' + e))
const ok = result.finished && result.placed === result.total && errors.length === 0
console.log(ok ? '✅ 漸進難度仍蓋得完、過關、無錯誤。' : '❌ 有問題。')
process.exit(ok ? 0 : 1)

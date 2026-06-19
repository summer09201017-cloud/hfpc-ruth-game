// 臨時：放大截挪亞臉部——開頭(progress~0 黑短鬍) vs 後段(progress~0.85 白長鬍)。
import { chromium } from 'playwright'
const BASE = process.env.URL || 'http://localhost:4189'
const browser = await chromium.launch()

async function shot(label, targetProg) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 680 } })
  await page.goto(`${BASE}/?demo=arkbuild`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /開始動工/ }).click()
  await page.waitForTimeout(250)
  const fire = async () => { const c = await page.evaluate(() => { const r = window.__arkbuild.canvas.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }); await page.mouse.click(c.x, c.y) }
  await fire(); await page.waitForTimeout(110); await fire(); await page.waitForTimeout(180)
  // 直接設 placedCount 到目標進度（純視覺截圖用），凍結挪亞在畫面中央好截圖
  await page.evaluate((tp) => {
    const g = window.__arkbuild
    g.placedCount = Math.round(tp * g.total)
    g.noahDir = 0 // 不再移動，停在中間方便截
    const p = g._nextPlank()
    if (p) g.noahX = p.targetX
  }, targetProg)
  await page.waitForTimeout(120)
  // 算挪亞臉部在螢幕上的位置，clip 放大
  const clip = await page.evaluate(() => {
    const g = window.__arkbuild, p = g._nextPlank(), f = g.renderer.fit, r = g.canvas.getBoundingClientRect()
    const sx = r.left + f.ox + g.noahX * f.scale
    const sy = r.top + f.oy + (p.rowY - 30) * f.scale
    return { x: Math.max(0, sx - 70), y: Math.max(0, sy - 60), width: 140, height: 140 }
  })
  await page.screenshot({ path: `scripts/_beard-${label}.png`, clip })
  await page.close()
}
await shot('early', 0.0)
await shot('late', 0.85)
await browser.close()
console.log('✅ 截圖：scripts/_beard-early.png (黑短鬍) / scripts/_beard-late.png (白長鬍)')

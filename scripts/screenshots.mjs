import { chromium } from 'playwright'

const URL = process.env.URL || 'http://localhost:4173/'
const browser = await chromium.launch()

// ---- 投影 / PC 視角 ----
const pc = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await pc.goto(URL, { waitUntil: 'networkidle' })
await pc.getByText('開始旅程').waitFor()
await pc.screenshot({ path: 'shot-1-setup.png' })

await pc.getByRole('button', { name: '3 人' }).click()
await pc.getByRole('button', { name: /開始旅程/ }).click()
await pc.locator('.board').waitFor()

// 擲骰直到出現一個問答彈窗，截下來
let captured = false
for (let i = 0; i < 30 && !captured; i++) {
  if ((await pc.locator('.gameover').count()) > 0) break
  if ((await pc.locator('.modal').count()) > 0) {
    if ((await pc.locator('.quiz').count()) > 0 && (await pc.locator('.result').count()) === 0) {
      await pc.screenshot({ path: 'shot-3-quiz.png' })
      captured = true
      break
    }
    const hasResult = (await pc.locator('.result').count()) > 0
    if (hasResult) await pc.getByRole('button', { name: /結束回合/ }).click()
    else if ((await pc.locator('.quiz').count()) > 0) await pc.locator('.quiz__opt').first().click()
    else await pc.locator('.modal__foot button').click()
    await pc.waitForTimeout(300)
  } else {
    const dice = pc.locator('.dice__btn')
    if (await dice.isEnabled()) {
      await dice.click()
      await pc.locator('.modal, .gameover').first().waitFor({ timeout: 9000 })
    }
  }
}
// 關掉彈窗截一張純地圖（如果還開著就先結算）
if ((await pc.locator('.modal').count()) > 0) {
  if ((await pc.locator('.quiz').count()) > 0 && (await pc.locator('.result').count()) === 0)
    await pc.locator('.quiz__opt').first().click()
  await pc.waitForTimeout(300)
  if ((await pc.locator('.result').count()) > 0)
    await pc.getByRole('button', { name: /結束回合/ }).click().catch(() => {})
  await pc.waitForTimeout(400)
}
await pc.screenshot({ path: 'shot-2-board.png' })

// ---- 手機視角 ----
const phone = await browser.newPage({ viewport: { width: 390, height: 844 } })
await phone.goto(URL, { waitUntil: 'networkidle' })
await phone.getByText('開始旅程').waitFor()
await phone.getByRole('button', { name: /開始旅程/ }).click()
await phone.locator('.board').waitFor()
await phone.waitForTimeout(300)
await phone.screenshot({ path: 'shot-4-phone.png', fullPage: true })

await browser.close()
console.log('截圖完成：shot-1-setup.png / shot-2-board.png / shot-3-quiz.png / shot-4-phone.png')

// ===========================================================================
// 卡片流程闖關的瀏覽器實機測試
// ---------------------------------------------------------------------------
// 與 browser-playtest.mjs 同精神，但會「真的玩」卡片流程關（金像/牆字/十災/
// 十誡/終局反思）：選項用隨機點（答錯會出「再試一次」，關卡不會失敗，最終必過），
// 直到整條旅程 gameover。預設玩 但以理；用 JOURNEY 環境變數換旅程標題。
// 執行： node scripts/browser-playtest-cards.mjs   （需先啟動 preview server）
// ===========================================================================
import { chromium } from 'playwright'

const URL = process.env.URL || 'http://localhost:4173/'
const JOURNEY = process.env.JOURNEY || '但以理在巴比倫'
const errors = []

const browser = await chromium.launch()
const page = await browser.newPage()

page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`)
})

await page.goto(URL, { waitUntil: 'networkidle' })

// --- 開始畫面：選旅程 + 1 人 ---
await page.getByText('開始旅程').waitFor({ timeout: 10000 })
await page.getByText(JOURNEY, { exact: false }).first().click()
const onePlayer = page.getByRole('button', { name: '1 人' })
if ((await onePlayer.count()) > 0) await onePlayer.click()
await page.getByRole('button', { name: /開始旅程/ }).click()
await page.locator('.board').waitFor({ timeout: 5000 })

let cardSteps = 0
let minigames = 0
const MAX_STEPS = 400

for (let step = 0; step < MAX_STEPS; step++) {
  if ((await page.locator('.gameover').count()) > 0) break

  // 闖關彈窗（Canvas 關或卡片關都從「開始挑戰」進入）
  if ((await page.locator('.minigame').count()) > 0) {
    const startBtn = page.getByRole('button', { name: /開始挑戰/ })
    if ((await startBtn.count()) > 0) {
      await startBtn.click()
      minigames++
    }
    // 卡片關：有 .mgcard 就一直點（按鈕優先；選項隨機點，答錯會回到題目）
    const card = page.locator('.minigame .mgcard')
    if ((await card.count()) > 0) {
      const btn = card.locator('.mgcard__btn')
      const choices = card.locator('.mgcard__choice')
      if ((await btn.count()) > 0) {
        await btn.first().click()
        cardSteps++
      } else if ((await choices.count()) > 0) {
        const n = await choices.count()
        await choices.nth(Math.floor(Math.random() * n)).click()
        cardSteps++
      }
      await page.waitForTimeout(120)
      continue
    }
    // Canvas 關：等引擎自己結束（撐過/翻船都會收場）
    await page
      .waitForFunction(
        () =>
          document.querySelector('.mgcard') ||
          document.querySelector('.result') ||
          document.querySelector('.gameover'),
        { timeout: 45000 },
      )
      .catch(() => {})
    continue
  }

  const modalOpen = (await page.locator('.modal').count()) > 0
  if (modalOpen) {
    if ((await page.locator('.result').count()) > 0) {
      await page.getByRole('button', { name: /結束回合|看最終結果/ }).first().click()
      await page
        .waitForFunction(
          () => document.querySelector('.modal') === null || document.querySelector('.gameover'),
          { timeout: 5000 },
        )
        .catch(() => {})
    } else if ((await page.locator('.quiz__opt').count()) > 0) {
      await page.locator('.quiz__opt').first().click()
      await page.locator('.result').waitFor({ timeout: 5000 })
    } else if ((await page.locator('.carddraw').count()) > 0) {
      await page.locator('.pcard').first().click()
      await page.locator('.result').waitFor({ timeout: 5000 })
    } else {
      await page.locator('.modal__foot button').click()
      await page.locator('.result').waitFor({ timeout: 5000 }).catch(() => {})
    }
    continue
  }

  const dice = page.locator('.dice__btn')
  if ((await dice.count()) > 0 && (await dice.isEnabled())) {
    await dice.click()
    await page
      .waitForFunction(
        () => document.querySelector('.modal') || document.querySelector('.minigame') || document.querySelector('.gameover'),
        { timeout: 15000 },
      )
      .catch(() => {})
  } else {
    await page.waitForTimeout(300)
  }
}

const done = (await page.locator('.gameover').count()) > 0
await browser.close()

console.log(`旅程：${JOURNEY}`)
console.log(`闖關站進入 ${minigames} 次、卡片互動 ${cardSteps} 步、走完整場：${done ? '✅' : '❌（沒在步數上限內結束）'}`)
if (errors.length) {
  console.error(`❌ 瀏覽器錯誤 ${errors.length} 筆：`)
  for (const e of errors.slice(0, 10)) console.error('  ' + e)
  process.exit(1)
}
if (!done) process.exit(1)
console.log('✅ 零 JS 錯誤')

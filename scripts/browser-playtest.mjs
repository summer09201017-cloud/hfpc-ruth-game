// ===========================================================================
// 瀏覽器實機測試 (browser play-test)
// ---------------------------------------------------------------------------
// 用 Playwright 打開「真正算繪出來的遊戲」，自動把一整場玩完，並監聽：
//   - pageerror（未捕捉的例外）
//   - console.error
//   - 卡死（點了擲骰卻一直沒出現格子彈窗）
// 這一層能抓到純引擎自我對戰看不到的「動畫 / 計時 / 算繪」類 bug。
// 執行： node scripts/browser-playtest.mjs   （需先啟動 preview server）
// ===========================================================================
import { chromium } from 'playwright'

const URL = process.env.URL || 'http://localhost:4173/'
const errors = []

const browser = await chromium.launch()
const page = await browser.newPage()

page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`)
})

await page.goto(URL, { waitUntil: 'networkidle' })

// --- 開始畫面 ---
await page.getByText('開始旅程').waitFor({ timeout: 10000 })
await page.getByRole('button', { name: '2 人' }).click()
await page.getByRole('button', { name: /開始旅程/ }).click()
await page.locator('.board').waitFor({ timeout: 5000 })

let turns = 0
let rolls = 0
const MAX_STEPS = 120

for (let step = 0; step < MAX_STEPS; step++) {
  // 遊戲結束？
  if ((await page.locator('.gameover').count()) > 0) break

  // 闖關挑戰站：點「開始挑戰」，不操作 → 撐到時間到(過關)或翻船(失敗)自動結束，再等結算彈窗
  if ((await page.locator('.minigame').count()) > 0) {
    const startBtn = page.getByRole('button', { name: /開始挑戰/ })
    if ((await startBtn.count()) > 0) await startBtn.click()
    await page.locator('.result, .gameover').first().waitFor({ timeout: 40000 })
    continue
  }

  const modalOpen = (await page.locator('.modal').count()) > 0

  if (modalOpen) {
    const hasResult = (await page.locator('.result').count()) > 0
    const hasQuiz = (await page.locator('.quiz').count()) > 0

    if (hasResult) {
      await page.getByRole('button', { name: /結束回合/ }).click()
      turns++
      // 等彈窗關閉或遊戲結束
      await page
        .waitForFunction(
          () => document.querySelector('.modal') === null || document.querySelector('.gameover'),
          { timeout: 5000 },
        )
        .catch(() => {})
    } else if (hasQuiz) {
      await page.locator('.quiz__opt').first().click()
      await page.locator('.result').waitFor({ timeout: 5000 })
    } else if ((await page.locator('.carddraw').count()) > 0) {
      // 機會/命運卡站：點一張背面牌翻開（沒有「繼續」按鈕，牌本身就是互動）
      await page.locator('.pcard').first().click()
      await page.locator('.result').waitFor({ timeout: 5000 })
    } else {
      await page.locator('.modal__foot button').click()
      await page.locator('.result').waitFor({ timeout: 5000 })
    }
    continue
  }

  // 沒有彈窗 → 擲骰
  const dice = page.locator('.dice__btn')
  if (await dice.isEnabled()) {
    await dice.click()
    rolls++
    // 跑馬燈(5s)+移動(0.85s) 後應出現格子彈窗 / 小遊戲 / 結束畫面；給足 9 秒，沒出現就是卡死
    await page.locator('.modal, .minigame, .gameover').first().waitFor({ timeout: 9000 })
  } else {
    await page.waitForTimeout(150)
  }
}

const finishedGame = (await page.locator('.gameover').count()) > 0
const winnerText = finishedGame ? await page.locator('.gameover__winner').innerText().catch(() => '') : ''

await browser.close()

console.log(`步數：擲骰 ${rolls} 次、結束回合 ${turns} 次`)
console.log(`遊戲是否走到結束畫面：${finishedGame ? '是' : '否'}`)
if (winnerText) console.log(`結果：${winnerText.replace(/\s+/g, ' ').trim()}`)

if (errors.length > 0) {
  console.error('\n❌ 偵測到錯誤：')
  errors.forEach((e) => console.error('   ' + e))
  process.exit(1)
}
if (!finishedGame) {
  console.error('\n❌ 在步數上限內沒有走到遊戲結束畫面（可能卡死）')
  process.exit(1)
}
console.log('\n✅ 瀏覽器實機測試通過：無錯誤、無卡死，遊戲完整走到結束。')

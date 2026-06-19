// ===========================================================================
// 自我對戰測試 (self-play harness)
// ---------------------------------------------------------------------------
// 用固定亂數種子，自動把整場遊戲玩到結束，驗證：
//   1. 每一場都會在合理回合數內「結束」（不會無限迴圈）。
//   2. 結束時一定有合法的勝出者。
//   3. 暫停 (skipNext)、移除同工等效果不會讓流程卡死。
// 執行：  npm run test:selfplay
// 這一層只跑純引擎、完全不碰畫面，是抓「遊戲永遠不結束」這類 bug 最有效的方法。
// ===========================================================================

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createGame, roll, advance, resolve, endTurn, getGameStatus, getActiveQuiz } from '../src/core/engine.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 所有旅程都要驗證會正常結束（roll-and-move 外框可掛多條旅程）。
const JOURNEYS = [
  ['路得記·從空到滿', '../src/data/journey-ruth.json'],
].map(([name, p]) => ({ name, board: JSON.parse(readFileSync(join(__dirname, p), 'utf-8')) }))

// 簡單可重現的亂數產生器 (mulberry32)，吃一個種子。
function makeRng(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function playOneGame(board, numPlayers, seed) {
  const rng = makeRng(seed)
  const configs = Array.from({ length: numPlayers }, (_, i) => ({ name: `P${i + 1}` }))
  let state = createGame(configs, board)

  const HARD_CAP = 5000 // 安全上限：超過就算 bug
  let iterations = 0

  while (state.phase !== 'gameover') {
    iterations++
    if (iterations > HARD_CAP) {
      throw new Error(`遊戲在 ${numPlayers} 人 / 種子 ${seed} 下超過 ${HARD_CAP} 步仍未結束 — 可能無限迴圈！`)
    }

    if (state.phase === 'idle') {
      const dice = 1 + Math.floor(rng() * 6) // 骰子 1~6（與畫面一致）
      state = roll(state, dice)
    } else if (state.phase === 'rolled') {
      state = advance(state, rng(), rng()) // 注入抽題、抽卡隨機值（種子固定才可重現）
    } else if (state.phase === 'resolving') {
      // 與引擎一致：對「這一輪抽中的那一題」作答（不限 type，event/story/end 也可能掛題）。
      const quiz = getActiveQuiz(state)
      let payload = {}
      if (quiz) {
        // 隨機作答，刻意製造答對/答錯兩種情況
        payload = { answerIndex: Math.floor(rng() * quiz.options.length) }
      }
      state = resolve(state, payload)
    } else if (state.phase === 'turnEnd') {
      state = endTurn(state)
    } else {
      throw new Error(`未知的 phase: ${state.phase}`)
    }
  }

  const status = getGameStatus(state)
  if (!status.over) throw new Error('phase 是 gameover 但 getGameStatus 卻說沒結束')
  if (status.winnerId == null) throw new Error('遊戲結束卻沒有勝出者')

  return { iterations, turnCount: state.turnCount, status, state }
}

for (const { name, board } of JOURNEYS) {
  let totalGames = 0
  let totalTurns = 0
  let maxTurns = 0
  const reasons = {}
  for (let numPlayers = 1; numPlayers <= 4; numPlayers++) {
    for (let seed = 1; seed <= 300; seed++) {
      const { turnCount, status } = playOneGame(board, numPlayers, seed)
      totalGames++
      totalTurns += turnCount
      maxTurns = Math.max(maxTurns, turnCount)
      reasons[status.reason] = (reasons[status.reason] || 0) + 1
    }
  }
  console.log(
    `✅ ${name}（${board.stations.length} 站）：${totalGames} 場全部結束；平均回合 ${(totalTurns / totalGames).toFixed(1)}、最多 ${maxTurns}；結束原因`,
    reasons,
  )
}

console.log('\n✅ 全部旅程自我對戰測試通過')

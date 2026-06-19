import { useState, useRef, useCallback, useEffect } from 'react'
import journeyRuth from '../data/journey-ruth.json'
import regionMapRuth from '../data/region-map-ruth.json'
import * as engine from '../core/engine'
import { sound } from '../audio/sound'
import { enterImmersive } from '../immersive'

// 可選旅程：roll-and-move 外框可掛多條旅程，各自帶內容(journey)＋底圖(map)。
// nextKey：這條旅程走完後可「接續」的下一段（宣教接力——帶著福音點數與裝備繼續）。
const JOURNEYS = [
  { key: 'ruth', journey: journeyRuth, map: regionMapRuth, nextKey: null }, // 路得記（手繪「從空到滿」棋盤，不走 gen-map）
]

const ROLL_MS = 3000 // 跑馬燈轉動時間（3 秒）
const MOVE_MS = 850 // 棋子移動動畫時間

// UI 階段：
//   setup    選人數 / 取名
//   idle     等待目前玩家擲骰
//   rolling  骰子轉動中
//   moving   棋子移動中
//   station  停在格子上，顯示劇情 / 問題（尚未結算）
//   result   已結算，顯示結果
//   gameover 遊戲結束
export function useGame() {
  const [game, setGame] = useState(null)
  const [phase, setPhase] = useState('setup')
  const [diceFace, setDiceFace] = useState(1)
  const [activeKey, setActiveKey] = useState('ruth') // 目前選的旅程
  const active = JOURNEYS.find((j) => j.key === activeKey) || JOURNEYS[0]

  const timeouts = useRef([])
  const rollTimer = useRef(null)

  const clearAll = useCallback(() => {
    timeouts.current.forEach(clearTimeout)
    timeouts.current = []
    if (rollTimer.current) {
      clearInterval(rollTimer.current)
      rollTimer.current = null
    }
  }, [])

  // 元件卸載時清掉所有計時器，避免殘留 timer 在已卸載元件上動作。
  useEffect(() => clearAll, [clearAll])

  const later = useCallback((fn, ms) => {
    const id = setTimeout(fn, ms)
    timeouts.current.push(id)
    return id
  }, [])

  const startGame = useCallback((playerConfigs, journeyKey = 'ruth') => {
    clearAll()
    const chosen = JOURNEYS.find((j) => j.key === journeyKey) || JOURNEYS[0]
    setActiveKey(chosen.key)
    enterImmersive() // 手機/平板：點「開始旅程」的手勢中進全螢幕+鎖橫向（桌機不打擾）
    sound.unlock() // 由使用者點擊觸發，喚醒音訊
    sound.startBgm()
    setGame(engine.createGame(playerConfigs, chosen.journey))
    setPhase('idle')
  }, [clearAll])

  const rollAndMove = useCallback(() => {
    if (phase !== 'idle' || !game) return
    const value = 1 + Math.floor(Math.random() * 6) // 骰子 1~6 點

    setPhase('rolling')
    // 骰子轉動：每 80ms 換一個隨機點數（1~6），響一聲滴答。
    rollTimer.current = setInterval(() => {
      setDiceFace(1 + Math.floor(Math.random() * 6))
      sound.tick()
    }, 80)

    later(() => {
      if (rollTimer.current) {
        clearInterval(rollTimer.current)
        rollTimer.current = null
      }
      setDiceFace(value)
      sound.ding() // 跑馬燈停下
      // 擲骰 → 移動（純引擎運算）；抽題、抽卡的隨機值在這裡注入，引擎本身保持純函式。
      const quizRoll = Math.random()
      const cardRoll = Math.random()
      const moved = engine.advance(engine.roll(game, value), quizRoll, cardRoll)
      setGame(moved)
      setPhase('moving')
      sound.move()
      // 等棋子滑到定點，再打開格子內容
      later(() => setPhase('station'), MOVE_MS)
    }, ROLL_MS)
  }, [phase, game, later])

  // 結算目前格子。問答格傳 { answerIndex }；其餘格忽略 payload。
  const resolveStation = useCallback(
    (payload = {}) => {
      if (phase !== 'station' || !game) return
      const next = engine.resolve(game, payload)
      setGame(next)
      setPhase('result')
      // 問答播答對/答錯音效；機會/命運卡翻牌播一聲叮。
      if (next.lastResult) {
        if (next.lastResult.quiz) {
          next.lastResult.correct ? sound.correct() : sound.wrong()
        } else if (next.lastResult.minigame) {
          next.lastResult.minigameWon ? sound.correct() : sound.wrong()
        } else if (next.lastResult.card) {
          sound.ding()
        }
      }
    },
    [phase, game],
  )

  const finishTurn = useCallback(() => {
    if (phase !== 'result' || !game) return
    const next = engine.endTurn(game)
    setGame(next)
    if (next.phase === 'gameover') {
      setPhase('gameover')
      sound.stopBgm()
      sound.win()
    } else {
      setPhase('idle')
    }
  }, [phase, game])

  const restart = useCallback(() => {
    clearAll()
    setGame(null)
    setPhase('setup')
  }, [clearAll])

  // 宣教接力：這條旅程走完後，接著走下一段（JOURNEYS 的 nextKey）。
  // 玩家名字、福音點數、屬靈裝備帶過去；同工換成新旅程的起點同工
  // （聖經上各次旅程的同工本來就不同——第二次旅程保羅與巴拿巴分隊、改帶西拉）。
  const continueJourney = useCallback(() => {
    if (phase !== 'gameover' || !game) return
    const next = JOURNEYS.find((j) => j.key === active.nextKey)
    if (!next) return
    clearAll()
    setActiveKey(next.key)
    enterImmersive() // 接續下一段旅程也是使用者手勢，保持全螢幕+橫向
    sound.unlock()
    sound.startBgm()
    const carryConfigs = game.players.map((p) => ({
      name: p.name,
      gospelPoints: p.gospelPoints,
      gifts: p.gifts || [],
    }))
    setGame(engine.createGame(carryConfigs, next.journey))
    setPhase('idle')
  }, [phase, game, active, clearAll])

  const status = game ? engine.getGameStatus(game) : null
  const currentStation =
    game && game.pendingStationId ? engine.getStation(game, game.pendingStationId) : null
  // 這一輪實際抽中、要顯示與計分的那一題（多題隨機抽；舊的單一 quiz 也走這裡）。
  const currentQuiz = game ? engine.getActiveQuiz(game) : null
  // 這一輪抽中的機會／命運卡（沒抽則 null）。
  const currentCard = game ? engine.getActiveCard(game) : null

  return {
    journey: active.journey,
    map: active.map,
    journeys: JOURNEYS.map((j) => ({
      key: j.key,
      title: j.journey.title,
      subtitle: j.journey.subtitle,
      scoreLabel: j.journey.scoreLabel,
    })),
    game,
    phase,
    diceFace,
    status,
    currentStation,
    currentQuiz,
    currentCard,
    currentPlayer: game ? game.players[game.currentPlayerIndex] : null,
    // 走完後可接續的下一段旅程（沒有則 null）——GameOverScreen 用來顯示「接續」按鈕。
    nextJourney: (() => {
      const n = JOURNEYS.find((j) => j.key === active.nextKey)
      return n ? { key: n.key, title: n.journey.title, subtitle: n.journey.subtitle } : null
    })(),
    startGame,
    rollAndMove,
    resolveStation,
    finishTurn,
    restart,
    continueJourney,
  }
}

import { useEffect, useRef, useState } from 'react'
import { Game as ElijahGame } from '../minigames/elijah/game'
import { Game as GleaningGame } from '../minigames/gleaning/game'
import CardGame from '../minigames/cards/CardGame'
import { CARD_GAMES } from '../minigames/cards/specs'
import { sound } from '../audio/sound'

// 路得記的闖關彈窗:掛一個 canvas(或純 React 卡片流程),啟動引擎(嵌入模式),
// 過關 / 失敗時呼叫 onComplete({ won, score, level }),由外層換算成恩慈點數。
// 2026-07-07 母體死碼清理:jonah/sling/ark* 引擎與其 LEVELS 表/makeEmbedUI 已移除——
// 路得記站點只用 cards(卡片四關)與 engine:'gleaning'(拾麥穗);elijah 是 gleaning 的母引擎保留可用。
export default function MiniGameModal({ minigame, onComplete }) {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const [started, setStarted] = useState(false)

  // 純 React 卡片流程關(src/minigames/cards/):站點用 minigame.cards 指定規格,不啟動 Canvas 引擎。
  const cardSpec = minigame.cards ? CARD_GAMES[minigame.cards] : null
  // in-repo 恢復/收集引擎(src/minigames/elijah/):撿餅水恢復體力、走到何烈山過關(王上 19)。
  const isElijah = minigame.engine === 'elijah'
  // in-repo 拾麥穗收集引擎(src/minigames/gleaning/):路得在波阿斯麥田邊跑邊撿麥穗🌾恢復體力、
  // 遇波阿斯故意撥落(恩典)、拾到日暮過關(得 2;利 19:9-10)。不會失敗。
  const isGleaning = minigame.engine === 'gleaning'
  // 站點可在 minigame 裡覆寫 label / how(沒寫就用卡片規格 / 引擎的預設)。
  const info = {
    title:
      minigame.label ||
      (cardSpec
        ? cardSpec.title
        : isGleaning
          ? '🌾 拾麥穗蒙恩 · 路得'
          : isElijah
            ? '🌅 盼望 · 以利亞重得力'
            : '闖關挑戰'),
    how:
      minigame.how ||
      (cardSpec
        ? cardSpec.how
        : isGleaning
          ? '路得在波阿斯的田裡拾麥穗。空白鍵／↑／點畫面 = 跳；邊跑邊撿麥穗🌾把體力補回來；遇見波阿斯會故意撥落一大把（恩典）。拾到日暮就過關，體力歸零也沒關係，歇一會兒再起來。'
          : isElijah
            ? '灰心的以利亞在曠野趕路。空白鍵／↑／點畫面 = 跳起來撿天使預備的餅🍞和水💧把體力補回來；體力歸零也沒關係，神會再扶你起來。走到何烈山就過關。'
            : ''),
  }

  // 在使用者點「開始挑戰」的手勢中啟動:此時 canvas 已排版好(renderer 量得到尺寸),
  // 音訊也能在手勢中解鎖。
  const begin = () => {
    if (started || gameRef.current) return
    setStarted(true)
    sound.stopBgm() // 暫停桌遊背景音樂,避免和小遊戲音效打架
    if (cardSpec) return // 卡片流程關:純 React,不啟動引擎
    const Cls = isGleaning ? GleaningGame : isElijah ? ElijahGame : null
    if (!Cls) return console.warn('MiniGameModal: 未知的 minigame', minigame)
    const game = new Cls(canvasRef.current, {
      embed: true,
      winPoints: minigame.winPoints || 5,
      onComplete: (result) => onComplete(result),
    })
    gameRef.current = game
    game.boot()
  }

  // 卸載(小遊戲結束、彈窗關閉)時清理引擎並還原背景音樂。
  useEffect(() => {
    return () => {
      if (gameRef.current) gameRef.current.destroy()
      sound.startBgm() // startBgm 內部會檢查靜音設定
    }
  }, [])

  return (
    <div className="modal__overlay">
      <div className="minigame">
        <div className="minigame__head">
          <span className="minigame__kind">闖關挑戰</span>
          <span className="minigame__title">{info.title}</span>
        </div>
        <div className="minigame__stage">
          {!cardSpec && <canvas ref={canvasRef} className="minigame__canvas" />}
          {started && cardSpec && <CardGame spec={cardSpec} onComplete={onComplete} />}
          {!started && (
            <div className="minigame__intro">
              <p className="minigame__how">{info.how}</p>
              <button className="btn btn--primary" onClick={begin}>
                開始挑戰 →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

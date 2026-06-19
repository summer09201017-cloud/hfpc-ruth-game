import { useState } from 'react'
import CardGame from '../minigames/cards/CardGame'
import { CARD_GAMES } from '../minigames/cards/specs'

// 卡片奇兵的「單獨玩」入口（不綁桌遊）：開 ?demo=<specKey> 就能整關單獨玩。
//   例：?demo=cornelius（福音奇兵）。任何 CARD_GAMES 裡的關卡都能這樣預覽。
// 兒童營用:單機投影、全螢幕、大字、結算大畫面;這一關不會失敗(答錯溫柔重試)。
export default function CardDemo({ specKey }) {
  const spec = CARD_GAMES[specKey]
  const [started, setStarted] = useState(false)
  const [result, setResult] = useState(null)
  const [runKey, setRunKey] = useState(0) // 改 key = 重新掛載 CardGame 從頭玩

  if (!spec) {
    return (
      <div className="carddemo">
        <p className="carddemo__msg">找不到關卡「{specKey}」。可用的關卡：{Object.keys(CARD_GAMES).join('、')}</p>
      </div>
    )
  }

  const replay = () => {
    setResult(null)
    setRunKey((k) => k + 1)
  }

  const toggleFullscreen = () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen()
      else document.documentElement.requestFullscreen()
    } catch {}
  }

  return (
    <div className="carddemo">
      <button className="carddemo__fs" onClick={toggleFullscreen} aria-label="全螢幕" title="全螢幕">
        ⛶
      </button>
      <div className="minigame minigame--demo">
        <div className="minigame__head">
          <span className="minigame__kind">逆轉奇兵</span>
          <span className="minigame__title">{spec.title}</span>
        </div>
        <div className="minigame__stage">
          {!started ? (
            <div className="minigame__intro">
              <p className="minigame__how">{spec.how}</p>
              <button className="btn btn--primary" onClick={() => setStarted(true)}>
                開始 →
              </button>
            </div>
          ) : result ? (
            <div className="minigame__intro">
              <p className="carddemo__score">🎉 完成！答對 {result.score} 步</p>
              <button className="btn btn--primary" onClick={replay}>
                再玩一次 ↻
              </button>
            </div>
          ) : (
            <CardGame
              key={runKey}
              spec={spec}
              onComplete={(r) => setResult(r)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import MiniGameModal from './MiniGameModal'

// 大光奇兵 · 動作版「順服奔跑」(徒 9):掃羅在大馬士革路上被大光照射、仆倒、三日眼瞎,
//   悔改順服後,循著神的差遣往「直街」去見亞拿尼亞——眼睛得開,從逼迫者變成奔跑傳道的人。
//   反向 RPG:沒有攻擊鍵——這個最會逼迫的人,不是被打敗,是被大光「逆轉」;得勝是順服神的呼召。
//   重用約拿曠野跑酷(level 4,本就可被任何旅程重用)+ 徒 9 主題 HUD;不綁約拿站,?demo=saul-action 直接玩。
export default function SaulActionDemo() {
  const [runKey, setRunKey] = useState(0) // 改 key = 重新掛載從頭玩
  const [result, setResult] = useState(null)

  const minigame = {
    level: 4,
    winPoints: 3,
    label: '💡 大光奇兵 · 順服奔跑',
    how: '大光照下、掃羅仆倒又眼瞎,他卻順服神的差遣往大馬士革「直街」去。空白／↑／點畫面 = 跳過攔阻;跑到直街、眼睛得開,逼迫者就成了傳道者——過關!',
    hudLabels: { start: '大馬士革路', goal: '直街 ✝️' },
  }

  const replay = () => {
    setResult(null)
    setRunKey((k) => k + 1)
  }

  if (result) {
    return (
      <div className="carddemo">
        <div className="minigame minigame--demo">
          <div className="minigame__head">
            <span className="minigame__kind">逆轉奇兵 · 大光奇兵</span>
            <span className="minigame__title">💡 順服奔跑</span>
          </div>
          <div className="minigame__stage">
            <div className="minigame__intro">
              <p className="carddemo__score">
                {result.won
                  ? '🎉 眼睛得開!逼迫者掃羅成了傳道的保羅'
                  : '再試一次——主說:起來,進城去(徒 9:6)'}
                {typeof result.score === 'number' ? `（得分 ${result.score}）` : ''}
              </p>
              <button className="btn btn--primary" onClick={replay}>
                再玩一次 ↻
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <MiniGameModal key={runKey} minigame={minigame} onComplete={setResult} />
}

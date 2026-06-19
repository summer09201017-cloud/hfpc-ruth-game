import { useState } from 'react'
import MiniGameModal from './MiniGameModal'

// 福音奇兵 · 動作版「出發傳福音」(徒 10):彼得順服聖靈的差遣,從約帕一路跑到外邦人哥尼流的家(該撒利亞)。
//   反向 RPG:沒有攻擊鍵——得勝不是打倒誰,是順服聖靈、跨過猶太人與外邦人之間的牆,把福音帶給萬民。
//   重用約拿跑酷引擎(level 1,本就設計成可被任何旅程重用)+ 徒 10 主題 HUD;不綁約拿站,?demo=cornelius-action 直接玩。
export default function CorneliusActionDemo() {
  const [runKey, setRunKey] = useState(0) // 改 key = 重新掛載從頭玩
  const [result, setResult] = useState(null)

  const minigame = {
    level: 1,
    winPoints: 3,
    label: '🕊️ 福音奇兵 · 出發傳福音',
    how: '彼得順服聖靈的差遣,從約帕一路跑向外邦人哥尼流的家。空白／↑／點畫面 = 跳過攔阻(猶太人與外邦人之間的牆);跑到該撒利亞,福音就第一次臨到外邦人——過關!',
    hudLabels: { start: '約帕', goal: '該撒利亞 🏠' },
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
            <span className="minigame__kind">逆轉奇兵 · 福音奇兵</span>
            <span className="minigame__title">🕊️ 出發傳福音</span>
          </div>
          <div className="minigame__stage">
            <div className="minigame__intro">
              <p className="carddemo__score">
                {result.won
                  ? '🎉 福音臨到外邦!彼得到了哥尼流的家'
                  : '再試一次——聖靈說:不要疑惑,只管去(徒 10:20)'}
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

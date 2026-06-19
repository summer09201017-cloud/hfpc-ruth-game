import { useEffect, useRef, useState } from 'react'
import { Game as SlingGame } from '../minigames/sling/game'

// 大衛甩石的開發預覽（不在正式遊戲流程內）：開 ?demo=sling 就能單獨玩這關、調手感。
// 之後做「大衛」旅程時，這關用站點 minigame:{ engine:'sling', winPoints } 接進棋盤即可。
export default function SlingDemo() {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const [started, setStarted] = useState(false)
  const [result, setResult] = useState(null)

  // 進全螢幕 + 盡量鎖橫向（手機只有在「使用者手勢」中呼叫才有效，所以綁在「開始甩石」點擊裡）。
  const enterFullscreenLandscape = () => {
    try {
      const el = document.documentElement
      if (!document.fullscreenElement && el.requestFullscreen) {
        const p = el.requestFullscreen()
        // 進全螢幕後再嘗試鎖橫向（桌機沒有 orientation.lock，靜默略過）。
        if (p && p.then) p.then(() => { try { screen.orientation?.lock?.('landscape') } catch {} }).catch(() => {})
        else { try { screen.orientation?.lock?.('landscape') } catch {} }
      }
    } catch {}
  }

  const toggleFullscreen = () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen()
      else enterFullscreenLandscape()
    } catch {}
  }

  const begin = () => {
    if (gameRef.current) return
    enterFullscreenLandscape() // 在點擊手勢中要全螢幕——手機才會生效
    setStarted(true)
    setResult(null)
    const g = new SlingGame(canvasRef.current, {
      embed: true,
      winPoints: 5,
      onComplete: (r) => setResult(r),
    })
    gameRef.current = g
    if (typeof window !== 'undefined') window.__sling = g // 開發/測試掛勾：讓煙霧測試讀 aimDeg/state 在命中帶放手
    g.boot()
  }

  useEffect(() => () => gameRef.current && gameRef.current.destroy(), [])

  const replay = () => {
    if (gameRef.current) gameRef.current.destroy()
    gameRef.current = null
    begin()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0f1922', display: 'flex', flexDirection: 'column' }}>
      <button
        onClick={toggleFullscreen}
        aria-label="全螢幕"
        title="全螢幕"
        style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, width: 40, height: 40, fontSize: 20, borderRadius: 10, border: '1px solid #3a5160', background: 'rgba(20,30,40,0.7)', color: '#cfe3e8', cursor: 'pointer' }}
      >
        ⛶
      </button>
      <div style={{ color: '#cfe3e8', padding: '6px 12px', font: '14px system-ui' }}>
        大衛甩石・開發預覽（?demo=sling）{result && `　→ 結果：${result.won ? '命中得勝 🎯' : '石子用完了'}（score ${result.score}）`}
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        {!started && (
          <button
            onClick={begin}
            style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', padding: '12px 24px', fontSize: 18, borderRadius: 12, border: 'none', background: '#e4572e', color: '#fff', cursor: 'pointer' }}
          >
            開始甩石 →
          </button>
        )}
        {result && (
          <button
            onClick={replay}
            style={{ position: 'absolute', right: 16, bottom: 16, padding: '8px 16px', borderRadius: 10, border: '2px solid #b9863f', background: '#fffdf7', cursor: 'pointer' }}
          >
            再玩一次 ↻
          </button>
        )}
      </div>
    </div>
  )
}

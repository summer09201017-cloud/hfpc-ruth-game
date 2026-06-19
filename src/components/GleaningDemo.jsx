import { useEffect, useRef, useState } from 'react'
import { Game as GleaningGame } from '../minigames/gleaning/game'

// 「拾麥穗蒙恩 · 路得(收集關)」的開發預覽:開 ?demo=gleaning 單獨玩、調手感、截圖驗收。
// 正式遊戲流程裡,路得記第 6 站用 minigame:{ engine:'gleaning', winPoints } 接進棋盤。
export default function GleaningDemo() {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const [started, setStarted] = useState(false)
  const [result, setResult] = useState(null)

  const enterFullscreenLandscape = () => {
    try {
      const el = document.documentElement
      if (!document.fullscreenElement && el.requestFullscreen) {
        const p = el.requestFullscreen()
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
    enterFullscreenLandscape()
    setStarted(true)
    setResult(null)
    const g = new GleaningGame(canvasRef.current, {
      embed: true,
      winPoints: 5,
      onComplete: (r) => setResult(r),
    })
    gameRef.current = g
    if (typeof window !== 'undefined') window.__gleaning = g // 開發/測試掛勾
    g.boot()
  }

  useEffect(() => () => gameRef.current && gameRef.current.destroy(), [])

  const replay = () => {
    if (gameRef.current) gameRef.current.destroy()
    gameRef.current = null
    begin()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#1a130a', display: 'flex', flexDirection: 'column' }}>
      <button
        onClick={toggleFullscreen}
        aria-label="全螢幕"
        title="全螢幕"
        style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, width: 40, height: 40, fontSize: 20, borderRadius: 10, border: '1px solid #6b5430', background: 'rgba(40,30,16,0.7)', color: '#f0dcb0', cursor: 'pointer' }}
      >
        ⛶
      </button>
      <div style={{ color: '#f0dcb0', padding: '6px 12px', font: '14px system-ui' }}>
        拾麥穗蒙恩・路得（收集關）・開發預覽（?demo=gleaning）{result && `　→ 結果：${result.won ? '拾到日暮、裝滿一籃 🌇' : '未完成'}（score ${result.score}）`}
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        {!started && (
          <button
            onClick={begin}
            style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', padding: '12px 24px', fontSize: 18, borderRadius: 12, border: 'none', background: '#caa23a', color: '#3a2a10', fontWeight: 700, cursor: 'pointer' }}
          >
            開始拾穗 →
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

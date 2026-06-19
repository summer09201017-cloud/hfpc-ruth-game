import { useEffect, useRef, useState } from 'react'
import { Game as ArkBuildGame } from '../minigames/arkbuild/game'

// 蓋方舟（依序放木板）的開發預覽：開 ?demo=arkbuild 就能單獨玩、調手感。
// 之後做「挪亞方舟」旅程時，這關用站點 minigame:{ engine:'arkbuild', winPoints } 接進棋盤即可。
export default function ArkBuildDemo() {
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
    try { document.fullscreenElement ? document.exitFullscreen() : enterFullscreenLandscape() } catch {}
  }

  const begin = () => {
    if (gameRef.current) return
    enterFullscreenLandscape()
    setStarted(true)
    setResult(null)
    const g = new ArkBuildGame(canvasRef.current, {
      embed: true,
      winPoints: 5,
      onComplete: (r) => setResult(r),
    })
    gameRef.current = g
    if (typeof window !== 'undefined') window.__arkbuild = g
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
        一步一步蓋方舟・開發預覽（?demo=arkbuild）{result && `　→ 結果：方舟蓋好了 🌈（score ${result.score}）`}
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        {!started && (
          <button
            onClick={begin}
            style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', padding: '12px 24px', fontSize: 18, borderRadius: 12, border: 'none', background: '#8a4b2f', color: '#fff', cursor: 'pointer' }}
          >
            開始動工 →
          </button>
        )}
        {result && (
          <button
            onClick={replay}
            style={{ position: 'absolute', right: 16, bottom: 16, padding: '8px 16px', borderRadius: 10, border: '2px solid #b9863f', background: '#fffdf7', cursor: 'pointer' }}
          >
            再蓋一次 ↻
          </button>
        )}
      </div>
    </div>
  )
}

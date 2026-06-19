import { useEffect, useRef, useState } from 'react'
import { Game } from '../minigames/jonah/game'

// 紅海奔逃的「單獨玩」入口（?demo=redsea，出 14，約拿引擎 level 8）。
//   2026-06-15 修手機 bug：原本用 MiniGameModal（彈窗式、置中小框），手機上又小又被轉向提示卡住＝「不能玩」。
//   改成與 SlingDemo / ElijahDemo 一致的「滿版 + 手勢中進全螢幕鎖橫向」外殼，直接 boot 約拿引擎 level 8。
//   決策①(A)：動作版獨立入口、不併保羅旅程、不綁約拿站。
const NULL_UI = new Proxy({}, { get: () => () => {} }) // 純 Canvas 關（如 1/2/4/8）不需卡片 UI

export default function RedSeaDemo() {
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
    enterFullscreenLandscape() // 在點擊手勢中要全螢幕——手機才會生效
    setStarted(true)
    setResult(null)
    const g = new Game(canvasRef.current, {
      ui: NULL_UI,
      embed: true,
      level: 8, // 紅海
      winPoints: 3,
      onComplete: (r) => setResult(r),
    })
    gameRef.current = g
    if (typeof window !== 'undefined') window.__redsea = g // 開發/測試掛勾
    g.boot()
  }

  useEffect(() => () => gameRef.current && gameRef.current.destroy(), [])

  const replay = () => {
    if (gameRef.current) gameRef.current.destroy()
    gameRef.current = null
    begin()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a1622', display: 'flex', flexDirection: 'column' }}>
      <button
        onClick={toggleFullscreen}
        aria-label="全螢幕"
        title="全螢幕"
        style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, width: 40, height: 40, fontSize: 20, borderRadius: 10, border: '1px solid #2f5066', background: 'rgba(16,30,44,0.7)', color: '#bfe0ef', cursor: 'pointer' }}
      >
        ⛶
      </button>
      <div style={{ color: '#bfe0ef', padding: '6px 12px', font: '14px system-ui' }}>
        🌊 紅海奔逃（出 14）・開發預覽（?demo=redsea）{result && `　→ 結果：${result.won ? '過了紅海 🎉' : '追兵追上了'}（score ${result.score}）`}
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        {!started && (
          <button
            onClick={begin}
            style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', padding: '12px 24px', fontSize: 18, borderRadius: 12, border: 'none', background: '#2b7fa8', color: '#fff', cursor: 'pointer' }}
          >
            站住，等候神分海 →
          </button>
        )}
        {result && (
          <button
            onClick={replay}
            style={{ position: 'absolute', right: 16, bottom: 16, padding: '8px 16px', borderRadius: 10, border: '2px solid #5aa6c8', background: '#fffdf7', cursor: 'pointer' }}
          >
            再玩一次 ↻
          </button>
        )}
      </div>
    </div>
  )
}

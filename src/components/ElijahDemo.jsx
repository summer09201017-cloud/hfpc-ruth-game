import { useEffect, useRef, useState } from 'react'
import { Game as ElijahGame } from '../minigames/elijah/game'

// 「盼望 · 以利亞重得力(動作版)」的開發預覽(不在正式遊戲流程內):開 ?demo=elijah-action 單獨玩、調手感。
// (卡片版仍是 ?demo=elijah。)之後做旅程或當挑戰站時,站點用 minigame:{ engine:'elijah', winPoints } 接進棋盤即可。
export default function ElijahDemo() {
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
    const g = new ElijahGame(canvasRef.current, {
      embed: true,
      winPoints: 5,
      onComplete: (r) => setResult(r),
    })
    gameRef.current = g
    if (typeof window !== 'undefined') window.__elijah = g // 開發/測試掛勾
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
        盼望・以利亞重得力（動作版）・開發預覽（?demo=elijah-action）{result && `　→ 結果：${result.won ? '到了何烈山 ⛰️' : '未完成'}（score ${result.score}）`}
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        {!started && (
          <button
            onClick={begin}
            style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', padding: '12px 24px', fontSize: 18, borderRadius: 12, border: 'none', background: '#c1772e', color: '#fff', cursor: 'pointer' }}
          >
            起來吃吧 →
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

import { useEffect, useRef, useState } from 'react'
import { Game as ArkPairsGame } from '../minigames/arkpairs/game'

// 動物公母配對的開發預覽（不在正式遊戲流程內）：開 ?demo=arkpairs 就能單獨玩、調手感。
// 之後做「挪亞方舟」旅程時，這關用站點 minigame:{ engine:'arkpairs', winPoints, pairs } 接進棋盤即可。
export default function ArkPairsDemo() {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const [started, setStarted] = useState(false)
  const [result, setResult] = useState(null)
  const [pairs, setPairs] = useState(8) // 幾對動物：開始前可挑 6/8/10/12
  const [muted, setMuted] = useState(false) // 背景音樂靜音

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m
      gameRef.current?.audio?.setMuted(next)
      return next
    })
  }

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
    const g = new ArkPairsGame(canvasRef.current, {
      embed: true,
      winPoints: 5,
      pairs,
      onComplete: (r) => setResult(r),
    })
    gameRef.current = g
    if (typeof window !== 'undefined') window.__arkpairs = g
    g.boot()
  }

  useEffect(() => () => gameRef.current && gameRef.current.destroy(), [])

  // 回到「選對數 + 開始」畫面（可換不同對數再玩）。
  const replay = () => {
    if (gameRef.current) gameRef.current.destroy()
    gameRef.current = null
    setResult(null)
    setStarted(false)
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
      <button
        onClick={toggleMute}
        aria-label={muted ? '開啟音樂' : '關閉音樂'}
        title={muted ? '開啟音樂' : '關閉音樂'}
        style={{ position: 'absolute', top: 8, right: 56, zIndex: 10, width: 40, height: 40, fontSize: 18, borderRadius: 10, border: '1px solid #3a5160', background: 'rgba(20,30,40,0.7)', color: '#cfe3e8', cursor: 'pointer' }}
      >
        {muted ? '🔇' : '🎵'}
      </button>
      <div style={{ color: '#cfe3e8', padding: '6px 12px', font: '14px system-ui' }}>
        一公一母進方舟・開發預覽（?demo=arkpairs）{result && `　→ 結果：全部上船 🌈（score ${result.score}）`}
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        {!started && (
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
            <div style={{ color: '#cfe3e8', font: '15px system-ui' }}>幾對動物？（母的戴 🎀）</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[6, 8, 10, 12].map((n) => (
                <button
                  key={n}
                  onClick={() => setPairs(n)}
                  style={{ padding: '8px 14px', fontSize: 15, borderRadius: 10, cursor: 'pointer', color: '#fff', border: n === pairs ? '2px solid #ffd98a' : '1px solid #3a5160', background: n === pairs ? '#3f7fd0' : 'rgba(20,30,40,0.6)' }}
                >
                  {n} 對
                </button>
              ))}
            </div>
            <button
              onClick={begin}
              style={{ padding: '12px 24px', fontSize: 18, borderRadius: 12, border: 'none', background: '#3f7fd0', color: '#fff', cursor: 'pointer' }}
            >
              開始配對 →
            </button>
          </div>
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

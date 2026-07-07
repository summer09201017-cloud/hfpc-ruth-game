import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ElijahDemo from './components/ElijahDemo.jsx'
import GleaningDemo from './components/GleaningDemo.jsx'
import CardDemo from './components/CardDemo.jsx'
import { CARD_GAMES } from './minigames/cards/specs'
import './styles.css'
import { registerSW } from 'virtual:pwa-register'

// 註冊 Service Worker：安裝後可離線遊玩，並在有新版時自動更新。
registerSW({ immediate: true })

// 單獨玩 / 開發預覽 / 大廳深連結（不影響正式桌遊流程）：
//   ?demo=gleaning          → 拾麥穗蒙恩·路得（收集/恢復動作關，得 2；簽名關）
//   ?demo=elijah-action     → 盼望·以利亞重得力（收集/恢復動作關，王上 19；gleaning 的母引擎）
//   ?demo=<卡片關 key>      → 任一卡片關單獨玩，例 ?demo=ruthChoice（路得的抉擇）
// 2026-07-07 母體死碼清理:sling/redsea/cornelius-action/saul-action/arkpairs/arkbuild 路由
// 與 jonah/sling/ark* 引擎已移除(路得記用不到;見 CLAUDE.md)。
const demo = (() => {
  try {
    return new URLSearchParams(window.location.search).get('demo')
  } catch {
    return null
  }
})()

function pickRoot() {
  if (demo === 'elijah-action') return <ElijahDemo />
  if (demo === 'gleaning') return <GleaningDemo />
  if (demo && CARD_GAMES[demo]) return <CardDemo specKey={demo} />
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>{pickRoot()}</React.StrictMode>,
)

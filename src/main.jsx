import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import SlingDemo from './components/SlingDemo.jsx'
import ElijahDemo from './components/ElijahDemo.jsx'
import GleaningDemo from './components/GleaningDemo.jsx'
import RedSeaDemo from './components/RedSeaDemo.jsx'
import CardDemo from './components/CardDemo.jsx'
import CorneliusActionDemo from './components/CorneliusActionDemo.jsx'
import SaulActionDemo from './components/SaulActionDemo.jsx'
import ArkPairsDemo from './components/ArkPairsDemo.jsx'
import ArkBuildDemo from './components/ArkBuildDemo.jsx'
import { CARD_GAMES } from './minigames/cards/specs'
import './styles.css'
import { registerSW } from 'virtual:pwa-register'

// 註冊 Service Worker：安裝後可離線遊玩，並在有新版時自動更新。
registerSW({ immediate: true })

// 單獨玩 / 開發預覽 / 大廳深連結（不影響正式桌遊流程）：
//   ?demo=sling             → 大衛甩石（拋射動作關）
//   ?demo=elijah-action     → 盼望·以利亞重得力（收集/恢復動作關，王上 19）
//   ?demo=redsea            → 紅海奔逃（約拿引擎 level 8 動作關，出 14；不併保羅旅程）
//   ?demo=cornelius-action  → 福音·出發傳福音（跑酷，約帕→該撒利亞，徒 10）
//   ?demo=saul-action       → 大光·順服奔跑（曠野跑酷，大馬士革路→直街，徒 9）
//   ?demo=arkpairs          → 挪亞·一公一母進方舟（翻牌記憶配對，創 6–7）
//   ?demo=arkbuild          → 挪亞·一步一步蓋方舟（依序放木板，創 6:14-22）
//   ?demo=<卡片關 key>      → 任一卡片關單獨玩，例 ?demo=cornelius（福音奇兵）
const demo = (() => {
  try {
    return new URLSearchParams(window.location.search).get('demo')
  } catch {
    return null
  }
})()

function pickRoot() {
  if (demo === 'sling') return <SlingDemo />
  if (demo === 'elijah-action') return <ElijahDemo />
  if (demo === 'gleaning') return <GleaningDemo />
  if (demo === 'redsea') return <RedSeaDemo />
  if (demo && CARD_GAMES[demo]) return <CardDemo specKey={demo} />
  if (demo === 'cornelius-action') return <CorneliusActionDemo />
  if (demo === 'saul-action') return <SaulActionDemo />
  if (demo === 'arkpairs') return <ArkPairsDemo />
  if (demo === 'arkbuild') return <ArkBuildDemo />
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>{pickRoot()}</React.StrictMode>,
)

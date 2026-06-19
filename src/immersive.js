// 手機/平板(觸控)在使用者點擊「開始旅程」時進全螢幕並鎖橫向;桌機不打擾。
// 跟約拿引擎的 _enterImmersive 同一套邏輯(嵌入小遊戲在彈窗裡不另外請求,整個 app 已經是全螢幕)。
// iOS 不支援網頁全螢幕 API → 由「加入主畫面」(manifest 已設 landscape/standalone)達成;
// 直向時由 index.html 的 .rotate-hint 蓋版提示轉橫向。
export function enterImmersive() {
  try {
    if (!window.matchMedia || !window.matchMedia('(pointer: coarse)').matches) return
    const lockLandscape = () => {
      try {
        if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {})
      } catch {}
    }
    const el = document.documentElement
    if (!document.fullscreenElement && el.requestFullscreen) {
      const p = el.requestFullscreen()
      if (p && p.then) p.then(lockLandscape).catch(() => {})
      else lockLandscape()
    } else {
      lockLandscape()
    }
  } catch {}
}

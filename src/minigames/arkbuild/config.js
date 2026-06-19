// 依序放木板蓋方舟——所有可調幾何與數值集中在這裡。
// 邏輯解析度固定 960×540（與系列其他關同一套縮放/letterbox）。
export const WORLD = { w: 960, h: 540 }

// 方舟箱體幾何（世界座標）。方舟是長方形木箱（創 6:15），由下往上一排排釘起來。
export const BOX = {
  left: 300,
  right: 660,
  wallBottom: 418, // 牆最底（hull 在這條線以下）
  rows: 9, // 牆板列數（由下往上一塊一塊放）
  rowH: 26,
  hullH: 80, // 船底高
  roofApexY: 116, // 屋頂頂點 y
}
export const WALL_TOP = BOX.wallBottom - BOX.rows * BOX.rowH // 184

// 門與透光窗（創 6:16）
export const DOOR = { x: 556, y: 300, w: 64, h: BOX.wallBottom - 300 }
export const WINDOW = { x: 336, y: 206, w: 74, h: 44 }

export const RULES = {
  dropSec: 0.28, // 一塊木板從上方落到定位的動畫秒數
  totalYears: 120, // 風味用：蓋方舟「花了好多年」的年數（隨進度成長顯示）
}

// 蓋舟時洪水還沒來：底部是乾地（不是海），人在地上嘲笑挪亞。
export const GROUND_Y = 500

// 挪亞鎚擊瞄準：挪亞拿著鎚子沿「目前這塊木板那一排」左右移動，
// 玩家要抓準在「釘點」記號上點擊，才能把木板釘正；沒對準會歪掉、要重來（不失敗）。
// 漸進難度：方舟越蓋越高、挪亞蓋了越多年 → 移動越快、容差越小（但守公平下限 ≈0.10s 窗口）。
// 有效值 = 依進度 progress(0→1) 在 base→hard 之間內插（見 game.js 的 _tunables）。
export const AIM = {
  speed: 250, // 起始移動速度（px/s）
  speedMax: 345, // 蓋到最後的移動速度
  tol: 30, // 起始命中容差（px）：|noahX - 釘點X| <= tol 視為對準
  tolMin: 18, // 蓋到最後的命中容差（最窄）；2*18/345 ≈ 0.10s，公平下限
  margin: 26, // 掃動範圍比箱體左右各多出的邊
}

// 各排木板的「釘點」相對位置（0..1，在 left..right 之間），循環取用 →
// 每排要瞄的位置都不同，這就是難度來源。
export const STUDS = [0.5, 0.27, 0.73, 0.4, 0.62, 0.32, 0.68, 0.46, 0.78, 0.22]

// 嘲笑挪亞的人：站在左邊乾地上，講風涼話（氣氛＋教導，不影響過關）。
export const MOCKERS = [
  { x: 92, scale: 1.0, face: '😆' },
  { x: 158, scale: 0.92, face: '😂' },
  { x: 222, scale: 1.05, face: '🤣' },
]

export const PALETTE = {
  skyTop: '#cfe6f0',
  skyBottom: '#eaf3da',
  sea: '#4a87ad',
  seaDeep: '#315f7e',
  // 三層用三個木色（下/中/上），教「上中下三層」（創 6:16）
  deck: ['#7a4f2a', '#90602f', '#a8763c'],
  deckLine: '#4f3115',
  hull: '#5f3c1f',
  hullDark: '#43290f',
  roof: '#8a4b2f',
  roofDark: '#643318',
  doorFrame: '#4f3115',
  doorDark: '#2a1a0c',
  windowFrame: '#4f3115',
  windowGlow: '#ffe9a8',
  ghost: 'rgba(255,255,255,0.30)',
  ghostEdge: 'rgba(255,255,255,0.85)',
  ink: '#33240f',
}

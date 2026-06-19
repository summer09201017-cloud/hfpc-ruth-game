// 動物公母配對（翻牌記憶）——所有可調數值集中在這裡。
// 邏輯解析度固定 960×540，renderer 量畫布父層尺寸等比縮放置中（與 sling/elijah 同一套）。
export const WORLD = { w: 960, h: 540 }

export const RULES = {
  pairs: 8, // 幾種動物（每種一公一母＝兩張牌）。可被站點/Demo 用 opts.pairs 覆寫（建議 6–12）。
  flipBackSec: 0.9, // 翻錯兩張後停留多久自動蓋回（也可點畫面快轉）
  cols: 4, // 卡片網格固定 4 欄，列數依張數自動算
}

// 左側卡片網格區（世界座標）
export const GRID = { x: 26, y: 66, w: 540, h: 452, gap: 14 }

// 右側方舟區（配對成功的動物住進房間）。roofH/hullH/pad/gap 供 renderer 畫殼與房間共用。
export const ARK = { x: 590, y: 60, w: 346, h: 458, roofH: 70, hullH: 86, pad: 16, gap: 10, cols: 2 }

// 方舟內每個房間的矩形（世界座標），共用給 renderer（畫）與 game（點選命中測試），避免兩邊算法漂移。
// 回傳長度 = count 的陣列，索引 i 對應第 i 間房（col=i%2、row=floor(i/2)）。
export function arkRoomRects(count) {
  const { x, w, roofH, hullH, pad, gap, cols } = ARK
  const hx = x + 14
  const hw = w - 28
  const hy = ARK.y + roofH
  const hh = ARK.h - roofH - hullH
  const rows = Math.ceil(count / cols)
  const gridX = hx + pad
  const gridY = hy + 14
  const gw = hw - pad * 2
  const gh = hh - 26
  const cwd = (gw - (cols - 1) * gap) / cols
  const chd = (gh - (rows - 1) * gap) / rows
  const rects = []
  for (let i = 0; i < count; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    rects.push({ x: gridX + col * (cwd + gap), y: gridY + row * (chd + gap), w: cwd, h: chd })
  }
  return rects
}

// 第 i 間房在 2 欄網格中的上下左右鄰居索引（用於猛獸鄰居規則）。
export function roomNeighbors(i, count) {
  const cols = ARK.cols
  const col = i % cols
  const ns = []
  if (i - cols >= 0) ns.push(i - cols) // 上
  if (i + cols < count) ns.push(i + cols) // 下
  if (col === 0 && i + 1 < count) ns.push(i + 1) // 右
  if (col === 1) ns.push(i - 1) // 左
  return ns
}

// 配色（木造方舟 + 海）
export const PALETTE = {
  skyTop: '#bfe0ef',
  skyBottom: '#e9f4dc',
  sea: '#3f7ea8',
  seaDeep: '#2e5f80',
  cardBack: '#9c6b3b', // 蓋著的牌＝方舟木板背面
  cardBackDark: '#7d5530',
  cardFace: '#fff7e8',
  cardEdge: '#b9863f',
  arkHull: '#7a4f2a',
  arkHullDark: '#5f3c1f',
  arkHouse: '#c89b5a',
  arkRoof: '#8a4b2f',
  male: '#3f7fd0', // ♂ 公（藍）
  female: '#d85f9c', // ♀ 母（粉）
  ink: '#3a2c1a',
}

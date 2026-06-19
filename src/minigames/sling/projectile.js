// 可重用的「拋射核心」——純函式、無 DOM、無隨機，遊戲迴圈與 node 物理測試共用同一套，
// 確保「看到的軌跡」和「測到的命中」一致。未來任何投擲關（甩石、擲矛、射箭…）都吃這塊。

// 由角度(弧度)＋速度算初速向量。螢幕座標 y 向下，所以仰角的 vy 為負。
export function launchVelocity(angleRad, power) {
  return { vx: Math.cos(angleRad) * power, vy: -Math.sin(angleRad) * power }
}

// 對一顆飛行中的石頭做一步積分（半隱式歐拉，穩定）。回傳新狀態（不改輸入）。
export function stepProjectile(s, dt, gravity) {
  const vy = s.vy + gravity * dt
  return { x: s.x + s.vx * dt, y: s.y + vy * dt, vx: s.vx, vy }
}

// 點是否落在矩形內（命中區判定）。
export function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
}

// 線段是否與矩形相交（兩幀之間石頭可能「穿過」薄命中區，用線段補一刀避免漏判）。
export function segmentHitsRect(x0, y0, x1, y1, r) {
  if (pointInRect(x0, y0, r) || pointInRect(x1, y1, r)) return true
  // 取線段上若干取樣點檢查（簡單可靠，命中區不算小）。
  const steps = 6
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    if (pointInRect(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r)) return true
  }
  return false
}

// 純模擬：給定發射角/力道，回傳是否命中目標、以及結束點與原因（ground/offscreen/timeout）。
// 遊戲動畫與測試都用它判定結果，dt 越小越精準（測試用 1/240）。
export function simulateShot({
  origin,
  angleRad,
  power,
  gravity,
  target,
  groundY,
  worldW,
  dt = 1 / 240,
  maxT = 5,
}) {
  const v = launchVelocity(angleRad, power)
  let s = { x: origin.x, y: origin.y, vx: v.vx, vy: v.vy }
  let apex = origin.y
  for (let t = 0; t < maxT; t += dt) {
    const n = stepProjectile(s, dt, gravity)
    apex = Math.min(apex, n.y)
    if (segmentHitsRect(s.x, s.y, n.x, n.y, target)) return { hit: true, x: n.x, y: n.y, apex, reason: 'hit' }
    if (n.y >= groundY) return { hit: false, x: n.x, y: groundY, apex, reason: 'ground' }
    if (n.x > worldW + 80) return { hit: false, x: n.x, y: n.y, apex, reason: 'offscreen' }
    s = n
  }
  return { hit: false, x: s.x, y: s.y, apex, reason: 'timeout' }
}

export const deg2rad = (d) => (d * Math.PI) / 180

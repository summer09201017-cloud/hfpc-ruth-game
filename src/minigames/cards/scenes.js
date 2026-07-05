// 卡片關的 Canvas 場景繪圖（2026-06-14,兒童營投影用）。
//
// 兩層,呼應使用者需求:
//  1) drawBackdrop —— 通用輕量背景動畫(漸層 + 呼吸光暈 + 上飄微粒),所有卡片關共用、一次受惠。
//  2) CORNELIUS —— 福音奇兵專屬的「逐幕手繪動畫」(像約拿第 6 關蓖麻樹),不只 emoji。
//
// 全部零美術檔、純 Canvas 圖形、可離線。每個 drawer 簽名 = (ctx, w, h, t)，t 為秒。
// 座標一律以 k = h/240 等比縮放,任何畫布大小都好看。

const lerp = (a, b, t) => a + (b - a) * t
const TAU = Math.PI * 2

// 把十六進位色調亮/調暗(amt: -100..100)
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  r = Math.max(0, Math.min(255, r + amt))
  g = Math.max(0, Math.min(255, g + amt))
  b = Math.max(0, Math.min(255, b + amt))
  return `rgb(${r},${g},${b})`
}

// ---- 通用背景:漸層 + 呼吸光暈 + 上飄微粒(給所有卡片關當底,比純 emoji 高級很多)----
export function drawBackdrop(ctx, w, h, t, accent = [58, 141, 141]) {
  const [ar, ag, ab] = accent
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, `rgb(${(ar + 255) >> 1},${(ag + 255) >> 1},${(ab + 255) >> 1})`)
  g.addColorStop(1, `rgb(${(ar + 255 * 3) >> 2},${(ag + 255 * 3) >> 2},${(ab + 255 * 3) >> 2})`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  // 呼吸的中央光暈
  const glow = ctx.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.42, h * (0.7 + Math.sin(t * 0.8) * 0.06))
  glow.addColorStop(0, `rgba(255,255,255,${0.28 + Math.sin(t * 0.8) * 0.06})`)
  glow.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)
  // 上飄微粒
  for (let i = 0; i < 16; i++) {
    const sp = 0.6 + (i % 5) * 0.12
    const y = h - (((t * sp * 26 + i * 53) % (h + 30)))
    const x = (i * 67 % w) + Math.sin(t * 0.7 + i) * 14
    const r = (1.2 + (i % 3)) * (h / 240)
    ctx.fillStyle = `rgba(255,255,255,${0.10 + (i % 4) * 0.04})`
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill()
  }
}

// ---- 角色小人(可換袍色/頭飾/手勢/表情),福音奇兵各幕共用 ----
function person(ctx, x, gy, k, o = {}) {
  const robe = o.robe || '#6a8caf', skin = '#e8bb8d'
  const kneel = o.pose === 'kneel' || o.pose === 'bow'
  const H = (kneel ? 78 : 108) * k
  const headR = 14.5 * k // 頭放大,表情才看得清楚(投影用)
  const hy = gy - H + headR
  const bodyTop = hy + headR * 0.7
  const bodyBot = gy - 2 * k
  // 腿(跪/站)
  ctx.strokeStyle = shade(robe, -40); ctx.lineWidth = 5 * k; ctx.lineCap = 'round'
  if (kneel) {
    ctx.beginPath(); ctx.moveTo(x - 6 * k, bodyBot - 6 * k); ctx.lineTo(x - 12 * k, gy); ctx.lineTo(x - 2 * k, gy); ctx.stroke()
  } else {
    const stride = o.walk ? Math.sin(o.walk) * 7 * k : 0
    ctx.beginPath()
    ctx.moveTo(x - 6 * k, bodyBot - 4 * k); ctx.lineTo(x - 6 * k - stride, gy)
    ctx.moveTo(x + 6 * k, bodyBot - 4 * k); ctx.lineTo(x + 6 * k + stride, gy); ctx.stroke()
  }
  // 袍(梯形)
  ctx.fillStyle = robe
  ctx.beginPath()
  ctx.moveTo(x - 17 * k, bodyBot); ctx.lineTo(x + 17 * k, bodyBot)
  ctx.lineTo(x + 10 * k, bodyTop); ctx.lineTo(x - 10 * k, bodyTop); ctx.closePath(); ctx.fill()
  // 腰帶
  ctx.fillStyle = shade(robe, -50); ctx.fillRect(x - 14 * k, bodyBot - 22 * k, 28 * k, 4 * k)
  // 手臂(依手勢)
  ctx.strokeStyle = robe; ctx.lineWidth = 6 * k; ctx.lineCap = 'round'
  const sh = bodyTop + 6 * k // 肩
  ctx.beginPath()
  if (o.arms === 'up') { ctx.moveTo(x - 9 * k, sh); ctx.lineTo(x - 16 * k, sh - 20 * k); ctx.moveTo(x + 9 * k, sh); ctx.lineTo(x + 16 * k, sh - 20 * k) }
  else if (o.arms === 'pray') { ctx.moveTo(x - 9 * k, sh); ctx.lineTo(x - 1 * k, sh + 8 * k); ctx.moveTo(x + 9 * k, sh); ctx.lineTo(x + 1 * k, sh + 8 * k) }
  else if (o.arms === 'reach') { ctx.moveTo(x - 9 * k, sh); ctx.lineTo(x - 13 * k, sh + 14 * k); ctx.moveTo(x + 9 * k, sh); ctx.lineTo(x + (o.reach || 22) * k, sh - (o.reachUp || 6) * k) }
  else if (o.arms === 'speak') { ctx.moveTo(x - 9 * k, sh); ctx.lineTo(x - 14 * k, sh + 10 * k); ctx.moveTo(x + 9 * k, sh); ctx.lineTo(x + 17 * k, sh - 12 * k) }
  else { ctx.moveTo(x - 9 * k, sh); ctx.lineTo(x - 12 * k, sh + 18 * k); ctx.moveTo(x + 9 * k, sh); ctx.lineTo(x + 12 * k, sh + 18 * k) }
  ctx.stroke()
  if (o.arms === 'reach') { // 伸手(拉人起來)畫出手掌端點
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(x + (o.reach || 22) * k, sh - (o.reachUp || 6) * k, 3.5 * k, 0, TAU); ctx.fill()
  }
  // 頭
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(x, hy, headR, 0, TAU); ctx.fill()
  // 頭飾
  if (o.head === 'helmet') { // 羅馬軍官盔
    ctx.fillStyle = '#b9482e'; ctx.beginPath(); ctx.arc(x, hy - 2 * k, headR + 1 * k, Math.PI, 0); ctx.fill()
    ctx.fillStyle = '#d96a3a'; ctx.fillRect(x - 2 * k, hy - headR - 8 * k, 4 * k, 8 * k) // 盔冠
  } else if (o.head === 'crown') {
    ctx.fillStyle = '#e8b53a'; ctx.fillRect(x - headR, hy - headR - 4 * k, headR * 2, 5 * k)
  } else { // 頭巾
    ctx.fillStyle = o.headColor || shade(robe, 60); ctx.beginPath(); ctx.arc(x, hy - 1 * k, headR, Math.PI, 0); ctx.fill()
    ctx.fillStyle = shade(o.headColor || shade(robe, 60), -30); ctx.fillRect(x - headR, hy - 2 * k, headR * 2, 3 * k)
  }
  // 鬍子(o.beard)
  if (o.beard) { ctx.fillStyle = '#cfcabf'; ctx.beginPath(); ctx.moveTo(x - 5 * k, hy + 4 * k); ctx.lineTo(x + 5 * k, hy + 4 * k); ctx.lineTo(x, hy + 12 * k); ctx.closePath(); ctx.fill() }
  // 臉:眼 + 眉 + 嘴(表情明顯——投影看得到)
  const ex = 4 * k, ey = hy + 0.5 * k, er = 2 * k
  ctx.fillStyle = '#2c2016'
  ctx.beginPath(); ctx.arc(x - ex, ey, er, 0, TAU); ctx.arc(x + ex, ey, er, 0, TAU); ctx.fill()
  // 眉(隨表情)
  ctx.strokeStyle = '#5a3a28'; ctx.lineWidth = 1.9 * k; ctx.lineCap = 'round'; ctx.beginPath()
  if (o.face === 'joy') { ctx.moveTo(x - ex - 2.6 * k, ey - 4.6 * k); ctx.lineTo(x - ex + 2.2 * k, ey - 5.8 * k); ctx.moveTo(x + ex - 2.2 * k, ey - 5.8 * k); ctx.lineTo(x + ex + 2.6 * k, ey - 4.6 * k) }
  else if (o.face === 'worry') { ctx.moveTo(x - ex - 2.6 * k, ey - 6 * k); ctx.lineTo(x - ex + 2.2 * k, ey - 3.4 * k); ctx.moveTo(x + ex - 2.2 * k, ey - 3.4 * k); ctx.lineTo(x + ex + 2.6 * k, ey - 6 * k) }
  else if (o.face === 'awe') { ctx.moveTo(x - ex - 2.6 * k, ey - 6.4 * k); ctx.lineTo(x - ex + 2.2 * k, ey - 7 * k); ctx.moveTo(x + ex - 2.2 * k, ey - 7 * k); ctx.lineTo(x + ex + 2.6 * k, ey - 6.4 * k) }
  ctx.stroke()
  // 嘴(隨表情)
  ctx.strokeStyle = '#8a3b2e'; ctx.lineWidth = 2.4 * k; ctx.lineCap = 'round'; ctx.beginPath()
  if (o.face === 'joy') { ctx.arc(x, hy + 4 * k, 4.2 * k, 0.12 * Math.PI, 0.88 * Math.PI); ctx.stroke() }
  else if (o.face === 'awe') { ctx.fillStyle = '#7a2b22'; ctx.beginPath(); ctx.ellipse(x, hy + 6.5 * k, 2.6 * k, 3.4 * k, 0, 0, TAU); ctx.fill() }
  else if (o.face === 'worry') { ctx.arc(x, hy + 9.5 * k, 3.2 * k, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke() }
  else { ctx.moveTo(x - 3 * k, hy + 5 * k); ctx.lineTo(x + 3 * k, hy + 5 * k); ctx.stroke() }
}

// 房子(右側,門口戲用)
function house(ctx, x, gy, k) {
  ctx.fillStyle = '#cdaa78'; ctx.fillRect(x - 46 * k, gy - 92 * k, 92 * k, 92 * k)
  ctx.fillStyle = '#8a6a44'; ctx.beginPath(); ctx.moveTo(x - 56 * k, gy - 88 * k); ctx.lineTo(x + 56 * k, gy - 88 * k); ctx.lineTo(x, gy - 124 * k); ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#5a4026'; ctx.fillRect(x - 14 * k, gy - 56 * k, 28 * k, 56 * k) // 門洞
  ctx.fillStyle = '#caa05a'; ctx.fillRect(x + 10 * k, gy - 30 * k, 3 * k, 6 * k)
}

// 俯伏下拜的人(門口戲:哥尼流俯伏在彼得腳前)——臉朝左下、拱背、雙手伸到前方的腳邊。
function prostrate(ctx, x, gy, k, o = {}) {
  const robe = o.robe || '#9c3b3b', skin = '#e8bb8d', headR = 13 * k
  // 折在身下的小腿/臀(坐在腳跟上)
  ctx.fillStyle = shade(robe, -30)
  ctx.beginPath(); ctx.ellipse(x + 8 * k, gy - 7 * k, 17 * k, 8 * k, 0, 0, TAU); ctx.fill()
  // 拱起的背(臀 → 頭,粗弧線當身體)
  ctx.strokeStyle = robe; ctx.lineWidth = 22 * k; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(x + 12 * k, gy - 20 * k); ctx.quadraticCurveTo(x - 6 * k, gy - 30 * k, x - 18 * k, gy - 12 * k); ctx.stroke()
  // 雙臂往前伸到地(朝彼得的腳)
  ctx.strokeStyle = robe; ctx.lineWidth = 6 * k
  ctx.beginPath(); ctx.moveTo(x - 14 * k, gy - 14 * k); ctx.lineTo(x - 32 * k, gy - 3 * k); ctx.stroke()
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(x - 33 * k, gy - 3 * k, 4 * k, 0, TAU); ctx.fill()
  // 低伏的頭(幾乎貼地)
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(x - 20 * k, gy - 11 * k, headR, 0, TAU); ctx.fill()
  if (o.head === 'helmet') { ctx.fillStyle = '#b9482e'; ctx.beginPath(); ctx.arc(x - 20 * k, gy - 13 * k, headR + 1 * k, Math.PI * 0.55, Math.PI * 1.95); ctx.fill() }
  ctx.fillStyle = '#cfcabf'; ctx.beginPath(); ctx.arc(x - 26 * k, gy - 9 * k, 3 * k, 0, TAU); ctx.fill() // 鬍子(側臉朝下)
  ctx.fillStyle = '#2c2016'; ctx.beginPath(); ctx.arc(x - 25 * k, gy - 12 * k, 1.5 * k, 0, TAU); ctx.fill() // 一隻眼
}

// 火舌(聖靈降臨)
function flame(ctx, x, y, k, t, i) {
  const fl = 1 + Math.sin(t * 9 + i) * 0.18
  const g = ctx.createLinearGradient(x, y, x, y - 22 * k * fl)
  g.addColorStop(0, '#ffd34d'); g.addColorStop(1, '#e8542a')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(x - 6 * k, y)
  ctx.quadraticCurveTo(x - 7 * k, y - 12 * k * fl, x, y - 22 * k * fl)
  ctx.quadraticCurveTo(x + 7 * k, y - 12 * k * fl, x + 6 * k, y)
  ctx.closePath(); ctx.fill()
  ctx.fillStyle = 'rgba(255,245,200,0.85)'
  ctx.beginPath(); ctx.ellipse(x, y - 7 * k, 2.4 * k, 5 * k * fl, 0, 0, TAU); ctx.fill()
}

// 鴿子(聖靈)
function dove(ctx, x, y, k, t) {
  const flap = Math.sin(t * 4) * 0.5
  ctx.fillStyle = '#fbfbff'
  ctx.beginPath(); ctx.ellipse(x, y, 9 * k, 5 * k, 0, 0, TAU); ctx.fill() // 身
  ctx.beginPath(); ctx.arc(x + 7 * k, y - 4 * k, 3.5 * k, 0, TAU); ctx.fill() // 頭
  ctx.save(); ctx.translate(x, y)
  ctx.rotate(flap)
  ctx.beginPath(); ctx.ellipse(-2 * k, -2 * k, 11 * k, 4 * k, -0.5, 0, TAU); ctx.fill()
  ctx.restore()
  ctx.fillStyle = '#e8a13a'; ctx.beginPath(); ctx.moveTo(x + 10 * k, y - 4 * k); ctx.lineTo(x + 15 * k, y - 3 * k); ctx.lineTo(x + 10 * k, y - 2 * k); ctx.closePath(); ctx.fill()
}

// 從天而降的光束(禱告/聖靈)
function rays(ctx, w, h, t, cx, alpha) {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = -3; i <= 3; i++) {
    const a = alpha * (0.5 + 0.5 * Math.abs(Math.sin(t * 1.5 + i)))
    ctx.fillStyle = `rgba(255,244,200,${a * 0.5})`
    ctx.beginPath()
    ctx.moveTo(cx, 0)
    ctx.lineTo(cx + i * 16 - 10, h)
    ctx.lineTo(cx + i * 16 + 10, h)
    ctx.closePath(); ctx.fill()
  }
  ctx.restore()
}

// ===================== 福音奇兵 · 逐幕手繪動畫 =====================

// 1) 哥尼流禱告(徒 10:1-4)——軍官跪著禱告,天上的光臨到他
function pray(ctx, w, h, t) {
  const k = h / 240, gy = h * 0.86
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#3b2f63'); sky.addColorStop(0.6, '#7a5a8c'); sky.addColorStop(1, '#e8b98c')
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h)
  rays(ctx, w, h, t, w * 0.5, 0.9)
  // 天使榮光
  const ang = ctx.createRadialGradient(w * 0.5, h * 0.16, 0, w * 0.5, h * 0.16, 60 * k)
  ang.addColorStop(0, `rgba(255,250,220,${0.7 + Math.sin(t * 2) * 0.2})`); ang.addColorStop(1, 'rgba(255,250,220,0)')
  ctx.fillStyle = ang; ctx.beginPath(); ctx.arc(w * 0.5, h * 0.16, 60 * k, 0, TAU); ctx.fill()
  // 地
  ctx.fillStyle = '#6a5640'; ctx.fillRect(0, gy, w, h - gy)
  // 哥尼流(羅馬軍官)跪禱
  person(ctx, w * 0.5, gy, k * 1.15, { robe: '#9c3b3b', head: 'helmet', pose: 'kneel', arms: 'pray', face: 'awe', beard: true })
  // 上飄的禱告微光
  for (let i = 0; i < 8; i++) {
    const y = gy - ((t * 30 + i * 40) % (gy - h * 0.22))
    ctx.fillStyle = `rgba(255,240,190,${0.5 - (gy - y) / (gy) * 0.5})`
    ctx.beginPath(); ctx.arc(w * 0.5 + Math.sin(t * 2 + i) * 18 * k, y, 2.4 * k, 0, TAU); ctx.fill()
  }
}

// 2) 屋頂的異象(徒 10:11-16)——一塊大布從天降下,裡面有各樣走獸,降下又收上三次
function vision(ctx, w, h, t) {
  const k = h / 240, gy = h * 0.86
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#a9d3ea'); sky.addColorStop(1, '#f1e6c6')
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h)
  // 屋頂(彼得站的平台)
  ctx.fillStyle = '#c9a06a'; ctx.fillRect(0, gy, w, h - gy)
  ctx.fillStyle = '#b98a52'; ctx.fillRect(w * 0.08, gy - 10 * k, w * 0.30, 10 * k)
  // 大布:降下又收上(三次)
  const cyc = (Math.sin(t * 1.6) * 0.5 + 0.5) // 0..1
  const sheetY = lerp(h * 0.06, h * 0.4, cyc)
  const cx = w * 0.62, sw = 150 * k
  ctx.strokeStyle = 'rgba(120,120,140,0.7)'; ctx.lineWidth = 2 * k
  for (const dx of [-sw / 2, sw / 2]) { ctx.beginPath(); ctx.moveTo(cx + dx, sheetY); ctx.lineTo(cx + dx * 0.4, 0); ctx.stroke() }
  // 布面
  ctx.fillStyle = 'rgba(250,248,240,0.95)'
  ctx.beginPath()
  ctx.moveTo(cx - sw / 2, sheetY)
  ctx.quadraticCurveTo(cx, sheetY + 26 * k, cx + sw / 2, sheetY)
  ctx.quadraticCurveTo(cx, sheetY - 12 * k, cx - sw / 2, sheetY)
  ctx.closePath(); ctx.fill()
  ctx.strokeStyle = '#c9c2b0'; ctx.lineWidth = 1.5 * k; ctx.stroke()
  // 布裡的走獸剪影(牛 / 鳥 / 蛇)
  ctx.fillStyle = '#6a5a44'
  const oxX = cx - 38 * k, oy = sheetY + 6 * k
  ctx.fillRect(oxX - 8 * k, oy - 8 * k, 16 * k, 9 * k); ctx.beginPath(); ctx.arc(oxX + 9 * k, oy - 6 * k, 4 * k, 0, TAU); ctx.fill() // 牛
  ctx.beginPath(); ctx.moveTo(cx + 6 * k, oy); ctx.lineTo(cx + 18 * k, oy - 8 * k); ctx.lineTo(cx + 14 * k, oy); ctx.closePath(); ctx.fill() // 鳥
  ctx.strokeStyle = '#6a5a44'; ctx.lineWidth = 2.4 * k; ctx.beginPath()
  for (let i = 0; i <= 12; i++) { const sx = cx + 28 * k + i * 2.6 * k; const sy = oy + Math.sin(i * 0.9 + t * 3) * 3 * k; i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy) } ctx.stroke() // 蛇
  // 彼得(仰望)
  person(ctx, w * 0.2, gy, k * 1.1, { robe: '#3a6a9c', head: 'turban', headColor: '#d8c39a', arms: 'up', face: 'awe', beard: true })
}

// 3) 彼得順服的腳步(徒 10:20-23)——彼得一行人往該撒利亞走向哥尼流的家
function walk(ctx, w, h, t) {
  const k = h / 240, gy = h * 0.86
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#bfe0ee'); sky.addColorStop(1, '#eef0dc')
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h)
  // 遠山
  ctx.fillStyle = '#a9b48a'; ctx.beginPath(); ctx.moveTo(0, gy)
  for (let x = 0; x <= w; x += 30) ctx.lineTo(x, gy - 30 * k - Math.sin(x * 0.012) * 18 * k); ctx.lineTo(w, gy); ctx.closePath(); ctx.fill()
  // 路
  ctx.fillStyle = '#caa775'; ctx.fillRect(0, gy, w, h - gy)
  ctx.fillStyle = 'rgba(120,96,58,0.4)'
  const scroll = (t * 80) % (40 * k)
  for (let x = -40 * k - scroll; x < w; x += 40 * k) { ctx.beginPath(); ctx.ellipse(x, gy + 16 * k, 9 * k, 3 * k, 0, 0, TAU); ctx.fill() }
  house(ctx, w * 0.86, gy, k)
  // 一行人(彼得領頭 + 三位同行),邊走邊前進
  const drift = (Math.sin(t * 0.8) * 0.5 + 0.5) * w * 0.12
  const base = w * 0.16 + drift
  person(ctx, base + 70 * k, gy, k, { robe: '#7a8a52', head: 'turban', walk: t * 7 + 2 })
  person(ctx, base + 44 * k, gy, k, { robe: '#8a6a9c', head: 'turban', walk: t * 7 + 1 })
  person(ctx, base + 20 * k, gy, k, { robe: '#9c7a4a', head: 'turban', walk: t * 7 })
  person(ctx, base, gy, k * 1.12, { robe: '#3a6a9c', head: 'turban', headColor: '#d8c39a', beard: true, walk: t * 7, face: 'calm' }) // 彼得
}

// 4) 在哥尼流家門口(徒 10:25-26)——哥尼流俯伏拜,彼得拉他起來:「你起來,我也是人」
function door(ctx, w, h, t) {
  const k = h / 240, gy = h * 0.86
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#cfe4ee'); sky.addColorStop(1, '#efe7d2')
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h)
  house(ctx, w * 0.82, gy, k * 1.2)
  ctx.fillStyle = '#c2a878'; ctx.fillRect(0, gy, w, h - gy)
  // 彼得(左)彎身、伸手往下扶
  person(ctx, w * 0.34, gy, k * 1.2, { robe: '#3a6a9c', head: 'turban', headColor: '#d8c39a', beard: true, arms: 'reach', reach: 24, reachUp: -12, face: 'calm' })
  // 哥尼流俯伏在彼得腳前拜他(微微起伏 = 正被扶起)
  const rise = (Math.sin(t * 1.5) * 0.5 + 0.5) * 4 * k
  prostrate(ctx, w * 0.55, gy - rise, k * 1.1, { robe: '#9c3b3b', head: 'helmet' })
  // 對白
  speechBubble(ctx, w * 0.5, gy - 104 * k, k, '你起來,我也是人')
}

// 5) 神是不偏待人(徒 10:34-35)——彼得在滿屋外邦人面前宣講
function speak(ctx, w, h, t) {
  const k = h / 240, gy = h * 0.86
  const wall = ctx.createLinearGradient(0, 0, 0, h)
  wall.addColorStop(0, '#e7d8b8'); wall.addColorStop(1, '#d3bd95')
  ctx.fillStyle = wall; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#b79b6e'; ctx.fillRect(0, gy, w, h - gy) // 地板
  // 彼得(左)講道
  person(ctx, w * 0.2, gy, k * 1.2, { robe: '#3a6a9c', head: 'turban', headColor: '#d8c39a', beard: true, arms: 'speak', face: 'joy' })
  // 話語波
  ctx.strokeStyle = 'rgba(60,106,156,0.5)'; ctx.lineWidth = 2.5 * k
  for (let i = 0; i < 3; i++) { const ph = (t * 0.7 + i / 3) % 1; ctx.globalAlpha = 1 - ph; ctx.beginPath(); ctx.arc(w * 0.2 + 18 * k, gy - 60 * k, 14 * k + ph * 80 * k, -0.6, 0.6); ctx.stroke() }
  ctx.globalAlpha = 1
  // 滿屋外邦人(不同袍色 = 各國的人),點頭聆聽
  const colors = ['#a8553a', '#6a8a52', '#8a6a9c', '#c2873a', '#4a7a8a']
  for (let i = 0; i < 5; i++) {
    const nod = Math.sin(t * 3 + i) * 2 * k
    person(ctx, w * 0.52 + i * 42 * k, gy + nod, k * 0.92, { robe: colors[i], head: 'turban', face: 'calm' })
  }
}

// 6) 聖靈降臨(徒 10:44-46)——彼得還說話,聖靈就降在眾人身上,外邦人也說方言稱讚神
function spirit(ctx, w, h, t) {
  const k = h / 240, gy = h * 0.86
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#f7e9b0'); sky.addColorStop(1, '#f0d59a')
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h)
  rays(ctx, w, h, t, w * 0.5, 1)
  ctx.fillStyle = '#bda072'; ctx.fillRect(0, gy, w, h - gy)
  dove(ctx, w * 0.5, h * 0.16, k * 1.3, t)
  // 一群人,頭上落下火舌、舉手讚美
  const colors = ['#3a6a9c', '#a8553a', '#6a8a52', '#8a6a9c', '#c2873a']
  for (let i = 0; i < 5; i++) {
    const x = w * 0.24 + i * 36 * k
    person(ctx, x, gy, k * 0.96, { robe: colors[i], head: 'turban', arms: 'up', face: 'joy' })
    flame(ctx, x, gy - 104 * k * 0.96, k, t, i)
  }
  // 上升的讚美光點
  for (let i = 0; i < 10; i++) {
    const y = gy - ((t * 40 + i * 30) % (gy - h * 0.2))
    ctx.fillStyle = `rgba(255,240,180,${0.6 - (gy - y) / gy * 0.6})`
    ctx.beginPath(); ctx.arc(w * 0.2 + i * 30 * k, y, 2 * k, 0, TAU); ctx.fill()
  }
}

// 7) 福音給萬人(徒 10:34)——各國的人同站在光中,一同敬拜
function allnations(ctx, w, h, t) {
  const k = h / 240, gy = h * 0.86
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#bfe7ea'); sky.addColorStop(1, '#fdf3d4')
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h)
  const glow = ctx.createRadialGradient(w / 2, h * 0.2, 0, w / 2, h * 0.2, 90 * k)
  glow.addColorStop(0, `rgba(255,250,210,${0.7 + Math.sin(t * 2) * 0.15})`); glow.addColorStop(1, 'rgba(255,250,210,0)')
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(w / 2, h * 0.2, 90 * k, 0, TAU); ctx.fill()
  dove(ctx, w * 0.5, h * 0.18, k, t)
  ctx.fillStyle = '#bda072'; ctx.fillRect(0, gy, w, h - gy)
  const colors = ['#3a6a9c', '#a8553a', '#6a8a52', '#8a6a9c', '#c2873a', '#4a7a8a']
  const n = 6, spread = (w * 0.72) / (n - 1)
  for (let i = 0; i < n; i++) {
    const sway = Math.sin(t * 2 + i) * 3 * k
    person(ctx, w * 0.14 + i * spread, gy + sway, k * 0.92, { robe: colors[i], head: 'turban', arms: 'up', face: 'joy' })
  }
  // 慶祝光點
  for (let i = 0; i < 14; i++) {
    const y = gy - ((t * 50 + i * 24) % (gy))
    ctx.fillStyle = `rgba(255,235,150,${0.7 - (gy - y) / gy * 0.7})`
    ctx.beginPath(); ctx.arc((i * 71) % w, y, 2.2 * k, 0, TAU); ctx.fill()
  }
}

// 對白泡泡
function speechBubble(ctx, cx, cy, k, text) {
  ctx.font = `${700} ${16 * k}px "Noto Sans TC","Microsoft JhengHei",sans-serif`
  const tw = ctx.measureText(text).width + 22 * k, bh = 30 * k
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  const x = cx - tw / 2
  ctx.beginPath(); ctx.roundRect(x, cy, tw, bh, 8 * k); ctx.fill()
  ctx.beginPath(); ctx.moveTo(cx - 6 * k, cy + bh); ctx.lineTo(cx + 6 * k, cy + bh); ctx.lineTo(cx, cy + bh + 9 * k); ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#7a3b30'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(text, cx, cy + bh / 2)
}

export const CORNELIUS = { pray, vision, walk, door, speak, spirit, allnations }

// ===================== 共用小道具(盼望/大光用) =====================
function tree(ctx, x, gy, k) { // 羅騰樹:細幹 + 稀疏灌叢
  ctx.strokeStyle = '#6e5a3a'; ctx.lineWidth = 6 * k; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x - 4 * k, gy - 48 * k); ctx.stroke()
  ctx.fillStyle = '#869a52'
  for (const [dx, dy, r] of [[-15, -52, 17], [11, -58, 19], [24, -48, 14], [-2, -68, 16]]) { ctx.beginPath(); ctx.ellipse(x + dx * k, gy + dy * k, r * k, r * 0.7 * k, 0, 0, TAU); ctx.fill() }
}
function sleeper(ctx, x, gy, k, robe = '#7a6a9c') { // 側臥睡覺(頭朝左)
  ctx.fillStyle = robe; ctx.beginPath(); ctx.ellipse(x, gy - 9 * k, 30 * k, 9 * k, 0, 0, TAU); ctx.fill()
  ctx.fillStyle = '#e8bb8d'; ctx.beginPath(); ctx.arc(x - 30 * k, gy - 13 * k, 9 * k, 0, TAU); ctx.fill()
  ctx.fillStyle = '#cfcabf'; ctx.beginPath(); ctx.arc(x - 35 * k, gy - 11 * k, 3 * k, 0, TAU); ctx.fill()
  ctx.strokeStyle = '#2c2016'; ctx.lineWidth = 1.6 * k; ctx.beginPath(); ctx.moveTo(x - 33 * k, gy - 14 * k); ctx.lineTo(x - 28 * k, gy - 14 * k); ctx.stroke()
}
function zzz(ctx, x, y, k, t) {
  ctx.fillStyle = 'rgba(70,70,110,0.85)'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
  for (let i = 0; i < 3; i++) { const p = (t * 0.5 + i / 3) % 1; ctx.globalAlpha = 1 - p; ctx.font = `700 ${(12 + i * 3) * k}px sans-serif`; ctx.fillText('Z', x + i * 9 * k + p * 10 * k, y - i * 11 * k - p * 16 * k) } ctx.globalAlpha = 1
}
function angelFig(ctx, x, gy, k, t) { // 發光的天使
  const glow = ctx.createRadialGradient(x, gy - 55 * k, 0, x, gy - 55 * k, 46 * k)
  glow.addColorStop(0, `rgba(255,250,210,${0.6 + Math.sin(t * 3) * 0.2})`); glow.addColorStop(1, 'rgba(255,250,210,0)')
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, gy - 55 * k, 46 * k, 0, TAU); ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.beginPath(); ctx.ellipse(x - 15 * k, gy - 58 * k, 9 * k, 21 * k, -0.4, 0, TAU); ctx.ellipse(x + 15 * k, gy - 58 * k, 9 * k, 21 * k, 0.4, 0, TAU); ctx.fill()
  person(ctx, x, gy, k, { robe: '#f4f1e6', head: 'turban', headColor: '#f0e6c8', face: 'calm' })
  ctx.strokeStyle = '#e8c34a'; ctx.lineWidth = 2.2 * k; ctx.beginPath(); ctx.arc(x, gy - 112 * k, 9 * k, 0, TAU); ctx.stroke()
}
function cityRight(ctx, w, gy, k) {
  ctx.fillStyle = '#c8a06a'
  for (const [dx, bw, bh] of [[0, 34, 56], [30, 26, 84], [54, 30, 50], [80, 24, 70]]) ctx.fillRect(w - 120 * k + dx * k, gy - bh * k, bw * k, bh * k)
  ctx.fillStyle = '#9c7a48'; ctx.fillRect(w - 122 * k, gy - 12 * k, 122 * k, 12 * k)
}
function fallen(ctx, x, gy, k, robe) { // 仆倒在地(被大光擊倒,仰躺)
  ctx.fillStyle = robe; ctx.beginPath(); ctx.ellipse(x, gy - 8 * k, 32 * k, 9 * k, 0, 0, TAU); ctx.fill()
  ctx.fillStyle = '#e8bb8d'; ctx.beginPath(); ctx.arc(x + 30 * k, gy - 12 * k, 9 * k, 0, TAU); ctx.fill()
  ctx.strokeStyle = robe; ctx.lineWidth = 5 * k; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(x - 6 * k, gy - 12 * k); ctx.lineTo(x - 18 * k, gy - 24 * k); ctx.stroke() // 舉起的手(遮擋大光)
  ctx.fillStyle = '#2c2016'; ctx.beginPath(); ctx.arc(x + 32 * k, gy - 13 * k, 1.5 * k, 0, TAU); ctx.fill()
}

// ===================== 盼望奇兵 · 以利亞重得力(王上 19) =====================
function eliSky(ctx, w, h) { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#c79a6e'); g.addColorStop(1, '#e8cf9c'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h) }

function despair(ctx, w, h, t) { // 1) 羅騰樹下灰心求死
  const k = h / 240, gy = h * 0.86; eliSky(ctx, w, h)
  ctx.fillStyle = '#c9a86e'; ctx.fillRect(0, gy, w, h - gy)
  tree(ctx, w * 0.6, gy, k * 1.35)
  person(ctx, w * 0.44, gy, k * 1.05, { robe: '#7a6a9c', head: 'turban', headColor: '#caa05a', beard: true, pose: 'kneel', arms: 'pray', face: 'worry' })
  // 低垂的嘆息點
  for (let i = 0; i < 4; i++) { const p = (t * 0.4 + i / 4) % 1; ctx.fillStyle = `rgba(110,100,140,${0.4 * (1 - p)})`; ctx.beginPath(); ctx.arc(w * 0.44 - 14 * k, gy - 60 * k - p * 20 * k, 2 * k, 0, TAU); ctx.fill() }
}
function broomtree(ctx, w, h, t) { // 2) 神第一步:讓他睡(天使將臨)
  const k = h / 240, gy = h * 0.86; eliSky(ctx, w, h)
  ctx.fillStyle = '#c9a86e'; ctx.fillRect(0, gy, w, h - gy)
  tree(ctx, w * 0.66, gy, k * 1.35)
  sleeper(ctx, w * 0.46, gy, k * 1.2, '#7a6a9c')
  zzz(ctx, w * 0.46 + 6 * k, gy - 30 * k, k, t)
  // 天使將臨的微光
  const gl = ctx.createRadialGradient(w * 0.5, h * 0.18, 0, w * 0.5, h * 0.18, 50 * k); gl.addColorStop(0, `rgba(255,250,210,${0.3 + Math.sin(t * 2) * 0.15})`); gl.addColorStop(1, 'rgba(255,250,210,0)')
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(w * 0.5, h * 0.18, 50 * k, 0, TAU); ctx.fill()
}
function angelfood(ctx, w, h, t) { // 3) 天使送餅送水
  const k = h / 240, gy = h * 0.86; eliSky(ctx, w, h)
  ctx.fillStyle = '#c9a86e'; ctx.fillRect(0, gy, w, h - gy)
  tree(ctx, w * 0.16, gy, k)
  angelFig(ctx, w * 0.66, gy, k * 1.05, t)
  person(ctx, w * 0.4, gy, k * 1.0, { robe: '#7a6a9c', head: 'turban', headColor: '#caa05a', beard: true, pose: 'kneel', arms: 'reach', reach: 14, reachUp: 4, face: 'awe' })
  // 餅 + 水罐
  ctx.fillStyle = '#caa05a'; ctx.beginPath(); ctx.ellipse(w * 0.5, gy - 8 * k, 9 * k, 5 * k, 0, 0, TAU); ctx.fill()
  ctx.fillStyle = '#7a5a8c'; ctx.beginPath(); ctx.moveTo(w * 0.54, gy - 18 * k); ctx.lineTo(w * 0.565, gy - 18 * k); ctx.lineTo(w * 0.57, gy - 2 * k); ctx.lineTo(w * 0.535, gy - 2 * k); ctx.closePath(); ctx.fill()
}
function stillvoice(ctx, w, h, t) { // 4) 何烈山:風/震/火過去,微小的聲音
  const k = h / 240, gy = h * 0.86
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#5a6a8c'); g.addColorStop(1, '#9aa6b8'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  // 山 + 洞
  ctx.fillStyle = '#6a6256'; ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w * 0.4, h * 0.2); ctx.lineTo(w, gy); ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#2e2a26'; ctx.beginPath(); ctx.ellipse(w * 0.4, gy - 4 * k, 26 * k, 34 * k, 0, Math.PI, 0); ctx.fill()
  ctx.fillStyle = '#3a3530'; ctx.fillRect(0, gy, w, h - gy)
  // 風線(上)+ 火(右)——表示風震火都過去了
  ctx.strokeStyle = 'rgba(230,236,245,0.5)'; ctx.lineWidth = 2 * k
  for (let i = 0; i < 4; i++) { const yy = h * 0.2 + i * 12 * k; const off = (t * 120) % (w * 0.5); ctx.beginPath(); ctx.moveTo(w * 0.55 - off, yy); ctx.lineTo(w * 0.95 - off, yy); ctx.stroke() }
  flame(ctx, w * 0.8, gy - 4 * k, k, t, 1); flame(ctx, w * 0.86, gy - 4 * k, k, t, 2)
  // 以利亞在洞口
  person(ctx, w * 0.4, gy, k * 0.95, { robe: '#7a6a9c', head: 'turban', headColor: '#caa05a', beard: true, face: 'awe' })
  // 微小聲音的柔光(由洞口向以利亞)
  const sv = ctx.createRadialGradient(w * 0.4, gy - 40 * k, 0, w * 0.4, gy - 40 * k, (24 + Math.sin(t * 2) * 6) * k)
  sv.addColorStop(0, 'rgba(255,250,220,0.9)'); sv.addColorStop(1, 'rgba(255,250,220,0)')
  ctx.fillStyle = sv; ctx.beginPath(); ctx.arc(w * 0.4, gy - 40 * k, 30 * k, 0, TAU); ctx.fill()
}
function remnant(ctx, w, h, t) { // 5) 還有七千人未曾向巴力屈膝(你不孤單)
  const k = h / 240, gy = h * 0.86; eliSky(ctx, w, h)
  ctx.fillStyle = '#bcae84'; ctx.fillRect(0, gy, w, h - gy)
  const colors = ['#3a6a9c', '#a8553a', '#6a8a52', '#8a6a9c', '#c2873a', '#4a7a8a']
  for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) { const x = w * 0.34 + i * 42 * k - r * 20 * k; person(ctx, x, gy - r * 16 * k, k * (0.7 - r * 0.1), { robe: colors[(i + r) % 6], head: 'turban', face: 'calm' }) }
  person(ctx, w * 0.16, gy, k * 1.05, { robe: '#7a6a9c', head: 'turban', headColor: '#caa05a', beard: true, face: 'awe' })
}
function renew(ctx, w, h, t) { // 6) 重新得力:日出 + 把外袍披在以利沙身上
  const k = h / 240, gy = h * 0.86
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#f4c785'); g.addColorStop(1, '#fdebc4'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  const sun = ctx.createRadialGradient(w * 0.5, gy, 0, w * 0.5, gy, (90 + Math.sin(t * 1.5) * 10) * k); sun.addColorStop(0, 'rgba(255,238,170,0.95)'); sun.addColorStop(1, 'rgba(255,238,170,0)')
  ctx.fillStyle = sun; ctx.beginPath(); ctx.arc(w * 0.5, gy, 100 * k, 0, TAU); ctx.fill()
  ctx.fillStyle = '#bca06a'; ctx.fillRect(0, gy, w, h - gy)
  person(ctx, w * 0.4, gy, k * 1.1, { robe: '#7a6a9c', head: 'turban', headColor: '#caa05a', beard: true, arms: 'reach', reach: 22, reachUp: 6, face: 'joy' }) // 以利亞
  // 披在以利沙身上的外袍(連兩人之間)
  ctx.strokeStyle = '#6a4a8c'; ctx.lineWidth = 7 * k; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(w * 0.4 + 22 * k, gy - 60 * k); ctx.lineTo(w * 0.56, gy - 50 * k); ctx.stroke()
  person(ctx, w * 0.6, gy, k * 1.0, { robe: '#3a7a5a', head: 'turban', face: 'joy' }) // 以利沙
}
export const ELIJAH = { despair, broomtree, angelfood, stillvoice, remnant, renew }

// ===================== 大光奇兵 · 掃羅信主(徒 9) =====================
function journey(ctx, w, h, t) { // 1) 掃羅怒氣往大馬士革
  const k = h / 240, gy = h * 0.86
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#bcd0e0'); g.addColorStop(1, '#e8dcc0'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  cityRight(ctx, w, gy, k)
  ctx.fillStyle = '#c9aa78'; ctx.fillRect(0, gy, w, h - gy)
  const base = w * 0.18 + (Math.sin(t * 0.8) * 0.5 + 0.5) * w * 0.12
  person(ctx, base + 40 * k, gy, k * 0.95, { robe: '#8a5a3a', head: 'turban', walk: t * 7 + 1 })
  person(ctx, base + 18 * k, gy, k * 0.95, { robe: '#6a6a8a', head: 'turban', walk: t * 7 + 2 })
  person(ctx, base, gy, k * 1.15, { robe: '#7a2e2e', head: 'turban', beard: true, walk: t * 7, face: 'worry' }) // 掃羅(怒)
}
function light(ctx, w, h, t) { // 2) 大馬士革路上的大光,仆倒在地
  const k = h / 240, gy = h * 0.86
  ctx.fillStyle = '#e8dcc0'; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#c9aa78'; ctx.fillRect(0, gy, w, h - gy)
  // 同伴呆站
  person(ctx, w * 0.74, gy, k * 0.95, { robe: '#6a6a8a', head: 'turban', face: 'awe' })
  fallen(ctx, w * 0.42, gy, k * 1.15, '#7a2e2e') // 掃羅仆倒
  // 大光:由天而降的強光 + 白閃
  const cx = w * 0.42
  const beam = ctx.createRadialGradient(cx, h * 0.05, 0, cx, h * 0.05, (140 + Math.sin(t * 6) * 16) * k)
  beam.addColorStop(0, `rgba(255,255,255,${0.85 + Math.sin(t * 6) * 0.12})`); beam.addColorStop(0.5, 'rgba(255,250,220,0.5)'); beam.addColorStop(1, 'rgba(255,250,220,0)')
  ctx.fillStyle = beam; ctx.beginPath(); ctx.arc(cx, h * 0.05, 150 * k, 0, TAU); ctx.fill()
  rays(ctx, w, h, t, cx, 1)
}
function blind(ctx, w, h, t) { // 3) 瞎眼三天,禁食禱告(被人牽著)
  const k = h / 240, gy = h * 0.86
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#8a8496'); g.addColorStop(1, '#bcb4ac'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#9c8a72'; ctx.fillRect(0, gy, w, h - gy)
  // 同伴牽著掃羅
  person(ctx, w * 0.38, gy, k * 1.0, { robe: '#6a6a8a', head: 'turban', arms: 'reach', reach: 20, reachUp: 2, face: 'calm' })
  person(ctx, w * 0.56, gy, k * 1.1, { robe: '#7a2e2e', head: 'turban', beard: true, arms: 'pray', face: 'worry' })
  // 蒙眼布條
  ctx.strokeStyle = '#d8d0c4'; ctx.lineWidth = 4 * k; ctx.beginPath(); ctx.moveTo(w * 0.56 - 14 * k, gy - 86 * k); ctx.lineTo(w * 0.56 + 14 * k, gy - 86 * k); ctx.stroke()
}
function ananias(ctx, w, h, t) { // 4) 亞拿尼亞害怕卻順服去按手
  const k = h / 240, gy = h * 0.86
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#e7d8b8'); g.addColorStop(1, '#d3bd95'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#b79b6e'; ctx.fillRect(0, gy, w, h - gy)
  // 掃羅坐著等候
  person(ctx, w * 0.62, gy, k * 1.05, { robe: '#7a2e2e', head: 'turban', beard: true, pose: 'kneel', arms: 'pray', face: 'calm' })
  // 亞拿尼亞(害怕)伸手按手
  person(ctx, w * 0.4, gy, k * 1.1, { robe: '#3a7a5a', head: 'turban', beard: true, arms: 'reach', reach: 22, reachUp: 8, face: 'worry' })
  speechBubble(ctx, w * 0.4, gy - 104 * k, k, '主啊,我聽見許多人說……')
}
function scales(ctx, w, h, t) { // 5) 鱗片掉下、復明、受洗
  const k = h / 240, gy = h * 0.86
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#cfe4ee'); g.addColorStop(1, '#eef0dc'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#b8a070'; ctx.fillRect(0, gy, w, h - gy)
  person(ctx, w * 0.5, gy, k * 1.2, { robe: '#7a2e2e', head: 'turban', beard: true, arms: 'up', face: 'joy' })
  // 掉落的鱗片
  for (let i = 0; i < 8; i++) { const p = (t * 0.8 + i / 8) % 1; ctx.fillStyle = `rgba(160,170,180,${0.8 * (1 - p)})`; ctx.beginPath(); ctx.ellipse(w * 0.5 - 8 * k + (i % 2) * 16 * k, gy - 92 * k + p * 60 * k, 3 * k, 1.6 * k, 0, 0, TAU); ctx.fill() }
  // 復明的光
  const gl = ctx.createRadialGradient(w * 0.5, gy - 88 * k, 0, w * 0.5, gy - 88 * k, 30 * k); gl.addColorStop(0, `rgba(255,250,210,${0.6 + Math.sin(t * 3) * 0.2})`); gl.addColorStop(1, 'rgba(255,250,210,0)')
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(w * 0.5, gy - 88 * k, 30 * k, 0, TAU); ctx.fill()
}
function apostle(ctx, w, h, t) { // 6) 逼迫者變成使徒保羅,放膽傳道
  const k = h / 240, gy = h * 0.86
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#bfe7ea'); g.addColorStop(1, '#fdf3d4'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  const gl = ctx.createRadialGradient(w * 0.28, h * 0.22, 0, w * 0.28, h * 0.22, 70 * k); gl.addColorStop(0, `rgba(255,250,210,${0.6 + Math.sin(t * 2) * 0.15})`); gl.addColorStop(1, 'rgba(255,250,210,0)')
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(w * 0.28, h * 0.22, 70 * k, 0, TAU); ctx.fill()
  ctx.fillStyle = '#bda072'; ctx.fillRect(0, gy, w, h - gy)
  // 十字架光
  ctx.strokeStyle = 'rgba(255,240,180,0.9)'; ctx.lineWidth = 4 * k; ctx.beginPath(); ctx.moveTo(w * 0.28, h * 0.12); ctx.lineTo(w * 0.28, h * 0.34); ctx.moveTo(w * 0.22, h * 0.2); ctx.lineTo(w * 0.34, h * 0.2); ctx.stroke()
  person(ctx, w * 0.28, gy, k * 1.2, { robe: '#3a6a9c', head: 'turban', headColor: '#d8c39a', beard: true, arms: 'speak', face: 'joy' }) // 保羅
  const colors = ['#a8553a', '#6a8a52', '#8a6a9c', '#c2873a']
  for (let i = 0; i < 4; i++) person(ctx, w * 0.58 + i * 40 * k, gy, k * 0.9, { robe: colors[i], head: 'turban', face: 'calm' })
}
export const SAUL = { journey, light, blind, ananias, scales, apostle }

// ===================== 但以理 · 金像之夢(但 2) =====================
function statueFig(ctx, cx, gy, k, lean = 0) {
  const top = gy - 150 * k
  ctx.save(); ctx.translate(cx, gy); ctx.rotate(lean); ctx.translate(-cx, -gy)
  const seg = (y0, y1, wT, wB, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(cx - wT * k, y0); ctx.lineTo(cx + wT * k, y0); ctx.lineTo(cx + wB * k, y1); ctx.lineTo(cx - wB * k, y1); ctx.closePath(); ctx.fill() }
  ctx.fillStyle = '#e8c23a'; ctx.beginPath(); ctx.arc(cx, top, 14 * k, 0, TAU); ctx.fill() // 金頭
  seg(top + 12 * k, top + 52 * k, 19, 21, '#d2d8e0') // 銀胸臂
  seg(top + 52 * k, top + 94 * k, 21, 18, '#b87333') // 銅腹腿
  seg(top + 94 * k, top + 128 * k, 16, 13, '#7a7d82') // 鐵小腿
  ctx.fillStyle = '#7a7d82'; ctx.fillRect(cx - 13 * k, top + 128 * k, 11 * k, 20 * k)
  ctx.fillStyle = '#9c6b4a'; ctx.fillRect(cx + 2 * k, top + 128 * k, 11 * k, 20 * k) // 半鐵半泥腳
  ctx.restore()
}
function goldStatue(ctx, w, h, t) {
  const k = h / 240, gy = h * 0.9
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2a2440'); g.addColorStop(1, '#5a4a6a'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  const gl = ctx.createRadialGradient(w * 0.5, gy - 120 * k, 0, w * 0.5, gy - 120 * k, 130 * k); gl.addColorStop(0, `rgba(255,240,180,${0.25 + Math.sin(t * 2) * 0.08})`); gl.addColorStop(1, 'rgba(255,240,180,0)')
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(w * 0.5, gy - 120 * k, 130 * k, 0, TAU); ctx.fill()
  ctx.fillStyle = '#3a3450'; ctx.fillRect(0, gy, w, h - gy)
  statueFig(ctx, w * 0.5, gy, k * 1.1)
  person(ctx, w * 0.16, gy, k * 0.95, { robe: '#6a3a8c', head: 'crown', beard: true, face: 'awe' }) // 王
}
function goldStone(ctx, w, h, t) { // 非人手鑿的石頭打在腳上,大像砸碎,石頭成大山
  const k = h / 240, gy = h * 0.9
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3a3450'); g.addColorStop(1, '#6a5a7a'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  // 成形的大山(右後)
  ctx.fillStyle = '#5a6a52'; ctx.beginPath(); ctx.moveTo(w * 0.5, gy); ctx.lineTo(w * 0.8, gy - 120 * k); ctx.lineTo(w, gy); ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#3a3450'; ctx.fillRect(0, gy, w, h - gy)
  statueFig(ctx, w * 0.42, gy, k, Math.sin(t * 2) * 0.06 + 0.06) // 傾斜搖晃
  // 碎塊
  for (let i = 0; i < 6; i++) { const p = (t * 0.7 + i / 6) % 1; ctx.fillStyle = `rgba(170,150,120,${0.8 * (1 - p)})`; ctx.fillRect(w * 0.42 - 10 * k + i * 5 * k, gy - 24 * k - p * 30 * k, 5 * k, 5 * k) }
  // 滾來的石頭
  ctx.fillStyle = '#8a8276'; ctx.beginPath(); ctx.arc(w * 0.3 + Math.sin(t * 2) * 6 * k, gy - 14 * k, 13 * k, 0, TAU); ctx.fill()
}

// ===================== 但以理 · 牆上的字(但 5) =====================
function wallHand(ctx, w, h, t) { // 伯沙撒的宴席:一隻手在牆上寫字
  const k = h / 240, gy = h * 0.88
  ctx.fillStyle = '#2e2a3a'; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#46405a'; ctx.fillRect(0, 0, w, gy) // 牆
  ctx.fillStyle = '#3a3448'; ctx.fillRect(0, gy, w, h - gy)
  // 發光的字
  ctx.fillStyle = `rgba(255,236,150,${0.7 + Math.sin(t * 4) * 0.25})`; ctx.font = `700 ${20 * k}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('彌尼 提客勒 烏法珥新', w * 0.52, h * 0.3)
  // 寫字的手
  ctx.fillStyle = '#e8bb8d'; ctx.beginPath(); ctx.ellipse(w * 0.52 + 90 * k, h * 0.3, 8 * k, 5 * k, -0.4, 0, TAU); ctx.fill()
  for (let i = 0; i < 4; i++) { ctx.fillRect(w * 0.52 + 96 * k + i * 2.5 * k, h * 0.3 - 2 * k, 1.8 * k, 8 * k) }
  // 驚恐的王
  person(ctx, w * 0.2, gy, k * 1.0, { robe: '#7a2e4a', head: 'crown', beard: true, face: 'awe' })
}
function wallWord(ctx, w, h, t) { // 但以理在發光的字前解讀
  const k = h / 240, gy = h * 0.88
  ctx.fillStyle = '#46405a'; ctx.fillRect(0, 0, w, gy); ctx.fillStyle = '#3a3448'; ctx.fillRect(0, gy, w, h - gy)
  ctx.fillStyle = `rgba(255,236,150,${0.7 + Math.sin(t * 3) * 0.2})`
  for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.8; ctx.fillRect(w * 0.4 + i * 60 * k, h * 0.22, 44 * k, 30 * k) }
  ctx.globalAlpha = 1; ctx.fillStyle = '#3a2a10'; ctx.font = `700 ${15 * k}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ;['彌尼', '提客勒', '烏法珥新'].forEach((wd, i) => ctx.fillText(wd, w * 0.4 + 22 * k + i * 60 * k, h * 0.22 + 15 * k))
  person(ctx, w * 0.2, gy, k * 1.05, { robe: '#3a6a9c', head: 'turban', beard: true, arms: 'speak', face: 'calm' }) // 但以理
}

// ===================== 但以理 · 神掌權五幕(但 7) =====================
function beasts(ctx, w, h, t) { // 第1幕:四獸從翻騰的海中上來
  const k = h / 240, gy = h * 0.7
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3a4a6a'); g.addColorStop(1, '#1e2a44'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  // 翻騰的海
  ctx.fillStyle = '#24406a'; ctx.beginPath(); ctx.moveTo(0, gy)
  for (let x = 0; x <= w; x += 18) ctx.lineTo(x, gy + Math.sin(x * 0.05 + t * 3) * 8 * k); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill()
  // 四個獸影
  const beast = (x, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, gy + 6 * k, 18 * k, 12 * k, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 10 * k, gy); ctx.lineTo(x + 22 * k, gy - 16 * k); ctx.lineTo(x + 16 * k, gy + 2 * k); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#e8c23a'; ctx.fillRect(x + 17 * k, gy - 12 * k, 2 * k, 2 * k) }
  beast(w * 0.18, '#7a3a2a'); beast(w * 0.4, '#5a3a6a'); beast(w * 0.6, '#3a5a3a'); beast(w * 0.82, '#2a2a2a')
}
function throne(ctx, w, h, t) { // 第2幕:亙古常在者的寶座,千千萬萬侍立
  const k = h / 240, gy = h * 0.86
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#f7e9b0'); g.addColorStop(1, '#e8c87a'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  rays(ctx, w, h, t, w * 0.5, 0.8)
  // 火焰寶座
  ctx.fillStyle = '#caa05a'; ctx.fillRect(w * 0.44, h * 0.22, w * 0.12, h * 0.34)
  for (let i = 0; i < 5; i++) flame(ctx, w * 0.45 + i * (w * 0.025), h * 0.56, k, t, i)
  // 千千萬萬侍立(小點)
  ctx.fillStyle = 'rgba(120,90,40,0.5)'
  for (let i = 0; i < 30; i++) ctx.fillRect((i * 37) % w, gy - 6 * k - (i % 3) * 4 * k, 4 * k, 10 * k)
}
function sonofman(ctx, w, h, t) { // 第3幕:人子駕雲而來,得權柄
  const k = h / 240
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#9ec4e0'); g.addColorStop(1, '#e7eef4'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  // 雲
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  for (const [cx, cy, r] of [[w * 0.5, h * 0.5, 40], [w * 0.42, h * 0.55, 30], [w * 0.58, h * 0.55, 32]]) { ctx.beginPath(); ctx.arc(cx + Math.sin(t) * 4 * k, cy, r * k, 0, TAU); ctx.fill() }
  const gl = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.4, 60 * k); gl.addColorStop(0, `rgba(255,250,210,${0.7 + Math.sin(t * 2) * 0.2})`); gl.addColorStop(1, 'rgba(255,250,210,0)')
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(w * 0.5, h * 0.4, 60 * k, 0, TAU); ctx.fill()
  person(ctx, w * 0.5, h * 0.62, k * 1.1, { robe: '#f4f1e6', head: 'turban', headColor: '#f0e6c8', arms: 'up', face: 'calm' })
}
function kingdomRest(ctx, w, h, t) { // 第4/5幕:國度賜給聖民,得享安息
  const k = h / 240, gy = h * 0.86
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#bfe7ea'); g.addColorStop(1, '#fdf3d4'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  const sun = ctx.createRadialGradient(w * 0.5, h * 0.22, 0, w * 0.5, h * 0.22, 80 * k); sun.addColorStop(0, `rgba(255,244,190,${0.7 + Math.sin(t * 2) * 0.12})`); sun.addColorStop(1, 'rgba(255,244,190,0)')
  ctx.fillStyle = sun; ctx.beginPath(); ctx.arc(w * 0.5, h * 0.22, 80 * k, 0, TAU); ctx.fill()
  ctx.fillStyle = '#7aa86a'; ctx.fillRect(0, gy, w, h - gy)
  const colors = ['#3a6a9c', '#a8553a', '#6a8a52', '#8a6a9c', '#c2873a']
  for (let i = 0; i < 5; i++) person(ctx, w * 0.2 + i * (w * 0.15), gy, k * 0.95, { robe: colors[i], head: 'turban', arms: 'up', face: 'joy' })
}
export const DANIEL = { goldStatue, goldStone, wallHand, wallWord, beasts, throne, sonofman, kingdomRest }

// ===================== 出埃及記 =====================
function cloud(ctx, x, y, k, s = 1) {
  ctx.fillStyle = 'rgba(245,245,250,0.95)'
  for (const [dx, dy, r] of [[0, 0, 22], [-18, 4, 15], [18, 4, 16], [-6, -10, 14], [10, -8, 13]]) { ctx.beginPath(); ctx.arc(x + dx * s * k, y + dy * s * k, r * s * k, 0, TAU); ctx.fill() }
}
function pyramid(ctx, x, gy, k, w2) { ctx.fillStyle = '#caa86a'; ctx.beginPath(); ctx.moveTo(x - w2 * k, gy); ctx.lineTo(x, gy - w2 * 0.8 * k); ctx.lineTo(x + w2 * k, gy); ctx.closePath(); ctx.fill() }

// 十災(出 7–11):尼羅河變血、蛙災,昏天黑地
function plagues(ctx, w, h, t) {
  const k = h / 240, gy = h * 0.66
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3a3038'); g.addColorStop(1, '#6a4a44'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  pyramid(ctx, w * 0.78, gy, k, 60); pyramid(ctx, w * 0.9, gy, k, 44)
  // 變血的尼羅河
  const r = ctx.createLinearGradient(0, gy, 0, h); r.addColorStop(0, '#a52a2a'); r.addColorStop(1, '#6a1818'); ctx.fillStyle = r; ctx.fillRect(0, gy, w, h - gy)
  ctx.strokeStyle = 'rgba(60,10,10,0.5)'; ctx.lineWidth = 2 * k
  for (let i = 0; i < 5; i++) { const yy = gy + 14 * k + i * 16 * k; ctx.beginPath(); for (let x = 0; x <= w; x += 16) { const yo = yy + Math.sin(x * 0.05 + t * 2 + i) * 4 * k; x ? ctx.lineTo(x, yo) : ctx.moveTo(x, yo) } ctx.stroke() }
  // 跳動的蛙
  ctx.fillStyle = '#4a7a3a'
  for (let i = 0; i < 7; i++) { const bx = (i * 150 + 40) % w; const by = gy - 6 * k - Math.abs(Math.sin(t * 3 + i)) * 22 * k; ctx.beginPath(); ctx.ellipse(bx, by, 8 * k, 6 * k, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#2c1810'; ctx.fillRect(bx - 3 * k, by - 4 * k, 1.6 * k, 1.6 * k); ctx.fillRect(bx + 1.4 * k, by - 4 * k, 1.6 * k, 1.6 * k); ctx.fillStyle = '#4a7a3a' }
}
// 逾越節之夜(出 12):門楣門框塗血,滅命者越過
function passover(ctx, w, h, t) {
  const k = h / 240, gy = h * 0.88
  ctx.fillStyle = '#1e2138'; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = 'rgba(255,250,210,0.9)'; ctx.beginPath(); ctx.arc(w * 0.82, h * 0.2, 18 * k, 0, TAU); ctx.fill() // 月
  ctx.fillStyle = '#3a3448'; ctx.fillRect(0, gy, w, h - gy)
  // 房子 + 門
  ctx.fillStyle = '#5a4a3a'; ctx.fillRect(w * 0.3, gy - 110 * k, w * 0.4, 110 * k)
  ctx.fillStyle = '#2e2418'; ctx.fillRect(w * 0.44, gy - 70 * k, w * 0.12, 70 * k) // 門洞
  // 門楣門框的血
  ctx.fillStyle = '#a52a2a'
  ctx.fillRect(w * 0.43, gy - 74 * k, w * 0.14, 5 * k) // 門楣
  ctx.fillRect(w * 0.435, gy - 74 * k, 5 * k, 70 * k); ctx.fillRect(w * 0.555 - 5 * k, gy - 74 * k, 5 * k, 70 * k) // 兩門框
  // 越過的滅命者陰影
  const sx = (t * 90) % (w + 200) - 100
  ctx.fillStyle = 'rgba(10,10,20,0.5)'; ctx.beginPath(); ctx.ellipse(sx, h * 0.16, 60 * k, 16 * k, 0, 0, TAU); ctx.fill()
  // 逾越節羔羊
  ctx.fillStyle = '#f0ece0'; ctx.beginPath(); ctx.ellipse(w * 0.2, gy - 8 * k, 14 * k, 9 * k, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(w * 0.2 - 14 * k, gy - 12 * k, 6 * k, 0, TAU); ctx.fill()
}
// 西奈山(出 19–20):山頂煙火雷電,摩西上山,百姓在山下
function sinai(ctx, w, h, t) {
  const k = h / 240, gy = h * 0.86
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3a3a52'); g.addColorStop(1, '#8a7a6a'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#5a5048'; ctx.beginPath(); ctx.moveTo(w * 0.2, gy); ctx.lineTo(w * 0.5, h * 0.12); ctx.lineTo(w * 0.82, gy); ctx.closePath(); ctx.fill()
  // 山頂煙 + 火 + 雷
  cloud(ctx, w * 0.5, h * 0.13, k, 1.4)
  flame(ctx, w * 0.48, h * 0.16, k, t, 1); flame(ctx, w * 0.53, h * 0.16, k, t, 2)
  if (Math.sin(t * 3) > 0.5) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5 * k; ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.2); ctx.lineTo(w * 0.46, h * 0.3); ctx.lineTo(w * 0.52, h * 0.32); ctx.lineTo(w * 0.48, h * 0.42); ctx.stroke() }
  ctx.fillStyle = '#5a4a3a'; ctx.fillRect(0, gy, w, h - gy)
  person(ctx, w * 0.42, h * 0.52, k * 0.7, { robe: '#caa05a', head: 'turban', beard: true, face: 'awe' }) // 摩西上山
  const colors = ['#3a6a9c', '#a8553a', '#6a8a52', '#8a6a9c']
  for (let i = 0; i < 4; i++) person(ctx, w * 0.16 + i * 26 * k, gy, k * 0.8, { robe: colors[i], head: 'turban', face: 'awe' })
}
// 兩塊法版(出 20)
function tablets(ctx, w, h, t) {
  const k = h / 240, cx = w * 0.5, cy = h * 0.46
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#6a6a86'); g.addColorStop(1, '#aca6b6'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  const gl = ctx.createRadialGradient(cx, cy, 0, cx, cy, 110 * k); gl.addColorStop(0, `rgba(255,250,210,${0.4 + Math.sin(t * 2) * 0.12})`); gl.addColorStop(1, 'rgba(255,250,210,0)')
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(cx, cy, 110 * k, 0, TAU); ctx.fill()
  const tab = (x) => { ctx.fillStyle = '#d8d0c0'; ctx.beginPath(); ctx.moveTo(x - 34 * k, cy + 50 * k); ctx.lineTo(x - 34 * k, cy - 40 * k); ctx.quadraticCurveTo(x - 34 * k, cy - 56 * k, x, cy - 56 * k); ctx.quadraticCurveTo(x + 34 * k, cy - 56 * k, x + 34 * k, cy - 40 * k); ctx.lineTo(x + 34 * k, cy + 50 * k); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#8a8276'; ctx.lineWidth = 2 * k; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x - 24 * k, cy - 34 * k + i * 16 * k); ctx.lineTo(x + 24 * k, cy - 34 * k + i * 16 * k); ctx.stroke() } }
  tab(cx - 40 * k); tab(cx + 40 * k)
}
// 會幕榮光五幕(出 32–34、40)
function goldcalf(ctx, w, h, t) {
  const k = h / 240, gy = h * 0.86
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#5a4a3a'); g.addColorStop(1, '#8a6a4a'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#6a5440'; ctx.fillRect(0, gy, w, h - gy)
  ctx.fillStyle = '#8a6a44'; ctx.fillRect(w * 0.46, gy - 24 * k, 30 * k, 24 * k) // 壇座
  ctx.fillStyle = '#e8c23a'; ctx.beginPath(); ctx.ellipse(w * 0.5, gy - 36 * k, 18 * k, 12 * k, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(w * 0.66, gy - 42 * k, 6 * k, 0, TAU); ctx.fill(); ctx.fillRect(w * 0.62, gy - 50 * k, 3 * k, 6 * k); ctx.fillRect(w * 0.66, gy - 50 * k, 3 * k, 6 * k) // 金牛犢
  const colors = ['#a8553a', '#6a8a52', '#8a6a9c']
  for (let i = 0; i < 3; i++) person(ctx, w * 0.2 + i * 30 * k, gy, k * 0.9, { robe: colors[i], head: 'turban', arms: 'up', face: 'neutral' })
}
function intercede(ctx, w, h, t) { // 摩西代求
  const k = h / 240, gy = h * 0.86
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#6a6a8c'); g.addColorStop(1, '#bcb4c4'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  rays(ctx, w, h, t, w * 0.5, 0.7)
  ctx.fillStyle = '#7a6a5a'; ctx.fillRect(0, gy, w, h - gy)
  person(ctx, w * 0.5, gy, k * 1.25, { robe: '#caa05a', head: 'turban', beard: true, arms: 'up', face: 'awe' })
}
function glory(ctx, w, h, t) { // 磐石穴中,神的榮耀經過
  const k = h / 240, gy = h * 0.86
  ctx.fillStyle = '#4a4438'; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#3a352c'; ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, h * 0.3); ctx.lineTo(w * 0.4, h * 0.5); ctx.lineTo(w * 0.4, h); ctx.closePath(); ctx.fill() // 磐石
  person(ctx, w * 0.22, gy, k * 0.95, { robe: '#caa05a', head: 'turban', beard: true, face: 'awe' })
  // 經過的榮耀(由右向左掃過的強光)
  const sx = w * 0.9 - ((t * 60) % (w * 0.7))
  const gl = ctx.createRadialGradient(sx, h * 0.42, 0, sx, h * 0.42, 80 * k); gl.addColorStop(0, `rgba(255,250,215,0.95)`); gl.addColorStop(1, 'rgba(255,250,215,0)')
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(sx, h * 0.42, 90 * k, 0, TAU); ctx.fill()
}
function tabernacle(ctx, w, h, t) { // 會幕建成
  const k = h / 240, gy = h * 0.86
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#cfe0e8'); g.addColorStop(1, '#e8dcc0'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#c2a878'; ctx.fillRect(0, gy, w, h - gy)
  // 圍幔
  ctx.strokeStyle = '#d8c39a'; ctx.lineWidth = 3 * k; ctx.strokeRect(w * 0.28, gy - 56 * k, w * 0.44, 56 * k)
  // 帳幕(條紋罩棚)
  ctx.fillStyle = '#7a5a8c'; ctx.fillRect(w * 0.42, gy - 76 * k, w * 0.16, 40 * k)
  ctx.fillStyle = '#b94a4a'; for (let i = 0; i < 4; i++) ctx.fillRect(w * 0.42, gy - 76 * k + i * 10 * k, w * 0.16, 4 * k)
  ctx.fillStyle = '#caa05a'; ctx.fillRect(w * 0.34, gy - 18 * k, 14 * k, 18 * k) // 銅祭壇
}
function gloryfill(ctx, w, h, t) { // 榮光充滿會幕
  const k = h / 240, gy = h * 0.86
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#f7e9b0'); g.addColorStop(1, '#f0d59a'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#bda072'; ctx.fillRect(0, gy, w, h - gy)
  ctx.fillStyle = '#7a5a8c'; ctx.fillRect(w * 0.42, gy - 76 * k, w * 0.16, 40 * k)
  ctx.fillStyle = '#b94a4a'; for (let i = 0; i < 4; i++) ctx.fillRect(w * 0.42, gy - 76 * k + i * 10 * k, w * 0.16, 4 * k)
  // 降下充滿的雲柱榮光
  cloud(ctx, w * 0.5, gy - 110 * k + Math.sin(t * 1.5) * 6 * k, k, 1.6)
  const gl = ctx.createRadialGradient(w * 0.5, gy - 70 * k, 0, w * 0.5, gy - 70 * k, 90 * k); gl.addColorStop(0, `rgba(255,250,210,${0.6 + Math.sin(t * 2) * 0.2})`); gl.addColorStop(1, 'rgba(255,250,210,0)')
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(w * 0.5, gy - 70 * k, 90 * k, 0, TAU); ctx.fill()
  rays(ctx, w, h, t, w * 0.5, 0.8)
}
export const EXODUS = { plagues, passover, sinai, tablets, goldcalf, intercede, glory, tabernacle, gloryfill }

// ══════════════════ 路得記(RUTH)場景 ══════════════════
// L6 手繪:離別路口/緊抱宣告/禾場夜/城門脫鞋/懷抱俄備得/家譜星鏈。零美術檔。
function ruthSky(ctx, w, h, top, bot) { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(1, bot); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h) }
function ruthRoad(ctx, w, h, t) { // 摩押路口:俄珥巴遠去,路得留下
  const k = h / 240, gy = h * 0.86
  ruthSky(ctx, w, h, '#d9a06a', '#e8cf9c')
  ctx.fillStyle = '#c9a06a'; ctx.fillRect(0, gy, w, h - gy)
  // 岔路(兩條土徑)
  ctx.strokeStyle = '#b08a52'; ctx.lineWidth = 10 * k; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(w * 0.5, gy + 4 * k); ctx.lineTo(w * 0.16, h); ctx.moveTo(w * 0.5, gy + 4 * k); ctx.lineTo(w * 0.86, h); ctx.stroke()
  // 俄珥巴(右側遠去)
  person(ctx, w * 0.82, gy, k * 0.9, { robe: '#9c7a4a', headColor: '#e0d0a8', walk: t * 6, face: 'calm' })
  // 拿俄米(年長,愁苦)與路得(靠近伸手)
  person(ctx, w * 0.42, gy, k * 1.05, { robe: '#7a7a8c', headColor: '#d8d0c0', face: 'worry' })
  person(ctx, w * 0.26, gy, k, { robe: '#b06a5a', headColor: '#e8d8b8', arms: 'reach', reach: 20, reachUp: 2, face: 'calm' })
}
function ruthCling(ctx, w, h, t) { // 路得的宣告:你的國就是我的國
  const k = h / 240, gy = h * 0.86
  ruthSky(ctx, w, h, '#e3b478', '#efd9a8'); ctx.fillStyle = '#c9a06a'; ctx.fillRect(0, gy, w, h - gy)
  rays(ctx, w, h, t, w * 0.36, 0.5)
  person(ctx, w * 0.5, gy, k * 1.05, { robe: '#7a7a8c', headColor: '#d8d0c0', face: 'awe' })
  person(ctx, w * 0.36, gy, k, { robe: '#b06a5a', headColor: '#e8d8b8', pose: 'kneel', arms: 'reach', reach: 20, reachUp: 10, face: 'calm' })
  speechBubble(ctx, w * 0.34, gy - 100 * k, k, '你的國就是我的國')
}
function ruthThresh(ctx, w, h, t) { // 禾場夜:麥堆、睡臥的波阿斯、敬候的路得、星月
  const k = h / 240, gy = h * 0.86
  ruthSky(ctx, w, h, '#1d2a4a', '#3a4a6a'); ctx.fillStyle = '#5a4a34'; ctx.fillRect(0, gy, w, h - gy)
  ctx.fillStyle = '#f0e6c0'
  for (let i = 0; i < 14; i++) { const sx = ((i * 137) % 100) / 100 * w, sy = ((i * 61) % 45) / 100 * h; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + i); ctx.fillRect(sx, sy, 2 * k, 2 * k) }
  ctx.globalAlpha = 1
  ctx.beginPath(); ctx.arc(w * 0.84, h * 0.16, 12 * k, 0, TAU); ctx.fillStyle = '#f4ecc8'; ctx.fill() // 月
  // 麥堆(兩座)
  ctx.fillStyle = '#b89858'
  ctx.beginPath(); ctx.arc(w * 0.7, gy, 34 * k, Math.PI, 0); ctx.fill()
  ctx.beginPath(); ctx.arc(w * 0.14, gy, 24 * k, Math.PI, 0); ctx.fill()
  sleeper(ctx, w * 0.56, gy, k * 1.15, '#5a7a9c') // 波阿斯睡在麥堆旁
  person(ctx, w * 0.34, gy, k * 0.95, { robe: '#b06a5a', headColor: '#e8d8b8', pose: 'kneel', arms: 'pray', face: 'calm' }) // 路得敬候
}
function ruthGate(ctx, w, h, t) { // 城門口:長老作見證,脫鞋為證
  const k = h / 240, gy = h * 0.86
  ruthSky(ctx, w, h, '#cfe0e8', '#e8dcc0'); ctx.fillStyle = '#c2a878'; ctx.fillRect(0, gy, w, h - gy)
  // 城門(雙塔+拱門)
  ctx.fillStyle = '#a89060'
  ctx.fillRect(w * 0.06, gy - 120 * k, 34 * k, 120 * k); ctx.fillRect(w * 0.3, gy - 120 * k, 34 * k, 120 * k)
  ctx.fillRect(w * 0.06, gy - 132 * k, w * 0.24 + 34 * k, 16 * k)
  ctx.fillStyle = '#6a5636'; ctx.beginPath(); ctx.arc(w * 0.215, gy, 26 * k, Math.PI, 0); ctx.fill() // 拱門
  // 長老兩位與波阿斯宣告
  person(ctx, w * 0.56, gy, k, { robe: '#7a8a52', headColor: '#e0d0a8', beard: true, face: 'calm' })
  person(ctx, w * 0.7, gy, k, { robe: '#9c7a4a', headColor: '#d8c8a0', beard: true, face: 'calm' })
  person(ctx, w * 0.86, gy, k * 1.1, { robe: '#5a7a9c', headColor: '#d8c39a', beard: true, arms: 'speak', face: 'joy' }) // 波阿斯
  // 脫下的鞋(見證的記號,置中發亮)
  const sx = w * 0.44, sy = gy - 6 * k
  const gl = ctx.createRadialGradient(sx, sy, 0, sx, sy, 30 * k); gl.addColorStop(0, 'rgba(255,240,180,0.7)'); gl.addColorStop(1, 'rgba(255,240,180,0)')
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(sx, sy, 30 * k, 0, TAU); ctx.fill()
  ctx.fillStyle = '#7a5636'; ctx.beginPath(); ctx.ellipse(sx, sy, 13 * k, 5 * k, -0.2, 0, TAU); ctx.fill()
  ctx.fillStyle = '#8a6646'; ctx.fillRect(sx - 4 * k, sy - 9 * k, 8 * k, 7 * k)
}
function ruthBaby(ctx, w, h, t) { // 拿俄米得孩子了:懷抱俄備得
  const k = h / 240, gy = h * 0.86
  ruthSky(ctx, w, h, '#f2dfae', '#f7ecd2'); ctx.fillStyle = '#c9a06a'; ctx.fillRect(0, gy, w, h - gy)
  rays(ctx, w, h, t, w * 0.5, 0.7)
  house(ctx, w * 0.88, gy, k)
  person(ctx, w * 0.5, gy, k * 1.1, { robe: '#7a7a8c', headColor: '#d8d0c0', arms: 'pray', face: 'joy' }) // 拿俄米
  const by = gy - 52 * k
  ctx.fillStyle = '#f4e8d0'; ctx.beginPath(); ctx.ellipse(w * 0.5, by, 12 * k, 8 * k, 0.15, 0, TAU); ctx.fill() // 襁褓
  ctx.fillStyle = '#e8bb8d'; ctx.beginPath(); ctx.arc(w * 0.5 + 8 * k, by - 2 * k, 5 * k, 0, TAU); ctx.fill() // 嬰孩頭
  ctx.fillStyle = '#2c2016'; ctx.beginPath(); ctx.arc(w * 0.5 + 7 * k, by - 3 * k, 0.9 * k, 0, TAU); ctx.arc(w * 0.5 + 9.5 * k, by - 3 * k, 0.9 * k, 0, TAU); ctx.fill()
  // 鄰舍婦人歡喜
  person(ctx, w * 0.24, gy, k * 0.95, { robe: '#9c6a8a', headColor: '#e8d8b8', arms: 'up', face: 'joy' })
  person(ctx, w * 0.74, gy, k * 0.95, { robe: '#b06a5a', headColor: '#e8d8b8', arms: 'up', face: 'joy' })
}
function ruthLine(ctx, w, h, t) { // 家譜星鏈:路得→俄備得→耶西→大衛→……→基督
  const k = h / 240
  ruthSky(ctx, w, h, '#141c38', '#2a3a5c')
  ctx.fillStyle = '#f0e6c0'
  for (let i = 0; i < 18; i++) { const sx = ((i * 97) % 100) / 100 * w, sy = ((i * 53) % 70) / 100 * h; ctx.globalAlpha = 0.4 + 0.5 * Math.sin(t * 2 + i * 1.7); ctx.fillRect(sx, sy, 2 * k, 2 * k) }
  ctx.globalAlpha = 1
  const names = ['路得', '俄備得', '耶西', '大衛']
  const x0 = w * 0.14, y0 = h * 0.78, x1 = w * 0.66, y1 = h * 0.3
  ctx.strokeStyle = 'rgba(240,220,150,0.8)'; ctx.lineWidth = 2.4 * k
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke()
  ctx.setLineDash([5 * k, 6 * k]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(w * 0.84, h * 0.16); ctx.stroke(); ctx.setLineDash([])
  names.forEach((nm, i) => {
    const p = i / (names.length - 1), nx = lerp(x0, x1, p), ny = lerp(y0, y1, p)
    ctx.fillStyle = '#f7ecc8'; ctx.beginPath(); ctx.arc(nx, ny, 16 * k, 0, TAU); ctx.fill()
    ctx.strokeStyle = '#caa05a'; ctx.lineWidth = 2 * k; ctx.stroke()
    ctx.fillStyle = '#5a4318'; ctx.font = `bold ${9.5 * k}px "Noto Sans TC","Microsoft JhengHei",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(nm, nx, ny)
  })
  // 終點:基督的大光(伯利恆之星)
  const cx = w * 0.84, cy = h * 0.16, pul = 1 + Math.sin(t * 2.2) * 0.12
  const gl = ctx.createRadialGradient(cx, cy, 0, cx, cy, 46 * k * pul); gl.addColorStop(0, 'rgba(255,250,210,0.95)'); gl.addColorStop(1, 'rgba(255,250,210,0)')
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(cx, cy, 48 * k * pul, 0, TAU); ctx.fill()
  ctx.strokeStyle = '#fff7d8'; ctx.lineWidth = 2.6 * k; ctx.lineCap = 'round'; ctx.beginPath()
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI; ctx.moveTo(cx - Math.cos(a) * 20 * k * pul, cy - Math.sin(a) * 20 * k * pul); ctx.lineTo(cx + Math.cos(a) * 20 * k * pul, cy + Math.sin(a) * 20 * k * pul) }
  ctx.stroke()
  ctx.fillStyle = '#f7ecc8'; ctx.font = `bold ${11 * k}px "Noto Sans TC","Microsoft JhengHei",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
  ctx.fillText('基督', cx, cy + 60 * k)
}
export const RUTH = { ruthRoad, ruthCling, ruthThresh, ruthGate, ruthBaby, ruthLine }

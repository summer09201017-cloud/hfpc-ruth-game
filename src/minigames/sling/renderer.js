// 繪製層：只讀 game 狀態、不改狀態。邏輯座標固定 960×540，依畫布父層尺寸等比縮放置中。
import { WORLD, GROUND_Y, DAVID, GOLIATH, AIM } from './config.js'
import { deg2rad } from './projectile.js'

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
  }

  // 量父層尺寸 → 設定畫布像素(含 DPR)→ 回傳邏輯→實際的縮放與置中位移。
  _fit() {
    const parent = this.canvas.parentElement || this.canvas
    const cw = parent.clientWidth || WORLD.w
    const ch = parent.clientHeight || WORLD.h
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    if (this.canvas.width !== Math.round(cw * dpr) || this.canvas.height !== Math.round(ch * dpr)) {
      this.canvas.width = Math.round(cw * dpr)
      this.canvas.height = Math.round(ch * dpr)
    }
    const scale = Math.min(cw / WORLD.w, ch / WORLD.h)
    const ox = (cw - WORLD.w * scale) / 2
    const oy = (ch - WORLD.h * scale) / 2
    return { dpr, scale, ox, oy }
  }

  draw(game) {
    const { ctx } = this
    const { dpr, scale, ox, oy } = this._fit()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    // 邊框外的底色（letterbox）
    ctx.fillStyle = '#1b2a36'
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    ctx.save()
    ctx.translate(ox, oy)
    ctx.scale(scale, scale)
    ctx.beginPath()
    ctx.rect(0, 0, WORLD.w, WORLD.h)
    ctx.clip()

    this._scene(ctx)
    this._goliath(ctx, game)
    this._david(ctx, game)
    if (game.state === 'aim') this._aim(ctx, game)
    if (game.stone) this._stone(ctx, game)
    this._hud(ctx, game)
    if (game.beat) this._beat(ctx, game.beat)

    ctx.restore()
  }

  _scene(ctx) {
    // 天空
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y)
    sky.addColorStop(0, '#bfe0ef')
    sky.addColorStop(1, '#eaf4d9')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, WORLD.w, GROUND_Y)
    // 以拉谷地面
    ctx.fillStyle = '#c9b178'
    ctx.fillRect(0, GROUND_Y, WORLD.w, WORLD.h - GROUND_Y)
    ctx.fillStyle = '#a98f5a'
    ctx.fillRect(0, GROUND_Y, WORLD.w, 6)
    // 遠山
    ctx.fillStyle = 'rgba(150,170,150,0.5)'
    ctx.beginPath()
    ctx.moveTo(0, GROUND_Y)
    ctx.lineTo(240, 300)
    ctx.lineTo(480, GROUND_Y)
    ctx.lineTo(720, 320)
    ctx.lineTo(960, GROUND_Y)
    ctx.closePath()
    ctx.fill()
  }

  _david(ctx, game) {
    const { x } = DAVID
    const shoulderY = DAVID.y - 6 // 肩/甩石手樞紐（與物理發射點、瞄準線同高）
    const hipY = 414
    const footY = GROUND_Y
    const skin = '#e8b887'
    const tunic = '#9c6b3b'

    // 腿
    ctx.strokeStyle = '#6b4a28'
    ctx.lineWidth = 9
    ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(x - 6, hipY); ctx.lineTo(x - 9, footY - 2); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x + 6, hipY); ctx.lineTo(x + 10, footY - 2); ctx.stroke()
    // 鞋
    ctx.fillStyle = '#5a3d22'
    ctx.fillRect(x - 16, footY - 4, 13, 6)
    ctx.fillRect(x + 4, footY - 4, 13, 6)
    // 短袍（身體）
    ctx.fillStyle = tunic
    ctx.beginPath()
    ctx.moveTo(x - 13, shoulderY + 6)
    ctx.lineTo(x + 13, shoulderY + 6)
    ctx.lineTo(x + 16, hipY)
    ctx.lineTo(x - 16, hipY)
    ctx.closePath()
    ctx.fill()
    // 腰帶
    ctx.fillStyle = '#5a3d22'
    ctx.fillRect(x - 16, hipY - 8, 32, 6)
    // 後手（插在身側）
    ctx.strokeStyle = skin
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(x - 9, shoulderY + 12); ctx.lineTo(x - 19, shoulderY + 40); ctx.stroke()
    // 脖子 + 頭
    const hy = shoulderY - 20
    ctx.fillStyle = skin
    ctx.fillRect(x - 4, shoulderY - 8, 8, 8) // 脖子
    ctx.beginPath(); ctx.arc(x, hy, 15, 0, Math.PI * 2); ctx.fill()
    // 頭髮
    ctx.fillStyle = '#3a2716'
    ctx.beginPath(); ctx.arc(x, hy - 2, 15, Math.PI * 1.02, Math.PI * 2.0); ctx.fill()
    // 臉（側面朝右、勇敢專注）：眼、眉、嘴
    ctx.fillStyle = '#2a2a2a'
    ctx.beginPath(); ctx.arc(x + 6, hy - 1, 1.8, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(x + 11, hy - 1, 1.8, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#3a2716'
    ctx.lineWidth = 1.6
    ctx.beginPath(); ctx.moveTo(x + 3, hy - 6); ctx.lineTo(x + 8, hy - 5); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x + 9, hy - 5); ctx.lineTo(x + 13, hy - 6); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x + 6, hy + 6); ctx.lineTo(x + 12, hy + 6); ctx.stroke() // 堅定小抿嘴

    // 甩石手臂 + 機弦：瞄準時手臂沿角度伸出、末端掛石袋；非瞄準時手收在肩側。
    if (game.state === 'aim') {
      const a = deg2rad(game.aimDeg)
      const hxp = x + Math.cos(a) * 22
      const hyp = shoulderY - Math.sin(a) * 22
      ctx.strokeStyle = skin
      ctx.lineWidth = 6
      ctx.beginPath(); ctx.moveTo(x + 8, shoulderY + 2); ctx.lineTo(hxp, hyp); ctx.stroke() // 投擲手臂
      const sx = x + Math.cos(a) * 36
      const sy = shoulderY - Math.sin(a) * 36
      ctx.strokeStyle = '#5a4326'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(hxp, hyp); ctx.lineTo(sx, sy); ctx.stroke()
      ctx.fillStyle = '#444'
      ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2); ctx.fill()
    } else {
      ctx.strokeStyle = skin
      ctx.lineWidth = 6
      ctx.beginPath(); ctx.moveTo(x + 8, shoulderY + 2); ctx.lineTo(x + 22, shoulderY + 16); ctx.stroke()
    }

    ctx.fillStyle = '#3a2c1a'
    ctx.font = 'bold 14px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('大衛', x, footY + 16)
  }

  _goliath(ctx, game) {
    const g = GOLIATH
    const fallen = game.state === 'win'
    // 頭對齊「額頭命中區」：命中框落在他前額（眼睛上方），玩家瞄哪打哪一致。
    const foreheadCY = g.forehead.y + g.forehead.h / 2
    const headY = foreheadCY + 16 // 頭中心（前額在頭的上段）
    const headR = 27
    const shoulderY = headY + headR + 10
    const hipY = 360
    const footY = g.groundY
    const skin = '#b59b6e'
    const armor = '#5b6b57'

    ctx.save()
    if (fallen) {
      // 倒下（勝利）：以腳為軸往後倒
      ctx.translate(g.x, footY)
      ctx.rotate(-Math.PI / 2.1)
      ctx.translate(-g.x, -footY)
    }

    // 腿（粗壯）
    ctx.strokeStyle = '#3f4a36'
    ctx.lineWidth = 20
    ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(g.x - 14, hipY); ctx.lineTo(g.x - 16, footY - 6); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(g.x + 14, hipY); ctx.lineTo(g.x + 16, footY - 6); ctx.stroke()
    // 腳
    ctx.fillStyle = '#2f3a28'
    ctx.fillRect(g.x - 30, footY - 9, 28, 9)
    ctx.fillRect(g.x + 4, footY - 9, 28, 9)
    // 持矛手臂後面的矛（撒上 17:7 槍桿如織布的機軸）
    ctx.strokeStyle = '#6b4a28'
    ctx.lineWidth = 5
    ctx.beginPath(); ctx.moveTo(g.x + 52, shoulderY - 40); ctx.lineTo(g.x + 52, footY); ctx.stroke()
    ctx.fillStyle = '#9aa0a6'
    ctx.beginPath()
    ctx.moveTo(g.x + 52, shoulderY - 58)
    ctx.lineTo(g.x + 45, shoulderY - 40)
    ctx.lineTo(g.x + 59, shoulderY - 40)
    ctx.closePath(); ctx.fill()
    // 鎧甲身體
    ctx.fillStyle = armor
    ctx.beginPath()
    ctx.moveTo(g.x - 35, shoulderY)
    ctx.lineTo(g.x + 35, shoulderY)
    ctx.lineTo(g.x + 30, hipY + 8)
    ctx.lineTo(g.x - 30, hipY + 8)
    ctx.closePath(); ctx.fill()
    // 鱗甲線
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'
    ctx.lineWidth = 2
    for (let yy = shoulderY + 16; yy < hipY; yy += 20) {
      ctx.beginPath(); ctx.moveTo(g.x - 33, yy); ctx.lineTo(g.x + 33, yy); ctx.stroke()
    }
    // 手臂
    ctx.strokeStyle = skin
    ctx.lineWidth = 13
    ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(g.x - 31, shoulderY + 6); ctx.lineTo(g.x - 46, shoulderY + 64); ctx.stroke() // 近手垂放
    ctx.beginPath(); ctx.moveTo(g.x + 31, shoulderY + 6); ctx.lineTo(g.x + 52, shoulderY - 40); ctx.stroke() // 持矛手
    // 脖子
    ctx.fillStyle = skin
    ctx.fillRect(g.x - 11, headY + headR - 6, 22, 20)
    // 頭
    ctx.beginPath(); ctx.arc(g.x, headY, headR, 0, Math.PI * 2); ctx.fill()
    // 鬍子
    ctx.fillStyle = '#4a3a28'
    ctx.beginPath(); ctx.arc(g.x, headY + 11, 19, 0.12 * Math.PI, 0.88 * Math.PI); ctx.fill()
    // 銅盔（撒上 17:5 頭戴銅盔）
    ctx.fillStyle = '#b08d57'
    ctx.beginPath(); ctx.arc(g.x, headY - 4, headR + 1, Math.PI * 1.04, Math.PI * 1.96); ctx.fill()
    ctx.fillRect(g.x - headR - 1, headY - 8, (headR + 1) * 2, 6)
    // 臉部表情
    if (!fallen) {
      // 怒眉（內低外高，兇）
      ctx.strokeStyle = '#3a2a18'
      ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(g.x - 16, headY - 3); ctx.lineTo(g.x - 4, headY + 2); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(g.x + 16, headY - 3); ctx.lineTo(g.x + 4, headY + 2); ctx.stroke()
      // 眼
      ctx.fillStyle = '#2a2a2a'
      ctx.beginPath(); ctx.arc(g.x - 9, headY + 4, 2.6, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(g.x + 9, headY + 4, 2.6, 0, Math.PI * 2); ctx.fill()
      // 怒嘴（下彎）
      ctx.strokeStyle = '#3a2a18'
      ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.arc(g.x, headY + 22, 7, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke()
    } else {
      // 暈眩：XX 眼 + 張嘴
      ctx.strokeStyle = '#2a2a2a'
      ctx.lineWidth = 2.5
      for (const ex of [-9, 9]) {
        ctx.beginPath()
        ctx.moveTo(g.x + ex - 3, headY + 1); ctx.lineTo(g.x + ex + 3, headY + 6)
        ctx.moveTo(g.x + ex + 3, headY + 1); ctx.lineTo(g.x + ex - 3, headY + 6)
        ctx.stroke()
      }
      ctx.fillStyle = '#3a2a18'
      ctx.beginPath(); ctx.arc(g.x, headY + 19, 5, 0, Math.PI * 2); ctx.fill()
    }
    ctx.restore()

    // 額頭命中區提示（瞄準時微微發亮，幫小孩知道要打哪）
    if (!fallen && (game.state === 'aim' || game.state === 'flying')) {
      const f = g.forehead
      ctx.strokeStyle = 'rgba(228,87,46,0.85)'
      ctx.setLineDash([5, 4])
      ctx.lineWidth = 2
      ctx.strokeRect(f.x, f.y, f.w, f.h)
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(228,87,46,0.12)'
      ctx.fillRect(f.x, f.y, f.w, f.h)
      ctx.fillStyle = '#c0392b'
      ctx.font = 'bold 12px system-ui'
      ctx.fillText('額頭', f.x + f.w / 2, f.y - 8)
    }
    ctx.fillStyle = '#3a2c1a'
    ctx.font = 'bold 14px system-ui'
    ctx.textAlign = 'center'
    if (!fallen) ctx.fillText('歌利亞', g.x, g.groundY + 16)
  }

  _aim(ctx, game) {
    // 虛線瞄準軌跡（淡）：幫玩家預判石子會往哪飛
    const a = deg2rad(game.aimDeg)
    ctx.strokeStyle = 'rgba(46,134,171,0.6)'
    ctx.setLineDash([6, 6])
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(DAVID.x, DAVID.y - 6)
    ctx.lineTo(DAVID.x + Math.cos(a) * 120, DAVID.y - 6 - Math.sin(a) * 120)
    ctx.stroke()
    ctx.setLineDash([])
    // 角度標
    ctx.fillStyle = '#2e86ab'
    ctx.font = 'bold 14px system-ui'
    ctx.textAlign = 'left'
    ctx.fillText(`${Math.round(game.aimDeg)}°`, DAVID.x + 30, DAVID.y - 40)
  }

  _stone(ctx, game) {
    if (game.trail) {
      ctx.fillStyle = 'rgba(80,80,80,0.25)'
      for (const p of game.trail) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.fillStyle = '#3a3a3a'
    ctx.beginPath()
    ctx.arc(game.stone.x, game.stone.y, 7, 0, Math.PI * 2)
    ctx.fill()
  }

  _hud(ctx, game) {
    // 剩餘石子（● 滿 ○ 空）
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.font = '20px system-ui'
    let s = '石子：'
    for (let i = 0; i < game.totalStones; i++) s += i < game.stonesLeft ? '🪨' : '◻'
    ctx.fillStyle = '#3a2c1a'
    ctx.fillText(s, 16, 24)
  }

  _beat(ctx, beat) {
    // 半透明面板 + 經文 + 教導 + 繼續提示
    ctx.fillStyle = 'rgba(20,30,40,0.82)'
    const pad = 60
    const bx = pad
    const by = WORLD.h / 2 - 110
    const bw = WORLD.w - pad * 2
    ctx.fillRect(bx, by, bw, 220)
    ctx.strokeStyle = beat.kind === 'win' ? '#7bd88f' : beat.kind === 'lose' ? '#e4a14f' : '#bcd'
    ctx.lineWidth = 3
    ctx.strokeRect(bx, by, bw, 220)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    let y = by + 22
    if (beat.kicker) {
      ctx.fillStyle = beat.kind === 'win' ? '#7bd88f' : '#ffd98a'
      ctx.font = 'bold 26px system-ui'
      ctx.fillText(beat.kicker, WORLD.w / 2, y)
      y += 38
    }
    if (beat.ref) {
      ctx.fillStyle = '#ffe1a8'
      ctx.font = 'bold 15px system-ui'
      ctx.fillText(beat.ref, WORLD.w / 2, y)
      y += 24
    }
    if (beat.line) y = this._wrap(ctx, beat.line, WORLD.w / 2, y, bw - 70, 22, '#eef', '15px system-ui')
    if (beat.teach) {
      y += 6
      y = this._wrap(ctx, beat.teach, WORLD.w / 2, y, bw - 70, 21, '#cfe', 'italic 14px system-ui')
    }
    ctx.fillStyle = '#9fb6c6'
    ctx.font = '13px system-ui'
    ctx.fillText(beat.cont || '點畫面 / 按空白鍵繼續', WORLD.w / 2, by + 220 - 24)
  }

  // 中文逐字換行（無空白），回傳結束 y。
  _wrap(ctx, text, cx, y, maxW, lh, color, font) {
    ctx.fillStyle = color
    ctx.font = font
    let line = ''
    for (const ch of text) {
      const test = line + ch
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, cx, y)
        y += lh
        line = ch
      } else line = test
    }
    if (line) {
      ctx.fillText(line, cx, y)
      y += lh
    }
    return y
  }
}

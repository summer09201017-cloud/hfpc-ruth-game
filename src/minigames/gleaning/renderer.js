import { VIEW, GROUND_Y, PLAYER, RUN, STAMINA, WHEAT } from './config.js'
import { CONTENT } from './content.js'

// 「拾麥穗蒙恩 · 路得」所有畫面繪製集中在這裡。背景用 Canvas 圖形畫(金黃麥田+伯利恆城+日暮),
// 角色(路得、波阿斯)用向量、麥穗用 emoji——零美術檔即可運行。邏輯解析度 960×540,等比縮放置中。

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.cssW = VIEW.W
    this.cssH = VIEW.H
    this.dpr = 1
    this._t = 0 // 環境動畫時鐘(麥浪/光暈用)
  }

  resize() {
    const stage = this.canvas.parentElement
    const w = stage.clientWidth
    const h = stage.clientHeight
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.cssW = w
    this.cssH = h
    this.canvas.width = Math.floor(w * this.dpr)
    this.canvas.height = Math.floor(h * this.dpr)
    this.canvas.style.width = w + 'px'
    this.canvas.style.height = h + 'px'
  }

  _begin() {
    const ctx = this.ctx
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.clearRect(0, 0, this.cssW, this.cssH)
    const scale = Math.min(this.cssW / VIEW.W, this.cssH / VIEW.H)
    const ox = (this.cssW - VIEW.W * scale) / 2
    const oy = (this.cssH - VIEW.H * scale) / 2
    ctx.setTransform(this.dpr * scale, 0, 0, this.dpr * scale, this.dpr * ox, this.dpr * oy)
  }

  _emoji(e, x, y, size, baseline = 'alphabetic') {
    const ctx = this.ctx
    ctx.font = `${size}px "Segoe UI Emoji","Apple Color Emoji",serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = baseline
    ctx.fillText(e, x, y)
  }

  draw(game) {
    this._begin()
    this._t += 1 / 60
    const dist = game.distance || 0
    const dusk = Math.min(1, dist / (game.goalDistance || RUN.goalDistance)) // 接近日暮:天色漸暖

    this._bgField(dist, dusk)

    // 終點:日暮(接近終點時太陽從右側落下)
    const goalX = game.goalPos(dist)
    if (goalX !== null) this._sunset(goalX)

    // 可撿的麥穗🌾(發微光提示可撿)
    for (const wch of game.spawner.wheats) {
      if (wch.got) continue
      const wy = GROUND_Y - wch.y
      const ctx = this.ctx
      const glow = ctx.createRadialGradient(wch.x, wy, 2, wch.x, wy, 22)
      glow.addColorStop(0, `rgba(255,236,150,${0.5 + Math.sin(this._t * 4 + wch.x * 0.05) * 0.18})`)
      glow.addColorStop(1, 'rgba(255,236,150,0)')
      ctx.fillStyle = glow
      ctx.fillRect(wch.x - 22, wy - 22, 44, 44)
      this._emoji('🌾', wch.x, wy, WHEAT.size, 'middle')
    }

    // 波阿斯(站在田裡,常常遇到;未遇到的頭上有 💬)
    for (const b of game.spawner.boaz) this._boaz(b.x, b.met)

    // 障礙(田裡溫和的石頭/草叢)
    for (const o of game.spawner.obstacles) this._emoji(o.emoji, o.x, GROUND_Y + 4, o.size)

    // 路得:歇息(faint)時屈膝坐姿 + 😌;否則向右拾穗前行(受擊無敵時閃爍)
    const p = game.player
    if (game.state === 'faint') {
      this._ruth(p.x, GROUND_Y, 0, false, true)
      const bob = Math.sin(this._t * 3) * 3
      this._emoji('😌', p.x + 22, GROUND_Y - 62 + bob, 22, 'middle')
    } else {
      const blink = p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0
      if (!blink) {
        const moving = game.speed > 1 && game.state === 'playing'
        const phase = moving ? dist * 0.05 : 0
        this._ruth(p.x, p.y, phase, !p.onGround)
      }
    }

    this._hud(game)

    if (game.state === 'intro') this._panel(CONTENT.intro, CONTENT.intro.cont)
    else if (game.state === 'dialogue') this._dialoguePanel(game)
    else if (game.state === 'faint') this._faintPanel(game)
    else if (game.state === 'win') this._panel(CONTENT.win, CONTENT.win.cont)
    else if (game.state === 'paused') this._dimText('已暫停　·　點畫面或按 P 繼續')
  }

  // ---- 背景:金黃麥田(暖色天空+遠方麥浪+伯利恆城+收割後的禾茬地) ----
  _bgField(dist, dusk) {
    const ctx = this.ctx
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW.H)
    sky.addColorStop(0, mix('#7fb0d8', '#e98a4e', dusk))
    sky.addColorStop(0.5, mix('#bcd6e2', '#f6c178', dusk))
    sky.addColorStop(1, mix('#eef0dc', '#fbe6c0', dusk))
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, VIEW.W, VIEW.H)

    // 日間高空暖陽(日暮交給 _sunset)
    if (dusk < 0.65) {
      const sunX = VIEW.W * 0.78
      const sunY = VIEW.H * 0.2
      const halo = ctx.createRadialGradient(sunX, sunY, 6, sunX, sunY, 120)
      halo.addColorStop(0, 'rgba(255,248,214,0.9)')
      halo.addColorStop(1, 'rgba(255,248,214,0)')
      ctx.fillStyle = halo
      ctx.fillRect(sunX - 120, sunY - 120, 240, 240)
      ctx.fillStyle = 'rgba(255,250,230,0.95)'
      ctx.beginPath()
      ctx.arc(sunX, sunY, 24, 0, Math.PI * 2)
      ctx.fill()
    }

    // 遠方伯利恆城(視差最慢)
    this._buildings(dist * 0.18, 0.3)

    // 遠方麥田帶 + 麥浪
    const fieldTop = GROUND_Y - 64
    const foff = dist * 0.32
    ctx.fillStyle = mix('#e7c75f', '#d8a544', dusk)
    ctx.beginPath()
    ctx.moveTo(0, GROUND_Y)
    for (let x = 0; x <= VIEW.W; x += 16) {
      const y = fieldTop - Math.sin((x + foff) * 0.03) * 6 - Math.sin((x + foff) * 0.011 + 1) * 4
      ctx.lineTo(x, y)
    }
    ctx.lineTo(VIEW.W, GROUND_Y)
    ctx.closePath()
    ctx.fill()
    // 麥田裡的麥稈(細直線,隨麥浪微擺)
    ctx.strokeStyle = mix('rgba(180,140,40,0.5)', 'rgba(150,100,30,0.55)', dusk)
    ctx.lineWidth = 1
    for (let x = -(foff % 12); x < VIEW.W; x += 12) {
      const sway = Math.sin(this._t * 1.2 + x * 0.05) * 2
      const topY = fieldTop - 4 - Math.sin((x + foff) * 0.03) * 6
      ctx.beginPath()
      ctx.moveTo(x, GROUND_Y - 2)
      ctx.lineTo(x + sway, topY)
      ctx.stroke()
    }

    // 收割後的禾茬地(地面)
    const soil = ctx.createLinearGradient(0, GROUND_Y - 6, 0, VIEW.H)
    soil.addColorStop(0, mix('#d9b86e', '#caa256', dusk))
    soil.addColorStop(1, mix('#be9a52', '#a8843f', dusk))
    ctx.fillStyle = soil
    ctx.fillRect(0, GROUND_Y - 6, VIEW.W, VIEW.H - (GROUND_Y - 6))

    // 田埂土路 + 隨前進往左捲動的禾茬刻痕(製造前進感)
    ctx.fillStyle = mix('#b6925a', '#9c7a44', dusk)
    ctx.fillRect(0, GROUND_Y, VIEW.W, 16)
    ctx.strokeStyle = 'rgba(120,92,52,0.5)'
    ctx.lineWidth = 2
    const tick = 40
    const tshift = -(dist % tick)
    for (let x = tshift; x < VIEW.W; x += tick) {
      ctx.beginPath()
      ctx.moveTo(x, GROUND_Y + 12); ctx.lineTo(x, GROUND_Y + 5)
      ctx.moveTo(x + 6, GROUND_Y + 12); ctx.lineTo(x + 6, GROUND_Y + 6)
      ctx.stroke()
    }
  }

  // 日暮(得 2:17 拾取直到晚上):大大的落日從右側沉下,暖光鋪滿
  _sunset(x) {
    const ctx = this.ctx
    const sy = GROUND_Y - 40
    const halo = ctx.createRadialGradient(x, sy, 10, x, sy, 200)
    halo.addColorStop(0, 'rgba(255,210,130,0.95)')
    halo.addColorStop(0.5, 'rgba(255,180,110,0.4)')
    halo.addColorStop(1, 'rgba(255,180,110,0)')
    ctx.fillStyle = halo
    ctx.fillRect(x - 200, sy - 200, 400, 400)
    const sun = ctx.createRadialGradient(x, sy, 4, x, sy, 64)
    sun.addColorStop(0, '#fff0c8')
    sun.addColorStop(1, '#f6a554')
    ctx.fillStyle = sun
    ctx.beginPath()
    ctx.arc(x, sy, 60, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,240,200,0.5)'
    ctx.beginPath()
    ctx.arc(x - 12, sy - 12, 26, 0, Math.PI * 2)
    ctx.fill()
  }

  // 波阿斯(站在田裡的向量小人):深色尊貴長袍 + 頭巾 + 鬍子,手撒麥穗(故意撥落,得 2:16)。
  _boaz(x, met) {
    const ctx = this.ctx
    const footY = GROUND_Y
    const cy = footY - 56
    const glow = ctx.createRadialGradient(x, cy, 4, x, cy, 64)
    glow.addColorStop(0, `rgba(255,238,180,${met ? 0.28 : 0.55})`)
    glow.addColorStop(1, 'rgba(255,238,180,0)')
    ctx.fillStyle = glow
    ctx.fillRect(x - 64, cy - 64, 128, 128)
    // 長袍(深紫褐,尊貴的田主)
    ctx.fillStyle = '#6a4a6a'
    ctx.beginPath()
    ctx.moveTo(x - 11, cy)
    ctx.lineTo(x + 11, cy)
    ctx.lineTo(x + 16, footY)
    ctx.lineTo(x - 16, footY)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#caa24a'
    ctx.fillRect(x - 14, footY - 30, 28, 4) // 腰帶
    // 撒麥穗的右手
    ctx.strokeStyle = '#6a4a6a'
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x + 8, cy + 8)
    ctx.lineTo(x + 22, cy + 26)
    ctx.stroke()
    ctx.fillStyle = '#e8bb8d'
    ctx.beginPath()
    ctx.arc(x + 22, cy + 26, 3.4, 0, Math.PI * 2)
    ctx.fill()
    // 故意撥落的麥穗(從手邊落下)
    for (let i = 0; i < 3; i++) {
      const fy = cy + 30 + ((this._t * 30 + i * 18) % 36)
      this._emoji('🌾', x + 24 + i * 3, fy, 16, 'middle')
    }
    // 頭 + 頭巾 + 鬍子
    ctx.fillStyle = '#e8bb8d'
    ctx.beginPath()
    ctx.arc(x, cy - 10, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#8a5a3a'
    ctx.beginPath()
    ctx.arc(x, cy - 11, 9, Math.PI, 2 * Math.PI)
    ctx.fill()
    ctx.fillRect(x - 9, cy - 11, 3, 10)
    ctx.fillStyle = '#5a4326'
    ctx.beginPath()
    ctx.moveTo(x - 5, cy - 7)
    ctx.quadraticCurveTo(x, cy - 1, x + 5, cy - 7)
    ctx.quadraticCurveTo(x + 3, cy - 4, x, cy - 3)
    ctx.quadraticCurveTo(x - 3, cy - 4, x - 5, cy - 7)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#3a2a18'
    ctx.beginPath(); ctx.arc(x - 2.6, cy - 11, 1.1, 0, Math.PI * 2); ctx.arc(x + 2.6, cy - 11, 1.1, 0, Math.PI * 2); ctx.fill()
    if (!met) this._emoji('💬', x, footY - 94, 28, 'middle')
  }

  // 遇見波阿斯的對話卡
  _dialoguePanel(game) {
    const ctx = this.ctx
    const d = game.dialogue || { say: '', ref: '' }
    ctx.fillStyle = 'rgba(28,18,8,0.5)'
    ctx.fillRect(0, 0, VIEW.W, VIEW.H)
    const cx = VIEW.W / 2
    let y = 118
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    this._emoji('🌾', cx, y, 58, 'top')
    y += 72
    ctx.fillStyle = '#ffe9b0'
    ctx.font = '800 24px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.fillText('波阿斯對路得說', cx, y)
    y += 40
    ctx.fillStyle = '#fff6e2'
    ctx.font = '700 22px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    y = this._wrapped(`「${d.say}」`, cx, y, 720, 30)
    y += 8
    if (d.ref) {
      ctx.fillStyle = '#cfe0a0'
      ctx.font = '700 17px "Noto Sans TC","Microsoft JhengHei",sans-serif'
      ctx.fillText(d.ref, cx, y)
      y += 30
    }
    ctx.fillStyle = 'rgba(245,238,224,0.95)'
    ctx.font = '600 18px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    y = this._wrapped(CONTENT.boazGift, cx, y, 680, 26)
    y += 10
    ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(this._t * 4))
    ctx.fillStyle = '#fff'
    ctx.font = '800 20px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.fillText('👉 點畫面 / 按空白鍵　繼續拾穗', cx, Math.min(y + 6, VIEW.H - 40))
    ctx.globalAlpha = 1
  }

  // ---- HUD ----
  _hud(game) {
    const ctx = this.ctx
    const hud = CONTENT.hud
    const barW = 360, barH = 14
    const bx = (VIEW.W - barW) / 2, by = 34
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    roundRect(ctx, bx, by, barW, barH, 7)
    ctx.fill()
    const prog = Math.min(1, game.distance / (game.goalDistance || RUN.goalDistance))
    ctx.fillStyle = '#caa23a'
    roundRect(ctx, bx, by, barW * prog, barH, 7)
    ctx.fill()
    ctx.fillStyle = '#5a3a16'
    ctx.font = '600 15px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.textBaseline = 'bottom'
    ctx.textAlign = 'left'
    ctx.fillText(hud.start, bx, by - 3)
    ctx.textAlign = 'right'
    ctx.fillText(hud.goal, bx + barW, by - 3)

    // 體力條
    const sb = game.stamina / STAMINA.max
    const sW = 300, sH = 20
    const sx = (VIEW.W - sW) / 2, sy = by + 30
    ctx.fillStyle = 'rgba(0,0,0,0.22)'
    roundRect(ctx, sx, sy, sW, sH, 10)
    ctx.fill()
    const low = game.stamina <= STAMINA.low
    if (low) ctx.globalAlpha = 0.6 + 0.4 * Math.abs(Math.sin(this._t * 6))
    ctx.fillStyle = low ? '#e0584a' : '#3fae5a'
    roundRect(ctx, sx, sy, sW * Math.max(0, sb), sH, 10)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.fillStyle = '#fff'
    ctx.font = '700 14px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('體力', sx + sW / 2, sy + sH / 2)

    // 左上:籃子裡的麥穗束數
    ctx.fillStyle = '#7a5320'
    ctx.font = '600 24px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(`🧺 ${game.grains || 0}`, 26, 44)

    if (low && game.state === 'playing') {
      ctx.fillStyle = 'rgba(196,75,75,0.92)'
      ctx.font = '700 17px "Noto Sans TC","Microsoft JhengHei",sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const msg = CONTENT.lowHint
      const w = ctx.measureText(msg).width + 30
      roundRect(ctx, (VIEW.W - w) / 2, sy + sH + 10, w, 32, 9)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.fillText(msg, VIEW.W / 2, sy + sH + 26)
    }

    if (game.state === 'playing') {
      ctx.fillStyle = 'rgba(60,45,25,0.7)'
      ctx.font = '600 17px "Noto Sans TC","Microsoft JhengHei",sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText('空白 / ↑ / 點畫面 = 跳　·　邊跑邊撿麥穗🌾　·　走到波阿斯面前領受恩典　·　拾到日暮過關', VIEW.W / 2, VIEW.H - 12)
    }
  }

  _panel(c, cont) {
    const ctx = this.ctx
    ctx.fillStyle = 'rgba(28,18,8,0.52)'
    ctx.fillRect(0, 0, VIEW.W, VIEW.H)
    const cardW = 700, cx = VIEW.W / 2
    let y = 84
    ctx.fillStyle = '#ffe9b0'
    ctx.font = '800 28px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(c.kicker, cx, y)
    y += 44
    if (c.ref) {
      ctx.fillStyle = '#cfe0a0'
      ctx.font = '700 16px "Noto Sans TC","Microsoft JhengHei",sans-serif'
      ctx.fillText(c.ref, cx, y)
      y += 26
    }
    if (c.line) {
      ctx.fillStyle = '#fff6e2'
      ctx.font = '600 18px "Noto Sans TC","Microsoft JhengHei",sans-serif'
      y = this._wrapped(c.line, cx, y, cardW, 26)
      y += 8
    }
    const body = c.body || c.teach
    if (body) {
      ctx.fillStyle = 'rgba(245,238,224,0.94)'
      ctx.font = '500 16px "Noto Sans TC","Microsoft JhengHei",sans-serif'
      for (const para of body.split('\n')) {
        y = this._wrapped(para, cx, y, cardW, 24)
        y += 4
      }
    }
    ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(this._t * 4))
    ctx.fillStyle = '#fff'
    ctx.font = '800 20px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.fillText(`👉 ${cont}`, cx, Math.min(y + 16, VIEW.H - 40))
    ctx.globalAlpha = 1
  }

  _faintPanel(game) {
    const ctx = this.ctx
    ctx.fillStyle = 'rgba(28,18,8,0.45)'
    ctx.fillRect(0, 0, VIEW.W, VIEW.H)
    const cx = VIEW.W / 2
    let y = 150
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = '#ffe9b0'
    ctx.font = '800 26px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.fillText('歇一會兒……再起來繼續拾', cx, y)
    y += 42
    ctx.fillStyle = '#cfe0a0'
    ctx.font = '700 15px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.fillText(CONTENT.faint.ref, cx, y)
    y += 24
    ctx.fillStyle = '#fff6e2'
    ctx.font = '600 17px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    y = this._wrapped(CONTENT.faint.line, cx, y, 640, 25)
    y += 8
    ctx.fillStyle = 'rgba(245,238,224,0.92)'
    ctx.font = '500 16px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    this._wrapped(CONTENT.faint.hint, cx, y, 640, 24)
  }

  _dimText(msg) {
    const ctx = this.ctx
    ctx.fillStyle = 'rgba(28,18,8,0.5)'
    ctx.fillRect(0, 0, VIEW.W, VIEW.H)
    ctx.fillStyle = '#fff'
    ctx.font = '700 22px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(msg, VIEW.W / 2, VIEW.H / 2)
  }

  _wrapped(text, cx, y, maxW, lh) {
    const ctx = this.ctx
    const words = String(text).split('')
    let line = ''
    for (const ch of words) {
      const test = line + ch
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, cx, y)
        y += lh
        line = ch
      } else {
        line = test
      }
    }
    if (line) {
      ctx.fillText(line, cx, y)
      y += lh
    }
    return y
  }

  // 路得:面向右、拾穗前行的女子(頭巾覆頭垂肩、長裙、臂挽籃子)。crouch=歇坐。
  _ruth(x, footY, phase, airborne, crouch = false) {
    const ctx = this.ctx
    const sw = Math.sin(phase) * 0.55
    const bob = airborne ? 0 : -Math.abs(Math.sin(phase)) * 2.2

    const COL = {
      robe: '#b06a86',
      robeDark: '#925572',
      scarf: '#ece0c4',
      scarfDark: '#d8c8a6',
      skin: '#e8bb8d',
      basket: '#c69a52',
      sandal: '#6b4a26',
    }

    const sink = crouch ? 15 : 0
    const kneeY = -16 + (crouch ? 9 : 0)
    const shin = 16
    const shoulderY = -44 + sink
    const armLen = 15
    const headY = -52 + sink
    const headR = 7

    const legF = crouch ? 0.8 : airborne ? 0.9 : sw
    const legB = crouch ? -0.8 : airborne ? -0.32 : -sw
    const armB = crouch ? 0.5 : airborne ? -1.1 : sw * 0.8

    const drawLeg = (ang) => {
      const fx = Math.sin(ang) * shin
      const fy = kneeY + Math.cos(ang) * shin
      ctx.strokeStyle = COL.skin
      ctx.lineWidth = 6
      ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(0, kneeY); ctx.lineTo(fx, fy); ctx.stroke()
      ctx.fillStyle = COL.sandal
      ctx.beginPath(); ctx.ellipse(fx + 3, fy + 1, 5.5, 3, 0, 0, Math.PI * 2); ctx.fill()
    }

    ctx.save()
    ctx.translate(x, footY + bob)

    // 後側手腳(較暗,景深)
    ctx.globalAlpha = 0.82
    {
      const hx = Math.sin(armB) * armLen
      const hy = shoulderY + Math.cos(armB) * armLen
      ctx.strokeStyle = COL.robe; ctx.lineWidth = 6; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(0, shoulderY); ctx.lineTo(hx, hy); ctx.stroke()
      ctx.fillStyle = COL.skin; ctx.beginPath(); ctx.arc(hx, hy, 3.4, 0, Math.PI * 2); ctx.fill()
    }
    drawLeg(legB)
    ctx.globalAlpha = 1

    // 長裙(A 字)
    const swish = airborne ? 1 : Math.sin(phase) * 2
    ctx.fillStyle = COL.robe
    ctx.beginPath()
    ctx.moveTo(-8, shoulderY + 2)
    ctx.lineTo(8, shoulderY + 2)
    ctx.lineTo(15 + swish, -6)
    ctx.quadraticCurveTo(0, -2, -15 + swish, -6)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = COL.robeDark
    ctx.beginPath()
    ctx.moveTo(2, shoulderY + 3)
    ctx.lineTo(8, shoulderY + 2)
    ctx.lineTo(15 + swish, -6)
    ctx.lineTo(4, -5)
    ctx.closePath()
    ctx.fill()

    drawLeg(legF)

    // 前臂挽著的籃子(裝麥穗)
    ctx.fillStyle = COL.basket
    ctx.beginPath(); ctx.ellipse(15, -20, 8, 6, 0, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#8a6a30'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.ellipse(15, -20, 8, 6, 0, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.arc(15, -26, 8, Math.PI, 2 * Math.PI); ctx.stroke()
    this._emoji('🌾', 15, -22, 13, 'middle')
    ctx.strokeStyle = COL.robe; ctx.lineWidth = 6; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(0, shoulderY); ctx.lineTo(13, -22); ctx.stroke()
    ctx.fillStyle = COL.skin; ctx.beginPath(); ctx.arc(13, -22, 3.2, 0, Math.PI * 2); ctx.fill()

    // 頸 + 頭
    ctx.strokeStyle = COL.skin; ctx.lineWidth = 5; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(0, shoulderY); ctx.lineTo(0, headY + headR - 1); ctx.stroke()
    ctx.fillStyle = COL.skin
    ctx.beginPath(); ctx.arc(0, headY, headR, 0, Math.PI * 2); ctx.fill()

    // 黑髮(主體):背後垂到肩 + 頭頂罩到眼睛上方 + 右臉際一綹(她面向右)
    const hair = '#241a12'
    ctx.fillStyle = hair
    ctx.beginPath() // 背後垂下的黑髮(背側=左,到肩)
    ctx.moveTo(-headR - 1, headY - 3)
    ctx.quadraticCurveTo(-headR - 7, headY + 13, -headR + 1, headY + 20)
    ctx.quadraticCurveTo(-headR + 4, headY + 11, -1, headY + 5)
    ctx.quadraticCurveTo(-headR + 1, headY + 1, -headR - 1, headY - 3)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath(); ctx.arc(0, headY - 1.5, headR + 1.2, Math.PI, 2 * Math.PI); ctx.fill() // 頭頂黑髮(罩到眼上方)
    ctx.beginPath() // 右臉際一綹(沿臉外緣,不擋五官)
    ctx.moveTo(headR + 1, headY - 2)
    ctx.quadraticCurveTo(headR + 3.5, headY + 5, headR + 0.5, headY + 9)
    ctx.quadraticCurveTo(headR + 1.5, headY + 3, headR, headY - 0.5)
    ctx.closePath()
    ctx.fill()

    // 米色頭巾:較小的巾蓋在黑髮頂上(露出前額與垂下的黑髮)
    ctx.fillStyle = COL.scarf
    ctx.beginPath(); ctx.arc(0, headY - 3, headR + 0.4, Math.PI * 1.02, Math.PI * 1.98); ctx.fill()
    ctx.fillStyle = COL.scarfDark
    ctx.beginPath() // 巾在背後垂下的一小段
    ctx.moveTo(-headR + 1, headY - 3.5)
    ctx.quadraticCurveTo(-headR - 3, headY + 2, -headR + 2, headY + 5)
    ctx.quadraticCurveTo(-headR + 3, headY + 1, -headR + 3, headY - 3)
    ctx.closePath()
    ctx.fill()

    // 臉(向右;眼 + 淡淡微笑)
    ctx.fillStyle = '#3a2a18'
    ctx.beginPath(); ctx.arc(headR - 2.6, headY - 0.5, 1.2, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#9a5a4a'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.arc(headR - 2, headY + 3, 2, 0.1 * Math.PI, 0.7 * Math.PI); ctx.stroke()

    ctx.restore()
  }

  // 古代近東聚落房子(伯利恆)
  _buildings(off, density = 1) {
    const ctx = this.ctx
    const base = GROUND_Y - 8
    const WALL = ['#d8c5a0', '#cdb892', '#e2d4b2', '#c9b48a']
    const SHADE = 'rgba(95,70,40,0.16)'
    const DARK = 'rgba(70,50,28,0.72)'
    const step = 128
    const hash = (n) => {
      const v = Math.sin(n * 127.1) * 43758.5453
      return v - Math.floor(v)
    }
    const start = -((((off % step) + step) % step))
    for (let x = start; x < VIEW.W + step; x += step) {
      const key = Math.round((x + off) / step)
      if (density < 1 && hash(key * 3.7 + 11) > density) continue
      const r = hash(key)
      const r2 = hash(key * 2.3 + 7)
      const r3 = hash(key * 5.1 + 3)
      const bw = 84 + Math.floor(r * 36)
      const h = 50 + Math.floor(r2 * 56)
      const top = base - h
      const idx = ((key % WALL.length) + WALL.length) % WALL.length
      ctx.fillStyle = WALL[idx]; ctx.fillRect(x, top, bw, h)
      ctx.fillStyle = SHADE; ctx.fillRect(x + bw * 0.66, top, bw * 0.34, h)
      ctx.fillStyle = 'rgba(70,50,28,0.30)'; ctx.fillRect(x - 2, top - 5, bw + 4, 6)
      if (r3 > 0.82) { ctx.fillStyle = WALL[idx]; ctx.beginPath(); ctx.arc(x + bw / 2, top - 4, bw * 0.3, Math.PI, 2 * Math.PI); ctx.fill() }
      ctx.fillStyle = DARK
      const winCount = r < 0.32 ? 0 : r < 0.72 ? 1 : 2
      for (let kk = 0; kk < winCount; kk++) {
        const wx = x + bw * (winCount === 1 ? 0.5 : 0.34 + kk * 0.32) - 5
        ctx.fillRect(wx, top + 14, 10, 12)
      }
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, h / 2, w / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// 兩個十六進位色 a→b 依 t(0..1)線性混合
function mix(a, b, t) {
  const pa = hex(a), pb = hex(b)
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t)
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t)
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t)
  return `rgb(${r},${g},${bl})`
}
function hex(c) {
  const m = c.replace('#', '')
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)]
}

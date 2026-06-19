import { VIEW, GROUND_Y, PLAYER, RUN, STAMINA, FAINT } from './config.js'
import { CONTENT } from './content.js'

// 所有畫面繪製集中在這裡。背景用 Canvas 圖形畫,角色用向量先知、收集物用 emoji
// (零美術檔即可運行)。採邏輯解析度 960×540,等比縮放置中。
// 先知向量 _prophet 與 _buildings / roundRect / _emoji 沿用約拿引擎(以利亞同為向右奔跑的先知)。

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.cssW = VIEW.W
    this.cssH = VIEW.H
    this.dpr = 1
    this._t = 0 // 環境動畫時鐘(熱浪/光暈用)
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

    this._bgWilderness(dist)

    // 開場的羅騰樹🌳(在世界起點,隨前進往左捲離)
    const treeX = PLAYER.x + 70 - dist
    if (treeX > -120) this._broomTree(treeX)

    // 終點:何烈山(接近終點時從右側滑入)
    const goalX = game.goalPos(dist)
    if (goalX !== null) this._horeb(goalX)

    // 天使👼(站在地上,常常遇到;頭上光環 + 還沒遇到的有 💬 提示氣泡)
    for (const a of game.spawner.angels) {
      this._angel(a.x, a.met)
    }

    // 障礙(溫和的曠野熱浪/塵霧/石頭)
    for (const o of game.spawner.obstacles) {
      this._emoji(o.emoji, o.x, GROUND_Y + 4, o.size)
    }

    // 衝刺中(撿到炭火燒的餅🥖):以利亞身後拖出速度線
    if (game.boostLeft > 0 && game.speed > 1) {
      const ctx = this.ctx
      ctx.strokeStyle = 'rgba(255,214,90,0.55)'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      for (let i = 0; i < 6; i++) {
        const ly = GROUND_Y - 14 - i * 9 - Math.sin(dist * 0.05 + i) * 3
        const lx = game.player.x - 34 - ((dist * 0.9 + i * 53) % 70)
        ctx.beginPath()
        ctx.moveTo(lx, ly)
        ctx.lineTo(lx - 30, ly)
        ctx.stroke()
      }
    }

    // 以利亞:癱坐(faint)時呈屈膝坐姿 + 😞💤;否則向右奔跑(受擊無敵時閃爍)
    const p = game.player
    if (game.state === 'faint') {
      this._prophet(p.x, GROUND_Y, 0, false, false, true) // crouch 當癱坐
      const bob = Math.sin(this._t * 3) * 3
      this._emoji('😞', p.x + 24, GROUND_Y - 64 + bob, 24, 'middle')
      this._emoji('💤', p.x + 40, GROUND_Y - 84 - bob, 22, 'middle')
    } else {
      const blink = p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0
      if (!blink) {
        const moving = game.speed > 1 && game.state === 'playing'
        const phase = moving ? dist * 0.05 : 0
        this._prophet(p.x, p.y, phase, !p.onGround)
      }
    }

    this._hud(game)

    // 覆蓋層:開場 / 遇到天使對話 / 癱坐 / 過關 的劇情卡(畫在 canvas 上)
    if (game.state === 'intro') this._panel(CONTENT.intro, '點畫面 / 按空白鍵　起來吃吧 →')
    else if (game.state === 'dialogue') this._dialoguePanel(game)
    else if (game.state === 'faint') this._faintPanel(game)
    else if (game.state === 'win') this._panel(CONTENT.win, CONTENT.win.cont)
    else if (game.state === 'paused') this._dimText('已暫停　·　點畫面或按 P 繼續')
  }

  // 天使:站在地上的向量小人(白袍+金光環+翅膀),met 後光環變淡;未遇到的頭上有 💬。
  _angel(x, met) {
    const ctx = this.ctx
    const footY = GROUND_Y
    const bob = Math.sin(this._t * 2 + x * 0.01) * 3
    const cy = footY - 52 + bob
    // 腳下到頭頂的柔和光柱
    const glow = ctx.createRadialGradient(x, cy, 4, x, cy, 60)
    glow.addColorStop(0, `rgba(255,248,210,${met ? 0.35 : 0.7})`)
    glow.addColorStop(1, 'rgba(255,248,210,0)')
    ctx.fillStyle = glow
    ctx.fillRect(x - 60, cy - 60, 120, 120)
    // 翅膀
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.beginPath()
    ctx.ellipse(x - 16, cy + 6, 14, 22, 0.5, 0, Math.PI * 2)
    ctx.ellipse(x + 16, cy + 6, 14, 22, -0.5, 0, Math.PI * 2)
    ctx.fill()
    // 白袍身體
    ctx.fillStyle = '#f6f3ec'
    ctx.beginPath()
    ctx.moveTo(x - 9, cy + 2)
    ctx.lineTo(x + 9, cy + 2)
    ctx.lineTo(x + 13, footY)
    ctx.lineTo(x - 13, footY)
    ctx.closePath()
    ctx.fill()
    // 頭
    ctx.fillStyle = '#e8bb8d'
    ctx.beginPath()
    ctx.arc(x, cy - 8, 8, 0, Math.PI * 2)
    ctx.fill()
    // 臉(慈祥):雙眼 + 微笑——以利亞灰心,天使的神情要溫柔
    ctx.fillStyle = '#5b4636'
    ctx.beginPath(); ctx.arc(x - 3, cy - 9, 1.2, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(x + 3, cy - 9, 1.2, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#5b4636'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.arc(x, cy - 6.5, 3, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke() // 微笑
    // 金光環
    ctx.strokeStyle = '#ffd966'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.ellipse(x, cy - 20, 9, 3.5, 0, 0, Math.PI * 2)
    ctx.stroke()
    // 手拿神所賜的餅與水,向以利亞遞出(王上 19:6「在他頭旁有一瓶水和一塊炭火燒的餅」)
    const hy = cy + 17 // 雙手/物品高度
    ctx.strokeStyle = '#f6f3ec'; ctx.lineWidth = 4; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(x - 7, cy + 5); ctx.lineTo(x - 16, hy); ctx.stroke() // 左臂遞餅
    ctx.beginPath(); ctx.moveTo(x + 7, cy + 5); ctx.lineTo(x + 16, hy); ctx.stroke() // 右臂遞水
    // 炭火燒的餅(左手):圓餅 + 一道烤紋
    ctx.fillStyle = '#d8a86a'
    ctx.beginPath(); ctx.ellipse(x - 18, hy, 6.2, 4.4, 0, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#a9763f'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(x - 21, hy); ctx.lineTo(x - 15, hy); ctx.stroke()
    // 一瓶水(右手):水瓶 + 瓶口
    ctx.fillStyle = '#6db8df'
    ctx.beginPath()
    ctx.moveTo(x + 15, hy - 5); ctx.lineTo(x + 21, hy - 5); ctx.lineTo(x + 20, hy + 6); ctx.lineTo(x + 16, hy + 6)
    ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#cdeafb'; ctx.fillRect(x + 17, hy - 8, 2.5, 3) // 瓶口
    // 未遇到:頭上 💬 提示(走過去就會對話)
    if (!met) {
      this._emoji('💬', x, footY - 92 + bob, 28, 'middle')
    }
  }

  // 遇到天使的對話卡:天使的話「say」+ 經文出處 + 領受餅水提示 + 繼續。
  _dialoguePanel(game) {
    const ctx = this.ctx
    const d = game.dialogue || { say: '', ref: '' }
    ctx.fillStyle = 'rgba(20,14,6,0.5)'
    ctx.fillRect(0, 0, VIEW.W, VIEW.H)
    const cx = VIEW.W / 2
    let y = 120
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    // 天使大圖示
    this._emoji('👼', cx, y, 64, 'top')
    y += 78
    ctx.fillStyle = '#ffe9b0'
    ctx.font = '800 24px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.fillText('天使對以利亞說', cx, y)
    y += 40
    // 天使的話
    ctx.fillStyle = '#fff6e2'
    ctx.font = '700 22px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    y = this._wrapped(`「${d.say}」`, cx, y, 720, 30)
    y += 8
    // 經文出處
    if (d.ref) {
      ctx.fillStyle = '#cfe0a0'
      ctx.font = '700 17px "Noto Sans TC","Microsoft JhengHei",sans-serif'
      ctx.fillText(d.ref, cx, y)
      y += 30
    }
    // 領受餅水
    ctx.fillStyle = 'rgba(245,238,224,0.95)'
    ctx.font = '600 18px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.fillText(CONTENT.angelGift, cx, y)
    y += 36
    // 繼續(脈動)
    ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(this._t * 4))
    ctx.fillStyle = '#fff'
    ctx.font = '800 20px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.fillText('👉 點畫面 / 按空白鍵　繼續前行', cx, Math.min(y + 6, VIEW.H - 40))
    ctx.globalAlpha = 1
  }

  // ---- 背景:曠野(暖色晨光/黃昏天空 + 遠方沙丘 + 零星聚落 + 沙地土路 + 熱浪) ----
  _bgWilderness(dist) {
    const ctx = this.ctx
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW.H)
    sky.addColorStop(0, '#f0b97a')
    sky.addColorStop(0.5, '#f8d9a8')
    sky.addColorStop(1, '#fbeccf')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, VIEW.W, VIEW.H)

    // 低空暖陽 + 光暈
    const sunX = VIEW.W * 0.74
    const sunY = VIEW.H * 0.24
    const halo = ctx.createRadialGradient(sunX, sunY, 6, sunX, sunY, 130)
    halo.addColorStop(0, 'rgba(255,244,210,0.95)')
    halo.addColorStop(1, 'rgba(255,244,210,0)')
    ctx.fillStyle = halo
    ctx.fillRect(sunX - 130, sunY - 130, 260, 260)
    ctx.fillStyle = 'rgba(255,250,235,0.95)'
    ctx.beginPath()
    ctx.arc(sunX, sunY, 26, 0, Math.PI * 2)
    ctx.fill()

    // 遠方沙丘(視差,最慢)
    const duneBase = GROUND_Y - 6
    const doff = dist * 0.12
    ctx.fillStyle = '#e7cd92'
    ctx.beginPath()
    ctx.moveTo(0, duneBase)
    for (let x = 0; x <= VIEW.W; x += 24) {
      const y = duneBase - 24 - Math.sin((x + doff) * 0.006) * 22 - Math.sin((x + doff) * 0.013 + 1) * 9
      ctx.lineTo(x, y)
    }
    ctx.lineTo(VIEW.W, duneBase)
    ctx.closePath()
    ctx.fill()

    // 沿途零星聚落(曠野房子要少)
    this._buildings(dist * 0.25, 0.22)

    // 沙地(地面)
    const sand = ctx.createLinearGradient(0, GROUND_Y - 6, 0, VIEW.H)
    sand.addColorStop(0, '#dcc081')
    sand.addColorStop(1, '#c8a766')
    ctx.fillStyle = sand
    ctx.fillRect(0, GROUND_Y - 6, VIEW.W, VIEW.H - (GROUND_Y - 6))

    // 土路 + 隨前進往左捲動的石子刻痕(製造前進感)
    ctx.fillStyle = '#b6925a'
    ctx.fillRect(0, GROUND_Y, VIEW.W, 16)
    ctx.fillStyle = 'rgba(120,92,52,0.55)'
    const tick = 64
    const tshift = -(dist % tick)
    for (let x = tshift; x < VIEW.W; x += tick) {
      ctx.fillRect(x, GROUND_Y + 6, 14, 3)
    }

    // 近地面的熱浪(扭動的細波,往上飄)
    ctx.strokeStyle = 'rgba(255,235,190,0.22)'
    ctx.lineWidth = 2
    for (let i = 0; i < 3; i++) {
      const hy = GROUND_Y - 10 - ((this._t * 24 + i * 24) % 80)
      ctx.beginPath()
      for (let x = 0; x <= VIEW.W; x += 18) {
        const off = Math.sin(x * 0.05 + this._t * 4 + i * 2) * 3
        if (x === 0) ctx.moveTo(x, hy + off)
        else ctx.lineTo(x, hy + off)
      }
      ctx.stroke()
    }
  }

  // 羅騰樹(王上 19:4–5 以利亞坐臥求死的那棵):矮樹幹 + 一叢灰綠枝葉
  _broomTree(x) {
    const ctx = this.ctx
    const base = GROUND_Y
    ctx.strokeStyle = '#8a6a3a'
    ctx.lineWidth = 7
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x, base)
    ctx.lineTo(x - 4, base - 46)
    ctx.moveTo(x, base - 26)
    ctx.lineTo(x + 16, base - 50)
    ctx.moveTo(x, base - 30)
    ctx.lineTo(x - 18, base - 52)
    ctx.stroke()
    ctx.fillStyle = 'rgba(120,140,96,0.92)' // 灰綠的細葉叢
    for (const [dx, dy, r] of [[-14, -58, 22], [12, -62, 24], [0, -74, 22], [-2, -50, 20]]) {
      ctx.beginPath()
      ctx.ellipse(x + dx, base + dy, r, r * 0.7, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // 何烈山(神的山,王上 19:8):遠方一座高聳的岩山,山頂微微發亮
  _horeb(x) {
    const ctx = this.ctx
    const base = GROUND_Y + 6
    const H = 230
    const W = 300
    // 山體
    const g = ctx.createLinearGradient(0, base - H, 0, base)
    g.addColorStop(0, '#9a8a6e')
    g.addColorStop(1, '#6f5e44')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(x - W / 2, base)
    ctx.lineTo(x - 36, base - H + 30)
    ctx.lineTo(x - 6, base - H)
    ctx.lineTo(x + 28, base - H + 46)
    ctx.lineTo(x + W / 2, base)
    ctx.closePath()
    ctx.fill()
    // 受光面(左側較亮)
    ctx.fillStyle = 'rgba(255,244,210,0.30)'
    ctx.beginPath()
    ctx.moveTo(x - 6, base - H)
    ctx.lineTo(x - 36, base - H + 30)
    ctx.lineTo(x - W / 2 + 60, base)
    ctx.lineTo(x - 10, base)
    ctx.closePath()
    ctx.fill()
    // 山頂榮光(神的山)
    const halo = ctx.createRadialGradient(x - 6, base - H, 4, x - 6, base - H, 70)
    halo.addColorStop(0, 'rgba(255,248,220,0.9)')
    halo.addColorStop(1, 'rgba(255,248,220,0)')
    ctx.fillStyle = halo
    ctx.fillRect(x - 76, base - H - 70, 152, 140)
  }

  // ---- HUD ----
  _hud(game) {
    const ctx = this.ctx

    // 進度條(羅騰樹 → 何烈山)
    const hud = CONTENT.hud
    const barW = 360
    const barH = 14
    const bx = (VIEW.W - barW) / 2
    const by = 34
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    roundRect(ctx, bx, by, barW, barH, 7)
    ctx.fill()
    const prog = Math.min(1, game.distance / (game.goalDistance || RUN.goalDistance))
    ctx.fillStyle = '#2f9e44'
    roundRect(ctx, bx, by, barW * prog, barH, 7)
    ctx.fill()
    ctx.fillStyle = '#5a3a16'
    ctx.font = '600 15px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.textBaseline = 'bottom'
    ctx.textAlign = 'left'
    ctx.fillText(hud.start, bx, by - 3)
    ctx.textAlign = 'right'
    ctx.fillText(hud.goal, bx + barW, by - 3)

    // 體力條(這一關的核心;低於 STAMINA.low 轉紅、脈動)
    const sb = game.stamina / STAMINA.max
    const sW = 300
    const sH = 20
    const sx = (VIEW.W - sW) / 2
    const sy = by + 30
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

    // 左上:遇見天使的次數(每次都領受餅水恢復體力)
    ctx.fillStyle = '#7a5320'
    ctx.font = '600 24px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(`👼 ${game.angelsMet || 0}`, 26, 44)

    // 低體力提示
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

    // 底部操作提示
    if (game.state === 'playing') {
      ctx.fillStyle = 'rgba(60,45,25,0.7)'
      ctx.font = '600 17px "Noto Sans TC","Microsoft JhengHei",sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText('空白 / ↑ / 點畫面 = 跳過障礙　·　走到天使👼面前聽祂說話、領受餅水　·　走到何烈山過關', VIEW.W / 2, VIEW.H - 12)
    }
  }

  // 半透明劇情卡(intro / win):title.kicker + ref/line + body/teach + 繼續提示
  _panel(c, cont) {
    const ctx = this.ctx
    ctx.fillStyle = 'rgba(20,14,6,0.5)'
    ctx.fillRect(0, 0, VIEW.W, VIEW.H)

    const cardW = 700
    const cx = VIEW.W / 2
    let y = 96
    // 標題
    ctx.fillStyle = '#ffe9b0'
    ctx.font = '800 28px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(c.kicker, cx, y)
    y += 44

    // 經文出處 + 和合本
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
    // 信息(body / teach)
    const body = c.body || c.teach
    if (body) {
      ctx.fillStyle = 'rgba(245,238,224,0.94)'
      ctx.font = '500 16px "Noto Sans TC","Microsoft JhengHei",sans-serif'
      for (const para of body.split('\n')) {
        y = this._wrapped(para, cx, y, cardW, 24)
        y += 4
      }
    }
    // 繼續提示(脈動)
    ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(this._t * 4))
    ctx.fillStyle = '#fff'
    ctx.font = '800 20px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.fillText(`👉 ${cont}`, cx, Math.min(y + 18, VIEW.H - 40))
    ctx.globalAlpha = 1
  }

  // 癱坐卡(轉瞬即逝,會自動再起):溫柔提示,不是失敗
  _faintPanel(game) {
    const ctx = this.ctx
    ctx.fillStyle = 'rgba(20,14,6,0.45)'
    ctx.fillRect(0, 0, VIEW.W, VIEW.H)
    const cx = VIEW.W / 2
    let y = 150
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = '#ffe9b0'
    ctx.font = '800 26px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.fillText('歇一下……神再扶你起來', cx, y)
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
    ctx.fillStyle = 'rgba(20,14,6,0.5)'
    ctx.fillRect(0, 0, VIEW.W, VIEW.H)
    ctx.fillStyle = '#fff'
    ctx.font = '700 22px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(msg, VIEW.W / 2, VIEW.H / 2)
  }

  // 置中換行(中文按字寬量測);回傳下一行的 y
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

  // ===== 以下沿用約拿引擎的向量先知與背景 helper(以利亞同為向右奔跑的白袍先知) =====

  // 用 Canvas 直接畫一個「面向右、奔跑中的先知」。
  // phase = 步伐相位(弧度);airborne = 是否在跳躍中;faceLeft = 是否面向左;crouch = 蹲坐(這裡當癱坐)。
  _prophet(x, footY, phase, airborne, faceLeft = false, crouch = false) {
    const ctx = this.ctx
    const sw = Math.sin(phase) * 0.6
    const bob = airborne ? 0 : -Math.abs(Math.sin(phase)) * 2.5

    const COL = {
      robe: '#f6f3ec',
      robeDark: '#dcd5c6',
      belt: '#9c7a3a',
      skin: '#e8bb8d',
      beard: '#5a4326',
      wrap: '#f6f3ec',
      band: '#b23b3b',
      sandal: '#6b4a26',
      staff: '#8a5a2a',
      knob: '#6f4720',
    }

    const legF = crouch ? 0.85 : airborne ? 0.95 : sw
    const legB = crouch ? -0.85 : airborne ? -0.35 : -sw
    const armB = crouch ? 0.5 : airborne ? -1.3 : sw * 0.9

    const sink = crouch ? 15 : 0
    const kneeY = -17 + (crouch ? 9 : 0)
    const shin = 17
    const shoulderY = -45 + sink
    const armLen = 16
    const headY = -53 + sink
    const headR = 7

    const drawLeg = (ang) => {
      const fx = Math.sin(ang) * shin
      const fy = kneeY + Math.cos(ang) * shin
      ctx.strokeStyle = COL.skin
      ctx.lineWidth = 7
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(0, kneeY)
      ctx.lineTo(fx, fy)
      ctx.stroke()
      ctx.fillStyle = COL.sandal
      ctx.beginPath()
      ctx.ellipse(fx + 3, fy + 1, 6, 3.2, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    const drawArm = (ang) => {
      const hx = Math.sin(ang) * armLen
      const hy = shoulderY + Math.cos(ang) * armLen
      ctx.strokeStyle = COL.robe
      ctx.lineWidth = 7
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(0, shoulderY)
      ctx.lineTo(hx, hy)
      ctx.stroke()
      ctx.fillStyle = COL.skin
      ctx.beginPath()
      ctx.arc(hx, hy, 3.6, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.save()
    ctx.translate(x, footY + bob)
    if (faceLeft) ctx.scale(-1, 1)

    ctx.globalAlpha = 0.82
    drawArm(armB)
    drawLeg(legB)
    ctx.globalAlpha = 1

    const swish = airborne ? 1 : Math.sin(phase) * 2
    ctx.fillStyle = COL.robe
    ctx.beginPath()
    ctx.moveTo(-8, shoulderY + 2)
    ctx.lineTo(8, shoulderY + 2)
    ctx.lineTo(13 + swish, -19)
    ctx.quadraticCurveTo(0, -15, -13 + swish, -19)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = COL.robeDark
    ctx.beginPath()
    ctx.moveTo(2, shoulderY + 3)
    ctx.lineTo(8, shoulderY + 2)
    ctx.lineTo(13 + swish, -19)
    ctx.lineTo(4, -18)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = COL.belt
    ctx.lineWidth = 4
    ctx.lineCap = 'butt'
    ctx.beginPath()
    ctx.moveTo(-8.5, -28)
    ctx.lineTo(9, -28)
    ctx.stroke()

    drawLeg(legF)

    const sTopX = airborne ? 17 : 14
    const sTopY = airborne ? -72 : -63
    const sBotX = airborne ? 11 : 9
    const sBotY = airborne ? -8 : 5
    const gx = airborne ? 14 : 12
    const gy = airborne ? -42 : -33
    ctx.strokeStyle = COL.staff
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(sTopX, sTopY)
    ctx.lineTo(sBotX, sBotY)
    ctx.stroke()
    ctx.fillStyle = COL.knob
    ctx.beginPath()
    ctx.arc(sTopX, sTopY, 3.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = COL.robe
    ctx.lineWidth = 7
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, shoulderY)
    ctx.lineTo(gx, gy)
    ctx.stroke()
    ctx.fillStyle = COL.skin
    ctx.beginPath()
    ctx.arc(gx, gy, 3.9, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = COL.skin
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, shoulderY)
    ctx.lineTo(0, headY + headR - 1)
    ctx.stroke()

    ctx.fillStyle = COL.skin
    ctx.beginPath()
    ctx.arc(0, headY, headR, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = COL.beard
    ctx.beginPath()
    ctx.moveTo(-headR + 1.5, headY + 1)
    ctx.quadraticCurveTo(1, headY + headR + 8, headR - 0.5, headY + 2.5)
    ctx.quadraticCurveTo(headR - 4, headY + headR - 1, -headR + 1.5, headY + 1)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = COL.wrap
    ctx.beginPath()
    ctx.arc(0, headY, headR + 1.6, Math.PI, 2 * Math.PI)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(-headR, headY - 3)
    ctx.lineTo(-headR - 4, headY + 9)
    ctx.lineTo(-headR + 1.5, headY + 6)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = COL.band
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(0, headY, headR + 0.8, Math.PI * 1.08, Math.PI * 1.95)
    ctx.stroke()

    ctx.fillStyle = COL.skin
    ctx.beginPath()
    ctx.arc(headR - 0.5, headY + 1.5, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#3a2a18'
    ctx.beginPath()
    ctx.arc(headR - 3, headY - 0.5, 1.2, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  // 古代近東聚落房子(平頂、女兒牆、泥磚色);density 0..1 = 出現機率(曠野取低值)。
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
      const h = 60 + Math.floor(r2 * 66)
      const top = base - h
      const idx = ((key % WALL.length) + WALL.length) % WALL.length

      ctx.fillStyle = WALL[idx]
      ctx.fillRect(x, top, bw, h)
      ctx.fillStyle = SHADE
      ctx.fillRect(x + bw * 0.66, top, bw * 0.34, h)
      ctx.fillStyle = 'rgba(70,50,28,0.30)'
      ctx.fillRect(x - 2, top - 5, bw + 4, 6)

      if (r3 > 0.82) {
        ctx.fillStyle = WALL[idx]
        ctx.beginPath()
        ctx.arc(x + bw / 2, top - 4, bw * 0.3, Math.PI, 2 * Math.PI)
        ctx.fill()
      }

      ctx.fillStyle = DARK
      const winCount = r < 0.32 ? 0 : r < 0.72 ? 1 : 2
      for (let k = 0; k < winCount; k++) {
        const wx = x + bw * (winCount === 1 ? 0.5 : 0.34 + k * 0.32) - 5
        ctx.fillRect(wx, top + 16, 10, 13)
      }

      const dw = 15
      const dh = 24
      const dx = x + bw / 2 - dw / 2
      const dy = base - dh
      ctx.fillStyle = DARK
      ctx.fillRect(dx, dy, dw, dh)
      ctx.beginPath()
      ctx.arc(dx + dw / 2, dy, dw / 2, Math.PI, 2 * Math.PI)
      ctx.fill()
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

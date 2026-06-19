import { VIEW, GROUND_Y, PLAYER, RUN, STORM, FARE, FISH, PREACH, GOURD, MOSES, REDSEA, JEHOSHAPHAT, BALAAM } from './config.js'

// 所有畫面繪製集中在這裡。背景用 Canvas 圖形畫,角色/物件用 emoji 當圖示
// (零美術檔即可運行,日後可換成真圖)。採邏輯解析度 960×540,等比縮放置中。

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.cssW = VIEW.W
    this.cssH = VIEW.H
    this.dpr = 1
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

  // 設定本影格的座標系:清空 + 等比縮放 + 黑邊置中
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
    const ctx = this.ctx
    this._begin()

    // 第二關「暴風雨」是另一個畫面
    if (game.level === 2) {
      this._drawStorm(game)
      return
    }
    // 戰爭闖關原型「摩西舉手」(出 17)也是另一個畫面
    if (game.level === 7) {
      this._drawMoses(game)
      return
    }
    // 戰爭闖關原型「紅海奔逃」(出 14)也是另一個畫面
    if (game.level === 8) {
      this._drawRedSea(game)
      return
    }
    // 戰爭闖關原型「聖歌奇兵 · 約沙法」(代下 20)也是另一個畫面
    if (game.level === 9) {
      this._drawJehoshaphat(game)
      return
    }
    // 戰爭闖關原型「反轉奇兵 · 巴蘭的驢」(民 22)也是另一個畫面
    if (game.level === 10) {
      this._drawBalaam(game)
      return
    }
    // 第三關「大魚肚內」也是另一個畫面
    if (game.level === 3) {
      this._drawFish(game)
      return
    }
    // 第五關「尼尼微傳道」也是另一個畫面
    if (game.level === 5) {
      this._drawPreach(game)
      return
    }
    // 第六關「蓖麻樹」也是另一個畫面
    if (game.level === 6) {
      this._drawGourd(game)
      return
    }

    const dist = game.distance || 0
    const nineveh = game.level === 4

    // 背景:第一關=約帕港口(海+碼頭木板);第四關=曠野路 → 尼尼微大城(沙地)
    if (nineveh) this._bgNineveh(dist)
    else this._bgHarbor(dist)

    // 空中寶物(船價/陶罐/經卷/鴿子/愛心)
    for (const c of game.spawner.treasures) {
      const bob = Math.sin((dist + c.x) * 0.02) * 4
      this._emoji(c.emoji, c.x, c.y + bob, c.size || 30, 'middle')
    }

    // 障礙
    for (const o of game.spawner.obstacles) {
      this._emoji(o.emoji, o.x, GROUND_Y + 4, o.size)
    }

    // 小敵人(爬行時左右輕微擺動)
    for (const e of game.spawner.enemies) {
      const wob = Math.sin((dist + e.x) * 0.05) * 2
      this._emoji(e.emoji, e.x + wob, GROUND_Y + 4, e.size)
    }

    // NPC(漫步模式:碼頭長者,走近觸發聖經問答;頭上有 ❓/✅ 提示氣泡)
    for (const n of game.spawner.npcs) {
      this._emoji(n.emoji, n.x, GROUND_Y + 6, n.size)
      const bob = Math.sin((dist + n.x) * 0.04) * 3
      this._emoji(n.done ? '✅' : '❓', n.x, GROUND_Y - 66 + bob, 30, 'middle')
    }

    // 終點目標(接近終點時滑入):第一關=往他施的船 ⛵,第四關=尼尼微城門
    const goalX = game.goalPos(dist)
    if (goalX !== null) {
      if (nineveh) this._ninevehGate(goalX)
      else this._emoji('⛵', goalX, GROUND_Y + 8, 120)
    }

    // 衝刺中(撿到 ⚡ 或按住衝刺):約拿身後拖出速度線,跑出「風馳」感
    if ((game.boostLeft > 0 || game.sprinting) && game.speed > 1) {
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

    // 約拿(向先知,向右奔跑;受擊無敵時閃爍)
    const p = game.player
    const blink = p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0
    if (!blink) {
      // 步伐相位綁定移動距離:跑越快、步頻越快。
      // 停下時 speed≈0 → phase 設 0,呈自然站立姿勢;往後退(speed<0)時面向左。
      const moving = Math.abs(game.speed) > 1
      const phase = moving ? dist * 0.05 : 0
      this._prophet(p.x, p.y, phase, !p.onGround, game.speed < -1)
    }

    // HUD
    this._hud(game)
  }

  // 第一關背景:約帕港口(藍天 + 遠景泥磚城 + 海 + 碼頭木板)
  _bgHarbor(dist) {
    const ctx = this.ctx
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW.H)
    sky.addColorStop(0, '#8fd3ff')
    sky.addColorStop(0.6, '#cfeeff')
    sky.addColorStop(1, '#e9f7ff')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, VIEW.W, VIEW.H)

    this._buildings(dist * 0.25) // 遠景建築(視差,捲動較慢)

    // 海
    ctx.fillStyle = '#3a86c8'
    ctx.fillRect(0, GROUND_Y - 8, VIEW.W, VIEW.H - (GROUND_Y - 8))
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 3
    for (let i = 0; i < 3; i++) {
      const yy = GROUND_Y + 20 + i * 26
      ctx.beginPath()
      for (let x = 0; x <= VIEW.W; x += 20) {
        const off = Math.sin((x + dist * 0.5 + i * 40) * 0.03) * 4
        if (x === 0) ctx.moveTo(x, yy + off)
        else ctx.lineTo(x, yy + off)
      }
      ctx.stroke()
    }

    // 碼頭木板(地面)
    ctx.fillStyle = '#b07a43'
    ctx.fillRect(0, GROUND_Y, VIEW.W, 18)
    ctx.fillStyle = '#8a5e30'
    const plankW = 56
    const shift = -(dist % plankW)
    for (let x = shift; x < VIEW.W; x += plankW) {
      ctx.fillRect(x, GROUND_Y, 3, 18)
    }
  }

  // 第四關背景:曠野路 → 尼尼微大城(暖色晨光天空 + 遠方沙丘 + 遠景城 + 沙地土路)
  _bgNineveh(dist) {
    const ctx = this.ctx
    // 晨光天空(順服神的新一天)
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW.H)
    sky.addColorStop(0, '#f5b96a')
    sky.addColorStop(0.5, '#fbdca6')
    sky.addColorStop(1, '#fcefd3')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, VIEW.W, VIEW.H)

    // 低空暖陽 + 光暈
    const sunX = VIEW.W * 0.78
    const sunY = VIEW.H * 0.26
    const halo = ctx.createRadialGradient(sunX, sunY, 6, sunX, sunY, 120)
    halo.addColorStop(0, 'rgba(255,243,210,0.95)')
    halo.addColorStop(1, 'rgba(255,243,210,0)')
    ctx.fillStyle = halo
    ctx.fillRect(sunX - 120, sunY - 120, 240, 240)
    ctx.fillStyle = 'rgba(255,250,235,0.95)'
    ctx.beginPath()
    ctx.arc(sunX, sunY, 26, 0, Math.PI * 2)
    ctx.fill()

    // 遠方沙丘(視差,最慢)
    const duneBase = GROUND_Y - 6
    const doff = dist * 0.12
    ctx.fillStyle = '#e8cf98'
    ctx.beginPath()
    ctx.moveTo(0, duneBase)
    for (let x = 0; x <= VIEW.W; x += 24) {
      const y = duneBase - 24 - Math.sin((x + doff) * 0.006) * 22 - Math.sin((x + doff) * 0.013 + 1) * 9
      ctx.lineTo(x, y)
    }
    ctx.lineTo(VIEW.W, duneBase)
    ctx.closePath()
    ctx.fill()

    // 沿途零星聚落(曠野不是城,房子要少;到了終點另有尼尼微大城門)
    this._buildings(dist * 0.25, 0.28)

    // 沙地(地面)
    const sand = ctx.createLinearGradient(0, GROUND_Y - 6, 0, VIEW.H)
    sand.addColorStop(0, '#dcc081')
    sand.addColorStop(1, '#c8a766')
    ctx.fillStyle = sand
    ctx.fillRect(0, GROUND_Y - 6, VIEW.W, VIEW.H - (GROUND_Y - 6))

    // 土路 + 隨前進往左捲動的小石子刻痕(製造前進感)
    ctx.fillStyle = '#b6925a'
    ctx.fillRect(0, GROUND_Y, VIEW.W, 16)
    ctx.fillStyle = 'rgba(120,92,52,0.55)'
    const tick = 64
    const tshift = -(dist % tick)
    for (let x = tshift; x < VIEW.W; x += tick) {
      ctx.fillRect(x, GROUND_Y + 6, 14, 3)
    }
  }

  // 尼尼微大城城門:兩座泥磚塔樓 + 中央拱門 + 城垛(用第一關城屋的泥磚色,讀作「極大的城」)
  _ninevehGate(x) {
    const ctx = this.ctx
    const base = GROUND_Y + 8
    const WALL = '#cdb892'
    const SHADE = 'rgba(95,70,40,0.20)'
    const DARK = 'rgba(60,42,22,0.85)'
    const towerH = 150
    const towerW = 40
    const gap = 56 // 中央門洞寬
    const top = base - towerH

    // 左右塔樓
    for (const side of [-1, 1]) {
      const tx = x + side * (gap / 2 + towerW / 2) - towerW / 2
      ctx.fillStyle = WALL
      ctx.fillRect(tx, top, towerW, towerH)
      ctx.fillStyle = SHADE
      ctx.fillRect(tx + towerW * 0.62, top, towerW * 0.38, towerH)
      // 塔頂城垛(鋸齒)
      ctx.fillStyle = WALL
      for (let k = 0; k < 3; k++) ctx.fillRect(tx + k * (towerW / 3), top - 10, towerW / 3 - 3, 10)
      // 高窗
      ctx.fillStyle = DARK
      ctx.fillRect(tx + towerW / 2 - 4, top + 28, 8, 14)
    }

    // 中央門楣(連接兩塔)
    const lintelY = top + 40
    ctx.fillStyle = WALL
    ctx.fillRect(x - gap / 2 - 2, lintelY, gap + 4, base - lintelY)
    ctx.fillStyle = SHADE
    ctx.fillRect(x - gap / 2 - 2, lintelY, gap + 4, 6)

    // 拱形門洞(暗)
    const doorTop = lintelY + 20
    ctx.fillStyle = DARK
    ctx.fillRect(x - gap / 2 + 6, doorTop, gap - 12, base - doorTop)
    ctx.beginPath()
    ctx.arc(x, doorTop, (gap - 12) / 2, Math.PI, 2 * Math.PI)
    ctx.fill()
  }

  // 第二關「暴風雨」畫面:烏雲密布的天空、暴風大雨、起伏的海、大船與一群水手、
  // 閃電、撐住/危險條;結尾 cast(等拋約拿)/ thrown(約拿入海、海平息)。
  _drawStorm(game) {
    const ctx = this.ctx
    const s = game.storm
    const t = s.time
    // thrown 階段:海與雨隨進度平息(「海的狂浪就平息了」拿 1:15)
    const calm = s.phase === 'thrown' ? 1 - 0.8 * Math.min(1, s.thrownT / 1.4) : 1

    // 烏雲密布的暴風天空(thrown 末段微微透光)
    const lift = (1 - calm) * 0.5
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW.H)
    sky.addColorStop(0, lift > 0.2 ? '#2c3b49' : '#141d26')
    sky.addColorStop(0.6, lift > 0.2 ? '#41505e' : '#2c3a47')
    sky.addColorStop(1, '#44535f')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, VIEW.W, VIEW.H)

    // 低垂的烏雲(兩層團塊,緩慢漂移;用雜湊定形不閃爍)
    const cloudLayer = (speed, y0, rgba, scale) => {
      ctx.fillStyle = rgba
      for (let i = 0; i < 8; i++) {
        const w = (90 + ((i * 53) % 70)) * scale
        const x = ((i * 173 + t * speed) % (VIEW.W + 260)) - 130
        const y = y0 + ((i * 37) % 26)
        ctx.beginPath()
        ctx.ellipse(x, y, w, 26 * scale, 0, 0, Math.PI * 2)
        ctx.ellipse(x + w * 0.55, y + 8, w * 0.7, 20 * scale, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    cloudLayer(14, 26, 'rgba(16,24,32,0.85)', 1.15)
    cloudLayer(26, 64, 'rgba(30,40,50,0.7)', 0.9)

    // 暴風大雨(密、斜、快;thrown 時隨海平息漸停)
    if (calm > 0.15) {
      ctx.strokeStyle = `rgba(185,205,225,${0.42 * calm})`
      ctx.lineWidth = 2.5
      for (let i = 0; i < 130; i++) {
        const x = ((i * 137 + t * 860) % (VIEW.W + 60)) - 30
        const y = ((i * 89 + t * 1150) % (VIEW.H + 60)) - 30
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x - 9, y + 24)
        ctx.stroke()
      }
    }

    // 海(深色、起伏的浪;thrown 時浪高漸平)
    const seaY = GROUND_Y - 40
    ctx.fillStyle = '#23506e'
    ctx.fillRect(0, seaY, VIEW.W, VIEW.H - seaY)
    ctx.strokeStyle = 'rgba(220,235,245,0.5)'
    ctx.lineWidth = 3
    for (let k = 0; k < 4; k++) {
      const yy = seaY + 18 + k * 30
      ctx.beginPath()
      for (let x = 0; x <= VIEW.W; x += 16) {
        const off = Math.sin(x * 0.02 + t * 3 + k) * 10 * calm
        if (x === 0) ctx.moveTo(x, yy + off)
        else ctx.lineTo(x, yy + off)
      }
      ctx.stroke()
    }

    // 大船(以海面中央為軸,隨浪上下 + 依傾角旋轉;S=放大倍率)
    const S = 1.5
    const cx = VIEW.W / 2
    const cy = seaY + 6 + Math.sin(t * 2) * 6 * calm
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(s.tilt)
    // 船身
    ctx.fillStyle = '#7a4a22'
    ctx.beginPath()
    ctx.moveTo(-122 * S, 0)
    ctx.lineTo(122 * S, 0)
    ctx.lineTo(86 * S, 56 * S)
    ctx.lineTo(-86 * S, 56 * S)
    ctx.closePath()
    ctx.fill()
    // 船身木板紋
    ctx.strokeStyle = 'rgba(60,35,16,0.5)'
    ctx.lineWidth = 2
    for (let k = 1; k <= 2; k++) {
      ctx.beginPath()
      ctx.moveTo((-122 + 12 * k) * S, 18 * k)
      ctx.lineTo((122 - 12 * k) * S, 18 * k)
      ctx.stroke()
    }
    ctx.fillStyle = '#5e3717'
    ctx.fillRect(-122 * S, -9, 244 * S, 11) // 甲板邊
    // 船尾欄杆(右舷,給抓欄杆的水手抓;兩根立柱+橫杆)
    ctx.strokeStyle = '#4a2c12'
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(168, -9)
    ctx.lineTo(168, -42)
    ctx.moveTo(138, -9)
    ctx.lineTo(138, -42)
    ctx.moveTo(130, -40)
    ctx.lineTo(176, -40)
    ctx.stroke()
    // 桅杆 + 帆(被風吹得鼓脹)
    ctx.fillStyle = '#5e3717'
    ctx.fillRect(-6, -180, 12, 180)
    ctx.fillStyle = '#e8e2d0'
    ctx.beginPath()
    ctx.moveTo(6, -172)
    ctx.quadraticCurveTo(112, -120, 7, -42)
    ctx.closePath()
    ctx.fill()
    // 一群驚惶的水手(向量小人,古代短衣;拿 1:5 水手便懼怕、將貨物拋在海中;1:6 船主來)
    this._sailor(-150, -9, 'kneel', t) // 跪下、雙手朝天哀求
    this._sailor(-95, -9, 'pray', t) // 俯伏在甲板上禱告
    this._sailor(-50, -9, 'toss', t) // 把貨物拋進海裡(1:5)
    this._sailor(112, -9, 'grip', t) // 雙手死抓欄杆、身體被浪甩
    this._sailor(62, -9, 'captain', t) // 古代船主:深紅長袍+頭巾,朝約拿焦急揮手(1:6)
    // 約拿:ride/cast 站船中間;thrown 已被拋出,不畫在甲板上
    if (s.phase !== 'thrown') {
      this._prophet(0, 2, t * 0.05, false)
      if (s.phase === 'cast') {
        // 等拋:約拿身上一圈呼吸光暈,標示「就是他」
        const pr = 40 + Math.sin(t * 5) * 6
        ctx.strokeStyle = 'rgba(255,224,140,0.85)'
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.arc(0, -28, pr, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
    ctx.restore()

    // thrown:約拿從船上劃出拋物線落海 + 水花漣漪(他沉下去——大魚在下一關等他)
    if (s.phase === 'thrown') {
      const f = Math.min(1, s.thrownT / 1.1) // 飛行進度
      const x0 = cx
      const y0 = cy - 36
      const x1 = cx + 235
      const y1 = seaY + 46
      const jx = x0 + (x1 - x0) * f
      const jy = y0 + (y1 - y0) * f - 120 * Math.sin(Math.PI * f)
      if (f < 1) {
        ctx.save()
        ctx.translate(jx, jy)
        ctx.rotate(f * 2.4) // 翻滾著落下
        this._prophet(0, 28, 0, true)
        ctx.restore()
      } else {
        // 落水:水花 + 擴散漣漪
        const k = Math.min(1, (s.thrownT - 1.1) / 0.8)
        if (k < 0.55) this._emoji('💦', x1, y1 - 8, 44 + k * 30, 'middle')
        ctx.strokeStyle = `rgba(220,240,250,${0.7 * (1 - k)})`
        ctx.lineWidth = 3
        for (let r = 0; r < 2; r++) {
          ctx.beginPath()
          ctx.ellipse(x1, y1 + 6, 26 + k * 90 + r * 18, 7 + k * 18, 0, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
    }

    // 閃電白光
    if (s.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${s.flash * 0.4})`
      ctx.fillRect(0, 0, VIEW.W, VIEW.H)
    }

    // ---- 結尾階段的提示 ----
    if (s.phase === 'cast') {
      // 等玩家把約拿拋進海:經文 + 大提示(脈動)
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(8,20,30,0.55)'
      roundRect(ctx, VIEW.W / 2 - 330, 30, 660, 92, 14)
      ctx.fill()
      ctx.fillStyle = '#ffe9b0'
      ctx.font = '700 22px "Noto Sans TC","Microsoft JhengHei",sans-serif'
      ctx.textBaseline = 'middle'
      ctx.fillText('「你們將我抬起來,拋在海中,海就平靜了。」(拿 1:12)', VIEW.W / 2, 58)
      ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(t * 4))
      ctx.fillStyle = '#fff'
      ctx.font = '800 24px "Noto Sans TC","Microsoft JhengHei",sans-serif'
      ctx.fillText('👉 輕點畫面(或按 空白鍵)把約拿拋進海裡', VIEW.W / 2, 98)
      ctx.globalAlpha = 1
      return
    }
    if (s.phase === 'thrown') {
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(235,244,255,0.9)'
      ctx.font = '700 24px "Noto Sans TC","Microsoft JhengHei",sans-serif'
      ctx.textBaseline = 'middle'
      ctx.fillText('海的狂浪,就平息了。(拿 1:15)', VIEW.W / 2, 54)
      return
    }

    // 撐過風暴進度條
    const barW = 380
    const barH = 16
    const bx = (VIEW.W - barW) / 2
    const by = 26
    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    roundRect(ctx, bx, by, barW, barH, 8)
    ctx.fill()
    const prog = Math.min(1, s.survival / STORM.duration)
    ctx.fillStyle = '#7ec8ff'
    roundRect(ctx, bx, by, barW * prog, barH, 8)
    ctx.fill()
    ctx.fillStyle = '#eaf4ff'
    ctx.font = '600 16px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.textBaseline = 'bottom'
    ctx.textAlign = 'center'
    ctx.fillText('撐過風暴', VIEW.W / 2, by - 4)

    // 翻船危險條
    if (s.capsize > 0.02) {
      const dw = 300
      const dh = 14
      const dxb = (VIEW.W - dw) / 2
      const dyb = VIEW.H - 58
      ctx.fillStyle = 'rgba(0,0,0,0.32)'
      roundRect(ctx, dxb, dyb, dw, dh, 7)
      ctx.fill()
      ctx.fillStyle = '#e05a4a'
      roundRect(ctx, dxb, dyb, dw * s.capsize, dh, 7)
      ctx.fill()
      if (s.capsize > 0.5) {
        ctx.fillStyle = '#ffd2cc'
        ctx.font = '700 15px "Noto Sans TC","Microsoft JhengHei",sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillText('⚠ 快翻船了!', VIEW.W / 2, dyb - 3)
      }
    }

    // 動態方向提示:大箭頭指出「現在該往哪邊施力」;翻船值高時轉紅、脈動加快
    const dir = s.suggestDir ? s.suggestDir() : 0
    if (dir !== 0) {
      const urgent = s.capsize > 0.4
      const pulse = 0.4 + 0.4 * Math.abs(Math.sin(t * (urgent ? 9 : 5)))
      const ax = dir < 0 ? 96 : VIEW.W - 96
      const ay = VIEW.H * 0.46
      ctx.save()
      ctx.globalAlpha = pulse
      ctx.fillStyle = urgent ? '#ff7a6a' : '#cfe7ff'
      ctx.translate(ax, ay)
      ctx.scale(dir, 1) // dir=-1 時水平翻轉成左箭頭
      ctx.beginPath() // 粗胖的右向箭頭(柄 + 三角頭)
      ctx.moveTo(-34, -16)
      ctx.lineTo(6, -16)
      ctx.lineTo(6, -32)
      ctx.lineTo(42, 0)
      ctx.lineTo(6, 32)
      ctx.lineTo(6, 16)
      ctx.lineTo(-34, 16)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }

    // 操作提示(常駐文字)
    ctx.fillStyle = 'rgba(235,244,255,0.85)'
    ctx.font = '600 18px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText('順著亮起的箭頭按 ← → (或點畫面左右兩側) 扶正船身', VIEW.W / 2, VIEW.H - 14)
  }

  // 戰爭闖關原型「摩西舉手之戰」(出 17:8–13)畫面:
  //   山頂的摩西(雙手依 armDrop 高舉/垂下,手握神的杖)、左右的亞倫與戶珥(扶手時舉起內側手 + 光暈)、
  //   山下的谷中戰場(以色列 vs 亞瑪力,前線隨 defeat 推移)、太陽=計時(從高空走到地平=日落=過關)、
  //   上方兩條 HUD(手的力量 / 戰況)+ 亞倫戶珥可用度條 + 提示文字。山下小兵用色塊火柴人(驗證關不細雕)。
  _drawMoses(game) {
    const ctx = this.ctx
    const m = game.moses
    const prog = Math.min(1, m.survival / MOSES.duration)
    const t = m.time

    // ---- 天空:從清晨藍 → 黃昏橙紅(隨日落進度)----
    const lerp = (a, b, k) => a + (b - a) * k
    const mix = (c1, c2, k) => `rgb(${Math.round(lerp(c1[0], c2[0], k))},${Math.round(lerp(c1[1], c2[1], k))},${Math.round(lerp(c1[2], c2[2], k))})`
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW.H)
    sky.addColorStop(0, mix([120, 180, 222], [60, 38, 78], prog)) // 高空
    sky.addColorStop(0.55, mix([180, 214, 240], [214, 110, 70], prog))
    sky.addColorStop(1, mix([226, 240, 250], [250, 186, 120], prog)) // 近地平
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, VIEW.W, VIEW.H)

    // ---- 太陽 = 計時:從左上走到右側地平線(日落) ----
    const sunX = lerp(VIEW.W * 0.16, VIEW.W * 0.84, prog)
    const horizonY = GROUND_Y - 40
    const sunY = lerp(VIEW.H * 0.16, horizonY, prog)
    const halo = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 110)
    halo.addColorStop(0, mix([255, 244, 210], [255, 210, 150], prog).replace('rgb', 'rgba').replace(')', ',0.95)'))
    halo.addColorStop(1, 'rgba(255,230,180,0)')
    ctx.fillStyle = halo
    ctx.fillRect(sunX - 110, sunY - 110, 220, 220)
    ctx.fillStyle = mix([255, 248, 224], [255, 188, 120], prog)
    ctx.beginPath()
    ctx.arc(sunX, sunY, 30, 0, Math.PI * 2)
    ctx.fill()

    // ---- 遠山(視差,暖色剪影)----
    ctx.fillStyle = mix([150, 170, 150], [120, 80, 90], prog)
    ctx.beginPath()
    ctx.moveTo(0, horizonY)
    for (let x = 0; x <= VIEW.W; x += 30) {
      const y = horizonY - 30 - Math.sin(x * 0.008 + 1) * 26 - Math.sin(x * 0.02) * 10
      ctx.lineTo(x, y)
    }
    ctx.lineTo(VIEW.W, horizonY)
    ctx.closePath()
    ctx.fill()

    // ---- 谷中戰場(地面 + 兩軍 + 前線隨 defeat 推移) ----
    ctx.fillStyle = mix([196, 168, 110], [150, 96, 70], prog)
    ctx.fillRect(0, horizonY, VIEW.W, VIEW.H - horizonY)
    // 前線 x:defeat 大 → 戰線被推向以色列(左);defeat 小 → 推向亞瑪力(右)
    const frontX = lerp(VIEW.W * 0.30, VIEW.W * 0.70, 1 - m.defeat)
    const soldiersY = horizonY + 30
    // 一排小兵(色塊火柴人)
    const army = (x0, x1, color, n) => {
      ctx.fillStyle = color
      for (let i = 0; i < n; i++) {
        const x = lerp(x0, x1, n === 1 ? 0.5 : i / (n - 1))
        const bob = Math.sin(t * 6 + i * 1.7) * 2
        ctx.fillRect(x - 3, soldiersY - 18 + bob, 6, 18) // 身
        ctx.beginPath()
        ctx.arc(x, soldiersY - 22 + bob, 4, 0, Math.PI * 2) // 頭
        ctx.fill()
        // 兵器(小斜線)
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x + (x0 < x1 ? 4 : -4), soldiersY - 16 + bob)
        ctx.lineTo(x + (x0 < x1 ? 12 : -12), soldiersY - 28 + bob)
        ctx.stroke()
      }
    }
    const ISRAEL = '#3a5a8c' // 以色列=藍
    const AMALEK = '#9c3b3b' // 亞瑪力=紅
    army(VIEW.W * 0.06, frontX - 26, ISRAEL, 6) // 以色列(藍,左,朝右)
    army(VIEW.W * 0.94, frontX + 26, AMALEK, 6) // 亞瑪力(紅,右,朝左)

    // 兩軍標籤(顏色↔是誰,讓人一看就懂):左藍=以色列、右紅=亞瑪力
    ctx.font = '700 18px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.textBaseline = 'bottom'
    const tag = (label, color, cx) => {
      const w = ctx.measureText(label).width + 26
      ctx.fillStyle = 'rgba(255,255,255,0.82)'
      roundRect(ctx, cx - w / 2, soldiersY - 56, w, 26, 8)
      ctx.fill()
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(cx - w / 2 + 13, soldiersY - 43, 6, 0, Math.PI * 2) // 色點
      ctx.fill()
      ctx.textAlign = 'left'
      ctx.fillText(label, cx - w / 2 + 24, soldiersY - 37)
    }
    tag('以色列', ISRAEL, VIEW.W * 0.17)
    tag('亞瑪力', AMALEK, VIEW.W * 0.83)

    // 交擊火花(在前線,隨 flash 閃)
    if (m.flash > 0.05) {
      ctx.fillStyle = `rgba(255,236,170,${m.flash})`
      for (let i = 0; i < 5; i++) {
        const fx = frontX + (Math.sin(i * 2.3 + t * 9) * 18)
        const fy = soldiersY - 14 + Math.cos(i * 1.9 + t * 7) * 8
        ctx.beginPath()
        ctx.arc(fx, fy, 2.5 + m.flash * 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // ---- 山頂(摩西站立的高處,畫面右中)----
    const hillX = VIEW.W * 0.5
    const hillTopY = horizonY - 90
    ctx.fillStyle = mix([170, 146, 96], [120, 80, 64], prog)
    ctx.beginPath()
    ctx.moveTo(hillX - 150, horizonY + 4)
    ctx.quadraticCurveTo(hillX - 60, hillTopY + 6, hillX, hillTopY)
    ctx.quadraticCurveTo(hillX + 60, hillTopY + 6, hillX + 150, horizonY + 4)
    ctx.closePath()
    ctx.fill()
    // 摩西坐的石頭(17:12「搬石頭來…他就坐在上面」)——手很沉時更明顯
    ctx.fillStyle = 'rgba(90,70,50,0.9)'
    ctx.fillRect(hillX - 16, hillTopY + 2, 32, 12)

    // ---- 亞倫、戶珥(山頂左右),扶手時舉起內側手 + 光暈 ----
    const helperFootY = hillTopY + 2
    this._helper(hillX - 40, helperFootY, m.supporting, false, prog) // 亞倫(左,朝右扶)
    this._helper(hillX + 40, helperFootY, m.supporting, true, prog) // 戶珥(右,朝左扶)

    // ---- 摩西(雙手依 armDrop 高舉/垂下,手握杖)----
    this._moses(hillX, hillTopY, m.armDrop, m.supporting, t)

    // ---- HUD:兩條狀態條 + 可用度 + 太陽計時提示 ----
    this._mosesHud(game, m, prog)
  }

  // 戰爭闖關「紅海奔逃」(出 14:13–28):兩道水牆立在左右(以橫向側視=上下兩道),
  // 中間是分開的乾海床;站住等候→海分開→過海床(跳礁石、法老追兵在後)→海合攏淹追兵。
  _drawRedSea(game) {
    const ctx = this.ctx
    const r = game.redsea
    const t = r.time
    const W = VIEW.W, H = VIEW.H
    const lerp = (a, b, k) => a + (b - a) * k
    const open = r.seaOpen() // 0=海未開 .. 1=全開
    const closing = r.phase === 'closing'

    // ── 破曉天空(戲劇性的暗藍 → 暖光地平)──
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, '#16243f')
    sky.addColorStop(0.6, '#27496c')
    sky.addColorStop(1, '#7d8fa6')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, H)

    // 兩道水牆的內緣(open 越大、走廊越寬;closing 時 open→0、牆合攏)
    const skyTop = 54
    const topWallBot = lerp(GROUND_Y - 18, skyTop + 30, open) // 上水牆的下緣
    const botWallTop = lerp(GROUND_Y + 26, H - 22, open) // 下水牆的上緣

    // ── 乾海床走廊(走廊內:上半霧氣、下半濕沙;摩西向海伸杖,海中出現乾地)──
    const corr = ctx.createLinearGradient(0, topWallBot, 0, botWallTop)
    corr.addColorStop(0, '#bfe0ea') // 走廊深處的水霧光
    corr.addColorStop(0.55, '#d9c69a') // 漸到濕沙
    corr.addColorStop(1, '#b9a06e')
    ctx.fillStyle = corr
    ctx.fillRect(0, topWallBot, W, Math.max(0, botWallTop - topWallBot))

    // 海床濕沙(玩家腳下):沙紋 + 捲動的礁石/陷坑
    if (botWallTop > GROUND_Y) {
      ctx.fillStyle = '#c2a874'
      ctx.fillRect(0, GROUND_Y, W, botWallTop - GROUND_Y)
      ctx.strokeStyle = 'rgba(120,92,52,0.35)'
      ctx.lineWidth = 2
      for (let k = 0; k < 3; k++) {
        const yy = GROUND_Y + 10 + k * 14
        ctx.beginPath()
        for (let x = 0; x <= W; x += 18) {
          const off = Math.sin(x * 0.05 + r.dist * 0.01 + k) * 2
          if (x === 0) ctx.moveTo(x, yy + off)
          else ctx.lineTo(x, yy + off)
        }
        ctx.stroke()
      }
    }

    // 障礙(只在過海床階段畫;依世界距離換算螢幕 x):礁石 + 水中動物(螃蟹/海蛇/水蠍子)
    if (r.phase === 'cross' || closing) {
      const HZ = { rock: '🪨', crab: '🦀', snake: '🐍', scorpion: '🦂' }
      for (const h of r.hazards) {
        const sx = PLAYER.x + (h.x - r.dist)
        if (sx < -40 || sx > W + 40) continue
        // 螃蟹快速衝:加一點左右橫向抖動,看起來像在爬/衝
        const wobble = h.kind === 'crab' ? Math.sin(t * 18 + h.x * 0.05) * 3 : 0
        this._emoji(HZ[h.kind] || '🪨', sx + wobble, GROUND_Y + 6, 34)
      }
    }

    // ── 一道水牆的繪製(fromTop=true 從上垂下、波在下緣;false 從下升起、波在上緣)──
    const drawWall = (edgeY, fromTop) => {
      const grad = fromTop
        ? ctx.createLinearGradient(0, skyTop, 0, edgeY)
        : ctx.createLinearGradient(0, edgeY, 0, H)
      grad.addColorStop(0, fromTop ? '#0c3458' : '#1f6f9e')
      grad.addColorStop(1, fromTop ? '#1f6f9e' : '#0c3458')
      const wave = (x) => Math.sin(x * 0.025 + t * 3 * (fromTop ? 1 : -1)) * 9 + Math.sin(x * 0.06 - t * 2) * 4
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.moveTo(0, fromTop ? skyTop : H)
      ctx.lineTo(W, fromTop ? skyTop : H)
      for (let x = W; x >= 0; x -= 14) ctx.lineTo(x, edgeY + wave(x))
      ctx.closePath()
      ctx.fill()
      // 牆面垂直水流條紋
      ctx.strokeStyle = 'rgba(255,255,255,0.09)'
      ctx.lineWidth = 2
      for (let i = 0; i < W; i += 44) {
        const sx = i + ((t * 26) % 44)
        ctx.beginPath()
        ctx.moveTo(sx, fromTop ? skyTop : edgeY)
        ctx.lineTo(sx, fromTop ? edgeY : H)
        ctx.stroke()
      }
      // 浪邊白沫
      ctx.strokeStyle = 'rgba(228,244,252,0.75)'
      ctx.lineWidth = 3
      ctx.beginPath()
      for (let x = 0; x <= W; x += 14) {
        const y = edgeY + wave(x)
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    drawWall(topWallBot, true) // 上水牆
    drawWall(botWallTop, false) // 下水牆

    // ── 法老的追兵(戰車,在玩家身後左側;lead 越小越逼近、越大)──
    if (r.phase === 'cross' || r.phase === 'stand') {
      const near = 1 - Math.max(0, Math.min(1, r.lead / REDSEA.chaseGapMax)) // 0=遠 .. 1=逼近
      const baseX = PLAYER.x - 80 - lerp(230, 30, near)
      for (let i = 0; i < 3; i++) {
        const cx = baseX - i * 46
        if (cx < -50) continue
        this._chariot(cx, GROUND_Y + 4, t + i, 0.92 + near * 0.16)
      }
      // 「法老追兵」旗標(在最前一輛上方)
      if (baseX > -10) this._banner(baseX, GROUND_Y - 92, '法老追兵', '#8a2f2f')
    }

    // ── 以色列人(向先知奔跑;closing 時已奔到對岸右側)──
    const p = game.player
    const runnerX = closing ? lerp(PLAYER.x, W - 130, Math.min(1, r.closeT / REDSEA.closeTime)) : PLAYER.x
    const moving = r.phase === 'cross'
    this._prophet(runnerX, p.y, moving ? r.dist * 0.05 : 0, !p.onGround, false)
    this._banner(runnerX, p.y - 96, '以色列', '#3a5a8c')

    // ── closing:海牆合攏的大水花,淹沒追兵 ──
    if (closing) {
      const k = Math.min(1, r.closeT / REDSEA.closeTime)
      ctx.fillStyle = `rgba(225,244,252,${0.5 * (1 - Math.abs(k - 0.5) * 2)})`
      for (let i = 0; i < 40; i++) {
        const fx = (i * 53 + t * 120) % W
        const fy = lerp(topWallBot, botWallTop, (i % 7) / 7) + Math.sin(i + t * 6) * 14
        ctx.beginPath()
        ctx.arc(fx, fy, 3 + (i % 3) * 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // ── HUD + 階段提示 ──
    this._redseaHud(game, r)
  }

  // 單輛戰車(法老追兵):馬 emoji + 車身 + 兩輪 + 兵與長矛。s=縮放。
  _chariot(x, footY, t, s) {
    const ctx = this.ctx
    ctx.save()
    ctx.translate(x, footY)
    ctx.scale(s, s)
    // 馬(emoji,面向右)
    this._emoji('🐎', 16, 6, 40)
    // 車身
    ctx.fillStyle = '#5a3a22'
    roundRect(ctx, -22, -26, 30, 18, 4)
    ctx.fill()
    // 兩輪(轉動)
    ctx.strokeStyle = '#3a2614'
    ctx.lineWidth = 3
    for (const wx of [-16, -2]) {
      ctx.beginPath()
      ctx.arc(wx, -6, 9, 0, Math.PI * 2)
      ctx.stroke()
      const a = t * 6
      ctx.beginPath()
      ctx.moveTo(wx + Math.cos(a) * 9, -6 + Math.sin(a) * 9)
      ctx.lineTo(wx - Math.cos(a) * 9, -6 - Math.sin(a) * 9)
      ctx.moveTo(wx + Math.cos(a + 1.57) * 9, -6 + Math.sin(a + 1.57) * 9)
      ctx.lineTo(wx - Math.cos(a + 1.57) * 9, -6 - Math.sin(a + 1.57) * 9)
      ctx.stroke()
    }
    // 兵(紅袍火柴人)+ 長矛
    ctx.fillStyle = '#9c3b3b'
    ctx.fillRect(-12, -46, 6, 22)
    ctx.beginPath()
    ctx.arc(-9, -50, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#caa83a'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(-4, -52)
    ctx.lineTo(14, -64)
    ctx.stroke()
    ctx.restore()
  }

  // 紅海關的 HUD:過海進度條(走 hudLabels)+ 與追兵距離條 + 階段提示語。
  _redseaHud(game, r) {
    const ctx = this.ctx
    const barW = 300, barH = 16, bx = (VIEW.W - barW) / 2

    // 過海進度(此岸→對岸),走 hudLabels(嵌入契約,不寫死)
    const hud = game.hudLabels || { start: '此岸', goal: '對岸 🌊' }
    const prog = Math.min(1, r.dist / REDSEA.goalDistance)
    let by = 30
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; roundRect(ctx, bx, by, barW, barH, 8); ctx.fill()
    ctx.fillStyle = '#2f9ec4'; roundRect(ctx, bx, by, barW * prog, barH, 8); ctx.fill()
    ctx.fillStyle = '#0f3a52'; ctx.font = '600 15px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.textBaseline = 'bottom'; ctx.textAlign = 'left'; ctx.fillText(hud.start, bx, by - 3)
    ctx.textAlign = 'right'; ctx.fillText(hud.goal, bx + barW, by - 3)

    // 與追兵的距離(越短越危險,轉紅)
    by = 70
    const leadFrac = Math.max(0, Math.min(1, r.lead / REDSEA.chaseGapMax))
    this._statBar(bx, by, barW, barH, leadFrac, leadFrac < 0.3 ? '#d6533b' : '#caa83a', '🐎 與追兵的距離')

    // 階段提示語(置中大字)
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    const say = (text, sub, color) => {
      ctx.font = '700 30px "Noto Sans TC","Microsoft JhengHei",sans-serif'
      const w = ctx.measureText(text).width + 44
      ctx.fillStyle = 'rgba(8,18,30,0.55)'
      roundRect(ctx, VIEW.W / 2 - w / 2, 118, w, sub ? 78 : 50, 12); ctx.fill()
      ctx.fillStyle = color || '#fff'
      ctx.fillText(text, VIEW.W / 2, 144)
      if (sub) {
        ctx.font = '600 17px "Noto Sans TC","Microsoft JhengHei",sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.fillText(sub, VIEW.W / 2, 174)
      }
    }
    if (r.phase === 'stand') {
      if (r.canGo()) say('海開了！點擊舉杖，衝過海床 →', '趁海分開、海牆倒下前跑到對岸', '#ffe08a')
      else if (r.tooEarly > 0) say('不要懼怕，只管站住！', '等耶和華分開紅海（出 14:13）', '#ffd0d0')
      else say('站住，等候耶和華的救恩', '出 14:13–14', '#cfe8ff')
    } else if (r.phase === 'cross') {
      // 過海床時:畫面底部小提示(跳躍 + 加速衝刺),不擋住玩法
      ctx.font = '600 16px "Noto Sans TC","Microsoft JhengHei",sans-serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
      ctx.fillStyle = 'rgba(255,255,255,0.88)'
      ctx.fillText('跳：空白／↑／點畫面　·　加速衝刺：按住 → ／ D ／畫面右側', VIEW.W / 2, VIEW.H - 10)
    } else if (r.phase === 'closing') {
      say('水合攏了，淹沒了法老的全軍！', '出 14:28', '#cfe8ff')
    }
  }

  // 山頂上的扶手者(亞倫 / 戶珥):站立的簡化人形;supporting 時舉起內側手去扶摩西的手,並亮起光暈。
  // mirror=true 代表在右邊、面向左。
  _helper(x, footY, supporting, mirror, prog) {
    const ctx = this.ctx
    ctx.save()
    ctx.translate(x, footY)
    if (mirror) ctx.scale(-1, 1)
    const robe = supporting ? '#e9d9a6' : '#cdbd95'
    const skin = '#dca877'
    // 腿
    ctx.strokeStyle = skin
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(-3, -16); ctx.lineTo(-5, 0); ctx.moveTo(3, -16); ctx.lineTo(5, 0); ctx.stroke()
    // 袍身
    ctx.fillStyle = robe
    ctx.beginPath()
    ctx.moveTo(-9, -38); ctx.lineTo(9, -38); ctx.lineTo(7, -14); ctx.lineTo(-7, -14); ctx.closePath()
    ctx.fill()
    // 頭:頭巾(亞倫=藍帶、戶珥=紅褐帶,兩人好分辨)+ 五官 + 短鬍
    const hy = -44
    const wrap = mirror ? '#e6dcd2' : '#dfe6df' // 戶珥 / 亞倫
    const band = mirror ? '#a8623a' : '#3a6ea5' // 戶珥紅褐 / 亞倫藍
    ctx.fillStyle = wrap
    ctx.beginPath(); ctx.arc(0, hy, 7, 0, Math.PI * 2); ctx.fill() // 頭巾底
    ctx.fillStyle = skin
    ctx.beginPath(); ctx.arc(0, hy + 1.5, 5.4, 0, Math.PI * 2); ctx.fill() // 臉
    ctx.fillStyle = band
    ctx.fillRect(-5.8, hy - 3, 11.6, 2.6) // 頭帶
    ctx.fillStyle = '#5a4326'
    ctx.beginPath(); ctx.moveTo(-4, hy + 4); ctx.lineTo(4, hy + 4); ctx.lineTo(0, hy + 11); ctx.closePath(); ctx.fill() // 短鬍
    ctx.fillStyle = '#3a2c1c'
    ctx.beginPath(); ctx.arc(-2.2, hy + 1, 1, 0, Math.PI * 2); ctx.arc(2.2, hy + 1, 1, 0, Math.PI * 2); ctx.fill() // 眼
    // 內側手:扶手時往內上方舉(去托摩西的手);否則自然垂著
    ctx.strokeStyle = robe
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(4, -36)
    if (supporting) ctx.lineTo(20, -52)
    else ctx.lineTo(10, -20)
    ctx.stroke()
    if (supporting) {
      ctx.fillStyle = 'rgba(255,236,170,0.5)'
      ctx.beginPath(); ctx.arc(20, -52, 6, 0, Math.PI * 2); ctx.fill()
    }
    ctx.restore()
  }

  // 山頂的摩西:站立的白袍人形,兩手向上舉杖;armDrop 0=直舉、1=垂到肩側。
  _moses(x, footY, armDrop, supporting, t) {
    const ctx = this.ctx
    const COL = { robe: '#f6f3ec', robeDark: '#dcd5c6', skin: '#e8bb8d', beard: '#cfcfcf', staff: '#8a5a2a', knob: '#6f4720' }
    // 手累時微微發抖
    const tremble = armDrop > 0.55 ? Math.sin(t * 22) * armDrop * 2 : 0
    ctx.save()
    ctx.translate(x + tremble, footY)
    // 腿
    ctx.strokeStyle = COL.skin; ctx.lineWidth = 7; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(-4, -20); ctx.lineTo(-7, 0); ctx.moveTo(4, -20); ctx.lineTo(7, 0); ctx.stroke()
    // 袍身
    ctx.fillStyle = COL.robe
    ctx.beginPath()
    ctx.moveTo(-11, -50); ctx.lineTo(11, -50); ctx.lineTo(9, -18); ctx.lineTo(-9, -18); ctx.closePath()
    ctx.fill()
    ctx.fillStyle = COL.robeDark
    ctx.beginPath(); ctx.moveTo(2, -50); ctx.lineTo(9, -50); ctx.lineTo(9, -18); ctx.lineTo(3, -18); ctx.closePath(); ctx.fill()
    // 頭:白髮頭巾 + 五官 + 隨疲勞變化的表情(年長的摩西)
    const headY = -60
    const strain = Math.max(0, Math.min(1, (armDrop - 0.4) / 0.6)) // 0=輕鬆 .. 1=快撐不住
    const WRAP = '#efe9da', BAND = '#9c7a3a', HAIR = '#e8e8e8'
    // 頭巾後襯(罩住頭頂與兩側,當作頭巾+白髮的底)
    ctx.fillStyle = WRAP
    ctx.beginPath(); ctx.arc(0, headY, 9.5, 0, Math.PI * 2); ctx.fill()
    // 兩側露出的白髮/鬢
    ctx.fillStyle = HAIR
    ctx.beginPath(); ctx.ellipse(-8, headY + 2, 2.6, 4, 0, 0, Math.PI * 2); ctx.ellipse(8, headY + 2, 2.6, 4, 0, 0, Math.PI * 2); ctx.fill()
    // 臉(略低、略小,讓頭巾在上方露出一圈)
    ctx.fillStyle = COL.skin
    ctx.beginPath(); ctx.arc(0, headY + 1.5, 7, 0, Math.PI * 2); ctx.fill()
    // 頭帶(額前的帶子)
    ctx.fillStyle = BAND
    ctx.fillRect(-7.5, headY - 3.5, 15, 3)
    // 白鬍(年長,較長)
    ctx.fillStyle = HAIR
    ctx.beginPath(); ctx.moveTo(-6, headY + 5); ctx.lineTo(6, headY + 5); ctx.lineTo(0, headY + 18); ctx.closePath(); ctx.fill()
    // 眼睛(專注;疲勞時瞇起→用短橫線)
    ctx.fillStyle = '#3a2c1c'
    if (strain > 0.55) {
      ctx.lineWidth = 1.6; ctx.strokeStyle = '#3a2c1c'; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(-4.4, headY + 1); ctx.lineTo(-1.6, headY + 1.6); ctx.moveTo(4.4, headY + 1); ctx.lineTo(1.6, headY + 1.6); ctx.stroke()
    } else {
      ctx.beginPath(); ctx.arc(-3, headY + 1, 1.2, 0, Math.PI * 2); ctx.arc(3, headY + 1, 1.2, 0, Math.PI * 2); ctx.fill()
    }
    // 眉(疲勞時皺起、內低)
    ctx.lineWidth = 1.4; ctx.strokeStyle = '#6a5436'; ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-5, headY - 1 - (1 - strain) * 0.5); ctx.lineTo(-1.5, headY - 1 + strain * 1.6)
    ctx.moveTo(5, headY - 1 - (1 - strain) * 0.5); ctx.lineTo(1.5, headY - 1 + strain * 1.6)
    ctx.stroke()
    // 嘴(輕鬆=微抿;吃力=張口使勁)
    ctx.fillStyle = '#7a3b2a'
    if (strain > 0.5) { ctx.beginPath(); ctx.ellipse(0, headY + 5.5, 1.8, 1.2 + strain, 0, 0, Math.PI * 2); ctx.fill() }
    else { ctx.lineWidth = 1.4; ctx.strokeStyle = '#7a3b2a'; ctx.beginPath(); ctx.moveTo(-2, headY + 5.5); ctx.lineTo(2, headY + 5.5); ctx.stroke() }
    // 用力的汗珠(快撐不住時)
    if (strain > 0.6) {
      ctx.fillStyle = 'rgba(120,180,230,0.9)'
      ctx.beginPath(); ctx.arc(7.5, headY + 4 + (t * 30 % 8), 1.6, 0, Math.PI * 2); ctx.fill()
    }

    // 手臂:肩在 (-9,-48)/(9,-48);舉起角度依 armDrop。
    // armDrop=0 → 手幾乎直直向上;armDrop=1 → 手垂到約肩側水平。
    const shoulderY = -48
    const up = 1 - armDrop // 1=高舉
    const armLen = 26
    // 手相對肩的位移:向上(-y)且略向中(舉杖);垂下時向外下垂
    const dx = 6 + (1 - up) * 10
    const dy = -armLen * (0.35 + up * 0.65)
    const lhx = -9 - dx * 0.2, lhy = shoulderY + dy
    const rhx = 9 + dx * 0.2, rhy = shoulderY + dy
    ctx.strokeStyle = COL.robe; ctx.lineWidth = 7; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(-9, shoulderY); ctx.lineTo(lhx, lhy); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(9, shoulderY); ctx.lineTo(rhx, rhy); ctx.stroke()
    // 手(膚色)
    ctx.fillStyle = COL.skin
    ctx.beginPath(); ctx.arc(lhx, lhy, 4, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(rhx, rhy, 4, 0, Math.PI * 2); ctx.fill()

    // 神的杖:橫握在兩手之間,略斜
    ctx.strokeStyle = COL.staff; ctx.lineWidth = 5; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(lhx - 6, lhy - 4); ctx.lineTo(rhx + 6, rhy + 4); ctx.stroke()
    ctx.fillStyle = COL.knob
    ctx.beginPath(); ctx.arc(lhx - 6, lhy - 4, 3.5, 0, Math.PI * 2); ctx.fill()

    // 高舉時手上方一點榮光(舉手就得勝)
    if (up > 0.55) {
      ctx.fillStyle = `rgba(255,240,190,${(up - 0.55) * 0.8})`
      ctx.beginPath(); ctx.arc((lhx + rhx) / 2, (lhy + rhy) / 2 - 8, 10, 0, Math.PI * 2); ctx.fill()
    }
    ctx.restore()
  }

  // 摩西關的 HUD:上方兩條(手的力量 / 戰況)+ 亞倫戶珥可用度 + 太陽計時 + 兩區操作提示。
  _mosesHud(game, m, prog) {
    const ctx = this.ctx
    const barW = 300, barH = 16, bx = (VIEW.W - barW) / 2

    // 進度(日出→日落),走 hudLabels(嵌入契約,不寫死)
    const hud = game.hudLabels || { start: '日出', goal: '日落得勝 🌄' }
    let by = 30
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; roundRect(ctx, bx, by, barW, barH, 8); ctx.fill()
    ctx.fillStyle = '#e8a13a'; roundRect(ctx, bx, by, barW * prog, barH, 8); ctx.fill()
    ctx.fillStyle = '#5a3a16'; ctx.font = '600 15px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.textBaseline = 'bottom'; ctx.textAlign = 'left'; ctx.fillText(hud.start, bx, by - 3)
    ctx.textAlign = 'right'; ctx.fillText(hud.goal, bx + barW, by - 3)

    // 手的力量(= 1 - armDrop;越高越好,綠;低於安全線轉紅)
    const armStrength = 1 - m.armDrop
    const safe = 1 - MOSES.safeDrop
    by = 70
    this._statBar(bx, by, barW, barH, armStrength, armStrength >= safe ? '#2f9e44' : '#d6533b', '🙌 手的力量')
    // 安全線標記
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(bx + barW * safe - 1, by - 2, 2, barH + 4)

    // 戰況(defeat;越高越危險,紅)
    by = 104
    this._statBar(bx, by, barW, barH, m.defeat, '#c0392b', '⚔️ 戰況(亞瑪力)')

    // 亞倫、戶珥可用度(自動扶手;扶手中變亮)
    by = 138
    this._statBar(bx, by, barW, barH, m.support, m.supporting ? '#f4c542' : '#caa83a', m.supporting ? '🤝 亞倫、戶珥 扶手中' : '🤝 亞倫、戶珥(手垂下時自動扶)')

    // 提示:扶手中 → 安慰語;否則手快垂下 → 提醒用力舉手
    if (m.supporting) {
      ctx.fillStyle = `rgba(70,130,90,${0.55 + 0.35 * Math.abs(Math.sin(m.time * 5))})`
      ctx.font = '800 24px "Noto Sans TC","Microsoft JhengHei",sans-serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('亞倫、戶珥扶住了摩西的手!', VIEW.W / 2, VIEW.H * 0.46)
    } else if (m.suggestHelp()) {
      ctx.fillStyle = `rgba(214,83,59,${0.6 + 0.4 * Math.abs(Math.sin(m.time * 6))})`
      ctx.font = '800 26px "Noto Sans TC","Microsoft JhengHei",sans-serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('手要垂下了!用力舉手 🙌', VIEW.W / 2, VIEW.H * 0.46)
    }

    // 操作提示(常駐,單一動作)
    ctx.font = '700 18px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.textBaseline = 'bottom'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(40,50,64,0.9)'
    ctx.fillText('按住畫面(或任意方向鍵)= 出力舉手 🙌　·　手垂下時亞倫、戶珥會自動來扶', VIEW.W / 2, VIEW.H - 12)
  }

  // 一條標籤狀態條(0..1):底白 + 填色 + 左上小標籤
  _statBar(x, y, w, h, v, color, label) {
    const ctx = this.ctx
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; roundRect(ctx, x, y, w, h, 8); ctx.fill()
    ctx.fillStyle = color; roundRect(ctx, x, y, w * Math.max(0, Math.min(1, v)), h, 8); ctx.fill()
    ctx.fillStyle = '#33485a'; ctx.font = '600 14px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(label, x, y - 3)
  }

  // 浮在角色上方的小旗標(標示陣營:以色列 / 敵軍),帶向下小三角指向隊伍。
  _banner(cx, top, text, color) {
    const ctx = this.ctx
    ctx.font = '700 15px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    const w = ctx.measureText(text).width + 20, h = 23, x = cx - w / 2
    ctx.fillStyle = color; roundRect(ctx, x, top, w, h, 7); ctx.fill()
    ctx.beginPath(); ctx.moveTo(cx - 6, top + h); ctx.lineTo(cx + 6, top + h); ctx.lineTo(cx, top + h + 8); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(text, cx, top + h / 2)
  }

  // 戰爭闖關「聖歌奇兵 · 約沙法」(代下 20):谷中三國聯軍自相殘殺、詩班走在軍前往望樓。
  _drawJehoshaphat(game) {
    const ctx = this.ctx
    const j = game.jehoshaphat
    const t = j.time
    const lerp = (a, b, k) => a + (b - a) * k
    const mix = (c1, c2, k) =>
      `rgb(${Math.round(lerp(c1[0], c2[0], k))},${Math.round(lerp(c1[1], c2[1], k))},${Math.round(lerp(c1[2], c2[2], k))})`
    const tri = Math.min(1, j.ambush) // 得勝氣氛(自亂條越滿,天色越光明)
    const horizonY = GROUND_Y - 30

    // 天空:清晨 → 得勝金光
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW.H)
    sky.addColorStop(0, mix([150, 176, 206], [120, 150, 210], tri))
    sky.addColorStop(0.6, mix([196, 212, 232], [250, 224, 150], tri))
    sky.addColorStop(1, mix([214, 226, 238], [252, 240, 196], tri))
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, VIEW.W, VIEW.H)

    // 遠山
    ctx.fillStyle = mix([150, 164, 150], [150, 128, 96], tri)
    ctx.beginPath(); ctx.moveTo(0, horizonY)
    for (let x = 0; x <= VIEW.W; x += 28) {
      const y = horizonY - 36 - Math.sin(x * 0.009 + 0.6) * 30 - Math.sin(x * 0.022) * 10
      ctx.lineTo(x, y)
    }
    ctx.lineTo(VIEW.W, horizonY); ctx.closePath(); ctx.fill()

    // 谷地
    ctx.fillStyle = mix([176, 158, 108], [196, 176, 120], tri)
    ctx.fillRect(0, horizonY, VIEW.W, VIEW.H - horizonY)

    // 望樓(詩班的目標,右側)
    const towerX = VIEW.W * 0.9
    const baseY = horizonY + 18
    ctx.fillStyle = '#8a7250'; ctx.fillRect(towerX - 16, baseY - 86, 32, 86)
    ctx.fillStyle = '#6f5a3c'; ctx.fillRect(towerX - 22, baseY - 100, 44, 16)
    ctx.strokeStyle = '#5a4326'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(towerX, baseY - 100); ctx.lineTo(towerX, baseY - 128); ctx.stroke()
    ctx.fillStyle = tri > 0.5 ? '#e8b53a' : '#b9a06a'
    ctx.beginPath(); ctx.moveTo(towerX, baseY - 128); ctx.lineTo(towerX + 20, baseY - 122); ctx.lineTo(towerX, baseY - 116); ctx.closePath(); ctx.fill()

    // 谷中三國聯軍(摩押/亞捫/西珥):自亂條越高,倒下的越多、彼此攻擊
    const valleyY = horizonY + 42
    const zones = [
      { x: VIEW.W * 0.42, c: '#9c3b3b' },
      { x: VIEW.W * 0.55, c: '#8a5a9c' },
      { x: VIEW.W * 0.68, c: '#5a7a3a' },
    ]
    zones.forEach((z, zi) => {
      for (let i = 0; i < 4; i++) {
        const idx = zi * 4 + i
        const down = idx / 12 < j.ambush
        const x = z.x + (i - 1.5) * 18
        ctx.fillStyle = z.c
        if (down) {
          ctx.save(); ctx.translate(x, valleyY + 4); ctx.rotate(1.4)
          ctx.fillRect(-4, -12, 9, 22); ctx.beginPath(); ctx.arc(0, -16, 4.6, 0, Math.PI * 2); ctx.fill(); ctx.restore()
        } else {
          const bob = Math.sin(t * 7 + idx) * 2
          const by = valleyY - 24 + bob
          ctx.fillRect(x - 4, by, 9, 24)
          ctx.beginPath(); ctx.arc(x, by - 4, 4.6, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = '#1a1414'; ctx.fillRect(x - 2.6, by - 5.2, 1.7, 1.7); ctx.fillRect(x + 0.9, by - 5.2, 1.7, 1.7) // 兇惡小眼
          ctx.strokeStyle = '#cfd6df'; ctx.lineWidth = 2.5; ctx.lineCap = 'round' // 互砍的刀
          ctx.beginPath(); ctx.moveTo(x + 4.5, by + 4); ctx.lineTo(x + 15, by - 11); ctx.stroke()
        }
      }
    })
    if (j.ambushFlash > 0.05) {
      ctx.fillStyle = `rgba(255,236,170,${j.ambushFlash})`
      for (let i = 0; i < 6; i++) {
        const fx = VIEW.W * 0.55 + Math.sin(i * 2.1 + t * 9) * 80
        const fy = valleyY - 16 + Math.cos(i * 1.7 + t * 7) * 10
        ctx.beginPath(); ctx.arc(fx, fy, 2 + j.ambushFlash * 4, 0, Math.PI * 2); ctx.fill()
      }
    }
    // 標示「敵軍三國」——浮在谷中聯軍上方(跟以色列人區隔)
    this._banner(VIEW.W * 0.55, valleyY - 60, '⚔️ 敵軍:摩押・亞捫・西珥', '#a83232')

    // 詩班(白袍,前排)+ 約沙法(帶冠領唱)+ 後方軍隊,依 advance 走向望樓;讚美時舉手、出音符、放光波
    const marchX = lerp(VIEW.W * 0.1, VIEW.W * 0.78, j.advance)
    const choirY = horizonY + 70
    const praising = j.praise >= JEHOSHAPHAT.advanceThreshold
    if (j.praise > 0.2) {
      for (let w = 0; w < 3; w++) {
        const ph = (t * 0.6 + w / 3) % 1
        ctx.strokeStyle = `rgba(255,228,140,${(1 - ph) * j.praise * 0.5})`
        ctx.lineWidth = 2
        ctx.beginPath(); ctx.arc(marchX + 10, choirY - 16, 20 + ph * 120, -0.7, 0.7); ctx.stroke()
      }
    }
    // —— 以色列人(約沙法的軍隊):放大 + 有表情(讚美→張口歌唱;恐懼→擔憂)——
    const worried = j.fear > 0.45 && !praising
    const israelite = (x, kind, s) => {
      const bob = praising ? Math.sin(t * 6 + x) * 3 * s : 0
      const cy = choirY + bob
      const robe = kind === 'soldier' ? '#3a6abf' : kind === 'king' ? '#f4e8c4' : '#f8f5ee'
      // 袍(梯形)
      ctx.fillStyle = robe
      ctx.beginPath(); ctx.moveTo(x - 8 * s, cy); ctx.lineTo(x + 8 * s, cy); ctx.lineTo(x + 5.5 * s, cy - 32 * s); ctx.lineTo(x - 5.5 * s, cy - 32 * s); ctx.closePath(); ctx.fill()
      if (kind !== 'soldier') { ctx.fillStyle = '#3a6abf'; ctx.fillRect(x - 7 * s, cy - 5 * s, 14 * s, 2.5 * s) } // 藍色衣繸(民15:38 以色列的記號)
      const hy = cy - 40 * s
      ctx.fillStyle = '#e8bb8d'; ctx.beginPath(); ctx.arc(x, hy, 7 * s, 0, Math.PI * 2); ctx.fill() // 頭
      if (kind === 'king') { // 金冠
        ctx.fillStyle = '#e8b53a'; ctx.beginPath(); ctx.moveTo(x - 8 * s, hy - 4 * s)
        for (let k = 0; k <= 3; k++) { const px = x - 8 * s + 16 * s * (k / 3); ctx.lineTo(px + 2.6 * s, hy - 12 * s); ctx.lineTo(px + 5.3 * s, hy - 4 * s) }
        ctx.closePath(); ctx.fill()
      } else { ctx.fillStyle = kind === 'soldier' ? '#7a5a34' : '#caa05a'; ctx.beginPath(); ctx.arc(x, hy - 1 * s, 7 * s, Math.PI, 0); ctx.fill() } // 頭巾
      // 臉
      ctx.fillStyle = '#3a2c22'
      ctx.beginPath(); ctx.arc(x - 2.6 * s, hy - 0.5 * s, 1.1 * s, 0, Math.PI * 2); ctx.arc(x + 2.6 * s, hy - 0.5 * s, 1.1 * s, 0, Math.PI * 2); ctx.fill()
      if (praising) { // 張口歌唱
        ctx.fillStyle = '#7a3b30'; ctx.beginPath(); ctx.ellipse(x, hy + 3.6 * s, 1.8 * s, 2.6 * s, 0, 0, Math.PI * 2); ctx.fill()
      } else if (worried) { // 擔憂:嘴角下彎 + 八字憂眉
        ctx.strokeStyle = '#7a3b30'; ctx.lineWidth = 1.3 * s; ctx.lineCap = 'round'
        ctx.beginPath(); ctx.arc(x, hy + 6 * s, 2.2 * s, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(x - 4 * s, hy - 3.6 * s); ctx.lineTo(x - 1.4 * s, hy - 2.4 * s); ctx.moveTo(x + 4 * s, hy - 3.6 * s); ctx.lineTo(x + 1.4 * s, hy - 2.4 * s); ctx.stroke()
      } else { ctx.strokeStyle = '#7a3b30'; ctx.lineWidth = 1.3 * s; ctx.beginPath(); ctx.moveTo(x - 2 * s, hy + 3.6 * s); ctx.lineTo(x + 2 * s, hy + 3.6 * s); ctx.stroke() }
      // 手臂(讚美高舉/否則垂下)
      ctx.strokeStyle = robe; ctx.lineWidth = 4 * s; ctx.lineCap = 'round'; ctx.beginPath()
      if (praising) { ctx.moveTo(x - 6 * s, cy - 24 * s); ctx.lineTo(x - 12 * s, cy - 38 * s); ctx.moveTo(x + 6 * s, cy - 24 * s); ctx.lineTo(x + 12 * s, cy - 38 * s) }
      else { ctx.moveTo(x - 6 * s, cy - 24 * s); ctx.lineTo(x - 9 * s, cy - 10 * s); ctx.moveTo(x + 6 * s, cy - 24 * s); ctx.lineTo(x + 9 * s, cy - 10 * s) }
      ctx.stroke()
      if (praising && Math.sin(t * 4 + x) > 0.45) this._emoji('🎵', x + 12 * s, cy - 42 * s, 16 * s)
    }
    for (let i = 0; i < 5; i++) israelite(marchX - 74 - i * 16, 'soldier', 1.05) // 後排藍袍軍隊
    israelite(marchX - 50, 'choir', 1.3) // 詩班
    israelite(marchX - 26, 'choir', 1.35)
    israelite(marchX, 'king', 1.7) // 約沙法王(領唱)
    // 標示「以色列」——浮在隊伍上方,和谷中敵軍區隔
    this._banner(marchX - 22, choirY - 96, '🛡️ 以色列・約沙法的軍隊', '#2f6fc0')

    // 失去一條命的紅閃
    if (j.lifeFlash > 0.05) { ctx.fillStyle = `rgba(200,60,40,${j.lifeFlash * 0.22})`; ctx.fillRect(0, 0, VIEW.W, VIEW.H) }

    // 「哈利路亞!」讚美字幕(讚美時隨節拍跳出,像投影歌詞——帶全場一起唱;代下 20:21「稱謝耶和華」)
    if (praising) {
      const pulse = Math.max(0, Math.sin(((t * 0.62) % 1) * Math.PI)) // 與讚美詩節拍同步的淡入淡出(每約 1.6s 一次)
      if (pulse > 0.02) {
        ctx.save()
        ctx.globalAlpha = pulse
        ctx.font = `800 ${34 + pulse * 10}px "Noto Sans TC","Microsoft JhengHei",sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(60,40,10,0.6)'; ctx.strokeText('哈利路亞!', VIEW.W / 2, VIEW.H * 0.3)
        ctx.fillStyle = '#ffd84a'; ctx.fillText('哈利路亞!', VIEW.W / 2, VIEW.H * 0.3)
        ctx.restore()
      }
    }

    this._jehoshaphatHud(game, j)
  }

  // 聖歌奇兵 HUD:進度(隱基底→望樓)+ 三條(讚美 / 自亂 / 恐懼)+ 中央提示 + 操作提示。
  _jehoshaphatHud(game, j) {
    const ctx = this.ctx
    const barW = 300, barH = 16, bx = (VIEW.W - barW) / 2
    const hud = game.hudLabels || { start: '隱基底', goal: '望樓得勝 🏔️' }
    let by = 30
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; roundRect(ctx, bx, by, barW, barH, 8); ctx.fill()
    ctx.fillStyle = '#3a8d6b'; roundRect(ctx, bx, by, barW * j.advance, barH, 8); ctx.fill()
    ctx.fillStyle = '#2a3a2a'; ctx.font = '600 15px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.textBaseline = 'bottom'; ctx.textAlign = 'left'; ctx.fillText(hud.start, bx, by - 3)
    ctx.textAlign = 'right'; ctx.fillText(hud.goal, bx + barW, by - 3)

    // 命:左上角 3 顆心(失去變空心)——「會輸」的提示
    for (let i = 0; i < 3; i++) this._emoji(i < (j.lives ?? 3) ? '❤️' : '🤍', 34 + i * 34, 40, 26, 'middle')

    by = 70
    this._statBar(bx, by, barW, barH, j.praise, j.praise >= JEHOSHAPHAT.advanceThreshold ? '#2f9e44' : '#d6533b', '🎵 讚美值')
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(bx + barW * JEHOSHAPHAT.advanceThreshold - 1, by - 2, 2, barH + 4)
    by = 104
    this._statBar(bx, by, barW, barH, j.ambush, '#e8a13a', '⚔️ 敵軍自亂(滿 = 得勝)')
    by = 138
    this._statBar(bx, by, barW, barH, j.fear, '#c0392b', '😨 恐懼')

    if (j.lifeFlash > 0.05) {
      ctx.fillStyle = `rgba(200,60,40,${0.6 + 0.3 * Math.abs(Math.sin(j.time * 9))})`
      ctx.font = '800 26px "Noto Sans TC","Microsoft JhengHei",sans-serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('💔 詩班一度動搖!重整旗鼓,繼續讚美', VIEW.W / 2, VIEW.H * 0.46)
    } else if (j.calm > 0.35) {
      ctx.fillStyle = `rgba(214,83,59,${0.5 + 0.4 * Math.abs(Math.sin(j.time * 6))})`
      ctx.font = '800 26px "Noto Sans TC","Microsoft JhengHei",sans-serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('不要爭戰,只管站穩——繼續讚美 🎵', VIEW.W / 2, VIEW.H * 0.46)
    } else if (j.ambush > 0.6) {
      ctx.fillStyle = `rgba(70,130,90,${0.5 + 0.35 * Math.abs(Math.sin(j.time * 5))})`
      ctx.font = '800 24px "Noto Sans TC","Microsoft JhengHei",sans-serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('敵軍自相擊殺了!讚美不要停!', VIEW.W / 2, VIEW.H * 0.46)
    }

    ctx.font = '700 18px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.textBaseline = 'bottom'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(40,50,64,0.9)'
    ctx.fillText('按住畫面 / 方向鍵 / 空白 = 帶領詩班讚美 🎵　·　你沒有攻擊鍵,打仗的是耶和華', VIEW.W / 2, VIEW.H - 12)
  }

  // 戰爭闖關「反轉奇兵 · 巴蘭的驢」(民 22):驢上下閃避拔刀的使者,走到底=巴蘭眼開。
  _drawBalaam(game) {
    const ctx = this.ctx
    const b = game.balaam
    const t = b.time
    const lerp = (a, c, k) => a + (c - a) * k
    // 道路帶高度(純視覺;碰撞在正規化空間)。2026-06-14:180→150,路看起來窄一點。
    const bandBot = VIEW.H - 18
    const bandTop = bandBot - 150
    const horizonY = bandTop - 18
    const yOf = (ny) => lerp(bandTop, bandBot, ny)

    // 天空
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW.H)
    sky.addColorStop(0, '#9ec4e0'); sky.addColorStop(1, '#dfe7ee')
    ctx.fillStyle = sky; ctx.fillRect(0, 0, VIEW.W, VIEW.H)
    // 遠山
    ctx.fillStyle = '#b8a06a'; ctx.beginPath(); ctx.moveTo(0, horizonY)
    for (let x = 0; x <= VIEW.W; x += 34) { const y = horizonY - 24 - Math.sin(x * 0.01) * 20; ctx.lineTo(x, y) }
    ctx.lineTo(VIEW.W, horizonY); ctx.closePath(); ctx.fill()
    // 路兩旁的田野(葡萄園草地),讓道路落在田中而不是浮在天空
    const field = ctx.createLinearGradient(0, horizonY, 0, VIEW.H)
    field.addColorStop(0, '#9ba86a'); field.addColorStop(1, '#7f8f54')
    ctx.fillStyle = field; ctx.fillRect(0, horizonY, VIEW.W, VIEW.H - horizonY)

    const scroll = b.progress * 2200 + t * 130
    const roadH = bandBot - bandTop
    // 一般石頭 / 泥巴路(不是高速公路——拿掉白色分隔虛線):泥土底 + 深淺斑塊 + 散落石子
    const road = ctx.createLinearGradient(0, bandTop, 0, bandBot)
    road.addColorStop(0, '#bda579'); road.addColorStop(0.5, '#cbb184'); road.addColorStop(1, '#a98c5d')
    ctx.fillStyle = road; ctx.fillRect(0, bandTop, VIEW.W, roadH)
    // 濕泥 / 車轍深色斑塊(往左捲動,帶前進感)
    const Pm = VIEW.W + 200
    ctx.fillStyle = 'rgba(110,88,52,0.30)'
    for (let i = 0; i < 22; i++) {
      const sx = ((i * 96 - scroll * 0.6) % Pm + Pm) % Pm - 100
      const py = bandTop + 14 + ((i * 57) % (roadH - 28))
      ctx.beginPath(); ctx.ellipse(sx, py, 30, 10, 0, 0, Math.PI * 2); ctx.fill()
    }
    // 散落石子(碎石路:灰褐 + 一點高光)
    const Ps = VIEW.W + 120
    for (let i = 0; i < 54; i++) {
      const sx = ((i * 41 - scroll) % Ps + Ps) % Ps - 60
      const py = bandTop + 8 + ((i * 73) % (roadH - 16))
      const r = 3 + (i % 3) * 1.7
      ctx.fillStyle = i % 2 ? '#8d8270' : '#a79c88'
      ctx.beginPath(); ctx.ellipse(sx, py, r, r * 0.7, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.20)'
      ctx.beginPath(); ctx.ellipse(sx - r * 0.3, py - r * 0.3, r * 0.4, r * 0.28, 0, 0, Math.PI * 2); ctx.fill()
    }
    // 兩旁葡萄園的矮石牆(民 22:24「這邊有牆,那邊有牆」)
    const wall = (wy) => {
      ctx.fillStyle = '#8a7c63'; ctx.fillRect(0, wy, VIEW.W, 11)
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, wy, VIEW.W, 3)
      ctx.fillStyle = 'rgba(60,50,34,0.45)'
      for (let x = -((scroll * 0.5) % 28); x < VIEW.W; x += 28) ctx.fillRect(x, wy, 2, 11)
    }
    wall(bandTop - 11); wall(bandBot)

    // 使者(拔刀)
    for (const a of b.angels) this._angel(a.x * VIEW.W, yOf(a.y), t)
    // 驢 + 巴蘭
    this._donkeyRider(BALAAM.donkeyX * VIEW.W, yOf(b.donkeyY), t, b.balking, b.donkeyTremble)
    // 撞擊紅閃
    if (b.bumpFlash > 0.05) { ctx.fillStyle = `rgba(200,60,40,${b.bumpFlash * 0.22})`; ctx.fillRect(0, 0, VIEW.W, VIEW.H) }

    this._balaamHud(game, b)
  }

  // 拔刀的耶和華使者(白袍 + 翅膀 + 光環 + 舉刀)。2026-06-14:回原大小(刀刃仍加長 1.5,見下)。
  _angel(x, y, t) {
    const ctx = this.ctx
    ctx.save(); ctx.translate(x, y)
    ctx.fillStyle = 'rgba(255,250,210,0.5)'; ctx.beginPath(); ctx.arc(0, -22, 22, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.beginPath(); ctx.ellipse(-12, -30, 8, 16, -0.4, 0, Math.PI * 2); ctx.ellipse(12, -30, 8, 16, 0.4, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#f4f1e6'
    ctx.beginPath(); ctx.moveTo(-10, -40); ctx.lineTo(10, -40); ctx.lineTo(8, -2); ctx.lineTo(-8, -2); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#f0d9b8'; ctx.beginPath(); ctx.arc(0, -46, 7, 0, Math.PI * 2); ctx.fill()
    // 莊嚴嚴肅的臉(面向走來的驢):雙眼 + 內低外揚的眉 + 抿緊的嘴
    ctx.fillStyle = '#2c2620'
    ctx.beginPath(); ctx.arc(-3, -47, 1.3, 0, Math.PI * 2); ctx.arc(2, -47, 1.3, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#6a5436'; ctx.lineWidth = 1.5; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(-6, -50.5); ctx.lineTo(-1.5, -48.5); ctx.moveTo(5, -50.5); ctx.lineTo(0.5, -48.5); ctx.stroke()
    ctx.strokeStyle = '#7a5a44'; ctx.beginPath(); ctx.moveTo(-3, -42.5); ctx.lineTo(2.5, -42.5); ctx.stroke()
    ctx.strokeStyle = '#e8c34a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -55, 7, 0, Math.PI * 2); ctx.stroke()
    // 拔出來的刀(2026-06-14:刀刃加長 1.5 倍——終點 (26,-54)→(33,-67),沿原方向延伸)
    ctx.strokeStyle = '#cfd6df'; ctx.lineWidth = 3; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(12, -28); ctx.lineTo(33, -67); ctx.stroke()
    ctx.strokeStyle = '#8a939e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(9, -24); ctx.lineTo(15, -30); ctx.stroke()
    ctx.restore()
  }

  // 驢(面向右,長耳/長臉/尾巴/鬃毛——明顯是驢不是豬)+ 騎在背上的巴蘭(會做表情;停步時舉杖鞭打)
  _donkeyRider(x, y, t, balking, tremble) {
    const ctx = this.ctx
    const tr = balking ? Math.sin(t * 30) * tremble * 2 : 0
    ctx.save(); ctx.translate(x + tr, y); ctx.scale(1.3, 1.3)
    const gait = balking ? 0 : Math.sin(t * 8) * 2.2
    const GREY = '#9b9189', DARK = '#6f675f'

    // 尾巴(身體左後,末端一撮毛)
    ctx.strokeStyle = DARK; ctx.lineWidth = 3; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(-18, -12); ctx.quadraticCurveTo(-27, -9 + gait, -25, 1); ctx.stroke()
    ctx.fillStyle = '#4a433c'; ctx.beginPath(); ctx.ellipse(-25, 3, 3, 5.5, 0.2, 0, Math.PI * 2); ctx.fill()

    // 四條細腿 + 蹄(前後交錯踏步)
    ctx.strokeStyle = DARK; ctx.lineWidth = 3.4; ctx.lineCap = 'round'
    const legs = [[-12, gait], [10, -gait], [-3, -gait], [5, gait]]
    ctx.beginPath()
    for (const [lx, off] of legs) { ctx.moveTo(lx, -2); ctx.lineTo(lx, 9 + off) }
    ctx.stroke()
    ctx.fillStyle = '#3a332c'
    for (const [lx, off] of legs) ctx.fillRect(lx - 2, 8 + off, 4, 3)

    // 身體(瘦長橢圓 + 淺色肚腹 + 背脊深線)
    ctx.fillStyle = GREY; ctx.beginPath(); ctx.ellipse(-3, -10, 18, 10, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#b8afa4'; ctx.beginPath(); ctx.ellipse(-3, -6, 14, 5, 0, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = 'rgba(70,62,52,0.5)'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(-15, -17); ctx.lineTo(13, -16); ctx.stroke()

    // 脖子 + 短鬃毛
    ctx.fillStyle = GREY
    ctx.beginPath(); ctx.moveTo(10, -16); ctx.lineTo(22, -29); ctx.lineTo(29, -25); ctx.lineTo(19, -9); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = '#5f574e'; ctx.lineWidth = 2
    for (let i = 0; i <= 4; i++) { const k = i / 4; const mx = 12 + 10 * k, my = -16 - 12 * k; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx - 3, my - 4); ctx.stroke() }

    // 頭(朝右下,長臉)+ 長耳 ×2 + 淺色口鼻 + 睜大的眼(劇情:只有驢看見使者)
    ctx.save(); ctx.translate(27, -26); ctx.rotate(0.5)
    const ear = (ex, rot) => {
      ctx.save(); ctx.translate(ex, -3); ctx.rotate(rot)
      ctx.fillStyle = GREY; ctx.beginPath(); ctx.ellipse(0, -12, 4.5, 13, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#c7a9a9'; ctx.beginPath(); ctx.ellipse(0, -12, 2, 9, 0, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }
    ear(-8, -0.28); ear(-3, 0.12) // 兩隻長耳(驢的招牌)
    ctx.fillStyle = GREY; ctx.beginPath(); ctx.ellipse(0, 0, 13, 7, 0, 0, Math.PI * 2); ctx.fill() // 長臉
    ctx.fillStyle = '#d7cfc2'; ctx.beginPath(); ctx.ellipse(11, 2, 6, 5, 0, 0, Math.PI * 2); ctx.fill() // 淺色口鼻
    ctx.fillStyle = '#4a433c'; ctx.beginPath(); ctx.ellipse(14, 1, 1.5, 2.1, 0, 0, Math.PI * 2); ctx.fill() // 鼻孔
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -2, 2.8, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#2a2420'; ctx.beginPath(); ctx.arc(0.6, -2, 1.6, 0, Math.PI * 2); ctx.fill() // 睜大的眼
    if (balking) { // 受驚:斜眉 + 汗珠
      ctx.strokeStyle = '#3a332c'; ctx.lineWidth = 1.4; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(-4, -6); ctx.lineTo(1, -4.5); ctx.stroke()
      ctx.fillStyle = 'rgba(120,205,225,0.9)'; ctx.beginPath(); ctx.ellipse(-7, -1, 1.6, 2.4, 0, 0, Math.PI * 2); ctx.fill()
    }
    ctx.restore() // 頭

    // ---- 巴蘭(坐在驢背,紫袍 + 頭巾 + 鬍子,會做表情)----
    ctx.save(); ctx.translate(-3, -22)
    ctx.fillStyle = '#7a5a9c' // 袍
    ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.lineTo(5, -17); ctx.lineTo(-5, -17); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#e8bb8d'; ctx.beginPath(); ctx.arc(0, -22, 6, 0, Math.PI * 2); ctx.fill() // 頭
    ctx.fillStyle = '#caa05a'; ctx.fillRect(-6, -27, 12, 3) // 頭巾
    ctx.fillStyle = '#cfcabf'; ctx.beginPath(); ctx.moveTo(-4, -19); ctx.lineTo(4, -19); ctx.lineTo(0, -13); ctx.closePath(); ctx.fill() // 鬍子
    // 表情:停步時又惱又急地鞭打(怒)、前進時看不見使者(平靜往前)
    ctx.fillStyle = '#2c2620'
    if (balking) {
      ctx.beginPath(); ctx.arc(-2.4, -23, 1.2, 0, Math.PI * 2); ctx.arc(2.4, -23, 1.2, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = '#6a3a2a'; ctx.lineWidth = 1.3; ctx.lineCap = 'round' // 怒眉(內低)
      ctx.beginPath(); ctx.moveTo(-5, -26); ctx.lineTo(-1, -24.5); ctx.moveTo(5, -26); ctx.lineTo(1, -24.5); ctx.stroke()
      ctx.fillStyle = '#5a2420'; ctx.beginPath(); ctx.ellipse(0, -19.3, 2, 1.6, 0, 0, Math.PI * 2); ctx.fill() // 張口喝斥
    } else {
      ctx.beginPath(); ctx.arc(-2.2, -23, 1.1, 0, Math.PI * 2); ctx.arc(2.6, -23, 1.1, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = '#7a5a44'; ctx.lineWidth = 1.2; ctx.lineCap = 'round' // 平眉
      ctx.beginPath(); ctx.moveTo(-5, -25); ctx.lineTo(-1, -25); ctx.moveTo(1, -25); ctx.lineTo(5, -25); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(-2, -19.3); ctx.lineTo(2, -19.3); ctx.stroke() // 平嘴
    }
    // 手臂 / 杖(停步時高舉鞭打)
    ctx.strokeStyle = '#7a5a9c'; ctx.lineWidth = 3; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(4, -13)
    if (balking) { ctx.lineTo(15, -27) } else { ctx.lineTo(12, -9) }
    ctx.stroke()
    if (balking) { ctx.strokeStyle = '#6f4720'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(15, -27); ctx.lineTo(27, -22); ctx.stroke() } // 杖
    ctx.restore() // 巴蘭

    ctx.restore() // 驢整體
  }

  // 反轉奇兵 HUD:前進(出發→眼開)+ 時間 + 停步提示 + 操作提示。
  _balaamHud(game, b) {
    const ctx = this.ctx
    const barW = 300, barH = 16, bx = (VIEW.W - barW) / 2
    const hud = game.hudLabels || { start: '出發', goal: '巴蘭眼開 👁️' }
    let by = 30
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; roundRect(ctx, bx, by, barW, barH, 8); ctx.fill()
    ctx.fillStyle = '#7a5a9c'; roundRect(ctx, bx, by, barW * b.progress, barH, 8); ctx.fill()
    ctx.fillStyle = '#3a2c4a'; ctx.font = '600 15px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.textBaseline = 'bottom'; ctx.textAlign = 'left'; ctx.fillText(hud.start, bx, by - 3)
    ctx.textAlign = 'right'; ctx.fillText(hud.goal, bx + barW, by - 3)
    by = 58
    const tleft = Math.max(0, 1 - b.time / BALAAM.duration)
    this._statBar(bx, by, barW, 10, tleft, tleft < 0.25 ? '#d6533b' : '#caa83a', '⏳ 時間')
    // 命:左上角心數(被使者擋住、巴蘭鞭打驢 = 扣一條;數量依 config.BALAAM.lives,2026-06-14:3→5)
    const maxL = b.maxLives ?? 3
    for (let i = 0; i < maxL; i++) this._emoji(i < (b.lives ?? maxL) ? '❤️' : '🤍', 34 + i * 30, 40, 24, 'middle')
    if (b.balking) {
      ctx.fillStyle = `rgba(214,83,59,${0.55 + 0.35 * Math.abs(Math.sin(b.time * 7))})`
      ctx.font = '800 24px "Noto Sans TC","Microsoft JhengHei",sans-serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('驢停住了!上下移開,別讓使者擋路 🗡️', VIEW.W / 2, VIEW.H * 0.42)
    }
    ctx.font = '700 18px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.textBaseline = 'bottom'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(40,40,60,0.9)'
    ctx.fillText('↑ ↓(或上下滑)移動驢子,避開拔刀的使者 🗡️　·　巴蘭看不見,只有驢看見', VIEW.W / 2, VIEW.H - 12)
  }

  // 第三關「大魚肚內」畫面:漆黑的魚腹(肋骨、水、氣泡、禱告的約拿),
  // 每點亮一盞燈就漸漸變亮。背景動畫(氣泡)用 renderer 自己的時間計數。
  _drawFish(game) {
    const ctx = this.ctx
    const f = game.fish || { lit: 0, total: 1, dist: 0, idx: 0, phase: 'intro' }
    this._fishT = (this._fishT || 0) + 1 / 60
    const t = this._fishT
    const total = f.total || 1
    const bright = Math.min(1, (f.lit || 0) / total)
    const lerp = (a, b, k) => a + (b - a) * k
    const scroll = (f.idx || 0) * FISH.segment + (f.dist || 0) // 累計前進,用於視差

    // 魚腹內壁(暗紅,隨點燈漸暖亮)
    const g = ctx.createLinearGradient(0, 0, 0, VIEW.H)
    g.addColorStop(0, `rgb(${lerp(46, 130, bright) | 0},${lerp(20, 46, bright) | 0},${lerp(28, 44, bright) | 0})`)
    g.addColorStop(1, `rgb(${lerp(20, 78, bright) | 0},${lerp(9, 26, bright) | 0},${lerp(15, 28, bright) | 0})`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, VIEW.W, VIEW.H)

    // 肋骨(隨前進往左捲動,像穿過魚的胸腔)
    ctx.strokeStyle = `rgba(255,205,185,${0.12 + 0.22 * bright})`
    ctx.lineWidth = 9
    ctx.lineCap = 'round'
    const ribGap = 175
    const off = scroll * 0.5 - Math.floor((scroll * 0.5) / ribGap) * ribGap
    for (let i = -1; i <= Math.ceil(VIEW.W / ribGap) + 1; i++) {
      const x = i * ribGap - off
      ctx.beginPath()
      ctx.moveTo(x, VIEW.H)
      ctx.quadraticCurveTo(x - 46, VIEW.H * 0.26, x + 8, -20)
      ctx.stroke()
    }

    const footY = GROUND_Y

    // 魚腹底(走道)
    ctx.fillStyle = 'rgba(58,28,32,0.62)'
    ctx.fillRect(0, footY, VIEW.W, VIEW.H - footY)
    ctx.strokeStyle = 'rgba(190,150,150,0.25)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, footY)
    ctx.lineTo(VIEW.W, footY)
    ctx.stroke()

    // 上升的氣泡
    ctx.fillStyle = 'rgba(200,225,235,0.25)'
    for (let i = 0; i < 16; i++) {
      const bx = (i * 127 + Math.sin(i + t) * 16) % VIEW.W
      const by = VIEW.H - ((t * (28 + (i % 5) * 7) + i * 80) % VIEW.H)
      ctx.beginPath()
      ctx.arc(bx, by, 2 + (i % 3), 0, Math.PI * 2)
      ctx.fill()
    }

    const jx = PLAYER.x
    const p = game.player

    // 懸吊的骨頭(站著過不去,要蹲下鑽過);出現在這一段中間
    const boneDist = FISH.segment * FISH.boneAt
    const boneX = jx + (boneDist - (f.dist || 0))
    if ((f.phase === 'walk' || f.phase === 'pray') && boneX > -50 && boneX < VIEW.W + 50) {
      ctx.strokeStyle = 'rgba(235,225,210,0.45)'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(boneX, 0)
      ctx.lineTo(boneX, footY - 52)
      ctx.stroke()
      this._emoji('🦴', boneX, footY - 70, 48, 'middle')
    }

    // 禱告蠟燭:懸在空中;走到底時就在約拿頭頂——要跳起來碰到它才能禱告
    const candleX = f.phase === 'walk' ? jx + Math.max(0, FISH.segment - (f.dist || 0)) : jx
    const candleY = FISH.candleY
    const halo = ctx.createRadialGradient(candleX, candleY, 3, candleX, candleY, 62)
    halo.addColorStop(0, 'rgba(255,224,150,0.78)')
    halo.addColorStop(1, 'rgba(255,224,150,0)')
    ctx.fillStyle = halo
    ctx.fillRect(candleX - 62, candleY - 62, 124, 124)
    this._emoji('🕯️', candleX, candleY, 40, 'middle')

    // 約拿:用 Player 的 y(跳躍)與蹲下姿勢
    const py = p ? p.y : footY
    const airborne = p ? !p.onGround : false
    const crouching = p ? p.crouching : false
    const moving = f.phase === 'walk' && f.moving && !airborne
    this._prophet(jx, py, moving ? scroll * 0.05 : 0, airborne, false, crouching)

    // 頂端:已點亮的禱告之光(進度)
    for (let i = 0; i < total; i++) {
      const lx = VIEW.W / 2 + (i - (total - 1) / 2) * 70
      if (i < (f.lit || 0)) {
        this._emoji('🔥', lx, 54, 32, 'middle')
      } else {
        ctx.globalAlpha = 0.4
        this._emoji('🕯️', lx, 54, 26, 'middle')
        ctx.globalAlpha = 1
      }
    }

    // 底部提示 / 進度
    ctx.fillStyle = 'rgba(245,235,220,0.85)'
    ctx.font = '600 18px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    if (f.phase === 'walk') {
      ctx.fillText(
        '→/右側 走　↑/空白/輕點 跳起來碰蠟燭　↓/左側 蹲下鑽過骨頭',
        VIEW.W / 2,
        VIEW.H - 12
      )
    } else {
      ctx.fillText(`禱告之光  ${f.lit || 0} / ${total}`, VIEW.W / 2, VIEW.H - 12)
    }
  }

  // 第五關「尼尼微傳道」畫面:大城街道(白日天空 + 兩層泥磚城屋顯出「極大的城」+ 石板路),
  // 往前走、走到居民面前停下對話;頂端顯示「悔改」進度(🙇)。
  _drawPreach(game) {
    const ctx = this.ctx
    const f = game.preach || { repented: 0, total: 1, dist: 0, idx: 0, phase: 'intro' }
    const total = f.total || 1
    const scroll = (f.idx || 0) * PREACH.segment + (f.dist || 0) // 累計前進,用於視差

    // 白日的大城天空
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW.H)
    sky.addColorStop(0, '#9fd0e8')
    sky.addColorStop(0.6, '#e9e2c8')
    sky.addColorStop(1, '#f4ecd6')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, VIEW.W, VIEW.H)

    // 兩層城屋(遠慢近快;近層加偏移讓兩層長相不同)——「尼尼微是極大的城」(拿 3:3)
    this._buildings(scroll * 0.18)
    this._buildings(scroll * 0.45 + 4000)

    // 石板街道
    ctx.fillStyle = '#c9b48a'
    ctx.fillRect(0, GROUND_Y - 6, VIEW.W, VIEW.H - (GROUND_Y - 6))
    ctx.fillStyle = '#b09a6e'
    ctx.fillRect(0, GROUND_Y, VIEW.W, 16)
    ctx.fillStyle = 'rgba(95,75,45,0.5)'
    const slab = 72
    const shift = -(scroll % slab)
    for (let x = shift; x < VIEW.W; x += slab) ctx.fillRect(x, GROUND_Y, 3, 16)

    const jx = PLAYER.x
    const p = game.player

    // 這一站的居民:站在這段路的盡頭,走近就會開始對話;未悔改頭上有 💬,悔改後變 🙇
    const st = (f.stations && f.stations[f.idx]) || null
    if (st && f.phase !== 'done') {
      const nx = f.phase === 'walk' ? jx + Math.max(0, PREACH.segment - (f.dist || 0)) : jx + 64
      if (nx < VIEW.W + 60) {
        const repentedHere = (f.repented || 0) > f.idx
        this._emoji(repentedHere ? '🙇' : st.emoji, nx, GROUND_Y + 6, 56)
        if (!repentedHere) {
          const bob = Math.sin((scroll + nx) * 0.04) * 3
          this._emoji('💬', nx, GROUND_Y - 70 + bob, 30, 'middle')
        }
      }
    }

    // 約拿
    const py = p ? p.y : GROUND_Y
    const airborne = p ? !p.onGround : false
    const moving = f.phase === 'walk' && f.moving && !airborne
    this._prophet(jx, py, moving ? scroll * 0.05 : 0, airborne, false)

    // 頂端:悔改進度(已悔改=🙇,還沒=淡色 👤)
    for (let i = 0; i < total; i++) {
      const lx = VIEW.W / 2 + (i - (total - 1) / 2) * 70
      if (i < (f.repented || 0)) {
        this._emoji('🙇', lx, 54, 30, 'middle')
      } else {
        ctx.globalAlpha = 0.35
        this._emoji('👤', lx, 54, 26, 'middle')
        ctx.globalAlpha = 1
      }
    }

    // 底部提示 / 進度
    ctx.fillStyle = 'rgba(60,50,35,0.8)'
    ctx.font = '600 18px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    if (f.phase === 'walk') {
      ctx.fillText('按住 →/右側 往前走　·　走到居民面前就停下對話、宣告神的話', VIEW.W / 2, VIEW.H - 12)
    } else {
      ctx.fillText(`悔改的人  ${f.repented || 0} / ${total}`, VIEW.W / 2, VIEW.H - 12)
    }
  }

  // 第六關「蓖麻樹」畫面:城東的山坡,五幕場景——棚下發怒 / 蓖麻長高 / 蟲咬枯槁 /
  // 東風曝曬 / 神的心(城發光)。蓖麻的生長與枯萎跟著本幕動畫進度 t 演;約拿用蹲姿當坐姿。
  _drawGourd(game) {
    const ctx = this.ctx
    const f = game.gourd || { idx: 0, done: 0, total: 1, t: 0, phase: 'intro' }
    const total = f.total || 1
    const idx = f.idx || 0
    // 本幕動畫進度 0..1;作答/結束時固定為 1(維持該幕的結束畫面)
    const p = f.phase === 'scene' ? Math.min(1, (f.t || 0) / GOURD.sceneTime) : 1
    this._gourdT = (this._gourdT || 0) + 1 / 60 // renderer 自己的環境動畫時鐘(氣氛用)
    const t = this._gourdT
    const lerp = (a, b, k) => a + (b - a) * k

    // 每一幕的天空(0 黃昏的悶氣 / 1 舒服的蔭涼 / 2 黎明 / 3 烈日 / 4 神的晨光)
    const SKIES = [
      ['#e8a96a', '#f3cf9b', '#f7e7c8'], // 0 棚下:黃昏悶熱
      ['#8fc8e8', '#cde9f3', '#eaf7f0'], // 1 蓖麻:清爽
      ['#f0b2c0', '#f7d6c2', '#fbeed8'], // 2 蟲子:黎明
      ['#f2a040', '#f6c468', '#fce69a'], // 3 東風:烈日當空,天色發燙
      ['#ffd9a0', '#ffe9c4', '#fff7e6'], // 4 神的心:金色晨光
    ]
    const sk = SKIES[Math.min(idx, SKIES.length - 1)]
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW.H)
    sky.addColorStop(0, sk[0])
    sky.addColorStop(0.6, sk[1])
    sky.addColorStop(1, sk[2])
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, VIEW.W, VIEW.H)

    // 烈日:第 1 幕(悶熱的午後——約拿正是因為很曬才搭棚遮蔭,拿 4:5)與第 4 幕(日頭曝曬)都有;
    // 第 4 幕(hard)另加炎熱的東風、更強的熱浪與灼熱色調。
    if (idx === 0 || idx === 3) {
      const hard = idx === 3 // 第 4 幕:最毒的那種曬
      const sx = VIEW.W * (hard ? 0.72 : 0.8)
      const sy = VIEW.H * 0.2
      const R = hard ? 44 : 38 // 日輪大小
      const pulse = 1 + Math.sin(t * 3) * 0.06 // 烈日灼熱脈動
      // 大光暈
      const halo = ctx.createRadialGradient(sx, sy, 10, sx, sy, hard ? 210 : 170)
      halo.addColorStop(0, 'rgba(255,238,180,0.95)')
      halo.addColorStop(0.5, 'rgba(255,210,120,0.45)')
      halo.addColorStop(1, 'rgba(255,210,120,0)')
      ctx.fillStyle = halo
      ctx.fillRect(sx - 210, sy - 210, 420, 420)
      // 光芒(12 道,緩慢旋轉)
      ctx.fillStyle = 'rgba(255,214,110,0.65)'
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + t * 0.25
        ctx.save()
        ctx.translate(sx, sy)
        ctx.rotate(a)
        ctx.beginPath()
        ctx.moveTo((R + 8) * pulse, -7)
        ctx.lineTo((R + 42) * pulse, 0)
        ctx.lineTo((R + 8) * pulse, 7)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }
      // 日輪
      ctx.fillStyle = '#fff1c0'
      ctx.beginPath()
      ctx.arc(sx, sy, R * pulse, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffe28a'
      ctx.beginPath()
      ctx.arc(sx, sy, (R - 10) * pulse, 0, Math.PI * 2)
      ctx.fill()
      // 地面附近的熱浪(扭動的細波,往上飄;第 1 幕較淡、第 4 幕較強)
      ctx.strokeStyle = hard ? 'rgba(255,235,190,0.4)' : 'rgba(255,235,190,0.28)'
      ctx.lineWidth = 2
      const waves = hard ? 5 : 3
      for (let i = 0; i < waves; i++) {
        const hy = GROUND_Y - 8 - ((t * 26 + i * 22) % 70)
        ctx.beginPath()
        for (let x = 0; x <= VIEW.W; x += 18) {
          const off = Math.sin(x * 0.05 + t * 5 + i * 2) * 3.5
          if (x === 0) ctx.moveTo(x, hy + off)
          else ctx.lineTo(x, hy + off)
        }
        ctx.stroke()
      }
      if (hard) {
        // 炎熱的東風(風線由右往左)
        ctx.strokeStyle = 'rgba(214,150,80,0.55)'
        ctx.lineWidth = 3
        for (let i = 0; i < 7; i++) {
          const wy = 90 + i * 52 + Math.sin(t * 2 + i) * 6
          const wx = VIEW.W - (((t * 260 * p + i * 170) % (VIEW.W + 200)) - 100)
          ctx.beginPath()
          ctx.moveTo(wx, wy)
          ctx.quadraticCurveTo(wx - 40, wy - 8, wx - 84, wy)
          ctx.stroke()
        }
      }
      // 整體加一層灼熱色調(第 4 幕較重)
      ctx.fillStyle = hard ? 'rgba(255,140,60,0.08)' : 'rgba(255,160,80,0.05)'
      ctx.fillRect(0, 0, VIEW.W, VIEW.H)
    }
    // 第 5 幕:從天而下的柔光(神的憐憫照著大城)
    if (idx === 4) {
      ctx.fillStyle = 'rgba(255,236,180,0.30)'
      for (let i = 0; i < 4; i++) {
        const bx = 60 + i * 70
        ctx.beginPath()
        ctx.moveTo(bx, 0)
        ctx.lineTo(bx + 46, 0)
        ctx.lineTo(bx - 30 + 30, GROUND_Y - 40)
        ctx.lineTo(bx - 60 + 30, GROUND_Y - 40)
        ctx.closePath()
        ctx.fill()
      }
    }

    // 遠方的尼尼微城(左邊地平線的剪影;第 5 幕微微發亮)
    const base = GROUND_Y - 4
    ctx.fillStyle = idx === 4 ? 'rgba(196,150,92,0.85)' : 'rgba(120,95,66,0.55)'
    for (let i = 0; i < 7; i++) {
      const bw = 34 + ((i * 37) % 28)
      const bh = 26 + ((i * 53) % 40)
      const bx = 28 + i * 44
      ctx.fillRect(bx, base - bh, bw, bh)
    }
    ctx.fillRect(16, base - 14, 7 * 44 + 40, 14) // 城牆

    // 地面(城東乾旱的山坡)
    ctx.fillStyle = '#d3b377'
    ctx.fillRect(0, GROUND_Y, VIEW.W, VIEW.H - GROUND_Y)
    ctx.fillStyle = 'rgba(150,115,60,0.4)'
    for (let i = 0; i < 9; i++) ctx.fillRect(40 + i * 110, GROUND_Y + 26 + (i % 3) * 14, 22, 4)

    const jx = VIEW.W * 0.56 // 約拿(坐在棚下,面向左邊的城)
    const gx = jx + 96 // 蓖麻長在棚旁

    // 棚(兩根木柱 + 枝條棚頂,拿 4:5)
    ctx.strokeStyle = '#8a5a2a'
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(jx - 46, GROUND_Y)
    ctx.lineTo(jx - 40, GROUND_Y - 86)
    ctx.moveTo(jx + 46, GROUND_Y)
    ctx.lineTo(jx + 40, GROUND_Y - 86)
    ctx.stroke()
    ctx.strokeStyle = '#a8743c'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(jx - 52, GROUND_Y - 86)
    ctx.lineTo(jx + 52, GROUND_Y - 86)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(140,160,90,0.8)'
    ctx.lineWidth = 3
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath()
      ctx.moveTo(jx + i * 20 - 8, GROUND_Y - 90)
      ctx.lineTo(jx + i * 20 + 10, GROUND_Y - 83)
      ctx.stroke()
    }

    // 蓖麻:第 2 幕隨 p 長高;第 3 幕起枯萎(綠→褐、下垂)。第 1 幕還沒有。
    let grow = 0
    let wither = 0
    if (idx === 1) grow = p
    else if (idx === 2) {
      grow = 1
      wither = p
    } else if (idx >= 3) {
      grow = 1
      wither = 1
    }
    if (grow > 0) {
      const H = 150 * grow
      const droop = wither * 26 // 枯萎下垂
      const leafCol = `rgb(${lerp(86, 150, wither) | 0},${lerp(150, 110, wither) | 0},${lerp(70, 58, wither) | 0})`
      ctx.strokeStyle = `rgb(${lerp(96, 140, wither) | 0},${lerp(130, 104, wither) | 0},${lerp(60, 56, wither) | 0})`
      ctx.lineWidth = 7
      ctx.lineCap = 'round'
      ctx.beginPath() // 主莖(枯萎時頂端垂下)
      ctx.moveTo(gx, GROUND_Y)
      ctx.quadraticCurveTo(gx + 6, GROUND_Y - H * 0.6, gx + 2 + droop * 0.4, GROUND_Y - H + droop)
      ctx.stroke()
      ctx.fillStyle = leafCol
      const leaves = Math.max(1, Math.round(4 * grow))
      for (let i = 0; i < leaves; i++) {
        const ly = GROUND_Y - H * (0.4 + i * 0.18) + droop * (0.4 + i * 0.2)
        const side = i % 2 === 0 ? 1 : -1
        ctx.save()
        ctx.translate(gx + side * 16, ly)
        ctx.rotate(side * (0.5 + wither * 0.7))
        ctx.beginPath()
        ctx.ellipse(0, 0, 26 * grow, 11 * grow * (1 - wither * 0.4), 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
      // 頂葉(遮蔭的「影兒」:健康時在約拿頭上方畫一片淡蔭)
      if (wither < 0.5 && grow > 0.7) {
        ctx.fillStyle = 'rgba(86,150,70,0.25)'
        ctx.beginPath()
        ctx.ellipse(jx, GROUND_Y - 96, 70, 16, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // 第 3 幕:神安排的蟲子 🐛 從右邊爬向蓖麻根部
    if (idx === 2) {
      const wx = lerp(VIEW.W - 40, gx + 14, Math.min(1, p * 1.15))
      this._emoji('🐛', wx, GROUND_Y + 4, 30)
    }

    // 約拿:蹲姿當坐姿,面向左(望著城)。
    // 第 1 幕:生氣 💢;第 4 幕:大大發怒(拿 4:9「我發怒以至於死」)——
    // 比第一幕更氣:怒氣泡泡更大更多、跳更快,人氣到發抖,還被烈日曬出汗 💦
    const furious = idx === 3
    const shake = furious ? Math.sin(t * 16) * 1.6 : 0 // 氣到發抖
    this._prophet(jx + shake, GROUND_Y, 0, false, true, true)
    const moodBob = Math.sin(t * (furious ? 6 : 3)) * (furious ? 5 : 3)
    if (idx === 0) this._emoji('💢', jx + 26, GROUND_Y - 78 + moodBob, 26, 'middle')
    if (furious) {
      this._emoji('💢', jx + 30, GROUND_Y - 86 + moodBob, 38, 'middle')
      this._emoji('💢', jx - 26, GROUND_Y - 72 - moodBob, 24, 'middle')
      this._emoji('💦', jx + 4, GROUND_Y - 56 + moodBob * 0.5, 20, 'middle')
    }

    // 頂端:五幕進度(完成=🌿,未完成=淡色)
    for (let i = 0; i < total; i++) {
      const lx = VIEW.W / 2 + (i - (total - 1) / 2) * 70
      if (i < (f.done || 0)) {
        this._emoji('🌿', lx, 54, 30, 'middle')
      } else {
        ctx.globalAlpha = 0.3
        this._emoji('🌿', lx, 54, 26, 'middle')
        ctx.globalAlpha = 1
      }
    }

    // 底部提示
    ctx.fillStyle = 'rgba(80,60,35,0.8)'
    ctx.font = '600 18px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    if (f.phase === 'scene') {
      ctx.fillText('看著神的「安排」發生……(輕點可跳過)', VIEW.W / 2, VIEW.H - 12)
    } else {
      ctx.fillText(`第 ${Math.min(idx + 1, total)} / ${total} 幕`, VIEW.W / 2, VIEW.H - 12)
    }
  }

  // 暴風雨中的水手(向量小人,古代短衣/長袍,動作隨時間慌張擺動)。
  // pose: kneel=跪下雙手朝天哀求 / pray=俯伏禱告 / grip=雙手抓欄杆被浪甩 /
  //       toss=把貨物拋進海(拿 1:5) / captain=古代船主長袍頭巾朝約拿揮手喊叫(拿 1:6)
  _sailor(x, footY, pose, t) {
    const ctx = this.ctx
    ctx.save()
    ctx.translate(x, footY)
    const SKIN = '#e2b48c'
    const BEARD = '#4a3520'
    const limb = (x1, y1, x2, y2, color, w = 5) => {
      ctx.strokeStyle = color
      ctx.lineWidth = w
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }
    const hand = (hx, hy) => {
      ctx.fillStyle = SKIN
      ctx.beginPath()
      ctx.arc(hx, hy, 3.2, 0, Math.PI * 2)
      ctx.fill()
    }
    const head = (hx, hy, r = 6, wrap = null) => {
      ctx.fillStyle = SKIN
      ctx.beginPath()
      ctx.arc(hx, hy, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = BEARD // 鬍子(下半圈)
      ctx.beginPath()
      ctx.arc(hx, hy + 2, r - 1, 0.25 * Math.PI, 0.75 * Math.PI)
      ctx.closePath()
      ctx.fill()
      if (wrap) {
        ctx.fillStyle = wrap // 頭巾(上半圈)
        ctx.beginPath()
        ctx.arc(hx, hy, r + 1.4, Math.PI, 2 * Math.PI)
        ctx.closePath()
        ctx.fill()
      }
    }
    // 短衣軀幹(四邊形):肩(sx,sy)到臀(hx,hy),寬 w
    const tunic = (sx, sy, hx, hy, color, wTop = 11, wBot = 14) => {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(sx - wTop / 2, sy)
      ctx.lineTo(sx + wTop / 2, sy)
      ctx.lineTo(hx + wBot / 2, hy)
      ctx.lineTo(hx - wBot / 2, hy)
      ctx.closePath()
      ctx.fill()
    }

    if (pose === 'kneel') {
      // 跪在甲板上,雙手朝天用力揮(哀求各人的神,拿 1:5)
      const wave = Math.sin(t * 7) * 5
      const COL = '#b0703a'
      limb(2, -13, 9, -2, SKIN, 6) // 大腿(跪)
      limb(9, -2, -4, 0, SKIN, 5) // 小腿折在地上
      tunic(0, -30, 1, -12, COL)
      limb(-1, -28, -11, -45 + wave, COL, 5) // 左臂高舉
      hand(-11, -45 + wave)
      limb(1, -28, 11, -47 - wave, COL, 5) // 右臂高舉
      hand(11, -47 - wave)
      head(0, -36)
    } else if (pose === 'pray') {
      // 俯伏低頭,雙手伏地禱告(身體隨禱告前後輕擺)
      const rock = Math.sin(t * 4) * 2
      const COL = '#6e8aa8'
      limb(-4, -12, 3, -2, SKIN, 6)
      limb(3, -2, -9, 0, SKIN, 5)
      tunic(8 + rock, -20, -4, -11, COL, 10, 13) // 軀幹前傾
      limb(8 + rock, -20, 19, -4, COL, 5) // 雙臂伏向甲板
      limb(7 + rock, -19, 17, -3, COL, 5)
      hand(19, -4)
      hand(17, -3)
      head(13 + rock, -22, 6) // 頭低低的
    } else if (pose === 'grip') {
      // 雙腳張開撐住、身體被浪甩、雙手死抓欄杆(欄杆橫杆在世界座標 y≈-40,相對這裡≈-31)
      const sway = Math.sin(t * 6) * 4
      const COL = '#7d8f55'
      limb(0, -16, -9, 0, SKIN, 6) // 雙腿張開撐住
      limb(0, -16, 9, 0, SKIN, 6)
      tunic(-6 - sway, -32, 0, -14, COL) // 軀幹向左被甩
      limb(-5 - sway, -30, 22, -31, COL, 5) // 雙臂拼命伸向右邊欄杆
      limb(-6 - sway, -28, 30, -30, COL, 5)
      hand(22, -31)
      hand(30, -30)
      head(-8 - sway, -38)
    } else if (pose === 'toss') {
      // 把貨物拋進海裡(拿 1:5):身體前傾朝左舷,貨箱循環飛出去
      const COL = '#9a6a3c'
      limb(0, -15, -9, 0, SKIN, 6)
      limb(0, -15, 8, 0, SKIN, 6)
      tunic(-7, -30, 0, -13, COL)
      limb(-7, -29, -20, -27, COL, 5) // 雙臂伸向左前方(剛出手)
      limb(-6, -27, -19, -23, COL, 5)
      hand(-20, -27)
      hand(-19, -23)
      head(-9, -37)
      // 飛出去的貨箱:從手邊拋物線落向左舷外(循環)
      const p = (t * 0.9) % 1.4
      if (p < 1) {
        const bx = -24 - p * 52
        const by = -28 + 44 * p * p
        ctx.globalAlpha = p > 0.8 ? (1 - p) / 0.2 : 1
        ctx.fillStyle = '#8a5a2a'
        ctx.fillRect(bx - 6, by - 6, 12, 12)
        ctx.strokeStyle = '#5e3a16'
        ctx.lineWidth = 2
        ctx.strokeRect(bx - 6, by - 6, 12, 12)
        ctx.globalAlpha = 1
      }
    } else if (pose === 'captain') {
      // 古代船主(拿 1:6):深紅長袍 + 白頭巾,朝約拿(左邊)焦急揮手喊「起來,求告你的神!」
      const urge = Math.sin(t * 8) * 4
      const ROBE = '#7b3b3b'
      // 長袍(蓋到腳,看不到腿)
      ctx.fillStyle = ROBE
      ctx.beginPath()
      ctx.moveTo(-6, -38)
      ctx.lineTo(6, -38)
      ctx.lineTo(11, 0)
      ctx.lineTo(-11, 0)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#c8a35a' // 腰帶
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(-8, -22)
      ctx.lineTo(8, -22)
      ctx.stroke()
      limb(-2, -34, -17, -42 + urge, ROBE, 5) // 朝約拿揮的手臂
      hand(-17, -42 + urge)
      limb(2, -34, 9, -24, ROBE, 5) // 另一手扠在腰邊
      hand(9, -24)
      head(0, -44, 6.5, '#ece5d3') // 白頭巾
      // 急喊的「!」氣泡
      ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(t * 5))
      ctx.fillStyle = '#ffd9b0'
      ctx.font = '700 16px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('❗', -22, -56)
      ctx.globalAlpha = 1
    }
    ctx.restore()
  }

  // 用 Canvas 直接畫一個「面向右、奔跑中的先知」。
  // phase = 步伐相位(弧度);airborne = 是否在跳躍中;faceLeft = 是否面向左(後退時)。
  _prophet(x, footY, phase, airborne, faceLeft = false, crouch = false) {
    const ctx = this.ctx
    const sw = Math.sin(phase) * 0.6 // 擺動幅度(弧度)
    const bob = airborne ? 0 : -Math.abs(Math.sin(phase)) * 2.5

    const COL = {
      robe: '#f6f3ec', // 白袍
      robeDark: '#dcd5c6', // 袍身陰影
      belt: '#9c7a3a', // 腰帶
      skin: '#e8bb8d',
      beard: '#5a4326',
      wrap: '#f6f3ec', // 白頭巾
      band: '#b23b3b',
      sandal: '#6b4a26',
      staff: '#8a5a2a', // 木杖
      knob: '#6f4720',
    }

    // 腿:跑步前後擺;跳躍時躍起姿勢;蹲下時雙腿外張、屈膝下蹲
    const legF = crouch ? 0.85 : airborne ? 0.95 : sw
    const legB = crouch ? -0.85 : airborne ? -0.35 : -sw
    // 後手臂:跑步擺動;跳躍時向後上方甩起;蹲下時自然垂在身前
    const armB = crouch ? 0.5 : airborne ? -1.3 : sw * 0.9

    // 蹲下:髖部下降、上半身整體下沉(腳仍踩在地上),做出屈膝下蹲的樣子,而不是整個人縮小
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
      ctx.fillStyle = COL.sandal // 涼鞋
      ctx.beginPath()
      ctx.ellipse(fx + 3, fy + 1, 6, 3.2, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    const drawArm = (ang) => {
      const hx = Math.sin(ang) * armLen
      const hy = shoulderY + Math.cos(ang) * armLen
      ctx.strokeStyle = COL.robe // 長袖
      ctx.lineWidth = 7
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(0, shoulderY)
      ctx.lineTo(hx, hy)
      ctx.stroke()
      ctx.fillStyle = COL.skin // 手
      ctx.beginPath()
      ctx.arc(hx, hy, 3.6, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.save()
    ctx.translate(x, footY + bob)
    if (faceLeft) ctx.scale(-1, 1) // 後退時水平翻轉,讓先知面向左

    // 後側手腳(先畫,被身體蓋住,略透明做出前後層次)
    ctx.globalAlpha = 0.82
    drawArm(armB)
    drawLeg(legB)
    ctx.globalAlpha = 1

    // 袍子(跑步時下襬隨步伐輕擺;跳躍時不擺)
    const swish = airborne ? 1 : Math.sin(phase) * 2
    ctx.fillStyle = COL.robe
    ctx.beginPath()
    ctx.moveTo(-8, shoulderY + 2)
    ctx.lineTo(8, shoulderY + 2)
    ctx.lineTo(13 + swish, -19)
    ctx.quadraticCurveTo(0, -15, -13 + swish, -19)
    ctx.closePath()
    ctx.fill()
    // 袍身陰影(右側=向光面對側)
    ctx.fillStyle = COL.robeDark
    ctx.beginPath()
    ctx.moveTo(2, shoulderY + 3)
    ctx.lineTo(8, shoulderY + 2)
    ctx.lineTo(13 + swish, -19)
    ctx.lineTo(4, -18)
    ctx.closePath()
    ctx.fill()
    // 腰帶
    ctx.strokeStyle = COL.belt
    ctx.lineWidth = 4
    ctx.lineCap = 'butt'
    ctx.beginPath()
    ctx.moveTo(-8.5, -28)
    ctx.lineTo(9, -28)
    ctx.stroke()

    // 前腿
    drawLeg(legF)

    // 木杖 + 握杖的前手(跳躍時整支往上抬,呈躍起持杖)
    const sTopX = airborne ? 17 : 14
    const sTopY = airborne ? -72 : -63
    const sBotX = airborne ? 11 : 9
    const sBotY = airborne ? -8 : 5
    const gx = airborne ? 14 : 12 // 握點 x
    const gy = airborne ? -42 : -33 // 握點 y
    ctx.strokeStyle = COL.staff
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(sTopX, sTopY)
    ctx.lineTo(sBotX, sBotY)
    ctx.stroke()
    ctx.fillStyle = COL.knob // 杖頭握把
    ctx.beginPath()
    ctx.arc(sTopX, sTopY, 3.4, 0, Math.PI * 2)
    ctx.fill()
    // 前手臂(白袖,手握在握點)
    ctx.strokeStyle = COL.robe
    ctx.lineWidth = 7
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, shoulderY)
    ctx.lineTo(gx, gy)
    ctx.stroke()
    ctx.fillStyle = COL.skin // 握杖的手
    ctx.beginPath()
    ctx.arc(gx, gy, 3.9, 0, Math.PI * 2)
    ctx.fill()

    // 脖子
    ctx.strokeStyle = COL.skin
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, shoulderY)
    ctx.lineTo(0, headY + headR - 1)
    ctx.stroke()

    // 臉
    ctx.fillStyle = COL.skin
    ctx.beginPath()
    ctx.arc(0, headY, headR, 0, Math.PI * 2)
    ctx.fill()

    // 鬍子(垂在臉下、略朝前)
    ctx.fillStyle = COL.beard
    ctx.beginPath()
    ctx.moveTo(-headR + 1.5, headY + 1)
    ctx.quadraticCurveTo(1, headY + headR + 8, headR - 0.5, headY + 2.5)
    ctx.quadraticCurveTo(headR - 4, headY + headR - 1, -headR + 1.5, headY + 1)
    ctx.closePath()
    ctx.fill()

    // 頭巾(蓋住頭頂)
    ctx.fillStyle = COL.wrap
    ctx.beginPath()
    ctx.arc(0, headY, headR + 1.6, Math.PI, 2 * Math.PI)
    ctx.closePath()
    ctx.fill()
    // 頭巾後垂帶
    ctx.beginPath()
    ctx.moveTo(-headR, headY - 3)
    ctx.lineTo(-headR - 4, headY + 9)
    ctx.lineTo(-headR + 1.5, headY + 6)
    ctx.closePath()
    ctx.fill()
    // 紅頭帶
    ctx.strokeStyle = COL.band
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(0, headY, headR + 0.8, Math.PI * 1.08, Math.PI * 1.95)
    ctx.stroke()

    // 五官畫在右側 → 清楚面向右
    ctx.fillStyle = COL.skin
    ctx.beginPath() // 鼻子
    ctx.arc(headR - 0.5, headY + 1.5, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#3a2a18'
    ctx.beginPath() // 眼睛
    ctx.arc(headR - 3, headY - 0.5, 1.2, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  // 古代(約三千年前)近東港城的房子:平頂、女兒牆、曬乾的泥磚/砂岩色,
  // 窗戶很少(0–2 個小高窗)、底部一個拱門,偶爾一座圓頂。用雜湊讓外觀穩定不閃爍。
  // density 0..1:出現機率(1=連綿大城;0.3≈曠野零星聚落,同一位置永遠一致不閃爍)。
  _buildings(off, density = 1) {
    const ctx = this.ctx
    const base = GROUND_Y - 8
    const WALL = ['#d8c5a0', '#cdb892', '#e2d4b2', '#c9b48a'] // 陽光曬過的泥磚色
    const SHADE = 'rgba(95,70,40,0.16)' // 右側陰影
    const DARK = 'rgba(70,50,28,0.72)' // 門窗的暗處
    const step = 128
    const hash = (n) => {
      const v = Math.sin(n * 127.1) * 43758.5453
      return v - Math.floor(v) // 0..1,對同一棟永遠相同
    }
    const start = -((((off % step) + step) % step))
    for (let x = start; x < VIEW.W + step; x += step) {
      const key = Math.round((x + off) / step)
      if (density < 1 && hash(key * 3.7 + 11) > density) continue // 曠野:大多數格子留空
      const r = hash(key)
      const r2 = hash(key * 2.3 + 7)
      const r3 = hash(key * 5.1 + 3)
      const bw = 84 + Math.floor(r * 36) // 寬 84..120
      const h = 60 + Math.floor(r2 * 66) // 高 60..126
      const top = base - h
      const idx = ((key % WALL.length) + WALL.length) % WALL.length

      // 牆身
      ctx.fillStyle = WALL[idx]
      ctx.fillRect(x, top, bw, h)
      // 右側陰影(立體感)
      ctx.fillStyle = SHADE
      ctx.fillRect(x + bw * 0.66, top, bw * 0.34, h)

      // 平頂女兒牆(頂部一道矮邊)
      ctx.fillStyle = 'rgba(70,50,28,0.30)'
      ctx.fillRect(x - 2, top - 5, bw + 4, 6)

      if (r3 > 0.82) {
        // 偶爾一座圓頂(會堂/重要建築)
        ctx.fillStyle = WALL[idx]
        ctx.beginPath()
        ctx.arc(x + bw / 2, top - 4, bw * 0.3, Math.PI, 2 * Math.PI)
        ctx.fill()
      }

      // 小高窗:很少,0–2 個
      ctx.fillStyle = DARK
      const winCount = r < 0.32 ? 0 : r < 0.72 ? 1 : 2
      for (let k = 0; k < winCount; k++) {
        const wx = x + bw * (winCount === 1 ? 0.5 : 0.34 + k * 0.32) - 5
        ctx.fillRect(wx, top + 16, 10, 13)
      }

      // 底部拱門
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

  _hud(game) {
    const ctx = this.ctx

    // 生命(愛心)— 只在闖關模式顯示(漫步模式無傷害)
    if (game.mode === 'run') {
      for (let i = 0; i < game.player.lives; i++) {
        this._emoji('❤️', 34 + i * 38, 46, 30, 'middle')
      }
    }

    // 收集到的 🪙:第一關顯示「/ 船價門檻」(湊夠變綠);第四關無船價,只顯示分數
    ctx.font = '600 26px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    const coinX = game.mode === 'run' ? 156 : 28
    if (game.fareEnabled) {
      const fareNeed = game.mode === 'walk' ? FARE.walk : FARE.run
      ctx.fillStyle = game.coinsCollected >= fareNeed ? '#2f7a32' : '#5a3a16'
      ctx.fillText(`🪙 ${game.coinsCollected} / ${fareNeed}`, coinX, 46)
    } else {
      ctx.fillStyle = '#7a5320'
      ctx.fillText(`🪙 ${game.coinsCollected}`, coinX, 46)
    }

    // 衝刺剩餘秒數(撿到 ⚡ 時顯示在金幣旁)
    if (game.boostLeft > 0) {
      ctx.fillStyle = '#c47f0a'
      ctx.font = '700 22px "Noto Sans TC","Microsoft JhengHei",sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      const bx0 = (game.mode === 'run' ? 156 : 28) + 150
      ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(game.boostLeft * 6))
      ctx.fillText(`⚡ ${game.boostLeft.toFixed(1)}s`, bx0, 46)
      ctx.globalAlpha = 1
    }

    // 漫步模式 / 回頭收集船價:底部操作提示(終點用語由 hudLabels.short 決定,別寫死)
    if (game.mode === 'walk' || game.collectingFare) {
      ctx.fillStyle = 'rgba(40,50,64,0.75)'
      ctx.font = '600 18px "Noto Sans TC","Microsoft JhengHei",sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      const goalWord = (game.hudLabels && game.hudLabels.short) || '終點'
      ctx.fillText(
        `按住 →/右半 前進　·　←/左半 後退　·　輕點一下 跳　·　走到${goalWord}過關`,
        VIEW.W / 2,
        VIEW.H - 12
      )
    }

    // 進度條(起點 → 終點)——兩端文字由 game.hudLabels 決定:
    //   單機=「約帕 → 往他施的船 ⛵」;嵌入(保羅大富翁)可傳通用「起點 → 終點 ⛵」,讓同一關卡被任何旅程重用。
    const hud = game.hudLabels || { start: '約帕', goal: '往他施的船 ⛵' }
    const barW = 360
    const barH = 16
    const bx = (VIEW.W - barW) / 2
    const by = 36
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    roundRect(ctx, bx, by, barW, barH, 8)
    ctx.fill()
    const prog = Math.min(1, game.distance / (game.goalDistance || RUN.goalDistance))
    ctx.fillStyle = '#2f9e44'
    roundRect(ctx, bx, by, barW * prog, barH, 8)
    ctx.fill()
    ctx.fillStyle = '#33485a'
    ctx.font = '600 16px "Noto Sans TC","Microsoft JhengHei",sans-serif'
    ctx.textBaseline = 'bottom'
    ctx.textAlign = 'left'
    ctx.fillText(hud.start, bx, by - 4)
    ctx.textAlign = 'right'
    ctx.fillText(hud.goal, bx + barW, by - 4)

    // 到了船邊但船價不足:紅色提示橫幅,引導回頭收集
    if (game.shortFare) {
      const need = game.mode === 'walk' ? FARE.walk : FARE.run
      const msg = `船價不足!需要 ${need}(目前 ${game.coinsCollected})— 回頭(←)多撿一些 🪙 再回船邊上船`
      ctx.font = '700 19px "Noto Sans TC","Microsoft JhengHei",sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const w = ctx.measureText(msg).width + 36
      ctx.fillStyle = 'rgba(196,75,75,0.94)'
      roundRect(ctx, (VIEW.W - w) / 2, 72, w, 38, 10)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.fillText(msg, VIEW.W / 2, 91)
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

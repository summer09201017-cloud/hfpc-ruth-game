// 繪製層：只讀 game 狀態、不改狀態。邏輯座標固定 960×540，依畫布父層尺寸等比縮放置中。
// measure() 在每幀更新前被呼叫，存下 fit（scale/位移）供點擊換算成世界座標。
import { WORLD, GRID, ARK, PALETTE, arkRoomRects } from './config.js'
import { CONTENT } from './content.js'

const EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",system-ui'

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.fit = null
  }

  measure() {
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
    this.fit = { dpr, scale, ox, oy }
    return this.fit
  }

  draw(game) {
    const { ctx } = this
    const { dpr, scale, ox, oy } = this.fit || this.measure()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = '#16242e'
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    ctx.save()
    ctx.translate(ox, oy)
    ctx.scale(scale, scale)
    ctx.beginPath()
    ctx.rect(0, 0, WORLD.w, WORLD.h)
    ctx.clip()

    this._scene(ctx)
    this._title(ctx, game)
    this._ark(ctx, game)
    // 配對階段才畫左側卡片；安排階段卡片已全配對，淡淡留著當背景。
    for (const c of game.cards) this._card(ctx, c)
    if (game.state === 'arrange' && game.unsafe && game.unsafe.size > 0) this._hint(ctx, CONTENT.unsafeHint)
    if (game.toast) this._toast(ctx, game.toast)
    if (game.beat) this._beat(ctx, game.beat)

    ctx.restore()
  }

  _scene(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, WORLD.h)
    sky.addColorStop(0, PALETTE.skyTop)
    sky.addColorStop(0.7, PALETTE.skyBottom)
    sky.addColorStop(0.701, PALETTE.sea)
    sky.addColorStop(1, PALETTE.seaDeep)
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, WORLD.w, WORLD.h)
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth = 1
    for (let i = 0; i < 26; i++) {
      const x = (i * 53) % WORLD.w
      const y = (i * 91) % 300
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 18); ctx.stroke()
    }
  }

  _title(ctx, game) {
    ctx.fillStyle = PALETTE.ink
    ctx.font = `bold 22px ${EMOJI}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(CONTENT.title, GRID.x, 22)
    ctx.font = `15px ${EMOJI}`
    ctx.fillStyle = '#4a3a24'
    ctx.textAlign = 'right'
    const right = ARK.x + ARK.w
    if (game.state === 'arrange') ctx.fillText('🛏️ 安排房間：猛獸旁放大象或飛鳥', right, 30)
    else if (game.state === 'won') ctx.fillText('🌈 全部平安上船', right, 30)
    else ctx.fillText(`已上船 ${game.rooms.length} / ${game.pairs} 對`, right, 30)
  }

  // ---------- 左側翻牌 ----------
  _card(ctx, card) {
    const { x, y, w, h } = card.cell
    const cx = x + w / 2
    const cy = y + h / 2
    const cosv = Math.cos(card.flip * Math.PI)
    const sx = Math.max(0.02, Math.abs(cosv))
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(sx, 1)
    ctx.translate(-cx, -cy)
    if (cosv > 0) this._cardBack(ctx, x, y, w, h)
    else this._cardFront(ctx, card, x, y, w, h)
    ctx.restore()
    if (card.cardState === 'matched') this._matchedTick(ctx, x, y, w, h)
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }

  _cardBack(ctx, x, y, w, h) {
    this._roundRect(ctx, x, y, w, h, 12)
    const g = ctx.createLinearGradient(x, y, x, y + h)
    g.addColorStop(0, PALETTE.cardBack)
    g.addColorStop(1, PALETTE.cardBackDark)
    ctx.fillStyle = g
    ctx.fill()
    ctx.strokeStyle = PALETTE.cardEdge
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.strokeStyle = 'rgba(0,0,0,0.16)'
    ctx.lineWidth = 2
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(x + 8, y + (h * i) / 3); ctx.lineTo(x + w - 8, y + (h * i) / 3); ctx.stroke()
    }
    ctx.fillStyle = 'rgba(255,247,232,0.85)'
    ctx.font = `bold ${Math.round(h * 0.34)}px ${EMOJI}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🌧', x + w / 2, y + h / 2)
  }

  _cardFront(ctx, card, x, y, w, h) {
    this._roundRect(ctx, x, y, w, h, 12)
    ctx.fillStyle = card.cardState === 'matched' ? '#eaffe6' : PALETTE.cardFace
    ctx.fill()
    ctx.strokeStyle = card.cardState === 'matched' ? '#5fb96b' : PALETTE.cardEdge
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.font = `${Math.round(h * 0.42)}px ${EMOJI}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(card.emoji, x + w / 2, y + h * 0.42)
    // 母的頭上戴蝴蝶結 🎀
    if (card.sex === 'f') {
      ctx.font = `${Math.round(h * 0.2)}px ${EMOJI}`
      ctx.fillText('🎀', x + w / 2, y + h * 0.19)
    }
    ctx.fillStyle = PALETTE.ink
    ctx.font = `bold ${Math.round(h * 0.13)}px ${EMOJI}`
    ctx.fillText(card.name, x + w / 2, y + h * 0.78)
    const male = card.sex === 'm'
    const bx = x + w - 18
    const by = y + 18
    ctx.fillStyle = male ? PALETTE.male : PALETTE.female
    ctx.beginPath(); ctx.arc(bx, by, 12, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = `bold 15px ${EMOJI}`
    ctx.fillText(male ? '♂' : '♀', bx, by + 1)
  }

  _matchedTick(ctx, x, y, w, h) {
    ctx.fillStyle = '#3aa64a'
    ctx.beginPath(); ctx.arc(x + 18, y + 18, 12, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x + 12, y + 18); ctx.lineTo(x + 16, y + 22); ctx.lineTo(x + 24, y + 13)
    ctx.stroke()
  }

  // ---------- 右側方舟（殼 + 房間）----------
  _ark(ctx, game) {
    const { x, y, w, roofH, hullH } = ARK
    const hx = x + 14
    const hw = w - 28
    const hy = y + roofH
    const hh = ARK.h - roofH - hullH
    // 船身
    this._roundRect(ctx, hx, hy, hw, hh, 10)
    const g = ctx.createLinearGradient(hx, hy, hx, hy + hh)
    g.addColorStop(0, PALETTE.arkHouse)
    g.addColorStop(1, '#a87c3f')
    ctx.fillStyle = g
    ctx.fill()
    ctx.strokeStyle = PALETTE.arkHullDark
    ctx.lineWidth = 3
    ctx.stroke()
    // 屋頂
    ctx.fillStyle = PALETTE.arkRoof
    ctx.beginPath()
    ctx.moveTo(x + 6, hy + 2)
    ctx.lineTo(x + w / 2, y + 6)
    ctx.lineTo(x + w - 6, hy + 2)
    ctx.closePath()
    ctx.fill()
    // 船底
    ctx.fillStyle = PALETTE.arkHull
    ctx.beginPath()
    ctx.moveTo(hx - 6, hy + hh)
    ctx.lineTo(hx + hw + 6, hy + hh)
    ctx.lineTo(hx + hw - 26, hy + hh + hullH - 14)
    ctx.quadraticCurveTo(x + w / 2, hy + hh + hullH + 6, hx + 26, hy + hh + hullH - 14)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = PALETTE.arkHullDark
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = '#fff7e8'
    ctx.font = `bold 18px ${EMOJI}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🛕 方舟', x + w / 2, y + roofH / 2 + 14)

    // 房間（共用幾何）
    const rects = arkRoomRects(game.pairs)
    for (let i = 0; i < game.pairs; i++) {
      const r = rects[i]
      const room = game.rooms[i]
      const selected = game.selected === i
      const unsafe = game.unsafe && game.unsafe.has(i)
      this._room(ctx, r, room, { selected, unsafe })
    }
  }

  _room(ctx, r, room, { selected, unsafe }) {
    this._roundRect(ctx, r.x, r.y, r.w, r.h, 8)
    ctx.fillStyle = room ? '#fff3d6' : 'rgba(60,40,20,0.32)'
    ctx.fill()
    // 邊框：選取→金、危險→紅、一般→深木
    ctx.strokeStyle = selected ? '#ffd24a' : unsafe ? '#e4452e' : PALETTE.arkHullDark
    ctx.lineWidth = selected || unsafe ? 4 : 2
    this._roundRect(ctx, r.x, r.y, r.w, r.h, 8)
    ctx.stroke()
    if (!room) return

    // 一公一母並肩（右邊那隻是母的，戴蝴蝶結 🎀）
    ctx.font = `${Math.round(r.h * 0.46)}px ${EMOJI}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(room.emoji, r.x + r.w * 0.34, r.y + r.h * 0.44)
    ctx.fillText(room.emoji, r.x + r.w * 0.66, r.y + r.h * 0.44)
    ctx.font = `${Math.round(r.h * 0.24)}px ${EMOJI}`
    ctx.fillText('🎀', r.x + r.w * 0.66, r.y + r.h * 0.18)
    ctx.font = `bold ${Math.max(9, Math.round(r.h * 0.16))}px ${EMOJI}`
    ctx.fillStyle = PALETTE.male
    ctx.fillText('♂', r.x + r.w * 0.34, r.y + r.h * 0.82)
    ctx.fillStyle = PALETTE.female
    ctx.fillText('♀', r.x + r.w * 0.66, r.y + r.h * 0.82)
    // 危險標記 ⚠（左上）
    if (unsafe) {
      ctx.font = `${Math.max(12, Math.round(r.h * 0.3))}px ${EMOJI}`
      ctx.fillText('⚠️', r.x + r.w * 0.14, r.y + r.h * 0.22)
    }
  }

  _hint(ctx, text) {
    ctx.font = `bold 14px ${EMOJI}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const tw = Math.min(GRID.w + 10, ctx.measureText(text).width + 32)
    const tx = GRID.x + GRID.w / 2
    const ty = WORLD.h - 22
    ctx.fillStyle = 'rgba(180,69,46,0.92)'
    this._roundRect(ctx, tx - tw / 2, ty - 18, tw, 36, 18)
    ctx.fill()
    ctx.fillStyle = '#fff'
    this._wrap(ctx, text, tx, ty - 8, tw - 24, 16, '#fff', `bold 13px ${EMOJI}`)
  }

  _toast(ctx, toast) {
    const alpha = Math.min(1, toast.t / 0.5)
    ctx.globalAlpha = alpha
    ctx.font = `bold 16px ${EMOJI}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const tw = ctx.measureText(toast.text).width + 36
    const tx = GRID.x + GRID.w / 2
    const ty = WORLD.h - 56
    ctx.fillStyle = toast.kind === 'match' ? 'rgba(58,166,74,0.92)' : 'rgba(180,90,40,0.92)'
    this._roundRect(ctx, tx - tw / 2, ty - 18, tw, 34, 17)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.fillText(toast.text, tx, ty)
    ctx.globalAlpha = 1
  }

  _beat(ctx, beat) {
    ctx.fillStyle = 'rgba(20,30,40,0.86)'
    const pad = 70
    const bx = pad
    const by = WORLD.h / 2 - 130
    const bw = WORLD.w - pad * 2
    const bh = 260
    this._roundRect(ctx, bx, by, bw, bh, 16)
    ctx.fill()
    ctx.strokeStyle = beat.kind === 'win' ? '#7bd88f' : beat.kind === 'arrange' ? '#ffd24a' : '#bcd'
    ctx.lineWidth = 3
    this._roundRect(ctx, bx, by, bw, bh, 16)
    ctx.stroke()

    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    let y = by + 24
    if (beat.kicker) {
      y = this._wrap(ctx, beat.kicker, WORLD.w / 2, y, bw - 80, 32, beat.kind === 'win' ? '#7bd88f' : '#ffd98a', `bold 25px ${EMOJI}`)
      y += 6
    }
    if (beat.ref) {
      ctx.fillStyle = '#ffe1a8'
      ctx.font = `bold 15px ${EMOJI}`
      ctx.textAlign = 'center'
      ctx.fillText(beat.ref, WORLD.w / 2, y)
      y += 24
    }
    if (beat.line) y = this._wrap(ctx, beat.line, WORLD.w / 2, y, bw - 80, 22, '#eef', `15px ${EMOJI}`)
    if (beat.teach) {
      y += 6
      y = this._wrap(ctx, beat.teach, WORLD.w / 2, y, bw - 80, 21, '#cfe', `italic 14px ${EMOJI}`)
    }
    ctx.fillStyle = '#9fb6c6'
    ctx.font = `13px ${EMOJI}`
    ctx.textAlign = 'center'
    ctx.fillText(beat.cont || '點畫面繼續', WORLD.w / 2, by + bh - 26)
  }

  _wrap(ctx, text, cx, y, maxW, lh, color, font) {
    ctx.fillStyle = color
    ctx.font = font
    ctx.textAlign = 'center'
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

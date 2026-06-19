// 繪製層：只讀 game 狀態、不改狀態。邏輯座標固定 960×540，等比縮放置中。
// 蓋方舟時洪水還沒來：底部是乾地，旁邊有人嘲笑挪亞；挪亞拿鎚子左右走，對準釘點才釘得上。
import { WORLD, BOX, WALL_TOP, RULES, AIM, GROUND_Y, MOCKERS, PALETTE } from './config.js'
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
    this._mockers(ctx, game)
    for (const p of game.planks) if (p.placed) this._plank(ctx, p)
    // 建造中：下一塊 ghost + 釘點瞄準 + 挪亞
    if (game.state === 'building' || game.state === 'sectionIntro') {
      const next = game._nextPlank()
      if (next) {
        if (game.state === 'building') this._ghost(ctx, next, game.tAccum || 0)
        this._nail(ctx, game, next)
      }
      this._noah(ctx, game, next)
    }
    this._hud(ctx, game)
    if (game.beat) this._beat(ctx, game.beat)
    ctx.restore()
  }

  _scene(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y)
    sky.addColorStop(0, PALETTE.skyTop)
    sky.addColorStop(1, PALETTE.skyBottom)
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, WORLD.w, GROUND_Y)
    // 遠雲
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    for (const [cx, cy, r] of [[140, 80, 28], [180, 92, 34], [820, 64, 32], [858, 80, 24]]) {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
    }
    // 乾地（蓋舟時洪水未到）
    const g = ctx.createLinearGradient(0, GROUND_Y, 0, WORLD.h)
    g.addColorStop(0, '#b79a5e')
    g.addColorStop(1, '#8c7038')
    ctx.fillStyle = g
    ctx.fillRect(0, GROUND_Y, WORLD.w, WORLD.h - GROUND_Y)
    ctx.fillStyle = '#7c9a4a'
    ctx.fillRect(0, GROUND_Y, WORLD.w, 5) // 草皮
  }

  // —— 嘲笑挪亞的人（站在左邊乾地，講風涼話）——
  _mockers(ctx, game) {
    for (const m of MOCKERS) this._person(ctx, m.x, GROUND_Y - 2, m.scale, m.face)
    // 一個對話泡泡（輪播）指向人群中間
    const line = CONTENT.mockers[game.mockerIdx % CONTENT.mockers.length]
    const bx = MOCKERS[1].x
    const by = GROUND_Y - 96
    ctx.font = `13px ${EMOJI}`
    const tw = Math.min(230, ctx.measureText(line).width + 24)
    this._roundRect(ctx, bx - tw / 2, by - 16, tw, 32, 10)
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.fill()
    ctx.strokeStyle = '#c9b07a'
    ctx.lineWidth = 2
    ctx.stroke()
    // 小尾巴
    ctx.beginPath(); ctx.moveTo(bx - 6, by + 14); ctx.lineTo(bx + 6, by + 14); ctx.lineTo(bx, by + 26); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill()
    ctx.fillStyle = '#5a3d22'
    ctx.font = `13px ${EMOJI}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    this._wrap(ctx, line, bx, by - 7, tw - 18, 15, '#5a3d22', `13px ${EMOJI}`)
  }

  _person(ctx, x, footY, s, face) {
    s = s || 1
    const h = 40 * s
    const headR = 8 * s
    const hy = footY - h
    // 腿
    ctx.strokeStyle = '#4b3b6b'
    ctx.lineWidth = 4 * s
    ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(x - 3 * s, footY - 16 * s); ctx.lineTo(x - 5 * s, footY); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x + 3 * s, footY - 16 * s); ctx.lineTo(x + 5 * s, footY); ctx.stroke()
    // 袍子
    ctx.fillStyle = '#7d6ca8'
    ctx.beginPath()
    ctx.moveTo(x - 8 * s, hy + headR + 14 * s)
    ctx.lineTo(x + 8 * s, hy + headR + 14 * s)
    ctx.lineTo(x + 6 * s, footY - 14 * s)
    ctx.lineTo(x - 6 * s, footY - 14 * s)
    ctx.closePath(); ctx.fill()
    // 舉起來指指點點的手
    ctx.strokeStyle = '#e8b887'
    ctx.lineWidth = 3.5 * s
    ctx.beginPath(); ctx.moveTo(x + 6 * s, hy + headR + 16 * s); ctx.lineTo(x + 16 * s, hy + headR + 6 * s); ctx.stroke()
    // 頭
    ctx.fillStyle = '#e8b887'
    ctx.beginPath(); ctx.arc(x, hy + headR, headR, 0, Math.PI * 2); ctx.fill()
    // 表情 emoji（嘲笑）
    ctx.font = `${Math.round(13 * s)}px ${EMOJI}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(face || '😆', x, hy + headR + 1)
  }

  // —— 釘點瞄準記號（固定位置）＋ 容差刻度 ——
  _nail(ctx, game, p) {
    const tol = game.aimTol ? game.aimTol() : AIM.tol
    const pulse = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin((game.tAccum || 0) * 6))
    const aligned = Math.abs(game.noahX - p.targetX) <= tol
    const color = aligned ? '#7bd88f' : '#ffd24a'
    ctx.save()
    ctx.globalAlpha = pulse
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = 2.5
    // ✛ 十字 + 外圈
    ctx.beginPath(); ctx.arc(p.targetX, p.rowY, 11, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(p.targetX - 16, p.rowY); ctx.lineTo(p.targetX + 16, p.rowY)
    ctx.moveTo(p.targetX, p.rowY - 16); ctx.lineTo(p.targetX, p.rowY + 16)
    ctx.stroke()
    ctx.globalAlpha = 1
    // 容差刻度（兩個小括號，告訴你「這段內」算對準；越蓋越窄）
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 2
    for (const dx of [-tol, tol]) {
      ctx.beginPath()
      ctx.moveTo(p.targetX + dx, p.rowY - 14); ctx.lineTo(p.targetX + dx, p.rowY + 14)
      ctx.stroke()
    }
    ctx.restore()
  }

  // —— 挪亞（拿鎚子，沿這一排左右走；揮鎚動畫）——
  _noah(ctx, game, p) {
    if (!p) return
    const x = game.noahX
    const footY = p.rowY + 16
    // 腳下小鷹架
    ctx.fillStyle = 'rgba(90,61,34,0.6)'
    ctx.fillRect(x - 18, footY, 36, 4)
    // 對準導引線（從挪亞往釘點所在的橫排）
    const aligned = Math.abs(x - p.targetX) <= (game.aimTol ? game.aimTol() : AIM.tol)
    ctx.strokeStyle = aligned ? 'rgba(123,216,143,0.9)' : 'rgba(255,255,255,0.4)'
    ctx.setLineDash([4, 4])
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(x, footY); ctx.lineTo(x, p.rowY); ctx.stroke()
    ctx.setLineDash([])

    const hy = footY - 40
    // 腿
    ctx.strokeStyle = '#6b4a28'; ctx.lineWidth = 5; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(x - 4, footY - 16); ctx.lineTo(x - 6, footY); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x + 4, footY - 16); ctx.lineTo(x + 6, footY); ctx.stroke()
    // 袍子
    ctx.fillStyle = '#9c6b3b'
    ctx.beginPath()
    ctx.moveTo(x - 11, hy + 14); ctx.lineTo(x + 11, hy + 14); ctx.lineTo(x + 8, footY - 14); ctx.lineTo(x - 8, footY - 14)
    ctx.closePath(); ctx.fill()
    // 頭 + 表情 + 鬍子（隨蓋方舟進度：鬍子越來越長、由黑漸白——蓋了「好多年」）
    const prog = game.progress || 0
    const headCY = hy + 4
    const headR = 9
    // 臉
    ctx.fillStyle = '#e8b887'
    ctx.beginPath(); ctx.arc(x, headCY, headR, 0, Math.PI * 2); ctx.fill()
    // 頭髮（同鬍色，跟著變白）
    const hairShade = Math.round(40 + prog * 200) // 40(黑)→240(白)
    const hairCol = `rgb(${hairShade},${hairShade},${hairShade})`
    ctx.fillStyle = hairCol
    ctx.beginPath(); ctx.arc(x, headCY - 2, headR, Math.PI * 1.05, Math.PI * 1.95); ctx.fill()
    // 鬍子：長度 6→18 隨進度成長，顏色黑→白；用尖底三角＋圓潤兩側
    const beardLen = 6 + prog * 12
    const beardW = headR - 1
    ctx.fillStyle = hairCol
    ctx.beginPath()
    ctx.moveTo(x - beardW, headCY + 2)
    ctx.quadraticCurveTo(x - beardW, headCY + beardLen, x, headCY + beardLen + 2)
    ctx.quadraticCurveTo(x + beardW, headCY + beardLen, x + beardW, headCY + 2)
    ctx.quadraticCurveTo(x, headCY + 6, x - beardW, headCY + 2)
    ctx.closePath(); ctx.fill()
    // 眉毛（專注：內低外高一點）
    ctx.strokeStyle = hairCol
    ctx.lineWidth = 1.6
    ctx.beginPath(); ctx.moveTo(x - 6, headCY - 3); ctx.lineTo(x - 2, headCY - 4); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x + 2, headCY - 4); ctx.lineTo(x + 6, headCY - 3); ctx.stroke()
    // 眼睛（揮鎚瞬間瞇眼專注，平時睜眼）
    ctx.fillStyle = '#2a2a2a'
    const squint = game.swingT > 0
    if (squint) {
      ctx.lineWidth = 1.6; ctx.strokeStyle = '#2a2a2a'
      ctx.beginPath(); ctx.moveTo(x - 5, headCY - 1); ctx.lineTo(x - 2, headCY - 1); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x + 2, headCY - 1); ctx.lineTo(x + 5, headCY - 1); ctx.stroke()
    } else {
      ctx.beginPath(); ctx.arc(x - 3.5, headCY - 1, 1.3, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(x + 3.5, headCY - 1, 1.3, 0, Math.PI * 2); ctx.fill()
    }
    // 嘴：對準→微笑、鎚歪→扁嘴、平時→堅定平線
    ctx.strokeStyle = '#7a4a32'; ctx.lineWidth = 1.4
    ctx.beginPath()
    if (game.missFlash > 0) { ctx.moveTo(x - 3, headCY + 4); ctx.quadraticCurveTo(x, headCY + 2, x + 3, headCY + 4) } // 扁/苦
    else if (aligned) { ctx.moveTo(x - 3, headCY + 3); ctx.quadraticCurveTo(x, headCY + 6, x + 3, headCY + 3) } // 微笑
    else { ctx.moveTo(x - 3, headCY + 4); ctx.lineTo(x + 3, headCY + 4) } // 堅定
    ctx.stroke()
    // 揮鎚手臂 + 鎚子（揮下時旋轉）
    const swing = game.swingT > 0 ? (1 - game.swingT / 0.18) : 1 // 0→1
    const ang = -1.1 + swing * 1.7 // 從舉起到敲下
    const sx = x + 7
    const sy = hy + 18
    ctx.save()
    ctx.translate(sx, sy)
    ctx.rotate(ang)
    ctx.strokeStyle = '#e8b887'; ctx.lineWidth = 4
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -20); ctx.stroke() // 手臂+握柄
    ctx.fillStyle = '#7a6a55'
    ctx.fillRect(-7, -27, 14, 8) // 鎚頭
    ctx.restore()

    // 命中提示 / 鎚歪提示
    if (game.missFlash > 0) {
      ctx.globalAlpha = Math.min(1, game.missFlash / 0.3)
      ctx.fillStyle = '#ffdca8'
      ctx.font = `bold 14px ${EMOJI}`
      ctx.textAlign = 'center'
      ctx.fillText(game.missText || '歪了！', x, hy - 12)
      ctx.globalAlpha = 1
    }
  }

  // ===== 以下為方舟各部位繪製（與前版相同）=====
  _drop(p) {
    const e = p.drop
    return { oy: -(1 - e) * 40, alpha: 0.45 + 0.55 * e }
  }

  _plank(ctx, p) {
    const { oy, alpha } = this._drop(p)
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(0, oy)
    if (p.kind === 'hull') this._hull(ctx)
    else if (p.kind === 'wall') this._wall(ctx, p)
    else if (p.kind === 'door') this._door(ctx, p.rect)
    else if (p.kind === 'window') this._window(ctx, p.rect)
    else if (p.kind === 'roof') this._roof(ctx)
    ctx.restore()
  }

  _hull(ctx) {
    const yTop = BOX.wallBottom
    const yBot = BOX.wallBottom + BOX.hullH
    ctx.fillStyle = PALETTE.hull
    ctx.beginPath()
    ctx.moveTo(BOX.left - 18, yTop)
    ctx.lineTo(BOX.right + 18, yTop)
    ctx.lineTo(BOX.right - 30, yBot - 16)
    ctx.quadraticCurveTo(WORLD.w / 2, yBot + 14, BOX.left + 30, yBot - 16)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = PALETTE.hullDark
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'
    ctx.lineWidth = 2
    for (let i = 1; i <= 2; i++) {
      const y = yTop + (BOX.hullH * i) / 3
      ctx.beginPath(); ctx.moveTo(BOX.left - 8, y); ctx.lineTo(BOX.right + 8, y); ctx.stroke()
    }
  }

  _wall(ctx, p) {
    const r = p.rect
    ctx.fillStyle = PALETTE.deck[p.deck] || PALETTE.deck[0]
    ctx.fillRect(r.x, r.y, r.w, r.h)
    ctx.strokeStyle = 'rgba(0,0,0,0.16)'
    ctx.lineWidth = 2
    ctx.strokeRect(r.x, r.y, r.w, r.h)
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'
    ctx.lineWidth = 1
    for (let x = r.x + 40; x < r.x + r.w; x += 70) {
      ctx.beginPath(); ctx.moveTo(x, r.y + 4); ctx.lineTo(x + 24, r.y + r.h - 4); ctx.stroke()
    }
  }

  _door(ctx, r) {
    ctx.fillStyle = PALETTE.doorDark
    ctx.fillRect(r.x, r.y, r.w, r.h)
    ctx.strokeStyle = PALETTE.doorFrame
    ctx.lineWidth = 6
    ctx.strokeRect(r.x, r.y, r.w, r.h)
    ctx.strokeStyle = 'rgba(255,255,255,0.10)'
    ctx.lineWidth = 2
    for (let x = r.x + r.w / 3; x < r.x + r.w; x += r.w / 3) {
      ctx.beginPath(); ctx.moveTo(x, r.y + 6); ctx.lineTo(x, r.y + r.h - 6); ctx.stroke()
    }
    ctx.fillStyle = '#caa45a'
    ctx.beginPath(); ctx.arc(r.x + r.w - 14, r.y + r.h / 2, 4, 0, Math.PI * 2); ctx.fill()
  }

  _window(ctx, r) {
    ctx.fillStyle = PALETTE.windowGlow
    ctx.fillRect(r.x, r.y, r.w, r.h)
    ctx.strokeStyle = PALETTE.windowFrame
    ctx.lineWidth = 5
    ctx.strokeRect(r.x, r.y, r.w, r.h)
    ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(r.x + r.w / 2, r.y); ctx.lineTo(r.x + r.w / 2, r.y + r.h); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(r.x, r.y + r.h / 2); ctx.lineTo(r.x + r.w, r.y + r.h / 2); ctx.stroke()
  }

  _roof(ctx) {
    ctx.fillStyle = PALETTE.roof
    ctx.beginPath()
    ctx.moveTo(BOX.left - 24, WALL_TOP + 2)
    ctx.lineTo(WORLD.w / 2, BOX.roofApexY)
    ctx.lineTo(BOX.right + 24, WALL_TOP + 2)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = PALETTE.roofDark
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'
    ctx.lineWidth = 2
    for (let i = 1; i <= 3; i++) {
      const t = i / 4
      ctx.beginPath()
      ctx.moveTo(BOX.left - 24 + (WORLD.w / 2 - (BOX.left - 24)) * t, WALL_TOP + 2 - (WALL_TOP + 2 - BOX.roofApexY) * t)
      ctx.lineTo(BOX.right + 24 - (BOX.right + 24 - WORLD.w / 2) * t, WALL_TOP + 2 - (WALL_TOP + 2 - BOX.roofApexY) * t)
      ctx.stroke()
    }
  }

  _ghost(ctx, p, t) {
    const pulse = 0.4 + 0.3 * (0.5 + 0.5 * Math.sin(t * 5))
    ctx.save()
    ctx.globalAlpha = pulse
    ctx.fillStyle = PALETTE.ghost
    ctx.strokeStyle = PALETTE.ghostEdge
    ctx.lineWidth = 3
    ctx.setLineDash([8, 6])
    if (p.kind === 'wall' || p.kind === 'door' || p.kind === 'window') {
      const r = p.rect
      ctx.fillRect(r.x, r.y, r.w, r.h)
      ctx.strokeRect(r.x, r.y, r.w, r.h)
    } else if (p.kind === 'hull') {
      const yTop = BOX.wallBottom
      const yBot = BOX.wallBottom + BOX.hullH
      ctx.beginPath()
      ctx.moveTo(BOX.left - 18, yTop)
      ctx.lineTo(BOX.right + 18, yTop)
      ctx.lineTo(BOX.right - 30, yBot - 16)
      ctx.quadraticCurveTo(WORLD.w / 2, yBot + 14, BOX.left + 30, yBot - 16)
      ctx.closePath()
      ctx.fill(); ctx.stroke()
    } else if (p.kind === 'roof') {
      ctx.beginPath()
      ctx.moveTo(BOX.left - 24, WALL_TOP + 2)
      ctx.lineTo(WORLD.w / 2, BOX.roofApexY)
      ctx.lineTo(BOX.right + 24, WALL_TOP + 2)
      ctx.closePath()
      ctx.fill(); ctx.stroke()
    }
    ctx.setLineDash([])
    ctx.restore()
  }

  _hud(ctx, game) {
    ctx.fillStyle = PALETTE.ink
    ctx.font = `bold 22px ${EMOJI}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(CONTENT.title, 24, 20)
    ctx.textAlign = 'right'
    ctx.font = `bold 16px ${EMOJI}`
    ctx.fillText(`🔨 已蓋約 ${game.years} 年`, WORLD.w - 24, 22)
    ctx.font = `14px ${EMOJI}`
    ctx.fillText(`木板 ${game.placedCount} / ${game.total}`, WORLD.w - 24, 46)
    const bw = 220
    const bx = WORLD.w - 24 - bw
    const by = 68
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.fillRect(bx, by, bw, 10)
    ctx.fillStyle = '#5fb96b'
    ctx.fillRect(bx, by, (bw * game.placedCount) / game.total, 10)
  }

  _beat(ctx, beat) {
    ctx.fillStyle = 'rgba(20,30,40,0.86)'
    const pad = 70
    const bx = pad
    const bw = WORLD.w - pad * 2
    const bh = 250
    const by = WORLD.h / 2 - bh / 2
    this._roundRect(ctx, bx, by, bw, bh, 16)
    ctx.fill()
    ctx.strokeStyle = beat.kind === 'win' ? '#7bd88f' : beat.kind === 'section' ? '#e9c46a' : '#bcd'
    ctx.lineWidth = 3
    this._roundRect(ctx, bx, by, bw, bh, 16)
    ctx.stroke()
    let y = by + 24
    if (beat.kicker) y = this._wrap(ctx, beat.kicker, WORLD.w / 2, y, bw - 80, 32, beat.kind === 'win' ? '#7bd88f' : '#ffd98a', `bold 24px ${EMOJI}`) + 6
    if (beat.ref) {
      ctx.fillStyle = '#ffe1a8'; ctx.font = `bold 15px ${EMOJI}`; ctx.textAlign = 'center'
      ctx.fillText(beat.ref, WORLD.w / 2, y); y += 24
    }
    if (beat.line) y = this._wrap(ctx, beat.line, WORLD.w / 2, y, bw - 80, 22, '#eef', `15px ${EMOJI}`)
    if (beat.teach) { y += 6; y = this._wrap(ctx, beat.teach, WORLD.w / 2, y, bw - 80, 21, '#cfe', `italic 14px ${EMOJI}`) }
    ctx.fillStyle = '#9fb6c6'; ctx.font = `13px ${EMOJI}`; ctx.textAlign = 'center'
    ctx.fillText(beat.cont || '點畫面繼續', WORLD.w / 2, by + bh - 26)
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

  _wrap(ctx, text, cx, y, maxW, lh, color, font) {
    ctx.fillStyle = color
    ctx.font = font
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    let line = ''
    for (const ch of text) {
      const test = line + ch
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, cx, y); y += lh; line = ch
      } else line = test
    }
    if (line) { ctx.fillText(line, cx, y); y += lh }
    return y
  }
}

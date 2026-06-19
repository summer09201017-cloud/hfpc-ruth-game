// 動物公母配對 + 安排房間 主迴圈 + 狀態機。
// 嵌入契約：new Game(canvas,{embed,onComplete,winPoints,pairs})、boot()、destroy()。
// 狀態：intro →（點畫面）play →（全部配對）arrangeIntro →（點畫面）arrange
//        →（排到全平安）won →（點畫面）onComplete。
// 「不會失敗」：配對翻錯只是蓋回；安排房間排不對也只是還沒過關，可一直調整。
import { RULES, GRID, arkRoomRects, roomNeighbors } from './config.js'
import { composeRound, CONTENT, isSafeNeighbor, isPredator } from './content.js'

import { Renderer } from './renderer.js'
import { Input } from './input.js'
import { PairsAudio } from './audio.js'

const FLIP_SPEED = 6 // 翻牌動畫速度（每秒 flip 量；~0.17s 翻完）

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export class Game {
  constructor(canvas, opts = {}) {
    this.canvas = canvas
    this.embed = !!opts.embed
    this.onComplete = opts.onComplete || (() => {})
    this.winPoints = opts.winPoints || 5
    this.pairs = Math.max(2, Math.min(opts.pairs || RULES.pairs, 12))
    this.renderer = new Renderer(canvas)
    this.input = new Input()
    this.audio = new PairsAudio()

    this.stopped = false
    this.finished = false
    this.state = 'intro'
    this.cols = RULES.cols
    this.rows = Math.ceil((this.pairs * 2) / this.cols)
    this.cards = this._buildCards()
    this.rooms = [] // 配對完成後的房間：rooms[i] 住在第 i 間（含 species/emoji/name/role）
    this.first = null
    this.second = null
    this.lock = false // 翻錯等待蓋回時上鎖
    this.flipBackTimer = 0
    this.toast = null // { text, t, kind:'match'|'miss' }
    this.lineIdx = 0
    // 安排房間階段：
    this.selected = null // 已選起來、等待和下一格交換的房間索引
    this.unsafe = new Set() // 目前「猛獸鄰居不安全」的房間索引（含猛獸與被害鄰居）
    this.beat = {
      kind: 'intro',
      kicker: CONTENT.intro.kicker,
      ref: CONTENT.intro.ref,
      line: CONTENT.intro.line,
      teach: CONTENT.intro.teach,
      cont: CONTENT.intro.cont,
    }
    this._loop = this._loop.bind(this)
  }

  // 建立牌組：composeRound 抽 this.pairs 種（保證有解），每種一公一母，洗牌落格。
  _buildCards() {
    const cells = this._cells()
    const pool = composeRound(this.pairs)
    const deck = []
    for (let i = 0; i < this.pairs; i++) {
      const a = pool[i]
      deck.push({ species: a.id, emoji: a.emoji, name: a.name, role: a.role, sex: 'm' })
      deck.push({ species: a.id, emoji: a.emoji, name: a.name, role: a.role, sex: 'f' })
    }
    shuffle(deck)
    return deck.map((c, i) => ({
      ...c,
      idx: i,
      cell: cells[i],
      cardState: 'down', // down | up | matched
      flip: 0, // 0=背面 1=正面（動畫值）
      target: 0,
    }))
  }

  _cells() {
    const { x, y, w, h, gap } = GRID
    const cw = (w - (this.cols - 1) * gap) / this.cols
    const ch = (h - (this.rows - 1) * gap) / this.rows
    const cells = []
    const total = this.pairs * 2
    for (let i = 0; i < total; i++) {
      const col = i % this.cols
      const row = Math.floor(i / this.cols)
      const inRow = Math.min(this.cols, total - row * this.cols)
      const rowW = inRow * cw + (inRow - 1) * gap
      const rowOx = x + (w - rowW) / 2
      cells.push({ x: rowOx + col * (cw + gap), y: y + row * (ch + gap), w: cw, h: ch })
    }
    return cells
  }

  boot() {
    this.audio.unlock()
    this.audio.startBgm() // 背景音樂（輕柔循環）；在「開始」手勢中啟動才解得了鎖
    this.input.attach(this.canvas)
    this.last = null
    requestAnimationFrame(this._loop)
  }

  _loop(t) {
    if (this.stopped) return
    if (this.last == null) this.last = t
    let dt = (t - this.last) / 1000
    this.last = t
    if (dt > 0.1) dt = 0.1
    this.renderer.measure()
    this._update(dt)
    if (this.stopped) return
    this.renderer.draw(this)
    requestAnimationFrame(this._loop)
  }

  _update(dt) {
    for (const c of this.cards) {
      if (c.flip < c.target) c.flip = Math.min(c.target, c.flip + FLIP_SPEED * dt)
      else if (c.flip > c.target) c.flip = Math.max(c.target, c.flip - FLIP_SPEED * dt)
    }
    if (this.toast) {
      this.toast.t -= dt
      if (this.toast.t <= 0) this.toast = null
    }

    const tap = this.input.consumeTap()
    switch (this.state) {
      case 'intro':
        if (tap) { this.state = 'play'; this.beat = null }
        break
      case 'play':
        if (this.lock) {
          this.flipBackTimer -= dt
          if (tap || this.flipBackTimer <= 0) this._flipBack()
        } else if (tap) {
          this._tapCard(this._toWorld(tap))
        }
        break
      case 'arrangeIntro':
        if (tap) { this.state = 'arrange'; this.beat = null }
        break
      case 'arrange':
        if (tap) this._tapRoom(this._toWorld(tap))
        break
      case 'won':
        if (this.beat && tap) this._finish()
        break
    }
  }

  _toWorld(tap) {
    const f = this.renderer.fit
    if (!f) return { x: -1, y: -1 }
    return { x: (tap.x - f.ox) / f.scale, y: (tap.y - f.oy) / f.scale }
  }

  // ---------- 階段一：配對 ----------
  _tapCard(p) {
    const hit = this.cards.find(
      (c) => c.cardState === 'down' && p.x >= c.cell.x && p.x <= c.cell.x + c.cell.w && p.y >= c.cell.y && p.y <= c.cell.y + c.cell.h,
    )
    if (!hit) return
    hit.cardState = 'up'
    hit.target = 1
    this.audio.flip()
    if (this.first == null) {
      this.first = hit.idx
    } else {
      this.second = hit.idx
      this._evaluate()
    }
  }

  _evaluate() {
    const a = this.cards[this.first]
    const b = this.cards[this.second]
    if (a.species === b.species) {
      a.cardState = b.cardState = 'matched'
      this.rooms.push({ species: a.species, emoji: a.emoji, name: a.name, role: a.role })
      this.audio.match()
      this.toast = { text: CONTENT.matchLines[this.lineIdx % CONTENT.matchLines.length], t: 1.8, kind: 'match' }
      this.lineIdx++
      this.first = this.second = null
      if (this.rooms.length >= this.pairs) this._enterArrange()
    } else {
      this.lock = true
      this.flipBackTimer = RULES.flipBackSec
      this.audio.miss()
      this.toast = { text: CONTENT.miss[this.lineIdx % CONTENT.miss.length], t: RULES.flipBackSec + 0.4, kind: 'miss' }
    }
  }

  _flipBack() {
    const a = this.cards[this.first]
    const b = this.cards[this.second]
    if (a) { a.cardState = 'down'; a.target = 0 }
    if (b) { b.cardState = 'down'; b.target = 0 }
    this.first = this.second = null
    this.lock = false
  }

  // ---------- 過場：進入安排房間 ----------
  _enterArrange() {
    this.toast = null
    // 洗亂房間順序當作謎題起點；若剛好已平安就再洗（保證至少要動一下）。
    let tries = 0
    do { shuffle(this.rooms); tries++ } while (this._isPeaceful() && tries < 12)
    this._recomputeUnsafe()
    this.state = 'arrangeIntro'
    this.audio.section?.()
    this.beat = {
      kind: 'arrange',
      kicker: CONTENT.arrange.kicker,
      ref: CONTENT.arrange.ref,
      line: CONTENT.arrange.line,
      teach: CONTENT.arrange.teach,
      cont: CONTENT.arrange.cont,
    }
  }

  // ---------- 階段二：安排房間（點選 → 交換）----------
  _tapRoom(p) {
    const rects = arkRoomRects(this.pairs)
    const hit = rects.findIndex((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h)
    if (hit < 0) return
    if (this.selected == null) {
      this.selected = hit
      this.audio.flip()
    } else if (this.selected === hit) {
      this.selected = null // 再點同一格＝取消
    } else {
      // 交換兩間房的住客
      const a = this.selected
      ;[this.rooms[a], this.rooms[hit]] = [this.rooms[hit], this.rooms[a]]
      this.selected = null
      this.audio.match()
      this._recomputeUnsafe()
      if (this._isPeaceful()) this._win()
    }
  }

  // 重新計算「不安全」房間：猛獸的任一鄰居不是 safe（大象/飛鳥）→ 猛獸與該鄰居都標紅。
  _recomputeUnsafe() {
    const bad = new Set()
    for (let i = 0; i < this.rooms.length; i++) {
      if (!isPredator(this.rooms[i].role)) continue
      for (const j of roomNeighbors(i, this.pairs)) {
        if (!isSafeNeighbor(this.rooms[j].role)) {
          bad.add(i)
          bad.add(j)
        }
      }
    }
    this.unsafe = bad
  }

  _isPeaceful() {
    for (let i = 0; i < this.rooms.length; i++) {
      if (!isPredator(this.rooms[i].role)) continue
      for (const j of roomNeighbors(i, this.pairs)) {
        if (!isSafeNeighbor(this.rooms[j].role)) return false
      }
    }
    return true
  }

  _win() {
    this.state = 'won'
    this.selected = null
    this.unsafe = new Set()
    this.audio.win()
    this.beat = {
      kind: 'win',
      kicker: CONTENT.win.kicker,
      ref: CONTENT.win.ref,
      line: CONTENT.win.line,
      teach: CONTENT.win.teach,
      cont: CONTENT.win.cont,
    }
  }

  _finish() {
    if (this.finished) return
    this.finished = true
    this.onComplete({ won: true, score: this.winPoints, level: 'arkpairs' })
  }

  destroy() {
    this.stopped = true
    this.input.detach()
    this.audio.destroy()
  }
}

// 蓋方舟（操作挪亞鎚擊瞄準版）主迴圈 + 狀態機。
// 嵌入契約：new Game(canvas,{embed,onComplete,winPoints})、boot()、destroy()。
// 流程：intro →（每段）sectionIntro 讀經文 → building（挪亞左右移動，抓準在釘點上鎚下去釘木板）
//        → … → won → onComplete。
// 「不會失敗」——鎚歪了只是重來；旁邊有人嘲笑（氣氛＋教導，不影響過關）。
import { WORLD, BOX, WALL_TOP, DOOR, WINDOW, RULES, AIM, STUDS } from './config.js'
import { CONTENT } from './content.js'
import { Renderer } from './renderer.js'
import { Input } from './input.js'
import { BuildAudio } from './audio.js'

const SECTION_ORDER = ['hull', 'walls', 'door', 'window', 'roof']
const SWEEP_MIN = BOX.left - AIM.margin
const SWEEP_MAX = BOX.right + AIM.margin

export class Game {
  constructor(canvas, opts = {}) {
    this.canvas = canvas
    this.embed = !!opts.embed
    this.onComplete = opts.onComplete || (() => {})
    this.winPoints = opts.winPoints || 5
    this.renderer = new Renderer(canvas)
    this.input = new Input()
    this.audio = new BuildAudio()

    this.stopped = false
    this.finished = false
    this.state = 'intro'
    this.tAccum = 0 // 釘點脈動用
    this.planks = this._buildPlanks()
    this.total = this.planks.length
    this.placedCount = 0
    this.sectionIdx = 0
    // 挪亞鎚擊瞄準
    this.noahX = SWEEP_MIN
    this.noahDir = 1
    this.swingT = 0 // 揮鎚動畫倒數
    this.missFlash = 0 // 鎚歪了的提示倒數
    this.missText = ''
    this.missIdx = 0
    // 嘲笑的人
    this.mockerIdx = 0
    this.mockerT = 2.6
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

  // 依建造順序生出每塊木板（含幾何 + 釘點 targetX + 那一排的 rowY）。
  _buildPlanks() {
    const list = []
    const cx = (BOX.left + BOX.right) / 2
    const studX = (i) => BOX.left + STUDS[i % STUDS.length] * (BOX.right - BOX.left)
    list.push({ section: 'hull', kind: 'hull', placed: false, drop: 0, targetX: cx, rowY: BOX.wallBottom + 22 })
    for (let i = 0; i < BOX.rows; i++) {
      const deck = Math.floor(i / (BOX.rows / 3))
      const rect = { x: BOX.left, y: BOX.wallBottom - (i + 1) * BOX.rowH, w: BOX.right - BOX.left, h: BOX.rowH }
      list.push({ section: 'walls', kind: 'wall', deck: Math.min(2, deck), rect, placed: false, drop: 0, targetX: studX(i), rowY: rect.y + rect.h / 2 })
    }
    list.push({ section: 'door', kind: 'door', rect: { ...DOOR }, placed: false, drop: 0, targetX: DOOR.x + DOOR.w / 2, rowY: DOOR.y + DOOR.h / 2 })
    list.push({ section: 'window', kind: 'window', rect: { ...WINDOW }, placed: false, drop: 0, targetX: WINDOW.x + WINDOW.w / 2, rowY: WINDOW.y + WINDOW.h / 2 })
    list.push({ section: 'roof', kind: 'roof', placed: false, drop: 0, targetX: cx, rowY: WALL_TOP - 14 })
    return list
  }

  get years() {
    return Math.max(1, Math.round((this.placedCount / this.total) * RULES.totalYears))
  }

  // 進度 0→1（蓋了幾成）。漸進難度與挪亞鬍子長度/顏色都吃這個值。
  get progress() {
    return this.total ? this.placedCount / this.total : 0
  }
  // 有效移動速度 / 命中容差：越蓋越快、容差越小（守公平下限）。renderer 也讀 aimTol() 畫刻度。
  aimSpeed() { return AIM.speed + (AIM.speedMax - AIM.speed) * this.progress }
  aimTol() { return AIM.tol + (AIM.tolMin - AIM.tol) * this.progress }

  _nextPlank() {
    const sec = SECTION_ORDER[this.sectionIdx]
    return this.planks.find((p) => p.section === sec && !p.placed) || null
  }

  boot() {
    this.audio.unlock()
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
    this.tAccum += dt
    if (this.swingT > 0) this.swingT -= dt
    if (this.missFlash > 0) this.missFlash -= dt
    for (const p of this.planks) {
      if (p.placed && p.drop < 1) p.drop = Math.min(1, p.drop + dt / RULES.dropSec)
    }
    // 嘲笑台詞輪播（任何階段都在講）
    this.mockerT -= dt
    if (this.mockerT <= 0) {
      this.mockerIdx = (this.mockerIdx + 1) % CONTENT.mockers.length
      this.mockerT = 2.6
    }

    const fire = this.input.consumeFire()
    switch (this.state) {
      case 'intro':
        if (fire) this._enterSection(0)
        break
      case 'sectionIntro':
        if (fire) { this.state = 'building'; this.beat = null }
        break
      case 'building':
        this._sweep(dt)
        if (fire) this._hammer()
        break
      case 'won':
        if (fire) this._finish()
        break
    }
  }

  // 挪亞沿目前木板那一排左右移動（越蓋越快）。
  _sweep(dt) {
    this.noahX += this.noahDir * this.aimSpeed() * dt
    if (this.noahX >= SWEEP_MAX) { this.noahX = SWEEP_MAX; this.noahDir = -1 }
    else if (this.noahX <= SWEEP_MIN) { this.noahX = SWEEP_MIN; this.noahDir = 1 }
  }

  // 鎚下去：對準釘點就釘上木板，沒對準就歪掉重來（容差越蓋越小）。
  _hammer() {
    const p = this._nextPlank()
    if (!p) return
    this.swingT = 0.18
    if (Math.abs(this.noahX - p.targetX) <= this.aimTol()) {
      this._place(p)
    } else {
      this.audio.miss()
      this.missFlash = 0.7
      this.missText = CONTENT.miss[this.missIdx % CONTENT.miss.length]
      this.missIdx++
    }
  }

  _place(p) {
    p.placed = true
    p.drop = 0
    this.placedCount++
    this.audio.knock()
    if (!this._nextPlank()) {
      if (this.sectionIdx < SECTION_ORDER.length - 1) {
        this.audio.section()
        this._enterSection(this.sectionIdx + 1)
      } else {
        this.state = 'won'
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
    }
  }

  _enterSection(idx) {
    this.sectionIdx = idx
    const key = SECTION_ORDER[idx]
    const s = CONTENT.sections[key]
    this.state = 'sectionIntro'
    this.beat = {
      kind: 'section',
      kicker: `🪵 ${s.label}`,
      ref: s.ref,
      line: s.line,
      teach: s.teach,
      cont: '點畫面　開始放木板',
    }
  }

  _finish() {
    if (this.finished) return
    this.finished = true
    this.onComplete({ won: true, score: this.winPoints, level: 'arkbuild' })
  }

  destroy() {
    this.stopped = true
    this.input.detach()
    this.audio.destroy()
  }
}

// 大衛甩石（簡化版）主迴圈 + 狀態機。嵌入契約：new Game(canvas,{embed,onComplete})、boot()、destroy()。
// 狀態：intro → aim →（放手）flying →（命中）win ／（落空）miss →(還有石子) aim ／(沒石子) lose。
import { WORLD, PHYSICS, AIM, GROUND_Y, DAVID, GOLIATH, RULES } from './config.js'
import { CONTENT } from './content.js'
import { launchVelocity, stepProjectile, segmentHitsRect, deg2rad } from './projectile.js'
import { Renderer } from './renderer.js'
import { Input } from './input.js'
import { SlingAudio } from './audio.js'

const STEP = 1 / 60
const MISS_AUTO_SEC = 1.6 // 落空提示停留多久自動換下一顆（也可點畫面快轉）

export class Game {
  constructor(canvas, opts = {}) {
    this.canvas = canvas
    this.embed = !!opts.embed
    this.onComplete = opts.onComplete || (() => {})
    this.winPoints = opts.winPoints || 5
    this.renderer = new Renderer(canvas)
    this.input = new Input()
    this.audio = new SlingAudio()

    this.stopped = false
    this.finished = false
    this.totalStones = RULES.stones
    this.stonesLeft = RULES.stones
    this.aimDeg = AIM.minDeg
    this.aimDir = 1
    this.stone = null
    this.trail = []
    this.flightT = 0
    this.missTimer = 0
    this.missIdx = 0
    this.state = 'intro'
    this.beat = {
      kind: 'intro',
      kicker: CONTENT.title,
      ref: CONTENT.intro.ref,
      line: CONTENT.intro.line,
      teach: CONTENT.how,
      cont: '點畫面 / 按空白鍵　開始甩石',
    }
    this._loop = this._loop.bind(this)
  }

  boot() {
    this.audio.unlock()
    this.input.attach(this.canvas)
    this.last = null
    this.acc = 0
    requestAnimationFrame(this._loop)
  }

  _loop(t) {
    if (this.stopped) return
    if (this.last == null) this.last = t
    let dt = (t - this.last) / 1000
    this.last = t
    if (dt > 0.1) dt = 0.1
    this.acc += dt
    while (this.acc >= STEP) {
      this._step(STEP)
      this.acc -= STEP
      if (this.stopped) return
    }
    this.renderer.draw(this)
    requestAnimationFrame(this._loop)
  }

  _step(dt) {
    const fire = this.input.consumeFire()
    switch (this.state) {
      case 'intro':
        if (fire) this._startAim()
        break
      case 'aim': {
        this.aimDeg += this.aimDir * AIM.sweepDegPerSec * dt
        if (this.aimDeg >= AIM.maxDeg) { this.aimDeg = AIM.maxDeg; this.aimDir = -1 }
        else if (this.aimDeg <= AIM.minDeg) { this.aimDeg = AIM.minDeg; this.aimDir = 1 }
        if (fire) this._launch()
        break
      }
      case 'flying': {
        this.flightT += dt
        const prev = this.stone
        const next = stepProjectile(prev, dt, PHYSICS.gravity)
        if (segmentHitsRect(prev.x, prev.y, next.x, next.y, GOLIATH.forehead)) {
          this.stone = next
          this._win()
          break
        }
        this.stone = next
        if (this.trail.length === 0 || Math.hypot(next.x - this.trail[this.trail.length - 1].x, next.y - this.trail[this.trail.length - 1].y) > 14) {
          this.trail.push({ x: next.x, y: next.y })
        }
        if (next.y >= GROUND_Y || next.x > WORLD.w + 80 || this.flightT > RULES.maxFlightSec) this._miss()
        break
      }
      case 'miss':
        this.missTimer += dt
        if (fire || this.missTimer >= MISS_AUTO_SEC) this._afterMiss()
        break
      case 'win':
      case 'lose':
        if (fire) this._finish()
        break
    }
  }

  _startAim() {
    this.state = 'aim'
    this.beat = null
    this.stone = null
    this.trail = []
    this.aimDeg = AIM.minDeg
    this.aimDir = 1
  }

  _launch() {
    const a = deg2rad(this.aimDeg)
    const v = launchVelocity(a, PHYSICS.power)
    this.stone = { x: DAVID.x + Math.cos(a) * 30, y: DAVID.y - 6 - Math.sin(a) * 30, vx: v.vx, vy: v.vy }
    this.trail = []
    this.flightT = 0
    this.state = 'flying'
    this.audio.swing()
  }

  _win() {
    this.state = 'win'
    this.audio.hit()
    this.audio.win()
    this.beat = {
      kind: 'win',
      kicker: '🎯 正中額頭！歌利亞仆倒了',
      ref: CONTENT.win.ref,
      line: CONTENT.win.line,
      teach: CONTENT.win.teach,
      cont: '點畫面 / 按空白鍵　完成挑戰',
    }
  }

  _miss() {
    this.stonesLeft -= 1
    this.audio.miss()
    if (this.stonesLeft <= 0) {
      this.state = 'lose'
      this.beat = {
        kind: 'lose',
        kicker: `${this.totalStones} 顆石子都甩完了`,
        ref: CONTENT.lose.ref,
        line: CONTENT.lose.line,
        teach: CONTENT.lose.teach,
        cont: '點畫面 / 按空白鍵　回到棋盤',
      }
    } else {
      this.state = 'miss'
      this.missTimer = 0
      this.beat = {
        kind: 'miss',
        kicker: '差一點！',
        teach: CONTENT.miss[this.missIdx % CONTENT.miss.length],
        cont: `還有 ${this.stonesLeft} 顆——點畫面繼續`,
      }
      this.missIdx += 1
    }
  }

  _afterMiss() {
    this.beat = null
    this.stone = null
    this.trail = []
    this._startAim()
  }

  _finish() {
    if (this.finished) return
    this.finished = true
    const won = this.state === 'win'
    this.onComplete({ won, score: won ? this.winPoints : 0, level: 'sling' })
  }

  destroy() {
    this.stopped = true
    this.input.detach()
    this.audio.destroy()
  }
}

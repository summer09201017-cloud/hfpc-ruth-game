// 「拾麥穗蒙恩 · 路得」收集關主迴圈 + 狀態機。
// 嵌入契約與 sling/jonah 相同:new Game(canvas, { embed, winPoints, onComplete })、boot()、destroy()。
// 狀態:intro(看開場經文) → playing(前進、跳石頭、撿麥穗🌾) → dialogue(遇見波阿斯、故意撥落一大把)
//        → win(日暮、裝滿一籃) / faint(體力歸零→歇一會兒→自動再起,不失敗)。
import { VIEW, GROUND_Y, PLAYER, RUN, STAMINA, FAINT, WHEAT, BOAZ } from './config.js'
import { CONTENT } from './content.js'
import { Player } from './player.js'
import { Spawner } from './spawner.js'
import { Renderer } from './renderer.js'
import { Input } from './input.js'
import { Audio } from './audio.js'

const STEP = 1 / 60 // 固定時間步長,讓物理在任何更新率下都一致
const INVULN = 1.0 // 踢到石頭/草叢後的無敵秒數

export class Game {
  // opts(嵌入 / 單機預覽共用):
  //   embed      —— true 時(桌遊彈窗 / Demo)結束走 onComplete。
  //   winPoints  —— 過關回報的分數(嵌入由外層換算恩慈點數)。
  //   onComplete({ won, score, level:'gleaning' }) —— 結束時呼叫(只呼一次)。
  constructor(canvas, opts = {}) {
    this.canvas = canvas
    this.embed = !!opts.embed
    this.winPoints = opts.winPoints || 5
    this.onComplete = opts.onComplete || (() => {})
    this.renderer = new Renderer(canvas)
    this.input = new Input()
    this.player = new Player()
    this.spawner = new Spawner()

    this.state = 'intro'
    this.stopped = false
    this._done = false
    this.last = 0
    this.acc = 0
    this.faintT = 0
    this._resetRun()
    this._loop = this._loop.bind(this)
  }

  boot() {
    Audio.unlock()
    this.input.attach(this.canvas)
    this.renderer.resize()
    this._onResize = () => this.renderer.resize()
    window.addEventListener('resize', this._onResize)
    this.last = 0
    this.acc = 0
    requestAnimationFrame(this._loop)
  }

  _resetRun() {
    this.player.reset()
    this.spawner.reset()
    this.distance = 0
    this.speed = RUN.startSpeed
    this.goalDistance = RUN.goalDistance
    this.stamina = STAMINA.start
    this.grains = 0 // 籃子裡的麥穗束數(HUD 顯示;撿一束 +1、波阿斯撥落 +bundle)
    this.boazMet = 0 // 遇見波阿斯的次數
    this.dialogue = null // 進行中的波阿斯對話 { say, ref }(null=沒有)
    this._boazLineIdx = 0 // 輪流出現的話
    this.faintT = 0
  }

  _loop(t) {
    if (this.stopped) return
    if (!this.last) this.last = t
    let dt = (t - this.last) / 1000
    this.last = t
    if (dt > 0.1) dt = 0.1

    if (this.input.consumeMute()) this.toggleMute()
    if (this.input.consumePause()) {
      if (this.state === 'playing') this.pause()
      else if (this.state === 'paused') this.resume()
    }

    if (this.state === 'playing') {
      this.acc += dt
      while (this.acc >= STEP) {
        this.step(STEP)
        if (this.state !== 'playing') break
        this.acc -= STEP
      }
    } else if (this.state === 'intro') {
      if (this._fire()) this._startPlay()
    } else if (this.state === 'dialogue') {
      // 遇見波阿斯:停下看對話(他的話+經文),點畫面繼續拾穗
      if (this._fire()) this._endDialogue()
    } else if (this.state === 'win') {
      if (this._fire()) this._finish(true)
    } else if (this.state === 'faint') {
      // 歇坐片刻(神顧念寄居的);輕點可提早起來
      this.faintT += dt
      const skip = this._fire()
      if (skip || this.faintT >= FAINT.duration) this._revive()
    } else {
      this._fire()
    }

    this.renderer.draw(this)
    requestAnimationFrame(this._loop)
  }

  // 一次「動作」輸入(點畫面 / 輕點 / 跳鍵),用於推進覆蓋畫面
  _fire() {
    const press = this.input.consumePress()
    const tap = this.input.consumeTap()
    const jump = this.input.consumeJump()
    return !!(press || tap || jump)
  }

  step(dt) {
    // ---- 輸入:auto-runner——點畫面 / 輕點 / 跳鍵 = 跳 ----
    const press = this.input.consumePress()
    const tapped = this.input.consumeTap()
    let wantJump = this.input.consumeJump()
    if (press || tapped) wantJump = true

    // 世界速度(隨距離緩慢加速;拾穗一整天,整體和緩)
    const k = Math.min(1, this.distance / RUN.rampDistance)
    this.speed = RUN.startSpeed + (RUN.maxSpeed - RUN.startSpeed) * k

    if (wantJump && this.player.jump()) Audio.sfx('jump')

    this.distance += this.speed * dt
    this.player.update(dt)

    // 體力:前進緩慢消耗
    this.stamina -= STAMINA.drainPerSec * dt
    if (this.stamina <= 0) {
      this.stamina = 0
      this._faint()
      return
    }

    // 生成 / 移動 田裡的麥穗、波阿斯、障礙
    this.spawner.update(dt, this.speed, this.distance, this.goalDistance)

    const pb = this.player.hitbox()

    // 撿麥穗🌾:碰到就收進籃子,小回補體力(神的供應藉恩慈臨到)
    for (const wch of this.spawner.wheats) {
      if (wch.got) continue
      const s = WHEAT.size
      const wb = { x: wch.x - s / 2, y: GROUND_Y - wch.y - s / 2, w: s, h: s }
      if (aabb(pb, wb)) {
        wch.got = true
        this.grains += 1
        this.stamina = Math.min(STAMINA.max, this.stamina + WHEAT.refill)
        Audio.sfx('treasure')
      }
    }

    // 踢到溫和障礙(石頭/草叢):只小扣體力,不致命
    if (this.player.invuln <= 0) {
      for (const o of this.spawner.obstacles) {
        const ob = { x: o.x - o.w / 2, y: GROUND_Y - o.h, w: o.w, h: o.h }
        if (aabb(pb, ob)) {
          this.stamina -= STAMINA.hazardCost
          this.player.invuln = INVULN
          Audio.sfx('hazard')
          if (this.stamina <= 0) {
            this.stamina = 0
            this._faint()
            return
          }
          break
        }
      }
    }

    // 遇見波阿斯:走到他面前 = 停下、出現對話、故意撥落一大把麥穗(大回補)
    for (const b of this.spawner.boaz) {
      if (b.met) continue
      if (b.x <= PLAYER.x + BOAZ.reach) {
        b.met = true
        this._meetBoaz()
        return // 進入對話,本步到此為止
      }
    }

    // 抵達日暮 = 過關
    if (this.distance >= this.goalDistance) {
      this.distance = this.goalDistance
      this.win()
    }
  }

  // 遇見波阿斯:停下進對話狀態,顯示他的話(輪流),故意撥落一大把麥穗、大回補體力(得 2:8-16)。
  _meetBoaz() {
    this.boazMet += 1
    const lines = CONTENT.boazLines
    this.dialogue = lines[this._boazLineIdx % lines.length]
    this._boazLineIdx += 1
    this.stamina = Math.min(STAMINA.max, this.stamina + BOAZ.refill)
    this.grains += BOAZ.bundle
    this.state = 'dialogue'
    this.acc = 0
    Audio.sfx('boost') // 領受恩典:溫暖的上行音
  }

  _endDialogue() {
    this.dialogue = null
    this.state = 'playing'
    this.acc = 0
  }

  // 終點(日暮)從畫面右側滑入(終點前 1000px 開始);回傳 x;尚未出現則 null
  goalPos(dist) {
    const startAt = this.goalDistance - 1000
    if (dist < startAt) return null
    const t = Math.min(1, (dist - startAt) / 1000)
    const fromX = VIEW.W + 180
    const toX = PLAYER.x + 230
    return fromX + (toX - fromX) * t
  }

  // 體力歸零:溫柔的停頓(不是失敗)。路得歇一會兒,神顧念寄居的,再起來繼續拾。
  _faint() {
    this.state = 'faint'
    this.faintT = 0
    this.player.fainted = true
    this.player.vy = 0
    this.player.y = GROUND_Y
    Audio.sfx('faint')
  }

  _revive() {
    this.stamina = STAMINA.faintRefill
    this.player.fainted = false
    this.player.invuln = 0.6
    this.acc = 0
    this.state = 'playing'
  }

  _startPlay() {
    this.state = 'playing'
    this.acc = 0
    Audio.unlock()
    Audio.startMusic()
  }

  toggleMute() {
    Audio.unlock()
    Audio.toggleMute()
  }

  pause() {
    if (this.state !== 'playing') return
    this.state = 'paused'
    Audio.pauseAll()
  }

  resume() {
    if (this.state !== 'paused') return
    this.state = 'playing'
    this.acc = 0
    Audio.resumeAll()
  }

  win() {
    if (this.state === 'win') return
    this.state = 'win'
    Audio.stopMusic()
    Audio.sfx('win')
  }

  // 結束(過關):回報給外層(只回一次)。
  _finish(won) {
    if (this._done) return
    this._done = true
    this.stopped = true
    this.onComplete({ won, score: won ? this.winPoints : 0, level: 'gleaning' })
  }

  // React 卸載時呼叫:停迴圈、移除監聽、停音樂。
  destroy() {
    this.stopped = true
    if (this._onResize) window.removeEventListener('resize', this._onResize)
    if (this.input && this.input.detach) this.input.detach()
    Audio.stopMusic()
    Audio.pauseAll()
  }
}

// 軸對齊矩形碰撞
function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

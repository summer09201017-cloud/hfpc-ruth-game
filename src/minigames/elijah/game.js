// 「盼望 · 以利亞重得力」動作關主迴圈 + 狀態機。
// 嵌入契約與 sling/jonah 相同:new Game(canvas, { embed, winPoints, onComplete })、boot()、destroy()。
// 狀態:intro(看開場經文) → playing(前進、躲障礙) → dialogue(遇到天使、出現對話、領受餅水)
//        → win(到何烈山) / faint(體力歸零→癱坐→自動再起,不失敗)。
import { VIEW, GROUND_Y, PLAYER, RUN, STAMINA, FAINT, BOOST, ANGEL } from './config.js'
import { CONTENT } from './content.js'
import { Player } from './player.js'
import { Spawner } from './spawner.js'
import { Renderer } from './renderer.js'
import { Input } from './input.js'
import { Audio } from './audio.js'

const STEP = 1 / 60 // 固定時間步長,讓物理在任何更新率下都一致
const INVULN = 1.0 // 碰到熱浪/塵霧後的無敵秒數

export class Game {
  // opts(嵌入 / 單機預覽共用):
  //   embed      —— true 時(保羅彈窗 / Demo)結束走 onComplete。
  //   winPoints  —— 過關回報的分數(嵌入由外層換算福音點數)。
  //   onComplete({ won, score, level:'elijah' }) —— 結束時呼叫(只呼一次)。
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
    this.angelsMet = 0 // 遇見天使的次數(HUD 顯示)
    this.dialogue = null // 進行中的天使對話 { say, ref }(null=沒有)
    this._angelLineIdx = 0 // 輪流出現天使的話
    this.boostLeft = 0
    this.faintT = 0
  }

  _loop(t) {
    if (this.stopped) return
    if (!this.last) this.last = t
    let dt = (t - this.last) / 1000
    this.last = t
    if (dt > 0.1) dt = 0.1

    // 靜音切換(任何狀態)
    if (this.input.consumeMute()) this.toggleMute()
    // 暫停切換(只在遊戲中 / 暫停中)
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
      // 遇到天使:停下看對話(天使的話+經文),點畫面繼續前行
      if (this._fire()) this._endDialogue()
    } else if (this.state === 'win') {
      if (this._fire()) this._finish(true)
    } else if (this.state === 'faint') {
      // 癱坐片刻(神再扶他起來,王上 19:7);輕點可提早起來
      this.faintT += dt
      const skip = this._fire()
      if (skip || this.faintT >= FAINT.duration) this._revive()
    } else {
      // paused:清掉覆蓋期間的點擊,避免誤觸
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

    // 衝刺(撿到炭火燒的餅🥖):剩餘時間遞減,進行中速度乘上倍率
    if (this.boostLeft > 0) this.boostLeft = Math.max(0, this.boostLeft - dt)
    const boostMult = this.boostLeft > 0 ? BOOST.mult : 1

    // 世界速度(隨距離緩慢加速;以利亞疲乏,整體比約拿慢)
    const k = Math.min(1, this.distance / RUN.rampDistance)
    this.speed = (RUN.startSpeed + (RUN.maxSpeed - RUN.startSpeed) * k) * boostMult

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

    this.spawner.update(dt, this.speed, this.distance, this.goalDistance)

    // 撞到溫和障礙(熱浪/塵霧/石頭):只小扣體力,不致命
    if (this.player.invuln <= 0) {
      const pb = this.player.hitbox()
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

    // 遇到天使:天使走到以利亞面前 = 停下、出現對話、領受餅水恢復體力
    for (const a of this.spawner.angels) {
      if (a.met) continue
      if (a.x <= PLAYER.x + ANGEL.reach) {
        a.met = true
        this._meetAngel()
        return // 進入對話,本步到此為止
      }
    }

    // 抵達何烈山 = 過關
    if (this.distance >= this.goalDistance) {
      this.distance = this.goalDistance
      this.win()
    }
  }

  // 遇到天使:停下進對話狀態,顯示天使的話(輪流),並供應餅水恢復體力(王上 19:5–7)。
  _meetAngel() {
    this.angelsMet += 1
    const lines = CONTENT.angelLines
    this.dialogue = lines[this._angelLineIdx % lines.length]
    this._angelLineIdx += 1
    this.stamina = Math.min(STAMINA.max, this.stamina + ANGEL.refill)
    this.state = 'dialogue'
    this.acc = 0
    Audio.sfx('boost') // 領受餅水:溫暖的上行音
  }

  _endDialogue() {
    this.dialogue = null
    this.state = 'playing'
    this.acc = 0
  }

  // 終點何烈山從畫面右側滑入(終點前 1000px 開始);回傳 x;尚未出現則 null
  goalPos(dist) {
    const startAt = this.goalDistance - 1000
    if (dist < startAt) return null
    const t = Math.min(1, (dist - startAt) / 1000)
    const fromX = VIEW.W + 180
    const toX = PLAYER.x + 230
    return fromX + (toX - fromX) * t
  }

  // 體力歸零:溫柔的停頓(不是失敗)。以利亞癱坐,神再扶他起來。
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
    this.onComplete({ won, score: won ? this.winPoints : 0, level: 'elijah' })
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

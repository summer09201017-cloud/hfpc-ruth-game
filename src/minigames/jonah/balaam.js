import { BALAAM } from './config.js'
import { Audio } from './audio.js'

// 戰爭闖關原型 #4「反轉奇兵 · 巴蘭的驢」(民 22:21–35)——整關場景,自成一格(level === 10)。
// 閃避關:用 ↑/↓(或指標)上下移動「驢」,避開站在路上「拔刀的使者」(巴蘭看不見,只有驢看見)。
//
//   progress 0..1:沒撞到使者時前進;撞到 → 驢停步、巴蘭鞭打、progress 暫停並略退。
//   走到底(progress=1)= 使者向巴蘭顯現、驢開口、巴蘭眼開(得勝);時限內走不到 = 失敗。
//   撞到不會死(寬容)——劇情裡是驢救了巴蘭的命。
//
//   反向 RPG 鉤子:看得見的反而是驢;眼睛被遮的是「聰明的先知」(民 22:31)。
export class Balaam {
  constructor(game) {
    this.game = game
    this.reset()
  }

  reset() {
    this.time = 0
    this.progress = 0
    this.donkeyY = 0.5 // 0..1 在道路內的縱向位置(0.5=中)
    this.angels = [] // { x:0..1(由右往左), y:0..1, sp, spent }
    this.spawnTimer = 1.0
    this.balking = false // 此刻是否被使者擋住(停步)
    this.bumpFlash = 0 // 撞擊閃光 / 鞭打 0..1
    this.bumpCool = 0
    this.bumps = 0 // 被鞭打次數(劇情味)
    this.maxLives = BALAAM.lives ?? 3
    this.lives = this.maxLives // 命數(config.BALAAM.lives):每被使者擋住、巴蘭鞭打驢一次扣 1;扣完 = 闖了禍(失敗)
    this.donkeyTremble = 0
    this.holdT = 0 // 指標連續按住的秒數(用於「長按加速」判定)
    this.done = false
  }

  // 給 renderer/UI:此刻是否該提醒玩家避開
  suggestMove() {
    return this.balking
  }

  // 此刻是否「加速前進」(2026-06-15 應牧者):→ / D 鍵,或長按(指標按住 > 0.35s)。
  //   上下鍵/指標 Y 仍用來閃避,互不干擾;加速只讓 progress 走更快(早點走到使者顯現)。
  _accelerating() {
    return this.game.input.right || this.holdT > 0.35
  }

  step(dt) {
    if (this.done) return
    this.time += dt
    const C = BALAAM
    const inp = this.game.input

    // ---- 驢上下移動(↑/↓ held;指標則朝指到的高度移動)----
    let dy = 0
    if (inp.up) dy -= 1
    if (inp.down) dy += 1
    this.donkeyY += dy * C.donkeySpeed * dt
    if (inp.pointerDown && inp.viewH > 0) {
      const py = Math.max(0, Math.min(1, inp.pointerY / inp.viewH))
      this.donkeyY += (py - this.donkeyY) * Math.min(1, dt * 6)
      this.holdT += dt // 持續按住 → 累積長按時間(達門檻即加速)
    } else {
      this.holdT = 0
    }
    this.donkeyY = Math.max(C.roadTop, Math.min(C.roadBot, this.donkeyY))

    // ---- 生成使者(從右邊進場,落在某條路上)----
    this.spawnTimer -= dt
    if (this.spawnTimer <= 0) {
      const interval = Math.max(0.5, C.spawnInterval - C.spawnRampPerSec * this.time) // 下限 0.7→0.5(2026-06-14:配合數量加倍)
      this.spawnTimer = interval * (0.7 + Math.random() * 0.6)
      const y = C.roadTop + Math.random() * (C.roadBot - C.roadTop)
      const sp = C.angelSpeedMin + Math.random() * (C.angelSpeedMax - C.angelSpeedMin)
      this.angels.push({ x: 1.08, y, sp, spent: false })
    }

    // ---- 移動使者 + 撞擊判定 ----
    this.bumpCool = Math.max(0, this.bumpCool - dt)
    this.balking = false
    for (const a of this.angels) {
      a.x -= a.sp * dt
      if (Math.abs(a.x - C.donkeyX) < C.hitBandX && Math.abs(a.y - this.donkeyY) < C.hitBandY) {
        this.balking = true
        if (this.bumpCool <= 0 && !a.spent) {
          a.spent = true
          this.bumpCool = C.bumpCooldown
          this.bumps++
          this.bumpFlash = 1
          this.lives -= 1 // 扣一條命:閃避失敗 = 巴蘭又打了驢一下
          Audio.sfx('hit') // 巴蘭鞭打驢的悶響
          if (this.lives <= 0) {
            this.done = true
            this.game.gameOver() // 三次都不聽攔阻 → 闖了禍(失敗)
            return
          }
        }
      }
    }
    this.angels = this.angels.filter((a) => a.x > -0.12)
    this.bumpFlash = Math.max(0, this.bumpFlash - dt * 2.5)
    this.donkeyTremble = this.balking
      ? Math.min(1, this.donkeyTremble + dt * 4)
      : Math.max(0, this.donkeyTremble - dt * 3)

    // ---- 前進(沒撞才前進;撞到暫停並略退;按住 →/D 或長按 = 加速)----
    if (this.balking) {
      this.progress = Math.max(0, this.progress - C.backOnBump * dt)
    } else {
      const spd = C.advanceSpeed * (this._accelerating() ? (C.sprintMult || 1) : 1)
      this.progress = Math.min(1, this.progress + spd * dt)
    }

    // ---- 結束判定 ----
    if (this.progress >= 1) {
      this.done = true
      this.game.win()
    } else if (this.time >= C.duration) {
      this.done = true
      this.game.gameOver()
    }
  }
}

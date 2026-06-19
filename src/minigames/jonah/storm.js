import { STORM } from './config.js'
import { Audio } from './audio.js'

// 第二關「暴風雨」場景:平衡穩船 + 結尾「拋約拿入海」。
// 船像一根倒立的平衡桿——越傾越想倒(tip),加上隨機強陣風,
// 玩家用 ←/→(或畫面左右兩側)施力把船扶正。「翻船值」累積到 1 就失敗。
// 撐過 STORM.duration 秒後**不是直接過關**:進入 cast 階段——風浪仍在,
// 要照約拿的話「將我拋在海中」(拿 1:12):輕點/按跳鍵把約拿拋進海裡,
// 海浪平息(1:15)才過關。完全自成一格,不動到第一關的跑酷邏輯。

export class Storm {
  constructor(game) {
    this.game = game
    this.reset()
  }

  reset() {
    this.tilt = 0 // 船的傾角(弧度,正=向右傾)
    this.tiltVel = 0 // 角速度
    this.capsize = 0 // 翻船值 0..1
    this.survival = 0 // 已撐過的秒數
    this.time = 0 // 場景總時間(用於波浪/動畫)
    this.wind = 0 // 目前風力(對船的角加速度)
    this.windTarget = 0 // 風的目標值(陣風之間平滑變化)
    this.windTimer = 0.6 // 下次換陣風的倒數
    this.flash = 0 // 閃電亮度 0..1
    this.flashTimer = 2.5 // 下次閃電倒數
    this.phase = 'ride' // ride(穩船) / cast(等玩家拋約拿入海) / thrown(拋出→海平息)
    this.thrownT = 0 // thrown 階段經過秒數(renderer 畫約拿拋物線/海平息用)
    this.done = false // 已結束(避免重複觸發 win/lose)
  }

  // 玩家輸入方向:-1=向左施力,+1=向右施力,0=無
  _inputDir() {
    const inp = this.game.input
    let dir = 0
    if (inp.left) dir -= 1
    if (inp.right) dir += 1
    if (dir === 0 && inp.pointerDown) {
      dir = inp.pointerX < inp.viewW * 0.5 ? -1 : 1
    }
    return dir
  }

  // 建議玩家現在該往哪邊施力來扶正:-1=按左/點左半,+1=按右/點右半,0=已大致平穩。
  // 供 UI 畫方向提示;與 step() 的施力極性一致(同樣讀 STORM.invertControl)。
  suggestDir() {
    if (Math.abs(this.tilt) < 0.05) return 0
    const polarity = STORM.invertControl ? -1 : 1
    return -Math.sign(this.tilt) * polarity
  }

  step(dt) {
    if (this.done) return
    this.time += dt

    // ---- thrown:約拿被拋出去、海漸漸平息,動畫播完 = 過關 ----
    if (this.phase === 'thrown') {
      this.thrownT += dt
      this.tilt *= Math.max(0, 1 - dt * 2.2) // 船身回正
      this.tiltVel = 0
      this.flash = Math.max(0, this.flash - dt * 2.2)
      if (this.thrownT >= STORM.castTossTime) {
        this.done = true
        this.game.win()
      }
      return
    }

    // ---- cast:撐過了風暴時間,但「海的狂浪越發翻騰」(1:11)——
    //      要照約拿的話把他拋進海裡,海才會平靜。等玩家輕點/按跳鍵。----
    if (this.phase === 'cast') {
      const inp = this.game.input
      if (inp.consumeJump() || inp.consumeTap() || inp.consumePress()) {
        this.phase = 'thrown'
        this.thrownT = 0
        Audio.sfx('jump') // 拋出去的瞬間
        return
      }
      // 風浪繼續搖(但這是教學時刻,不再累積翻船值、也不需要操作)
      this.windTimer -= dt
      if (this.windTimer <= 0) {
        this.windTimer = 0.7 + Math.random() * 1.4
        this.windTarget = (Math.random() < 0.5 ? -1 : 1) * STORM.windBase * 0.8
      }
      this.wind += (this.windTarget - this.wind) * Math.min(1, dt * 3)
      const tip = Math.sin(this.tilt) * STORM.tip
      const damp = -this.tiltVel * STORM.damp
      this.tiltVel += (tip * 0.4 + this.wind + damp) * dt
      this.tilt += this.tiltVel * dt
      this.tilt = Math.max(-STORM.safeTilt, Math.min(STORM.safeTilt, this.tilt))
      this.capsize = Math.max(0, this.capsize - dt) // 危險條歸零
      this.flash = Math.max(0, this.flash - dt * 2.2)
      this.flashTimer -= dt
      if (this.flashTimer <= 0) {
        this.flashTimer = 2 + Math.random() * 3
        this.flash = 1
        Audio.sfx('thunder')
      }
      return
    }

    this.survival += dt
    const prog = Math.min(1, this.survival / STORM.duration)

    // ---- 陣風:每隔一段時間換方向/強度,強度隨進度增加 ----
    this.windTimer -= dt
    if (this.windTimer <= 0) {
      this.windTimer = 0.7 + Math.random() * 1.4
      const strength = STORM.windBase + STORM.windGrow * prog
      this.windTarget = (Math.random() < 0.5 ? -1 : 1) * strength * (0.5 + Math.random() * 0.6)
    }
    // 風力平滑趨近目標
    this.wind += (this.windTarget - this.wind) * Math.min(1, dt * 3)

    // ---- 平衡物理 ----
    const dir = this._inputDir()
    const tip = Math.sin(this.tilt) * STORM.tip // 失穩力(越傾越倒)
    // 玩家回正力:預設「按哪個方向就把船往那邊推」——船向右倒(tilt>0)按 ← 扶正,最直覺。
    // 方向可在 config 用 STORM.invertControl 整個對調。
    const polarity = STORM.invertControl ? -1 : 1
    const player = polarity * dir * STORM.push
    const damp = -this.tiltVel * STORM.damp
    const accel = tip + this.wind + player + damp
    this.tiltVel += accel * dt
    this.tilt += this.tiltVel * dt

    // 撞到最大角就卡住(代表快翻了),別讓它轉過頭
    if (this.tilt > STORM.maxTilt) {
      this.tilt = STORM.maxTilt
      if (this.tiltVel > 0) this.tiltVel = 0
    } else if (this.tilt < -STORM.maxTilt) {
      this.tilt = -STORM.maxTilt
      if (this.tiltVel < 0) this.tiltVel = 0
    }

    // ---- 翻船值 ----
    const a = Math.abs(this.tilt)
    if (a > STORM.safeTilt) {
      const over = (a - STORM.safeTilt) / (STORM.maxTilt - STORM.safeTilt)
      this.capsize = Math.min(1, this.capsize + over * STORM.capsizeRate * dt)
    } else {
      this.capsize = Math.max(0, this.capsize - STORM.recoverRate * dt)
    }

    // ---- 閃電 + 雷聲 ----
    this.flash = Math.max(0, this.flash - dt * 2.2)
    this.flashTimer -= dt
    if (this.flashTimer <= 0) {
      this.flashTimer = 2 + Math.random() * 3
      this.flash = 1
      Audio.sfx('thunder')
    }

    // ---- 結束判定 ----
    if (this.capsize >= 1) {
      this.done = true
      this.game.gameOver()
    } else if (this.survival >= STORM.duration) {
      // 嵌入到「非約拿」旅程(保羅的海路闖關站,opts.stormCast=false):撐過風暴即直接過關——
      // 「拋約拿入海」只屬於約拿的故事(約拿之旅與單機版維持 cast 結尾)。
      if (this.game.stormCast === false) {
        this.done = true
        this.game.win()
        return
      }
      // 撐過風暴 ≠ 過關:進入「拋約拿入海」結尾(拿 1:12–15)
      this.phase = 'cast'
      this.capsize = 0
      this.game.input.consumeJump() // 清掉殘留的按鍵,避免一進 cast 就誤觸拋出
      this.game.input.consumeTap()
      this.game.input.consumePress()
    }
  }
}

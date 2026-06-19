import { JEHOSHAPHAT } from './config.js'
import { Audio } from './audio.js'

// 戰爭闖關原型 #3「聖歌奇兵 · 約沙法唱詩得勝」(代下 20)——整關場景,自成一格(level === 9)。
// 比照摩西舉手(moses.js)的「撐住一個會下滑的值」心法,只是把「舉手」換成「持續讚美」:
//
//   praise 讚美值 0..1:按住(畫面/方向鍵/空白)= 讚美(回充);放開 = 自然下滑
//     (後段、敵軍自亂條越滿,下滑越快 lateDrainMult——最後最吃緊)。
//   讚美夠高(>= advanceThreshold)→ 詩班走在軍前往望樓「前進」(advance)、
//     敵軍自亂條(ambush)累積;讚美斷掉 → 自亂條略退、恐懼(fear)上升。
//   fear >= 1 → 隊伍潰散(失敗);ambush >= 1 → 望樓看見三國聯軍自相殘殺、全數倒下(得勝)。
//
//   反向 RPG 鉤子:這一關「沒有攻擊鍵」——你的兵器只有讚美。
//     「不要爭戰,只管站穩,看耶和華施行拯救」(代下 20:17)。
//
// 操作:按住畫面任意處 / 方向鍵 / 空白鍵 = 帶領詩班讚美。就這一個動作。
export class Jehoshaphat {
  constructor(game) {
    this.game = game
    this.reset()
  }

  reset() {
    this.time = 0
    this.praise = JEHOSHAPHAT.startPraise // 讚美值 0..1
    this.advance = 0 // 詩班走向望樓的距離 0..1
    this.ambush = 0 // 敵軍自亂條 0..1(=1 得勝)
    this.fear = JEHOSHAPHAT.startFear // 恐懼值 0..1(=1 潰散失敗)
    this.twingeTimer = 2.0 // 下次「會眾騷動/敵軍逼近」倒數
    this.twinge = 0 // 目前陣痛(瞬間額外壓低讚美)
    this.ambushFlash = 0 // 敵營自亂的火花閃光 0..1
    this.flashTimer = 1.4
    this.calm = 0 // 「不要爭戰只管站穩」提示的顯示強度(平滑)
    this.lives = 3 // 3 條命:恐懼一旦滿(詩班一度動搖)扣 1,扣完 = 真的潰散(失敗)
    this.lifeFlash = 0 // 失去一條命的紅閃 0..1
    this.phase = 'march'
    this.done = false
  }

  // 玩家此刻是否在「帶領讚美」:按住畫面 / 任意方向鍵 / 空白(up)都算。
  _intent() {
    const inp = this.game.input
    return inp.pointerDown || inp.left || inp.right || inp.down || inp.up
  }

  // 給 renderer/UI:讚美快斷了(提示玩家「繼續讚美」)
  suggestPraise() {
    return this.praise < JEHOSHAPHAT.advanceThreshold
  }

  step(dt) {
    if (this.done) return
    this.time += dt
    const C = JEHOSHAPHAT
    const praising = this._intent()

    // ---- 隨機「會眾騷動 / 敵軍逼近」陣痛:瞬間壓低讚美,要穩住(像摩西的手一沉)----
    this.twingeTimer -= dt
    if (this.twingeTimer <= 0) {
      this.twingeTimer = C.twingeInterval * (0.7 + Math.random() * 0.8)
      this.twinge = C.twingeDrop * (0.5 + Math.random() * 0.7)
    }
    this.twinge = Math.max(0, this.twinge - dt * C.twingeFade)

    // ---- 讚美值:按住回充;否則下滑(後段 ambush 高→下滑加乘)+ 陣痛額外扣 ----
    const lateMul = 1 + (C.lateDrainMult - 1) * this.ambush
    const drain = C.praiseDrain * lateMul + this.twinge
    this.praise += (praising ? C.praiseGain : 0) * dt - drain * dt
    this.praise = Math.max(0, Math.min(1, this.praise))

    const singing = this.praise >= C.advanceThreshold

    // ---- 詩班前進 + 敵軍自亂條(只在「持續讚美」時累積)----
    if (singing) {
      this.advance = Math.min(1, this.advance + C.advanceSpeed * dt)
      this.ambush = Math.min(1, this.ambush + C.ambushGrowth * dt)
    } else {
      this.ambush = Math.max(0, this.ambush - C.ambushDecay * dt) // 讚美斷:敵軍稍稍回穩
    }

    // ---- 恐懼:讚美低於恐懼線→上升;否則回落 ----
    if (this.praise < C.fearThreshold) {
      this.fear = Math.min(1, this.fear + C.fearGrow * dt)
    } else {
      this.fear = Math.max(0, this.fear - C.fearRecover * dt)
    }

    // ---- 「不要爭戰,只管站穩」提示:讚美不足時亮起(平滑) ----
    const wantCalm = singing ? 0 : 1
    this.calm += (wantCalm - this.calm) * Math.min(1, dt * 4)
    this.lifeFlash = Math.max(0, this.lifeFlash - dt * 2)

    // ---- 敵營自亂的火花(ambush 越滿越頻繁、越亮)----
    this.ambushFlash = Math.max(0, this.ambushFlash - dt * 2.2)
    this.flashTimer -= dt
    if (this.flashTimer <= 0) {
      this.flashTimer = Math.max(0.2, (1.5 - this.ambush) * (0.45 + Math.random() * 0.7))
      this.ambushFlash = 0.5 + this.ambush * 0.5
      if (this.ambush > 0.15) Audio.sfx('hit') // 谷中三軍自相擊殺的悶響(零音檔合成)
    }

    // ---- 結束判定 ----
    if (this.fear >= 1) {
      // 恐懼滿:詩班一度動搖,扣一條命。扣完才真的潰散(失敗)——不讚美就會一條條失去 = 真的會輸。
      this.lives -= 1
      this.lifeFlash = 1
      Audio.sfx('hit')
      if (this.lives <= 0) {
        this.done = true
        this.game.gameOver()
      } else {
        // 重整旗鼓:恐懼回半、讚美回起始,給孩子再試的機會(但敵軍自亂略退,別太好賺)
        this.fear = 0.45
        this.praise = JEHOSHAPHAT.startPraise
        this.ambush = Math.max(0, this.ambush - 0.15)
      }
    } else if (this.ambush >= 1) {
      this.done = true
      this.game.win()
    }
  }
}

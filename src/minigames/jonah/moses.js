import { MOSES } from './config.js'
import { Audio } from './audio.js'

// 戰爭闖關原型 #1「摩西舉手之戰」(出 17:8–13)——整關場景,自成一格。
// 設計同第二關暴風雨(storm.js):平衡式 loop,只是把「船的傾角」換成「摩西手的下垂」。
//
//   armDrop 0..1:0=雙手高舉(以色列得勝),1=完全垂下(亞瑪力得勢)。
//   疲勞像重力把手往下拉(越打越沉,gravityGrow);玩家「出力舉手」把手舉回(push)。
//   但「單靠自己撐不到日落」是刻意的——後段疲勞會超過 push,要呼求亞倫、戶珥扶手
//   (supportPush 很強,但「可用度」support 會耗盡、需放開回充)。這就是這關的依靠值鉤子。
//   手垂太低(armDrop>safeDrop)→ defeat 上升;升到 1 = 失敗。撐到 duration(日落)= 過關。
//
// 操作(2026-06-13 簡化):
//   按住畫面任意處 / 任意方向鍵 = 出力舉手。
//   亞倫、戶珥在手垂下時「自動」上來扶(可用度有限、會回充),不必玩家自己呼求。
export class Moses {
  constructor(game) {
    this.game = game
    this.reset()
  }

  reset() {
    this.time = 0 // 場景總時間(動畫用)
    this.survival = 0 // 已撐過的秒數(→ 日落)
    this.armDrop = 0.15 // 手的下垂 0..1(開場雙手大致舉著)
    this.dropVel = 0 // 下垂的角速度
    this.defeat = 0.12 // 谷中戰況 0(以色列勝)..1(亞瑪力勝=失敗)
    this.fatigue = 0 // 目前的疲勞抽痛(隨機陣痛,平滑趨近 target)
    this.fatigueTarget = 0
    this.twingeTimer = 0.6 // 下次抽痛倒數
    this.support = 1 // 亞倫、戶珥的「可用度」1..0
    this.supporting = false // 此刻是否正在被扶手
    this.flash = 0 // 谷中刀劍交擊的閃光 0..1
    this.flashTimer = 1.8
    this.phase = 'battle' // battle(主玩法) / done
    this.done = false
  }

  // 玩家此刻是否在「出力舉手」:按住畫面任意處 / 任意方向鍵都算(不再分左右兩區)。
  _intent() {
    const inp = this.game.input
    const raise = inp.pointerDown || inp.left || inp.right || inp.down
    return { raise }
  }

  // 給 UI:手快垂下時提示玩家「用力舉手」(此時亞倫戶珥多半也已自動上來扶)
  suggestHelp() {
    return this.armDrop > 0.55
  }

  step(dt) {
    if (this.done) return
    this.time += dt
    this.survival += dt
    const prog = Math.min(1, this.survival / MOSES.duration)

    const { raise } = this._intent()

    // ---- 亞倫、戶珥「自動」扶手:手垂過 supportTriggerDrop 且還有可用度就上來扶;
    //      扶手時消耗可用度,沒在扶時回充(耗盡後要回充到 supportMinToStart 才能再扶,避免閃爍)。----
    const drooping = this.armDrop > MOSES.supportTriggerDrop
    const canStart = this.supporting || this.support >= MOSES.supportMinToStart
    if (drooping && this.support > 0 && canStart) {
      this.supporting = true
      this.support = Math.max(0, this.support - dt / MOSES.supportDrainTime)
    } else {
      this.supporting = false
      this.support = Math.min(1, this.support + dt / MOSES.supportRechargeTime)
    }

    // ---- 隨機「手一沉」的抽痛(像暴風雨的陣風,隨時間增強)----
    this.twingeTimer -= dt
    if (this.twingeTimer <= 0) {
      this.twingeTimer = 0.7 + Math.random() * 1.3
      const amp = MOSES.twingeBase + MOSES.twingeGrow * prog
      this.fatigueTarget = amp * (0.4 + Math.random() * 0.7)
    }
    this.fatigue += (this.fatigueTarget - this.fatigue) * Math.min(1, dt * 3)

    // ---- 手臂物理(armDrop 往 1 = 垂下;往 0 = 舉起)----
    const gravity = MOSES.gravityBase + MOSES.gravityGrow * prog + this.fatigue // 把手往下拉
    const lift = (raise ? MOSES.push : 0) + (this.supporting ? MOSES.supportPush : 0) // 往上舉
    const damp = -this.dropVel * MOSES.damp
    const accel = gravity - lift + damp
    this.dropVel += accel * dt
    this.armDrop += this.dropVel * dt
    // 撞到上下界就卡住(別讓它衝出 0..1)
    if (this.armDrop > 1) {
      this.armDrop = 1
      if (this.dropVel > 0) this.dropVel = 0
    } else if (this.armDrop < 0) {
      this.armDrop = 0
      if (this.dropVel < 0) this.dropVel = 0
    }

    // ---- 戰況 defeat:手垂太低時亞瑪力得勢、上升;舉得夠高時回落 ----
    if (this.armDrop > MOSES.safeDrop) {
      const over = (this.armDrop - MOSES.safeDrop) / (1 - MOSES.safeDrop)
      this.defeat = Math.min(1, this.defeat + over * MOSES.defeatRise * dt)
    } else {
      this.defeat = Math.max(0, this.defeat - MOSES.defeatRecover * dt)
    }

    // ---- 谷中交擊的閃光(像 storm 的閃電,只是換成戰場火花)----
    this.flash = Math.max(0, this.flash - dt * 2.4)
    this.flashTimer -= dt
    if (this.flashTimer <= 0) {
      this.flashTimer = 0.5 + Math.random() * 1.4
      this.flash = 0.6 + Math.random() * 0.4
      Audio.sfx('hit') // 遠方刀劍交擊的悶響(零音檔合成,已有)
    }

    // ---- 結束判定 ----
    if (this.defeat >= 1) {
      this.done = true
      this.game.gameOver()
    } else if (this.survival >= MOSES.duration) {
      this.done = true
      this.game.win()
    }
  }
}

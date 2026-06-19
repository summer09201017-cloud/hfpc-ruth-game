import { VIEW, GROUND_Y, RUN, WALK, PLAYER, LIVES, INVULN_TIME, FARE, FISH, NINEVEH, PREACH, GOURD, BOOST, SPRINT } from './config.js'
import { Player } from './player.js'
import { Spawner } from './spawner.js'
import { Renderer } from './renderer.js'
import { Input } from './input.js'
import { Audio } from './audio.js'
import { Storm } from './storm.js'
import { Moses } from './moses.js'
import { Jehoshaphat } from './jehoshaphat.js'
import { Balaam } from './balaam.js'
import { RedSea } from './redsea.js'
import { LEVEL1, LEVEL2, LEVEL3, LEVEL4, LEVEL5, LEVEL6, MOSES, JEHOSHAPHAT, BALAAM, REDSEA } from './scripture.js'
import { QUESTIONS, pickQuestions, quizRemark } from './quiz.js'

const STATE = { TITLE: 'title', PLAYING: 'playing', PAUSED: 'paused', WIN: 'win', LOSE: 'lose', QUIZ: 'quiz', FISH: 'fish', PREACH: 'preach', GOURD: 'gourd' }
const STEP = 1 / 60 // 固定時間步長,讓物理在任何更新率下都一致

export class Game {
  // opts（單機 / 嵌入共用，皆可省略 → 用預設）：
  //   ui         —— 由外部注入。單機 main.js 傳 new UI()；嵌入(保羅大富翁)傳「空殼 NullUI」。
  //   embed      —— true 時跳過標題、直接開指定關卡、結束時回呼 onComplete（給保羅彈窗用）。
  //   level      —— 嵌入要開的關：1=跑酷 / 2=暴風雨 / 4=上岸→尼尼微跑酷（3=大魚肚、5=傳道是 DOM 選單流程，不嵌入）。
  //   mode       —— 'run'(闖關) / 'walk'(漫步)。
  //   hudLabels  —— 進度條兩端文字 { start, goal }；單機=約拿地名，嵌入可傳通用「起點/終點」。
  //   stormCast  —— 第二關結尾「拋約拿入海」橋段開關（預設 true）。嵌入到「非約拿」的旅程
  //                 （保羅的海路闖關站）時傳 false：撐過風暴即直接過關——丟約拿只屬於約拿的故事。
  //   onComplete({ won, score, level }) —— 嵌入過關 / 失敗時呼叫。
  constructor(canvas, opts = {}) {
    this.canvas = canvas
    this.renderer = new Renderer(canvas)
    this.input = new Input()
    this.ui = opts.ui // 由外部注入（單機 new UI()／嵌入 NullUI）
    this.embed = !!opts.embed
    this.stormCast = opts.stormCast !== false // 拋約拿入海結尾；單機與約拿之旅恆為 true
    this.onComplete = opts.onComplete || null
    // 嵌入支援全六關。注意：3/5/6 的卡片流程走 ui.showFish*/showPreach*/showGourd*——
    // 宿主(保羅)嵌入這幾關時，注入的 ui 必須實作這些卡片方法(EmbedUI)，純 NullUI 會卡在 intro。
    // 嵌入白名單:1–6 約拿六關;7=摩西舉手(出17);8=紅海奔逃(出14);9=聖歌奇兵(代下20);10=反轉奇兵(民22)——皆純 Canvas,NullUI 即可
    this.embedLevel = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].includes(opts.level) ? opts.level : 1
    this.embedMode = opts.mode === 'walk' ? 'walk' : 'run'
    this._hudOverride = opts.hudLabels || null // 外層(保羅)注入的進度條地名；沒注入時各關用自己的預設(LEVELx.hud)
    this.hudLabels = this._hudOverride || { ...LEVEL1.hud }
    this.player = new Player()
    this.spawner = new Spawner()
    this.storm = new Storm(this)
    this.moses = new Moses(this) // 戰爭闖關原型(出 17);level === 7
    this.jehoshaphat = new Jehoshaphat(this) // 戰爭闖關原型(代下 20);level === 9
    this.balaam = new Balaam(this) // 戰爭闖關原型(民 22);level === 10
    this.redsea = new RedSea(this) // 戰爭闖關原型(出 14);level === 8
    this.state = STATE.TITLE
    this.level = 1 // 1=約帕港口(跑酷) / 2=暴風雨(平衡) / 3=大魚肚(默想) / 4=上岸→尼尼微(跑酷)
    this.mode = 'run' // 'run'=闖關(自動跑) / 'walk'=漫步(自由走、無壓力)
    this.quiz = null // 進行中的聖經問答(null=沒有);{list,pos,correct,returnTo,single}
    this.fish = null // 第三關大魚肚的禱告進度;{stations,idx,lit,total,lastCorrect}
    this.preach = null // 第五關尼尼微傳道的進度;{stations,idx,repented,total,dist,phase}
    this.gourd = null // 第六關蓖麻樹的進度;{stations,idx,done,total,t,phase}
    this.last = 0
    this.acc = 0
    this.stopped = false // 嵌入卸載時設 true，停止 requestAnimationFrame 迴圈
    this._done = false // 嵌入結束回呼只觸發一次
    this._resetRun()
  }

  boot() {
    this.input.attach(this.canvas)
    this.renderer.resize()
    this._onResize = () => this.renderer.resize()
    window.addEventListener('resize', this._onResize)

    if (this.embed) {
      // 嵌入(保羅大富翁)：跳過標題選單，直接開指定關卡。
      // 1/2/4 用空殼 NullUI 即可；3/5/6 的卡片流程需要宿主注入會畫卡片的 EmbedUI。
      Audio.unlock()
      if (this.embedLevel === 2) this.startStorm()
      else if (this.embedLevel === 3) this.startFish()
      else if (this.embedLevel === 4) this.startNineveh(this.embedMode)
      else if (this.embedLevel === 5) this.startPreach()
      else if (this.embedLevel === 6) this.startGourd()
      else if (this.embedLevel === 7) this.startMoses()
      else if (this.embedLevel === 8) this.startRedSea()
      else if (this.embedLevel === 9) this.startJehoshaphat()
      else if (this.embedLevel === 10) this.startBalaam()
      else this.start(this.embedMode)
      requestAnimationFrame((t) => this.loop(t))
      return
    }

    this.ui.onStart((mode) => this.start(mode))
    this.ui.onStorm(() => this.startStorm()) // 標題上直接挑第二關
    this.ui.onNineveh(() => this.startNineveh('run')) // 標題上直接挑第四關(方便試玩/示範)
    this.ui.onRestart(() => this.restartCurrent()) // 重玩目前這一關
    this.ui.onNext(() => this.next()) // 進入下一關
    this.ui.onPause(() => this.pause())
    this.ui.onResume(() => this.resume())
    this.ui.onMute(() => this.toggleMute())
    this.ui.onQuizAction((act, ds) => this.handleQuizAction(act, ds)) // 聖經問答按鈕
    this.ui.onFishAction((act, ds) => this.handleFishAction(act, ds)) // 第三關大魚肚按鈕
    this.ui.onPreachAction((act, ds) => this.handlePreachAction(act, ds)) // 第五關傳道按鈕
    this.ui.onGourdAction((act, ds) => this.handleGourdAction(act, ds)) // 第六關蓖麻樹按鈕
    this.ui.setMuteIcon(Audio.muted)
    this.ui.showTitle(LEVEL1)

    requestAnimationFrame((t) => this.loop(t))
  }

  _resetRun() {
    this.player.reset()
    this.player.lives = LIVES
    this.spawner.reset()
    this.distance = 0
    this.speed = RUN.startSpeed
    this.goalDistance = RUN.goalDistance // 這趟跑酷的終點距離(第四關會改成 NINEVEH.goalDistance)
    this.fareEnabled = true // 第一關要湊船價才能上船;第四關(往尼尼微)走到城門即過關,無船價
    this.coinsCollected = 0
    this.knockbackLeft = 0 // 漫步模式被敵人撞到後,還要往後退的距離
    this.collectingFare = false // 闖關到船邊但船價不足 → 暫時可自由移動回頭收集
    this.shortFare = false // 在船邊但船價不足(HUD 提示用)
    this.boostLeft = 0 // 撿到 ⚡ 後的衝刺剩餘秒數(config.BOOST)
    this.sprintHold = 0 // 按住(螢幕/→)累計秒數;超過 SPRINT.holdDelay = 主動衝刺
    this.sprinting = false // 主動衝刺中(renderer 畫速度線用)
    this.answeredCorrect = new Set() // 這趟已答對的題目索引,不再出給 NPC
  }

  // 手機/平板(觸控)在使用者點擊「開始」時進全螢幕並鎖橫向;桌機不打擾。
  // iOS 不支援網頁全螢幕 API → 由「加入主畫面」(manifest 已設 landscape/standalone)達成。
  _enterImmersive() {
    try {
      if (this.embed) return // 嵌入在保羅彈窗裡：不要全螢幕/鎖方向，否則會接管整頁
      if (!window.matchMedia || !window.matchMedia('(pointer: coarse)').matches) return
      const lockLandscape = () => {
        try {
          if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {})
        } catch {}
      }
      const el = document.documentElement
      if (!document.fullscreenElement && el.requestFullscreen) {
        const p = el.requestFullscreen()
        if (p && p.then) p.then(lockLandscape).catch(() => {})
        else lockLandscape()
      } else {
        lockLandscape()
      }
    } catch {}
  }

  start(mode) {
    this._enterImmersive()
    this.level = 1
    this.mode = mode === 'walk' ? 'walk' : 'run'
    this.spawner.theme = 'harbor' // 港口主題:障礙 📦🛢️…、敵人 🐍🦀🐀
    this._resetRun()
    // 進度條地名:外層(保羅)有注入就用注入的,否則用第一關預設(嵌入契約)
    this.hudLabels = this._hudOverride || { ...LEVEL1.hud }
    this.ui.hide()
    this.state = STATE.PLAYING
    this.ui.showPauseButton()
    Audio.unlock() // 在使用者手勢(按開始)中解鎖音訊
    Audio.startMusic('level')
  }

  // 第四關 上岸→尼尼微:重用第一關跑酷引擎,換主題(曠野→尼尼微大城)、無船價門檻。
  // (單機與嵌入皆可用:嵌入 opts.level=4 直接開這關;無 DOM 選單流程,嵌入安全。)
  startNineveh(mode) {
    this._enterImmersive()
    this.level = 4
    this.mode = mode === 'walk' ? 'walk' : 'run'
    this.spawner.theme = 'desert' // 曠野主題:障礙 🪨🌵…、敵人 🐍🦂(闖關模式也會出)
    this._resetRun()
    this.goalDistance = NINEVEH.goalDistance
    this.fareEnabled = false // 往尼尼微是順服,不是買船票:走到城門即過關
    // 進度條地名:外層(保羅)有注入就用注入的,否則用第四關預設(旱地→尼尼微;嵌入契約)
    this.hudLabels = this._hudOverride || { ...LEVEL4.hud }
    this.ui.hide()
    this.state = STATE.PLAYING
    this.ui.showPauseButton()
    Audio.unlock()
    Audio.startMusic('level')
  }

  startStorm() {
    this._enterImmersive()
    this.level = 2
    this.storm.reset()
    this.ui.hide()
    this.state = STATE.PLAYING
    this.ui.showPauseButton()
    Audio.unlock() // 解鎖音訊(雷聲);暴風雨不放輕快旋律
    Audio.stopMusic()
  }

  // 戰爭闖關原型「摩西舉手之戰」(出 17:8–13):重用暴風雨的平衡引擎(self-contained Moses 場景)。
  // 單機由 ?level=moses 進(試玩/驗證手感);嵌入由 opts.level=7 進。撐到日落=過關,手垂到底=失敗。
  startMoses() {
    this._enterImmersive()
    this.level = 7
    this.moses.reset()
    // 進度條兩端文字走 hudLabels(嵌入契約):外層有注入用注入的,否則用 MOSES 預設(日出→日落)
    this.hudLabels = this._hudOverride || { ...MOSES.hud }
    this.ui.hide()
    this.state = STATE.PLAYING
    this.ui.showPauseButton()
    Audio.unlock() // 解鎖音訊(谷中交擊聲);戰場不放輕快旋律
    Audio.stopMusic()
  }

  // 戰爭闖關原型「聖歌奇兵 · 約沙法唱詩得勝」(代下 20):重用摩西的「撐住」引擎(self-contained 場景)。
  // 單機由 ?level=jehoshaphat 進;嵌入由 opts.level=9 進。敵軍自亂條滿=過關,恐懼滿=失敗。
  startJehoshaphat() {
    this._enterImmersive()
    this.level = 9
    this.jehoshaphat.reset()
    // 進度條兩端文字走 hudLabels(嵌入契約):外層有注入用注入的,否則用 JEHOSHAPHAT 預設(隱基底→望樓)
    this.hudLabels = this._hudOverride || { ...JEHOSHAPHAT.hud }
    this.ui.hide()
    this.state = STATE.PLAYING
    this.ui.showPauseButton()
    Audio.unlock()
    Audio.startMusic('hymn') // 聖歌奇兵要「真的唱聖歌」:放莊嚴讚美詩(代下 20 約沙法唱詩得勝),不像戰場關靜音
  }

  // 戰爭闖關原型「反轉奇兵 · 巴蘭的驢」(民 22):自成一格的閃避場景。
  // 單機由 ?level=balaam 進;嵌入由 opts.level=10 進。走到底=過關,時限內走不到=失敗。
  startBalaam() {
    this._enterImmersive()
    this.level = 10
    this.balaam.reset()
    this.hudLabels = this._hudOverride || { ...BALAAM.hud }
    this.ui.hide()
    this.state = STATE.PLAYING
    this.ui.showPauseButton()
    Audio.unlock()
    Audio.stopMusic()
  }

  // 戰爭闖關原型「紅海奔逃」(出 14:13–28):自成一格的奔逃場景,重用跑酷的跳躍手感。
  // 單機由 ?level=redsea 進;嵌入由 opts.level=8 進。站住等候→過海床→海合攏淹追兵=過關,追兵追上=失敗。
  startRedSea() {
    this._enterImmersive()
    this.level = 8
    this.redsea.reset()
    // 進度條兩端文字走 hudLabels(嵌入契約):外層有注入用注入的,否則用 REDSEA 預設(此岸→對岸)
    this.hudLabels = this._hudOverride || { ...REDSEA.hud }
    this.ui.hide()
    this.state = STATE.PLAYING
    this.ui.showPauseButton()
    Audio.unlock() // 解鎖音訊(分海/海合攏的悶響);奔逃時不放輕快旋律
    Audio.stopMusic()
  }

  // 重玩目前這一關(失敗/暫停→重新開始 用)
  restartCurrent() {
    if (this.level === 10) this.startBalaam()
    else if (this.level === 9) this.startJehoshaphat()
    else if (this.level === 8) this.startRedSea()
    else if (this.level === 7) this.startMoses()
    else if (this.level === 6) this.startGourd()
    else if (this.level === 5) this.startPreach()
    else if (this.level === 4) this.startNineveh(this.mode)
    else if (this.level === 3) this.startFish()
    else if (this.level === 2) this.startStorm()
    else this.start(this.mode)
  }

  // 進入下一關
  next() {
    if (this.level === 10) this.startBalaam() // 戰爭原型:再走一次(不接約拿關鏈)
    else if (this.level === 9) this.startJehoshaphat() // 戰爭原型:再唱一次(不接約拿關鏈)
    else if (this.level === 8) this.startRedSea() // 戰爭原型:再奔逃一次(不接約拿關鏈)
    else if (this.level === 7) this.startMoses() // 戰爭原型:再玩一次(不接約拿關鏈)
    else if (this.level === 1) this.startStorm()
    else if (this.level === 2) this.startFish()
    else if (this.level === 3) this.startNineveh('run') // 大魚肚 → 上岸往尼尼微(跑酷)
    else if (this.level === 4) this.startPreach() // 進了城門 → 尼尼微傳道(對話)
    else if (this.level === 5) this.startGourd() // 全城悔改 → 蓖麻樹(反思結局)
    else if (this.level === 6) this.toTitle() // 全書完 → 回標題
  }

  loop(t) {
    if (this.stopped) return // 嵌入卸載後停止迴圈
    if (!this.last) this.last = t
    let dt = (t - this.last) / 1000
    this.last = t
    if (dt > 0.1) dt = 0.1 // 分頁切回時避免一次跳太多

    // 靜音切換(M 鍵)— 任何狀態都可
    if (this.input.consumeMute()) this.toggleMute()

    // 暫停切換(P / Esc / 暫停鈕)— 只在遊戲中或暫停中有效
    if (this.input.consumePause()) {
      if (this.state === STATE.PLAYING) this.pause()
      else if (this.state === STATE.PAUSED) this.resume()
    }

    if (this.state === STATE.PLAYING) {
      this.acc += dt
      while (this.acc >= STEP) {
        this.step(STEP)
        if (this.state !== STATE.PLAYING) break // 本步若結束遊戲就停止累積
        this.acc -= STEP
      }
    } else {
      // 標題/失敗畫面:按跳鍵也能開始/重玩(過關畫面不處理,等按鈕)
      this.input.consumePress() // 清掉覆蓋畫面期間的點擊,避免一開始就誤觸
      this.input.consumeTap()
      const jumped = this.input.consumeJump()
      if (this.state === STATE.TITLE) {
        if (jumped) this.start('run')
      } else if (this.state === STATE.LOSE) {
        // 失敗後給 ~0.8 秒緩衝:反轉/聖歌奇兵都是「按住方向鍵」在玩,一輸時那顆按住的 ↑
        // 會立刻被當成「重玩」把失敗畫面跳過,玩家根本看不到「要再玩一次嗎?」。緩衝後才接受重玩。
        if (jumped && this._loseAt && t - this._loseAt > 800) this.restartCurrent()
      }
    }

    this.renderer.draw(this)
    requestAnimationFrame((tt) => this.loop(tt))
  }

  step(dt) {
    // 第二關「暴風雨」自成一格,交給 Storm 場景處理
    if (this.level === 2) {
      this.storm.step(dt)
      return
    }

    // 戰爭闖關原型「摩西舉手」(出 17)自成一格,交給 Moses 場景處理
    if (this.level === 7) {
      this.moses.step(dt)
      return
    }
    // 戰爭闖關原型「紅海奔逃」(出 14)自成一格,交給 RedSea 場景處理
    if (this.level === 8) {
      this.redsea.step(dt)
      return
    }
    // 戰爭闖關原型「聖歌奇兵」(代下 20)自成一格,交給 Jehoshaphat 場景處理
    if (this.level === 9) {
      this.jehoshaphat.step(dt)
      return
    }
    // 戰爭闖關原型「反轉奇兵」(民 22)自成一格,交給 Balaam 場景處理
    if (this.level === 10) {
      this.balaam.step(dt)
      return
    }

    // 第三關「大魚肚」的走路段交給 _fishStep(禱告作答時不在 PLAYING,不會進來)
    if (this.level === 3) {
      this._fishStep(dt)
      return
    }

    // 第五關「尼尼微傳道」的走路段交給 _preachStep(對話作答時不在 PLAYING,不會進來)
    if (this.level === 5) {
      this._preachStep(dt)
      return
    }

    // 第六關「蓖麻樹」的場景動畫交給 _gourdStep(反思作答時不在 PLAYING,不會進來)
    if (this.level === 6) {
      this._gourdStep(dt)
      return
    }

    // ---- 輸入 → 跳躍 / 前進後退(依模式)----
    const press = this.input.consumePress()
    const tapped = this.input.consumeTap()
    let wantJump = this.input.consumeJump()

    // 衝刺(撿到 ⚡):剩餘時間遞減;進行中速度乘上倍率
    if (this.boostLeft > 0) this.boostLeft = Math.max(0, this.boostLeft - dt)
    const boostMult = this.boostLeft > 0 ? BOOST.mult : 1

    // 主動衝刺(闖關):手指按住螢幕不放 / 按住 →,超過 holdDelay 秒就持續加速。
    // 輕點(很快放開)仍是跳,不會誤觸;與 ⚡ 同時只取較大倍率,不疊乘。
    const holding = this.input.pointerDown || this.input.right
    this.sprintHold = holding ? (this.sprintHold || 0) + dt : 0
    this.sprinting =
      this.mode === 'run' && !this.collectingFare && this.sprintHold >= SPRINT.holdDelay
    const speedMult = Math.max(boostMult, this.sprinting ? SPRINT.mult : 1)

    if (this.mode === 'run' && !this.collectingFare) {
      // 闖關:點畫面任意處(非暫停區)= 跳;世界自動向前並加速;按住不放=衝刺
      if (press) wantJump = true
      const k = Math.min(1, this.distance / RUN.rampDistance)
      this.speed = (RUN.startSpeed + (RUN.maxSpeed - RUN.startSpeed) * k) * speedMult
    } else {
      // 漫步,或「闖關到船邊船價不足、暫時自由移動回頭收集」
      // 漫步:按住 →/畫面右半 = 前進,←/畫面左半 = 後退,輕點 = 跳;無時間壓力
      if (tapped) wantJump = true
      if (this.knockbackLeft > 0) {
        // 被敵人撞到:強制往後退(無視輸入),退完才恢復控制
        this.speed = -WALK.knockbackSpeed
      } else {
        const half = this.input.viewW * 0.5
        const forward =
          this.input.right || (this.input.pointerDown && this.input.pointerX >= half)
        const backward =
          this.input.left || (this.input.pointerDown && this.input.pointerX < half)
        // 衝刺只加快前進(後退不加速)
        this.speed = forward ? WALK.speed * boostMult : backward ? -WALK.speed : 0
      }
    }

    if (wantJump && this.player.jump()) Audio.sfx('jump')

    // 位移(漫步/回頭收集時擊退用剩餘距離限制,且不可退到起點之前)
    if ((this.mode === 'walk' || this.collectingFare) && this.knockbackLeft > 0) {
      const back = Math.min(this.knockbackLeft, WALK.knockbackSpeed * dt)
      this.distance = Math.max(0, this.distance - back)
      this.knockbackLeft -= back
    } else {
      this.distance += this.speed * dt
      if (this.mode === 'walk' || this.collectingFare) this.distance = Math.max(0, this.distance)
    }

    this.player.update(dt)
    // NPC 長者問答只在第一關(題庫是約拿書 1–2 章);第四關漫步不出長者。
    const npcsOn = this.mode === 'walk' && this.level === 1
    // 敵人:漫步模式都有;第四關曠野連闖關模式也有(🐍🦂,撞到扣命、踩扁加分)
    const enemiesOn = this.mode === 'walk' || this.level === 4
    // 回頭收集船價中(船價不足且可後退):往後走時從左邊補生寶物,不會回頭撲空
    const fareNeed = this.mode === 'walk' ? FARE.walk : FARE.run
    const needFare =
      this.fareEnabled && this.coinsCollected < fareNeed && (this.mode === 'walk' || this.collectingFare)
    this.spawner.update(dt, this.speed, this.distance, this.goalDistance, enemiesOn, npcsOn, needFare)

    // 漫步模式:走近 NPC(碼頭長者)就觸發聖經問答——沒有時間壓力,適合停下來作答。
    // (退後途中 knockbackLeft>0 時不觸發,避免答錯被退回後立刻又被同一位問。)
    if (npcsOn && this.knockbackLeft <= 0) {
      for (const npc of this.spawner.npcs) {
        if (!npc.done && Math.abs(npc.x - PLAYER.x) < 46) {
          this.startNpcQuiz(npc) // 答對(或試 3 次)才會設 done
          return // 進入問答,本步到此為止
        }
      }
    }

    // 撞到障礙(只有闖關模式會扣命;漫步、回頭收集船價時障礙無害,沒有壓力)
    if (this.mode === 'run' && !this.collectingFare && this.player.invuln <= 0) {
      const pb = this.player.hitbox()
      for (const o of this.spawner.obstacles) {
        const ob = { x: o.x - o.w / 2, y: GROUND_Y - o.h, w: o.w, h: o.h }
        if (aabb(pb, ob)) {
          this.player.lives -= 1
          this.player.invuln = INVULN_TIME
          Audio.sfx('hit')
          if (this.player.lives <= 0) {
            this.gameOver()
            return
          }
          break
        }
      }
    }

    // 小敵人:踩頭上=踩扁+加分+彈起;從側面碰到=漫步溫和擋一下(不扣命)、闖關扣命
    const pbe = this.player.hitbox()
    for (const e of this.spawner.enemies) {
      if (e.dead) continue
      const eb = { x: e.x - e.w / 2, y: GROUND_Y - e.h, w: e.w, h: e.h }
      if (!aabb(pbe, eb)) continue
      const stomp = this.player.vy > 0 && this.player.y <= GROUND_Y - e.h + 16
      if (stomp) {
        e.dead = true
        this.player.vy = -460 // 踩一下彈起
        this.coinsCollected += 2
        Audio.sfx('stomp')
      } else if (this.player.invuln <= 0) {
        Audio.sfx('hit')
        if (this.mode === 'run' && !this.collectingFare) {
          this.player.lives -= 1
          this.player.invuln = INVULN_TIME
          if (this.player.lives <= 0) {
            this.gameOver()
            return
          }
        } else {
          // 漫步:被撞往後退 3 步(平滑後退),短暫無敵,不扣命
          this.player.invuln = 0.8
          this.knockbackLeft = WALK.knockback
        }
      }
    }

    // 撿空中寶物
    const pb2 = this.player.hitbox()
    for (const c of this.spawner.treasures) {
      if (!c.taken) {
        const cb = { x: c.x - c.r, y: c.y - c.r, w: c.r * 2, h: c.r * 2 }
        if (aabb(pb2, cb)) {
          c.taken = true
          if (c.kind === 'life') {
            // 愛心:補一條命;已滿血則折算 3 分,不浪費
            if (this.player.lives < LIVES) this.player.lives += 1
            else this.coinsCollected += 3
            Audio.sfx('treasure', { life: true })
          } else if (c.kind === 'boost') {
            // 閃電:短暫衝刺(重複撿到就重新計時)
            this.boostLeft = BOOST.duration
            Audio.sfx('treasure', { value: 10 })
          } else {
            this.coinsCollected += c.value
            Audio.sfx('treasure', { value: c.value })
          }
        }
      }
    }

    // 抵達終點 = 嘗試上船(要先湊夠船價);第四關往尼尼微則無船價,走到城門即過關。
    if (this.distance >= this.goalDistance) {
      // 嵌入保羅大富翁時：抵達終點即過關，不卡船價（確保小遊戲一定會結束、不會卡在船邊）。
      // 第四關(this.fareEnabled=false)同理:走到尼尼微城門即過關。
      if (this.embed || !this.fareEnabled) {
        this.win()
        return
      }
      const need = this.mode === 'walk' ? FARE.walk : FARE.run
      if (this.coinsCollected >= need) {
        this.collectingFare = false
        this.win()
        return
      }
      // 船價不足:停在船邊,提示回頭收集
      this.distance = this.goalDistance
      this.shortFare = true
      // 闖關不能自動回頭 → 暫時切成可自由移動,讓玩家回頭收集船價
      if (this.mode === 'run') this.collectingFare = true
    } else {
      this.shortFare = false
    }
  }

  // 終點目標(船 / 尼尼微城門)從畫面右側滑入(終點前 1000px 開始),回傳 x;尚未出現則回 null
  goalPos(dist) {
    const startAt = this.goalDistance - 1000
    if (dist < startAt) return null
    const t = Math.min(1, (dist - startAt) / 1000)
    const fromX = VIEW.W + 100
    const toX = PLAYER.x + 150
    return fromX + (toX - fromX) * t
  }

  toggleMute() {
    Audio.unlock()
    const m = Audio.toggleMute()
    this.ui.setMuteIcon(m)
  }

  pause() {
    if (this.state !== STATE.PLAYING) return
    this.state = STATE.PAUSED
    this.ui.hidePauseButton()
    this.ui.showPaused()
    Audio.pauseAll()
  }

  resume() {
    if (this.state !== STATE.PAUSED) return
    this.ui.hide()
    this.ui.showPauseButton()
    this.state = STATE.PLAYING
    // 第一關恢復輕快音樂;第二關暴風雨只恢復音訊(不放旋律)
    if (this.level === 1) Audio.resumeAll()
    else Audio.unlock()
  }

  win() {
    this.state = STATE.WIN
    this.ui.hidePauseButton()
    Audio.stopMusic()
    Audio.sfx('win')
    if (this.embed) return this._finish(true)
    if (this.level === 10) {
      // 戰爭闖關原型「反轉奇兵」:走到底、巴蘭眼開得勝。原型不接約拿關鏈——「下一關」= 再走一次。
      this.ui.showWin(BALAAM, null, {
        showCoins: false,
        nextLabel: '🔁 再走一次',
        nextEnabled: true,
        progress: '戰爭闖關原型 · 反轉奇兵(民 22)',
      })
      return
    }
    if (this.level === 9) {
      // 戰爭闖關原型「聖歌奇兵」:敵軍自亂條滿得勝。原型不接約拿關鏈——「下一關」= 再唱一次。
      this.ui.showWin(JEHOSHAPHAT, null, {
        showCoins: false,
        nextLabel: '🔁 再唱一次',
        nextEnabled: true,
        progress: '戰爭闖關原型 · 聖歌奇兵(代下 20)',
      })
      return
    }
    if (this.level === 7) {
      // 戰爭闖關原型「摩西舉手」:撐到日落得勝。原型不接約拿關鏈——「下一關」= 再玩一次。
      this.ui.showWin(MOSES, null, {
        showCoins: false,
        nextLabel: '🔁 再撐一次',
        nextEnabled: true,
        progress: '戰爭闖關原型 · 摩西舉手(出 17)',
      })
      return
    }
    if (this.level === 8) {
      // 戰爭闖關原型「紅海奔逃」:過海床到對岸、海合攏淹追兵得勝。原型不接約拿關鏈——「下一關」= 再奔逃一次。
      this.ui.showWin(REDSEA, null, {
        showCoins: false,
        nextLabel: '🔁 再奔逃一次',
        nextEnabled: true,
        progress: '戰爭闖關原型 · 紅海奔逃(出 14)',
      })
      return
    }
    if (this.level === 2) {
      // 暴風雨:無寶物分數;下一關 = 大魚肚
      this.ui.showWin(LEVEL2, null, {
        showCoins: false,
        nextLabel: '下一關 · 大魚肚',
        nextEnabled: true,
        progress: '約拿的旅程 2 / 6',
      })
    } else if (this.level === 4) {
      // 上岸→尼尼微:有寶物分數;下一關 = 尼尼微傳道
      this.ui.showWin(LEVEL4, this.coinsCollected, {
        showCoins: true,
        nextLabel: '下一關 · 尼尼微傳道',
        nextEnabled: true,
        progress: '約拿的旅程 4 / 6',
      })
    } else {
      this.ui.showWin(LEVEL1, this.coinsCollected, {
        showCoins: true,
        nextLabel: '下一關 · 暴風雨',
        nextEnabled: true,
        progress: '約拿的旅程 1 / 6',
      })
    }
  }

  gameOver() {
    this.state = STATE.LOSE
    this._loseAt = typeof performance !== 'undefined' ? performance.now() : 0 // 失敗緩衝起點(見 loop)
    this.ui.hidePauseButton()
    Audio.stopMusic()
    Audio.sfx('lose')
    if (this.embed) return this._finish(false)
    this.ui.showLose(
      this.level === 10
        ? BALAAM
        : this.level === 9
        ? JEHOSHAPHAT
        : this.level === 8
          ? REDSEA
          : this.level === 7
            ? MOSES
            : this.level === 2
              ? LEVEL2
              : this.level === 4
                ? LEVEL4
                : LEVEL1
    )
  }

  // 嵌入：把結果回呼給 React 外層（只回一次）。
  _finish(won) {
    if (this._done) return
    this._done = true
    this.stopped = true // 立刻停迴圈，避免結束瞬間 LOSE 畫面誤觸重玩
    if (this.onComplete) this.onComplete({ won, score: this.coinsCollected || 0, level: this.level })
  }

  // 嵌入：React 卸載時呼叫——停迴圈、移除監聽、停音樂，避免殘留 rAF/監聽。
  destroy() {
    this.stopped = true
    if (this._onResize) window.removeEventListener('resize', this._onResize)
    if (this.input && this.input.detach) this.input.detach()
    Audio.stopMusic()
    Audio.pauseAll()
  }

  // ---- 聖經問答 ----
  // 卡片內所有 quiz-* 按鈕都走這裡
  handleQuizAction(act, ds) {
    if (act === 'quiz-start') this.startQuizPractice()
    else if (act === 'quiz-choice') this.answerQuiz(Number(ds.choice))
    else if (act === 'quiz-continue') this.afterQuizFeedback()
    else if (act === 'quiz-restart') this.startQuizPractice()
    else if (act === 'quiz-home') this.toTitle()
  }

  // 從標題進入的「練習」:隨機抽 5 題
  startQuizPractice() {
    this._enterImmersive()
    this.quiz = { list: pickQuestions(5), pos: 0, correct: 0, returnTo: 'title', single: false }
    this.state = STATE.QUIZ
    this.ui.hidePauseButton()
    Audio.unlock()
    this._showCurrentQuestion()
  }

  // 漫步遇到長者 NPC:單題;答對(或答錯滿 3 次仁慈放行)才算過這位長者。
  // 出題只從「這趟還沒答對」的題目挑,答對過的不再出現。
  startNpcQuiz(npc) {
    const idx = this._pickNpcQuestion(npc)
    this.state = STATE.QUIZ
    this.ui.hidePauseButton()
    if (idx < 0) {
      // 題庫裡還沒答對的題目都答完了 → 長者直接放行
      npc.done = true
      this.quiz = { single: true, npc, allDone: true }
      this.ui.showQuizAllDone()
      return
    }
    this.quiz = { list: [idx], pos: 0, correct: 0, returnTo: 'walk', single: true, npc, lastCorrect: false }
    this._showCurrentQuestion()
  }

  // 從「這趟還沒答對」的題目挑一題(盡量不連續出同一題);沒得出回 -1
  _pickNpcQuestion(npc) {
    const pool = []
    for (let i = 0; i < QUESTIONS.length; i++) {
      if (!this.answeredCorrect.has(i)) pool.push(i)
    }
    if (pool.length === 0) return -1
    let choices = pool
    if (pool.length > 1 && npc._lastQ != null) {
      const f = pool.filter((i) => i !== npc._lastQ)
      if (f.length) choices = f
    }
    const idx = choices[Math.floor(Math.random() * choices.length)]
    npc._lastQ = idx
    return idx
  }

  _showCurrentQuestion() {
    const q = QUESTIONS[this.quiz.list[this.quiz.pos]]
    this.ui.showQuiz(q, this.quiz.pos, this.quiz.list.length, this.quiz.single)
  }

  answerQuiz(choice) {
    if (!this.quiz) return
    const q = QUESTIONS[this.quiz.list[this.quiz.pos]]
    const correct = choice === q.answer
    this.quiz.lastCorrect = correct
    if (correct) {
      this.quiz.correct += 1
      if (this.quiz.single) this.answeredCorrect.add(this.quiz.list[0]) // 答對的不再出給 NPC
      Audio.sfx('treasure', { value: 5 })
    } else {
      Audio.sfx('hit')
    }
    let label
    if (this.quiz.single) {
      const npc = this.quiz.npc
      if (correct) label = '前進!'
      else if ((npc.attempts || 0) + 1 >= 3) label = '長者讓你過了'
      else label = '退後幾步,再答一題'
    } else {
      const last = this.quiz.pos === this.quiz.list.length - 1
      label = last ? '看結果' : '下一題'
    }
    this.ui.showQuizFeedback(q, choice, label)
  }

  afterQuizFeedback() {
    if (!this.quiz) return
    if (this.quiz.allDone) {
      this._endQuizToWalk() // 長者放行提示卡,按繼續回漫步
      return
    }
    if (this.quiz.single) {
      const npc = this.quiz.npc
      if (this.quiz.lastCorrect) {
        npc.done = true // 答對,過這位長者
        this._endQuizToWalk()
      } else {
        npc.attempts = (npc.attempts || 0) + 1
        if (npc.attempts >= 3) {
          npc.done = true // 答錯滿 3 次:仁慈放行,別卡住小孩
          this._endQuizToWalk()
        } else {
          this.knockbackLeft = 5 * WALK.step // 退後 5 步,走回來長者改問別題
          this._endQuizToWalk()
        }
      }
      return
    }
    // 標題練習(多題):往下一題或結算
    this.quiz.pos += 1
    if (this.quiz.pos < this.quiz.list.length) {
      this._showCurrentQuestion()
    } else {
      this.ui.showQuizSummary(
        this.quiz.correct,
        this.quiz.list.length,
        quizRemark(this.quiz.correct, this.quiz.list.length)
      )
    }
  }

  _endQuizToWalk() {
    this.quiz = null
    this.ui.hide()
    this.ui.showPauseButton()
    this.state = STATE.PLAYING
  }

  toTitle() {
    this.quiz = null
    this.level = 1
    this.state = STATE.TITLE
    Audio.stopMusic()
    this.ui.showTitle(LEVEL1)
  }

  // ---- 第三關 大魚肚:在黑暗中往前走,遇到禱告之光就停下禱告(答對才點燈、再前行)----
  handleFishAction(act, ds) {
    if (act === 'fish-start') this.startFish()
    else if (act === 'fish-begin') {
      this.fish.idx = 0
      this._fishStartWalk()
    } else if (act === 'fish-choice') this.answerFish(Number(ds.choice))
    else if (act === 'fish-continue') this._fishContinue()
    else if (act === 'fish-retry') this._showFishQuestion()
  }

  startFish() {
    this._enterImmersive()
    this.level = 3
    this.fish = {
      stations: LEVEL3.stations,
      idx: 0,
      lit: 0,
      total: LEVEL3.stations.length,
      dist: 0,
      moving: false,
      phase: 'intro', // intro / walk(往前走) / pray(禱告作答) / done
    }
    this.player.reset()
    this.state = STATE.FISH
    this.ui.hidePauseButton()
    Audio.unlock()
    Audio.stopMusic() // 魚腹安靜,不放輕快旋律
    this.ui.showFishIntro(LEVEL3)
  }

  // 開始往前走一小段(走到下一盞禱告之光);收起卡片,進 PLAYING 讓 step 跑
  _fishStartWalk() {
    this.fish.phase = 'walk'
    this.fish.dist = 0
    this.fish.moving = false
    this.player.reset() // 回到地面、站立、不蹲
    this.ui.hide()
    this.ui.hidePauseButton()
    this.state = STATE.PLAYING
  }

  // 走路段更新(phase==='walk'):→走、↑/輕點跳、↓/左側蹲;走到底跳起來碰蠟燭=禱告
  _fishStep(dt) {
    const f = this.fish
    if (!f || f.phase !== 'walk') return
    const p = this.player
    const wantJump = this.input.consumeJump() || this.input.consumeTap()
    this.input.consumePress()
    const half = this.input.viewW * 0.5
    const walkHeld = this.input.right || (this.input.pointerDown && this.input.pointerX >= half)
    const crouchHeld = this.input.down || (this.input.pointerDown && this.input.pointerX < half)
    p.crouching = crouchHeld && p.onGround
    if (wantJump && p.jump()) Audio.sfx('jump')
    // 前進:站著走快、蹲著鑽慢
    let speed = 0
    if (p.crouching) speed = FISH.crouchSpeed
    else if (walkHeld) speed = FISH.walkSpeed
    f.moving = speed > 0
    if (speed > 0) {
      let nd = f.dist + speed * dt
      const boneDist = FISH.segment * FISH.boneAt
      // 站著(沒蹲)碰到骨頭就過不去,要蹲下才能鑽過
      if (!p.crouching && f.dist < boneDist && nd >= boneDist) nd = boneDist - 4
      f.dist = Math.min(FISH.segment, nd)
    }
    p.update(dt)
    // 走到底、蠟燭就在頭頂:跳起來碰到 = 開始禱告
    if (f.dist >= FISH.segment) {
      const cb = { x: PLAYER.x - 24, y: FISH.candleY - 24, w: 48, h: 48 }
      if (aabb(p.hitbox(), cb)) {
        f.phase = 'pray'
        this.state = STATE.FISH
        Audio.sfx('treasure', { value: 1 })
        this._showFishQuestion()
      }
    }
  }

  _showFishQuestion() {
    this.ui.showFishQuestion(this.fish.stations[this.fish.idx], this.fish.idx, this.fish.total)
  }

  answerFish(choice) {
    if (!this.fish || this.fish.phase !== 'pray') return
    const st = this.fish.stations[this.fish.idx]
    if (choice === st.answer) {
      this.fish.lit = this.fish.idx + 1 // 答對才點亮這盞燈
      Audio.sfx('treasure', { value: 5 })
      this.ui.showFishReveal(st, this.fish.idx === this.fish.total - 1)
    } else {
      Audio.sfx('hit') // 答錯:不點燈、不前進,再想一次
      this.ui.showFishTryAgain()
    }
  }

  _fishContinue() {
    if (!this.fish) return
    if (this.fish.idx >= this.fish.total - 1) this._fishWin()
    else {
      this.fish.idx += 1
      this._fishStartWalk() // 往前再走一小段,到下一盞燈
    }
  }

  _fishWin() {
    this.fish.lit = this.fish.total // 全亮
    this.fish.phase = 'done'
    this.state = STATE.WIN
    this.ui.hidePauseButton()
    Audio.sfx('win')
    if (this.embed) return this._finish(true) // 嵌入：回報過關（默想關不會失敗）
    this.ui.showWin(LEVEL3, null, {
      showCoins: false,
      nextLabel: '下一關 · 上岸往尼尼微',
      nextEnabled: true,
      progress: '約拿的旅程 3 / 6',
    })
  }

  // ---- 第五關 尼尼微傳道(對話 RPG):在城中往前走,走到居民面前停下對話、宣告神的話;
  //      答對 = 那人悔改(披麻衣)再前行;五位(含王)都悔改 = 過關。----
  handlePreachAction(act, ds) {
    if (act === 'preach-start') this.startPreach()
    else if (act === 'preach-begin') {
      this.preach.idx = 0
      this._preachStartWalk()
    } else if (act === 'preach-choice') this.answerPreach(Number(ds.choice))
    else if (act === 'preach-continue') this._preachContinue()
    else if (act === 'preach-retry') this._showPreachDialog()
  }

  startPreach() {
    this._enterImmersive()
    this.level = 5
    this.preach = {
      stations: LEVEL5.stations,
      idx: 0,
      repented: 0,
      total: LEVEL5.stations.length,
      dist: 0,
      moving: false,
      phase: 'intro', // intro / walk(往前走) / talk(對話作答) / done
    }
    this.player.reset()
    this.state = STATE.PREACH
    this.ui.hidePauseButton()
    Audio.unlock()
    Audio.startMusic() // 大城街道有市井氣,保留輕快旋律
    this.ui.showPreachIntro(LEVEL5)
  }

  // 開始往前走(走到下一位居民面前);收起卡片,進 PLAYING 讓 step 跑
  _preachStartWalk() {
    this.preach.phase = 'walk'
    this.preach.dist = 0
    this.preach.moving = false
    this.player.reset()
    this.ui.hide()
    this.ui.hidePauseButton()
    this.state = STATE.PLAYING
  }

  // 走路段更新(phase==='walk'):→走、↑/輕點跳(好玩用);走到居民面前=停下對話
  _preachStep(dt) {
    const f = this.preach
    if (!f || f.phase !== 'walk') return
    const p = this.player
    const wantJump = this.input.consumeJump() || this.input.consumeTap()
    this.input.consumePress()
    const half = this.input.viewW * 0.5
    const walkHeld = this.input.right || (this.input.pointerDown && this.input.pointerX >= half)
    if (wantJump && p.jump()) Audio.sfx('jump')
    const speed = walkHeld ? PREACH.walkSpeed : 0
    f.moving = speed > 0
    if (speed > 0) f.dist = Math.min(PREACH.segment, f.dist + speed * dt)
    p.update(dt)
    // 走到居民面前(且落地)= 停下對話
    if (f.dist >= PREACH.segment && p.onGround) {
      f.phase = 'talk'
      this.state = STATE.PREACH
      Audio.sfx('treasure', { value: 1 })
      this._showPreachDialog()
    }
  }

  _showPreachDialog() {
    this.ui.showPreachDialog(this.preach.stations[this.preach.idx], this.preach.idx, this.preach.total)
  }

  answerPreach(choice) {
    if (!this.preach || this.preach.phase !== 'talk') return
    const st = this.preach.stations[this.preach.idx]
    if (choice === st.answer) {
      this.preach.repented = this.preach.idx + 1 // 答對 = 這位居民悔改
      Audio.sfx('treasure', { value: 5 })
      this.ui.showPreachReveal(st, this.preach.idx === this.preach.total - 1)
    } else {
      Audio.sfx('hit') // 答錯:那人還沒悔改,再想一次(不懲罰)
      this.ui.showPreachTryAgain()
    }
  }

  _preachContinue() {
    if (!this.preach) return
    if (this.preach.idx >= this.preach.total - 1) this._preachWin()
    else {
      this.preach.idx += 1
      this._preachStartWalk() // 往前再走一段,到下一位居民
    }
  }

  _preachWin() {
    this.preach.repented = this.preach.total // 全城悔改
    this.preach.phase = 'done'
    this.state = STATE.WIN
    this.ui.hidePauseButton()
    Audio.stopMusic()
    Audio.sfx('win')
    if (this.embed) return this._finish(true) // 嵌入：回報過關（傳道關不會失敗）
    this.ui.showWin(LEVEL5, null, {
      showCoins: false,
      nextLabel: '下一關 · 蓖麻樹',
      nextEnabled: true,
      progress: '約拿的旅程 5 / 6',
    })
  }

  // ---- 第六關 蓖麻樹(反思結局):五幕場景動畫——蓖麻、蟲子、東風都是神「安排」的,
  //      玩家不操控、只觀看(可輕點跳過),每幕結束回答一個反思題;五幕走完 = 全書完。----
  handleGourdAction(act, ds) {
    if (act === 'gourd-start') this.startGourd()
    else if (act === 'gourd-begin') {
      this.gourd.idx = 0
      this._gourdStartScene()
    } else if (act === 'gourd-choice') this.answerGourd(Number(ds.choice))
    else if (act === 'gourd-continue') this._gourdContinue()
    else if (act === 'gourd-retry') this._showGourdQuestion()
  }

  startGourd() {
    this._enterImmersive()
    this.level = 6
    this.gourd = {
      stations: LEVEL6.stations,
      idx: 0,
      done: 0, // 已完成(答對)的幕數
      total: LEVEL6.stations.length,
      t: 0, // 本幕場景動畫已播放秒數
      phase: 'intro', // intro / scene(場景動畫) / ask(反思作答) / done
    }
    this.player.reset()
    this.state = STATE.GOURD
    this.ui.hidePauseButton()
    Audio.unlock()
    Audio.stopMusic() // 城外安靜的黃昏與清晨,不放輕快旋律
    this.ui.showGourdIntro(LEVEL6)
  }

  // 播這一幕的場景動畫;收起卡片,進 PLAYING 讓 step 跑
  _gourdStartScene() {
    this.gourd.phase = 'scene'
    this.gourd.t = 0
    this.ui.hide()
    this.ui.hidePauseButton()
    this.state = STATE.PLAYING
  }

  // 場景動畫更新(phase==='scene'):看著神的「安排」發生;輕點/跳鍵可跳過,播完出反思題
  _gourdStep(dt) {
    const f = this.gourd
    if (!f || f.phase !== 'scene') return
    const skip = this.input.consumeJump() || this.input.consumeTap() || this.input.consumePress()
    f.t += dt
    if (skip) f.t = GOURD.sceneTime // 跳過:直接視為播完
    if (f.t >= GOURD.sceneTime) {
      f.phase = 'ask'
      this.state = STATE.GOURD
      Audio.sfx('treasure', { value: 1 })
      this._showGourdQuestion()
    }
  }

  _showGourdQuestion() {
    this.ui.showGourdQuestion(this.gourd.stations[this.gourd.idx], this.gourd.idx, this.gourd.total)
  }

  answerGourd(choice) {
    if (!this.gourd || this.gourd.phase !== 'ask') return
    const st = this.gourd.stations[this.gourd.idx]
    if (choice === st.answer) {
      this.gourd.done = this.gourd.idx + 1 // 答對 = 完成這一幕
      Audio.sfx('treasure', { value: 5 })
      this.ui.showGourdReveal(st, this.gourd.idx === this.gourd.total - 1)
    } else {
      Audio.sfx('hit') // 答錯:再想一次(反思關,不懲罰)
      this.ui.showGourdTryAgain()
    }
  }

  _gourdContinue() {
    if (!this.gourd) return
    if (this.gourd.idx >= this.gourd.total - 1) this._gourdWin()
    else {
      this.gourd.idx += 1
      this._gourdStartScene() // 進入下一幕
    }
  }

  _gourdWin() {
    this.gourd.done = this.gourd.total
    this.gourd.phase = 'done'
    this.state = STATE.WIN
    this.ui.hidePauseButton()
    Audio.sfx('win')
    if (this.embed) return this._finish(true) // 嵌入：回報過關（反思關不會失敗）
    this.ui.showWin(LEVEL6, null, {
      showCoins: false,
      nextLabel: '🏠 回標題(全書完)',
      nextEnabled: true, // next() 在第六關會回標題
      progress: '約拿的旅程 6 / 6 · 全書完 🎉',
    })
  }
}

// 軸對齊矩形碰撞
function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

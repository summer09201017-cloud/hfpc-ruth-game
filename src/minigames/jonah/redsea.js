import { REDSEA, PLAYER, GROUND_Y } from './config.js'
import { Audio } from './audio.js'

// 戰爭闖關原型 #2「紅海奔逃」(出 14:13–28)——自成一格的場景(level === 8),
// 重用跑酷的「跳躍/重力」手感(this.game.player),但場景與規則完全獨立(構造同 Storm/Moses)。
//
//   phase: stand(站住等候、海漸漸分開)→ cross(過海床、跳礁石、追兵在後)→ closing(海合攏淹追兵)→ done。
//   依靠值鉤子(出 14:13–14):不能一開始就亂衝——要「站住,等候神分海」(海全開才衝);
//     沒有攻擊鍵、打不到追兵,唯一的路是神開的海路,人只管照著走過去。
//
//   lead = 領先追兵的距離(px):乾淨奔跑會慢慢拉開(gapRecoverPerSec,上限 chaseGapMax),
//     絆到一次礁石瞬間縮短 chaseCloseOnHit + 踉蹌變慢;lead<=0 = 追兵追上(失敗)。
//     跑到 goalDistance = 對岸 → 海合攏(closing)→ 過關。
//   想更難 → 調高 chaseCloseOnHit、調低 chaseGapStart / gapRecoverPerSec / hazardGap(見 config REDSEA)。
export class RedSea {
  constructor(game) {
    this.game = game
    this.reset()
  }

  reset() {
    this.time = 0 // 場景總時間(動畫用)
    this.phase = 'stand' // stand → cross → closing → done
    this.standT = 0 // 站住等候、海分開的計時(海全開 = standT >= standTime)
    this.dist = 0 // 已過海床的距離(px;= 前進進度)
    this.lead = REDSEA.chaseGapStart // 領先追兵的距離(px)
    this.stumble = 0 // 踉蹌變慢的剩餘秒數(>0 = 速度打折)
    this.closeT = 0 // closing:海合攏動畫計時
    this.hazards = [] // 海床礁石/陷坑 [{ x, resolved, cleared }]
    this._nextHazardAt = REDSEA.hazardGap * 1.1 // 第一顆礁石出現的距離(留一點起跑緩衝)
    this.tooEarly = 0 // 海未全開就想衝 → 顯示「站住,等候」提示的剩餘秒數
    this.done = false
    // 重用跑酷玩家的跳躍/重力(固定在畫面左側 PLAYER.x,只上下)
    this.game.player.reset()
  }

  // 玩家此刻是否「舉杖 / 跳」:輕點畫面 / 跳鍵 / 指標按下都算(逐項取出邊緣,避免殘留到下一幀)
  _act() {
    const inp = this.game.input
    const j = inp.consumeJump()
    const pr = inp.consumePress()
    const tp = inp.consumeTap()
    return j || !!pr || tp
  }

  // 玩家此刻是否「加速衝刺」(按住,不消耗邊緣):→ / D 鍵,或指標按住畫面右側 60% 以後。
  //   跳躍走邊緣(_act),衝刺走按住(這裡),兩者互不干擾——可以邊衝刺邊跳。
  _sprinting() {
    const inp = this.game.input
    if (inp.right) return true
    if (inp.pointerDown && inp.viewW > 0 && inp.pointerX > inp.viewW * 0.6) return true
    return false
  }

  // 隨機決定一個障礙的種類與行為(2026-06-15 應牧者「不要都是石頭、要有水中動物」)。
  //   rock 礁石(靜止)、crab 螃蟹(往玩家快速橫衝 vx=crabDart,反應時間短)、
  //   snake 海蛇、scorpion 水蠍子(目前行為同礁石,僅外觀不同;之後可再加各自動法)。
  //   權重:約六成是動物、四成礁石。kind 只影響外觀;唯一影響玩法的是 crab 的 vx → 校準用最壞情況驗。
  _makeHazard() {
    const roll = Math.random()
    if (roll < 0.4) return { kind: 'rock', vx: 0 }
    if (roll < 0.7) return { kind: 'crab', vx: REDSEA.crabDart || 0 } // 螃蟹快速衝
    if (roll < 0.85) return { kind: 'snake', vx: 0 }
    return { kind: 'scorpion', vx: 0 }
  }

  // 海分開進度 0..1(renderer / UI 用):stand 階段漸開;cross 全開;closing 漸合
  seaOpen() {
    if (this.phase === 'stand') return Math.min(1, this.standT / REDSEA.standTime)
    if (this.phase === 'closing') return Math.max(0, 1 - this.closeT / REDSEA.closeTime)
    return 1
  }

  // 海全開、可以衝了(renderer 顯示「點擊舉杖,衝過海床 →」)
  canGo() {
    return this.phase === 'stand' && this.standT >= REDSEA.standTime
  }

  step(dt) {
    if (this.done) return
    this.time += dt
    const p = this.game.player
    if (this.tooEarly > 0) this.tooEarly = Math.max(0, this.tooEarly - dt)

    // ── stand:站住等候,海漸漸分開。太早衝 = 不前進(顯示「站住,等候」);海全開後點擊才起步。──
    if (this.phase === 'stand') {
      this.standT += dt
      const act = this._act()
      if (this.standT >= REDSEA.standTime) {
        if (act) {
          this.phase = 'cross' // 海全開 + 舉杖 → 衝過海床
          Audio.sfx('jump')
        }
      } else if (act) {
        this.tooEarly = 1.2 // 海還沒全開就衝 → 提示「不要懼怕,只管站住」(出 14:13)
      }
      p.update(dt)
      return
    }

    // ── cross:過海床主玩法。世界向前捲(dist 增加),跳過礁石,追兵在後。──
    if (this.phase === 'cross') {
      if (this._act() && p.jump()) Audio.sfx('jump')
      p.update(dt)

      // 前進:踉蹌時打折;否則按住可加速衝刺(踉蹌優先,絆到時不能靠衝刺硬闖)
      const mult = this.stumble > 0
        ? REDSEA.stumbleSpeedMult
        : (this._sprinting() ? REDSEA.sprintMult : 1)
      this.dist += REDSEA.runSpeed * mult * dt
      if (this.stumble > 0) this.stumble = Math.max(0, this.stumble - dt)

      // 追兵:乾淨奔跑慢慢拉開(上限 chaseGapMax)
      this.lead = Math.min(REDSEA.chaseGapMax, this.lead + REDSEA.gapRecoverPerSec * dt)

      // 依距離產生前方障礙(礁石 + 水中動物:螃蟹/海蛇/水蠍子,kind 決定外觀與行為)
      while (this._nextHazardAt < this.dist + 1400) {
        this.hazards.push({ x: this._nextHazardAt, resolved: false, cleared: false, ...this._makeHazard() })
        this._nextHazardAt += REDSEA.hazardGap
      }

      // 會動的障礙(螃蟹快速橫衝)往玩家逼近:x 減少 = 比礁石更早到、反應時間更短
      for (const h of this.hazards) {
        if (!h.resolved && h.vx) h.x -= h.vx * dt
      }

      // 障礙到達玩家(screenX 越過 PLAYER.x)時結算一次:在空中夠高=跳過;在地面=絆到
      for (const h of this.hazards) {
        if (h.resolved) continue
        const screenX = PLAYER.x + (h.x - this.dist)
        if (screenX <= PLAYER.x) {
          h.resolved = true
          if (!p.onGround && p.y < GROUND_Y - 22) {
            h.cleared = true // 成功跳過
          } else {
            this.stumble = REDSEA.stumbleTime // 絆到:變慢 + 追兵逼近
            this.lead -= REDSEA.chaseCloseOnHit
            Audio.sfx('hit')
          }
        }
      }
      // 丟掉已捲出畫面左側的礁石
      this.hazards = this.hazards.filter((h) => h.x - this.dist > -240)

      // 結束判定
      if (this.lead <= 0) {
        this.done = true
        this.game.gameOver() // 追兵追上 → 失敗(動作關可重試)
        return
      }
      if (this.dist >= REDSEA.goalDistance) {
        this.phase = 'closing' // 抵達對岸 → 海合攏淹追兵
        this.closeT = 0
        Audio.sfx('hit')
      }
      return
    }

    // ── closing:抵達對岸,海牆合攏淹沒法老的軍兵(14:28),播完動畫過關。──
    if (this.phase === 'closing') {
      this.closeT += dt
      p.update(dt)
      if (this.closeT >= REDSEA.closeTime) {
        this.done = true
        this.game.win()
      }
    }
  }
}

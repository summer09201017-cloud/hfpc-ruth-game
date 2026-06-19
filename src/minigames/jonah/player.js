import { GROUND_Y, PHYS, PLAYER } from './config.js'

// 約拿:固定在畫面左側,只負責上下(跳躍與重力)。
// 世界往左捲動,製造他向前奔跑的感覺。

export class Player {
  constructor() {
    this.reset()
  }

  reset() {
    this.x = PLAYER.x
    this.y = GROUND_Y // 腳底基準
    this.vy = 0
    this.onGround = true
    this.invuln = 0 // 無敵剩餘秒數
    this.lives = 0 // 由 Game 設定
    this.crouching = false // 第三關:蹲下(命中框變矮,可鑽過骨頭)
  }

  jump() {
    if (this.onGround && !this.crouching) {
      this.vy = PHYS.jumpV
      this.onGround = false
      return true
    }
    return false
  }

  update(dt) {
    this.vy += PHYS.gravity * dt
    this.y += this.vy * dt
    if (this.y >= GROUND_Y) {
      this.y = GROUND_Y
      this.vy = 0
      this.onGround = true
    }
    if (this.invuln > 0) this.invuln -= dt
  }

  // 命中框(以腳底為基準往上算);蹲下時變矮
  hitbox() {
    const h = this.crouching ? Math.round(PLAYER.h * 0.58) : PLAYER.h
    return { x: this.x - PLAYER.w / 2, y: this.y - h, w: PLAYER.w, h }
  }
}

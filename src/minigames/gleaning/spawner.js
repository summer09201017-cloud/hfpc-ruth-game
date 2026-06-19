import { VIEW, GROUND_Y, WHEAT, BOAZ } from './config.js'

// 生成田裡的障礙、可撿的麥穗🌾、與「波阿斯遇見點」,並讓它們隨世界往左移動。
// 本關核心:邊跑邊撿掉落的麥穗🌾(回補體力 + 籃子+1);一路上常常遇到波阿斯(BOAZ.gap),
// 走到他面前才停下對話、領受他「故意撥落」的一大把麥穗(大回補)。
// 障礙是田裡溫和的石頭/草叢(碰到只小扣體力、不致命),間距依速度動態調整,保證跳得過去。

// 溫和的田間障礙(碰到不扣命,只小扣體力)
const OBSTACLES = ['🪨', '🌿']

function rand(a, b) {
  return a + Math.random() * (b - a)
}

export class Spawner {
  constructor() {
    this.reset()
  }

  reset() {
    this.obstacles = []
    this.wheats = [] // 可撿的麥穗 { x, y(離地高度), got }
    this.boaz = [] // 波阿斯遇見點 { x, met }
    this.distSinceObstacle = 0
    this.nextObstacleGap = 760
    this.distSinceWheat = 0
    this.nextWheatGap = WHEAT.firstAt
    this.distSinceBoaz = 0
    this.nextBoazGap = BOAZ.firstAt
  }

  update(dt, speed, distanceTraveled, goalDistance) {
    const dx = speed * dt

    // 接近終點時不再生成,留一段乾淨的田讓路得走向日暮
    const spawning = distanceTraveled < goalDistance - 900

    // ---- 障礙(溫和) ----
    this.distSinceObstacle += dx
    if (spawning && this.distSinceObstacle >= this.nextObstacleGap) {
      this.distSinceObstacle = 0
      const minGap = speed * 0.95 + 320
      this.nextObstacleGap = rand(minGap, minGap + 340)
      const w = rand(30, 44)
      const h = rand(28, 42)
      this.obstacles.push({
        x: VIEW.W + 60,
        w,
        h,
        emoji: OBSTACLES[Math.floor(rand(0, OBSTACLES.length))],
        size: Math.max(w, h) + 10,
      })
    }

    // ---- 麥穗🌾(常常有得撿;貼地或低懸,有的要小跳)----
    this.distSinceWheat += dx
    if (spawning && this.distSinceWheat >= this.nextWheatGap) {
      this.distSinceWheat = 0
      this.nextWheatGap = rand(WHEAT.gapMin, WHEAT.gapMax)
      this.wheats.push({
        x: VIEW.W + 50,
        y: rand(WHEAT.yMin, WHEAT.yMax), // 離地高度
        got: false,
      })
    }

    // ---- 波阿斯遇見點(走近觸發對話 + 故意撥落)----
    this.distSinceBoaz += dx
    if (spawning && this.distSinceBoaz >= this.nextBoazGap) {
      this.distSinceBoaz = 0
      this.nextBoazGap = rand(BOAZ.gapMin, BOAZ.gapMax)
      this.boaz.push({ x: VIEW.W + 60, met: false })
    }

    // ---- 移動 + 移除出界 ----
    for (const o of this.obstacles) o.x -= dx
    for (const wch of this.wheats) wch.x -= dx
    for (const b of this.boaz) b.x -= dx
    this.obstacles = this.obstacles.filter((o) => o.x > -80)
    this.wheats = this.wheats.filter((wch) => wch.x > -60 && !wch.got)
    this.boaz = this.boaz.filter((b) => b.x > -80)
  }
}

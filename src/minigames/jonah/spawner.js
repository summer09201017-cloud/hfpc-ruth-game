import { VIEW, GROUND_Y } from './config.js'

// 生成障礙與空中寶物,並讓它們隨世界往左移動。
// 障礙間距會依當前速度動態調整,保證一定跳得過去(公平性)。

const OBSTACLES = ['📦', '🛢️', '🪵', '🧺', '🪜']
const OBSTACLES_DESERT = ['🪨', '🌵', '🪵', '🏺'] // 第四關曠野:石頭/荊棘/枯木/破罐

// 小敵人(馬力歐式):從右邊爬過來,可跳過或踩扁。crawl=自身向左爬行速度。
// 依主題換陣容:港口(L1)蛇/螃蟹/老鼠;曠野(L4)蛇/蠍子。
const ENEMIES = {
  harbor: [
    { emoji: '🐍', w: 38, h: 26, size: 38, crawl: 75 }, // 蛇
    { emoji: '🦀', w: 34, h: 28, size: 34, crawl: 60 }, // 螃蟹
    { emoji: '🐀', w: 34, h: 26, size: 34, crawl: 95 }, // 老鼠
  ],
  desert: [
    { emoji: '🐍', w: 38, h: 26, size: 38, crawl: 80 }, // 蛇
    { emoji: '🦂', w: 36, h: 26, size: 36, crawl: 90 }, // 蠍子
  ],
}

// 空中寶物:跳起來收集。
//   value = 分數;kind 'points'=加分 / 'life'=補一條命 / 'boost'=短暫衝刺;weight = 相對出現機率(越大越常見)。
const TREASURES = [
  { emoji: '🪙', kind: 'points', value: 1, weight: 50, r: 16, size: 30 }, // 船價(最常見)
  { emoji: '🏺', kind: 'points', value: 3, weight: 22, r: 17, size: 32 }, // 陶罐
  { emoji: '📜', kind: 'points', value: 5, weight: 14, r: 17, size: 30 }, // 經卷
  { emoji: '🕊️', kind: 'points', value: 10, weight: 8, r: 17, size: 32 }, // 鴿子(約拿之名)
  { emoji: '❤️', kind: 'life', value: 0, weight: 8, r: 16, size: 30 }, // 補一條命(滿血折算 3 分)
  { emoji: '⚡', kind: 'boost', value: 0, weight: 7, r: 16, size: 30 }, // 衝刺:短暫跑更快(config.BOOST)
]
const TREASURE_WEIGHT = TREASURES.reduce((s, t) => s + t.weight, 0)

function rand(a, b) {
  return a + Math.random() * (b - a)
}

// 依 weight 加權隨機挑一種寶物
function pickTreasure() {
  let r = Math.random() * TREASURE_WEIGHT
  for (const t of TREASURES) {
    if (r < t.weight) return t
    r -= t.weight
  }
  return TREASURES[0]
}

export class Spawner {
  constructor() {
    this.theme = 'harbor' // 'harbor'(L1 港口) / 'desert'(L4 曠野);由 game 在開關時設定
    this.reset()
  }

  reset() {
    this.obstacles = []
    this.treasures = []
    this.enemies = []
    this.npcs = [] // 漫步模式才有:走近會觸發聖經問答的 NPC
    this.distSinceObstacle = 0
    this.nextObstacleGap = 520
    this.distSinceTreasure = 0
    this.nextTreasureGap = 560 // 船價門檻後調密一點,讓 15/20 較好湊到
    this.distSinceEnemy = 0
    this.nextEnemyGap = 1400
    this.distSinceNpc = 0
    this.nextNpcGap = 1500 // 第一個 NPC 較早出現,讓玩家很快遇到
    this.distBackfill = 0 // 回頭收集船價時,往後走累計的距離(從左邊生成寶物用)
  }

  // needFare = 船價還不夠且可回頭(漫步 / 闖關回頭收集):往後走時從「左邊」生成寶物,
  //            修正「回頭結果整路空空、沒船價可撿」的死局(終點前 1000px 不生成 + 舊寶物已出畫面被回收)。
  update(dt, speed, distanceTraveled, goalDistance, enemiesOn = false, npcsOn = enemiesOn, needFare = false) {
    const dx = speed * dt

    // ---- 回頭收集船價:往後走(dx<0)時,寶物改從畫面左側進場 ----
    if (needFare && dx < 0) {
      this.distBackfill += -dx
      if (this.distBackfill >= 460) {
        this.distBackfill = 0
        const t = pickTreasure()
        this.treasures.push({
          x: -60, // 從左邊進場(往後走時世界向右捲,它會迎面而來)
          y: GROUND_Y - rand(55, 135),
          r: t.r,
          size: t.size,
          emoji: t.emoji,
          kind: t.kind,
          value: t.value,
          taken: false,
        })
      }
    }

    // 接近終點時不再生成障礙,留一段乾淨跑道讓約拿跑向船
    const spawning = distanceTraveled < goalDistance - 1000

    // ---- 障礙 ----
    this.distSinceObstacle += dx
    if (spawning && this.distSinceObstacle >= this.nextObstacleGap) {
      this.distSinceObstacle = 0
      // 依速度決定最小安全間距(速度越快,間距越大)
      const minGap = speed * 0.95 + 230
      this.nextObstacleGap = rand(minGap, minGap + 300)
      const w = rand(34, 48)
      const h = rand(34, 52)
      const pool = this.theme === 'desert' ? OBSTACLES_DESERT : OBSTACLES
      this.obstacles.push({
        x: VIEW.W + 60,
        w,
        h,
        emoji: pool[Math.floor(rand(0, pool.length))],
        size: Math.max(w, h) + 10,
      })
    }

    // ---- 空中寶物 ----
    this.distSinceTreasure += dx
    if (spawning && this.distSinceTreasure >= this.nextTreasureGap) {
      this.distSinceTreasure = 0
      this.nextTreasureGap = rand(520, 920)
      const t = pickTreasure()
      this.treasures.push({
        x: VIEW.W + 60,
        y: GROUND_Y - rand(55, 135), // 跳起來才撿得到的高度
        r: t.r,
        size: t.size,
        emoji: t.emoji,
        kind: t.kind,
        value: t.value,
        taken: false,
      })
    }

    // ---- 小敵人(漫步模式;第四關曠野連闖關模式也有 🐍🦂)----
    if (enemiesOn) {
      this.distSinceEnemy += dx
      if (spawning && this.distSinceEnemy >= this.nextEnemyGap) {
        this.distSinceEnemy = 0
        this.nextEnemyGap = rand(1200, 2200)
        const pool = ENEMIES[this.theme] || ENEMIES.harbor
        const e = pool[Math.floor(rand(0, pool.length))]
        this.enemies.push({
          x: VIEW.W + 60,
          w: e.w,
          h: e.h,
          size: e.size,
          emoji: e.emoji,
          crawl: e.crawl,
          dead: false,
        })
      }
    }

    // ---- NPC(只在第一關漫步模式;走近觸發聖經問答,沒有時間壓力)----
    if (npcsOn) {
      this.distSinceNpc += dx
      if (spawning && this.distSinceNpc >= this.nextNpcGap) {
        this.distSinceNpc = 0
        this.nextNpcGap = rand(2400, 3400)
        this.npcs.push({
          x: VIEW.W + 60,
          w: 44,
          h: 64,
          size: 54,
          emoji: '🧓', // 碼頭邊的長者,考考你約拿的故事
          attempts: 0, // 在這位長者答錯幾次(滿 3 次仁慈放行)
          done: false, // 答對或被放行後 = 通過
          // 出哪一題由 game 從「還沒答對」的題庫即時挑(答對過的不再出現)
        })
      }
    }

    // ---- 移動 + 移除出界 ----
    for (const o of this.obstacles) o.x -= dx
    for (const c of this.treasures) c.x -= dx
    // 敵人:除了世界捲動,還會自己向左爬(站著不動牠也會靠近)
    for (const e of this.enemies) e.x -= dx + e.crawl * dt
    for (const n of this.npcs) n.x -= dx
    this.obstacles = this.obstacles.filter((o) => o.x > -80)
    this.treasures = this.treasures.filter((c) => c.x > -80 && !c.taken)
    this.enemies = this.enemies.filter((e) => e.x > -80 && !e.dead)
    this.npcs = this.npcs.filter((n) => n.x > -80)
  }
}

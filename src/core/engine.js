// ===========================================================================
// 保羅宣教之旅 — 純規則引擎 (pure rules engine)
// ---------------------------------------------------------------------------
// 這個檔案「不」匯入任何 React / DOM 的東西，只處理遊戲規則：
//   建立遊戲、擲骰、移動、結算停留格、結束回合、判斷遊戲結束。
// 好處：邏輯可以單獨測試（見 scripts/selfplay.mjs），
//       畫面（React / 之後想換 Phaser）可以隨時抽換而不動到規則。
//
// 核心不變量 (engine invariants)：
//   1. 所有函式都「回傳新的 state」，不修改傳進來的 state（immutable）。
//   2. 骰子的隨機值由外部傳入（roll(state, value)），方便用固定種子做自我對戰測試。
//   3. 只有一個函式回答「遊戲結束了嗎」：getGameStatus()，同時涵蓋勝利與回合上限。
// ===========================================================================

export const PLAYER_COLORS = ['#e4572e', '#2e86ab', '#3a9d23', '#f3a712', '#8e44ad', '#16a085']

/** 深拷貝玩家陣列，保持 immutability。 */
function clonefPlayers(players) {
  return players.map((p) => ({ ...p, companions: [...p.companions], gifts: [...(p.gifts || [])] }))
}

/**
 * 建立一場新遊戲。
 * @param {Array<{name:string, gospelPoints?:number, gifts?:string[]}>} playerConfigs 玩家設定（1~4 人）。
 *   gospelPoints / gifts 可選——「接續上一段旅程」時帶入累積的分數與屬靈裝備（宣教接力）；
 *   同工一律換成新旅程的起點同工（聖經上各次旅程的同工本來就不同）。
 * @param {object} board journeyX.json 的內容（含 stations）
 */
export function createGame(playerConfigs, board) {
  const startStation = board.stations[0]
  const startCompanions = startStation.startCompanions || []

  const players = playerConfigs.map((cfg, i) => ({
    id: i,
    name: cfg.name && cfg.name.trim() ? cfg.name.trim() : `玩家 ${i + 1}`,
    color: PLAYER_COLORS[i % PLAYER_COLORS.length],
    position: 0, // station index
    gospelPoints: typeof cfg.gospelPoints === 'number' ? cfg.gospelPoints : 0,
    companions: [...startCompanions],
    gifts: Array.isArray(cfg.gifts) ? [...cfg.gifts] : [...(startStation.startGifts || [])], // 屬靈裝備/恩賜（全副軍裝）；被動加成見 board.gifts
    skipNext: false, // 下一回合是否要暫停（被石頭打傷之類）
    finished: false, // 是否已抵達終點
  }))

  return {
    board,
    players,
    currentPlayerIndex: 0,
    diceValue: null,
    turnCount: 0,
    lastMoverId: null,
    pendingStationId: null, // 剛停留、待結算的格子
    pendingQuizIndex: null, // 這一輪從該格題庫抽中的題目索引（外部注入隨機值，見 advance）
    pendingCard: null, // 這一輪抽中的機會／命運卡 { deck, index }（外部注入隨機值，見 advance）
    lastResult: null, // 上一次結算的結果（給畫面顯示用）
    phase: 'idle', // idle | rolled | resolving | turnEnd | gameover
    log: [],
  }
}

function pushLog(log, message) {
  return [...log, message]
}

/** 擲骰：value 由外部產生（1~6），引擎保持純函式以利測試。 */
export function roll(state, value) {
  if (state.phase !== 'idle') return state
  return { ...state, diceValue: value, phase: 'rolled' }
}

/**
 * 取得某站的「問答題庫」：優先用 quizzes 陣列（多題隨機抽），
 * 否則退回單一 quiz（向後相容舊資料），都沒有就回空陣列。
 */
export function getQuizPool(station) {
  if (station && Array.isArray(station.quizzes) && station.quizzes.length > 0) return station.quizzes
  if (station && station.quiz) return [station.quiz]
  return []
}

/** 從清單長度與注入的隨機值 [0,1) 算出要抽第幾個（夾在合法範圍內）；空清單回 null。 */
function pickIndex(length, rollValue) {
  if (length <= 0) return null
  const r = Number.isFinite(rollValue) ? rollValue : 0
  return Math.min(length - 1, Math.max(0, Math.floor(r * length)))
}

/** 取得某副牌（機會 chance / 命運 fate）。沒有就回空陣列。 */
export function getDeck(board, name) {
  if (board && board.decks && Array.isArray(board.decks[name])) return board.decks[name]
  return []
}

/**
 * 判斷停在某格時要抽哪一副牌：
 *   - 專用格：type 為 'chance' / 'fate'。
 *   - 任何格：effect 或 event.effect 帶 drawCard:"chance"|"fate"。
 * 回傳牌名或 null。
 */
function deckToDrawFor(station) {
  if (!station) return null
  if (station.type === 'chance' || station.type === 'fate') return station.type
  if (station.effect && station.effect.drawCard) return station.effect.drawCard
  if (station.event && station.event.effect && station.event.effect.drawCard)
    return station.event.effect.drawCard
  return null
}

/**
 * 依骰子點數把目前玩家往前移動，並從停留格抽出這一輪的題目與（若觸發）機會／命運卡。
 * 終點會「卡住」（不會超過最後一格），停在最後一格即視為抵達。
 * @param {object} state
 * @param {number} quizRoll 抽題用的隨機值 [0,1)，外部注入（保持引擎純函式、可重現）。
 * @param {number} cardRoll 抽卡用的隨機值 [0,1)，外部注入。
 */
export function advance(state, quizRoll = 0, cardRoll = 0) {
  if (state.phase !== 'rolled' || state.diceValue == null) return state

  const lastIndex = state.board.stations.length - 1
  const players = clonefPlayers(state.players)
  const player = players[state.currentPlayerIndex]

  const wanted = player.position + state.diceValue // 骰子原本要走到的位置
  let target = Math.min(wanted, lastIndex)
  let stopReason = wanted > lastIndex ? 'end' : null // 終點卡住（不能超過最後一站）
  // 必停檢查點：不可一步跨過（例如「海上遇風暴」必須停下來玩過才能前進）。
  // 夾在「目前位置之後、射程之內」的第一個 mustStop 站。
  for (let i = player.position + 1; i <= target; i++) {
    if (state.board.stations[i].mustStop) {
      if (i < target || stopReason === 'end') stopReason = 'mustStop'
      target = i
      break
    }
  }
  player.position = target
  const station = state.board.stations[target]

  // 提前停下的說明（給畫面顯示，免得玩家以為「步數和骰子不符」是 bug）。
  const moveNote =
    stopReason === 'mustStop'
      ? `⚓ 「${station.name}」是必停站——骰子擲出 ${state.diceValue} 點，但這裡必須停下來完成才能繼續前進。`
      : stopReason === 'end'
        ? `🏁 已抵達旅程終點——骰子擲出 ${state.diceValue} 點，多的步數不需要走了。`
        : null

  // 這一輪從該格題庫抽中哪一題（沒有題目則為 null）。
  const pendingQuizIndex = pickIndex(getQuizPool(station).length, quizRoll)

  // 這一格要不要抽卡（機會/命運），抽到第幾張同樣由外部注入的隨機值決定。
  const deckName = deckToDrawFor(station)
  const deck = deckName ? getDeck(state.board, deckName) : []
  const cardIdx = pickIndex(deck.length, cardRoll)
  const pendingCard = cardIdx == null ? null : { deck: deckName, index: cardIdx }

  return {
    ...state,
    players,
    pendingStationId: station.id,
    pendingQuizIndex,
    pendingCard,
    moveNote,
    lastMoverId: player.id,
    phase: 'resolving',
    log: pushLog(
      state.log,
      `${player.name} 擲出 ${state.diceValue}，前進到「${station.name}」。` +
        (stopReason === 'mustStop' ? '（必停站，先停下）' : stopReason === 'end' ? '（已到終點）' : ''),
    ),
  }
}

/** 取得目前待結算格子「這一輪抽中」的那一題（沒有題目則 null）。畫面與結算都用這一個。 */
export function getActiveQuiz(state) {
  if (!state || !state.pendingStationId) return null
  const station = getStation(state, state.pendingStationId)
  const pool = getQuizPool(station)
  if (!pool.length) return null
  const i = state.pendingQuizIndex == null ? 0 : state.pendingQuizIndex
  return pool[Math.min(pool.length - 1, Math.max(0, i))] || null
}

/** 取得這一輪抽中的機會／命運卡（含 deck 名稱）；沒有則 null。畫面與結算都用這一個。 */
export function getActiveCard(state) {
  if (!state || !state.pendingCard) return null
  const { deck, index } = state.pendingCard
  const cards = getDeck(state.board, deck)
  if (!cards.length) return null
  const card = cards[Math.min(cards.length - 1, Math.max(0, index))]
  return card ? { ...card, deck } : null
}

/**
 * 結算目前停留的格子。
 * @param {object} state
 * @param {object} payload 對問答格而言是 { answerIndex }；其他格忽略。
 */
export function resolve(state, payload = {}) {
  if (state.phase !== 'resolving' || !state.pendingStationId) return state

  const station = state.board.stations.find((s) => s.id === state.pendingStationId)
  const board = state.board
  const players = clonefPlayers(state.players)
  const player = players[state.currentPlayerIndex]
  const scoreLabel = state.board.scoreLabel || '分數'
  const startPoints = player.gospelPoints // 用回合開始的分數決定頭銜（避免本回合加分又回饋自己）

  let result = { stationId: station.id, type: station.type, lines: [] }
  let log = state.log

  // 1) 先套用這一格「本身」的效果（事件卡 / 劇情格）。
  //    每一格都可以再附一題問答（見步驟 2）——劇情與答題並存。
  if (station.type === 'event' && station.event) {
    const ev = station.event
    applyEffect(player, ev.effect, result, scoreLabel, board, `事件「${ev.title}」：`)
    result.eventTitle = ev.title
    result.eventKind = ev.kind
    if (ev.resultText) result.lines.unshift(ev.resultText)
    log = pushLog(log, `${player.name} 觸發事件「${ev.title}」。`)
  } else if (station.effect) {
    // start / story / end ：直接套用 effect（若有）。drawCard 不是即時效果，applyEffect 會略過。
    applyEffect(player, station.effect, result, scoreLabel, board, '劇情：')
  }

  // 1.5) 若這一格抽了機會／命運卡：套用卡片效果，並把卡片資訊記進結果（給畫面翻牌用）。
  const card = getActiveCard(state)
  if (card) {
    applyEffect(player, card.effect, result, scoreLabel, board, `${card.deck === 'fate' ? '命運' : '機會'}卡：`)
    result.card = { deck: card.deck, title: card.title, kind: card.kind, text: card.text }
    log = pushLog(log, `${player.name} 抽到${card.deck === 'fate' ? '命運' : '機會'}卡「${card.title}」。`)
  }

  // 1.7) 小遊戲（闖關）：結果由外部注入 payload.minigameWon（過關加分）。
  if (station.minigame) {
    const mg = station.minigame
    result.minigame = true
    result.minigameWon = !!payload.minigameWon
    if (payload.minigameWon) {
      const pts = mg.winPoints || 3
      player.gospelPoints += pts
      result.lines.push(`闖關成功！${scoreLabel} +${pts}`)
      log = pushLog(log, `${player.name} 闖關成功，${scoreLabel} +${pts}。`)
      const mb = passiveBonus(board, player, 'minigameBonus', startPoints)
      if (mb.bonus > 0) {
        player.gospelPoints += mb.bonus
        result.lines.push(`有 ${mb.sources.join('、')} 相助，闖關額外 +${mb.bonus}`)
      }
    } else {
      result.lines.push('闖關沒成功，沒關係，重要的是有嘗試！')
      log = pushLog(log, `${player.name} 闖關未過關。`)
    }
  }

  // 2) 不論格子類型，只要這一格有問答題就計分（每座城市都能靠答題賺點數）。
  //    用 getActiveQuiz 取「這一輪抽中的那一題」——和畫面顯示的必定是同一題。
  const q = getActiveQuiz(state)
  if (q) {
    const correct = payload.answerIndex === q.answerIndex
    const reward = q.reward || 1
    result.quiz = true
    result.correct = correct
    result.answerIndex = q.answerIndex
    result.explanation = q.explanation
    if (correct) {
      player.gospelPoints += reward
      result.lines.push(`答對了！${scoreLabel} +${reward}`)
      log = pushLog(log, `${player.name} 答對問答，${scoreLabel} +${reward}。`)
      const qb = passiveBonus(board, player, 'quizBonus', startPoints)
      if (qb.bonus > 0) {
        player.gospelPoints += qb.bonus
        result.lines.push(`有 ${qb.sources.join('、')} 相助，答對額外 +${qb.bonus}`)
      }
    } else {
      result.lines.push('答錯了，這一題沒有加分——沒關係，再接再厲！')
      log = pushLog(log, `${player.name} 答錯了問答。`)
    }
  }

  // 抵達終點？
  if (player.position === state.board.stations.length - 1) {
    player.finished = true
  }

  // 記下這位玩家目前的頭銜（給畫面顯示用；board 沒設 titles 時為 null）。
  const title = getTitle(board, player.gospelPoints)
  result.title = title ? title.name : null

  return {
    ...state,
    players,
    lastResult: result,
    phase: 'turnEnd',
    log,
  }
}

/** 把一個 effect 套用到玩家身上，並把人看得懂的描述寫進 result.lines。
 *  srcLabel：加分訊息的來源前綴（如「劇情：」「機會卡：」）——讓「事件加分」和「答題加分」
 *  分得清清楚楚，答錯問答時才不會把劇情的加分誤會成答錯也有分。 */
function applyEffect(player, effect, result, scoreLabel, board, srcLabel = '') {
  if (!effect) return
  if (typeof effect.gospelPoints === 'number' && effect.gospelPoints !== 0) {
    player.gospelPoints += effect.gospelPoints
    const sign = effect.gospelPoints > 0 ? '+' : ''
    result.lines.push(`${srcLabel}${scoreLabel} ${sign}${effect.gospelPoints}`)
  }
  if (effect.removeCompanion) {
    const idx = player.companions.indexOf(effect.removeCompanion)
    if (idx >= 0) {
      player.companions.splice(idx, 1)
      result.lines.push(`${effect.removeCompanion} 離隊了`)
    }
  }
  if (effect.addCompanion && !player.companions.includes(effect.addCompanion)) {
    player.companions.push(effect.addCompanion)
    result.lines.push(`${effect.addCompanion} 加入了！`)
  }
  // 屬靈裝備/恩賜（全副軍裝，弗 6）：擁有後給被動加成（見 board.gifts 與 resolve 的 passiveBonus）。
  if (effect.removeGift) {
    if (!player.gifts) player.gifts = []
    const gi = player.gifts.indexOf(effect.removeGift)
    if (gi >= 0) player.gifts.splice(gi, 1)
  }
  if (effect.addGift) {
    if (!player.gifts) player.gifts = []
    if (!player.gifts.includes(effect.addGift)) {
      player.gifts.push(effect.addGift)
      const g = board && board.gifts && board.gifts[effect.addGift]
      result.lines.push(`配備了「${g ? g.name : effect.addGift}」！`)
    }
  }
  if (effect.skipNext) {
    // 信德的盾牌（帶 guard 旗標的裝備）可滅盡惡者一切的火箭——擋下「暫停一回合」。
    const shield = giftWith(board, player, 'guard')
    if (shield) {
      result.lines.push(`「${shield.name}」擋下了暫停一回合！`)
    } else {
      player.skipNext = true
      result.lines.push('下一回合暫停一次')
    }
  }
  // 卡片移動（如約拿命運卡「神安排大魚：前進 2 格」）：直接推移棋子、夾在棋盤範圍內。
  // 是「被送了一程」的紅利移動——不觸發新落點的劇情/問答，也不卡必停站（大魚直接載過去）。
  if (typeof effect.move === 'number' && effect.move !== 0 && board) {
    const lastIdx = board.stations.length - 1
    const from = player.position
    player.position = Math.max(0, Math.min(lastIdx, from + effect.move))
    const delta = player.position - from
    if (delta > 0) result.lines.push(`🎲 順勢前進 ${delta} 格，來到「${board.stations[player.position].name}」`)
    else if (delta < 0) result.lines.push(`↩️ 往後退 ${-delta} 格，回到「${board.stations[player.position].name}」`)
  }
}

/** 玩家身上是否有「帶某 flag（如 guard）」的裝備；回傳該裝備資料或 null。 */
function giftWith(board, player, flag) {
  const gifts = (board && board.gifts) || {}
  for (const id of player.gifts || []) {
    const g = gifts[id]
    if (g && g[flag]) return g
  }
  return null
}

/**
 * 依分數門檻取得頭銜（board.titles 是 [{ min, name, quizBonus? }]）。
 * 回傳符合的「最高門檻」者，或 null（board 沒設 titles 時）。
 */
export function getTitle(board, points) {
  const titles = (board && board.titles) || []
  let best = null
  for (const t of titles) {
    const min = t.min || 0
    if (points >= min && (!best || min >= (best.min || 0))) best = t
  }
  return best
}

/**
 * 算「答對問答 / 闖關過關」的被動額外加成（同工 + 裝備/恩賜 + 頭銜），純由 board 資料驅動。
 * @param key 'quizBonus' | 'minigameBonus'
 * @param titlePoints 判定頭銜用的分數（用回合開始的分數，避免本回合加分又回饋自己）
 * 回傳 { bonus, sources[] }；board 沒設這些資料時回 { bonus:0, sources:[] }（向後相容）。
 */
function passiveBonus(board, player, key, titlePoints) {
  let bonus = 0
  const sources = []
  const companions = (board && board.companions) || {}
  for (const name of player.companions) {
    const c = companions[name]
    if (c && c[key]) {
      bonus += c[key]
      sources.push(c.label || name)
    }
  }
  const gifts = (board && board.gifts) || {}
  for (const id of player.gifts || []) {
    const g = gifts[id]
    if (g && g[key]) {
      bonus += g[key]
      sources.push(g.name || id)
    }
  }
  const title = getTitle(board, titlePoints)
  if (title && title[key]) {
    bonus += title[key]
    sources.push(title.name)
  }
  return { bonus, sources }
}

/**
 * 找出下一個「還沒抵達終點、且不需要暫停」的玩家索引；途中清掉 skipNext 旗標。
 * 注意：finished（已抵達終點，永久出局）與 skipNext（暫停一回合）是兩回事——
 * 只要還有人沒抵達終點就一定要回傳某個人，不能因為大家都在「暫停」就誤判遊戲結束。
 * 最多繞兩圈：第一圈把途中的 skipNext 用掉，第二圈必定找得到可行動者。
 */
function nextActiveIndex(players, fromIndex) {
  const n = players.length
  if (!players.some((p) => !p.finished)) return -1 // 真的全部抵達終點了
  let idx = fromIndex
  for (let step = 0; step < n * 2; step++) {
    idx = (idx + 1) % n
    const p = players[idx]
    if (p.finished) continue
    if (p.skipNext) {
      p.skipNext = false // 用掉這次暫停
      continue
    }
    return idx
  }
  return -1
}

/** 結束目前回合，輪到下一位玩家；同時推進回合數並判斷遊戲是否結束。 */
export function endTurn(state) {
  if (state.phase !== 'turnEnd') return state

  const status = getGameStatus(state)
  if (status.over) {
    return { ...state, phase: 'gameover', diceValue: null, pendingStationId: null, pendingQuizIndex: null, pendingCard: null, moveNote: null }
  }

  const players = clonefPlayers(state.players)
  const nextIndex = nextActiveIndex(players, state.currentPlayerIndex)

  // 沒有人能再行動（全部完成或全部卡住）→ 結束
  if (nextIndex === -1) {
    return { ...state, players, phase: 'gameover', diceValue: null, pendingStationId: null, pendingQuizIndex: null, pendingCard: null, moveNote: null }
  }

  return {
    ...state,
    players,
    currentPlayerIndex: nextIndex,
    diceValue: null,
    pendingStationId: null,
    pendingQuizIndex: null,
    pendingCard: null,
    moveNote: null,
    lastResult: null,
    turnCount: state.turnCount + 1,
    phase: 'idle',
  }
}

/**
 * 唯一回答「遊戲結束了嗎」的函式。涵蓋：
 *   - 所有玩家都抵達終點 → 結束（不再是「第一個到的人贏」，而是大家都走完）。
 *   - 超過回合上限（turnCap）→ 強制結束（防止任何理論上的無限迴圈）。
 * 勝負：以「福音點數」最高者為勝 —— 讓答對聖經問答、把握事件真正決定輸贏，
 *       而不是擲骰運氣誰先到終點。同分時才比抵達與否、再比位置。
 * 回傳 { over, winnerId, reason, ranking }。
 */
export function getGameStatus(state) {
  const turnCap = state.board.turnCap || 200

  const everyoneFinished = state.players.every((p) => p.finished)
  let over = false
  let reason = null

  if (everyoneFinished) {
    over = true
    reason = 'all_finished'
  } else if (state.turnCount >= turnCap) {
    over = true
    reason = 'turn_cap'
  }

  // 名次：福音點數最高者獲勝；同分再看是否抵達終點，再看位置。
  const ranking = [...state.players].sort((a, b) => {
    if (b.gospelPoints !== a.gospelPoints) return b.gospelPoints - a.gospelPoints
    if (a.finished !== b.finished) return a.finished ? -1 : 1
    return b.position - a.position
  })

  return {
    over,
    reason,
    winnerId: over && ranking.length > 0 ? ranking[0].id : null,
    ranking,
  }
}

/** 小工具：取得某 station 物件。 */
export function getStation(state, stationId) {
  return state.board.stations.find((s) => s.id === stationId) || null
}

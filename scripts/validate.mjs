// ===========================================================================
// game-content-validator — drop-in, zero-dependency content checker
// ---------------------------------------------------------------------------
// Validate a data-driven game's content file before it reaches the engine.
// Catches: duplicate ids, missing required fields per item type, quiz
// answerIndex out of range, unknown effect keys (typos), bad ranges.
//
// Usage:   node validate.mjs path/to/content.json [more.json ...]
//          node validate.mjs            (no args = validates ALL src/data/journey*.json)
// Exit:    0 = clean (warnings allowed), 1 = at least one error in any file.
//
// Adapt by editing the CONFIG block below to your project's field names and
// effect vocabulary. Defaults match 保羅大富翁 (journey1.json).
// ===========================================================================
import { readFileSync, readdirSync } from 'node:fs'

// ---------------------------------------------------------------- CONFIG ----
const CONFIG = {
  defaultFile: 'src/data/journey1.json',
  itemsField: 'tiles_or_stations', // resolved below (auto-detects common names)
  idField: 'id',
  typeField: 'type',
  topLevelRequired: ['title'], // top-level keys that must exist
  // Required fields per item type. Dotted paths allowed (e.g. 'quiz.answerIndex').
  requiredByType: {
    start: [],
    story: [],
    rest: [],
    end: [],
    event: ['event.title', 'event.effect'],
    // quiz 型格子的題目內容可放在單一 quiz，或 quizzes 陣列（多題隨機抽）——
    // 下面 quiz-specific 深檢會逐題驗證，這裡不再硬性指定 quiz.*。
    quiz: [],
    // 機會 / 命運專用格：內容來自 decks，本身不需額外欄位。
    chance: [],
    fate: [],
    // 闖關挑戰格：內容由 station.minigame 指定（嵌入即時小遊戲）。
    challenge: [],
  },
  // Allowed keys inside any `effect` (and the effect blocks nested in events),
  // with a type check. Unknown keys are reported as errors (likely typos).
  effectVocab: {
    points: 'number',
    gospelPoints: 'number', // 保羅大富翁's score key; keep both during migrations
    skipNext: 'boolean',
    addItem: 'string',
    removeItem: 'string',
    addCompanion: 'string',
    removeCompanion: 'string',
    addGift: 'string', // 配備一件屬靈裝備/恩賜（全副軍裝），值須對應到頂層 gifts。
    removeGift: 'string',
    move: 'number',
    drawCard: 'string', // 觸發抽卡，值是牌名（chance / fate），須對應到 decks。
  },
  // Optional numeric range checks: field -> [min, max]. Skipped if field absent.
  ranges: { x: [0, 100], y: [0, 100] },
}
// ------------------------------------------------------------ END CONFIG ----

// 無參數時自動驗證 src/data/ 下所有 journey*.json(未來新增旅程也自動涵蓋,CI 同受惠)。
const argFiles = process.argv.slice(2)
const FILES = argFiles.length
  ? argFiles
  : readdirSync('src/data')
      .filter((f) => /^journey.*\.json$/i.test(f))
      .sort()
      .map((f) => 'src/data/' + f)

// 整個單檔驗證流程包成函式(內文保持原縮排以便看 diff);回傳 true=該檔乾淨。
function validateFile(file) {
const errors = []
const warnings = []
const err = (m) => errors.push(m)
const warn = (m) => warnings.push(m)

let data
try {
  data = JSON.parse(readFileSync(file, 'utf-8'))
} catch (e) {
  console.error(`✗ Cannot read/parse ${file}: ${e.message}`)
  return false
}

// Resolve the items array: honor CONFIG, else auto-detect a common name.
const ITEM_KEYS = ['stations', 'tiles', 'levels', 'items', 'cards', 'questions']
let items = data[CONFIG.itemsField]
if (!Array.isArray(items)) {
  const key = ITEM_KEYS.find((k) => Array.isArray(data[k]))
  items = key ? data[key] : null
}
if (!Array.isArray(items)) {
  err(`No items array found (looked for CONFIG.itemsField + ${ITEM_KEYS.join('/')}).`)
}

for (const k of CONFIG.topLevelRequired) {
  if (data[k] === undefined) err(`Top-level field "${k}" is missing.`)
}

const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj)
const label = (it, i) => `item #${i + 1} (${it?.[CONFIG.idField] ?? 'no-id'})`

// The card decks (機會 / 命運); used to validate that drawCard points to a real deck.
const decks = data && data.decks && typeof data.decks === 'object' && !Array.isArray(data.decks) ? data.decks : {}
// 屬靈裝備/恩賜目錄（頂層 gifts）；用來檢查 addGift/removeGift 指到真的存在的恩賜。
const gifts = data && data.gifts && typeof data.gifts === 'object' && !Array.isArray(data.gifts) ? data.gifts : {}

// Validate one effect object against the vocab; drawCard must reference a real, non-empty deck.
function checkEffect(eff, ctx) {
  for (const [k, v] of Object.entries(eff)) {
    const expected = CONFIG.effectVocab[k]
    if (!expected) {
      err(`${ctx} unknown effect key "${k}" (typo? not in effectVocab).`)
      continue
    }
    if (typeof v !== expected) {
      err(`${ctx} effect "${k}" must be ${expected}, got ${typeof v}.`)
      continue
    }
    if (k === 'drawCard' && !(Array.isArray(decks[v]) && decks[v].length))
      err(`${ctx} effect drawCard:"${v}" has no matching non-empty deck in "decks".`)
    if ((k === 'addGift' || k === 'removeGift') && !gifts[v])
      err(`${ctx} effect ${k}:"${v}" has no matching entry in top-level "gifts".`)
  }
}

const seen = new Map()
;(items || []).forEach((it, i) => {
  if (it == null || typeof it !== 'object') {
    err(`${label(it, i)} is not an object.`)
    return
  }
  const id = it[CONFIG.idField]
  const type = it[CONFIG.typeField]

  // id present, string, unique
  if (id === undefined || id === '') err(`${label(it, i)} has no "${CONFIG.idField}".`)
  else if (typeof id !== 'string') err(`${label(it, i)} ${CONFIG.idField} must be a string.`)
  else if (seen.has(id)) err(`Duplicate ${CONFIG.idField} "${id}" (also ${label(items[seen.get(id)], seen.get(id))}).`)
  else seen.set(id, i)

  // type known
  if (type === undefined) err(`${label(it, i)} has no "${CONFIG.typeField}".`)
  else if (!(type in CONFIG.requiredByType)) warn(`${label(it, i)} has unknown type "${type}".`)

  // required fields per type
  for (const path of CONFIG.requiredByType[type] || []) {
    const v = get(it, path)
    if (v === undefined || v === null || v === '') err(`${label(it, i)} missing required "${path}".`)
  }

  // quiz-specific deep checks — run for ANY item carrying a question, whether a
  // single `quiz` object or a `quizzes` array (多題隨機抽). A quiz can ride on an
  // event/story/end tile too, so this is not gated on type === 'quiz'.
  if (it.quizzes !== undefined && !Array.isArray(it.quizzes))
    err(`${label(it, i)} "quizzes" must be an array.`)
  const pool = Array.isArray(it.quizzes) ? it.quizzes : it.quiz ? [it.quiz] : []
  if (type === 'quiz' && pool.length === 0)
    err(`${label(it, i)} type is "quiz" but has no quiz/quizzes.`)
  pool.forEach((q, qi) => {
    const where = pool.length > 1 ? `quiz[${qi}]` : 'quiz'
    if (!q || typeof q !== 'object') {
      err(`${label(it, i)} ${where} is not an object.`)
      return
    }
    if (q.question === undefined || String(q.question).trim() === '')
      err(`${label(it, i)} ${where} missing "question".`)
    if (q.explanation === undefined || String(q.explanation).trim() === '')
      err(`${label(it, i)} ${where} missing "explanation".`)
    if (Array.isArray(q.options)) {
      if (q.options.length < 2) err(`${label(it, i)} ${where} needs ≥2 options.`)
      if (typeof q.answerIndex === 'number') {
        if (q.answerIndex < 0 || q.answerIndex >= q.options.length)
          err(`${label(it, i)} ${where} answerIndex ${q.answerIndex} out of range [0, ${q.options.length - 1}].`)
      } else {
        err(`${label(it, i)} ${where} answerIndex must be a number.`)
      }
      const uniq = new Set(q.options.map((o) => String(o).trim()))
      if (uniq.size < q.options.length) warn(`${label(it, i)} ${where} has duplicate options.`)
    } else {
      err(`${label(it, i)} ${where}.options must be an array.`)
    }
  })

  // effect vocabulary (item.effect and event.effect)
  const effects = [it.effect, it.event?.effect].filter((e) => e && typeof e === 'object')
  for (const eff of effects) checkEffect(eff, label(it, i))

  // numeric ranges
  for (const [field, [min, max]] of Object.entries(CONFIG.ranges)) {
    const v = it[field]
    if (v === undefined) continue
    if (typeof v !== 'number') err(`${label(it, i)} "${field}" must be a number.`)
    else if (v < min || v > max) warn(`${label(it, i)} "${field}"=${v} outside [${min}, ${max}].`)
  }
})

// ---- decks（機會 / 命運卡）：每張卡的 title / effect / kind 深檢 ----
if (data.decks !== undefined) {
  if (typeof data.decks !== 'object' || Array.isArray(data.decks)) {
    err(`"decks" must be an object of named card arrays (e.g. { chance: [...], fate: [...] }).`)
  } else {
    for (const [name, cards] of Object.entries(data.decks)) {
      if (!Array.isArray(cards)) {
        err(`deck "${name}" must be an array.`)
        continue
      }
      if (cards.length === 0) warn(`deck "${name}" is empty.`)
      cards.forEach((c, ci) => {
        const ctx = `deck "${name}" card #${ci + 1}`
        if (!c || typeof c !== 'object') {
          err(`${ctx} is not an object.`)
          return
        }
        if (c.title === undefined || String(c.title).trim() === '') err(`${ctx} missing "title".`)
        if (c.text === undefined || String(c.text).trim() === '') warn(`${ctx} has empty "text".`)
        if (c.kind !== undefined && c.kind !== 'good' && c.kind !== 'bad')
          warn(`${ctx} kind "${c.kind}" is not good/bad.`)
        if (c.effect !== undefined) {
          if (c.effect && typeof c.effect === 'object') checkEffect(c.effect, ctx)
          else err(`${ctx} "effect" must be an object.`)
        }
        // 規則：每張機會／命運卡都必須加或減福音點數（effect.gospelPoints 為非 0 數字）。
        const gp = c.effect && c.effect.gospelPoints
        if (typeof gp !== 'number' || gp === 0)
          err(`${ctx} 每張卡都必須加或減點數：effect.gospelPoints 需為非 0 的數字。`)
      })
    }
  }
}

// ----------------------------------------------------------------- report ---
console.log(`\nValidated ${file} — ${items?.length ?? 0} items.`)
if (warnings.length) {
  console.log(`\n⚠ ${warnings.length} warning(s):`)
  warnings.forEach((w) => console.log('   - ' + w))
}
if (errors.length) {
  console.log(`\n✗ ${errors.length} error(s):`)
  errors.forEach((e) => console.log('   - ' + e))
  return false
}
console.log(warnings.length ? '✓ No errors (warnings above).' : '✓ All checks passed.')
return true
}

let allOk = true
for (const f of FILES) if (!validateFile(f)) allOk = false
if (!allOk) {
  console.log('\n✗ 有內容檔未通過驗證(見上方錯誤)。\n')
  process.exit(1)
}
console.log(`\n✓ ${FILES.length} 個內容檔全部通過。\n`)

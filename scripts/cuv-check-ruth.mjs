// cuv-check-ruth.mjs — /cuv-check 的一次性執行腳本(只讀、只報告):
// 掃 journey-ruth.json + gleaning/content.js:①每個括號 ref 的「存在性」(查無此節=🔴)
// ②緊鄰(含括號內帶註記)的「引文」逐字比對(標點/引號不比,「……」=省略;對不上=🟠)
// ③引文在附近但不緊鄰 → 也驗;驗不過標 🟡 請人工(配對是啟發式,不妄判)。
// 權威資料=cuv MCP 同一份 unv.json。
import { readFileSync, writeFileSync } from 'node:fs'

const UNV = JSON.parse(readFileSync('C:/Users/HFP/.claude/cuv-data/unv.json', 'utf8'))
const BOOKS = {
  創: 1, 創世記: 1, 利: 3, 利未記: 3, 申: 5, 申命記: 5, 士: 7, 士師記: 7,
  得: 8, 路得記: 8, 撒上: 9, 撒母耳記上: 9, 王上: 11, 列王紀上: 11,
  結: 26, 以西結書: 26, 太: 40, 馬太福音: 40, 弗: 49, 以弗所書: 49, 加: 48, 加拉太書: 48,
}
const BOOK_ALT = Object.keys(BOOKS).sort((a, b) => b.length - a.length).join('|')
const REF_RE = new RegExp(`(${BOOK_ALT})\\s*(\\d+)[::](\\d+)(?:[-–~](\\d+))?`, 'g')
const norm = (s) => s.replace(/[「」『』,,、。..;;::!!??……·・()()〔〕【】\s—–─-]/g, '')

function versesText(book, ch, v1, v2) {
  const c = (UNV[String(BOOKS[book])] || {})[String(ch)]
  if (!c) return null
  let out = ''
  for (let v = v1; v <= (v2 || v1); v++) { if (!c[String(v)]) return null; out += c[String(v)] }
  return out
}

const rows = []
function quoteMatches(quote, authoritative) {
  const hay = norm(authoritative)
  const segs = quote.split(/…+|\.{3,}/).map(norm).filter(Boolean)
  let pos = 0
  for (const seg of segs) {
    const i = hay.indexOf(seg, pos)
    if (i < 0) return { ok: false, bad: seg }
    pos = i + seg.length
  }
  return { ok: true }
}

function scan(fileLabel, s) {
  for (const pm of s.matchAll(/[(（]([^))]{1,60})[)）]/g)) {
    const inner = pm[1]
    const refs = [...inner.matchAll(REF_RE)]
    if (!refs.length) continue
    // ① 每個 ref 存在性
    const resolved = []
    for (const r of refs) {
      const [, book, ch, v1, v2] = r
      const text = versesText(book, +ch, +v1, v2 ? +v2 : undefined)
      const label = `${book} ${ch}:${v1}${v2 ? '-' + v2 : ''}`
      if (text == null) rows.push(['🔴', fileLabel, label, '查無此節(章節越界或標錯)'])
      else resolved.push({ label, text })
    }
    if (!resolved.length) continue
    // ② 找附近引文:往前最多 90 字,取「最後一個」完整「…」引文
    const pre = s.slice(Math.max(0, pm.index - 90), pm.index)
    const qs = [...pre.matchAll(/「([^「」]{4,})」/g)]
    if (!qs.length) { rows.push(['🟢', fileLabel, resolved.map((x) => x.label).join('、'), '(僅出處/敘述,無逐字引文)']); continue }
    const q = qs[qs.length - 1]
    const gapLen = pre.length - (q.index + q[0].length) // 引文結尾到括號的距離
    const verdicts = resolved.map((x) => quoteMatches(q[1], x.text))
    const anyOk = verdicts.some((v) => v.ok)
    const label = resolved.map((x) => x.label).join('、')
    if (anyOk) rows.push(['🟢', fileLabel, label, gapLen <= 1 ? '' : `(引文距 ref ${gapLen} 字,已驗相符)`])
    else if (gapLen <= 1)
      rows.push(['🟠', fileLabel, label, `引文與和合本不符 → 遊戲寫:「${q[1]}」\n    和合本:${resolved[0].text}`])
    else rows.push(['🟡', fileLabel, label, `附近引文「${q[1].slice(0, 30)}…」與此 ref 對不上(距 ${gapLen} 字,可能引的是別節)——請人工看`])
  }
}

const journeyRaw = readFileSync('src/data/journey-ruth.json', 'utf8')
scan('journey-ruth.json', journeyRaw)
scan('gleaning/content.js', readFileSync('src/minigames/gleaning/content.js', 'utf8'))
// 站點 scripture 欄(無括號)存在性
for (const st of JSON.parse(journeyRaw).stations) {
  if (!st.scripture) continue
  for (const one of st.scripture.split(/[;；]/)) {
    const r = one.trim().match(new RegExp(`^(${BOOK_ALT})\\s*(\\d+)[::](\\d+)(?:[-–~](\\d+))?$`))
    if (!r) { rows.push(['🟡', `station:${st.id}`, one.trim(), 'scripture 欄樣式解析不了(人工看)']); continue }
    const t = versesText(r[1], +r[2], +r[3], r[4] ? +r[4] : undefined)
    rows.push([t == null ? '🔴' : '🟢', `station:${st.id}`, one.trim(), t == null ? '查無此節' : '(出處存在)'])
  }
}

const count = { '🔴': 0, '🟠': 0, '🟡': 0, '🟢': 0 }
let out = '# /cuv-check — hfpc-ruth-game 完整版(journey + content.js)\n\n'
for (const [lv, f, ref, note] of rows) {
  count[lv]++
  if (lv !== '🟢') out += `${lv} ${f} | ${ref} | ${note}\n`
}
out += `\n🟢 相符/存在(${count['🟢']} 處,含逐字引文與僅出處)\n`
for (const [lv, f, ref, note] of rows) if (lv === '🟢' && note && note !== '(出處存在)') out += `  🟢 ${f} | ${ref} ${note}\n`
out += `\n合計:🔴${count['🔴']} 🟠${count['🟠']} 🟡${count['🟡']} 🟢${count['🟢']}(共 ${rows.length} 處)\n`
writeFileSync('../cuv-check-ruth-report.md', out, 'utf8')
console.log('done', JSON.stringify(count))

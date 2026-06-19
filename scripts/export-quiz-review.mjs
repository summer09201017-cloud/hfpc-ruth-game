#!/usr/bin/env node
// 老師「解答卷」一鍵匯出：把 journey JSON 的題目/卡牌/站點文案整理成可列印的審核清單。
// 用法：node scripts/export-quiz-review.mjs src/data/journey-daniel.json [更多檔...] [--out=docs/題庫送審清單.html]
// 零相依;輸出單一 HTML(瀏覽器開啟→Ctrl+P 即可印或存 PDF)。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
const outArg = args.find(a => a.startsWith('--out='));
const files = args.filter(a => !a.startsWith('--'));
if (!files.length) {
  console.error('用法：node scripts/export-quiz-review.mjs <journey.json>... [--out=docs/xxx.html]');
  process.exit(1);
}
const outPath = resolve(outArg ? outArg.slice(6) : 'docs/題庫送審清單.html');

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function effectText(effect) {
  if (!effect) return '';
  const parts = [];
  if (effect.gospelPoints != null) parts.push(`點數 ${effect.gospelPoints > 0 ? '+' : ''}${effect.gospelPoints}`);
  if (effect.skipNext) parts.push('暫停一回合');
  if (effect.move != null) parts.push(`移動 ${effect.move > 0 ? '+' : ''}${effect.move} 格`);
  if (effect.addCompanion) parts.push(`同工加入：${effect.addCompanion}`);
  if (effect.removeCompanion) parts.push(`同工離開：${effect.removeCompanion}`);
  if (effect.addGift) parts.push(`獲得裝備：${effect.addGift}`);
  if (effect.removeGift) parts.push(`失去裝備：${effect.removeGift}`);
  if (effect.drawCard) parts.push(`抽${effect.drawCard === 'chance' ? '機會' : '命運'}卡`);
  return parts.join('、');
}

function quizHtml(quiz, label) {
  const opts = quiz.options.map((o, i) => {
    const isAns = i === quiz.answerIndex;
    return `<li class="${isAns ? 'ans' : ''}">${isAns ? '✅ ' : ''}${esc(o)}</li>`;
  }).join('');
  return `<div class="quiz"><div class="q">☐ ${label}：${esc(quiz.question)}${quiz.reward != null ? ` <span class="meta">（答對 +${quiz.reward}）</span>` : ''}</div>
  <ol class="opts">${opts}</ol>
  ${quiz.explanation ? `<div class="explain">💡 ${esc(quiz.explanation)}</div>` : ''}</div>`;
}

function journeyHtml(j, file) {
  let html = `<section class="journey"><h1>${esc(j.title)}</h1>
  <p class="sub">${esc(j.subtitle ?? '')} ｜ 計分：${esc(j.scoreLabel ?? '福音點數')} ｜ 來源：<code>${esc(file)}</code></p>
  <p class="howto">審核方式：每題打勾 ☐ → ✔ 通過；要改的圈起來寫在旁邊。✅ 是程式裡設定的正確答案。</p>`;

  // 站點（依序）
  let quizCount = 0;
  for (const st of j.stations ?? []) {
    const bits = [];
    if (st.text) bits.push(`<div class="story">📜 劇情：${esc(st.text)}</div>`);
    if (st.event) bits.push(`<div class="event">⚡ 事件【${esc(st.event.title ?? '')}】${esc(st.event.resultText ?? '')} <span class="eff">${esc(effectText(st.event.effect))}</span></div>`);
    if (st.effect && !st.event) bits.push(`<div class="event"><span class="eff">${esc(effectText(st.effect))}</span></div>`);
    if (st.minigame) bits.push(`<div class="mg">🎮 闖關：${esc(st.minigame.label ?? `第 ${st.minigame.level} 關`)}（過關 +${st.minigame.winPoints ?? '?'}）${st.mustStop ? '・必停' : ''}</div>`);
    const quizzes = st.quizzes ?? (st.quiz ? [st.quiz] : []);
    for (const q of quizzes) { quizCount++; bits.push(quizHtml(q, `題 ${quizCount}`)); }
    html += `<div class="station"><h3>${esc(st.name)} <span class="meta">(${esc(st.type)}${st.scripture ? '・' + esc(st.scripture) : ''})</span></h3>${bits.join('')}</div>`;
  }

  // 卡牌
  for (const [key, label] of [['chance', '機會卡'], ['fate', '命運卡']]) {
    const deck = j.decks?.[key];
    if (!deck?.length) continue;
    html += `<h2>🃏 ${label}（${deck.length} 張）</h2>`;
    for (const c of deck) {
      html += `<div class="card ${c.kind}"><div class="q">☐ 【${esc(c.title)}】${esc(c.text)}</div><div class="eff">→ ${esc(effectText(c.effect))}</div></div>`;
    }
  }

  // RPG 層
  if (j.gifts && Object.keys(j.gifts).length) {
    html += `<h2>🎒 屬靈裝備</h2>`;
    for (const [id, g] of Object.entries(j.gifts)) {
      html += `<div class="card"><div class="q">☐ ${g.icon ?? ''} 【${esc(g.name)}】（${esc(g.ref ?? '')}）${esc(g.blurb ?? '')}</div></div>`;
    }
  }
  if (j.companions && Object.keys(j.companions).length) {
    html += `<h2>👥 同工</h2>`;
    for (const [name, c] of Object.entries(j.companions)) {
      html += `<div class="card"><div class="q">☐ 【${esc(c.label ?? name)}】${esc(c.blurb ?? '')}</div></div>`;
    }
  }
  if (j.titles?.length) {
    html += `<h2>🏅 頭銜</h2><div class="card"><div class="q">☐ ${j.titles.map(t => `${t.min} 分起「${esc(t.name)}」`).join(' → ')}</div></div>`;
  }
  html += `<p class="count">本旅程共 ${quizCount} 題、機會卡 ${j.decks?.chance?.length ?? 0} 張、命運卡 ${j.decks?.fate?.length ?? 0} 張。</p></section>`;
  return html;
}

// 卡片流程闖關的文案（src/minigames/cards/specs.js）也要過審：--cards=<specs.js 路徑>
async function cardGamesHtml(specPath) {
  const { CARD_GAMES } = await import('file://' + resolve(specPath));
  let html = `<section class="journey"><h1>卡片流程闖關文案</h1>
  <p class="sub">來源：<code>${esc(specPath)}</code>（金像之夢/牆上的字/十災/十誡/兩個終局反思）</p>
  <p class="howto">這些是玩家在闖關彈窗裡逐張看到的卡片。✅ 是正解；「依序點選」題列出的就是正確順序。</p>`;
  for (const [key, g] of Object.entries(CARD_GAMES)) {
    html += `<h2>${esc(g.title)} <span class="meta">(${esc(key)})</span></h2>`;
    html += `<div class="card"><div class="q">☐ 開場：${esc(g.intro.kicker)}</div>${g.intro.ref ? `<div class="explain">📖 ${esc(g.intro.ref)}｜${esc(g.intro.line ?? '')}</div>` : ''}<div class="explain">${esc(g.intro.body)}</div></div>`;
    let n = 0;
    for (const st of g.steps) {
      n++;
      const reveal = st.reveal ? `<div class="explain">📖 ${esc(st.reveal.ref ?? '')}｜${esc(st.reveal.line ?? '')}<br>💡 ${esc(st.reveal.explain ?? '')}</div>` : '';
      if (st.kind === 'order') {
        html += `<div class="quiz"><div class="q">☐ 步驟 ${n}（依序點選）：${esc(st.prompt)}</div><ol class="opts">${st.items.map(i => `<li class="ans">✅ ${esc(i)}</li>`).join('')}</ol>${reveal}</div>`;
      } else if (st.kind === 'question') {
        html += `<div class="quiz"><div class="q">☐ 步驟 ${n}：${esc(st.q)}</div><ol class="opts">${st.choices.map((c, i) => `<li class="${i === st.answer ? 'ans' : ''}">${i === st.answer ? '✅ ' : ''}${esc(c)}</li>`).join('')}</ol>${reveal}</div>`;
      } else {
        html += `<div class="card"><div class="q">☐ 步驟 ${n}（劇情卡）：${esc(st.kicker)}</div><div class="explain">${esc(st.body ?? '')}</div></div>`;
      }
    }
    html += `<div class="card"><div class="q">☐ 結尾：${esc(g.done.kicker)}</div><div class="explain">${esc(g.done.body)}</div></div>`;
  }
  html += `</section>`;
  return html;
}

const cardsArg = args.find(a => a.startsWith('--cards='));
let sections = files.map(f => journeyHtml(JSON.parse(readFileSync(resolve(f), 'utf8')), f)).join('\n');
if (cardsArg) sections += await cardGamesHtml(cardsArg.slice(8));
const today = new Date().toISOString().slice(0, 10);
const doc = `<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="utf-8">
<title>題庫送審清單 ${today}</title>
<style>
body { font-family: "Microsoft JhengHei", "Noto Sans TC", sans-serif; max-width: 52rem; margin: 1rem auto; padding: 0 1rem; line-height: 1.55; color: #1a1a1a; }
h1 { border-bottom: 3px solid #2c5f8a; padding-bottom: .3rem; }
h2 { color: #2c5f8a; margin-top: 1.6rem; }
h3 { margin: 1.1rem 0 .2rem; } .meta { font-weight: normal; color: #777; font-size: .85em; }
.sub, .howto { color: #555; } .howto { background: #fff8e1; padding: .4rem .7rem; border-radius: 6px; }
.station { border-left: 3px solid #ddd; padding-left: .8rem; margin-bottom: .6rem; page-break-inside: avoid; }
.quiz, .card { background: #f7f9fb; border: 1px solid #e0e6ec; border-radius: 6px; padding: .45rem .7rem; margin: .35rem 0; page-break-inside: avoid; }
.card.bad { background: #fdf3f3; } .q { font-weight: 600; }
.opts { margin: .2rem 0 .2rem 1.4rem; } .opts li.ans { color: #1b7a2f; font-weight: 700; }
.ref, .explain, .eff, .mg, .event, .story { font-size: .92em; color: #444; }
.ref { color: #7a5c1b; } .count { color: #2c5f8a; font-weight: 600; }
.journey { page-break-after: always; }
@media print { body { max-width: none; } .quiz, .card { background: #fff; } }
</style></head><body>
<p style="color:#888">產生：${today} ｜ 給牧者/老師的審核清單（✅=程式設定的正解；請逐題打勾或圈出要改的）</p>
${sections}
</body></html>`;
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, doc);
console.log(`✓ 已輸出 ${outPath}（${files.length} 條旅程）`);

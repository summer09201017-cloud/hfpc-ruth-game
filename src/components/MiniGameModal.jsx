import { useEffect, useRef, useState } from 'react'
import { Game } from '../minigames/jonah/game'
import { Game as SlingGame } from '../minigames/sling/game'
import { Game as ElijahGame } from '../minigames/elijah/game'
import { Game as GleaningGame } from '../minigames/gleaning/game'
import { Game as ArkPairsGame } from '../minigames/arkpairs/game'
import { Game as ArkBuildGame } from '../minigames/arkbuild/game'
import CardGame from '../minigames/cards/CardGame'
import { CARD_GAMES } from '../minigames/cards/specs'
import { sound } from '../audio/sound'

// 各關的標題與玩法說明（顯示在開始前的提示卡）。
const LEVELS = {
  1: {
    title: '🏃 上岸趕路',
    how: '空白鍵 / ↑ / 點畫面 = 跳，躲過障礙，跑到終點就過關！',
  },
  2: {
    title: '🌊 海上遇風暴',
    how: '船在風浪中搖晃！用 ← → 方向鍵（或點畫面左右兩側）把船扶正，撐過風暴就過關！',
  },
  3: {
    title: '🐋 大魚肚中的禱告',
    how: '黑暗魚腹中：按住 →（或畫面右半）往前走、↑/空白跳、↓/畫面左半 蹲下鑽過骨頭；跳起碰到禱告蠟燭，答對點亮五盞禱告之光就過關（這一關不會失敗）。',
  },
  4: {
    title: '🏜️ 曠野趕路 → 尼尼微',
    how: '空白鍵 / ↑ / 點畫面 = 跳，穿過曠野、躲過障礙，跑到尼尼微城門就過關！',
  },
  5: {
    title: '📣 尼尼微傳道',
    how: '按住 →（或畫面右半）在大城往前走，走到居民面前停下對話、宣告神的話；五位（含王）都悔改就過關（這一關不會失敗）。',
  },
  6: {
    title: '🌿 蓖麻樹的功課',
    how: '看五幕「神的安排」：蓖麻、蟲子、東風……每幕結束回答一個反思題（輕點可跳過動畫；這一關不會失敗）。',
  },
  // —— 戰爭闖關原型（出 17 / 出 14 / 代下 20 / 民 22），由 sync:jonah 自約拿引擎帶入 ——
  7: {
    title: '🙌 摩西舉手之戰',
    how: '摩西在山頂舉手，以色列就得勝。手會痠而下垂——按住畫面／方向鍵把手撐住；後段自己撐不住時，亞倫、戶珥會來扶手。撐到底就得勝（出 17）。',
  },
  8: {
    title: '🌊 紅海奔逃',
    how: '法老戰車在後追趕！先站住等候神把海完全分開，海路一開就快跑過乾海床、跳過礁石衝到對岸；海水合攏淹沒追兵就得勝（出 14）。空白鍵／↑／點畫面 = 跳；按住 →／D／畫面右側 = 加速衝刺。',
  },
  9: {
    title: '🎵 聖歌奇兵 · 約沙法',
    how: '沒有刀劍，只有讚美。按住畫面／方向鍵／空白鍵 = 帶領詩班持續讚美；讚美夠高詩班就前進、敵軍自亂。撐住讚美到底就得勝（代下 20）。',
  },
  10: {
    title: '🫏 反轉奇兵 · 巴蘭的驢',
    how: '用 ↑ ↓（或點畫面）上下移動驢，避開站在路上拔刀的使者（巴蘭看不見，只有驢看見）。走到底、神開巴蘭的眼就得勝（民 22）。',
  },
}

// 卡片流程關（3/5/6）：引擎的 ui.showXxx 由下面的 EmbedUI 接手畫成 React 卡片。
const CARD_LEVELS = new Set([3, 5, 6])

// 建立「會畫卡片的嵌入 UI」：把引擎的 showFish*/showPreach*/showGourd* 轉成 setCard(規格)，
// 其餘 ui 方法（標題/暫停鈕/過關選單…）一律無動作（Proxy 兜底）。
function makeEmbedUI(setCard) {
  const intro = (prefix, btn) => (L) =>
    setCard({
      kind: 'intro',
      prefix,
      kicker: L.title,
      sub: L.subtitle,
      ref: L.ref,
      verse: L.verse,
      body: L.intro,
      btn,
      act: `${prefix}-begin`,
    })
  const tryAgain = (prefix, body, btn) => () =>
    setCard({ kind: 'tryagain', prefix, body, btn, act: `${prefix}-retry` })

  const impl = {
    hide: () => setCard(null),
    // ---- 第三關 大魚肚 ----
    showFishIntro: intro('fish', '🚶 進入魚腹'),
    showFishQuestion: (st, idx, total) =>
      setCard({
        kind: 'question',
        prefix: 'fish',
        kicker: `🐋 魚腹中的禱告　${idx + 1} / ${total}`,
        q: st.q,
        choices: st.choices,
      }),
    showFishReveal: (st, last) =>
      setCard({
        kind: 'reveal',
        prefix: 'fish',
        kicker: '✓ 一同禱告',
        ref: st.ref,
        line: st.line,
        explain: st.explain,
        btn: last ? '🌅 浮上水面' : '繼續前行 →',
        act: 'fish-continue',
      }),
    showFishTryAgain: tryAgain(
      'fish',
      '這一段禱告還沒答對。再讀一次題目，想想約拿的心，然後再選一次。',
      '再試一次',
    ),
    // ---- 第五關 尼尼微傳道 ----
    showPreachIntro: intro('preach', '📣 進城傳道'),
    showPreachDialog: (st, idx, total) =>
      setCard({
        kind: 'question',
        prefix: 'preach',
        kicker: `📣 尼尼微傳道　${idx + 1} / ${total}`,
        name: `${st.emoji} ${st.name}`,
        say: st.say,
        q: st.q,
        choices: st.choices,
      }),
    showPreachReveal: (st, last) =>
      setCard({
        kind: 'reveal',
        prefix: 'preach',
        kicker: `🙇 ${st.name} 悔改了`,
        ref: st.ref,
        line: st.line,
        explain: st.explain,
        btn: last ? '🕊️ 看神的回應' : '繼續前行 →',
        act: 'preach-continue',
      }),
    showPreachTryAgain: tryAgain(
      'preach',
      '他還沒被說服。再讀一次他的話，想想經文怎麼說，然後再宣告一次。',
      '再說一次',
    ),
    // ---- 第六關 蓖麻樹 ----
    showGourdIntro: intro('gourd', '🌿 坐到棚下'),
    showGourdQuestion: (st, idx, total) =>
      setCard({
        kind: 'question',
        prefix: 'gourd',
        kicker: `🌿 蓖麻樹下　第 ${idx + 1} / ${total} 幕 · ${st.name}`,
        q: st.q,
        choices: st.choices,
      }),
    showGourdReveal: (st, last) =>
      setCard({
        kind: 'reveal',
        prefix: 'gourd',
        kicker: `✓ ${st.name}`,
        ref: st.ref,
        line: st.line,
        explain: st.explain,
        btn: last ? '📖 全書終' : '下一幕 →',
        act: 'gourd-continue',
      }),
    showGourdTryAgain: tryAgain(
      'gourd',
      '回想剛才那一幕發生了什麼，經文怎麼說，然後再選一次。',
      '再試一次',
    ),
  }
  return new Proxy(impl, { get: (t, k) => (k in t ? t[k] : () => {}) })
}

// 把約拿的即時小遊戲嵌進保羅彈窗：掛一個 canvas，啟動引擎（嵌入模式），
// 過關 / 失敗時呼叫 onComplete({ won, score, level })，由外層換算成福音點數。
export default function MiniGameModal({ minigame, onComplete }) {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const [started, setStarted] = useState(false)
  const [card, setCard] = useState(null) // 3/5/6 卡片流程關目前顯示的卡（null=遊戲畫面）

  // 純 React 卡片流程關（in-repo，src/minigames/cards/）：站點用 minigame.cards 指定規格，
  // 不啟動 Canvas 引擎（與約拿 fork 無關，sync:jonah 不會碰到）。
  const cardSpec = minigame.cards ? CARD_GAMES[minigame.cards] : null
  // in-repo 拋射引擎（src/minigames/sling/）：站點用 minigame.engine:'sling' 指定，Canvas 即時關，
  // 同樣在約拿 fork 之外。未來其他投擲關（擲矛/射箭）也走這條。
  const isSling = minigame.engine === 'sling'
  // in-repo 恢復/收集引擎（src/minigames/elijah/）：站點用 minigame.engine:'elijah' 指定，Canvas 即時關，
  // 同樣在約拿 fork 之外（sync:jonah 不會碰）。撿餅水恢復體力、走到何烈山過關（王上 19）。
  const isElijah = minigame.engine === 'elijah'
  // in-repo 拾麥穗收集引擎（src/minigames/gleaning/）：站點用 minigame.engine:'gleaning' 指定。
  // 路得在波阿斯麥田邊跑邊撿麥穗🌾恢復體力、遇波阿斯故意撥落（恩典）、拾到日暮過關（得 2;利 19:9-10）。不會失敗。
  const isGleaning = minigame.engine === 'gleaning'
  // in-repo 挪亞方舟關（src/minigames/arkpairs|arkbuild/）：站點用 minigame.engine:'arkpairs'/'arkbuild'。
  // arkpairs＝翻牌記憶「一公一母配對」（創 6–7）；arkbuild＝依序放木板蓋方舟（創 6:14-22）。都不會失敗。
  const isArkPairs = minigame.engine === 'arkpairs'
  const isArkBuild = minigame.engine === 'arkbuild'
  const level = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].includes(minigame.level) ? minigame.level : 2 // 引擎嵌入白名單（見約拿 CLAUDE.md 嵌入契約）；7-10 = 戰爭原型 摩西/紅海/約沙法/巴蘭
  // 站點可在 minigame 裡覆寫 label / how（沒寫就用該關卡 / 卡片規格 / 引擎的預設）。
  const info = {
    title:
      minigame.label ||
      (cardSpec
        ? cardSpec.title
        : isSling
          ? '🪨 大衛戰歌利亞'
          : isElijah
            ? '🌅 盼望 · 以利亞重得力'
            : isGleaning
              ? '🌾 拾麥穗蒙恩 · 路得'
            : isArkPairs
              ? '🐘 一公一母進方舟'
              : isArkBuild
                ? '🔨 一步一步蓋方舟'
                : LEVELS[level].title),
    how:
      minigame.how ||
      (cardSpec
        ? cardSpec.how
        : isSling
          ? '瞄準線會上下擺動，看準歌利亞的「額頭」，按空白鍵／點畫面放手甩石！五顆石子內擊中就得勝。'
          : isElijah
            ? '灰心的以利亞在曠野趕路。空白鍵／↑／點畫面 = 跳起來撿天使預備的餅🍞和水💧把體力補回來；體力歸零也沒關係，神會再扶你起來。走到何烈山就過關。'
            : isGleaning
              ? '路得在波阿斯的田裡拾麥穗。空白鍵／↑／點畫面 = 跳；邊跑邊撿麥穗🌾把體力補回來；遇見波阿斯會故意撥落一大把（恩典）。拾到日暮就過關，體力歸零也沒關係，歇一會兒再起來。'
            : isArkPairs
              ? '神叫動物自己成對來。翻開兩張牌，找出同一種的一公♂一母♀，牠們就住進方舟的房間。把所有動物都送進方舟就過關！'
              : isArkBuild
                ? '神把方舟的造法都吩咐了挪亞。點畫面，一塊一塊把木板放上去；方舟會一段一段長起來，把整艘方舟蓋完就過關！'
                : LEVELS[level].how),
  }

  // 卡片按鈕 → 依前綴分派給引擎對應的 handler（嵌入模式下 boot 不註冊 ui 回呼，直接呼叫公開方法）。
  const dispatch = (act, ds = {}) => {
    const g = gameRef.current
    if (!g) return
    if (act.startsWith('fish-')) g.handleFishAction(act, ds)
    else if (act.startsWith('preach-')) g.handlePreachAction(act, ds)
    else if (act.startsWith('gourd-')) g.handleGourdAction(act, ds)
  }

  // 在使用者點「開始挑戰」的手勢中啟動：此時 canvas 已排版好（renderer 量得到尺寸），
  // 音訊也能在手勢中解鎖。
  const begin = () => {
    if (started || gameRef.current) return
    setStarted(true)
    sound.stopBgm() // 暫停保羅背景音樂，避免和小遊戲音效打架
    if (cardSpec) return // 卡片流程關：純 React，不啟動引擎
    if (isSling) {
      // 拋射關：自帶 renderer/input/audio，介面與約拿引擎相同（embed/onComplete/boot/destroy）。
      const game = new SlingGame(canvasRef.current, {
        embed: true,
        winPoints: minigame.winPoints || 5,
        onComplete: (result) => onComplete(result),
      })
      gameRef.current = game
      game.boot()
      return
    }
    if (isElijah) {
      // 恢復/收集關：自帶 renderer/input/audio，介面與約拿引擎相同（embed/onComplete/boot/destroy）。
      const game = new ElijahGame(canvasRef.current, {
        embed: true,
        winPoints: minigame.winPoints || 5,
        onComplete: (result) => onComplete(result),
      })
      gameRef.current = game
      game.boot()
      return
    }
    if (isGleaning) {
      // 拾麥穗收集關：自帶 renderer/input/audio，同一套嵌入契約（embed/onComplete/boot/destroy）。
      const game = new GleaningGame(canvasRef.current, {
        embed: true,
        winPoints: minigame.winPoints || 5,
        onComplete: (result) => onComplete(result),
      })
      gameRef.current = game
      game.boot()
      return
    }
    if (isArkPairs) {
      // 翻牌記憶配對關：自帶 renderer/input/audio，同一套嵌入契約。pairs 可由站點覆寫動物數。
      const game = new ArkPairsGame(canvasRef.current, {
        embed: true,
        winPoints: minigame.winPoints || 5,
        pairs: minigame.pairs,
        onComplete: (result) => onComplete(result),
      })
      gameRef.current = game
      game.boot()
      return
    }
    if (isArkBuild) {
      // 依序放木板蓋方舟關：同一套嵌入契約。
      const game = new ArkBuildGame(canvasRef.current, {
        embed: true,
        winPoints: minigame.winPoints || 5,
        onComplete: (result) => onComplete(result),
      })
      gameRef.current = game
      game.boot()
      return
    }
    // 1/2/4 純 Canvas 關用空殼 UI；3/5/6 卡片流程關用會畫卡片的 EmbedUI（嵌入契約）。
    const ui = CARD_LEVELS.has(level)
      ? makeEmbedUI(setCard)
      : new Proxy({}, { get: () => () => {} })
    const game = new Game(canvasRef.current, {
      ui,
      embed: true,
      level,
      mode: minigame.mode === 'walk' ? 'walk' : 'run',
      // 進度條地名:站點可在 minigame.hudLabels 覆寫(如約拿路線傳 { start:'約帕', goal:'往他施的船 ⛵' })。
      // 沒覆寫時:第 1 關用通用「起點 → 終點 ⛵」(同一跑酷引擎被任何旅程重用);
      // 其他關(如 4=曠野→尼尼微)傳 undefined,讓引擎用該關自己的預設(LEVELx.hud,嵌入契約)。
      hudLabels: minigame.hudLabels || (level === 1 ? { start: '起點', goal: '終點 ⛵' } : undefined),
      // 第二關結尾「拋約拿入海」只屬於約拿的故事：站點設 cast:false（保羅的海路闖關站）
      // 則撐過風暴即直接過關；約拿之旅的暴風雨站不設，維持拋約拿結尾。
      stormCast: minigame.cast,
      onComplete: (result) => onComplete(result),
    })
    gameRef.current = game
    game.boot()
  }

  // 卸載（小遊戲結束、彈窗關閉）時清理引擎並還原保羅背景音樂。
  useEffect(() => {
    return () => {
      if (gameRef.current) gameRef.current.destroy()
      sound.startBgm() // startBgm 內部會檢查靜音設定
    }
  }, [])

  return (
    <div className="modal__overlay">
      <div className="minigame">
        <div className="minigame__head">
          <span className="minigame__kind">闖關挑戰</span>
          <span className="minigame__title">{info.title}</span>
        </div>
        <div className="minigame__stage">
          {!cardSpec && <canvas ref={canvasRef} className="minigame__canvas" />}
          {started && cardSpec && <CardGame spec={cardSpec} onComplete={onComplete} />}
          {!started && (
            <div className="minigame__intro">
              <p className="minigame__how">{info.how}</p>
              <button className="btn btn--primary" onClick={begin}>
                開始挑戰 →
              </button>
            </div>
          )}
          {card && (
            <div className="minigame__card" data-kind={card.kind}>
              <div className="mgcard">
                <div className={`mgcard__kicker mgcard__kicker--${card.kind}`}>{card.kicker || (card.kind === 'tryagain' ? '再想想～' : '')}</div>
                {card.sub && <p className="mgcard__sub">{card.sub}</p>}
                {card.name && <p className="mgcard__sub">{card.name}</p>}
                {card.say && <div className="mgcard__verse">「{card.say}」</div>}
                {card.ref && card.verse && (
                  <div className="mgcard__verse">
                    <span className="mgcard__ref">{card.ref}</span>
                    {card.verse}
                  </div>
                )}
                {card.ref && card.line && (
                  <div className="mgcard__verse">
                    <span className="mgcard__ref">{card.ref}</span>
                    {card.line}
                  </div>
                )}
                {card.body && <p className="mgcard__body">{card.body}</p>}
                {card.q && <h3 className="mgcard__q">{card.q}</h3>}
                {card.explain && <p className="mgcard__body">{card.explain}</p>}
                {card.choices && (
                  <div className="mgcard__choices">
                    {card.choices.map((c, i) => (
                      <button
                        key={i}
                        className="btn mgcard__choice"
                        onClick={() => dispatch(`${card.prefix}-choice`, { choice: String(i) })}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
                {card.btn && card.act && (
                  <button className="btn btn--primary mgcard__btn" onClick={() => dispatch(card.act)}>
                    {card.btn}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

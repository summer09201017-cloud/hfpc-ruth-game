import { useEffect, useMemo, useState } from 'react'
import CardScene from './CardScene'
import * as CardAudio from './cardAudio'
import { initSpeech, speakScripture, stopSpeech } from '../../speak.js'

// 卡片流程闖關播放器（純 React，不用 Canvas 引擎；內容規格見 specs.js）。
// 與約拿 3/5/6 卡片關同精神：不會失敗——答錯溫柔重試，走完全部 step 即過關。
// 結束時呼叫 onComplete({ won:true, score })；score = 第一次就答對／排對的步數（被動加成由引擎結算）。
//
// 動畫（2026-06-14，兒童營投影用）：每進一步卡片淡入上移；step/intro/done 可選填 `scene`
// ——emoji 小劇場（走路 walk / 閃光 flash / 仆倒 fall / 上升 rise / 輪替 cycle / 呼吸 pulse），
// 例：彼得順服腳步 → 一行人 emoji 走向 🏠。答對有 ✨ 跳出。全用 CSS+emoji（零美術檔、可離線），
// 並尊重 prefers-reduced-motion。`scene` 是可選欄位——沒填的關卡行為完全不變（向後相容，桌遊嵌入版也不受影響）。

// Fisher–Yates 洗牌（UI 顯示用，與引擎無關，可用 Math.random）。
function shuffled(arr) {
  const a = arr.map((item, i) => ({ item, i }))
  for (let k = a.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1))
    ;[a[k], a[j]] = [a[j], a[k]]
  }
  return a
}

// emoji 小劇場：motion 決定怎麼動，cast 是演員 emoji，target 是終點（如 🏠）。純裝飾。
function Scene({ scene }) {
  if (!scene || !scene.motion) return null
  const cast = Array.isArray(scene.cast) ? scene.cast : []
  return (
    <div className={`scene scene--${scene.motion}`} aria-hidden="true">
      <div className="scene__cast">
        {cast.map((e, i) => (
          <span key={i} className="scene__actor" style={{ '--i': i }}>
            {e}
          </span>
        ))}
      </div>
      {scene.target && <span className="scene__target">{scene.target}</span>}
      {scene.caption && <div className="scene__caption">{scene.caption}</div>}
    </div>
  )
}

// 場景區:永遠有一層 Canvas 背景動畫(通用,所有卡片關受惠);
//   若 scene.canvas 指定了逐幕 drawer(福音奇兵),就改放手繪動畫(取代 emoji);
//   否則 Canvas 當背景、emoji 小劇場疊在上面(比純 emoji 高級很多)。
function SceneArea({ scene, accent, fallback }) {
  // spec 層級的預設場景:某步沒指定自己的 canvas 時,用整關的預設(但以理/出埃及多步共用一景時很省)
  if (fallback && !(scene && scene.canvas)) scene = { ...(scene || {}), canvas: fallback }
  if (scene && scene.canvas) {
    return (
      <div className="mgscene mgscene--full">
        <CardScene sceneKey={scene.canvas} accent={accent} />
        {scene.caption && <div className="mgscene__cap">{scene.caption}</div>}
      </div>
    )
  }
  if (scene) {
    return (
      <div className="mgscene">
        <CardScene sceneKey={null} accent={accent} />
        <div className="mgscene__fg">
          <Scene scene={scene} />
        </div>
      </div>
    )
  }
  // 沒有 scene 的卡片(如部分但以理/出埃及關):仍給一條輕量背景動畫——所有卡片關一次受惠
  return (
    <div className="mgscene mgscene--bare">
      <CardScene sceneKey={null} accent={accent} />
    </div>
  )
}

// 答對時的 ✨ 慶祝（純裝飾，全場看得到「對了！」）。
function Sparkles() {
  return (
    <div className="scene__sparkles" aria-hidden="true">
      {['✨', '🎉', '⭐', '✨', '🎊'].map((e, i) => (
        <span key={i} style={{ '--i': i }}>
          {e}
        </span>
      ))}
    </div>
  )
}

// 依序點選題：items 洗牌顯示，照原始順序逐一點對；點錯搖一下再試。
function OrderStep({ step, onDone }) {
  const pool = useMemo(() => shuffled(step.items), [step])
  const [picked, setPicked] = useState([]) // 已點對的原始索引（依序）
  const [shakeKey, setShakeKey] = useState(0) // 觸發搖晃動畫
  const [missed, setMissed] = useState(false) // 有沒有點錯過（計分用）

  const pick = (origIdx) => {
    if (origIdx === picked.length) {
      const next = [...picked, origIdx]
      setPicked(next)
      if (next.length === step.items.length) onDone(!missed)
    } else {
      setMissed(true)
      setShakeKey((k) => k + 1)
    }
  }

  return (
    <>
      <h3 className="mgcard__q">{step.prompt}</h3>
      {picked.length > 0 && (
        <ol className="mgorder__done">
          {picked.map((i) => (
            <li key={i}>{step.items[i]}</li>
          ))}
        </ol>
      )}
      <div className="mgcard__choices mgorder__pool" key={shakeKey}>
        {pool
          .filter(({ i }) => !picked.includes(i))
          .map(({ item, i }) => (
            <button key={i} className="btn mgcard__choice" onClick={() => pick(i)}>
              {item}
            </button>
          ))}
      </div>
      <p className="mgorder__hint">
        {picked.length === 0 ? '想想哪一個排最前面？' : `已排好 ${picked.length} / ${step.items.length}——下一個是？`}
      </p>
    </>
  )
}

export default function CardGame({ spec, onComplete }) {
  // stage：'intro' → 0..steps.length-1 → 'done'
  const [stage, setStage] = useState('intro')
  // 題目子狀態：'ask'（作答中）/ 'wrong'（答錯提示）/ 'reveal'（看解答）
  const [sub, setSub] = useState('ask')
  const [score, setScore] = useState(0)
  const [wrongs, setWrongs] = useState(0) // 本題答錯次數(算分:第一次答對最高分)
  const maxScore = (spec.steps ? spec.steps.filter((s) => s.kind !== 'info').length : 0) * 3 // 滿分 = 每「題」3 分(info 純劇情幕不計分,別灌進分母——反思型終局才不會永遠看起來低分)

  // 場景配色(Canvas 背景動畫用);可在 spec 設 accent:[r,g,b]
  const accent = spec.accent || [120, 140, 170]
  // 3 條命(opt-in):spec.lives 有設(如福音奇兵=3)才啟用「答錯扣命、扣完會輸」;
  //   沒設 = 維持原本「不會失敗、溫柔重試」(但以理/出埃及等卡片關不受影響)。
  const livesMax = spec.lives ?? null
  const [lives, setLives] = useState(livesMax)

  // 背景音樂(各關不同曲風;掛載播放、卸載停止;音訊要等使用者手勢才發聲)
  const [musicMuted, setMusicMuted] = useState(CardAudio.isMuted())
  const music = spec.music || 'warm'
  useEffect(() => {
    CardAudio.play(music)
    return () => CardAudio.stop()
  }, [music])

  // 過關自動朗讀經文(系列預設;沒中文語音→靜默 fallback;隨🔇靜音、切卡/卸載即停)。見 skill web-speech-scripture。
  const winVerse = (spec.done && spec.done.line) || (spec.intro && spec.intro.line) || ''
  const winRef = (spec.done && spec.done.ref) || (spec.intro && spec.intro.ref) || ''
  useEffect(() => {
    initSpeech()
    return () => stopSpeech()
  }, [])
  useEffect(() => {
    if ((stage === 'done' || stage === 'lost') && winVerse) speakScripture(winVerse, { isMuted: () => musicMuted, ref: winRef })
    return () => stopSpeech() // 切卡/卸載就停,別蓋到下一關（過關 done 與失敗 lost 都朗讀經文）
  }, [stage])

  const stepIdx = typeof stage === 'number' ? stage : -1
  const step = stepIdx >= 0 ? spec.steps[stepIdx] : null
  const progress = stepIdx >= 0 ? `${stepIdx + 1} / ${spec.steps.length}` : ''

  const nextStep = () => {
    setSub('ask')
    setWrongs(0)
    if (stepIdx + 1 < spec.steps.length) setStage(stepIdx + 1)
    else setStage('done')
  }

  // 從頭再玩(輸了之後)
  const restart = () => {
    setStage('intro'); setSub('ask'); setScore(0); setWrongs(0); setLives(livesMax)
  }

  const answer = (i) => {
    if (i === step.answer) {
      // 第一次答對 3 分、第二次 2 分、第三次以後 1 分(答對都有分,沒人會 0 分挫折)
      setScore((s) => s + Math.max(1, 3 - wrongs))
      setSub('reveal')
    } else {
      setWrongs((w) => w + 1)
      if (livesMax != null) {
        // 有命模式:答錯扣一條命,扣完就輸(會輸 = 有緊張感、競賽用)
        const left = lives - 1
        setLives(left)
        if (left <= 0) setStage('lost')
        else setSub('wrong')
      } else {
        setSub('wrong') // 無命模式:溫柔重試,不會輸
      }
    }
  }

  const orderDone = (clean) => {
    setScore((s) => s + (clean ? 3 : 2)) // 一次排對 3 分;中途點錯 2 分
    setSub('reveal')
  }

  let body = null
  if (stage === 'intro') {
    const c = spec.intro
    body = (
      <>
        <div className="mgcard__kicker mgcard__kicker--intro">{c.kicker}</div>
        <SceneArea accent={accent} fallback={spec.canvas} scene={c.scene} />
        {c.ref && c.line && (
          <div className="mgcard__verse">
            <span className="mgcard__ref">{c.ref}</span>
            {c.line}
          </div>
        )}
        <p className="mgcard__body">{c.body}</p>
        <button className="btn btn--primary mgcard__btn" onClick={() => setStage(0)}>
          {c.btn}
        </button>
      </>
    )
  } else if (stage === 'done') {
    const c = spec.done
    const vRef = c.ref || (spec.intro && spec.intro.ref)
    const vLine = c.line || (spec.intro && spec.intro.line)
    body = (
      <>
        <div className="mgcard__win">🏆 得勝！</div>
        <SceneArea accent={accent} fallback={spec.canvas} scene={c.scene || { motion: 'rise', cast: ['🎉', '✨', '🎉'] }} />
        <div className="mgcard__finalscore">⭐ 得分 {score} / {maxScore}</div>
        {vRef && vLine && (
          <div className="mgcard__verse mgcard__verse--win">
            <span className="mgcard__ref">{vRef}</span>
            {vLine}
          </div>
        )}
        {vLine && (
          <button
            type="button"
            className="btn mgcard__replay"
            onClick={() => speakScripture(vLine, { isMuted: () => musicMuted, ref: vRef })}
          >
            🔊 再聽一次
          </button>
        )}
        <div className="mgcard__kicker mgcard__kicker--reveal">{c.kicker}</div>
        <p className="mgcard__body">{c.body}</p>
        <button
          className="btn btn--primary mgcard__btn"
          onClick={() => onComplete({ won: true, score, level: 'cards' })}
        >
          {c.btn}
        </button>
      </>
    )
  } else if (stage === 'lost') {
    const vRef = spec.intro && spec.intro.ref
    const vLine = spec.intro && spec.intro.line
    body = (
      <>
        <div className="mgcard__win mgcard__win--lose">💔 闖關失敗</div>
        <SceneArea accent={accent} fallback={spec.canvas} scene={{ motion: 'fall', cast: ['😣', '💔'] }} />
        <div className="mgcard__finalscore">⭐ 得分 {score} / {maxScore}</div>
        {vRef && vLine && (
          <div className="mgcard__verse mgcard__verse--win">
            <span className="mgcard__ref">{vRef}</span>
            {vLine}
          </div>
        )}
        <p className="mgcard__body">沒關係!得勝不是靠自己——再倚靠神試一次。三條命用完了,從頭再來。</p>
        <button className="btn btn--primary mgcard__btn" onClick={restart}>
          🔁 從頭再來
        </button>
      </>
    )
  } else if (sub === 'wrong') {
    body = (
      <>
        <SceneArea accent={accent} fallback={spec.canvas} scene={{ motion: 'pulse', cast: ['🤔', '📖'] }} />
        <div className="mgcard__kicker mgcard__kicker--tryagain">
          {livesMax != null ? '💔 答錯了,失去一條命' : '🤔 再想想～'}
        </div>
        {livesMax != null && (
          <div className="mgcard__lives" aria-label="剩餘生命">
            {Array.from({ length: livesMax }, (_, i) => (i < lives ? '❤️' : '🤍')).join(' ')}
          </div>
        )}
        <p className="mgcard__body">
          {livesMax != null
            ? `還剩 ${lives} 條命!再讀一次題目,想想經文怎麼說 📖,然後再選一次。`
            : '還差一點點！再讀一次題目，想想經文怎麼說 📖，然後再選一次。'}
        </p>
        <button className="btn btn--primary mgcard__btn" onClick={() => setSub('ask')}>
          再試一次
        </button>
      </>
    )
  } else if (sub === 'reveal') {
    const r = step.reveal
    const last = stepIdx + 1 >= spec.steps.length
    body = (
      <>
        <Sparkles />
        <SceneArea accent={accent} fallback={spec.canvas} scene={step.scene} />
        <div className="mgcard__kicker mgcard__kicker--reveal">✓ {step.kicker}</div>
        {r.ref && r.line && (
          <div className="mgcard__verse">
            <span className="mgcard__ref">{r.ref}</span>
            {r.line}
          </div>
        )}
        {r.explain && <p className="mgcard__body">{r.explain}</p>}
        <button className="btn btn--primary mgcard__btn" onClick={nextStep}>
          {last ? '看結局 →' : '下一步 →'}
        </button>
      </>
    )
  } else if (step.kind === 'order') {
    body = (
      <>
        <div className="mgcard__kicker mgcard__kicker--question">
          {step.kicker}　{progress}
        </div>
        <SceneArea accent={accent} fallback={spec.canvas} scene={step.scene} />
        <OrderStep step={step} onDone={orderDone} />
      </>
    )
  } else if (step.kind === 'info') {
    body = (
      <>
        <div className="mgcard__kicker mgcard__kicker--intro">
          {step.kicker}　{progress}
        </div>
        <SceneArea accent={accent} fallback={spec.canvas} scene={step.scene} />
        {step.ref && step.line && (
          <div className="mgcard__verse">
            <span className="mgcard__ref">{step.ref}</span>
            {step.line}
          </div>
        )}
        <p className="mgcard__body">{step.body}</p>
        <button className="btn btn--primary mgcard__btn" onClick={nextStep}>
          {step.btn || '繼續 →'}
        </button>
      </>
    )
  } else {
    // question
    body = (
      <>
        <div className="mgcard__kicker mgcard__kicker--question">
          {step.kicker}　{progress}
        </div>
        <SceneArea accent={accent} fallback={spec.canvas} scene={step.scene} />
        <h3 className="mgcard__q">{step.q}</h3>
        <div className="mgcard__choices">
          {step.choices.map((c, i) => (
            <button
              key={i}
              className="btn mgcard__choice"
              style={{ '--i': i }}
              onClick={() => answer(i)}
            >
              <span className="mgcard__num">{['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'][i] || '▶️'}</span>
              {c}
            </button>
          ))}
        </div>
      </>
    )
  }

  return (
    <div
      className="minigame__card minigame__card--pure"
      data-kind="cardgame"
      onPointerDown={() => CardAudio.play(music)} /* 第一次互動時解鎖/接續音樂 */
    >
      <div className="mgcard mgcard--anim" key={String(stage) + '-' + sub}>
        <button
          className="mgcard__mute"
          aria-label={musicMuted ? '開啟音樂' : '關閉音樂'}
          title={musicMuted ? '開啟背景音樂' : '關閉背景音樂'}
          onClick={() => { const m = CardAudio.toggleMute(); setMusicMuted(m); if (m) stopSpeech() }}
        >
          {musicMuted ? '🔇' : '🎵'}
        </button>
        {(typeof stage === 'number' || stage === 'done') && (
          <div className="mgcard__score" aria-label="目前得分">⭐ {score}</div>
        )}
        {livesMax != null && typeof stage === 'number' && (
          <div className="mgcard__hearts" aria-label={`剩餘生命 ${lives}`}>
            {Array.from({ length: livesMax }, (_, i) => (i < lives ? '❤️' : '🤍')).join('')}
          </div>
        )}
        {body}
      </div>
    </div>
  )
}

import { useState } from 'react'

const TYPE_LABEL = {
  start: '起點',
  story: '劇情',
  event: '事件卡',
  quiz: '聖經問答',
  chance: '機會',
  fate: '命運',
  challenge: '闖關挑戰',
  rest: '休息',
  end: '終點',
}

export default function StationModal({
  station,
  quiz,
  card,
  phase,
  result,
  scoreLabel,
  currentPlayer,
  moveNote,
  onResolve,
  onFinish,
}) {
  const [selected, setSelected] = useState(null)
  const [picked, setPicked] = useState(null) // 玩家點了第幾張牌（機會／命運翻牌）
  const isResult = phase === 'result'
  const hasQuiz = !!quiz
  const hasCard = !!card // 這一格是否要抽機會／命運卡（內容在點牌翻開後才揭曉）
  const FACE_DOWN = 3 // 攤開幾張背面牌供點選

  const pickAnswer = (i) => {
    if (isResult) return
    setSelected(i)
    onResolve({ answerIndex: i })
  }

  // 點一張背面朝上的牌 → 翻開。抽到哪張其實已由程式決定，點牌只是把它翻過來。
  const pickCard = (i) => {
    if (isResult || picked != null) return
    setPicked(i)
    onResolve({})
  }

  return (
    <div className="modal__overlay">
      <div className={`modal modal--${station.type}`}>
        <div className="modal__head">
          <span className="modal__kind">{TYPE_LABEL[station.type] || '城市'}</span>
          <h2 className="modal__name">{station.name}</h2>
          <span className="modal__scripture">{station.scripture}</span>
        </div>

        <div className="modal__body">
          {moveNote && <p className="modal__movenote">{moveNote}</p>}
          <p className="modal__text">{station.text}</p>

          {station.history && (
            <div className="history">
              <div className="history__title">📜 歷史小檔案</div>
              <dl className="history__grid">
                <dt>🗓️ 年代</dt>
                <dd>{station.history.year}</dd>
                <dt>📖 使徒行傳</dt>
                <dd>{station.scripture}（全程記在 13–14 章）</dd>
                <dt>👥 同行的人</dt>
                <dd>{station.history.companions}</dd>
                <dt>✨ 在這裡會遇見</dt>
                <dd>{station.history.willMeet}</dd>
                {station.history.notYetWritten && (
                  <>
                    <dt>✍️ 這時還沒寫的聖經</dt>
                    <dd>{station.history.notYetWritten}</dd>
                  </>
                )}
              </dl>
            </div>
          )}

          {hasQuiz && (
            <div className="quiz">
              <p className="quiz__q">{quiz.question}</p>
              <div className="quiz__options">
                {quiz.options.map((opt, i) => {
                  let cls = 'quiz__opt'
                  if (isResult) {
                    if (i === quiz.answerIndex) cls += ' quiz__opt--correct'
                    else if (i === selected) cls += ' quiz__opt--wrong'
                    else cls += ' quiz__opt--dim'
                  }
                  return (
                    <button
                      key={i}
                      className={cls}
                      disabled={isResult}
                      onClick={() => pickAnswer(i)}
                    >
                      <span className="quiz__opt-letter">{String.fromCharCode(65 + i)}</span>
                      {opt}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {hasCard && (
            <div className="carddraw">
              <p className="carddraw__hint">
                {isResult
                  ? '你抽到了：'
                  : `點一張牌，翻開你的${card.deck === 'fate' ? '命運' : '機會'}！`}
              </p>
              <div className="carddraw__deck">
                {Array.from({ length: FACE_DOWN }, (_, i) => {
                  const showFront = isResult && i === picked
                  const dim = isResult && i !== picked
                  return (
                    <button
                      key={i}
                      className={`pcard ${showFront ? 'pcard--flipped' : ''} ${dim ? 'pcard--dim' : ''}`}
                      disabled={isResult}
                      onClick={() => pickCard(i)}
                      aria-label={showFront ? card.title : '翻開一張牌'}
                    >
                      <span className="pcard__inner">
                        <span className="pcard__face pcard__back">
                          {card.deck === 'fate' ? '🃏' : '🎲'}
                        </span>
                        <span
                          className={`pcard__face pcard__front pcard__front--${card.kind === 'bad' ? 'bad' : 'good'}`}
                        >
                          <span className="pcard__deck">
                            {card.deck === 'fate' ? '命運' : '機會'}
                          </span>
                          <span className="pcard__title">{card.title}</span>
                          <span className="pcard__text">{card.text}</span>
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {isResult && result && (
            <div className={`result ${result.correct === false ? 'result--miss' : 'result--ok'}`}>
              {result.lines.map((line, i) => (
                <p key={i} className="result__line">
                  {line}
                </p>
              ))}
              {result.explanation && (
                <p className="result__explain">💡 {result.explanation}</p>
              )}
            </div>
          )}
        </div>

        <div className="modal__foot">
          {!isResult && !hasQuiz && !hasCard && (
            <button className="btn btn--primary" onClick={() => onResolve({})}>
              {station.type === 'event' ? '翻開事件卡 →' : '繼續 →'}
            </button>
          )}
          {!isResult && hasQuiz && <span className="modal__tip">選一個答案來賺取點數</span>}
          {!isResult && hasCard && <span className="modal__tip">👆 點一張牌翻開</span>}
          {isResult && (
            <button className="btn btn--primary" onClick={onFinish}>
              結束回合 →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

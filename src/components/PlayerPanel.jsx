import { getTitle } from '../core/engine'

export default function PlayerPanel({ players, currentPlayerId, scoreLabel, journey }) {
  const companionInfo = (journey && journey.companions) || {}
  const giftInfo = (journey && journey.gifts) || {}

  return (
    <div className="players">
      {players.map((p) => {
        // 頭銜：依福音點數的門檻（資料在 journey.titles）。沒設定就不顯示。
        const title = journey ? getTitle(journey, p.gospelPoints) : null
        const gifts = p.gifts || []
        return (
          <div
            key={p.id}
            className={`playercard ${p.id === currentPlayerId ? 'playercard--current' : ''}`}
            style={{ '--player-color': p.color }}
          >
            <div className="playercard__top">
              <span className="playercard__chip" style={{ background: p.color }}>
                {p.finished ? '👑' : p.name.slice(0, 1)}
              </span>
              <span className="playercard__name">{p.name}</span>
              {title && <span className="playercard__title">{title.name}</span>}
              {p.skipNext && <span className="playercard__tag">暫停一回合</span>}
            </div>
            <div className="playercard__score">
              <span className="playercard__score-num">{p.gospelPoints}</span>
              <span className="playercard__score-label">{scoreLabel}</span>
            </div>
            <div className="playercard__companions">
              <span className="playercard__companions-label">同工：</span>
              {p.companions.length > 0 ? (
                p.companions.map((c) => (
                  <span
                    key={c}
                    className="playercard__companion"
                    title={companionInfo[c] ? companionInfo[c].blurb : undefined}
                  >
                    {c}
                  </span>
                ))
              ) : (
                <span className="playercard__companion playercard__companion--none">獨自一人</span>
              )}
            </div>
            {gifts.length > 0 && (
              <div className="playercard__gifts">
                <span className="playercard__gifts-label">裝備：</span>
                {gifts.map((id) => {
                  const g = giftInfo[id] || { name: id }
                  return (
                    <span
                      key={id}
                      className="playercard__gift"
                      title={g.ref ? `${g.name}（${g.ref}）— ${g.blurb || ''}` : g.blurb || g.name}
                    >
                      {g.icon ? `${g.icon} ` : ''}
                      {g.name}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

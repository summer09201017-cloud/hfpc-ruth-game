import MapBackground from './MapBackground'
import { useZoomPan } from './useZoomPan'

const TYPE_ICON = {
  start: '🚩',
  story: '📜',
  event: '✨',
  quiz: '❓',
  chance: '🎲',
  fate: '🃏',
  challenge: '🌊',
  rest: '⛺',
  end: '🏁',
}

// 多個棋子停在同一格時，依玩家序號做小幅位移，避免完全重疊。
function tokenOffset(indexAtStation) {
  const offsets = [
    { dx: -1.6, dy: -1.6 },
    { dx: 1.6, dy: -1.6 },
    { dx: -1.6, dy: 1.6 },
    { dx: 1.6, dy: 1.6 },
  ]
  return offsets[indexAtStation % offsets.length]
}

export default function Board({ stations, players, currentPlayerId, pendingStationId, map }) {
  // 路線分段：每一段標記是陸路或海路（依「抵達站」的 arriveBy），分別上色。
  const legs = stations.slice(1).map((s, i) => ({
    from: stations[i],
    to: s,
    sea: s.arriveBy === 'sea',
  }))

  // 算出每個玩家在自己那一格裡是第幾個（用來錯開棋子）。
  const seatAtStation = {}

  const aspect = (map && map.aspect) || 1.322
  const zp = useZoomPan({ aspect })

  return (
    <div
      className="board"
      ref={zp.ref}
      style={{ '--map-aspect': aspect, touchAction: 'none' }}
      {...zp.handlers}
    >
      {/* 可縮放 / 平移的整個地圖場景（地圖、路線、城市、棋子一起縮放）。
          用「實際版面放大」(width/height %) 而非 transform scale——
          手機/PC 高 DPR 下 transform 放大會產生超過 GPU 上限的合成層，整個畫面變白。
          base 倍率讓場景以「正確地圖比例」蓋滿容器（cover）：桌機等比例容器≈1 不變；
          手機橫向地圖填滿整個左欄（約占 8 成），不變形、可拖曳平移。 */}
      <div
        className="board__scene"
        style={{
          width: `${zp.scale * zp.baseW * 100}%`,
          height: `${zp.scale * zp.baseH * 100}%`,
          left: `${zp.x}px`,
          top: `${zp.y}px`,
          cursor: zp.scale > 1 || zp.baseW > 1.01 || zp.baseH > 1.01 ? 'grab' : 'default',
        }}
      >
        <MapBackground map={map} />

        <svg className="board__route" viewBox="0 0 100 100" preserveAspectRatio="none">
          {legs.map((leg, i) => (
            <line
              key={i}
              x1={leg.from.x}
              y1={leg.from.y}
              x2={leg.to.x}
              y2={leg.to.y}
              className={leg.sea ? 'route route--sea' : 'route route--land'}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {stations.map((s, i) => {
          const isPending = s.id === pendingStationId
          return (
            <div
              key={s.id}
              className={`station station--${s.type} ${isPending ? 'station--active' : ''}`}
              style={{ left: `${s.x}%`, top: `${s.y}%` }}
              title={`${s.name}（${s.scripture}）`}
            >
              <div className="station__dot">
                <span className="station__icon">{TYPE_ICON[s.type] || '•'}</span>
                <span className="station__num">{i + 1}</span>
              </div>
              <span className="station__name">{s.name}</span>
            </div>
          )
        })}

        {players.map((p) => {
          const seat = seatAtStation[p.position] || 0
          seatAtStation[p.position] = seat + 1
          const station = stations[p.position]
          const off = tokenOffset(seat)
          return (
            <div
              key={p.id}
              className={`token ${p.id === currentPlayerId ? 'token--current' : ''}`}
              style={{
                left: `calc(${station.x}% + ${off.dx}rem)`,
                top: `calc(${station.y}% + ${off.dy}rem)`,
                background: p.color,
              }}
              title={p.name}
            >
              {p.finished ? '👑' : p.name.slice(0, 1)}
            </div>
          )
        })}
      </div>

      {/* 縮放控制（固定在角落，不跟著縮放）：＋／－、拉桿、可輸入百分比、重設 */}
      <div className="board__zoom">
        <button onClick={zp.zoomIn} disabled={!zp.canZoomIn} aria-label="放大" title="放大">＋</button>
        <input
          className="board__zoom-slider"
          type="range"
          min={zp.minPercent}
          max={zp.maxPercent}
          step="5"
          value={zp.percent}
          onChange={(e) => zp.setPercent(Number(e.target.value))}
          aria-label={`縮放倍率，目前 ${zp.percent}%`}
          title="拖曳調整縮放倍率"
        />
        <button onClick={zp.zoomOut} disabled={!zp.canZoomOut} aria-label="縮小" title="縮小">－</button>
        <div className="board__zoom-num" title="輸入縮放百分比">
          <input
            className="board__zoom-input"
            type="number"
            min={zp.minPercent}
            max={zp.maxPercent}
            step="5"
            value={zp.percent}
            onChange={(e) => zp.setPercent(Number(e.target.value))}
            aria-label="輸入縮放百分比"
          />
          <span className="board__zoom-pct-sign">%</span>
        </div>
        <button onClick={zp.reset} disabled={zp.scale === 1} aria-label="重設為 100%" title="重設為 100%">⟳</button>
      </div>
    </div>
  )
}

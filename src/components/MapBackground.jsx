// 預設地名標籤（保羅旅程用;座標為棋盤 0~100 的百分比，與城市站點同一套座標系）。
// 用 HTML 疊在地圖上而非畫進 SVG —— SVG 被拉伸成真實長寬比後，文字會跟著被拉寬。
// 各條旅程可在自己的 region-map JSON 帶 labels 覆寫(例如約拿用 region-map-jonah.json)。
const DEFAULT_LABELS = [
  { t: '小亞細亞（今土耳其）', x: 52, y: 4, kind: 'region' },
  { t: '敘利亞', x: 95, y: 70, kind: 'region' },
  { t: '賽普勒斯', x: 47, y: 78, kind: 'island' },
  { t: '居比路', x: 47, y: 82, kind: 'island-sub' },
  { t: '地　中　海', x: 54, y: 94, kind: 'sea' },
]

export default function MapBackground({ map }) {
  const lands = (map && map.lands) || []
  const labels = (map && map.labels) || DEFAULT_LABELS
  // 裝飾剪影層（手繪棋盤用，例如但以理的巴比倫城景）：每筆 { d, fill?, stroke?, sw?, opacity? }。
  // gen-map 產生的地理棋盤沒有這個欄位，行為不變。
  const decor = (map && map.decor) || []
  return (
    <>
      <svg className="board__map" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <rect x="0" y="0" width="100" height="100" className="board__sea" />
        {lands.map((d, i) => (
          <path key={i} d={d} className="board__land" vectorEffect="non-scaling-stroke" />
        ))}
        {decor.map((p, i) => (
          <path
            key={`d${i}`}
            d={p.d}
            fill={p.fill || 'none'}
            stroke={p.stroke || 'none'}
            strokeWidth={p.sw || 1}
            opacity={p.opacity == null ? 1 : p.opacity}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <div className="board__labels" aria-hidden="true">
        {labels.map((l, i) => (
          <span
            key={i}
            className={`board__label board__label--${l.kind}`}
            style={{ left: `${l.x}%`, top: `${l.y}%` }}
          >
            {l.t}
          </span>
        ))}
        <span className="board__compass" style={{ left: '5%', top: '6%' }}>
          ⬆<small>北 N</small>
        </span>
      </div>
    </>
  )
}

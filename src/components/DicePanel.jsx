// 骰子：CSS 3D 立方體。轉動時整顆骰子立體翻滾，停下時平滑轉到擲出的那一面。
// 點數佈局與真實骰子相同（對面相加 = 7：1-6、2-5、3-4）。
// PIPS：3×3 格中哪幾格要亮點（標準骰子佈局）。
const PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

// 立方體六面的擺放（face 值 → 該面在立方體上的方位 class）。
const FACE_POS = { 1: 'front', 6: 'back', 3: 'right', 4: 'left', 2: 'top', 5: 'bottom' }

// 「讓某一面轉到正前方」的最終角度（加兩整圈，停下前還會多翻幾圈才落定）。
// ⚠ CSS 的 Y 軸朝下：top 面(2)要轉到正前方是 rotateX(-90)、bottom 面(5)是 rotateX(+90)。
//   之前 2/5 寫反，造成「引擎擲 2、骰子顯示 5」的步數不符 bug（2026-06-11 修正）。
const FACE_ROT = {
  1: { x: 0, y: 0 },
  2: { x: -90, y: 0 }, // top 轉下來面向觀眾
  3: { x: 0, y: -90 }, // right 轉過來
  4: { x: 0, y: 90 }, // left 轉過來
  5: { x: 90, y: 0 }, // bottom 轉上來面向觀眾
  6: { x: 0, y: 180 }, // back 轉過來
}

function Face({ value }) {
  const on = new Set(PIPS[value] || [])
  return (
    <div className={`die3d__face die3d__face--${FACE_POS[value]}`}>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={`die3d__pip ${on.has(i) ? 'die3d__pip--on' : ''}`} />
      ))}
    </div>
  )
}

function Die3D({ value, rolling }) {
  const rot = FACE_ROT[value] || FACE_ROT[1]
  // 停下時：多轉兩整圈再落在目標面，看起來像真的骰子滾到定點。
  const style = rolling
    ? undefined
    : { transform: `rotateX(${720 + rot.x}deg) rotateY(${720 + rot.y}deg)` }
  return (
    <div className="die3d-stage" aria-label={`骰子 ${value} 點`}>
      <div className={`die3d ${rolling ? 'die3d--rolling' : ''}`} style={style}>
        {[1, 2, 3, 4, 5, 6].map((v) => (
          <Face key={v} value={v} />
        ))}
      </div>
    </div>
  )
}

export default function DicePanel({ phase, diceFace, currentPlayer, onRoll }) {
  const canRoll = phase === 'idle'
  const rolling = phase === 'rolling'

  return (
    <div className="dice">
      <div className="dice__turn">
        輪到{' '}
        <strong style={{ color: currentPlayer?.color }}>{currentPlayer?.name}</strong>
      </div>
      <div className="dice__die">
        <Die3D value={diceFace} rolling={rolling} />
      </div>
      <button className="btn btn--primary dice__btn" disabled={!canRoll} onClick={onRoll}>
        {rolling ? '擲骰中…' : phase === 'idle' ? '🎲 擲骰子' : '前進中…'}
      </button>
    </div>
  )
}

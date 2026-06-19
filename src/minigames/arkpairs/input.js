// 原始輸入：記錄「最近一次點擊」在畫布內的 CSS 像素座標（左上為原點）。
// 遊戲端再用 renderer 的縮放/位移把它換算成世界座標（960×540）。
// attach() 存具名參考、提供 detach()，嵌入卸載時移得乾淨（嵌入契約）。
export class Input {
  constructor() {
    this.tap = null // { x, y } CSS px relative to canvas；被讀一次就清掉
    this._onPointer = null
    this._onKey = null
    this._target = null
  }
  attach(target) {
    this._target = target
    this._onPointer = (e) => {
      e.preventDefault()
      const r = target.getBoundingClientRect()
      this.tap = { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    // 空白鍵/Enter 當「繼續」用（在 intro/win 面板，等同點畫面中央）
    this._onKey = (e) => {
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        const r = target.getBoundingClientRect()
        this.tap = { x: r.width / 2, y: r.height / 2 }
      }
    }
    target.addEventListener('pointerdown', this._onPointer)
    window.addEventListener('keydown', this._onKey)
  }
  // 讀「這一拍有沒有點擊」，讀完即清（邊緣觸發）。回傳 {x,y} 或 null。
  consumeTap() {
    const t = this.tap
    this.tap = null
    return t
  }
  detach() {
    if (this._target && this._onPointer) this._target.removeEventListener('pointerdown', this._onPointer)
    if (this._onKey) window.removeEventListener('keydown', this._onKey)
    this._onPointer = this._onKey = this._target = null
  }
}

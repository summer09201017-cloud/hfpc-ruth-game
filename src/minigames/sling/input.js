// 原始輸入：只負責「有沒有一次『放手』動作」（空白鍵／↑／點畫面），不懂遊戲規則。
// attach() 把處理器存成具名參考、提供 detach()，嵌入卸載時移得乾淨（嵌入契約）。
export class Input {
  constructor() {
    this.fired = false // 邊緣旗標：被讀一次就清掉
    this._onKey = null
    this._onPointer = null
    this._target = null
  }
  attach(target) {
    this._target = target
    this._onKey = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        this.fired = true
      }
    }
    this._onPointer = (e) => {
      e.preventDefault()
      this.fired = true
    }
    window.addEventListener('keydown', this._onKey)
    target.addEventListener('pointerdown', this._onPointer)
  }
  // 讀「這一拍有沒有放手」，讀完即清（邊緣觸發，避免連發）。
  consumeFire() {
    if (this.fired) {
      this.fired = false
      return true
    }
    return false
  }
  detach() {
    if (this._onKey) window.removeEventListener('keydown', this._onKey)
    if (this._target && this._onPointer) this._target.removeEventListener('pointerdown', this._onPointer)
    this._onKey = this._onPointer = this._target = null
  }
}

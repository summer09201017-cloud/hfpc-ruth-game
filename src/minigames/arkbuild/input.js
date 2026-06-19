// 原始輸入：只負責「有沒有一次動作」（點畫面／空白鍵／↑）。蓋方舟不需要座標——
// 每次動作就把「下一塊預定好的木板」放上去（像填色）。嵌入卸載時移得乾淨（嵌入契約）。
export class Input {
  constructor() {
    this.fired = false
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

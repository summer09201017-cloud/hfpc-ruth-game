// 原始輸入提供者(不認識遊戲玩法,只回報「發生了什麼」)。
// 由 game.js 決定這些輸入代表跳躍還是衝刺。(沿用約拿引擎的 Input,通用。)
//
//   鍵盤:空白/↑/W = 跳(邊緣);→/D、←/A = 左右(持續按住);P/Esc = 暫停(邊緣);M = 靜音
//   指標:右上角熱區 = 暫停;其餘 = 一次「按下」(附座標)+ 持續按住狀態(附座標)

export class Input {
  constructor() {
    this.right = false // → / D 是否按住
    this.left = false // ← / A 是否按住
    this.down = false // ↓ / S 是否按住
    this.jumpQueued = false // 鍵盤跳躍(邊緣)
    this.pauseQueued = false // 暫停(邊緣;鍵盤或右上角熱區)
    this.muteQueued = false // 靜音切換(邊緣;M 鍵)
    this.pressQueued = false // 一次指標按下(邊緣,非暫停區)
    this.pressX = 0
    this.pressY = 0
    this.pointerDown = false // 指標是否持續按住(非暫停區)
    this.pointerX = 0
    this.pointerY = 0
    this.viewW = 1
    this.viewH = 1
    this.tapQueued = false // 一次「輕點」(短按即放,沒怎麼移動)
    this._downT = 0
    this._downX = 0
    this._downY = 0
    this._moved = false
  }

  attach(canvas) {
    this.canvas = canvas
    this._onKeyDown = (e) => {
      switch (e.code) {
        case 'Space':
        case 'ArrowUp':
        case 'KeyW':
          e.preventDefault()
          this.jumpQueued = true
          break
        case 'ArrowRight':
        case 'KeyD':
          this.right = true
          break
        case 'ArrowLeft':
        case 'KeyA':
          this.left = true
          break
        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault()
          this.down = true
          break
        case 'KeyP':
        case 'Escape':
          e.preventDefault()
          this.pauseQueued = true
          break
        case 'KeyM':
          this.muteQueued = true
          break
      }
    }
    this._onKeyUp = (e) => {
      switch (e.code) {
        case 'ArrowRight':
        case 'KeyD':
          this.right = false
          break
        case 'ArrowLeft':
        case 'KeyA':
          this.left = false
          break
        case 'ArrowDown':
        case 'KeyS':
          this.down = false
          break
      }
    }

    const updatePos = (e) => {
      const rect = canvas.getBoundingClientRect()
      this.viewW = rect.width
      this.viewH = rect.height
      this.pointerX = e.clientX - rect.left
      this.pointerY = e.clientY - rect.top
    }

    this._onPointerDown = (e) => {
      e.preventDefault()
      updatePos(e)
      if (this.pointerX >= this.viewW - 70 && this.pointerY <= 70) {
        this.pauseQueued = true
        return
      }
      this.pointerDown = true
      this.pressQueued = true
      this.pressX = this.pointerX
      this.pressY = this.pointerY
      this._downT = performance.now()
      this._downX = this.pointerX
      this._downY = this.pointerY
      this._moved = false
    }
    this._onPointerMove = (e) => {
      if (this.pointerDown) {
        updatePos(e)
        if (Math.hypot(this.pointerX - this._downX, this.pointerY - this._downY) > 14) {
          this._moved = true
        }
      }
    }
    this._onPointerEnd = () => {
      if (this.pointerDown) {
        if (performance.now() - this._downT < 200 && !this._moved) this.tapQueued = true
      }
      this.pointerDown = false
    }
    this._onBlur = () => {
      this.right = this.left = this.down = false
      this.pointerDown = false
    }

    window.addEventListener('keydown', this._onKeyDown)
    window.addEventListener('keyup', this._onKeyUp)
    canvas.addEventListener('pointerdown', this._onPointerDown)
    canvas.addEventListener('pointermove', this._onPointerMove)
    canvas.addEventListener('pointerup', this._onPointerEnd)
    canvas.addEventListener('pointercancel', this._onPointerEnd)
    window.addEventListener('blur', this._onBlur)
  }

  // 移除所有監聽(嵌入卸載時 game.destroy() 呼叫)。
  detach() {
    if (this._onKeyDown) window.removeEventListener('keydown', this._onKeyDown)
    if (this._onKeyUp) window.removeEventListener('keyup', this._onKeyUp)
    if (this._onBlur) window.removeEventListener('blur', this._onBlur)
    const c = this.canvas
    if (c) {
      if (this._onPointerDown) c.removeEventListener('pointerdown', this._onPointerDown)
      if (this._onPointerMove) c.removeEventListener('pointermove', this._onPointerMove)
      if (this._onPointerEnd) {
        c.removeEventListener('pointerup', this._onPointerEnd)
        c.removeEventListener('pointercancel', this._onPointerEnd)
      }
    }
  }

  consumeJump() {
    const j = this.jumpQueued
    this.jumpQueued = false
    return j
  }

  consumePause() {
    const p = this.pauseQueued
    this.pauseQueued = false
    return p
  }

  consumeMute() {
    const m = this.muteQueued
    this.muteQueued = false
    return m
  }

  // 取出一次指標按下(邊緣),回傳 {x,y} 或 null
  consumePress() {
    if (!this.pressQueued) return null
    this.pressQueued = false
    return { x: this.pressX, y: this.pressY }
  }

  // 取出一次「輕點」(邊緣),回傳 true/false
  consumeTap() {
    const t = this.tapQueued
    this.tapQueued = false
    return t
  }
}

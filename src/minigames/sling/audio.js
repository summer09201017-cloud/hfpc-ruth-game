// 極簡 Web Audio 合成音效（零音檔、可離線、跨專案可重用）。
// 音訊要在使用者手勢中解鎖，所以 unlock() 在「開始」按鈕按下時呼叫。
export class SlingAudio {
  constructor() {
    this.ctx = null
    this.muted = false
  }
  unlock() {
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)()
      if (this.ctx.state === 'suspended') this.ctx.resume()
    } catch {}
  }
  _beep(freq, dur, type = 'sine', gain = 0.12, slideTo = null) {
    if (this.muted || !this.ctx) return
    try {
      const t = this.ctx.currentTime
      const o = this.ctx.createOscillator()
      const g = this.ctx.createGain()
      o.type = type
      o.frequency.setValueAtTime(freq, t)
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
      g.gain.setValueAtTime(gain, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      o.connect(g).connect(this.ctx.destination)
      o.start(t)
      o.stop(t + dur)
    } catch {}
  }
  swing() { this._beep(220, 0.18, 'triangle', 0.06, 540) } // 甩出去：上滑「咻」
  hit() { // 命中：低頓一聲 + 一點亮音
    this._beep(140, 0.22, 'square', 0.16, 70)
    setTimeout(() => this._beep(660, 0.18, 'sine', 0.1), 90)
  }
  miss() { this._beep(180, 0.25, 'sawtooth', 0.08, 90) } // 落空：下滑悶音
  win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this._beep(f, 0.22, 'sine', 0.12), i * 130)) }
  destroy() { try { this.ctx && this.ctx.close() } catch {} this.ctx = null }
}

// 極簡 Web Audio 合成音效（零音檔、可離線）。複製自 sling/audio 的合成法。
export class BuildAudio {
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
  _beep(freq, dur, type = 'sine', gain = 0.1, slideTo = null) {
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
  knock() { // 釘木板命中：清脆「叩—叩」
    this._beep(150, 0.09, 'square', 0.14, 90)
    setTimeout(() => this._beep(110, 0.07, 'square', 0.08), 60)
  }
  miss() { this._beep(120, 0.16, 'sawtooth', 0.09, 70) } // 鎚歪了：悶悶一聲
  section() { this._beep(660, 0.16, 'sine', 0.1) } // 完成一段：清亮一聲
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => this._beep(f, 0.24, 'sine', 0.12), i * 130)) }
  destroy() { try { this.ctx && this.ctx.close() } catch {} this.ctx = null }
}

// 極簡 Web Audio 合成音效 + 背景音樂（零音檔、可離線、跨專案可重用）。複製自 sling/audio 的合成法。
// 音訊要在使用者手勢中解鎖，所以 unlock() 在「開始」點擊時呼叫。
// BGM：一段輕柔循環旋律（大調五聲，溫暖、適合方舟/動物主題），用獨立 bgm 匯流排小聲播，
//      不和翻牌/配對/勝利音效打架；靜音時不出聲，destroy 時停。
const MELODY = [
  // [半音相對主音, 拍長(步)]；主音 = C5(523.25Hz)。和緩、循環不膩。
  [0, 2], [4, 2], [7, 2], [4, 2], [9, 2], [7, 2], [4, 2], [0, 2],
  [2, 2], [5, 2], [9, 2], [5, 2], [7, 2], [4, 2], [2, 2], [-3, 2],
]
const BASE = 523.25 // C5
const STEP_MS = 300 // 每「步」時值

export class PairsAudio {
  constructor() {
    this.ctx = null
    this.muted = false
    this.bgmBus = null
    this.bgmTimer = null
    this.bgmStep = 0
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
  flip() { this._beep(440, 0.08, 'triangle', 0.06, 620) } // 翻牌：短「啪」
  match() { // 配對成功：兩聲上行 + 一點亮
    this._beep(523, 0.12, 'sine', 0.12)
    setTimeout(() => this._beep(784, 0.18, 'sine', 0.12), 110)
  }
  miss() { this._beep(240, 0.2, 'sawtooth', 0.07, 150) } // 翻錯：下滑悶音
  win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this._beep(f, 0.22, 'sine', 0.12), i * 130)) }

  // —— 背景音樂（輕柔循環）——
  startBgm() {
    if (!this.ctx || this.bgmTimer || this.muted) return
    try {
      this.bgmBus = this.ctx.createGain()
      this.bgmBus.gain.value = 0.05 // 小聲，墊底不搶戲
      this.bgmBus.connect(this.ctx.destination)
    } catch { return }
    this.bgmStep = 0
    const playNote = () => {
      if (!this.ctx || this.muted || !this.bgmBus) return
      const [semi, len] = MELODY[this.bgmStep % MELODY.length]
      const freq = BASE * Math.pow(2, semi / 12)
      const t = this.ctx.currentTime
      const dur = (STEP_MS * len) / 1000
      try {
        // 主音（三角波，柔）
        const o = this.ctx.createOscillator()
        const g = this.ctx.createGain()
        o.type = 'triangle'
        o.frequency.setValueAtTime(freq, t)
        g.gain.setValueAtTime(0.0001, t)
        g.gain.exponentialRampToValueAtTime(0.9, t + 0.05)
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.95)
        o.connect(g).connect(this.bgmBus)
        o.start(t); o.stop(t + dur)
        // 低八度墊音（更柔的正弦），偶數步才加，做出和聲呼吸感
        if (this.bgmStep % 2 === 0) {
          const o2 = this.ctx.createOscillator()
          const g2 = this.ctx.createGain()
          o2.type = 'sine'
          o2.frequency.setValueAtTime(freq / 2, t)
          g2.gain.setValueAtTime(0.0001, t)
          g2.gain.exponentialRampToValueAtTime(0.5, t + 0.08)
          g2.gain.exponentialRampToValueAtTime(0.0001, t + dur)
          o2.connect(g2).connect(this.bgmBus)
          o2.start(t); o2.stop(t + dur)
        }
      } catch {}
      this.bgmStep++
    }
    playNote()
    this.bgmTimer = setInterval(playNote, STEP_MS)
  }
  stopBgm() {
    if (this.bgmTimer) { clearInterval(this.bgmTimer); this.bgmTimer = null }
    try { if (this.bgmBus) { this.bgmBus.disconnect(); this.bgmBus = null } } catch {}
  }
  setMuted(m) {
    this.muted = !!m
    if (this.muted) this.stopBgm()
    else this.startBgm()
  }

  destroy() {
    this.stopBgm()
    try { this.ctx && this.ctx.close() } catch {}
    this.ctx = null
  }
}

// ===========================================================================
// 音效 + 背景音樂（純 Web Audio 合成，不需任何音檔，離線可用）
// ---------------------------------------------------------------------------
// 設計原則：跟遊戲規則完全無關，純畫面層。用合成音（oscillator）做出：
//   跑馬燈滴答聲、停下叮聲、移動、答對、答錯、勝利，以及溫和的循環背景音樂。
// 不用音檔 → 打包小、PWA 離線也能響、不必管理素材。
// 瀏覽器自動播放限制：AudioContext 必須在「使用者點擊之後」才喚醒（見 unlock）。
// ===========================================================================

let ctx = null
let master = null
let muted = loadMuted()
let bgmTimer = null
let bgmStep = 0

function loadMuted() {
  try {
    return localStorage.getItem('paul_muted') === '1'
  } catch {
    return false
  }
}
function saveMuted(m) {
  try {
    localStorage.setItem('paul_muted', m ? '1' : '0')
  } catch {
    /* localStorage 可能被停用，忽略即可 */
  }
}

function ensureCtx() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.9
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// 播放一個合成音：頻率、長度，外加波形 / 音量 / 起始延遲。
function tone(freq, dur, { type = 'sine', gain = 0.2, at = 0, release = 0.06 } = {}) {
  const c = ensureCtx()
  if (!c || muted) return
  const t0 = c.currentTime + at
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g)
  g.connect(master)
  osc.start(t0)
  osc.stop(t0 + dur + release)
}

// 常用音名 → 頻率（Hz）
const N = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0, C6: 1046.5,
}
// 背景音樂用的五聲音階（怎麼排都好聽，適合輕鬆的兒童氣氛）
const PENTA = [N.C4, N.D4, N.E4, N.G4, N.A4, N.C5, N.A4, N.G4, N.E4, N.D4]

export const sound = {
  isMuted() {
    return muted
  },
  setMuted(m) {
    muted = m
    saveMuted(m)
    if (m) this.stopBgm()
  },
  toggleMuted() {
    this.setMuted(!muted)
    return muted
  },
  // 使用者第一次點擊時呼叫，喚醒被瀏覽器擋住的 AudioContext。
  unlock() {
    ensureCtx()
  },

  tick() {
    tone(1300, 0.035, { type: 'square', gain: 0.045 })
  }, // 跑馬燈每跳一格的滴答
  ding() {
    tone(N.C5, 0.12, { gain: 0.22 })
    tone(N.G5, 0.2, { gain: 0.18, at: 0.07 })
  }, // 跑馬燈停下
  move() {
    tone(N.A4, 0.05, { type: 'triangle', gain: 0.1 })
  },
  correct() {
    ;[N.C5, N.E5, N.G5].forEach((f, i) => tone(f, 0.2, { type: 'triangle', gain: 0.22, at: i * 0.09 }))
  },
  wrong() {
    tone(220, 0.22, { type: 'sawtooth', gain: 0.11 })
    tone(174.61, 0.3, { type: 'sawtooth', gain: 0.11, at: 0.1 })
  },
  click() {
    tone(660, 0.05, { type: 'square', gain: 0.07 })
  },
  win() {
    ;[N.C5, N.E5, N.G5, N.C6].forEach((f, i) =>
      tone(f, 0.3, { type: 'triangle', gain: 0.24, at: i * 0.13 }),
    )
  },

  startBgm() {
    if (muted) return
    if (!ensureCtx()) return
    if (bgmTimer) return // 已在播
    bgmStep = 0
    bgmTimer = setInterval(() => {
      if (muted) return
      const note = PENTA[bgmStep % PENTA.length]
      tone(note, 0.45, { type: 'triangle', gain: 0.05 }) // 主旋律（很輕）
      if (bgmStep % 4 === 0) tone(note / 2, 0.9, { type: 'sine', gain: 0.04 }) // 低音襯底
      bgmStep++
    }, 460)
  },
  stopBgm() {
    if (bgmTimer) {
      clearInterval(bgmTimer)
      bgmTimer = null
    }
  },
}

// 程序化音效與背景音樂 —— Web Audio API 即時合成,零音檔、零相依、可離線。
// (沿用約拿引擎的合成器;換成較溫柔的旋律,並加一個「癱坐 faint」柔和音效。)
// 瀏覽器規定:音訊必須在使用者手勢中啟動,所以遊戲開始時呼叫 unlock()。

let ctx = null
let masterGain, sfxGain, musicGain
let muted = false
let musicOn = false
let musicTimer = null
let nextLoopTime = 0

try {
  muted = localStorage.getItem('elijah_muted') === '1'
} catch {
  /* ignore */
}

function ensure() {
  if (ctx) return
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    ctx = new AC()
    masterGain = ctx.createGain()
    masterGain.gain.value = muted ? 0 : 0.9
    masterGain.connect(ctx.destination)
    sfxGain = ctx.createGain()
    sfxGain.gain.value = 0.55
    sfxGain.connect(masterGain)
    musicGain = ctx.createGain()
    musicGain.gain.value = 0.14 // 溫柔、偏小聲
    musicGain.connect(masterGain)
  } catch {
    ctx = null
  }
}

function tone(freq, dur, startT, vol, type, dest) {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, startT)
  const a = 0.012
  const rel = Math.min(0.12, dur * 0.5)
  g.gain.setValueAtTime(0.0001, startT)
  g.gain.exponentialRampToValueAtTime(vol, startT + a)
  g.gain.setValueAtTime(vol, startT + Math.max(a, dur - rel))
  g.gain.exponentialRampToValueAtTime(0.0001, startT + dur)
  osc.connect(g)
  g.connect(dest)
  osc.start(startT)
  osc.stop(startT + dur + 0.03)
}

function blip(freq, dur, type = 'sine', vol = 0.5, slideTo = null) {
  ensure()
  if (!ctx) return
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g)
  g.connect(sfxGain)
  osc.start(t)
  osc.stop(t + dur + 0.03)
}

function arp(notes, type = 'triangle', noteDur = 0.12, vol = 0.5) {
  ensure()
  if (!ctx) return
  let t = ctx.currentTime
  for (const f of notes) {
    tone(f, noteDur * 1.4, t, vol, type, sfxGain)
    t += noteDur
  }
}

// ---- 背景音樂:溫柔、帶盼望的循環旋律(較慢、三角波) ----
const BEAT = 0.42
const MELODY = [
  [392, 2], [440, 1], [523, 1],
  [494, 2], [392, 2],
  [440, 2], [523, 1], [587, 1],
  [523, 2], [440, 2],
  [523, 2], [587, 1], [659, 1],
  [587, 2], [494, 2],
  [440, 1], [494, 1], [523, 2],
  [392, 4],
]
const BASS = [131, 175, 165, 131, 175, 196, 175, 131]
const LOOP_BEATS = MELODY.reduce((s, [, b]) => s + b, 0)

function scheduleLoop(start) {
  let t = start
  for (const [f, b] of MELODY) {
    if (f) tone(f, b * BEAT * 0.92, t, 0.5, 'triangle', musicGain)
    t += b * BEAT
  }
  for (let i = 0; i < BASS.length; i++) {
    tone(BASS[i], BEAT * 3.6, start + i * 4 * BEAT, 0.4, 'sine', musicGain)
  }
}

function pump() {
  if (!musicOn || !ctx) return
  const loopDur = LOOP_BEATS * BEAT
  while (nextLoopTime < ctx.currentTime + 1.2) {
    scheduleLoop(nextLoopTime)
    nextLoopTime += loopDur
  }
  musicTimer = setTimeout(pump, 280)
}

export const Audio = {
  unlock() {
    ensure()
    if (ctx && ctx.state === 'suspended') ctx.resume()
  },

  get muted() {
    return muted
  },
  setMuted(m) {
    muted = m
    if (masterGain) masterGain.gain.value = m ? 0 : 0.9
    try {
      localStorage.setItem('elijah_muted', m ? '1' : '0')
    } catch {
      /* ignore */
    }
  },
  toggleMute() {
    this.setMuted(!muted)
    return muted
  },

  startMusic() {
    ensure()
    if (!ctx) return
    if (musicOn) return
    musicOn = true
    nextLoopTime = ctx.currentTime + 0.12
    pump()
  },
  stopMusic() {
    musicOn = false
    if (musicTimer) {
      clearTimeout(musicTimer)
      musicTimer = null
    }
  },
  pauseAll() {
    this.stopMusic()
    if (ctx && ctx.state === 'running') ctx.suspend()
  },
  resumeAll() {
    if (ctx && ctx.state === 'suspended') ctx.resume()
    this.startMusic()
  },

  // ---- 音效 ----
  sfx(name, opt = {}) {
    switch (name) {
      case 'jump':
        blip(380, 0.16, 'sine', 0.4, 720)
        break
      case 'treasure': {
        // 撿到餅水:溫暖的上行小音(value 越大音越高)
        const base = 620 + Math.min(opt.value || 8, 26) * 12
        blip(base, 0.09, 'triangle', 0.4)
        blip(base * 1.5, 0.12, 'triangle', 0.34)
        break
      }
      case 'boost':
        arp([523, 784, 1047], 'triangle', 0.09, 0.5) // 炭火燒的餅:上行三連音
        break
      case 'hazard':
        blip(220, 0.2, 'sine', 0.32, 120) // 碰到熱浪/塵霧:溫和的低落音(不刺耳)
        break
      case 'faint':
        arp([392, 330, 262], 'sine', 0.16, 0.4) // 癱坐:柔和的下行(不是失敗音)
        break
      case 'win':
        arp([523, 659, 784, 1047, 1319], 'triangle', 0.14, 0.5)
        break
    }
  },
}

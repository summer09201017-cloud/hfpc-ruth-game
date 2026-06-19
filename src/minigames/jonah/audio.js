// 程序化音效與背景音樂 —— 用 Web Audio API 即時合成,零音檔、零相依、可離線。
// 瀏覽器規定:音訊必須在使用者手勢中啟動,所以遊戲開始(按鈕/按鍵)時呼叫 unlock()。

let ctx = null
let masterGain, sfxGain, musicGain
let muted = false
let musicOn = false
let musicTimer = null
let nextLoopTime = 0

// 讀取靜音偏好
try {
  muted = localStorage.getItem('jonah_muted') === '1'
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
    musicGain.gain.value = 0.16 // 背景音樂偏小聲,不蓋過音效/不吵
    musicGain.connect(masterGain)
  } catch {
    ctx = null
  }
}

// 合成一個音(帶柔和的起音/收音包絡)
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

// 短促音效:可滑音(slideTo)
function blip(freq, dur, type = 'square', vol = 0.5, slideTo = null) {
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

// 一串音符(用於過關/失敗短曲)
function arp(notes, type = 'square', noteDur = 0.12, vol = 0.5) {
  ensure()
  if (!ctx) return
  let t = ctx.currentTime
  for (const f of notes) {
    tone(f, noteDur * 1.4, t, vol, type, sfxGain)
    t += noteDur
  }
}

// ---- 背景音樂:C 大調、輕快流暢的循環旋律 + 柔和低音 ----
const BEAT = 0.34
// [頻率, 拍數],0 = 休止
const MELODY = [
  [392, 1], [523, 1], [659, 1], [523, 1],
  [587, 1], [523, 1], [392, 2],
  [440, 1], [523, 1], [587, 1], [523, 1],
  [494, 1], [392, 1], [330, 2],
  [392, 1], [523, 1], [659, 1], [784, 1],
  [659, 1], [523, 1], [587, 2],
  [523, 1], [494, 1], [440, 1], [392, 1],
  [440, 1], [392, 1], [262, 2],
]
const BASS = [131, 131, 175, 165, 131, 131, 175, 196] // 每 4 拍一個根音

// ---- 聖歌:代下 20 約沙法「稱謝耶和華,因他的慈愛永遠長存」----
// 莊嚴流暢的讚美詩旋律(C 大調、慢板),聖歌奇兵(level 9)專用,與輕快的關卡旋律區分。
const HYMN_BEAT = 0.44
const HYMN = [
  [523, 2], [587, 1], [659, 1], [659, 2], [587, 2],
  [659, 1], [698, 1], [784, 2], [784, 2], [659, 2],
  [698, 1], [659, 1], [587, 2], [659, 1], [587, 1], [523, 2],
  [587, 2], [523, 1], [494, 1], [523, 4],
]
const HYMN_BASS = [131, 165, 175, 196, 175, 165, 147, 131] // 每 4 拍一個根音(I–iii–IV–V…回 I)

// 目前播放的曲目(關卡輕快旋律 / 聖歌),由 startMusic(track) 切換;lastTrack 供暫停後恢復沿用。
let curMelody = MELODY, curBass = BASS, curBeat = BEAT
let curLoopBeats = MELODY.reduce((s, [, b]) => s + b, 0)
let lastTrack = 'level'

function scheduleLoop(start) {
  let t = start
  for (const [f, b] of curMelody) {
    if (f) tone(f, b * curBeat * 0.92, t, 0.5, 'triangle', musicGain)
    t += b * curBeat
  }
  // 低音:每 4 拍一個,柔和方波
  for (let i = 0; i < curBass.length; i++) {
    tone(curBass[i], curBeat * 3.6, start + i * 4 * curBeat, 0.4, 'sine', musicGain)
  }
}

function pump() {
  if (!musicOn || !ctx) return
  const loopDur = curLoopBeats * curBeat
  while (nextLoopTime < ctx.currentTime + 1.2) {
    scheduleLoop(nextLoopTime)
    nextLoopTime += loopDur
  }
  musicTimer = setTimeout(pump, 280)
}

export const Audio = {
  // 在使用者手勢中呼叫一次,解鎖音訊
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
      localStorage.setItem('jonah_muted', m ? '1' : '0')
    } catch {
      /* ignore */
    }
  },
  toggleMute() {
    this.setMuted(!muted)
    return muted
  },

  startMusic(track = lastTrack) {
    ensure()
    if (!ctx) return
    lastTrack = track
    const wantHymn = track === 'hymn'
    const changed = wantHymn ? curMelody !== HYMN : curMelody !== MELODY
    if (wantHymn) { curMelody = HYMN; curBass = HYMN_BASS; curBeat = HYMN_BEAT }
    else { curMelody = MELODY; curBass = BASS; curBeat = BEAT }
    curLoopBeats = curMelody.reduce((s, [, b]) => s + b, 0)
    if (musicOn && !changed) return
    if (musicOn && changed) this.stopMusic() // 切換曲目:先停再起
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
  // 暫停:停音樂並暫停音訊時鐘
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
        blip(380, 0.16, 'square', 0.45, 760)
        break
      case 'treasure': {
        if (opt.life) {
          arp([523, 784, 1047], 'square', 0.09, 0.5) // 愛心:上行三連音
        } else {
          // 依價值升高音高:🪙1→🕊️10
          const base = 660 + Math.min(opt.value || 1, 10) * 38
          blip(base, 0.09, 'square', 0.4)
          blip(base * 1.5, 0.12, 'square', 0.35)
        }
        break
      }
      case 'stomp':
        blip(200, 0.12, 'square', 0.5, 90)
        break
      case 'hit':
        blip(180, 0.28, 'sawtooth', 0.45, 70)
        break
      case 'win':
        arp([523, 659, 784, 1047, 1319], 'square', 0.13, 0.5)
        break
      case 'lose':
        arp([392, 330, 262, 196], 'triangle', 0.18, 0.5)
        break
      case 'thunder': {
        // 低沉隆隆聲:低頻 sawtooth 快速下滑
        blip(90, 0.5, 'sawtooth', 0.5, 40)
        blip(140, 0.35, 'triangle', 0.3, 55)
        break
      }
    }
  },
}

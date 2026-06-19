// 卡片關背景音樂(2026-06-14)——零音檔、純 Web Audio 即時合成,可離線。
// 每個卡片關用不同曲風(spec.music 指定);音量很低、當柔和背景,不吵到投影講解。
// 有靜音記憶(localStorage)。在使用者手勢(按「開始/下一步」)後才會真的發聲(瀏覽器規定)。

let ctx = null, master = null, timer = null, cur = null
let muted = false
try { muted = localStorage.getItem('cardMusicMuted') === '1' } catch {}

// 各曲風:root=主音頻率(換調做出不同色彩)、bpm=速度、wave=音色、prog=4 個和弦(半音偏移三和弦)。
const TRACKS = {
  warm:     { root: 174.61, bpm: 84,  wave: 'triangle', prog: [[0, 4, 7], [-3, 0, 4], [-5, -1, 2], [-1, 2, 7]] }, // 福音:溫暖盼望
  tender:   { root: 164.81, bpm: 72,  wave: 'sine',     prog: [[0, 3, 7], [-2, 3, 5], [-4, 0, 3], [-5, -1, 2]] }, // 盼望:溫柔
  bright:   { root: 196.00, bpm: 108, wave: 'triangle', prog: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]] },  // 大光:明亮得勝
  majestic: { root: 146.83, bpm: 66,  wave: 'sawtooth', prog: [[0, 3, 7], [-5, -1, 2], [-3, 0, 4], [2, 5, 9]] },  // 但以理:莊嚴神祕
  solemn:   { root: 130.81, bpm: 78,  wave: 'triangle', prog: [[0, 3, 7], [5, 8, 12], [-2, 1, 5], [0, 3, 7]] },   // 出埃及:史詩肅穆
}

function ensure() {
  if (ctx) return
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = muted ? 0 : 0.11
  master.connect(ctx.destination)
}

function blip(f, t, dur, type, gain) {
  const o = ctx.createOscillator(), g = ctx.createGain()
  o.type = type; o.frequency.value = f
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.03)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g); g.connect(master)
  o.start(t); o.stop(t + dur + 0.05)
}

export function play(key) {
  ensure()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume()
  if (cur === key && timer) return // 已在播同一首
  stop()
  cur = key
  const T = TRACKS[key] || TRACKS.warm
  const beat = 60 / T.bpm, bar = beat * 4
  const f = (semi) => T.root * Math.pow(2, semi / 12)
  let next = 0, bi = 0, started = false
  const schedule = () => {
    if (!ctx) return
    if (ctx.state !== 'running') { timer = setTimeout(schedule, 200); return } // 等使用者手勢解鎖
    if (!started) { next = ctx.currentTime + 0.12; started = true }
    while (next < ctx.currentTime + 0.5) {
      const ch = T.prog[bi % T.prog.length]
      blip(f(ch[0]) / 2, next, bar * 0.92, 'sine', 0.16)            // 低音
      ch.forEach((s) => blip(f(s), next, bar * 0.95, T.wave, 0.05)) // 和弦 pad
      for (let b = 0; b < 4; b++) blip(f(ch[b % ch.length] + 12), next + b * beat, beat * 0.55, 'sine', 0.045) // 柔和琶音
      next += bar; bi++
    }
    timer = setTimeout(schedule, 140)
  }
  schedule()
}

export function stop() {
  if (timer) { clearTimeout(timer); timer = null }
  cur = null
}

export function toggleMute() {
  muted = !muted
  try { localStorage.setItem('cardMusicMuted', muted ? '1' : '0') } catch {}
  if (master) master.gain.value = muted ? 0 : 0.11
  return muted
}

export function isMuted() { return muted }

// ===========================================================================
// 產生 PWA 圖示（小帆船，象徵宣教之旅）。
// 不依賴任何影像套件——直接用 node 內建 zlib 手寫 PNG 編碼。
// 執行： node scripts/gen-icons.mjs   →   產生 public/icon-*.png
// ===========================================================================
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../public')
mkdirSync(outDir, { recursive: true })

// ---- CRC32（PNG chunk 需要）----
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}
function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  // 10,11,12 = 0 (compression/filter/interlace)
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0 // filter type 0
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

// ---- 幾何輔助 ----
function inTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
  const a = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / d
  const b = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / d
  const c = 1 - a - b
  return a >= 0 && b >= 0 && c >= 0
}

function drawIcon(S) {
  const buf = Buffer.alloc(S * S * 4)
  const set = (x, y, r, g, b, a = 255) => {
    const i = (y * S + x) * 4
    buf[i] = r
    buf[i + 1] = g
    buf[i + 2] = b
    buf[i + 3] = a
  }
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S
      const v = y / S
      // 預設：海藍漸層背景
      let r = 0x2e
      let g = 0x86
      let b = 0xab
      const shade = 1 - v * 0.25
      r *= shade
      g *= shade
      b *= shade

      // 海浪（底部淺色帶）
      if (v > 0.74) {
        r = 0xa9
        g = 0xd0
        b = 0xdb
      }

      // 船帆（白色三角形）A 桅頂, B 桅底, C 右下
      if (inTriangle(u, v, 0.5, 0.24, 0.5, 0.62, 0.72, 0.62)) {
        r = 250
        g = 248
        b = 240
      }
      // 左側小帆
      if (inTriangle(u, v, 0.49, 0.34, 0.49, 0.62, 0.34, 0.62)) {
        r = 244
        g = 231
        b = 207
      }
      // 桅杆（棕色細直線）
      if (Math.abs(u - 0.5) < 0.014 && v > 0.22 && v < 0.64) {
        r = 0x6b
        g = 0x46
        b = 0x21
      }
      // 船身（棕色梯形）
      if (v >= 0.63 && v <= 0.73) {
        const t = (v - 0.63) / 0.1
        const hw = 0.22 - 0.1 * t
        if (Math.abs(u - 0.5) <= hw) {
          r = 0x8a
          g = 0x5a
          b = 0x2b
        }
      }

      set(x, y, Math.round(r), Math.round(g), Math.round(b), 255)
    }
  }
  return encodePng(S, S, buf)
}

for (const size of [192, 512]) {
  writeFileSync(join(outDir, `icon-${size}.png`), drawIcon(size))
  console.log(`寫出 public/icon-${size}.png`)
}
writeFileSync(join(outDir, 'apple-touch-icon.png'), drawIcon(180))
console.log('寫出 public/apple-touch-icon.png')
console.log('✅ 圖示產生完成')

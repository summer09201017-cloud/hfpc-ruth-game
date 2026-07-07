// gen-tts.mjs —— 把「固定會唸的經文句」用 edge-tts(微軟曉臻神經語音,免費)預產成 mp3,
// 產出 public/tts/<key>.mp3 + public/tts/manifest.json;runtime 的 speak.js 會 mp3 優先、缺檔退回 Web Speech。
// 用法:  node scripts/gen-tts.mjs            # 讀 scripts/tts-verses.json(完整「最終唸出的字串」清單)
// 新增句子:把 ActionScripture 實際組出的字串(verse + "。" + refSpoken)原樣加進 tts-verses.json 再重跑。
// ★ key 用 src/ttsFix.js 的 ttsKey(去空白後 FNV-1a),和 runtime 完全同一套——字串差一個字就對不上。
// ★ 需要網路(打微軟端點);devDependency msedge-tts。產出的 mp3 進 git(零後端、離線可用)。
// ★ 餵給 edge-tts 的文字同樣先過 toSpeakable 破音字典(雙句號收斂成單句號,不影響 key)。
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'
import { toSpeakable, ttsKey } from '../src/ttsFix.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(root, 'public', 'tts')
mkdirSync(OUT, { recursive: true })

const list = JSON.parse(readFileSync(join(root, 'scripts', 'tts-verses.json'), 'utf8'))
const manifestPath = join(OUT, 'manifest.json')
let manifest = {}
try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) } catch { /* 第一次 */ }

const VOICE = 'zh-TW-HsiaoChenNeural' // 曉臻(女聲,唸經文柔和);男聲可換 zh-TW-YunJheNeural

const { renameSync, rmSync, statSync } = await import('node:fs')
const saveManifest = () => writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + '\n', 'utf8')

let made = 0, skipped = 0, failed = 0
for (const entry of list) {
  const full = typeof entry === 'string' ? entry : entry.text
  const key = ttsKey(full)
  const file = `${key}.mp3`
  const fp = join(OUT, file)
  if (existsSync(fp)) { manifest[key] = `tts/${file}`; saveManifest(); skipped++; continue }
  const speech = toSpeakable(full).replace(/。+/g, '。')
  const tmpDir = join(OUT, `_tmp_${key}`)
  try {
    const tts = new MsEdgeTTS()
    await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
    mkdirSync(tmpDir, { recursive: true })
    const { audioFilePath } = await tts.toFile(tmpDir, speech)
    renameSync(audioFilePath, fp)
    try { tts.close && tts.close() } catch { /* socket 已關 */ }
    const kb = (statSync(fp).size / 1024).toFixed(0)
    manifest[key] = `tts/${file}`
    saveManifest() // 逐句落盤:中途死也不丟已完成的
    made++
    console.log(`  ✓ ${file}(${kb}KB)← ${full.slice(0, 24)}…`)
  } catch (e) {
    failed++
    console.error(`  ✗ ${full.slice(0, 24)}… → ${e && e.message}`)
  } finally {
    try { rmSync(tmpDir, { recursive: true, force: true }) } catch { /* noop */ }
  }
}
console.log(`✓ gen-tts:新產 ${made}、已存在 ${skipped}、失敗 ${failed};manifest 共 ${Object.keys(manifest).length} 句 → public/tts/`)
process.exit(failed ? 1 : 0) // 明確收尾(lib 的 WebSocket 會讓 process 掛著)

// 動物公母配對 + 安排房間（創世記 6–7；和平同住的圖畫參賽 11:6）。非程式者可改這裡。
//
// 玩法兩階段：
//   1) 配對：翻牌，同種一公♂一母♀配成對，住進方舟房間（這一關不會失敗）。
//   2) 安排房間：點一格選起來、再點另一格＝交換。規則：猛獸（獅/虎/熊/狐）旁邊
//      只能是「安全鄰居」＝大象或飛鳥，不能是會被吃的動物。全部排到平安就過關。
//
// 每隻動物有 role：
//   'predator' 猛獸（旁邊有規則）｜'safe' 安全鄰居（大象＋飛鳥）｜'prey' 會被吃的（草食/小動物）

export const ANIMALS = [
  // —— 猛獸 predator（旁邊只能放 safe）——
  { id: 'lion', emoji: '🦁', name: '獅子', role: 'predator' },
  { id: 'tiger', emoji: '🐯', name: '老虎', role: 'predator' },
  { id: 'bear', emoji: '🐻', name: '熊', role: 'predator' },
  { id: 'fox', emoji: '🦊', name: '狐狸', role: 'predator' },
  // —— 安全鄰居 safe（大象 + 飛鳥）——
  { id: 'elephant', emoji: '🐘', name: '大象', role: 'safe' },
  { id: 'dove', emoji: '🕊️', name: '鴿子', role: 'safe' }, // 挪亞放出去的那隻 🕊️
  { id: 'eagle', emoji: '🦅', name: '老鷹', role: 'safe' },
  { id: 'owl', emoji: '🦉', name: '貓頭鷹', role: 'safe' },
  { id: 'penguin', emoji: '🐧', name: '企鵝', role: 'safe' },
  // —— 會被吃的 prey（草食/小動物）——
  { id: 'dog', emoji: '🐶', name: '狗', role: 'prey' },
  { id: 'rabbit', emoji: '🐇', name: '小白兔', role: 'prey' },
  { id: 'sheep', emoji: '🐑', name: '綿羊', role: 'prey' },
  { id: 'cow', emoji: '🐄', name: '牛', role: 'prey' },
  { id: 'giraffe', emoji: '🦒', name: '長頸鹿', role: 'prey' },
  { id: 'zebra', emoji: '🦓', name: '斑馬', role: 'prey' },
  { id: 'horse', emoji: '🐴', name: '馬', role: 'prey' },
  { id: 'deer', emoji: '🦌', name: '鹿', role: 'prey' },
  { id: 'pig', emoji: '🐷', name: '豬', role: 'prey' },
  { id: 'mouse', emoji: '🐭', name: '老鼠', role: 'prey' },
  { id: 'cat', emoji: '🐱', name: '貓', role: 'prey' },
  { id: 'monkey', emoji: '🐵', name: '猴子', role: 'prey' },
]

// 「猛獸的安全鄰居」＝role==='safe'（大象或飛鳥）。
export const isSafeNeighbor = (role) => role === 'safe'
export const isPredator = (role) => role === 'predator'

// 小工具：洗牌（這裡只在 composeRound 用，runtime 呼叫，非繪製層）。
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 組出一局的動物種類（長度 = pairs），保證「安排房間」一定有解：
//   - 一定含獅子；pairs>=8 再隨機多一隻猛獸（共 2 隻）
//   - 安全鄰居（大象 + 飛鳥）數量 >= 猛獸數 ×2（夠把每隻猛獸的鄰居都填成 safe）
//   - 一定含狗、小白兔；其餘用隨機草食/小動物補滿
export function composeRound(pairs) {
  const byRole = (r) => ANIMALS.filter((a) => a.role === r)
  const pick = (arr, n) => shuffle([...arr]).slice(0, Math.max(0, n))

  const nPred = pairs >= 8 ? 2 : 1
  const nSafe = Math.max(nPred * 2, 3) // 角落猛獸各需 2 個 safe 鄰居

  const predators = byRole('predator')
  const lion = predators.find((a) => a.id === 'lion')
  const predPicks = [lion, ...pick(predators.filter((a) => a.id !== 'lion'), nPred - 1)]

  const safe = byRole('safe')
  const elephant = safe.find((a) => a.id === 'elephant')
  const safePicks = [elephant, ...pick(safe.filter((a) => a.id !== 'elephant'), nSafe - 1)]

  const prey = byRole('prey')
  const dog = prey.find((a) => a.id === 'dog')
  const rabbit = prey.find((a) => a.id === 'rabbit')
  const wantPrey = pairs - predPicks.length - safePicks.length
  const preyPicks = [dog, rabbit, ...pick(prey.filter((a) => a.id !== 'dog' && a.id !== 'rabbit'), wantPrey - 2)].slice(0, Math.max(0, wantPrey))

  return shuffle([...predPicks, ...safePicks, ...preyPicks]).slice(0, pairs)
}

export const CONTENT = {
  title: '🐘 一公一母進方舟',
  how: '先翻牌配對：同一種的一公♂一母♀（母的戴 🎀）配成對，住進方舟。配完後幫牠們安排房間——猛獸（獅虎熊狐）旁邊只能是大象或飛鳥，別讓會被吃的鄰居受驚。全部平安就過關！',
  intro: {
    kicker: '🌧️ 洪水要來了，動物快上方舟',
    ref: '創世記 6:19–20',
    line: '凡有血肉的活物，每樣兩個，一公一母，你要帶進方舟……每樣兩個，要到你那裡，好保全生命。',
    teach: '注意：是神「叫」動物自己來，不是挪亞滿山去抓。我們的本分是順服、預備好方舟；保全生命的是神。',
    cont: '點畫面　開始配對',
  },
  matchLines: [
    '一公一母，手牽手住進房間了 🏠',
    '神看顧每一種活物，一個都不少。',
    '又一對平安上船——方舟裡愈來愈熱鬧了。',
    '牠們自己來的，因為神吩咐了。',
    '保全生命的是神，挪亞只管照著行。',
    '方舟一間一間，正好住下每一對。',
  ],
  miss: [
    '這兩張不是同一種動物，再記一記位置，翻翻看別張。',
    '差一點～記住剛剛翻到什麼，再試一次。',
    '沒關係，慢慢找，神不急，方舟還在等。',
  ],
  // 進入「安排房間」階段的說明卡
  arrange: {
    kicker: '🛏️ 幫動物安排房間',
    ref: '以賽亞書 11:6',
    line: '豺狼必與綿羊羔同居，豹子與山羊羔同臥……',
    teach: '在神的看顧下凶猛的也能與柔弱的同住。點一格選起來、再點另一格就交換；把獅子（和老虎、熊、狐狸）旁邊都換成大象或飛鳥，方舟就平安了。',
    cont: '點畫面　開始安排',
  },
  // 還有猛獸旁邊不安全時的底部提示
  unsafeHint: '⚠ 紅框的猛獸旁邊還有會被吃的動物——點兩格交換，把牠的鄰居換成大象或飛鳥。',
  win: {
    kicker: '🌈 方舟平安了，全都上船',
    ref: '創世記 7:9',
    line: '都是一對一對地，有公有母，到挪亞那裡，進入方舟，正如神所吩咐挪亞的。',
    teach: '猛獸與柔弱的在方舟裡同住卻彼此相安——這是神看顧的平安。挪亞照著神所吩咐的去行，神就保全了一切活物。',
    cont: '點畫面　完成挑戰',
  },
}

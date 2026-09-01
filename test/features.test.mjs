import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildDeck,
  buildPptx,
  normalizeSlides,
  parseMarkdownDeck,
  renderHtml,
  resolveLanguage,
  resolveTheme,
} from '../skills/dsh-ppt/scripts/deck-core.mjs'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const theme = resolveTheme('data')
const language = resolveLanguage('zh')

test('Markdown 表格解析为 table 页：表头 + 数据行，跳过分隔线', () => {
  const deck = parseMarkdownDeck('报表', '# 报表\n\n## 业绩\n\n| 区 | 值 |\n| --- | --- |\n| 华 | 1 |\n| 南 | 2 |\n', 'zh')
  const table = deck.slides.find((slide) => slide.layout === 'table')
  assert.ok(table, '应有 table 页')
  assert.deepEqual(table.rows, [['区', '值'], ['华', '1'], ['南', '2']])
  assert.equal(table.title, '业绩')
})

test('Markdown > 引用解析为 quote 页，末行破折号识别为署名', () => {
  const deck = parseMarkdownDeck('信条', '# 信条\n\n## 信条页\n> 慢就是快。\n> —— 创始人\n', 'zh')
  const quote = deck.slides.find((slide) => slide.layout === 'quote')
  assert.ok(quote, '应有 quote 页')
  assert.equal(quote.title, '慢就是快。')
  assert.equal(quote.subtitle, '创始人')
})

test('HTML 注释备注附到该节产出的第一页，保留换行', () => {
  const deck = parseMarkdownDeck('备', '# 备\n\n## 页一\n<!-- 备注: 第一行要点强调 -->\n<!-- note: 第二行数据出处 -->\n- 要点甲\n- 要点乙\n', 'zh')
  const withNotes = deck.slides.filter((slide) => typeof slide.notes === 'string' && slide.notes !== '')
  assert.equal(withNotes.length, 1)
  assert.ok(withNotes[0].notes.includes('第一行要点强调'))
  assert.ok(withNotes[0].notes.includes('第二行数据出处'))
})

test('normalizeSlides 接受 quote / table / notes 结构化输入并做边界裁剪', () => {
  const slides = normalizeSlides([
    { layout: 'cover', title: '封面' },
    { layout: 'quote', quote: '', title: '金句正文', subtitle: '某人' },
    { layout: 'table', title: '数据', rows: [['a', 'b'], ['1', '2']], notes: '讲数据' },
    { layout: 'table', title: '空表' },
    { layout: 'closing', title: '谢' },
  ])
  assert.equal(slides[1].layout, 'quote')
  assert.equal(slides[1].title, '金句正文')
  assert.deepEqual(slides[2].rows, [['a', 'b'], ['1', '2']])
  assert.equal(slides[2].notes, '讲数据')
  assert.equal(slides[3].layout, 'bullets', '空表应退化为要点页')
})

test('HTML 渲染包含表格/金句/备注面板与 data-notes', () => {
  const manifest = {
    title: '特性',
    slides: [
      { layout: 'quote', kicker: '金句', title: '一句话', subtitle: '作者', notes: '备注内容' },
      { layout: 'table', kicker: '数据', title: '表', rows: [['列一', '列二'], ['甲', '乙']] },
    ],
  }
  const html = renderHtml(manifest, theme, language)
  assert.match(html, /class="quote-text">一句话/)
  assert.match(html, /quote-attr/)
  assert.match(html, /<table class="deck-table">/)
  assert.match(html, /<th>列一<\/th>/)
  assert.match(html, /<td>甲<\/td>/)
  assert.match(html, /data-notes="备注内容"/)
  assert.match(html, /id="notes-panel"/)
  assert.match(html, /classList\.toggle\('notes-open'\)/)
})

test('buildPptx 为带备注的页生成 notesSlide/notesMaster 全套部件', () => {
  const manifest = {
    title: '备注',
    slides: [
      { layout: 'cover', title: '封' },
      { layout: 'bullets', title: '页', bullets: ['一'], notes: '演讲提示词' },
      { layout: 'closing', title: '谢' },
    ],
  }
  const buf = buildPptx(manifest, theme, language)
  assert.equal(buf.subarray(0, 2).toString('ascii'), 'PK')
  // 扫中央目录拿文件名
  let eocd = -1
  for (let i = buf.length - 22; i >= 0; i -= 1) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  }
  const count = buf.readUInt16LE(eocd + 10)
  let ptr = buf.readUInt32LE(eocd + 16)
  const names = []
  for (let n = 0; n < count; n += 1) {
    const nameLen = buf.readUInt16LE(ptr + 28)
    const extraLen = buf.readUInt16LE(ptr + 30)
    const commentLen = buf.readUInt16LE(ptr + 32)
    names.push(buf.slice(ptr + 46, ptr + 46 + nameLen).toString('utf8'))
    ptr += 46 + nameLen + extraLen + commentLen
  }
  assert.ok(names.includes('ppt/notesMasters/notesMaster1.xml'))
  assert.ok(names.includes('ppt/notesSlides/notesSlide2.xml'))
  assert.ok(!names.includes('ppt/notesSlides/notesSlide1.xml'), '无备注的页不生成 notesSlide')
})

test('无备注 deck 不产出 notes 部件，保持原有最小结构', () => {
  const buf = buildPptx({ title: '无', slides: [{ layout: 'cover', title: '封' }] }, theme, language)
  const text = buf.toString('latin1')
  assert.ok(!text.includes('notesMaster1.xml'))
  assert.ok(!text.includes('notesSlide'))
})

test('buildDeck 端到端：表格 + 金句 + 备注三件套落盘', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-feat-'))
  try {
    const result = buildDeck({
      title: '全特性',
      content: '# 全特性\n\n## 数据\n\n| 项 | 值 |\n| --- | --- |\n| 甲 | 1 |\n<!-- 备注: 讲这页时看老板脸色 -->\n\n## 信念\n> 做难而正确的事。\n',
      theme: 'velvet',
      lang: 'zh',
      outputDir: dir,
      fileName: 'feat',
    })
    assert.equal(result.ok, true)
    const json = JSON.parse(readFileSync(result.jsonPath, 'utf8'))
    assert.ok(json.slides.some((slide) => slide.layout === 'table'))
    assert.ok(json.slides.some((slide) => slide.layout === 'quote'))
    assert.ok(json.slides.some((slide) => slide.notes !== undefined && slide.notes !== ''))
    const html = readFileSync(result.htmlPath, 'utf8')
    assert.match(html, /deck-table/)
    assert.match(html, /做难而正确的事。/)
    assert.equal(readFileSync(result.pptxPath).subarray(0, 2).toString('ascii'), 'PK')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

// --- motion：页间转场 + 要点入场动画 -----------------------------------------

import { inflateRawSync } from 'node:zlib'

function zipEntries(buf) {
  let eocd = -1
  for (let i = buf.length - 22; i >= 0; i -= 1) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  }
  const count = buf.readUInt16LE(eocd + 10)
  let ptr = buf.readUInt32LE(eocd + 16)
  const entries = {}
  for (let n = 0; n < count; n += 1) {
    const nameLen = buf.readUInt16LE(ptr + 28)
    const extraLen = buf.readUInt16LE(ptr + 30)
    const commentLen = buf.readUInt16LE(ptr + 32)
    const compressedSize = buf.readUInt32LE(ptr + 20)
    const localOffset = buf.readUInt32LE(ptr + 42)
    const name = buf.slice(ptr + 46, ptr + 46 + nameLen).toString('utf8')
    const localNameLen = buf.readUInt16LE(localOffset + 26)
    const localExtraLen = buf.readUInt16LE(localOffset + 28)
    const dataStart = localOffset + 30 + localNameLen + localExtraLen
    entries[name] = inflateRawSync(buf.slice(dataStart, dataStart + compressedSize)).toString('utf8')
    ptr += 46 + nameLen + extraLen + commentLen
  }
  return entries
}

const motionManifest = {
  title: '动效',
  slides: [
    { layout: 'cover', title: '封面' },
    { layout: 'bullets', title: '三个要点', bullets: ['甲', '乙', '丙'] },
    { layout: 'closing', title: '谢谢' },
  ],
}

test('motion 默认开：每页 fade 转场，bullets 页带逐条点击显现时序', () => {
  const entries = zipEntries(buildPptx(motionManifest, theme, language))
  for (const name of ['ppt/slides/slide1.xml', 'ppt/slides/slide2.xml', 'ppt/slides/slide3.xml']) {
    assert.match(entries[name], /<p:transition spd="med"><p:fade\/><\/p:transition>/, name + ' 应有转场')
  }
  const bullets = entries['ppt/slides/slide2.xml']
  assert.match(bullets, /<p:bldP spid="23" grpId="0"\/>/, '正文框应按段落构建')
  assert.match(bullets, /<p:timing>/)
  assert.equal((bullets.match(/nodeType="clickEffect"/g) ?? []).length, 3, '三条要点三个点击节点')
  assert.ok(!entries['ppt/slides/slide1.xml'].includes('<p:timing>'), '封面不需要时序树')
})

test('motion 关闭：PPTX 无转场无时序，HTML 落到 no-motion', () => {
  const off = { ...motionManifest, motion: false }
  const entries = zipEntries(buildPptx(off, theme, language))
  assert.ok(!entries['ppt/slides/slide2.xml'].includes('<p:transition'))
  assert.ok(!entries['ppt/slides/slide2.xml'].includes('<p:timing>'))
  const html = renderHtml(off, theme, language)
  assert.match(html, /<body class="no-motion">/)
  assert.ok(!html.includes('bullet-in'))
})

test('motion 开启时 HTML 有 stagger 变量与打印兜底', () => {
  const html = renderHtml({ ...motionManifest, motion: true }, theme, language)
  assert.match(html, /<body class="motion">/)
  assert.match(html, /<li style="--i:0">甲<\/li>/)
  assert.match(html, /<li style="--i:2">丙<\/li>/)
  assert.match(html, /@media print/)
  assert.match(html, /body\.motion \.bullets li\{opacity:1 !important/)
})

test('buildDeck 把 motion 记入 manifest，非法值报错', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-motion-'))
  try {
    const result = buildDeck({ title: '动效开关', content: '# 动效开关\n- 一\n- 二', motion: 'off', outputDir: dir })
    assert.equal(JSON.parse(readFileSync(result.jsonPath, 'utf8')).motion, false)
    assert.match(readFileSync(result.htmlPath, 'utf8'), /<body class="no-motion">/)
    assert.throws(() => buildDeck({ title: 'x', content: 'y', motion: 'maybe' }), /未知 motion 值/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

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

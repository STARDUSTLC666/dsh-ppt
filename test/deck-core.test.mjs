import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  THEMES,
  THEME_IDS,
  buildDeck,
  buildPptx,
  listThemes,
  parseMarkdownDeck,
  renderHtml,
  resolveLanguage,
  resolveTheme,
  sanitizeFileName,
} from '../skills/dsh-ppt/scripts/deck-core.mjs'

test('内置 5 套主题，id 与名称齐全', () => {
  assert.equal(THEME_IDS.length, 5)
  for (const id of THEME_IDS) {
    const theme = THEMES[id]
    assert.ok(theme.palette.bg)
    assert.ok(theme.palette.fg)
    assert.ok(theme.palette.accent)
    assert.ok(theme.name.zh)
    assert.ok(theme.name.en)
    assert.equal(theme.id, id)
  }
  assert.equal(listThemes('zh').length, 5)
  assert.equal(listThemes('en')[0].name, 'Swiss Pulse')
})

test('resolveTheme 与 resolveLanguage 中文报错', () => {
  assert.equal(resolveTheme('swiss').id, 'swiss')
  assert.throws(() => resolveTheme('neon'), /未知主题/)
  assert.throws(() => resolveTheme('neon'), /swiss/)
  assert.equal(resolveLanguage('bilingual').id, 'bilingual')
  assert.throws(() => resolveLanguage('fr'), /未知语言/)
})

test('一句话生成最小完整结构：封面 + 核心观点 + 结束页', () => {
  const deck = parseMarkdownDeck('一句话产品发布', '我们的产品让会议减少一半。', 'zh')
  assert.equal(deck.slides.length, 3)
  assert.equal(deck.slides[0].layout, 'cover')
  assert.equal(deck.slides[1].layout, 'statement')
  assert.equal(deck.slides[2].layout, 'closing')
  assert.equal(deck.slides[0].subtitle, '我们的产品让会议减少一半。')
})

test('首个 H1 下只有列表时不丢弃封面之外的要点', () => {
  const deck = parseMarkdownDeck('', '# 标题\n- 一\n- 二\n- 三', 'zh')
  assert.equal(deck.title, '标题')
  assert.equal(deck.slides[0].layout, 'cover')
  assert.equal(deck.slides[0].subtitle, '一')
  assert.equal(deck.slides[1].layout, 'bullets')
  assert.deepEqual(deck.slides[1].bullets, ['二', '三'])
  assert.equal(deck.slides.at(-1).layout, 'closing')
})

test('Markdown 标题与列表映射为对应页型', () => {
  const deck = parseMarkdownDeck('', '# 让会议少一半\n\n用异步决策替代同步例会。\n\n## 问题\n- 工程师每周 6 小时在例会上\n- 决策没有记录\n\n## 方案\n- 会前异步文档 + 24h 评论期\n- 只有分歧项才开会\n', 'zh')
  assert.equal(deck.title, '让会议少一半')
  assert.equal(deck.slides[0].layout, 'cover')
  assert.equal(deck.slides[0].subtitle, '用异步决策替代同步例会。')
  assert.equal(deck.slides[1].layout, 'bullets')
  assert.equal(deck.slides[1].title, '问题')
  assert.deepEqual(deck.slides[1].bullets, ['工程师每周 6 小时在例会上', '决策没有记录'])
  assert.equal(deck.slides[2].title, '方案')
  assert.equal(deck.slides.at(-1).layout, 'closing')
})

test('无标题文档按段落拆要点页', () => {
  const deck = parseMarkdownDeck('无标题文档', '第一句是封面副标题。第二句是第一页要点。第三句也是第一页要点。\n\n新段落带来新的一页。这里还有第二句。', 'zh')
  assert.equal(deck.slides[0].layout, 'cover')
  assert.ok(deck.slides.some((slide) => slide.layout === 'bullets'))
  assert.equal(deck.slides.at(-1).layout, 'closing')
})

test('buildDeck 写入 HTML / PPTX / JSON 三件套', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-core-'))
  try {
    const out = buildDeck({
      title: '测试 Deck',
      content: '# 测试 Deck\n\n- 要点一\n- 要点二\n',
      theme: 'velvet',
      lang: 'en',
      outputDir: dir,
      fileName: 'deck-test',
    })
    assert.equal(out.ok, true)
    assert.equal(out.slideCount, 3)
    assert.equal(out.theme, 'velvet')
    assert.equal(out.language, 'en')
    assert.ok(readFileSync(out.htmlPath, 'utf8').includes('slide--cover'))
    assert.ok(readFileSync(out.htmlPath, 'utf8').includes('#C9A84C'))
    const pptx = readFileSync(out.pptxPath)
    assert.equal(pptx.subarray(0, 2).toString('ascii'), 'PK')
    assert.ok(pptx.includes(Buffer.from('ppt/presentation.xml')))
    assert.ok(pptx.includes(Buffer.from('ppt/slides/slide1.xml')))
    const manifest = JSON.parse(readFileSync(out.jsonPath, 'utf8'))
    assert.equal(manifest.slides.length, out.slideCount)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('双语界面渲染中英标签', () => {
  const manifest = {
    title: 'Bilingual',
    slides: [{ layout: 'cover', kicker: '开场', title: 'Bilingual', subtitle: 'Test' }],
  }
  const theme = resolveTheme('bold')
  const language = resolveLanguage('bilingual')
  const html = renderHtml(manifest, theme, language)
  assert.match(html, /主题 · Theme/)
  assert.match(html, /开场 · Opening/)
  assert.match(html, /#E63946/)
})

test('buildPptx 是纯 Buffer 且包含全部 OOXML 核心部件', () => {
  const manifest = {
    title: 'OOXML',
    slides: [{ layout: 'bullets', title: '标题', bullets: ['一', '二'] }],
  }
  const buf = buildPptx(manifest, resolveTheme('data'), resolveLanguage('zh'))
  assert.ok(Buffer.isBuffer(buf))
  for (const name of ['[Content_Types].xml', '_rels/.rels', 'ppt/presentation.xml', 'ppt/slideMasters/slideMaster1.xml', 'ppt/theme/theme1.xml']) {
    assert.ok(buf.includes(Buffer.from(name)), name + ' 缺失')
  }
  assert.ok(buf.length > 0)
})

test('sanitizeFileName 清理危险字符并去除扩展名', () => {
  assert.equal(sanitizeFileName('Q3 汇报: 终版?.pptx'), 'Q3-汇报-终版')
  assert.equal(sanitizeFileName('a/b\\c*<>|?'), 'a-b-c')
  assert.equal(sanitizeFileName('   '), 'deck')
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { deflateSync } from 'node:zlib'
import * as officeKit from '@office-kit/pptx'
import { main as cliMain } from '../skills/dsh-ppt/scripts/build-deck.mjs'
import { extractPptxSlides } from '../skills/dsh-ppt/scripts/deck-import.mjs'
import { importPptxDeck, buildDeckAsync, undoDeck, readDeckProject, renderHandoutMarkdown } from '../skills/dsh-ppt/scripts/deck-advanced.mjs'
import { promoteMarkdownSlides } from '../skills/dsh-ppt/scripts/deck-director.mjs'
import { normalizeDataModel, prepareDataSlides } from '../skills/dsh-ppt/scripts/deck-data.mjs'
import { normalizeSlides, renderHtml, resolveLanguage, resolveTheme } from '../skills/dsh-ppt/scripts/deck-core.mjs'

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0)
  }
  return (c ^ 0xffffffff) >>> 0
}
function pngChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}
function makePng10x10() {
  const w = 16, h = 16
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2
  const raw = Buffer.alloc(h * (1 + w * 3), 0x80)
  for (let y = 0; y < h; y++) raw[y * (1 + w * 3)] = 0
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}
function makeWebp16() {
  const w = 16, h = 16
  const bits = ((w - 1) & 0x3fff) | (((h - 1) & 0x3fff) << 14)
  const payload = Buffer.alloc(12)
  payload[0] = 0x2f
  payload.writeUInt32LE(bits, 1)
  const hdr = Buffer.alloc(20)
  hdr.write('RIFF', 0); hdr.writeUInt32LE(12 + payload.length, 4)
  hdr.write('WEBP', 8); hdr.write('VP8L', 12); hdr.writeUInt32LE(payload.length, 16)
  return Buffer.concat([hdr, payload])
}
const SAMPLE_WEBP_16 = makeWebp16()

async function buildRichLegacyPptx(dir) {
  const pres = await officeKit.createPresentation({ title: 'Legacy Q3 Review' })

  // Slide 1: Cover
  const s1 = officeKit.addBlankSlide(pres)
  officeKit.setSlideBackground(s1, '#FFFF00') // Ugly legacy neon yellow background!
  const k1 = officeKit.addSlideTextBox(s1, { x: 914400, y: 700000, w: 6000000, h: 400000, text: '2026 Q3 汇报' })
  officeKit.setShapeTextFormat(k1, { size: 12, color: '#FF0000' })
  const t1 = officeKit.addSlideTextBox(s1, { x: 914400, y: 1400000, w: 9000000, h: 1200000, text: '华东大区季度经营复盘报告' })
  officeKit.setShapeTextFormat(t1, { size: 36, bold: true, color: '#0000AA' })
  const sub1 = officeKit.addSlideTextBox(s1, { x: 914400, y: 2800000, w: 8000000, h: 600000, text: '战略运营部 · 2026 年 10 月' })
  officeKit.setShapeTextFormat(sub1, { size: 18, color: '#333333' })
  officeKit.setSlideNotes(s1, '开场先感谢华东团队本季度拼搏。')

  // Slide 2: Bold lead-in bullets
  const s2 = officeKit.addBlankSlide(pres)
  const t2 = officeKit.addSlideTextBox(s2, { x: 914400, y: 500000, w: 9000000, h: 800000, text: '核心指标实现全面增长' })
  officeKit.setShapeTextFormat(t2, { size: 26, bold: true })
  const b2 = officeKit.addSlideTextBox(s2, { x: 914400, y: 1500000, w: 9500000, h: 3600000, text: '' })
  officeKit.setShapeParagraphs(b2, [
    { runs: [{ text: '季度营收：', format: { bold: true } }, { text: '达到 4,200 万元，同比增长 35%' }] },
    { runs: [{ text: '客户续费率：', format: { bold: true } }, { text: '稳居 118%，头部客户零流失' }] },
    { runs: [{ text: '交付周期：', format: { bold: true } }, { text: '缩短至 5.2 天，人效提升 40%' }] },
  ])
  officeKit.setSlideNotes(s2, '强调续费率提升来自自动化部署。\n2')

  // Slide 3: Table
  const s3 = officeKit.addBlankSlide(pres)
  const t3 = officeKit.addSlideTextBox(s3, { x: 914400, y: 500000, w: 9000000, h: 800000, text: '重点城市营收表现对比' })
  officeKit.setShapeTextFormat(t3, { size: 24, bold: true })
  officeKit.addSlideTable(s3, {
    x: 914400, y: 1500000, w: 9500000, h: 2800000,
    rows: [
      ['城市', '营收（万元）', '同比增速'],
      ['上海', '1850', '+38%'],
      ['杭州', '1320', '+42%'],
      ['南京', '1030', '+24%'],
    ],
  })

  // Slide 4: Native chart + split commentary
  const s4 = officeKit.addBlankSlide(pres)
  const t4 = officeKit.addSlideTextBox(s4, { x: 914400, y: 500000, w: 9000000, h: 800000, text: 'Q1–Q4 季度订单趋势稳步攀升' })
  officeKit.setShapeTextFormat(t4, { size: 24, bold: true })
  officeKit.addSlideChart(s4, {
    x: 914400, y: 1500000, w: 5800000, h: 3800000,
    spec: {
      kind: 'column',
      title: '季度订单（万元）',
      categories: ['Q1', 'Q2', 'Q3', 'Q4'],
      series: [{ name: '订单额', values: [820, 960, 1140, 1280] }],
    },
  })
  const c4 = officeKit.addSlideTextBox(s4, { x: 7000000, y: 1700000, w: 4200000, h: 2800000, text: '' })
  officeKit.setShapeParagraphs(c4, [
    { runs: [{ text: 'Q4 创新高：', format: { bold: true } }, { text: '单季突破 1,280 万元' }] },
    { runs: [{ text: '渠道贡献：', format: { bold: true } }, { text: '伙伴生态占比升至 46%' }] },
  ])

  // Slide 5: Image right
  const s5 = officeKit.addBlankSlide(pres)
  const t5 = officeKit.addSlideTextBox(s5, { x: 914400, y: 500000, w: 9000000, h: 800000, text: '智慧园区现场部署实景' })
  officeKit.setShapeTextFormat(t5, { size: 24, bold: true })
  const txt5 = officeKit.addSlideTextBox(s5, { x: 914400, y: 1600000, w: 4600000, h: 3000000, text: '一期已覆盖 12 栋研发大楼' })
  officeKit.addSlideImage(s5, makePng10x10(), { x: 6400000, y: 1600000, w: 4500000, h: 3200000, name: 'Campus Photo' })

  // Slide 6: Multi-image gallery (PNG + WebP)
  const s6g = officeKit.addBlankSlide(pres)
  const t6g = officeKit.addSlideTextBox(s6g, { x: 914400, y: 500000, w: 9000000, h: 800000, text: '产品双端界面对比' })
  officeKit.setShapeTextFormat(t6g, { size: 24, bold: true })
  officeKit.addSlideImage(s6g, makePng10x10(), { x: 914400, y: 1600000, w: 4500000, h: 3200000, name: 'Desktop UI' })
  officeKit.addSlideImage(s6g, SAMPLE_WEBP_16, { x: 6000000, y: 1600000, w: 4500000, h: 3200000, name: 'Mobile UI' })

  // Slide 7: Closing
  const s6 = officeKit.addBlankSlide(pres)
  const t6 = officeKit.addSlideTextBox(s6, { x: 914400, y: 2000000, w: 9000000, h: 1000000, text: '谢谢聆听 · 欢迎交流' })
  officeKit.setShapeTextFormat(t6, { size: 32, bold: true })
  officeKit.addSlideTextBox(s6, { x: 914400, y: 3200000, w: 8000000, h: 600000, text: 'Q4 重点推进华东标杆客户全量上线' })

  const outPath = join(dir, 'legacy.pptx')
  writeFileSync(outPath, await officeKit.savePresentation(pres))
  return outPath
}

test('extractPptxSlides extracts bold lead-ins, tables, live charts, raster images (PNG+WebP), and cleaned speaker notes', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-extract-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const pptxPath = await buildRichLegacyPptx(dir)
  const assetOutDir = join(dir, 'assets')

  const extracted = await extractPptxSlides({ pptxPath, cwd: dir, assetOutDir })
  assert.equal(extracted.ok, true)
  assert.equal(extracted.slides.length, 7)
  assert.equal(extracted.slides[0].layout, 'cover')
  assert.equal(extracted.slides[0].kicker, '2026 Q3 汇报')
  assert.equal(extracted.slides[0].title, '华东大区季度经营复盘报告')
  assert.equal(extracted.slides[0].notes, '开场先感谢华东团队本季度拼搏。')

  // Slide 2: bold lead-ins preserved as **bold**
  assert.ok(extracted.slides[1].bullets.some(b => b.includes('**季度营收：**')), 'bold lead-in preserved')
  assert.equal(extracted.slides[1].notes, '强调续费率提升来自自动化部署。', 'trailing slide number stripped from notes')

  // Slide 3: table
  assert.equal(extracted.slides[2].layout, 'table')
  assert.deepEqual(extracted.slides[2].rows[0], ['城市', '营收（万元）', '同比增速'])
  assert.deepEqual(extracted.slides[2].rows[1], ['上海', '1850', '+38%'])

  // Slide 4: live chart-split
  assert.equal(extracted.slides[3].layout, 'chart-split')
  assert.equal(extracted.slides[3].chart.kind, 'column')
  assert.deepEqual(extracted.slides[3].chart.categories, ['Q1', 'Q2', 'Q3', 'Q4'])
  assert.deepEqual(extracted.slides[3].chart.series[0].values, [820, 960, 1140, 1280])

  // Slide 5: image-right + safe asset extraction
  assert.equal(extracted.slides[4].layout, 'image-right')
  assert.ok(extracted.slides[4].image?.src.endsWith('imported-s5-1.png'))
  assert.ok(existsSync(extracted.slides[4].image.src))

  // Slide 6: gallery with PNG + WebP
  assert.equal(extracted.slides[5].layout, 'gallery')
  assert.equal(extracted.slides[5].images.length, 2)
  assert.ok(extracted.slides[5].images[1].src.endsWith('imported-s6-2.webp'))
  assert.ok(existsSync(extracted.slides[5].images[1].src))

  // Slide 7: closing
  assert.equal(extracted.slides[6].layout, 'closing')
})

test('importPptxDeck Mode A modernizes legacy PPTX into valid dsh-ppt deck + live charts + handout', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-modeA-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const pptxPath = await buildRichLegacyPptx(dir)
  const outDir = join(dir, 'modernized')

  const res = await importPptxDeck({
    pptxPath,
    cwd: dir,
    outDir,
    theme: 'auto',
    modernize: true,
    preserveSourceTheme: false,
    handout: true,
  })

  assert.equal(res.ok, true)
  assert.equal(res.syncedProject, false)
  assert.equal(res.slideCount, 7)
  assert.ok(existsSync(res.htmlPath))
  assert.ok(existsSync(res.pptxPath))
  assert.ok(existsSync(res.jsonPath))
  assert.ok(res.handoutPath && existsSync(res.handoutPath))

  // Verify refurbished PPTX passes @office-kit/pptx validation & retains live native chart XML
  const outPres = await officeKit.loadPresentation(readFileSync(res.pptxPath))
  const errors = officeKit.validatePresentation(outPres).filter(i => i.severity === 'error')
  assert.deepEqual(errors, [])
  const parts = officeKit.listPackageParts(outPres).map(p => p.name)
  assert.ok(parts.some(n => /\/ppt\/charts\/chart\d+\.xml$/.test(n)), 'imported chart remains live native chart')

  // Verify preserveSourceTheme: true mode inherits sanitized brand without neon yellow background
  const outPreservedDir = join(dir, 'preserved')
  const preserved = await importPptxDeck({
    pptxPath,
    cwd: dir,
    outDir: outPreservedDir,
    preserveSourceTheme: true,
  })
  assert.equal(preserved.ok, true)
  const pManifest = JSON.parse(readFileSync(preserved.jsonPath, 'utf8'))
  assert.notEqual(pManifest.brand?.backgroundColor, '#FFFF00', 'toxic neon yellow canvas sanitized')
})

test('importPptxDeck Mode B syncs Office-edited PPTX back onto project with .history/ & undoDeck', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-modeB-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))

  const initial = await buildDeckAsync({
    title: '产品路线图',
    slides: [
      { layout: 'cover', title: '产品路线图', subtitle: '2026 Q4 版本规划' },
      { layout: 'bullets', title: '核心交付目标', bullets: ['**能力 A**：初版上线'], notes: '初始备注' },
      { layout: 'closing', title: '下一步计划', subtitle: '联系团队' },
    ],
    theme: 'consulting',
    outputDir: dir,
    fileName: 'project',
  })

  // Simulate user editing the exported .pptx in Office
  const pres = await officeKit.loadPresentation(readFileSync(initial.pptxPath))
  const slides = officeKit.getSlides(pres)
  officeKit.replaceTextInSlide(slides[1], '核心交付目标', 'Office 修订后的新交付目标')
  officeKit.setSlideNotes(slides[1], 'Office 中新增的演讲者备注')
  const editedPptx = join(dir, 'office-edited.pptx')
  writeFileSync(editedPptx, await officeKit.savePresentation(pres))

  const synced = await importPptxDeck({
    pptxPath: editedPptx,
    targetProjectDir: dir,
    cwd: dir,
    handout: true,
  })

  assert.equal(synced.ok, true)
  assert.equal(synced.syncedProject, true)
  assert.equal(synced.revision, 1)
  assert.equal(synced.undoAvailable, 1)
  assert.ok(existsSync(join(dir, '.history')), '.history directory created')
  assert.ok(readdirSync(join(dir, '.history')).length >= 1, '.history snapshot persisted')

  const updatedManifest = readDeckProject({ deckPath: initial.jsonPath }).manifest
  assert.equal(updatedManifest.theme, 'consulting', 'keeps existing project theme')
  assert.equal(updatedManifest.slides[1].title, 'Office 修订后的新交付目标')
  assert.equal(updatedManifest.slides[1].notes, 'Office 中新增的演讲者备注')
  assert.match(readFileSync(synced.handoutPath, 'utf8'), /Office 中新增的演讲者备注/)

  // Undo restores original slide title and notes cleanly
  const undone = await undoDeck({ deckPath: initial.jsonPath, expectedRevision: 1 })
  assert.equal(undone.revision, 2)
  const restored = readDeckProject({ deckPath: initial.jsonPath }).manifest
  assert.equal(restored.slides[1].title, '核心交付目标')
  assert.equal(restored.slides[1].notes, '初始备注')
})

test('Presenter Console & Handout: empty notes fall back to takeaway/bullets and renderHandoutMarkdown formats all blocks', () => {
  const manifest = {
    title: '全量提词与讲义测试',
    theme: 'consulting',
    language: 'zh',
    slides: [
      { layout: 'cover', title: '全量提词与讲义测试', subtitle: '执行概要' },
      {
        layout: 'kpi',
        title: '核心增长跃升',
        items: [{ tag: 'ARR', value: '1.2亿', delta: '+45%', text: '政企客户驱动' }],
        bullets: ['**关键原因**：大客续费率突破 120%'],
        takeaway: '增长已切换至复购驱动。',
      },
      {
        layout: 'callout',
        variant: 'formula',
        title: '损失函数定义',
        formula: '\\mathcal{L} = \\frac{1}{N}\\sum_{i=1}^N (y_i - \\hat{y}_i)^2',
        notes: '逐项解释平方误差正则含义。',
      },
    ],
  }
  const html = renderHtml(manifest, resolveTheme('consulting'), resolveLanguage('zh'))
  assert.match(html, /增长已切换至复购驱动/)
  assert.match(html, /BroadcastChannel/)
  assert.match(html, /dsh-laser-dot/)
  assert.match(html, /ppace/)
  assert.match(html, /pcue-badge/)

  const md = renderHandoutMarkdown(manifest, 'zh')
  assert.match(md, /预计演讲时长/)
  assert.match(md, /1\.2亿/)
  assert.match(md, /\$\$\\mathcal\{L\} =/)
  assert.match(md, /逐项解释平方误差正则含义/)
})

test('deck-director & deck-data support marimekko, sankey, swot, value-chain, and formula bindings', () => {
  const promoted = promoteMarkdownSlides([
    { layout: 'cover', title: '战略诊断' },
    { layout: 'bullets', title: '营收流向拆解（Sankey）', bullets: ['总营收 -> 毛利润: 68.5亿', '毛利润 -> 营业利润: 34.5亿'] },
    { layout: 'bullets', title: '行业竞争 SWOT 分析', bullets: ['**S 优势**：技术壁垒高', '**W 短板**：渠道下沉慢', '**O 机会**：AI 替代潮', '**T 威胁**：价格战加剧'] },
    { layout: 'bullets', title: '重点赛道 Marimekko 市场地图', bullets: ['**华东政务**：450亿', '**金融信创**：320亿', '**智能制造**：280亿'] },
    { layout: 'bullets', title: '波特价值链分析（Porter Value Chain）', bullets: ['辅助活动：技术研发', '辅助活动：人才组织', '基本活动：采购', '基本活动：制造', '基本活动：交付'] },
  ], { explicitSmartLayout: true })

  assert.equal(promoted[1].layout, 'sankey')
  assert.equal(promoted[2].layout, 'swot')
  assert.equal(promoted[3].layout, 'marimekko')
  assert.equal(promoted[4].layout, 'value-chain')

  const model = normalizeDataModel({
    sources: [{ id: 's', format: 'csv', content: 'k,v\nbase,100\n' }],
    metrics: [
      { id: 'base', label: '基数', kind: 'source', source: { sourceId: 's', cell: 'B2' }, format: { digits: 0 } },
      { id: 'rate', label: '倍数', kind: 'input', value: 2, min: 1, max: 5, step: 1, format: { digits: 0 } },
      { id: 'total', label: '总额', kind: 'formula', formula: 'base*rate', format: { digits: 0 } },
    ],
  })
  const prepared = prepareDataSlides([
    { layout: 'callout', variant: 'formula', title: '公式绑定', formula: 'y = \\frac{{{total}}}{{{base}}} + x^{{2}}' },
  ], model, normalizeSlides, 'zh')
  assert.equal(prepared[0].formula, 'y = \\frac{200}{100} + x^{{2}}')
  assert.equal(prepared[0].dataTemplate.formula, 'y = \\frac{{{total}}}{{{base}}} + x^{{2}}')
})

test('last-slide image-right, chart-split, and table preserve bold lead-in bullets instead of hijacking into subtitle', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-lastslide-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const pres = await officeKit.createPresentation({ title: 'Last Slide Body Preservation' })

  const s1 = officeKit.addBlankSlide(pres)
  officeKit.addSlideTextBox(s1, { x: 914400, y: 1200000, w: 8000000, h: 1000000, text: '封面总标题' })
  const s2 = officeKit.addBlankSlide(pres)
  officeKit.addSlideTextBox(s2, { x: 914400, y: 500000, w: 8000000, h: 700000, text: '中间页要点' })
  officeKit.addSlideTextBox(s2, { x: 914400, y: 1500000, w: 8000000, h: 2000000, text: '支撑论据' })

  // Slide 3 (last slide of 3-slide deck): image-right with 2 bold lead-in paragraphs
  const s3 = officeKit.addBlankSlide(pres)
  const t3 = officeKit.addSlideTextBox(s3, { x: 914400, y: 500000, w: 8000000, h: 700000, text: '算力底座升级成效' })
  officeKit.setShapeTextFormat(t3, { size: 24, bold: true })
  const b3 = officeKit.addSlideTextBox(s3, { x: 914400, y: 1600000, w: 5000000, h: 3000000, text: '' })
  officeKit.setShapeParagraphs(b3, [
    { runs: [{ text: '异构统一池化：', format: { bold: true } }, { text: 'GPU 利用率从 38% 提升至 79%' }] },
    { runs: [{ text: '训推潮汐混部：', format: { bold: true } }, { text: '夜间推理成本下降 46%' }] },
  ])
  officeKit.addSlideImage(s3, makePng10x10(), { x: 6400000, y: 1600000, w: 4500000, h: 3200000, name: 'Cluster' })

  const pptxPath = join(dir, 'last-img.pptx')
  writeFileSync(pptxPath, await officeKit.savePresentation(pres))

  const extracted = await extractPptxSlides({ pptxPath, cwd: dir })
  const last = extracted.slides[2]
  assert.equal(last.layout, 'image-right')
  assert.equal(last.subtitle, undefined, 'body bullets must not be hijacked into subtitle')
  assert.equal(last.bullets.length, 2)
  assert.ok(last.bullets[0].includes('**异构统一池化：**'))
  assert.ok(last.bullets[1].includes('**训推潮汐混部：**'))
})

test('kicker === title deduplication works in promoteMarkdownSlides and renderHandoutMarkdown', () => {
  const promoted = promoteMarkdownSlides([
    { layout: 'cover', title: '封面' },
    { layout: 'table', title: '四大重点战区表现', kicker: '四大重点战区表现', rows: [['区', '值'], ['华东', '100']] },
    { layout: 'bullets', title: '普通页', kicker: '要点', bullets: ['条目 A', '条目 B'] },
    { layout: 'bullets', title: '第三页', bullets: ['条目 C', '条目 D'] },
  ], { explicitSmartLayout: true })

  assert.notEqual(promoted[1].kicker, promoted[1].title, 'duplicate kicker === title replaced by chapter index')
  assert.equal(promoted[1].kicker, '01')

  const md = renderHandoutMarkdown({
    title: '去重讲义',
    slides: [
      { layout: 'table', title: '四大重点战区表现', kicker: '四大重点战区表现', rows: [['区', '值'], ['华东', '100']] },
      { layout: 'bullets', title: '增长引擎', kicker: '02 · 增长引擎', bullets: ['要点一'] },
    ],
  }, 'zh')
  assert.doesNotMatch(md, /\*\*版式\*\*: `table` · \*\*章节\*\*: 四大重点战区表现/)
  assert.match(md, /\*\*章节\*\*: 02 · 增长引擎/)
})

test('extractPptxSlides handles multi-series stacked-column charts and merged-cell tables', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-multi-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const pres = await officeKit.createPresentation({ title: 'Multi-series & Table' })

  const s1 = officeKit.addBlankSlide(pres)
  officeKit.addSlideTextBox(s1, { x: 914400, y: 400000, w: 9000000, h: 700000, text: '各产品线季度收入结构' })
  officeKit.addSlideChart(s1, {
    x: 914400, y: 1300000, w: 9200000, h: 4200000,
    spec: {
      kind: 'column',
      grouping: 'stacked',
      categories: ['Q1', 'Q2', 'Q3'],
      series: [
        { name: '订阅云', values: [120, 150, 190] },
        { name: '私有化', values: [80, 95, 110] },
      ],
    },
  })

  const s2 = officeKit.addBlankSlide(pres)
  officeKit.addSlideTextBox(s2, { x: 914400, y: 400000, w: 9000000, h: 700000, text: '区域交付明细表' })
  const tbl = officeKit.addSlideTable(s2, {
    x: 914400, y: 1400000, w: 9200000, h: 2400000,
    rows: [['大区', '一季度', '二季度'], ['华东', '400', '460'], ['华南', '310', '350']],
  })
  officeKit.mergeTableCells(tbl, { row: 1, col: 1, rowSpan: 1, colSpan: 2 })

  const pptxPath = join(dir, 'multi.pptx')
  writeFileSync(pptxPath, await officeKit.savePresentation(pres))

  const extracted = await extractPptxSlides({ pptxPath, cwd: dir })
  assert.equal(extracted.slides[0].layout, 'chart')
  assert.equal(extracted.slides[0].chart.kind, 'stacked-column')
  assert.equal(extracted.slides[0].chart.series.length, 2)
  assert.deepEqual(extracted.slides[0].chart.series[1].values, [80, 95, 110])

  assert.equal(extracted.slides[1].layout, 'table')
  assert.equal(extracted.slides[1].rows.length, 3)
  assert.equal(extracted.slides[1].rows[0].length, 3)
  assert.equal(extracted.slides[1].rows[2][2], '350')
})

test('importPptxDeck Mode B preserves dataTemplate when unchanged and invalidates when Office edits bound text', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-datamodeB-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))

  const initial = await buildDeckAsync({
    title: '数据同步校验',
    slides: [
      { layout: 'cover', title: '数据同步校验', subtitle: '基期 {{base}}' },
      { layout: 'bullets', title: '当期收入 {{base}}', bullets: ['基期 {{base}}'] },
      { layout: 'bullets', title: '成本明细 {{cost}}', bullets: ['成本 {{cost}}'] },
    ],
    dataModel: {
      sources: [{ id: 's', format: 'csv', content: 'k,v\nbase,1000\ncost,600\n' }],
      metrics: [
        { id: 'base', label: '基期', kind: 'source', source: { sourceId: 's', cell: 'B2' }, format: { digits: 0 } },
        { id: 'cost', label: '成本', kind: 'source', source: { sourceId: 's', cell: 'B3' }, format: { digits: 0 } },
      ],
    },
    outputDir: dir,
    fileName: 'project',
  })

  const pres = await officeKit.loadPresentation(readFileSync(initial.pptxPath))
  // Slide 2 (index 1) left untouched -> dataTemplate preserved; Slide 3 (index 2) edited -> unlinked cleanly
  officeKit.replaceTextInSlide(officeKit.getSlides(pres)[2], '成本明细 600', 'Office 手工覆写成本页')
  const editedPath = join(dir, 'edited-data.pptx')
  writeFileSync(editedPath, await officeKit.savePresentation(pres))

  await importPptxDeck({ pptxPath: editedPath, targetProjectDir: dir, cwd: dir, modernize: false })
  const updated = readDeckProject({ deckPath: initial.jsonPath }).manifest
  assert.equal(updated.slides[1].dataTemplate?.title, '当期收入 {{base}}', 'unchanged bound slide keeps dataTemplate')
  assert.equal(updated.slides[2].dataTemplate, undefined, 'Office-edited slide unlinks stale dataTemplate')
  assert.equal(updated.slides[2].title, 'Office 手工覆写成本页')
})

test('CLI --import-pptx --preserve-theme --no-modernize --handout and --sync-pptx --target-project work end-to-end', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-cli-p4-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))

  const pres = await officeKit.createPresentation({ title: 'Brand Legacy' })
  const s1 = officeKit.addBlankSlide(pres)
  officeKit.setSlideBackground(s1, '#0F4C81')
  officeKit.addSlideTextBox(s1, { x: 914400, y: 1200000, w: 8000000, h: 1000000, text: 'Classic Blue Cover' })
  const s2 = officeKit.addBlankSlide(pres)
  officeKit.addSlideTextBox(s2, { x: 914400, y: 600000, w: 8000000, h: 700000, text: 'Original Points' })
  officeKit.addSlideTextBox(s2, { x: 914400, y: 1600000, w: 8000000, h: 2000000, text: 'First bullet' })
  const srcPptx = join(dir, 'brand-legacy.pptx')
  writeFileSync(srcPptx, await officeKit.savePresentation(pres))

  const outDir = join(dir, 'proj')
  const logs = []
  assert.equal(await cliMain([
    '--import-pptx', srcPptx,
    '--preserve-theme',
    '--no-modernize',
    '--handout',
    '--out', outDir,
    '--file', 'project',
  ], { log: (l) => logs.push(l) }), 0)

  const imported = JSON.parse(logs.join('\n'))
  assert.equal(imported.syncedProject, false)
  assert.ok(imported.handoutPath && existsSync(imported.handoutPath))
  const m = JSON.parse(readFileSync(imported.jsonPath, 'utf8'))
  assert.equal(m.slides[1].layout, 'bullets', 'no-modernize preserves bullets layout')

  // Sync via --target-project
  const p2 = await officeKit.loadPresentation(readFileSync(imported.pptxPath))
  officeKit.replaceTextInSlide(officeKit.getSlides(p2)[1], 'Original Points', 'Synced Points')
  const edited = join(dir, 'edited-target.pptx')
  writeFileSync(edited, await officeKit.savePresentation(p2))

  const syncLogs = []
  assert.equal(await cliMain([
    '--sync-pptx', edited,
    '--target-project', outDir,
  ], { log: (l) => syncLogs.push(l) }), 0)
  const synced = JSON.parse(syncLogs.join('\n'))
  assert.equal(synced.syncedProject, true)
  assert.equal(JSON.parse(readFileSync(imported.jsonPath, 'utf8')).slides[1].title, 'Synced Points')
})

test('English handout & Presenter Console controls cover all interactive affordances', () => {
  const manifest = {
    title: 'Executive English Briefing',
    theme: 'economist-brief',
    language: 'en',
    slides: [
      { layout: 'cover', title: 'Executive English Briefing', subtitle: 'FY26 Outlook' },
      {
        layout: 'chart',
        title: 'Revenue accelerated 32% YoY',
        chart: { kind: 'column', categories: ['Q1', 'Q2'], series: [{ name: 'Revenue', values: [40, 53] }] },
        takeaway: 'Enterprise expansion drove Q2 outperformance.',
        source: 'Internal Ledger',
      },
    ],
  }
  const md = renderHandoutMarkdown(manifest, 'en')
  assert.match(md, /Executive Overview/)
  assert.match(md, /Estimated Speaking Time/)
  assert.match(md, /Chart Data \(column\)/)
  assert.match(md, /Enterprise expansion drove Q2 outperformance/)
  assert.match(md, /_Source: Internal Ledger_/)

  const html = renderHtml(manifest, resolveTheme('economist-brief'), resolveLanguage('en'))
  assert.match(html, /id="laser-btn"/)
  assert.match(html, /id="pv-black"/)
  assert.match(html, /id="pv-white"/)
  assert.match(html, /id="font-minus"/)
  assert.match(html, /id="font-plus"/)
  assert.match(html, /id="ppace"/)
  assert.match(html, /Auto cue \(no speaker notes\)/)
})

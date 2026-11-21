import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { deflateSync } from 'node:zlib'
import { unzipSync } from 'fflate'
import {
  buildDeckAsync,
  editDeck,
  remixDeck,
  checkDeck,
  absorbPptx,
  importOfficeDeck,
  extractOfficeSource,
  saveWorkspaceBrandKit,
  loadWorkspaceBrandKit,
  auditBrandCompliance,
  renderSocialCarouselHtml,
  renderSubtitlesSrt,
  renderSubtitlesVtt,
} from '../skills/dsh-ppt/scripts/deck-advanced.mjs'
import { extractPdfText } from '../skills/dsh-ppt/scripts/deck-office.mjs'
import { main as runCli } from '../skills/dsh-ppt/scripts/build-deck.mjs'
import { buildPptTools } from '../lib/tools.js'
import { resolvePptConfig } from '../lib/config.js'
import { exportRemotionBundle } from '../lib/ecosystem.js'
import { PptWorkbench } from '../lib/workbench.js'

function makeValidPng(w = 4, h = 4) {
  const crcTable = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    crcTable[n] = c >>> 0
  }
  const crc32 = (buf) => {
    let c = 0xffffffff
    for (let i = 0; i < buf.length; i += 1) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length, 0)
    const tag = Buffer.from(type, 'ascii')
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(Buffer.concat([tag, data])), 0)
    return Buffer.concat([len, tag, data, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 2 // 8-bit RGB
  const raw = Buffer.alloc((1 + w * 3) * h, 0x3b)
  for (let y = 0; y < h; y += 1) raw[y * (1 + w * 3)] = 0
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}
const TINY_PNG_BUFFER = makeValidPng(8, 8)
const TINY_PNG_BASE64 = TINY_PNG_BUFFER.toString('base64')
const TINY_PNG_DATA_URI = 'data:image/png;base64,' + TINY_PNG_BASE64

/** Build a valid minimal PDF with a FlateDecode stream containing English + UTF-16BE Chinese text. */
function makeSyntheticPdf({ title = 'Q4 Strategy Report', lines = [] }) {
  const utf16Hex = (str) => {
    let hex = 'FEFF'
    for (let i = 0; i < str.length; i += 1) {
      hex += str.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0')
    }
    return `<${hex}>`
  }
  const ops = ['BT', '/F1 14 Tf', '50 750 Td']
  for (const line of lines) {
    if (/[^\x20-\x7E]/.test(line)) {
      ops.push(`${utf16Hex(line)} Tj`)
    } else {
      const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
      ops.push(`(${escaped}) Tj`)
    }
    ops.push('0 -20 Td')
  }
  ops.push('ET')
  const compressed = deflateSync(Buffer.from(ops.join('\n'), 'latin1'))
  const header = Buffer.from('%PDF-1.4\n', 'latin1')
  const obj1 = Buffer.from('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n', 'latin1')
  const obj2 = Buffer.from('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n', 'latin1')
  const obj3 = Buffer.from('3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n', 'latin1')
  const obj4Head = Buffer.from(`4 0 obj\n<< /Length ${compressed.length} /Filter /FlateDecode >>\nstream\n`, 'latin1')
  const obj4Tail = Buffer.from('\nendstream\nendobj\n', 'latin1')
  const infoTitle = /[^\x20-\x7E]/.test(title) ? utf16Hex(title) : `(${title})`
  const obj5 = Buffer.from(`5 0 obj\n<< /Title ${infoTitle} >>\nendobj\ntrailer\n<< /Root 1 0 R /Info 5 0 R >>\n%%EOF\n`, 'latin1')
  return Buffer.concat([header, obj1, obj2, obj3, obj4Head, compressed, obj4Tail, obj5])
}

function collectWireTypeArrays(node, path = '', out = []) {
  if (!node || typeof node !== 'object') return out
  if (Array.isArray(node)) {
    node.forEach((v, i) => collectWireTypeArrays(v, `${path}[${i}]`, out))
    return out
  }
  if (Array.isArray(node.type)) out.push(`${path}.type`)
  for (const [k, v] of Object.entries(node)) {
    collectWireTypeArrays(v, path ? `${path}.${k}` : k, out)
  }
  return out
}

test('v0.34 Wave 1A: Enterprise Brand Kit Lock (.dsh-ppt/brand-kit.json), Watermark (HTML+PPTX), Mandatory Closing & SLOP-14', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-v34-brandkit-'))
  try {
    const saved = saveWorkspaceBrandKit(dir, {
      name: 'Acme Enterprise Charter',
      enforce: true,
      theme: 'consulting',
      watermark: 'CONFIDENTIAL · 内部资料',
      brand: {
        name: 'Acme Corp',
        primaryColor: '#1E3A8A',
        footer: 'Acme Strategy Office · 2026',
      },
      forbiddenTerms: ['全网第一', '绝对领先'],
      mandatoryClosing: {
        kicker: 'ACME LEGAL',
        title: '感谢审阅 · 机密材料请勿外传',
        subtitle: 'Acme Strategy Office · Internal Only',
      },
    })
    assert.equal(saved.ok, true)
    const loaded = loadWorkspaceBrandKit(dir)
    assert.equal(loaded.name, 'Acme Enterprise Charter')
    assert.equal(loaded.watermark, 'CONFIDENTIAL · 内部资料')

    const built = await buildDeckAsync({
      title: 'Q4 商业合规评审',
      slides: [
        { layout: 'cover', title: 'Q4 商业合规评审', subtitle: '品牌宪章锁测试' },
        {
          layout: 'bullets',
          title: '本季度产品份额实现全网第一突破',
          bullets: ['核心客户复购率提升至 94%', '区域覆盖拓展至 18 个核心城市'],
          takeaway: '保持合规增长并强化区域服务能力',
        },
      ],
      outputDir: dir,
      cwd: dir,
      smartLayout: false,
      autoUpgrade: false,
    })

    const manifest = JSON.parse(readFileSync(built.jsonPath, 'utf8'))
    assert.equal(manifest.brand.primaryColor, '#1E3A8A')
    assert.equal(manifest.brand.watermark, 'CONFIDENTIAL · 内部资料')
    assert.equal(manifest.brand.footer, 'Acme Strategy Office · 2026')
    assert.equal(manifest.slides.at(-1).layout, 'closing')
    assert.equal(manifest.slides.at(-1).title, '感谢审阅 · 机密材料请勿外传')

    // SLOP-14 catches forbidden-brand-term
    assert.ok(built.quality.issues.some((i) => i.code === 'forbidden-brand-term'), 'expected SLOP-14 forbidden-brand-term warning')

    // HTML renders watermark on content slide but not on cover/closing
    const html = readFileSync(built.htmlPath, 'utf8')
    assert.match(html, /class="brand-watermark"[^>]*>CONFIDENTIAL · 内部资料<\/div>/)

    // PPTX renders Brand watermark shape on content slide (slide2) and not cover (slide1)
    const pptxZip = unzipSync(new Uint8Array(readFileSync(built.pptxPath)))
    const slide1Xml = Buffer.from(pptxZip['ppt/slides/slide1.xml']).toString('utf8')
    const slide2Xml = Buffer.from(pptxZip['ppt/slides/slide2.xml']).toString('utf8')
    assert.ok(!slide1Xml.includes('Brand watermark'), 'cover should not have watermark')
    assert.ok(slide2Xml.includes('Brand watermark'), 'content slide should contain Brand watermark shape')
    assert.ok(slide2Xml.includes('CONFIDENTIAL · 内部资料'))

    // Palette drift detected by SLOP-14 after manual brand override
    const drifted = await editDeck({
      deckPath: built.jsonPath,
      brand: { primaryColor: '#DC2626' },
      cwd: dir,
    })
    assert.ok(drifted.quality.issues.some((i) => i.code === 'brand-palette-drift'), 'expected SLOP-14 brand-palette-drift warning')

    // Opt-out via useBrandKit: false
    const optOut = await buildDeckAsync({
      title: 'OptOut Deck',
      slides: [{ layout: 'cover', title: 'OptOut' }, { layout: 'bullets', title: 'Body', bullets: ['Clean line'] }],
      outputDir: dir,
      cwd: dir,
      useBrandKit: false,
      smartLayout: false,
      autoUpgrade: false,
    })
    const optManifest = JSON.parse(readFileSync(optOut.jsonPath, 'utf8'))
    assert.equal(optManifest.brand?.watermark, undefined)
    assert.equal(optManifest.slides.length, 2)

    // Absorb with saveBrandKit: true writes brand-kit.json from PPTX
    const dir2 = join(dir, 'absorb-ws')
    mkdirSync(dir2, { recursive: true })
    const abs = await absorbPptx({
      pptxPath: built.pptxPath,
      cwd: dir2,
      saveBrandKit: true,
      brandKitName: 'Absorbed Corporate Kit',
      watermark: 'INTERNAL DRAFT',
      forbiddenTerms: ['保底收益'],
    })
    assert.ok(abs.savedBrandKitPath, 'absorbPptx should save brand-kit.json')
    const absKit = loadWorkspaceBrandKit(dir2)
    assert.equal(absKit.name, 'Absorbed Corporate Kit')
    assert.equal(absKit.watermark, 'INTERNAL DRAFT')
    assert.deepEqual(absKit.forbiddenTerms, ['保底收益'])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('v0.34 Wave 1B: Zero-Dep .pdf Extractor (FlateDecode + UTF-16BE) & Multi-Source Pack Ingestion with Evidence Ledger', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-v34-pdf-pack-'))
  try {
    const packDir = join(dir, 'pack')
    const outDir = join(dir, 'out')
    mkdirSync(packDir, { recursive: true })
    mkdirSync(outDir, { recursive: true })

    // 1. Synthetic compressed PDF with bilingual / UTF-16BE CJK content
    const pdfBytes = makeSyntheticPdf({
      title: '2026 智能算力行业白皮书',
      lines: [
        '2026 智能算力行业白皮书',
        '一、市场规模与增速',
        '全球智能算力支出在 2026 年达到 1850 亿美元，同比增长 42%。',
        '头部企业私有化推理集群部署周期缩短 55%。',
        '二、核心技术演进',
        '异构算力调度与端云协同成为降本增效关键路径。',
        'FP8 量化推理在保持 99.2% 精度下降低 38% 显存占用。',
      ],
    })
    const pdfPath = join(packDir, 'whitepaper.pdf')
    writeFileSync(pdfPath, pdfBytes)

    const parsed = extractPdfText(pdfBytes)
    assert.equal(parsed.title, '2026 智能算力行业白皮书')
    assert.ok(parsed.lines.some((l) => l.includes('1850')), 'PDF FlateDecode UTF-16BE text should extract cleanly')

    // Single PDF import works end-to-end
    const singlePdf = await importOfficeDeck({ filePath: pdfPath, outputDir: outDir, cwd: dir })
    assert.equal(singlePdf.ok, true)
    assert.equal(singlePdf.officeStats.sourceFormat, 'pdf')
    assert.ok(singlePdf.slideCount >= 4)

    // 2. Multi-source pack: PDF + CSV + PNG in one folder -> 1 deck + verified evidence ledger
    writeFileSync(
      join(packDir, 'quarterly-revenue.csv'),
      'Quarter,Revenue(M),Margin(%)\nQ1,42,31\nQ2,56,34\nQ3,71,37\nQ4,92,41\n',
      'utf8',
    )
    writeFileSync(join(packDir, 'architecture-diagram.png'), Buffer.from(TINY_PNG_BASE64, 'base64'))

    const extractedPack = await extractOfficeSource({ filePath: packDir, cwd: dir })
    assert.equal(extractedPack.stats.sourceFormat, 'multi-source-pack')
    assert.equal(extractedPack.stats.fileCount, 3)
    assert.equal(extractedPack.evidence.length, 3)
    assert.ok(extractedPack.evidence.some((e) => e.source === 'whitepaper.pdf'))
    assert.ok(extractedPack.evidence.some((e) => e.source === 'quarterly-revenue.csv'))
    assert.ok(extractedPack.evidence.some((e) => e.source === 'architecture-diagram.png'))

    const builtPack = await importOfficeDeck({ filePath: packDir, outputDir: outDir, cwd: dir })
    assert.equal(builtPack.ok, true)
    assert.equal(builtPack.evidenceCount, 3)
    const packManifest = JSON.parse(readFileSync(builtPack.jsonPath, 'utf8'))
    assert.equal(packManifest.evidence.length, 3)
    assert.ok(packManifest.slides.some((s) => s.layout === 'image'), 'PNG from folder should be embedded as image slide')
    assert.ok(packManifest.slides.some((s) => s.layout === 'chart-split' || s.layout === 'chart' || s.layout === 'table'), 'CSV data should generate chart/table slide')
    assert.ok(packManifest.slides.some((s) => Array.isArray(s.evidenceIds) && s.evidenceIds.includes('E1')), 'slides should bind [E#] evidence IDs')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('v0.34 Wave 2: Multi-Audience Remix (exec-5min / board-brief / sales-pitch) & Social Carousel (4:5 / 1:1)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-v34-remix-'))
  try {
    const slides = [
      { layout: 'cover', title: '2026 年度经营复盘与增长战略', subtitle: '全量 12 页版本' },
      { layout: 'agenda', title: '汇报议程', items: [{ tag: '01', title: '经营指标' }, { tag: '02', title: '区域版图' }, { tag: '03', title: '产品架构' }] },
      {
        layout: 'kpi',
        title: '核心营收突破 1.85 亿元且留存率达 118%',
        items: [
          { tag: 'ARR', value: '1.85亿', delta: '+42%', title: '年度经常性收入', status: 'positive' },
          { tag: 'NRR', value: '118%', delta: '+6pp', title: '净金额留存率', status: 'accent' },
          { tag: 'GM', value: '72.4%', delta: '+4.1pp', title: '综合毛利率', status: 'positive' },
        ],
        takeaway: '高毛利与高续费形成复利飞轮',
      },
      {
        layout: 'chart-split',
        title: '季度营收连续四个季度加速增长',
        chart: { kind: 'column', categories: ['Q1', 'Q2', 'Q3', 'Q4'], series: [{ name: '营收(百万)', values: [32, 41, 51, 61] }] },
        bullets: ['Q4 单季营收创历史新高', '企业级大客占比提升至 64%'],
        takeaway: 'Q4 营收环比加速至 +19.6%',
      },
      {
        layout: 'map',
        variant: 'china',
        title: '华东与华南双核心区贡献 65% 新增业绩',
        items: [
          { tag: '华东', title: '华东大区', value: '¥78M', delta: '+36%', status: 'accent' },
          { tag: '华南', title: '华南大区', value: '¥44M', delta: '+31%', status: 'positive' },
        ],
      },
      {
        layout: 'isometric',
        variant: 'stack',
        title: '四层立体技术架构实现交付周期缩短 60%',
        items: [
          { tag: 'L4', title: '应用工作台', text: '多端实时预览与编辑' },
          { tag: 'L3', title: '智能编排层', text: '版式升维与门禁校验' },
          { tag: 'L2', title: '证据账本层', text: 'SLOP-13 事实溯源' },
          { tag: 'L1', title: '原生引擎层', text: 'OOXML 与 HTML 同源构建' },
        ],
      },
      {
        layout: 'comparison',
        variant: 'before-after',
        title: '智能化升级消除人工排版瓶颈',
        items: [
          { tag: '升级前', title: '手工拼装耗时 2 天', text: '格式混乱、数据易出错' },
          { tag: '升级后', title: '一键同源 5 分钟交付', text: '100% 可编辑且自动核验' },
        ],
      },
      { layout: 'section', kicker: '02', title: '组织与运营细节' },
      { layout: 'bullets', title: '渠道伙伴赋能计划细节', bullets: ['建立 12 家区域核心代理商体系', '提供标准化演示工具包与培训认证'], takeaway: '渠道贡献占比提升至 28%' },
      { layout: 'bullets', title: '客户成功团队分级响应机制', bullets: ['战略客户配备专属架构师驻场支持', '常规客户上线 7×24 智能问答助手'], takeaway: '客户满意度 NPS 达到 68' },
      { layout: 'bullets', title: '内部研发效能度量规范', bullets: ['自动化测试覆盖率保持在 95% 以上', '每周五固定举行设计走查复盘会'], takeaway: '缺陷逃逸率同比下降 48%' },
      { layout: 'closing', title: '确认 2026 Q1 优先攻坚清单', subtitle: '欢迎交流与提问' },
    ]

    const full = await buildDeckAsync({
      title: '年度复盘全量版',
      slides,
      outputDir: dir,
      cwd: dir,
      smartLayout: false,
      autoUpgrade: false,
      socialCarousel: '4:5',
      subtitles: 'srt',
    })
    assert.equal(full.slideCount, 12)
    assert.ok(full.carouselPath && readFileSync(full.carouselPath, 'utf8').includes('data-ratio="4:5"'))
    assert.ok(full.subtitlesPath && readFileSync(full.subtitlesPath, 'utf8').includes('00:00:00,000 -->'))

    // Remix to exec-5min (6 slides, original untouched, omitted points archived into notes)
    const exec5 = await remixDeck({ deckPath: full.jsonPath, preset: 'exec-5min', cwd: dir })
    assert.equal(exec5.ok, true)
    assert.equal(exec5.slideCount, 6)
    assert.notEqual(exec5.jsonPath, full.jsonPath)
    assert.equal(exec5.remixReport.originalCount, 12)
    assert.equal(exec5.remixReport.remixedCount, 6)
    assert.equal(exec5.remixReport.foldedCount, 6)
    const origCheck = JSON.parse(readFileSync(full.jsonPath, 'utf8'))
    assert.equal(origCheck.slides.length, 12, 'original deck must remain untouched')
    const execManifest = JSON.parse(readFileSync(exec5.jsonPath, 'utf8'))
    const allNotes = execManifest.slides.map((s) => s.notes || '').join('\n')
    assert.match(allNotes, /\[压缩归档 · 高管 5 分钟速览\]/, 'omitted slide takeaways must be folded into notes')
    assert.ok(allNotes.includes('渠道伙伴赋能计划细节') || allNotes.includes('内部研发效能度量规范'))

    // Remix via editDeck({ remixPreset: 'board-brief' }) -> 8 slides
    const board = await editDeck({ deckPath: full.jsonPath, remixPreset: 'board-brief', cwd: dir })
    assert.equal(board.slideCount, 8)
    assert.equal(board.remixReport.presetId, 'board-brief')

    // CLI --remix --preset sales-pitch -> 7 slides
    const logs = []
    const code = await runCli(['--remix', full.jsonPath, '--preset', 'sales-pitch'], { log: (m) => logs.push(m) })
    assert.equal(code, 0)
    const cliResult = JSON.parse(logs.join('\n'))
    assert.equal(cliResult.slideCount, 7)
    assert.equal(cliResult.remixReport.presetId, 'sales-pitch')

    // Social Carousel 1:1 rendering
    const sqHtml = renderSocialCarouselHtml(execManifest, { ratio: '1:1', lang: 'zh' })
    assert.ok(sqHtml.includes('data-ratio="1:1"'))
    assert.ok(sqHtml.includes('sc-kpi-grid'))
    assert.ok(sqHtml.includes('@media print'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('v0.34 Wave 3: HTML Live Presenter Power Pack, Subtitles (.srt/.vtt), Remotion Captions & 13-Tool Zero Wire Type Arrays', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-v34-presenter-'))
  try {
    const built = await buildDeckAsync({
      title: '演示增强套件测试',
      slides: [
        { layout: 'cover', title: '演示增强套件测试', subtitle: '现场交互功能验证' },
        {
          layout: 'kpi',
          title: '系统延迟下降 48% 且吞吐翻倍',
          items: [{ tag: 'P99', value: '18ms', delta: '-48%', title: '推理延迟', status: 'positive' }],
          evidenceIds: ['E1'],
          notes: '本页核心数据来自 2026 Q1 基准压测。系统延迟下降近一半。',
        },
        { layout: 'closing', title: '进入 Q&A 讨论环节', subtitle: '欢迎现场提问' },
      ],
      evidence: [
        { id: 'E1', claim: '2026 Q1 压测 P99 延迟由 35ms 降至 18ms', source: '工程效能基准报告', date: '2026-03', confidence: 'verified' },
      ],
      outputDir: dir,
      cwd: dir,
      smartLayout: false,
      autoUpgrade: false,
    })

    const html = readFileSync(built.htmlPath, 'utf8')
    // Live Presenter Power Pack UI & Hotkeys
    assert.ok(html.includes('id="dsh-jump-dialog"'), 'Ctrl/Cmd+K Jump Search dialog missing')
    assert.ok(html.includes('id="dsh-jump-input"'), 'Jump Search input missing')
    assert.ok(html.includes('"evidenceIndex"'), 'Evidence [E#] search index missing')
    assert.ok(html.includes('id="dsh-draw-canvas"'), 'D key live whiteboard canvas missing')
    assert.ok(html.includes('id="dsh-draw-bar"'), 'Draw toolbar missing')
    assert.ok(html.includes('id="dsh-qa-timer"'), 'T key Q&A timer pill missing')
    assert.ok(html.includes('id="dsh-autotour-btn"'), 'Auto-Tour toggle missing')
    assert.ok(html.includes('id="dsh-sub-bar"'), 'Live subtitle caption bar missing')
    assert.ok(html.includes('id="download-carousel"'), 'Offline Social Carousel download missing')
    assert.ok(html.includes('id="download-subtitles"'), 'Offline Subtitles download missing')
    assert.ok(html.includes('const escape ='), 'Local HTML escape must shadow window.escape inside initDelivery')

    // Subtitles SRT & VTT
    const manifest = JSON.parse(readFileSync(built.jsonPath, 'utf8'))
    const srt = renderSubtitlesSrt(manifest, 'zh')
    const vtt = renderSubtitlesVtt(manifest, 'zh')
    assert.match(srt, /^1\n00:00:00,000 --> 00:00:/m)
    assert.ok(srt.includes('系统延迟下降近一半'))
    assert.ok(vtt.startsWith('WEBVTT\n\n'))
    assert.match(vtt, /00:00:00\.000 --> 00:00:/)

    // Remotion bundle now emits captions.srt & captions.vtt
    const remotionRes = await exportRemotionBundle({
      deckPath: built.jsonPath,
      cwd: dir,
      engine: await import('../skills/dsh-ppt/scripts/deck-advanced.mjs'),
    })
    assert.equal(remotionRes.ok, true)
    assert.ok(remotionRes.files.some((f) => f.endsWith('captions.srt')), 'Remotion bundle should include captions.srt')
    assert.ok(remotionRes.files.some((f) => f.endsWith('captions.vtt')), 'Remotion bundle should include captions.vtt')

    // Strictly 13 tools and ZERO wire JSON Schema `type` arrays
    const tools = buildPptTools(resolvePptConfig({}))
    assert.equal(tools.length, 13, 'must remain strictly 13 registered tools')
    for (const def of tools) {
      const bad = collectWireTypeArrays(def.parameters)
      assert.deepEqual(bad, [], `tool ${def.name} has invalid wire type arrays: ${bad.join(', ')}`)
    }
    const absorbDef = tools.find((t) => t.name === 'ppt_absorb')
    const editDef = tools.find((t) => t.name === 'ppt_edit')
    const officeDef = tools.find((t) => t.name === 'ppt_from_office')
    const createDef = tools.find((t) => t.name === 'ppt_create')
    assert.equal(absorbDef.parameters.properties.saveBrandKit.type, 'boolean')
    assert.deepEqual(editDef.parameters.properties.remixPreset.enum, ['exec-5min', 'board-brief', 'sales-pitch'])
    assert.equal(officeDef.parameters.properties.filePaths.type, 'array')
    assert.equal(createDef.parameters.properties.useBrandKit.type, 'boolean')
    assert.equal(createDef.parameters.properties.brand.properties.watermark.type, 'string')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('v0.34 Wave 4: Workbench Power-User Sync (map/isometric, waves, focalPoint, imageBrief, Evidence/Diff, Remix, Carousel/Subtitles & PDF Upload)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-v34-wb-'))
  try {
    const wb = new PptWorkbench({ catalogPath: join(dir, 'projects.jsonl') })
    const built = await buildDeckAsync({
      title: '工作台同步测试',
      slides: [
        { layout: 'cover', title: '工作台同步测试', subtitle: '初稿' },
        { layout: 'image-right', title: '智能配图槽位页', imageBrief: { prompt: 'Modern cloud data center', aspect: '16:9' }, bullets: ['待上传最终实拍图'], evidenceIds: ['E1'] },
        { layout: 'bullets', title: '补充说明 1', bullets: ['细节一'] },
        { layout: 'bullets', title: '补充说明 2', bullets: ['细节二'] },
        { layout: 'bullets', title: '补充说明 3', bullets: ['细节三'] },
        { layout: 'bullets', title: '补充说明 4', bullets: ['细节四'] },
        { layout: 'bullets', title: '补充说明 5', bullets: ['细节五'] },
        { layout: 'closing', title: '谢谢', subtitle: 'Q&A' },
      ],
      evidence: [
        { id: 'E1', claim: '集群可用性达 99.99%', source: 'SLA 年度报告', date: '2026-02', confidence: 'verified' },
      ],
      outputDir: dir,
      cwd: dir,
      smartLayout: false,
      autoUpgrade: false,
    })
    await wb.remember(built, {})
    const listed = await wb.action({ operation: 'list' })
    const projectId = listed.projects[0].id

    // 1. Append map & isometric starter slides
    let opened = await wb.action({ operation: 'open', id: projectId })
    assert.equal(opened.project.evidence.length, 1)
    assert.equal(opened.project.revisionDiff, null)

    const withMap = await wb.action({ operation: 'append', id: projectId, expectedRevision: opened.project.revision, archetype: 'map' })
    assert.equal(withMap.project.slides.at(-1).layout, 'map')
    assert.equal(withMap.project.revisionDiff.added.length, 1)

    const withIso = await wb.action({ operation: 'append', id: projectId, expectedRevision: withMap.project.revision, archetype: 'isometric' })
    assert.equal(withIso.project.slides.at(-1).layout, 'isometric')

    // 2. Patch coverPattern='waves', watermark, and upload image with focalPoint='top'
    const coverId = withIso.project.slides[0].id
    const editedCover = await wb.action({
      operation: 'edit',
      id: projectId,
      expectedRevision: withIso.project.revision,
      slide: coverId,
      patch: { coverPattern: 'waves' },
      brand: { watermark: 'BOARD REVIEW' },
    })
    assert.equal(editedCover.project.slides[0].coverPattern, 'waves')
    assert.equal(editedCover.project.brand.watermark, 'BOARD REVIEW')
    assert.ok(editedCover.project.revisionDiff.modified.some((m) => m.fields.includes('coverPattern')))

    const imgSlideId = editedCover.project.slides[1].id
    const editedImg = await wb.action({
      operation: 'edit',
      id: projectId,
      expectedRevision: editedCover.project.revision,
      slide: imgSlideId,
      patch: { image: { src: TINY_PNG_DATA_URI, alt: 'Server room', fit: 'cover', focalPoint: 'top' } },
    })
    assert.equal(editedImg.project.slides[1].image.focalPoint, 'top')

    // 3. Remix inside workbench
    const remixed = await wb.action({
      operation: 'remix',
      id: projectId,
      expectedRevision: editedImg.project.revision,
      preset: 'exec-5min',
    })
    assert.equal(remixed.project.slides.length, 6)
    assert.equal(remixed.originalId, projectId)
    assert.equal(remixed.remixReport.presetId, 'exec-5min')

    // 4. Downloads: social-carousel, subtitles (srt & vtt), remotion zip with captions
    const mkGet = (qs) => new Request(`http://127.0.0.1/api/dsh-ppt/download?${qs}`, {
      method: 'GET',
      headers: { host: '127.0.0.1', 'sec-fetch-site': 'same-origin' },
    })
    const rev = editedImg.project.revision
    const carouselRes = await wb.fetchDownload(mkGet(`id=${projectId}&kind=social-carousel&ratio=1:1&revision=${rev}`))
    assert.equal(carouselRes.status, 200)
    assert.match(carouselRes.headers.get('content-type') || '', /text\/html/)
    assert.ok((await carouselRes.text()).includes('data-ratio="1:1"'))

    const srtRes = await wb.fetchDownload(mkGet(`id=${projectId}&kind=subtitles&revision=${rev}`))
    assert.equal(srtRes.status, 200)
    assert.match(await srtRes.text(), /00:00:00,000 -->/)

    const vttRes = await wb.fetchDownload(mkGet(`id=${projectId}&kind=subtitles&format=vtt&revision=${rev}`))
    assert.equal(vttRes.status, 200)
    assert.ok((await vttRes.text()).startsWith('WEBVTT'))

    const remZipRes = await wb.fetchDownload(mkGet(`id=${projectId}&kind=remotion&revision=${rev}`))
    assert.equal(remZipRes.status, 200)
    const remZip = unzipSync(new Uint8Array(await remZipRes.arrayBuffer()))
    assert.ok(remZip['captions.srt'], 'workbench remotion zip should include captions.srt')
    assert.ok(remZip['captions.vtt'], 'workbench remotion zip should include captions.vtt')

    // 5. Workbench PDF upload via import-office
    const pdfBuf = makeSyntheticPdf({
      title: 'Workbench PDF Upload',
      lines: ['Workbench PDF Upload', 'Section 1 Overview', 'Revenue grew by 35 percent in 2026.', 'Latency dropped by 40 percent.'],
    })
    const uploadedPdf = await wb.action({
      operation: 'import-office',
      fileName: 'brief.pdf',
      data: 'data:application/pdf;base64,' + pdfBuf.toString('base64'),
      lang: 'en',
    })
    assert.equal(uploadedPdf.ok, true)
    assert.equal(uploadedPdf.imported, true)
    assert.ok(uploadedPdf.project.slides.length >= 3)

    // 6. Verify built lib/client.js contains all new Wave 4 UI controls
    const clientJs = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
    for (const token of ['isometric-mesh', 'editorial-arcs', 'Layout Morph', 'ppt-evidence-drawer', 'ppt-diff-drawer', 'remixProject', 'social-carousel', 'subtitles', 'imageFocalPoint', 'brand-watermark']) {
      assert.ok(clientJs.includes(token), `lib/client.js should include ${token}`)
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

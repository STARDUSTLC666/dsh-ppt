import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { deflateSync } from 'node:zlib'
import { zipSync, strToU8 } from 'fflate'
import * as officeKit from '@office-kit/pptx'
import {
  extractOfficeSource,
  importOfficeDeck,
  editDeck,
  undoDeck,
  computePaceBudget,
  renderOnePagerHtml,
  renderHandoutMarkdown,
} from '../skills/dsh-ppt/scripts/deck-advanced.mjs'
import { promoteMarkdownSlides } from '../skills/dsh-ppt/scripts/deck-director.mjs'
import { CORE_LAYOUTS } from '../skills/dsh-ppt/scripts/deck-layouts.mjs'

function makePng10x10() {
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
    const t = Buffer.from(type, 'ascii')
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0)
    const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
    return Buffer.concat([len, t, data, crcBuf])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(10, 0); ihdr.writeUInt32BE(10, 4); ihdr[8] = 8; ihdr[9] = 2
  const raw = Buffer.alloc(10 * (1 + 30))
  for (let y = 0; y < 10; y += 1) {
    raw[y * 31] = 0
    for (let x = 0; x < 10; x += 1) {
      raw[y * 31 + 1 + x * 3] = 0
      raw[y * 31 + 1 + x * 3 + 1] = 87
      raw[y * 31 + 1 + x * 3 + 2] = 184
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function colLetter(idx) {
  let s = ''
  let n = idx + 1
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

function buildXlsxBuffer(sheets) {
  const sharedStrings = []
  const ssMap = new Map()
  const intern = (s) => {
    if (!ssMap.has(s)) {
      ssMap.set(s, sharedStrings.length)
      sharedStrings.push(s)
    }
    return ssMap.get(s)
  }
  const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const files = {
    '[Content_Types].xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
      '</Types>'
    ),
    '_rels/.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>'
    ),
    'xl/workbook.xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets>' +
      sheets.map((sh, i) => `<sheet name="${esc(sh.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
      '</sheets></workbook>'
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
      `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>` +
      `<Relationship Id="rId${sheets.length + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
      '</Relationships>'
    ),
    'xl/styles.xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="14" applyNumberFormat="1"/></cellXfs>' +
      '</styleSheet>'
    ),
  }

  sheets.forEach((sh, sIdx) => {
    const rowsXml = sh.rows.map((row, rIdx) => {
      const cellsXml = row.map((cell, cIdx) => {
        const ref = colLetter(cIdx) + (rIdx + 1)
        if (cell && typeof cell === 'object' && cell.type === 'inlineStr') {
          return `<c r="${ref}" t="inlineStr"><is><t>${esc(cell.value)}</t></is></c>`
        }
        if (cell && typeof cell === 'object' && cell.type === 'dateSerial') {
          return `<c r="${ref}" s="1"><v>${cell.value}</v></c>`
        }
        if (typeof cell === 'number') {
          return `<c r="${ref}"><v>${cell}</v></c>`
        }
        const ssIdx = intern(String(cell ?? ''))
        return `<c r="${ref}" t="s"><v>${ssIdx}</v></c>`
      }).join('')
      return `<row r="${rIdx + 1}">${cellsXml}</row>`
    }).join('')
    files[`xl/worksheets/sheet${sIdx + 1}.xml`] = strToU8(
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      `<sheetData>${rowsXml}</sheetData></worksheet>`
    )
  })

  files['xl/sharedStrings.xml'] = strToU8(
    '<?xml version="1.0" encoding="UTF-8"?>' +
    `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrings.length}" uniqueCount="${sharedStrings.length}">` +
    sharedStrings.map(s => `<si><t>${esc(s)}</t></si>`).join('') +
    '</sst>'
  )

  return Buffer.from(zipSync(files))
}

function buildDocxBuffer({ title, includeMermaid = true }) {
  const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const pngBytes = makePng10x10()
  const pStyle = (style, text) => `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr><w:r><w:t>${esc(text)}</w:t></w:r></w:p>`
  const pBoldLead = (lead, rest) => `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>${esc(lead)}</w:t></w:r><w:r><w:t>${esc(rest)}</w:t></w:r></w:p>`
  const pPlain = (text) => `<w:p><w:r><w:t>${esc(text)}</w:t></w:r></w:p>`
  const pImg = (rId) => `<w:p><w:r><w:drawing><wp:inline><a:graphic><a:graphicData><pic:pic><pic:blipFill><a:blip r:embed="${rId}"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`
  const tbl = (rows) => `<w:tbl>${rows.map(r => `<w:tr>${r.map(c => `<w:tc><w:p><w:r><w:t>${esc(c)}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`).join('')}</w:tbl>`

  const bodyParts = [
    pStyle('Title', title),
    pStyle('Subtitle', '2026 年度数字化战略与研发效能总结'),
    pPlain('一、战略目标与总体成效'),
    pBoldLead('核心结论：', '研发自动化流水线将端到端交付周期缩短 62%。'),
    pBoldLead('质量保障：', '自动化回归测试覆盖率由 58% 跃升至 94%。'),
    pPlain('（一）关键里程碑与组织协同'),
    pBoldLead('第一阶段：', '完成统一代码库与自动化构建基础设施迁移。'),
    pBoldLead('第二阶段：', '上线智能评审助手与跨部门协同看板。'),
    pBoldLead('第三阶段：', '实现全集团 12 条产线灰度与全量推广。'),
    pStyle('Heading1', '二、基准对比与架构演进'),
    tbl([
      ['评测指标', '传统流程', '新平台'],
      ['平均交付周期', '12 天', '4.5 天'],
      ['线上故障率', '3.8%', '0.9%'],
    ]),
    pStyle('Heading2', '量化收益模型与核心公式'),
    pPlain('$ROI = \\frac{SavedHours \\times Rate}{Cost}$'),
    pStyle('Heading2', '系统部署拓扑示意图'),
    pImg('rId1'),
    pPlain('图文协同展示核心集群部署形态。'),
  ]

  if (includeMermaid) {
    bodyParts.push(
      pStyle('Heading1', '三、自动化发布流水线流程图'),
      pPlain('```mermaid'),
      pPlain('flowchart LR'),
      pPlain('  A[代码提交] --> B{自动化单测}'),
      pPlain('  B -->|通过| C[灰度发布]'),
      pPlain('```'),
    )
  }

  const files = {
    '[Content_Types].xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Default Extension="png" ContentType="image/png"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '</Types>'
    ),
    '_rels/.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '</Relationships>'
    ),
    'word/_rels/document.xml.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/chart.png"/>' +
      '</Relationships>'
    ),
    'word/document.xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
      'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
      'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
      'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      `<w:body>${bodyParts.join('')}</w:body></w:document>`
    ),
    'word/media/chart.png': new Uint8Array(pngBytes),
  }
  return Buffer.from(zipSync(files))
}

test('extractOfficeSource & importOfficeDeck profile multi-sheet .xlsx into sankey, gantt, marimekko, waterfall, combo, chart-split & table', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-xlsx-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))

  const xlsxBuf = buildXlsxBuffer([
    {
      name: '营收流向',
      rows: [
        ['来源', '去向', '金额(亿)'],
        ['总营收', '毛利润', 68.5],
        ['总营收', '营业成本', 31.5],
        ['毛利润', '营业利润', 34.5],
        ['毛利润', '研发投入', 22.0],
      ],
    },
    {
      name: '项目排期',
      rows: [
        ['任务', 'Q1', 'Q2', 'Q3', 'Q4'],
        ['架构冻结', 'x', 'x', '', ''],
        ['核心开发', '', 'x', 'x', ''],
        ['全量上线', '', '', '', 'x'],
      ],
    },
    {
      name: '市场格局',
      rows: [
        ['赛道', '市场规模(亿)', '我方份额', '竞品A份额'],
        ['政企云', 450, '42%', '35%'],
        ['金融信创', 320, '38%', '40%'],
        ['智能制造', 230, '28%', '45%'],
      ],
    },
    {
      name: '利润桥接',
      rows: [
        ['阶段', '利润变动(百万)'],
        ['期初基线', 100],
        ['订阅增量', 45],
        ['算力成本', -15],
        ['期末合计', 130],
      ],
    },
    {
      name: '双轴业绩',
      rows: [
        ['季度', '营收(万元)', '净利率'],
        ['Q1', 1200, '18%'],
        ['Q2', 1650, '22%'],
        ['Q3', 2180, '26%'],
        ['Q4', 2840, '31%'],
      ],
    },
    {
      name: '区域明细',
      rows: [
        [{ type: 'inlineStr', value: '大区' }, { type: 'inlineStr', value: '销售额(万)' }, { type: 'inlineStr', value: '统计日期' }],
        ['华东大区', 890, { type: 'dateSerial', value: 46023 }],
        ['华南大区', 640, { type: 'dateSerial', value: 46054 }],
        ['华北大区', 510, { type: 'dateSerial', value: 46082 }],
      ],
    },
  ])

  const xlsxPath = join(dir, 'exec-workbook.xlsx')
  writeFileSync(xlsxPath, xlsxBuf)

  const extracted = await extractOfficeSource({ filePath: xlsxPath })
  assert.equal(extracted.ok, true)
  assert.equal(extracted.stats.sheetCount, 6)
  assert.equal(extracted.slides[0].layout, 'cover')
  assert.equal(extracted.slides[1].layout, 'kpi')
  assert.ok(extracted.slides[1].items.every(it => Boolean(it.title && it.tag)), 'KPI items include both title and tag for PPTX card headers')
  const sankeySlide = extracted.slides.find(s => s.layout === 'sankey')
  assert.ok(sankeySlide, '3-col flow sheet -> sankey')
  assert.match(sankeySlide.title, /100/, 'multi-hop Sankey sums root source flows (68.5 + 31.5 = 100) without double-counting')
  assert.ok(extracted.slides.some(s => s.layout === 'gantt'), 'Q1..Q4 schedule sheet -> gantt')
  assert.ok(extracted.slides.some(s => s.layout === 'marimekko'), 'segment size + % share -> marimekko')
  assert.ok(extracted.slides.some(s => s.layout === 'chart-split' && s.chart?.kind === 'waterfall'), 'bridge steps -> waterfall')
  assert.ok(extracted.slides.some(s => s.layout === 'chart-split' && s.chart?.kind === 'combo'), '>10x scale ratio -> combo chart-split')
  const regionChart = extracted.slides.find(s => s.layout === 'chart-split' && s.kicker === '区域明细')
  assert.ok(regionChart && regionChart.chart.highlight === 'max' && regionChart.items.length === 3)
  const regionTable = extracted.slides.find(s => s.layout === 'table' && s.kicker?.includes('区域明细'))
  assert.ok(regionTable && regionTable.rows[1][2] === '2026-01-01', 'Excel serial date decoded to ISO YYYY-MM-DD')

  const outDir = join(dir, 'deck-out')
  const built = await importOfficeDeck({
    filePath: xlsxPath,
    outputDir: outDir,
    theme: 'consulting',
    targetMinutes: 8,
  })
  assert.equal(built.ok, true)
  assert.equal(Object.keys(built.files).length, 3)
  assert.equal(readdirSync(outDir).length, 3, 'default mode writes strictly 3 files')
  assert.equal(built.paceBudget.targetMinutes, 8)
  assert.ok(existsSync(built.htmlPath) && existsSync(built.pptxPath) && existsSync(built.jsonPath))

  const pres = await officeKit.loadPresentation(readFileSync(built.pptxPath))
  const errors = officeKit.validatePresentation(pres).filter(i => i.severity === 'error')
  assert.deepEqual(errors, [], 'generated PPTX passes @office-kit/pptx validatePresentation with 0 errors')
})

test('extractOfficeSource & importOfficeDeck handle .docx Word reports (headings, bold leads, tables, images, formulas, mermaid)', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-docx-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))

  const docxBuf = buildDocxBuffer({ title: '研发效能年度白皮书', includeMermaid: true })
  const docxPath = join(dir, 'whitepaper.docx')
  writeFileSync(docxPath, docxBuf)

  const extracted = await extractOfficeSource({ filePath: docxPath })
  assert.equal(extracted.ok, true)
  assert.equal(extracted.title, '研发效能年度白皮书')
  assert.equal(extracted.stats.tableCount, 1)
  assert.equal(extracted.stats.imageCount, 1)
  assert.equal(extracted.stats.mermaidCount, 1)
  assert.ok(extracted.slides.length >= 5 && extracted.slides.length <= 20)
  assert.ok(extracted.slides.some(s => s.layout === 'table' && s.rows?.[1]?.[0] === '平均交付周期'))
  assert.ok(extracted.slides.some(s => s.layout === 'image-right' && s.image?.src?.startsWith('data:image/png;base64,')))
  assert.ok(extracted.slides.some(s => s.layout === 'callout' && s.formula?.includes('ROI')))
  assert.ok(extracted.slides.some(s => s.layout === 'mermaid' && s.mermaid?.includes('flowchart LR')))

  // Build full project via importOfficeDeck (include Mermaid when deck-layouts supports 'mermaid')
  const buildBuf = CORE_LAYOUTS.has('mermaid')
    ? docxBuf
    : buildDocxBuffer({ title: '研发效能年度白皮书', includeMermaid: false })

  const outDir = join(dir, 'docx-out')
  const built = await importOfficeDeck({
    bytes: buildBuf,
    fileName: 'whitepaper.docx',
    outputDir: outDir,
    theme: 'auto',
    onePager: true,
    handout: true,
  })
  assert.equal(built.ok, true)
  assert.ok(built.slideCount >= 5 && built.slideCount <= 20)
  assert.ok(existsSync(built.htmlPath) && existsSync(built.pptxPath) && existsSync(built.jsonPath))
  assert.ok(built.onePagerPath && existsSync(built.onePagerPath))
  assert.ok(built.handoutPath && existsSync(built.handoutPath))

  const pres = await officeKit.loadPresentation(readFileSync(built.pptxPath))
  const errors = officeKit.validatePresentation(pres).filter(i => i.severity === 'error')
  assert.deepEqual(errors, [])
})

test('importOfficeDeck supports .tsv input via buffer upload without host path', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-tsv-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))

  const tsvBytes = Buffer.from('Channel\tSpend\tConversions\nSearch\t500\t120\nSocial\t320\t88\nDirect\t180\t95\n', 'utf8')
  const built = await importOfficeDeck({
    bytes: tsvBytes,
    fileName: 'marketing.tsv',
    outputDir: dir,
    theme: 'consulting',
  })
  assert.equal(built.ok, true)
  assert.equal(built.officeStats.sourceFormat, 'tsv')
  const manifest = JSON.parse(readFileSync(built.jsonPath, 'utf8'))
  assert.ok(manifest.slides.some(s => s.layout === 'chart-split'))
  assert.ok(manifest.slides.some(s => s.layout === 'table'))
})

test('editDeck({ targetMinutes }) + undoDeck, smartLayout Mermaid promotion, and renderOnePagerHtml', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-pace-edit-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))

  const tsvBytes = Buffer.from('Month\tARR\nJan\t100\nFeb\t120\nMar\t155\nApr\t190\n', 'utf8')
  const built = await importOfficeDeck({
    bytes: tsvBytes,
    fileName: 'arr-growth.tsv',
    outputDir: dir,
    theme: 'consulting',
    targetMinutes: 5,
  })
  assert.equal(JSON.parse(readFileSync(built.jsonPath, 'utf8')).targetMinutes, 5)

  const edited = await editDeck({
    deckPath: built.jsonPath,
    expectedRevision: 0,
    targetMinutes: 12,
  })
  assert.equal(edited.changed, true)
  assert.equal(edited.paceBudget.targetMinutes, 12)
  assert.equal(JSON.parse(readFileSync(built.jsonPath, 'utf8')).targetMinutes, 12)

  const undone = await undoDeck({
    deckPath: built.jsonPath,
    expectedRevision: 1,
  })
  assert.equal(undone.paceBudget.targetMinutes, 5)
  assert.equal(JSON.parse(readFileSync(built.jsonPath, 'utf8')).targetMinutes, 5)

  // smartLayout Mermaid promotion
  const promoted = promoteMarkdownSlides([
    { layout: 'cover', title: '系统架构' },
    { layout: 'bullets', title: '请求网关流程', text: '```mermaid\nflowchart LR\nA[Client] --> B[Gateway]\n```' },
    { layout: 'bullets', title: '核心时序', bullets: ['sequenceDiagram', 'Alice->>Bob: Auth', 'Bob-->>Alice: Token'] },
  ], { explicitSmartLayout: true })
  assert.equal(promoted[1].layout, 'mermaid')
  assert.match(promoted[1].mermaid, /flowchart LR/)
  assert.equal(promoted[2].layout, 'mermaid')
  assert.match(promoted[2].mermaid, /sequenceDiagram/)

  // Handout + One-Pager sanity (including Mermaid SVG, MathML formula, .sr-only, and daylight header contrast)
  const manifest = JSON.parse(readFileSync(built.jsonPath, 'utf8'))
  const handout = renderHandoutMarkdown(manifest, 'en')
  assert.match(handout, /Target: 5 min/)
  const op = renderOnePagerHtml({
    ...manifest,
    theme: 'consulting',
    slides: [
      ...manifest.slides,
      { layout: 'mermaid', title: 'Pipeline', mermaid: 'flowchart LR\nA[Start] --> B[End]' },
      { layout: 'callout', variant: 'formula', title: 'Gain', formula: 'ROI = \\frac{Value}{Cost}' },
    ],
  }, 'zh')
  assert.match(op, /切换长图战报/)
  assert.match(op, /演讲配速预算/)
  assert.match(op, /\.sr-only\{/)
  assert.doesNotMatch(op, /--cover-bg:#FFFFFF/i, 'daylight theme One-Pager header must not render white-on-white')
  assert.match(op, /deck-mermaid-svg/, 'One-Pager renders native Mermaid SVG')
  assert.match(op, /<math\b/, 'One-Pager renders native MathML formula')
  const pace = computePaceBudget(manifest, 5)
  assert.equal(pace.targetMinutes, 5)
  assert.ok(pace.slides.every(s => s.seconds >= 15))
})

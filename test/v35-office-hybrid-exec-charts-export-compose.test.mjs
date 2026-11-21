import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { deflateRawSync, deflateSync } from 'node:zlib'
import { unzipSync } from 'fflate'
import * as officeKitPptx from '@office-kit/pptx'
import {
  CORE_LAYOUTS,
  LAYOUT_ALIASES,
  buildPptx,
  renderHtml,
  resolveTheme,
  resolveLanguage,
  normalizeSlides,
} from '../skills/dsh-ppt/scripts/deck-core.mjs'
import { LAYOUT_CSS, buildLayoutCss } from '../skills/dsh-ppt/scripts/deck-layouts.mjs'
import { MEDIA_LAYOUTS } from '../skills/dsh-ppt/scripts/deck-media.mjs'
import {
  buildDeckAsync,
  editDeck,
  undoDeck,
  checkDeck,
  previewDeckData,
  importOfficeDeck,
  extractOfficeSource,
  inspectLocalImage,
  inspectOfficePack,
  saveWorkspaceBrandKit,
  AUTHORITATIVE_DOMAINS,
  NOISE_DOMAINS,
  detectResearchDomain,
  buildAuthoritativeQueryPack,
  classifySourceAuthority,
  mergeHybridEvidence,
  buildHybridEnrichmentPlan,
  auditEvidenceAndSourcing,
  renderDeckWorkbookXlsx,
  renderDeckReportDocx,
  renderDeckMemoMarkdown,
  renderQaPrepMarkdown,
  saveSlideToBank,
  listSlideBank,
  removeBankSlide,
  mergeDecks,
  extractTranslationBundle,
  applyTranslationBundle,
  EXEC_CHART_LAYOUTS,
  computeIssueTreeModel,
  computeTreemapModel,
  computeGaugeModel,
  computePricingModel,
} from '../skills/dsh-ppt/scripts/deck-advanced.mjs'
import { buildPptTools } from '../lib/tools.js'
import { resolvePptConfig } from '../lib/config.js'
import { main as runCli } from '../skills/dsh-ppt/scripts/build-deck.mjs'
import { loadWorkspaceBrandKit } from '../skills/dsh-ppt/scripts/deck-brand-kit.mjs'

// ---------------------------------------------------------------------------
// Synthetic Binary Fixture Helpers (Zero External Dependencies)
// ---------------------------------------------------------------------------

function makeValidPng(w = 16, h = 16, rgb = [0x1e, 0x3a, 0x8a]) {
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
  ihdr[8] = 8
  ihdr[9] = 2 // 8-bit RGB
  const stride = 1 + w * 3
  const raw = Buffer.alloc(stride * h)
  for (let y = 0; y < h; y += 1) {
    const rowStart = y * stride
    raw[rowStart] = 0
    for (let x = 0; x < w; x += 1) {
      raw[rowStart + 1 + x * 3] = rgb[0]
      raw[rowStart + 2 + x * 3] = rgb[1]
      raw[rowStart + 3 + x * 3] = rgb[2]
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function makeZip(entries) {
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
  const chunks = []
  const central = []
  let offset = 0
  for (const e of entries) {
    const name = Buffer.from(e.name, 'utf8')
    const data = Buffer.isBuffer(e.data) ? e.data : Buffer.from(String(e.data), 'utf8')
    const comp = deflateRawSync(data)
    const crc = crc32(data)
    const lh = Buffer.alloc(30)
    lh.writeUInt32LE(0x04034b50, 0)
    lh.writeUInt16LE(20, 4)
    lh.writeUInt16LE(0x0800, 6)
    lh.writeUInt16LE(8, 8)
    lh.writeUInt32LE(crc, 14)
    lh.writeUInt32LE(comp.length, 18)
    lh.writeUInt32LE(data.length, 22)
    lh.writeUInt16LE(name.length, 26)
    chunks.push(lh, name, comp)

    const ch = Buffer.alloc(46)
    ch.writeUInt32LE(0x02014b50, 0)
    ch.writeUInt16LE(20, 4)
    ch.writeUInt16LE(20, 6)
    ch.writeUInt16LE(0x0800, 8)
    ch.writeUInt16LE(8, 10)
    ch.writeUInt32LE(crc, 16)
    ch.writeUInt32LE(comp.length, 20)
    ch.writeUInt32LE(data.length, 24)
    ch.writeUInt16LE(name.length, 28)
    ch.writeUInt32LE(offset, 42)
    central.push(ch, name)
    offset += 30 + name.length + comp.length
  }
  const cdSize = central.reduce((s, b) => s + b.length, 0)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(cdSize, 12)
  eocd.writeUInt32LE(offset, 16)
  return Buffer.concat([...chunks, ...central, eocd])
}

function makeSyntheticXlsx(sheets) {
  const colLetter = (i) => String.fromCharCode(65 + i)
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const sheetEntries = sheets.map((sh, sIdx) => {
    const rowXml = sh.rows.map((row, rIdx) => {
      const cells = row.map((v, cIdx) => {
        const ref = `${colLetter(cIdx)}${rIdx + 1}`
        if (typeof v === 'number' && Number.isFinite(v)) {
          return `<c r="${ref}" t="n"><v>${v}</v></c>`
        }
        return `<c r="${ref}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`
      }).join('')
      return `<row r="${rIdx + 1}">${cells}</row>`
    }).join('')
    return {
      name: `xl/worksheets/sheet${sIdx + 1}.xml`,
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowXml}</sheetData></worksheet>`,
    }
  })
  const wbSheets = sheets.map((sh, i) => `<sheet name="${esc(sh.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')
  const wbRels = sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')
  return makeZip([
    { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>' },
    { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${wbSheets}</sheets></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${wbRels}</Relationships>` },
    ...sheetEntries,
  ])
}

function makeSyntheticDocx({ title, sections }) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const p = (txt, style = '') => `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''}<w:r><w:t>${esc(txt)}</w:t></w:r></w:p>`
  const body = [
    p(title, 'Title'),
    ...sections.flatMap((sec) => [
      p(sec.heading, 'Heading1'),
      ...(sec.bullets || []).map((b) => p(b, 'ListParagraph')),
    ]),
  ].join('')
  return makeZip([
    { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>' },
    { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
    { name: 'word/document.xml', data: `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>` },
  ])
}

function makeSyntheticPdf({ title = 'Q4 Brief', lines = [] }) {
  const utf16Hex = (str) => {
    let hex = 'FEFF'
    for (let i = 0; i < str.length; i += 1) hex += str.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0')
    return `<${hex}>`
  }
  const ops = ['BT', '/F1 14 Tf', '50 750 Td']
  for (const line of lines) {
    ops.push(/[^\x20-\x7E]/.test(line) ? `${utf16Hex(line)} Tj` : `(${line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')}) Tj`)
    ops.push('0 -20 Td')
  }
  ops.push('ET')
  const compressed = deflateSync(Buffer.from(ops.join('\n'), 'latin1'))
  const infoTitle = /[^\x20-\x7E]/.test(title) ? utf16Hex(title) : `(${title})`
  return Buffer.concat([
    Buffer.from('%PDF-1.4\n', 'latin1'),
    Buffer.from('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n', 'latin1'),
    Buffer.from('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n', 'latin1'),
    Buffer.from('3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n', 'latin1'),
    Buffer.from(`4 0 obj\n<< /Length ${compressed.length} /Filter /FlateDecode >>\nstream\n`, 'latin1'),
    compressed,
    Buffer.from('\nendstream\nendobj\n', 'latin1'),
    Buffer.from(`5 0 obj\n<< /Title ${infoTitle} >>\nendobj\ntrailer\n<< /Root 1 0 R /Info 5 0 R >>\n%%EOF\n`, 'latin1'),
  ])
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

// ---------------------------------------------------------------------------
// WAVE 1A: 8-Domain Authoritative Query Pack, Source Classifier & SLOP-13 v0.35
// ---------------------------------------------------------------------------

test('v0.35 Wave 1A: 8-domain query pack (site:/filetype:pdf/-site:), classifySourceAuthority (T1/T2/T3/relay) & SLOP-13 v0.35 + BrandKit preferred/blocked', () => {
  assert.equal(Object.keys(AUTHORITATIVE_DOMAINS).length, 8)
  assert.ok(NOISE_DOMAINS.includes('baijiahao.baidu.com'))
  assert.ok(NOISE_DOMAINS.includes('zhihu.com'))

  // Domain routing across distinct verticals
  assert.equal(detectResearchDomain('2026 固态电池与储能碳中和趋势').id, 'energy-climate')
  assert.equal(detectResearchDomain('Q4 财报营收毛利与 SEC 10-K 估值分析').id, 'finance-filings')
  assert.equal(detectResearchDomain('2026 AI 大模型 Agent 算力芯片评测').id, 'ai-tech')
  assert.equal(detectResearchDomain('肿瘤新药三期临床 FDA 评审进展').id, 'medical-clinical')
  assert.equal(detectResearchDomain('算法消融实验与论文答辩基准').id, 'academic-science')
  assert.equal(detectResearchDomain('零售出海电商 GMV 与复购率分析').id, 'consumer-retail')
  assert.equal(detectResearchDomain('国家统计局十五五宏观政务规划').id, 'gov-macro')
  assert.equal(detectResearchDomain('Quarterly Leadership Offsite Summary').id, 'general-business')

  // Query pack emits site:, filetype:pdf, -site: and honors preferredSources/blockedDomains
  const pack = buildAuthoritativeQueryPack({
    topic: '2026 固态电池量产进展',
    lang: 'zh',
    preferredSources: ['catl-research.com'],
    blockedDomains: ['spam-news.example'],
  })
  assert.equal(pack.domain.id, 'energy-climate')
  assert.equal(pack.rounds.length, 3)
  assert.ok(pack.rounds[0].queries[0].includes('site:catl-research.com'))
  assert.ok(pack.rounds[0].queries[0].includes('site:iea.org'))
  assert.ok(pack.rounds[0].queries[1].includes('filetype:pdf'))
  assert.ok(pack.rounds[0].queries[1].includes('-site:spam-news.example'))
  assert.ok(pack.rounds[0].queries[1].includes('-site:baijiahao.baidu.com'))

  // classifySourceAuthority T1 / T2 / T3 / local-file / secondary-relay
  const t1 = classifySourceAuthority({ source: 'IEA Global EV Outlook 2026', url: 'https://www.iea.org/reports/ev-2026' })
  assert.equal(t1.tier, 1)
  assert.equal(t1.origin, 'web-research')
  assert.equal(t1.isSecondaryRelay, false)

  const t2 = classifySourceAuthority({ source: 'Gartner Magic Quadrant 2026', url: 'https://www.gartner.com/en/documents/123' })
  assert.equal(t2.tier, 2)
  assert.equal(t2.isSecondaryRelay, false)

  const t3 = classifySourceAuthority({ source: '某行业自媒体号', url: 'https://zhihu.com/question/999' })
  assert.equal(t3.tier, 3)
  assert.equal(t3.isSecondaryRelay, false)

  const relay = classifySourceAuthority({ source: 'IEA Global EV Outlook', url: 'https://baijiahao.baidu.com/s?id=12345' })
  assert.equal(relay.tier, 3)
  assert.equal(relay.isSecondaryRelay, true)

  const local = classifySourceAuthority({ source: 'Q4-financials.xlsx', origin: 'local-file' })
  assert.equal(local.origin, 'local-file')
  assert.equal(local.tier, 1)
  assert.equal(local.isSecondaryRelay, false)

  // BrandKit preferredSources promotes custom domain to T1; blockedDomains forces T3 + isBlockedDomain
  const pref = classifySourceAuthority(
    { source: 'Internal Research Portal', url: 'https://insights.acme-corp.example/report' },
    { preferredSources: ['acme-corp.example'], blockedDomains: ['rumor-mill.example'] },
  )
  assert.equal(pref.tier, 1)
  const blk = classifySourceAuthority(
    { source: 'SEC Filing Summary', url: 'https://rumor-mill.example/post/1' },
    { preferredSources: ['acme-corp.example'], blockedDomains: ['rumor-mill.example'] },
  )
  assert.equal(blk.tier, 3)
  assert.equal(blk.isBlockedDomain, true)

  // SLOP-13 v0.35 catches all 5 new codes cleanly
  const badManifest = {
    brandKit: {
      preferredSources: ['trusted-corp.example'],
      blockedDomains: ['banned-blog.example'],
    },
    evidence: [
      { id: 'E1', claim: '全球电动车渗透率突破 28%', source: 'IEA 2026 报告', date: '2026-02', url: 'https://baijiahao.baidu.com/s?id=999', confidence: 'verified', origin: 'web-research' },
      { id: 'E2', claim: '行业平均降本 45%', source: '某知乎答主专栏', date: '2026-01', url: 'https://zhihu.com/p/123', confidence: 'verified', origin: 'web-research' },
      { id: 'E3', claim: '2028 年规模将达 1200 亿元', source: 'McKinsey 行业展望', date: '2026-01', url: 'https://www.mckinsey.com/report', confidence: 'verified', origin: 'web-research', claimType: 'forecast' },
      { id: 'E4', claim: '云端推理吞吐提升 3.2x', source: 'NIST 官方基准', url: 'https://www.nist.gov/ai-bench', confidence: 'verified', origin: 'web-research' },
      { id: 'E5', claim: '算力均价为 120 美元/卡时', source: 'Gartner 基准报告', date: '2020', url: 'https://www.gartner.com/bench-2020', confidence: 'verified', origin: 'web-research', claimType: 'benchmark' },
      { id: 'E6', claim: '黑名单站点引用数据', source: '行业快讯', date: '2026-01', url: 'https://banned-blog.example/a', confidence: 'verified', origin: 'web-research' },
    ],
    slides: [
      { id: 's1', layout: 'cover', title: 'Audit Test' },
      { id: 's2', layout: 'kpi', title: '渗透率分析', items: [{ value: '28%', title: '渗透率' }], evidenceIds: ['E1'] },
      { id: 's3', layout: 'kpi', title: '成本分析', items: [{ value: '45%', title: '降本' }], evidenceIds: ['E2'] },
      { id: 's4', layout: 'kpi', title: '2028 年市场规模达到 1200 亿元', items: [{ value: '1200亿', title: '市场规模' }], evidenceIds: ['E3'] },
      { id: 's5', layout: 'kpi', title: '推理吞吐基准', items: [{ value: '3.2x', title: '吞吐' }], evidenceIds: ['E4'] },
      { id: 's6', layout: 'kpi', title: '算力单价对比', items: [{ value: '$120', title: '单价' }], evidenceIds: ['E5'] },
      { id: 's7', layout: 'kpi', title: '黑名单测试', items: [{ value: '99%', title: '指标' }], evidenceIds: ['E6'] },
    ],
  }
  const issues = auditEvidenceAndSourcing(badManifest)
  const codes = new Set(issues.map((i) => i.code))
  assert.ok(codes.has('secondary-relay-source'), 'must flag secondary-relay-source')
  assert.ok(codes.has('low-authority-source'), 'must flag low-authority-source')
  assert.ok(codes.has('unmarked-forecast-claim'), 'must flag unmarked-forecast-claim')
  assert.ok(codes.has('missing-external-date'), 'must flag missing-external-date')
  assert.ok(codes.has('stale-evidence-date'), 'must flag stale-evidence-date')
  assert.ok(issues.some((i) => i.slide === 7 && i.code === 'low-authority-source'), 'blocked domain must trigger low-authority-source')

  // 0 false positives on clean, properly labeled hybrid deck honoring brandKit.preferredSources
  const cleanManifest = {
    brandKit: { preferredSources: ['trusted-corp.example'] },
    evidence: [
      { id: 'E1', claim: '内部 Q4 毛利率 48.2%', source: 'Q4-Finance.xlsx', date: '2026-02', origin: 'local-file', confidence: 'verified' },
      { id: 'E2', claim: '全球新能源装机增长 34%', source: 'IEA Renewables 2026', date: '2026-01', url: 'https://www.iea.org/renewables-2026', origin: 'web-research', tier: 1, confidence: 'verified' },
      { id: 'E3', claim: '2028E 规模预计达 1200 亿元', source: 'McKinsey Outlook', date: '2026-01', url: 'https://www.mckinsey.com/outlook', origin: 'web-research', tier: 2, claimType: 'forecast', confidence: 'verified' },
      { id: 'E4', claim: '企业自研行业基准', source: 'Acme Research', date: '2026-02', url: 'https://trusted-corp.example/q1', origin: 'web-research', confidence: 'verified' },
      { id: 'E5', claim: '2019 历史基线对比', source: 'IMF World Economic Outlook', date: '2019', url: 'https://www.imf.org/weo-2019', origin: 'web-research', claimType: 'benchmark', confidence: 'verified' },
    ],
    slides: [
      { id: 'c1', layout: 'cover', title: 'Clean Hybrid Deck' },
      { id: 'c2', layout: 'kpi', title: '毛利率 48.2% 跑赢行业', items: [{ value: '48.2%', title: 'Q4 毛利率' }], evidenceIds: ['E1', 'E2', 'E4'] },
      { id: 'c3', layout: 'kpi', title: '2028E 预计市场规模达 1200 亿元', items: [{ value: '1200亿', title: '2028E 预计规模' }], evidenceIds: ['E3'] },
      { id: 'c4', layout: 'bullets', title: '2019 至今历史演变回顾', bullets: ['相较 2019 历史基线提升 2.4 倍'], evidenceIds: ['E5'] },
    ],
  }
  assert.deepEqual(auditEvidenceAndSourcing(cleanManifest), [], 'valid hybrid deck must have 0 SLOP-13 false positives')
})

// ---------------------------------------------------------------------------
// WAVE 1B: inspectOfficePack, inspectLocalImage, Mode C Hybrid Build & bindDataModel
// ---------------------------------------------------------------------------

test('v0.35 Wave 1B: inspectOfficePack (inspectOnly), inspectLocalImage, instructions/photoRoles/includeSheets/bindDataModel & Mode C hybrid evidence merge', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-v35-office-pack-'))
  try {
    const packDir = join(dir, 'materials')
    const outDir = join(dir, 'out')
    mkdirSync(packDir, { recursive: true })
    mkdirSync(outDir, { recursive: true })

    // 1. Multi-sheet Excel (.xlsx): Margin + Headcount
    const xlsxBytes = makeSyntheticXlsx([
      {
        name: '毛利变化',
        rows: [
          ['季度', '营收(百万)', '毛利率(%)'],
          ['Q1', 120, '42.5%'],
          ['Q2', 148, '45.1%'],
          ['Q3', 176, '47.8%'],
          ['Q4', 215, '51.2%'],
        ],
      },
      {
        name: '人力明细',
        rows: [
          ['部门', '人数'],
          ['研发', 180],
          ['交付', 95],
          ['市场', 60],
        ],
      },
    ])
    writeFileSync(join(packDir, 'q4-finance.xlsx'), xlsxBytes)

    // 2. Word report (.docx)
    const docxBytes = makeSyntheticDocx({
      title: '2026 Q4 经营复盘与 AI 产品升级报告',
      sections: [
        { heading: '一、核心业务增长动能', bullets: ['企业级订阅续约率 NRR 提升至 124%', 'AI 自动化模块贡献 38% 新增毛利'] },
        { heading: '二、交付效率与组织升级', bullets: ['标准化实施周期从 6 周缩短至 12 天', '标杆大客户覆盖华东与华南核心制造集群'] },
      ],
    })
    writeFileSync(join(packDir, 'q4-review.docx'), docxBytes)

    // 3. PDF whitepaper (.pdf)
    const pdfBytes = makeSyntheticPdf({
      title: 'AI 算力能效内部测试简报',
      lines: [
        'AI 算力能效内部测试简报',
        '一、推理降本验证',
        'FP8 量化集群单位推理成本下降 41%，P99 时延稳定在 38ms。',
      ],
    })
    writeFileSync(join(packDir, 'infra-bench.pdf'), pdfBytes)

    // 4. Local photos: landscape hero, portrait team/mobile, browser UI
    const heroPng = makeValidPng(1600, 900, [0x0f, 0x4c, 0x81])
    const portraitPng = makeValidPng(720, 1280, [0x10, 0xb9, 0x81])
    const uiPng = makeValidPng(1440, 900, [0x63, 0x66, 0xf1])
    writeFileSync(join(packDir, 'product-hero.png'), heroPng)
    writeFileSync(join(packDir, 'team-portrait.png'), portraitPng)
    writeFileSync(join(packDir, 'ui-dashboard.png'), uiPng)

    // Verify inspectLocalImage dimensions, orientation & focalPoint rules
    const heroMeta = inspectLocalImage(join(packDir, 'product-hero.png'), dir)
    assert.equal(heroMeta.width, 1600)
    assert.equal(heroMeta.height, 900)
    assert.equal(heroMeta.orientation, 'landscape')
    assert.equal(heroMeta.recommendedRole, 'cover')
    assert.equal(heroMeta.recommendedFocalPoint, 'center')

    const portMeta = inspectLocalImage(join(packDir, 'team-portrait.png'), dir)
    assert.equal(portMeta.width, 720)
    assert.equal(portMeta.height, 1280)
    assert.equal(portMeta.orientation, 'portrait')
    assert.equal(portMeta.recommendedFocalPoint, 'top', 'portrait/team photo MUST recommend focalPoint: top')

    const uiMeta = inspectLocalImage(join(packDir, 'ui-dashboard.png'), dir)
    assert.equal(uiMeta.recommendedRole, 'mockup-browser')
    assert.equal(uiMeta.recommendedLayout, 'mockup[browser]')

    // Step 1: inspectOfficePack (inspectOnly: true) writes 0 files and returns compact dossier + enrichmentPlan
    const dossier = await importOfficeDeck({
      filePath: packDir,
      inspectOnly: true,
      outputDir: outDir,
      cwd: dir,
    })
    assert.equal(dossier.ok, true)
    assert.equal(dossier.inspectOnly, true)
    assert.equal(readdirSync(outDir).length, 0, 'inspectOnly must NOT write any files to outputDir')
    assert.equal(dossier.sources.length, 6)
    assert.equal(dossier.excelSheets.length, 2)
    assert.ok(dossier.docSections.length >= 2)
    assert.equal(dossier.photos.length, 3)
    assert.equal(dossier.localEvidence.length, 6)
    assert.ok(dossier.localEvidence.every((e) => e.origin === 'local-file'))
    assert.equal(dossier.enrichmentPlan.nextEvidenceId, 'E7')
    assert.ok(dossier.enrichmentPlan.recommendedQueries[0].queries[0].includes('site:'))
    assert.ok(dossier.dossierMarkdown.includes('E7'))

    // Verify mergeHybridEvidence collision-free remapping directly
    const mergedEv = mergeHybridEvidence(dossier.localEvidence, [
      { id: 'E1', claim: '2026 全球企业 AI 支出同比增 44%', source: 'Gartner 2026 Forecast', date: '2026-01', url: 'https://www.gartner.com/ai-2026', origin: 'web-research', tier: 2 },
    ])
    assert.equal(mergedEv.localCount, 6)
    assert.equal(mergedEv.externalCount, 1)
    assert.equal(mergedEv.remappedIds.E1, 'E7')
    assert.equal(mergedEv.nextEvidenceId, 'E8')

    // Step 2: Requirement-driven direct build with instructions, includeSheets, photoRoles, bindDataModel & hybrid evidence
    const built = await importOfficeDeck({
      filePath: packDir,
      instructions: '控制 9 页，跳过目录，product-hero.png 放封面，重点讲毛利变化',
      includeSheets: ['毛利变化'],
      photoRoles: {
        'ui-dashboard.png': 'mockup-browser',
        'team-portrait.png': 'gallery',
      },
      bindDataModel: true,
      evidence: [
        { id: 'E1', claim: '2026 全球企业级 AI 支出增长 44%', source: 'Gartner Enterprise AI Report', date: '2026-01', url: 'https://www.gartner.com/ai-spend-2026', origin: 'web-research', tier: 2, confidence: 'verified' },
        { id: 'E2', claim: '国家统计局显示高技术制造业投资增 12.8%', source: '国家统计局公报', date: '2026-02', url: 'https://www.stats.gov.cn/2026-q1', origin: 'web-research', tier: 1, confidence: 'verified' },
      ],
      outputDir: outDir,
      fileName: 'hybrid-q4',
      cwd: dir,
    })

    assert.equal(built.ok, true)
    assert.equal(built.dataModelBound, true)
    assert.ok(built.boundMetricCount >= 4)
    assert.equal(built.hybridEvidence.localCount, 6)
    assert.equal(built.hybridEvidence.externalCount, 2)
    assert.equal(built.hybridEvidence.remappedIds.E1, 'E7')
    assert.equal(built.hybridEvidence.remappedIds.E2, 'E8')

    const manifest = JSON.parse(readFileSync(built.jsonPath, 'utf8'))
    assert.ok(manifest.slides[0].layout === 'cover' && Boolean(manifest.slides[0].image?.assetId), 'cover must embed product-hero.png')
    assert.ok(!manifest.slides.some((s) => s.layout === 'agenda'), 'instructions "跳过目录" must omit agenda slide')
    assert.ok(manifest.dataModel && manifest.dataModel.metrics.length >= 4, 'manifest must persist live dataModel')
    assert.ok(manifest.evidence.some((e) => e.origin === 'local-file') && manifest.evidence.some((e) => e.origin === 'web-research'), 'manifest must hold both local and external evidence')
    assert.ok(manifest.slides.some((s) => s.kicker && /附录 · 事实溯源|APPENDIX · SOURCES/i.test(s.kicker)), 'hybrid build should include evidence appendix')
    const appendixSlide = manifest.slides.find((s) => s.kicker && /附录 · 事实溯源|APPENDIX · SOURCES/i.test(s.kicker))
    assert.ok(appendixSlide.rows.some((r) => String(r[2]).includes('q4-finance.xlsx')), 'appendix source cell must preserve full filename without premature .x… chop')
    assert.ok(!built.quality.issues.some((i) => i.code === 'table-density' && i.slide === manifest.slides.indexOf(appendixSlide) + 1), 'appendix booktabs slide must have 0 table-density warnings')

    // Verify default 3-file invariant (no extra exports requested)
    const filesInOut = readdirSync(outDir).sort()
    assert.deepEqual(filesInOut, ['hybrid-q4.html', 'hybrid-q4.json', 'hybrid-q4.pptx'])

    // Verify live dataModel preview works on the auto-bound deck
    const preview = previewDeckData({ deckPath: built.jsonPath, cwd: dir })
    assert.equal(preview.ok, true)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------------------
// WAVE 2A: Reverse Exports (.xlsx / .docx / .memo.md / .qa-prep.md / .i18n.json) & Round-Trip
// ---------------------------------------------------------------------------

test('v0.35 Wave 2A: Reverse Office exports (.xlsx numeric <c t="n"> + round-trip, .docx + round-trip, .memo.md, .qa-prep.md) & 3-file default invariant', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-v35-exports-'))
  try {
    const outDefault = join(dir, 'default-only')
    const outAll = join(dir, 'with-exports')
    mkdirSync(outDefault, { recursive: true })
    mkdirSync(outAll, { recursive: true })

    const slides = [
      { layout: 'cover', title: '2026 企业级 AI 商业化复盘', subtitle: '营收增速与毛利跃升验证商业闭环' },
      {
        layout: 'kpi',
        title: '核心经营指标全面超预期 [E1]',
        items: [
          { tag: 'ARR', title: '年度经常性收入', value: '4.8', unit: '亿元', delta: '+46%' },
          { tag: 'GM', title: '毛利率', value: '74.2', unit: '%', delta: '+6.4pp' },
        ],
        takeaway: '订阅制高毛利占比突破七成。',
        evidenceIds: ['E1'],
      },
      {
        layout: 'chart-split',
        title: '季度营收连续四个季度加速 [E1]',
        chart: {
          kind: 'column',
          categories: ['Q1', 'Q2', 'Q3', 'Q4'],
          series: [{ name: '营收(百万元)', values: [95, 118, 134, 158] }],
          unit: '百万元',
        },
        items: [{ tag: '峰值', title: 'Q4', text: '单季创下 158 百万元新高' }],
        takeaway: 'Q4 环比增长 17.9%。',
        evidenceIds: ['E1'],
      },
      {
        layout: 'gauge',
        title: '2026E 年度 OKR 预计达成跟踪 [E2]',
        items: [
          { title: '营收达标率', value: 88, target: 85, max: 100, unit: '%' },
          { title: '大客户续约率', value: 94, target: 90, max: 100, unit: '%' },
        ],
        takeaway: '预计全年关键目标全面达成。',
        evidenceIds: ['E2'],
      },
      { layout: 'closing', title: '锁定 Q1 重点大客户扩容计划' },
    ]

    const evidence = [
      { id: 'E1', origin: 'local-file', claim: '全年 ARR 4.8 亿元，Q4 单季 158 百万元', source: '财务审计快报.xlsx', date: '2026-02', confidence: 'verified' },
      { id: 'E2', origin: 'web-research', tier: 2, claimType: 'forecast', claim: '2026E 行业平均订阅增速预计 35%–42%', source: 'Gartner SaaS Benchmark', date: '2026-01', url: 'https://www.gartner.com/saas-2026', confidence: 'estimated' },
    ]

    // 1. Default build writes strictly 3 sibling files
    const defBuilt = await buildDeckAsync({
      title: 'Default Trio Check',
      slides,
      evidence,
      outputDir: outDefault,
      fileName: 'trio',
      autoUpgrade: false,
      smartLayout: false,
      cwd: dir,
    })
    assert.deepEqual(readdirSync(outDefault).sort(), ['trio.html', 'trio.json', 'trio.pptx'])
    assert.equal(defBuilt.xlsxPath, undefined)
    assert.equal(defBuilt.docxPath, undefined)

    // 2. Explicit exports[] writes xlsx, docx, memo, qa-prep, i18n alongside core trio
    const expBuilt = await buildDeckAsync({
      title: '2026 企业级 AI 商业化复盘',
      slides,
      evidence,
      exports: ['xlsx', 'docx', 'memo', 'qa-prep', 'i18n'],
      outputDir: outAll,
      fileName: 'full-pack',
      autoUpgrade: false,
      smartLayout: false,
      cwd: dir,
    })
    assert.ok(existsSync(expBuilt.xlsxPath))
    assert.ok(existsSync(expBuilt.docxPath))
    assert.ok(existsSync(expBuilt.memoPath))
    assert.ok(existsSync(expBuilt.qaPrepPath))
    assert.ok(existsSync(expBuilt.i18nPath))

    // Verify .xlsx internal XML + true numeric <c t="n"> + round-trip via extractOfficeSource
    const xlsxBuf = readFileSync(expBuilt.xlsxPath)
    const xlsxZip = unzipSync(new Uint8Array(xlsxBuf))
    assert.ok(xlsxZip['xl/workbook.xml'], 'xlsx must contain xl/workbook.xml')
    assert.ok(xlsxZip['xl/worksheets/sheet1.xml'], 'xlsx must contain sheet1.xml')
    const allSheetXml = Object.entries(xlsxZip)
      .filter(([k]) => k.startsWith('xl/worksheets/sheet'))
      .map(([, v]) => Buffer.from(v).toString('utf8'))
      .join('\n')
    assert.match(allSheetXml, /<c r="[A-Z]+\d+" t="n"><v>158<\/v><\/c>/, 'chart values must be exported as true numeric cells <c t="n">')
    assert.match(allSheetXml, /<c r="[A-Z]+\d+" t="n"><v>88<\/v><\/c>/, 'gauge actuals must be exported as true numeric cells <c t="n">')

    const rtXlsx = await extractOfficeSource({ filePath: expBuilt.xlsxPath, cwd: dir })
    assert.equal(rtXlsx.ok, true)
    assert.ok(rtXlsx.stats.sheetCount >= 4, 'round-trip extractOfficeSource must parse all exported sheets')

    // Verify .docx internal XML + <w:tbl> + round-trip via extractOfficeSource
    const docxBuf = readFileSync(expBuilt.docxPath)
    const docxZip = unzipSync(new Uint8Array(docxBuf))
    const docXml = Buffer.from(docxZip['word/document.xml']).toString('utf8')
    assert.ok(docXml.includes('<w:tbl>'), 'docx must contain native Word tables')
    assert.ok(docXml.includes('Gartner SaaS Benchmark'), 'docx must preserve evidence ledger')

    const rtDocx = await extractOfficeSource({ filePath: expBuilt.docxPath, cwd: dir })
    assert.equal(rtDocx.ok, true)
    assert.ok(rtDocx.slides.length >= 4, 'round-trip extractOfficeSource must parse exported .docx into slides')

    // Verify .memo.md and .qa-prep.md content
    const memoMd = readFileSync(expBuilt.memoPath, 'utf8')
    assert.ok(memoMd.includes('高管会前阅读备忘录'))
    assert.ok(memoMd.includes('订阅制高毛利占比突破七成'))
    assert.ok(memoMd.includes('E1'))

    const qaMd = readFileSync(expBuilt.qaPrepPath, 'utf8')
    assert.ok(qaMd.includes('Q&A Prep'))
    assert.ok(qaMd.includes('[E2]'), 'qa-prep must automatically surface estimated/forecast evidence E2 for defense')
    assert.ok(qaMd.includes('4.8亿元'), 'qa-prep must surface headline KPI values for ROI interrogation')

    // Direct function smoke checks (EN mode)
    const manifest = JSON.parse(readFileSync(expBuilt.jsonPath, 'utf8'))
    assert.ok(renderDeckWorkbookXlsx(manifest).subarray(0, 2).toString('ascii') === 'PK')
    assert.ok(renderDeckReportDocx(manifest, 'en').subarray(0, 2).toString('ascii') === 'PK')
    assert.ok(renderDeckMemoMarkdown(manifest, 'en').includes('Executive Narrative Memo'))
    assert.ok(renderQaPrepMarkdown(manifest, 'en').includes('Tough-Question Prep Sheet'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------------------
// WAVE 2B: Slide Bank, Multi-Deck Composer (SHA-256 Dedup + [E#] Remap) & Lossless i18n
// ---------------------------------------------------------------------------

test('v0.35 Wave 2B: Slide Bank CRUD, mergeDecks (SHA-256 asset dedup + collision-free [E#] remap) & deck-i18n replace/bilingual round-trip', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-v35-compose-i18n-'))
  try {
    const sharedPngPath = join(dir, 'shared-arch.png')
    writeFileSync(sharedPngPath, makeValidPng(640, 360, [0x0d, 0x94, 0x88]))

    const deckA = await buildDeckAsync({
      title: 'Deck Alpha',
      slides: [
        { layout: 'cover', title: 'Deck Alpha' },
        {
          layout: 'image-right',
          title: '架构底座实测 [E1]',
          bullets: ['端到端时延 38ms [E1]', '零信任沙箱隔离'],
          image: { src: sharedPngPath, alt: 'Shared Architecture' },
          evidenceIds: ['E1'],
        },
        {
          layout: 'kpi',
          title: '财务增速亮眼 [E1]',
          items: [{ value: '+42%', title: '季度营收增速' }],
          evidenceIds: ['E1'],
        },
        { layout: 'closing', title: 'Alpha End' },
      ],
      evidence: [
        { id: 'E1', origin: 'local-file', claim: 'Alpha 集群时延 38ms 且营收增 42%', source: 'Alpha-Q4.xlsx', date: '2026-02', confidence: 'verified' },
      ],
      outputDir: dir,
      fileName: 'deck-a',
      autoUpgrade: false,
      smartLayout: false,
      cwd: dir,
    })

    const deckB = await buildDeckAsync({
      title: 'Deck Beta',
      slides: [
        { layout: 'cover', title: 'Deck Beta' },
        {
          layout: 'image-left',
          title: '海外区域部署复用同一架构 [E1]',
          bullets: ['亚太节点可用性 99.98% [E1]', '欧洲合规区已上线'],
          image: { src: sharedPngPath, alt: 'Shared Architecture Reuse' },
          evidenceIds: ['E1'],
        },
        { layout: 'closing', title: 'Beta End' },
      ],
      evidence: [
        { id: 'E1', origin: 'web-research', tier: 1, claim: 'Beta 亚太节点 SLA 达 99.98%', source: 'ISO 27001 Audit Report', date: '2026-01', url: 'https://www.iso.org/standard/27001', confidence: 'verified' },
      ],
      outputDir: dir,
      fileName: 'deck-b',
      autoUpgrade: false,
      smartLayout: false,
      cwd: dir,
    })

    // 1. Slide Bank: save via editDeck({ saveToBank }), list with filter, save direct, remove
    const editedBank = await editDeck({
      deckPath: deckA.jsonPath,
      saveToBank: { slide: 3, bankId: 'golden-kpi', name: 'Q4 营收增速金页', tags: ['finance', 'kpi'] },
      cwd: dir,
    })
    assert.equal(editedBank.savedBankEntry.bankId, 'golden-kpi')
    const listedAll = listSlideBank(dir)
    assert.equal(listedAll.count, 1)
    assert.equal(listSlideBank(dir, 'finance').count, 1)
    assert.equal(listSlideBank(dir, 'nonexistent').count, 0)

    const manifestA = JSON.parse(readFileSync(deckA.jsonPath, 'utf8'))
    saveSlideToBank(dir, manifestA, 2, { bankId: 'temp-arch', tags: ['temp'] })
    assert.equal(listSlideBank(dir).count, 2)
    const removed = removeBankSlide(dir, 'temp-arch')
    assert.equal(removed.removed, 'temp-arch')
    assert.equal(listSlideBank(dir).count, 1)

    // 2. Multi-Deck Composer (via buildDeckAsync mergeSources): combines Deck A + Deck B + Slide Bank
    const merged = await buildDeckAsync({
      title: '高管联合汇报汇编',
      mergeSources: [
        { deckPath: deckA.jsonPath, slides: [2] },
        { deckPath: deckB.jsonPath, slides: [2] },
        { bankIds: ['golden-kpi'] },
      ],
      outputDir: dir,
      fileName: 'composed-deck',
      cwd: dir,
    })
    assert.equal(merged.ok, true)
    assert.equal(merged.dedupedAssetCount, 1, 'identical PNG across Deck A and Deck B must SHA-256 dedup to 1 asset')
    assert.equal(merged.remappedEvidenceCount, 2, 'distinct E1 entries from Deck A and Deck B must remap to E1 and E2')

    const mergedManifest = JSON.parse(readFileSync(merged.jsonPath, 'utf8'))
    assert.equal(Object.keys(mergedManifest.assets).length, 1, 'merged manifest.assets must hold strictly 1 SHA-256 deduped entry')
    assert.deepEqual(mergedManifest.evidence.map((e) => e.id), ['E1', 'E2'])
    const betaSlide = mergedManifest.slides.find((s) => s.title.includes('海外区域部署'))
    assert.ok(betaSlide, 'composed deck must include picked Beta slide')
    assert.ok(betaSlide.title.includes('[E2]') && betaSlide.evidenceIds.includes('E2'), 'Beta slide inline [E1] and evidenceIds must remap collision-free to E2')
    assert.deepEqual(auditEvidenceAndSourcing(mergedManifest), [], 'composed deck must have 0 dangling/SLOP-13 issues')

    // Verify direct mergeDecks helper works too
    const mergedDirect = await mergeDecks({
      title: 'Direct Merge Check',
      sources: [{ bankIds: ['golden-kpi'] }],
      outputDir: dir,
      fileName: 'direct-merge',
      cwd: dir,
    })
    assert.equal(mergedDirect.ok, true)

    // 3. Lossless i18n: extractTranslationBundle + replace mode + bilingual mode via editDeck
    const bundle = extractTranslationBundle(mergedManifest)
    assert.equal(bundle.schemaVersion, 1)
    assert.equal(bundle.slides.length, mergedManifest.slides.length)
    assert.ok(!JSON.stringify(bundle).includes('data:image/png'), 'i18n bundle must never bloat with base64 image payloads')

    const enTranslations = {
      deckTitle: 'Unified Executive Briefing',
      slides: bundle.slides.map((sl) => ({
        id: sl.id,
        fields: {
          title: `EN: ${sl.fields.title || 'Slide'}`,
          ...(sl.fields.takeaway ? { takeaway: 'EN takeaway summary.' } : {}),
          ...(sl.fields.bullets ? { bullets: sl.fields.bullets.map((_, i) => `English bullet ${i + 1}`) } : {}),
          ...(sl.fields.rows ? { rows: sl.fields.rows.map((r, ri) => r.map((c, ci) => (ri === 0 ? `Col ${ci + 1}` : c))) } : {}),
        },
      })),
    }

    // Replace mode (lossless structure/assets/evidence)
    const replaced = applyTranslationBundle(mergedManifest, enTranslations, { mode: 'replace', targetLang: 'en' })
    assert.equal(replaced.language, 'en')
    assert.equal(replaced.title, 'Unified Executive Briefing')
    assert.equal(replaced.slides.length, mergedManifest.slides.length)
    assert.deepEqual(Object.keys(replaced.assets), Object.keys(mergedManifest.assets))
    assert.deepEqual(replaced.evidence, mergedManifest.evidence)
    assert.equal(replaced.slides[1].image.assetId, mergedManifest.slides[1].image.assetId)

    // Bilingual mode via editDeck (undoable + preserves layouts & images)
    const biResult = await editDeck({
      deckPath: merged.jsonPath,
      translations: enTranslations,
      bilingualMode: true,
      cwd: dir,
    })
    assert.equal(biResult.ok, true)
    assert.equal(biResult.language, 'bilingual')
    const biManifest = JSON.parse(readFileSync(biResult.jsonPath, 'utf8'))
    assert.ok(biManifest.title.includes('高管联合汇报汇编') && biManifest.title.includes('Unified Executive Briefing'))
    assert.equal(biManifest.slides[1].layout, mergedManifest.slides[1].layout)
    assert.equal(biManifest.slides[1].image.assetId, mergedManifest.slides[1].image.assetId)
    assert.equal(biManifest.evidence.length, mergedManifest.evidence.length)

    // Undo restores original Chinese deck cleanly
    const undone = await undoDeck({ deckPath: biResult.jsonPath, expectedRevision: biResult.revision, cwd: dir })
    assert.equal(undone.language, 'zh')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------------------
// WAVE 3: Core Hardening (theme1.xml, reveal:'step', motionProfile, CSS Tree-Shaking, R-key Feedback)
// ---------------------------------------------------------------------------

test('v0.35 Wave 3: PPTX theme1.xml (pure & office-kit), reveal:"step" (<p:timing> + data-reveal-step), motionProfile, CSS tree-shaking & R-key review feedback loop', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-v35-core-hardening-'))
  try {
    const theme = resolveTheme('bcg-emerald')
    const lang = resolveLanguage('zh')

    const coreSlides = [
      { layout: 'cover', title: '内核硬化验证' },
      {
        layout: 'kpi',
        reveal: 'step',
        title: '核心指标逐步显现',
        items: [
          { value: '¥4.8亿', title: '年度 ARR' },
          { value: '124%', title: '净留存 NRR' },
          { value: '74%', title: '毛利率' },
        ],
      },
      {
        layout: 'pricing',
        reveal: 'step',
        title: '商业报价分步呈现',
        items: [
          { tag: '标准版', title: 'Standard', value: '¥9,800', bullets: ['✓ 10 席位'] },
          { tag: '推荐主推', title: 'Pro', value: '¥29,800', status: 'accent', bullets: ['✓ 无限席位'] },
          { tag: '旗舰版', title: 'Enterprise', value: '定制', bullets: ['✓ 私有化'] },
        ],
      },
      { layout: 'closing', title: '结束页' },
    ]

    // 1. Pure buildPptx: theme1.xml palette/fonts + reveal:'step' <p:timing> + motionProfile:'keynote'
    const purePptx = buildPptx({ title: '内核硬化验证', motion: true, motionProfile: 'keynote', slides: coreSlides }, theme, lang)
    const pureZip = unzipSync(new Uint8Array(purePptx))
    const pureThemeXml = Buffer.from(pureZip['ppt/theme/theme1.xml']).toString('utf8')
    assert.ok(pureThemeXml.includes(theme.palette.accent.slice(1).toUpperCase()), 'pure buildPptx theme1.xml must carry active accent1')
    assert.ok(pureThemeXml.includes(theme.palette.fg.slice(1).toUpperCase()), 'pure buildPptx theme1.xml must carry active dk1')
    assert.ok(pureThemeXml.includes('<a:majorFont>') && pureThemeXml.includes('<a:minorFont>'), 'theme1.xml must carry majorFont/minorFont')

    const slide2Xml = Buffer.from(pureZip['ppt/slides/slide2.xml']).toString('utf8')
    assert.ok(slide2Xml.includes('<p:transition spd="med"><p:push dir="l"/></p:transition>'), 'motionProfile keynote must emit push transition')
    assert.ok(slide2Xml.includes('<p:timing>') && slide2Xml.includes('<p:bldP '), 'reveal:step slide must emit native <p:timing> + <p:bldP>')
    assert.equal((slide2Xml.match(/nodeType="clickEffect"/g) || []).length, 3, '3-item KPI step reveal must have strictly 3 clickEffect nodes')

    const slide3Xml = Buffer.from(pureZip['ppt/slides/slide3.xml']).toString('utf8')
    assert.equal((slide3Xml.match(/nodeType="clickEffect"/g) || []).length, 3, '3-tier pricing step reveal must have strictly 3 clickEffect nodes')

    // Subtle motionProfile check
    const subtlePptx = buildPptx({ title: 'Subtle', motion: true, motionProfile: 'subtle', slides: coreSlides.slice(0, 2) }, theme, lang)
    const subtleZip = unzipSync(new Uint8Array(subtlePptx))
    assert.ok(Buffer.from(subtleZip['ppt/slides/slide2.xml']).toString('utf8').includes('<p:transition spd="fast"><p:fade/></p:transition>'))

    // 2. @office-kit/pptx deck (triggered by chart + brand footer): theme1.xml STILL preserved + 0 validation errors
    const kitBuilt = await buildDeckAsync({
      title: 'OfficeKit Theme Sync',
      theme: 'bcg-emerald',
      motionProfile: 'executive',
      brand: { footer: 'BCG Emerald Brand Footer' },
      slides: [
        ...coreSlides.slice(0, 2),
        {
          layout: 'chart',
          title: '营收走势',
          chart: { kind: 'column', categories: ['Q1', 'Q2', 'Q3'], series: [{ name: '营收', values: [100, 140, 190] }] },
        },
        coreSlides[3],
      ],
      outputDir: dir,
      fileName: 'kit-theme-check',
      autoUpgrade: false,
      smartLayout: false,
      cwd: dir,
    })
    const kitBytes = readFileSync(kitBuilt.pptxPath)
    const kitZip = unzipSync(new Uint8Array(kitBytes))
    const kitThemeXml = Buffer.from(kitZip['ppt/theme/theme1.xml']).toString('utf8')
    assert.ok(kitThemeXml.includes(theme.palette.accent.slice(1).toUpperCase()), '@office-kit/pptx exportPptx must preserve active theme1.xml accent1')
    assert.ok(kitThemeXml.includes('<a:majorFont>') && kitThemeXml.includes('<a:minorFont>'))
    const loadedKitPres = await officeKitPptx.loadPresentation(kitBytes)
    assert.deepEqual(officeKitPptx.validatePresentation(loadedKitPres).filter((i) => i.severity === 'error'), [])

    // 3. HTML: data-reveal="step" + data-reveal-step + offline R-key drawer (#dsh-review-comments)
    const html = readFileSync(kitBuilt.htmlPath, 'utf8')
    assert.ok(html.includes('data-reveal="step"'), 'HTML slide must carry data-reveal="step"')
    assert.ok(html.includes('data-reveal-step="1"') && html.includes('data-reveal-step="3"'), 'HTML items must carry sequential data-reveal-step')
    assert.ok(html.includes('id="dsh-review-comments"'), 'HTML must embed offline R-key stakeholder review comments drawer')

    // 4. HTML CSS tree-shaking measurably shrinks CSS on standard decks vs full LAYOUT_CSS
    const standardSlides = normalizeSlides([
      { layout: 'cover', title: 'Simple Deck' },
      { layout: 'kpi', title: 'KPI', items: [{ value: '99%', title: 'SLA' }] },
      { layout: 'bullets', title: 'Points', bullets: ['One', 'Two'] },
      { layout: 'closing', title: 'End' },
    ])
    const shakenCss = buildLayoutCss(standardSlides)
    assert.ok(shakenCss.length < LAYOUT_CSS.length * 0.75, `tree-shaken CSS (${shakenCss.length}B) must be measurably smaller than full LAYOUT_CSS (${LAYOUT_CSS.length}B)`)
    assert.ok(!shakenCss.includes('.treemap-svg') && !shakenCss.includes('.mermaid-svg'), 'unused module CSS must be omitted on standard deck')
    const execSlides = normalizeSlides([{ layout: 'treemap', title: 'Budget', items: [{ title: 'R&D', value: 60 }, { title: 'Sales', value: 40 }] }])
    assert.ok(buildLayoutCss(execSlides).includes('.treemap-svg'), 'buildLayoutCss must include EXEC_CHARTS_CSS when exec chart layout is used')

    const plainHtml = renderHtml({ title: 'No Media', slides: standardSlides }, theme, lang)
    assert.ok(!plainHtml.includes('.media-insight-card'), 'standard deck without media/charts must tree-shake MEDIA_CSS')

    // 5. checkDeck({ feedbackPath }) surfaces stakeholder comments as slide-level warnings
    const fbPath = join(dir, 'review-feedback.json')
    writeFileSync(fbPath, JSON.stringify({
      schemaVersion: 1,
      deckTitle: 'OfficeKit Theme Sync',
      comments: [
        { id: 'c-1', slide: 2, author: 'CFO', text: '请补充毛利率同比拆分基数', createdAt: '2026-03-01T10:00:00Z' },
        { id: 'c-2', slide: 3, author: 'VP Sales', text: '把 Q3 目标虚线标出来', createdAt: '2026-03-01T10:05:00Z' },
      ],
    }, null, 2))
    const checked = checkDeck({ deckPath: kitBuilt.jsonPath, feedbackPath: fbPath, cwd: dir })
    assert.equal(checked.stakeholderFeedback.length, 2)
    const fbIssues = checked.issues.filter((i) => i.code === 'stakeholder-feedback')
    assert.equal(fbIssues.length, 2)
    assert.equal(fbIssues[0].slide, 2)
    assert.ok(fbIssues[0].message.includes('CFO'))
    assert.equal(fbIssues[1].slide, 3)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------------------
// WAVE 4: 4 Executive Native Layouts + 8 Aliases + 13-Tool Wire Schema & Size Invariants
// ---------------------------------------------------------------------------

test('v0.35 Wave 4: All 4 new executive layouts (issue-tree, treemap, gauge, pricing) + 8 aliases HTML/OOXML validation & 13-tool invariants', async () => {
  // 1. Canonical layout & alias counts
  assert.equal(CORE_LAYOUTS.size, 36, 'CORE_LAYOUTS must be 36')
  assert.equal(MEDIA_LAYOUTS.size, 5, 'MEDIA_LAYOUTS must be 5 (total 41 canonical)')
  assert.deepEqual([...EXEC_CHART_LAYOUTS].sort(), ['gauge', 'issue-tree', 'pricing', 'treemap'])

  const aliasChecks = [
    ['mece', 'issue-tree'],
    ['logic-tree', 'issue-tree'],
    ['rect-map', 'treemap'],
    ['budget-map', 'treemap'],
    ['bullet-chart', 'gauge'],
    ['okr-gauge', 'gauge'],
    ['tiers', 'pricing'],
    ['packages', 'pricing'],
  ]
  for (const [alias, canonical] of aliasChecks) {
    assert.equal(LAYOUT_ALIASES[alias]?.layout, canonical, `alias ${alias} must map to ${canonical}`)
    const [norm] = normalizeSlides([{ layout: alias, title: `Alias ${alias}` }])
    assert.equal(norm.layout, canonical)
  }

  // 2. Geometry model assertions
  const itModel = computeIssueTreeModel({
    title: '如何实现年度净利润翻倍',
    items: [
      { tag: '01', title: '扩大高毛利订阅收入', value: '+45%', bullets: ['聚焦 TOP 200 制造大客户', '推出企业级品牌宪章增值包'] },
      { tag: '02', title: '压缩推理算力与交付成本', value: '-32%', bullets: ['FP8 量化集群降低单位算力开销', '自动化部署工具替代人工驻场'] },
      { tag: '03', title: '升级渠道与生态杠杆', value: '3x', bullets: ['建立 12 家头部 ISV 联合方案', '标准认证体系加速伙伴交付'] },
    ],
  })
  assert.equal(itModel.branches.length, 3)
  assert.equal(itModel.branches[0].leaves.length, 2)

  const tmModel = computeTreemapModel({
    title: '2026 研发预算分配',
    items: [
      { tag: 'CORE', title: '大模型基座与算力', value: 48, unit: '百万' },
      { tag: 'APP', title: '企业级应用平台', value: 27, unit: '百万' },
      { tag: 'SEC', title: '安全合规与私有化', value: 15, unit: '百万' },
      { tag: 'ECO', title: '开发者生态插件', value: 10, unit: '百万' },
    ],
  })
  assert.equal(tmModel.rects.length, 4)
  const shareSum = tmModel.rects.reduce((s, r) => s + r.sharePct, 0)
  assert.ok(Math.abs(shareSum - 100) < 0.5, 'treemap shares must sum to ~100%')

  const gModel = computeGaugeModel({
    title: 'Q4 OKR 达标仪表盘',
    items: [
      { title: '年度 ARR 营收', value: 92, target: 85, max: 100, unit: '%' },
      { title: '综合毛利率', value: 74, target: 75, max: 100, unit: '%' },
      { title: '新客交付达标率', value: 64, target: 90, max: 100, unit: '%' },
    ],
  })
  assert.equal(gModel[0].status, 'positive')
  assert.equal(gModel[2].status, 'warning')

  const pModel = computePricingModel({
    title: '企业版订阅报价方案',
    items: [
      { tag: '标准版', title: 'Standard', value: '¥9,800', unit: '/年', bullets: ['✓ 10 席位', '✗ 私有化部署'] },
      { tag: '推荐主推', title: 'Enterprise Pro', value: '¥29,800', unit: '/年', status: 'accent', bullets: ['✓ 无限席位', '✓ 品牌宪章锁'] },
      { tag: '旗舰定制', title: 'Private Cloud', value: '定制报价', bullets: ['✓ 全内网隔离', '✓ 7×24 SLA'] },
    ],
  })
  assert.equal(pModel[1].recommended, true)
  assert.equal(pModel[0].features[1].included, false)

  // 3. Full HTML + OOXML build & @office-kit/pptx structural validation across all 4 layouts
  const dir = mkdtempSync(join(tmpdir(), 'dsh-v35-exec-layouts-'))
  try {
    const built = await buildDeckAsync({
      title: 'v0.35 咨询图谱全集',
      theme: 'consulting',
      slides: [
        { layout: 'cover', title: 'v0.35 咨询图谱全集', subtitle: '4 套原生高管图谱 OOXML + HTML 验证' },
        {
          layout: 'mece',
          title: '盈利翻倍 MECE 逻辑议题树',
          text: '年度净利润翻倍路径',
          items: [
            { tag: '01', title: '高毛利订阅扩容', value: '+45%', bullets: ['大客户增购 NRR 达 124%', '标准化增值模块定价提升'] },
            { tag: '02', title: '算力与交付降本', value: '-32%', bullets: ['混合精度推理降本 40%', '自动化流水线缩短交付周期'] },
          ],
          takeaway: '收入结构优化与算力降本双轮驱动盈利跃升。',
        },
        {
          layout: 'budget-map',
          title: '2026 年度研发预算占比矩形树图',
          items: [
            { tag: 'INFRA', title: '算力与基座研发', value: 48, unit: '百万' },
            { tag: 'PRODUCT', title: '行业应用与工作台', value: 28, unit: '百万' },
            { tag: 'SECURITY', title: '合规与零信任沙箱', value: 14, unit: '百万' },
            { tag: 'ECOSYSTEM', title: '开放插件与生态', value: 10, unit: '百万' },
          ],
          takeaway: '核心底座与行业应用合计占总研发投入的 76%。',
        },
        {
          layout: 'okr-gauge',
          title: 'Q4 关键 OKR 目标达成子弹图',
          items: [
            { title: '年度 ARR 达成', value: 92, target: 85, max: 100, unit: '%', text: '华东大客户超额签约' },
            { title: '综合毛利率', value: 74, target: 75, max: 100, unit: '%', text: '距目标仅差 1pp' },
            { title: '自动化交付率', value: 88, target: 80, max: 100, unit: '%', text: '远超 80% 基准线' },
          ],
          takeaway: '三项核心 OKR 中两项超额完成，毛利率逼近目标。',
        },
        {
          layout: 'tiers',
          title: '商业化三档版本选型矩阵',
          items: [
            { tag: '团队启动', title: 'Team Standard', value: '¥9,800', unit: '/年', text: '适合 10 人内快速启用', bullets: ['✓ 10 席位协作', '✓ 24 套大师主题', '✗ 品牌宪章锁'] },
            { tag: '推荐主推', title: 'Enterprise Pro', value: '¥29,800', unit: '/年', status: 'accent', text: '中大型企业规模化标配', bullets: ['✓ 无限席位与品牌宪章锁', '✓ Office 双向引擎与溯源', '✓ 专属成功顾问'] },
            { tag: '政企专享', title: 'Private Cloud', value: '定制报价', text: '全隔离内网与合规审计', bullets: ['✓ 100% 离线私有化部署', '✓ SSO + 审计日志', '✓ 7×24 SLA 保障'] },
          ],
          takeaway: 'Enterprise Pro 版本以最优性价比承接 80% 中大型企业需求。',
        },
        { layout: 'closing', title: '进入规模化推广阶段' },
      ],
      outputDir: dir,
      fileName: 'exec-charts',
      autoUpgrade: false,
      smartLayout: false,
      cwd: dir,
    })

    const html = readFileSync(built.htmlPath, 'utf8')
    assert.ok(html.includes('itree-board'), 'HTML must render issue-tree')
    assert.ok(html.includes('treemap-svg'), 'HTML must render treemap')
    assert.ok(html.includes('gauge-board'), 'HTML must render gauge')
    assert.ok(html.includes('pricing-grid'), 'HTML must render pricing')

    const pptxBytes = readFileSync(built.pptxPath)
    const pres = await officeKitPptx.loadPresentation(pptxBytes)
    const ooxmlErrors = officeKitPptx.validatePresentation(pres).filter((i) => i.severity === 'error')
    assert.deepEqual(ooxmlErrors, [], 'all 4 exec chart layouts must pass @office-kit/pptx OOXML validation with 0 errors')

    const zip = unzipSync(new Uint8Array(pptxBytes))
    const slide4Xml = Buffer.from(zip['ppt/slides/slide4.xml']).toString('utf8')
    const slide5Xml = Buffer.from(zip['ppt/slides/slide5.xml']).toString('utf8')
    assert.ok(Buffer.from(zip['ppt/slides/slide2.xml']).toString('utf8').includes('IssueTree Root'))
    assert.ok(Buffer.from(zip['ppt/slides/slide3.xml']).toString('utf8').includes('Treemap Tile 1'))
    assert.ok(slide4Xml.includes('Gauge Actual 1') && slide4Xml.includes('Gauge Track Frame 1'), 'gauge must render unified border overlay frame over seamless bands')
    assert.ok(slide5Xml.includes('Pricing Card 1'))
    assert.ok(slide5Xml.includes('sz="1350" b="0"') && slide5Xml.includes('<a:t>/年</a:t>'), 'pricing unit must render as smaller non-bold muted secondary run')
    assert.ok(slide5Xml.includes('buChar char="✓"') && slide5Xml.includes('buChar char="×"'), 'pricing features must use OOXML hanging bullets with emerald ✓ and upright ×')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }

  // 4. Sacred Invariants: strictly 13 tools, 0 wire type arrays, ppt_from_office.required === ['filePath'], deck-layouts.mjs < 122880 bytes
  const tools = buildPptTools(resolvePptConfig({}))
  assert.equal(tools.length, 13, 'must remain strictly 13 registered tools')
  for (const tool of tools) {
    assert.deepEqual(collectWireTypeArrays(tool.parameters), [], `tool ${tool.name} must have 0 wire JSON Schema type arrays`)
  }
  const fromOffice = tools.find((t) => t.name === 'ppt_from_office')
  assert.deepEqual(fromOffice.parameters.required, ['filePath'])

  const editTool = tools.find((t) => t.name === 'ppt_edit')
  assert.ok(!editTool.parameters.required.includes('saveToBank'), 'saveToBank must NOT be top-level required on ppt_edit')
  assert.deepEqual(editTool.parameters.properties.saveToBank.required, ['slide'], 'saveToBank nested required must preserve ["slide"]')

  const layoutsSize = statSync(new URL('../skills/dsh-ppt/scripts/deck-layouts.mjs', import.meta.url)).size
  assert.ok(layoutsSize < 122880, `deck-layouts.mjs (${layoutsSize} bytes) must remain strictly < 122,880 bytes`)
})

test('v0.35 End-to-End Tool & CLI Wiring: ppt_from_office(inspectOnly), ppt_absorb(preferredSources/blockedDomains), ppt_edit(saveToBank), ppt_create(mergeSources/exports), ppt_check(feedbackPath) & CLI', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-v35-tools-cli-'))
  try {
    const packDir = join(dir, 'pack')
    mkdirSync(packDir, { recursive: true })
    writeFileSync(join(packDir, 'sales.xlsx'), makeSyntheticXlsx([
      { name: 'Sales', rows: [['Region', 'Revenue'], ['North', 120], ['South', 165]] },
    ]))
    writeFileSync(join(packDir, 'hero.png'), makeValidPng(1280, 720, [0x1d, 0x4e, 0xd8]))

    const tools = buildPptTools(resolvePptConfig({}))
    const execCtx = { agent: { session: { header: { cwd: dir } } } }
    const byName = (name) => tools.find((t) => t.name === name)

    // 1. ppt_from_office inspectOnly tool path + output.render()
    const fromOffice = byName('ppt_from_office')
    const inspectRes = await fromOffice.execute({ filePath: packDir, inspectOnly: true }, execCtx)
    assert.equal(inspectRes.ok, true)
    assert.equal(inspectRes.inspectOnly, true)
    const renderedInspect = fromOffice.output.render({}, inspectRes)
    assert.ok(renderedInspect[0].text.includes('Material Pack Dossier') || renderedInspect[0].text.includes('本地素材包精炼档案'))

    // 2. ppt_create -> ppt_absorb(preferredSources/blockedDomains) -> ppt_edit(saveToBank) -> ppt_create(mergeSources + exports) -> ppt_check(feedbackPath)
    const createTool = byName('ppt_create')
    const baseDeck = await createTool.execute({
      title: 'Base Tool Deck',
      slides: [
        { layout: 'cover', title: 'Base Tool Deck' },
        { layout: 'pricing', title: 'Tier Pricing', items: [{ title: 'Basic', value: '$99', bullets: ['✓ Core'] }, { title: 'Pro', value: '$299', status: 'accent', bullets: ['✓ All'] }] },
        { layout: 'closing', title: 'Done' },
      ],
      outputDir: dir,
      fileName: 'base-tool',
      autoUpgrade: false,
      smartLayout: false,
    }, execCtx)
    assert.equal(baseDeck.ok, true)

    const absorbTool = byName('ppt_absorb')
    const absRes = await absorbTool.execute({
      pptxPath: baseDeck.pptxPath,
      saveBrandKit: true,
      brandKitName: 'Tool Brand Kit',
      preferredSources: ['corp-intel.example'],
      blockedDomains: ['gossip.example'],
    }, execCtx)
    assert.ok(absRes.savedBrandKitPath)
    const kit = loadWorkspaceBrandKit(dir)
    assert.deepEqual(kit.preferredSources, ['corp-intel.example'])
    assert.deepEqual(kit.blockedDomains, ['gossip.example'])

    const editTool = byName('ppt_edit')
    const editRes = await editTool.execute({
      deckPath: baseDeck.jsonPath,
      saveToBank: { slide: 2, bankId: 'pricing-gold', name: 'Pricing Tier Gold', tags: ['sales'] },
    }, execCtx)
    assert.equal(editRes.savedBankEntry.bankId, 'pricing-gold')

    const composedRes = await createTool.execute({
      title: 'Composed Tool Deck',
      mergeSources: [{ bankIds: ['pricing-gold'] }],
      exports: ['memo', 'qa-prep'],
      outputDir: dir,
      fileName: 'composed-tool',
    }, execCtx)
    assert.equal(composedRes.ok, true)
    assert.ok(existsSync(composedRes.memoPath))
    assert.ok(existsSync(composedRes.qaPrepPath))
    const renderedCreate = createTool.output.render({}, composedRes)
    assert.ok(renderedCreate[0].text.includes('高管阅读备忘录') && renderedCreate[0].text.includes('会前高管质询预案'))

    const fbPath = join(dir, 'fb.json')
    writeFileSync(fbPath, JSON.stringify({ comments: [{ slide: 2, author: 'CEO', text: 'Sharpen pricing CTA' }] }))
    const checkTool = byName('ppt_check')
    const checkRes = await checkTool.execute({ deckPath: composedRes.jsonPath, feedbackPath: fbPath }, execCtx)
    assert.ok(checkRes.issues.some((i) => i.code === 'stakeholder-feedback' && i.message.includes('CEO')))

    // 3. CLI --from-office --inspect-only
    const logs = []
    const code = await runCli(['--from-office', packDir, '--inspect-only'], { log: (m) => logs.push(m) })
    assert.equal(code, 0)
    const cliDossier = JSON.parse(logs.join('\n'))
    assert.equal(cliDossier.ok, true)
    assert.equal(cliDossier.inspectOnly, true)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

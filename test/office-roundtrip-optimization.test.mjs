import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { deflateSync } from 'node:zlib'
import { spawnSync } from 'node:child_process'
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate'
import * as officeKit from '@office-kit/pptx'
import { absorbPptx } from '../skills/dsh-ppt/scripts/deck-absorb.mjs'
import { extractPptxSlides, sanitizeImportedTable } from '../skills/dsh-ppt/scripts/deck-import.mjs'
import { extractOfficeSource, extractPdfText, importOfficeDeck } from '../skills/dsh-ppt/scripts/deck-office.mjs'
import { buildDeckAsync, editDeck, importPptxDeck, readDeckProject } from '../skills/dsh-ppt/scripts/deck-advanced.mjs'
import { renderDeckReportDocx } from '../skills/dsh-ppt/scripts/deck-export.mjs'
import { renderDelivery, renderHandoutMarkdown, renderOnePagerHtml } from '../skills/dsh-ppt/scripts/deck-delivery.mjs'
import { buildRemotionBundleFiles } from '../lib/ecosystem.js'

function inTmp(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-opt-office-'))
  return Promise.resolve()
    .then(() => fn(dir))
    .finally(() => rmSync(dir, { recursive: true, force: true }))
}

function makeValidPng(w = 8, h = 8) {
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
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length, 0)
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
    return Buffer.concat([len, t, data, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const raw = Buffer.alloc(h * (1 + w * 4))
  for (let y = 0; y < h; y += 1) {
    raw[y * (1 + w * 4)] = 0
    for (let x = 0; x < w; x += 1) {
      const o = y * (1 + w * 4) + 1 + x * 4
      raw[o] = 30; raw[o + 1] = 58; raw[o + 2] = 138; raw[o + 3] = 255
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function makeTinyWebp() {
  return Buffer.from('UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=', 'base64')
}

function addText(slide, text, x, y, w, h, size = 20, bold = false) {
  const sh = officeKit.addSlideTextBox(slide, { text, x, y, w, h })
  officeKit.setShapeTextFormat(sh, { size, bold })
  return sh
}

test('P0-1: PPTX, CSV, and DOCX tables with >60-char cells and >8 cols sanitize cleanly instead of crashing', () => inTmp(async (dir) => {
  const longText = 'This real-world enterprise table cell description easily exceeds sixty characters in length and contains critical milestone context.'
  const pres = officeKit.createPresentation()
  const s1 = officeKit.addBlankSlide(pres)
  addText(s1, 'Wide & Long Cell Table', 500000, 300000, 8000000, 600000, 28, true)
  officeKit.addSlideTable(s1, {
    x: 300000, y: 1200000, w: 8500000, h: 2500000,
    rows: [
      Array.from({ length: 10 }, (_, i) => `Col${i + 1}`),
      [longText, ...Array.from({ length: 9 }, (_, i) => `V${i + 2}`)],
    ],
  })
  const pptxPath = join(dir, 'wide-long.pptx')
  writeFileSync(pptxPath, await officeKit.savePresentation(pres))

  const imported = await importPptxDeck({ pptxPath, outDir: join(dir, 'out-pptx'), overwrite: true })
  assert.equal(imported.ok, true)
  const manifest = readDeckProject({ deckPath: imported.jsonPath }).manifest
  assert.equal(manifest.slides[0].layout, 'table')
  assert.equal(manifest.slides[0].rows[0].length, 8)
  assert.ok([...manifest.slides[0].rows[1][0]].length <= 60)
  assert.ok(manifest.slides[0].notes.includes(longText), 'full truncated cell preserved in notes')
  assert.ok(manifest.slides[0].notes.includes('Col9'), 'dropped wide columns preserved in notes')

  // CSV with >60-char cell
  const csvPath = join(dir, 'long.csv')
  writeFileSync(csvPath, `Initiative,Description\nAlpha,"${longText}"\nBeta,"Short"\n`)
  const impCsv = await importOfficeDeck({ filePath: csvPath, outputDir: join(dir, 'out-csv'), overwrite: true })
  assert.equal(impCsv.ok, true)
  const csvManifest = readDeckProject({ deckPath: impCsv.jsonPath }).manifest
  const csvTbl = csvManifest.slides.find((s) => s.layout === 'table')
  assert.ok(csvTbl && [...csvTbl.rows[1][1]].length <= 60)
  assert.ok(csvTbl.notes.includes(longText))

  // Direct unit check on sanitizeImportedTable
  const san = sanitizeImportedTable([['A', 'B', 'C'], [longText, 'ok', 'x']], { maxCols: 2, maxCellChars: 30 })
  assert.equal(san.rows[0].length, 2)
  assert.equal(san.droppedCols, 1)
  assert.equal(san.truncatedCells, 1)
  assert.ok([...san.rows[1][0]].length <= 30)
}))

test('P0-3: nested <p:grpSp> grouped shapes do not duplicate text on PPTX import', () => inTmp(async (dir) => {
  const pres = officeKit.createPresentation()
  const cover = officeKit.addBlankSlide(pres)
  addText(cover, 'Cover Slide', 500000, 1500000, 8000000, 800000, 36, true)
  const s = officeKit.addBlankSlide(pres)
  addText(s, 'Grouped Architecture Slide', 500000, 300000, 8000000, 600000, 28, true)
  const b1 = addText(s, 'Unique Item Alpha', 500000, 1400000, 3000000, 800000, 18)
  const b2 = addText(s, 'Unique Item Beta', 4000000, 1400000, 3000000, 800000, 18)
  const b3 = addText(s, 'Unique Item Gamma', 500000, 2600000, 3000000, 800000, 18)
  const gInner = officeKit.groupShapes([b1, b2])
  officeKit.groupShapes([gInner, b3])
  const grpPath = join(dir, 'nested-groups.pptx')
  writeFileSync(grpPath, await officeKit.savePresentation(pres))

  const ext = await extractPptxSlides({ pptxPath: grpPath })
  const bodySlide = ext.slides[1]
  assert.equal(bodySlide.bullets.length, 3, `expected 3 deduplicated bullets, got ${JSON.stringify(bodySlide.bullets)}`)
  assert.equal(bodySlide.bullets.filter((b) => b.includes('Unique Item Alpha')).length, 1, 'Alpha extracted once')
  assert.equal(bodySlide.bullets.filter((b) => b.includes('Unique Item Beta')).length, 1, 'Beta extracted once')
  assert.equal(bodySlide.bullets.filter((b) => b.includes('Unique Item Gamma')).length, 1, 'Gamma extracted once')
  if (Array.isArray(bodySlide.items)) {
    assert.equal(bodySlide.items.length, 3, 'structured cards items also have zero duplicates')
  }
}))

test('P1-2: PPTX combo charts, 3D charts, hMerge="1" XML tables, bullet levels, and hidden slides extract accurately', () => inTmp(async (dir) => {
  // 1) Self-round-trip combo chart built by dsh-ppt
  const built = await buildDeckAsync({
    title: 'Combo Round-Trip',
    theme: 'consulting',
    outputDir: dir,
    fileName: 'combo-src',
    overwrite: true,
    smartLayout: false,
    autoUpgrade: false,
    slides: [
      { layout: 'cover', title: 'Combo Source', subtitle: 'Sub' },
      {
        layout: 'chart',
        title: 'Revenue vs Margin',
        chart: {
          kind: 'combo',
          categories: ['Q1', 'Q2', 'Q3', 'Q4'],
          series: [
            { name: 'Revenue', values: [100, 130, 160, 195], chartKind: 'column' },
            { name: 'Margin%', values: [18, 20, 22, 25], chartKind: 'line', secondaryAxis: true },
          ],
        },
      },
      {
        layout: 'chart',
        title: 'Mix Pie',
        chart: { kind: 'pie', categories: ['A', 'B', 'C'], series: [{ name: 'Mix', values: [50, 30, 20] }] },
      },
    ],
  })
  // Patch chart2.xml <c:pieChart> -> <c:pie3DChart> to verify 3D chart detection
  const entries = unzipSync(new Uint8Array(readFileSync(built.pptxPath)))
  entries['ppt/charts/chart2.xml'] = strToU8(strFromU8(entries['ppt/charts/chart2.xml']).replace(/<(\/?)c:pieChart\b/g, '<$1c:pie3DChart'))
  const patchedPath = join(dir, 'combo-and-3d.pptx')
  writeFileSync(patchedPath, Buffer.from(zipSync(entries)))

  const ext = await extractPptxSlides({ pptxPath: patchedPath })
  assert.equal(ext.slides[1].chart.kind, 'combo')
  assert.equal(ext.slides[1].chart.series.length, 2)
  assert.deepEqual(ext.slides[1].chart.series.map((s) => s.name), ['Revenue', 'Margin%'])
  assert.equal(ext.slides[1].chart.series[1].chartKind, 'line')
  assert.equal(ext.slides[1].chart.series[1].secondaryAxis, true)
  assert.equal(ext.slides[2].chart.kind, 'pie', 'pie3DChart recognized as pie')

  // 2) XML-fallback merged table with gridSpan="2" + hMerge="1", multi-level bullets, and hidden slide
  const pres = officeKit.createPresentation()
  const sTbl = officeKit.addBlankSlide(pres)
  addText(sTbl, 'AltContent Merged Table', 500000, 300000, 8000000, 600000, 28, true)
  const tbl = officeKit.addSlideTable(sTbl, {
    x: 500000, y: 1200000, w: 8000000, h: 2600000,
    rows: [
      ['Region', 'Q1-Q2 Merged', '', 'Total'],
      ['North', '100', '120', '220'],
    ],
  })
  officeKit.mergeTableCells(tbl, { row: 0, col: 1, rowSpan: 1, colSpan: 2 })

  const sLvl = officeKit.addBlankSlide(pres)
  officeKit.setSlideHidden(sLvl, true)
  addText(sLvl, 'Multi-Level Hidden Slide', 500000, 300000, 8000000, 600000, 28, true)
  const tb = addText(sLvl, 'placeholder', 500000, 1200000, 8000000, 3600000, 18)
  officeKit.setShapeParagraphs(tb, [
    { runs: [{ text: 'Top Bullet' }], level: 0 },
    { runs: [{ text: 'Sub Bullet L1' }], level: 1 },
    { runs: [{ text: 'Sub Bullet L2' }], level: 2 },
  ])
  const e2 = unzipSync(new Uint8Array(await officeKit.savePresentation(pres)))
  e2['ppt/slides/slide1.xml'] = strToU8(
    strFromU8(e2['ppt/slides/slide1.xml'])
      .replace('<p:sld ', '<p:sld xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" ')
      .replace(/(<p:graphicFrame>[\s\S]*?<\/p:graphicFrame>)/, '<mc:AlternateContent><mc:Fallback>$1</mc:Fallback></mc:AlternateContent>')
  )
  e2['ppt/slides/slide2.xml'] = strToU8(
    strFromU8(e2['ppt/slides/slide2.xml'])
      .replace('<a:p><a:r><a:rPr/><a:t>Sub Bullet L1', '<a:p><a:pPr lvl="1"/><a:r><a:rPr/><a:t>Sub Bullet L1')
      .replace('<a:p><a:r><a:rPr/><a:t>Sub Bullet L2', '<a:p><a:pPr lvl="2"><a:buChar char="•"/></a:pPr><a:r><a:rPr/><a:t>Sub Bullet L2')
  )
  const edgePath = join(dir, 'edge-merged-lvl-hidden.pptx')
  writeFileSync(edgePath, Buffer.from(zipSync(e2)))

  const ext2 = await extractPptxSlides({ pptxPath: edgePath })
  assert.deepEqual(ext2.slides[0].rows[0], ['Region', 'Q1-Q2 Merged', '', 'Total'])
  assert.deepEqual(ext2.slides[0].rows[1], ['North', '100', '120', '220'])
  assert.equal(ext2.slides[1].hidden, true)
  assert.equal(ext2.slides[1].bullets[0], 'Top Bullet')
  assert.ok(ext2.slides[1].bullets[1].startsWith('↳ '))
  assert.ok(ext2.slides[1].bullets[2].startsWith('↳ ↳ '))
}))

test('P1-3: absorbPptx detects Harvey-ball tables, booktabs table style, and hidden slides via @office-kit API', () => inTmp(async (dir) => {
  const pres = officeKit.createPresentation()
  const s1 = officeKit.addBlankSlide(pres)
  addText(s1, 'Capability Matrix', 500000, 300000, 8000000, 600000, 28, true)
  const tbl = officeKit.addSlideTable(s1, {
    x: 500000, y: 1200000, w: 8000000, h: 3000000,
    rows: [
      ['Capability', 'Vendor A', 'Vendor B'],
      ['OOXML', '●', '◑'],
      ['Charts', '●', '○'],
      ['Tables', '◕', '◔'],
    ],
  })
  officeKit.setTableStyleFlags(tbl, { firstRow: true, bandRow: false, bandCol: false })
  const s2 = officeKit.addBlankSlide(pres)
  officeKit.setSlideHidden(s2, true)
  addText(s2, 'Internal Appendix', 500000, 300000, 8000000, 600000, 28, true)
  const p = join(dir, 'harvey-hidden.pptx')
  writeFileSync(p, await officeKit.savePresentation(pres))

  const abs = await absorbPptx({ pptxPath: p })
  assert.equal(abs.recommendedTableStyle, 'booktabs')
  assert.equal(abs.slideSkeleton[0].inferredLayout, 'harvey')
  assert.equal(abs.slideSkeleton[1].hidden, true)
}))

test('P1-1: XLSX prefixed namespaces, accounting/mixed-unit numbers, DOCX nested tables & OMML, and PDF per-font CMap/Encrypt', () => inTmp(async (dir) => {
  // 1) Prefixed-namespace XLSX
  const prefixedXlsx = Buffer.from(zipSync({
    '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/></Types>'),
    'xl/workbook.xml': strToU8('<?xml version="1.0" encoding="UTF-8"?><x:workbook xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><x:sheets><x:sheet name="Revenue" sheetId="1" r:id="rId1"/></x:sheets></x:workbook>'),
    'xl/_rels/workbook.xml.rels': strToU8('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'),
    'xl/sharedStrings.xml': strToU8('<?xml version="1.0" encoding="UTF-8"?><x:sst xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><x:si><x:t>Quarter</x:t></x:si><x:si><x:t>Revenue</x:t></x:si><x:si><x:t>Q1</x:t></x:si><x:si><x:t>Q2</x:t></x:si></x:sst>'),
    'xl/worksheets/sheet1.xml': strToU8('<?xml version="1.0" encoding="UTF-8"?><x:worksheet xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><x:sheetData><x:row r="1"><x:c r="A1" t="s"><x:v>0</x:v></x:c><x:c r="B1" t="s"><x:v>1</x:v></x:c></x:row><x:row r="2"><x:c r="A2" t="s"><x:v>2</x:v></x:c><x:c r="B2"><x:v>120</x:v></x:c></x:row><x:row r="3"><x:c r="A3" t="s"><x:v>3</x:v></x:c><x:c r="B3"><x:v>155</x:v></x:c></x:row></x:sheetData></x:worksheet>'),
  }))
  const xlsxPath = join(dir, 'prefixed.xlsx')
  writeFileSync(xlsxPath, prefixedXlsx)
  const extXlsx = await extractOfficeSource({ filePath: xlsxPath })
  assert.equal(extXlsx._sheets.length, 1)
  assert.deepEqual(extXlsx._sheets[0].rows[1], ['Q1', '120'])

  // 2) Signed/parenthesized currency & mixed scale units (亿 vs 万)
  const csvPath = join(dir, 'finance.csv')
  writeFileSync(csvPath, '\uFEFFQuarter,Net Profit,Cash Flow,Scale\nQ1,"-$1,200","($500)",1.2亿\nQ2,"$2,400","-¥800",8000万\nQ3,"$3,100","$1,100",1.5亿\n')
  const extCsv = await extractOfficeSource({ filePath: csvPath })
  const chartSlide = extCsv.slides.find((s) => s.chart)
  assert.ok(chartSlide)
  const netProfit = chartSlide.chart.series.find((s) => s.name === 'Net Profit')
  const cashFlow = chartSlide.chart.series.find((s) => s.name === 'Cash Flow')
  assert.deepEqual(netProfit.values, [-1200, 2400, 3100])
  assert.deepEqual(cashFlow.values, [-500, -800, 1100])

  const scaleCsvPath = join(dir, 'scale.csv')
  writeFileSync(scaleCsvPath, 'Quarter,GMV\nQ1,1.2亿\nQ2,8000万\nQ3,1.5亿\n')
  const extScale = await extractOfficeSource({ filePath: scaleCsvPath })
  const scaleChart = extScale.slides.find((s) => s.chart)
  assert.deepEqual(scaleChart.chart.series[0].values, [1.2, 0.8, 1.5])
  assert.equal(scaleChart.chart.unit, '亿')

  // 3) DOCX with nested <w:tbl>, w:gridSpan, and OMML <m:oMath>
  const docXml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
  <w:body>
    <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>1. Quarterly Strategy</w:t></w:r></w:p>
    <w:p><w:r><w:t>Key formula: </w:t></w:r><m:oMath><m:r><m:t>E=mc^2</m:t></m:r></m:oMath></w:p>
    <w:tbl>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Module</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:gridSpan w:val="2"/></w:tcPr><w:p><w:r><w:t>Status Summary</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Core</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Shipped</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>NestedCell</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:tc>
        <w:tc><w:p><w:r><w:t>On Track</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
  </w:body>
</w:document>`
  const docxPath = join(dir, 'nested-omml.docx')
  writeFileSync(docxPath, Buffer.from(zipSync({
    '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>'),
    'word/document.xml': strToU8(docXml),
  })))
  const extDocx = await extractOfficeSource({ filePath: docxPath })
  const docxTbl = extDocx.slides.find((s) => s.layout === 'table')
  assert.deepEqual(docxTbl.rows[0], ['Module', 'Status Summary', ''])
  assert.deepEqual(docxTbl.rows[1], ['Core', 'Shipped', 'On Track'], 'outer column 3 survives nested <w:tbl>')
  assert.ok(JSON.stringify(extDocx.slides).includes('E=mc^2'), 'OMML math preserved from DOCX')

  // 4) PDF per-font CMap + beginbfrange [...] array + trailer-only /Encrypt
  const cmap1 = 'beginbfchar\n<0001> <0041>\n<0002> <0042>\nendbfchar\nbeginbfrange\n<0010> <0012> [<0058> <0059> <005A>]\nendbfrange'
  const cmap2 = 'beginbfchar\n<0001> <4E2D>\n<0002> <6587>\nendbfchar'
  const pageStream = 'BT\n/F1 18 Tf\n<00010002001000110012> Tj\n/F2 18 Tf\n<00010002> Tj\nET'
  const c1z = deflateSync(Buffer.from(cmap1))
  const c2z = deflateSync(Buffer.from(cmap2))
  const psz = deflateSync(Buffer.from(pageStream))
  const multiFontPdf = Buffer.concat([
    Buffer.from('%PDF-1.4\n'),
    Buffer.from(`1 0 obj\n<< /Length ${c1z.length} /Filter /FlateDecode >>\nstream\n`), c1z, Buffer.from('\nendstream\nendobj\n'),
    Buffer.from(`2 0 obj\n<< /Length ${c2z.length} /Filter /FlateDecode >>\nstream\n`), c2z, Buffer.from('\nendstream\nendobj\n'),
    Buffer.from('5 0 obj\n<< /Type /Font /ToUnicode 1 0 R >>\nendobj\n'),
    Buffer.from('6 0 obj\n<< /Type /Font /ToUnicode 2 0 R >>\nendobj\n'),
    Buffer.from('3 0 obj\n<< /Type /Page /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>\nendobj\n'),
    Buffer.from(`4 0 obj\n<< /Length ${psz.length} /Filter /FlateDecode >>\nstream\n`), psz, Buffer.from('\nendstream\nendobj\n'),
    Buffer.from('%%EOF\n'),
  ])
  const parsedPdf = extractPdfText(multiFontPdf)
  assert.ok(parsedPdf.lines.join(' ').includes('ABXYZ中文'), `expected ABXYZ中文, got ${JSON.stringify(parsedPdf.lines)}`)

  // Literal /Encrypt in text stream must NOT false-positive
  const plainStream = 'BT /F1 14 Tf (Check /Encrypt dictionary in PDF spec) Tj ET'
  const unencPdf = Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Type /Page >>\nendobj\n2 0 obj\n<< /Length ${plainStream.length} >>\nstream\n${plainStream}\nendstream\nendobj\n%%EOF\n`)
  const parsedUnenc = extractPdfText(unencPdf)
  assert.ok(parsedUnenc.lines[0].includes('/Encrypt'))

  // Real encrypted trailer MUST still be rejected
  const realEncPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Size 2 /Encrypt 2 0 R >>\n%%EOF\n')
  assert.throws(() => extractPdfText(realEncPdf), /加密|Encrypted/i)
}))

test('P0-2: Mode B sync preserves slide IDs/metadata on slide insert and handles paginated table + dataModel without crash', () => inTmp(async (dir) => {
  // Case A: Inserted slide at index 1
  const projA = await buildDeckAsync({
    title: 'Mode B Insert Test',
    theme: 'consulting',
    outputDir: join(dir, 'a'),
    fileName: 'board',
    overwrite: true,
    smartLayout: false,
    autoUpgrade: false,
    slides: [
      { layout: 'cover', title: 'Q3 Board Deck', subtitle: 'Initial' },
      { layout: 'table', title: 'Revenue Breakdown', tableStyle: 'booktabs', rows: [['Dept', 'Q1'], ['North', '10'], ['South', '20']] },
      { layout: 'kpi', title: 'Key Metrics', visual: { density: 'airy', titleSize: 38 }, items: [{ value: '95%', title: 'Retention' }] },
      { layout: 'statement', title: 'Next Quarter Target', subtitle: 'Scale to $20M' },
    ],
  })
  const origA = readDeckProject({ deckPath: projA.jsonPath }).manifest
  const origTableId = origA.slides[1].id
  const origKpiId = origA.slides[2].id
  const origEndId = origA.slides[3].id

  const presA = await officeKit.loadPresentation(readFileSync(projA.pptxPath))
  const ins = officeKit.addBlankSlide(presA)
  officeKit.moveSlide(presA, ins, 1)
  addText(ins, 'Inserted Executive Summary', 500000, 400000, 8000000, 700000, 32, true)
  addText(ins, 'Added in PowerPoint', 500000, 1500000, 8000000, 1000000, 20)
  const editedA = join(dir, 'edited-a.pptx')
  writeFileSync(editedA, await officeKit.savePresentation(presA))

  await importPptxDeck({ pptxPath: editedA, deckPath: projA.jsonPath })
  const afterA = readDeckProject({ deckPath: projA.jsonPath }).manifest
  const tblSlide = afterA.slides.find((s) => s.title === 'Revenue Breakdown')
  const insSlide = afterA.slides.find((s) => s.title === 'Inserted Executive Summary')
  const endSlide = afterA.slides.find((s) => s.title === 'Next Quarter Target')
  assert.equal(tblSlide.id, origTableId, 'Table keeps its original ID after upstream insert')
  assert.equal(tblSlide.tableStyle, 'booktabs', 'Table keeps booktabs tableStyle')
  assert.equal(tblSlide.visual, undefined, 'Table does not steal KPI visual metadata')
  assert.notEqual(insSlide.id, origTableId, 'Inserted slide gets fresh ID instead of stealing Table ID')
  assert.equal(endSlide.id, origEndId, 'Trailing slide keeps its original ID')
  assert.notEqual(insSlide.id, origKpiId)

  // Case B: Paginated table expansion on a dataModel-bound project
  const projB = await buildDeckAsync({
    title: 'Mode B Paginate DataModel',
    theme: 'consulting',
    outputDir: join(dir, 'b'),
    fileName: 'bound',
    overwrite: true,
    dataModel: {
      sources: [{ id: 'ops', name: 'Ops Sheet', kind: 'table', rows: [['Metric', 'Val'], ['SLA', '99']] }],
      metrics: [{ id: 'sla', label: 'SLA', kind: 'source', source: { sourceId: 'ops', cell: 'B2' }, format: { style: 'number', digits: 0, unit: '%' } }],
    },
    slides: [
      { layout: 'cover', title: 'Cover', subtitle: 'Sub' },
      { layout: 'table', title: 'Short Table', rows: [['A', 'B'], ['1', '2'], ['3', '4']] },
      { layout: 'bullets', title: 'Bound SLA Slide', bullets: ['Current SLA is {{sla}}'] },
    ],
  })
  const origB = readDeckProject({ deckPath: projB.jsonPath }).manifest
  const slaId = origB.slides[2].id

  const pExp = officeKit.createPresentation()
  const ps1 = officeKit.addBlankSlide(pExp)
  addText(ps1, 'Cover', 500000, 500000, 8000000, 700000, 36, true)
  const ps2 = officeKit.addBlankSlide(pExp)
  addText(ps2, 'Short Table', 500000, 300000, 8000000, 600000, 28, true)
  officeKit.addSlideTable(ps2, {
    x: 500000, y: 1100000, w: 8000000, h: 3500000,
    rows: [['A', 'B'], ...Array.from({ length: 11 }, (_, i) => [`R${i + 1}`, `${i}`])],
  })
  const ps3 = officeKit.addBlankSlide(pExp)
  addText(ps3, 'Bound SLA Slide', 500000, 300000, 8000000, 600000, 28, true)
  addText(ps3, 'Current SLA is 99%', 500000, 1500000, 6000000, 1000000, 20)
  const expPptx = join(dir, 'expanded-b.pptx')
  writeFileSync(expPptx, await officeKit.savePresentation(pExp))

  const syncedB = await importPptxDeck({ pptxPath: expPptx, deckPath: projB.jsonPath })
  assert.equal(syncedB.ok, true)
  const afterB = readDeckProject({ deckPath: projB.jsonPath }).manifest
  assert.equal(afterB.slides.length, 4, '11-row table paginated into 2 slides -> 4 total slides')
  assert.equal(afterB.slides[2].dataTemplate, undefined, 'Table continuation page does NOT steal dataTemplate')
  assert.equal(afterB.slides[3].id, slaId, 'Bound SLA slide retains its ID')
  assert.ok(afterB.slides[3].dataTemplate, 'Bound SLA slide retains its dataTemplate')
}))

test('deck-advanced: explicit theme runs autoUpgrade/selfRepair; editDeck supports start/span, brand null clears & items guard', () => inTmp(async (dir) => {
  const built = await buildDeckAsync({
    title: 'Explicit Theme Upgrade Check',
    theme: 'stripe-craft',
    taste: 'linear-craft',
    outputDir: dir,
    fileName: 'explicit-theme',
    overwrite: true,
    slides: [
      { layout: 'cover', title: 'Explicit Theme Upgrade Check', subtitle: 'Q4 2026' },
      { layout: 'bullets', title: 'Overview', bullets: ['Revenue grew 38% to $42M in Q4 across enterprise accounts', 'Gross margin expanded by 4.5 percentage points through automation', 'Net dollar retention hit 124% across top 200 strategic customers', 'Pipeline coverage reached 3.6x entering Q1 2027 fiscal plan'] },
      { layout: 'bullets', title: 'Details', bullets: ['Core platform latency dropped from 180ms to 42ms p99', 'Deployment frequency doubled from weekly to daily releases'] },
      { layout: 'closing', title: 'Thank You' },
    ],
  })
  assert.ok(built.upgradeReport?.applied, 'autoUpgrade / selfRepair runs even when explicit theme & taste are passed')

  const pngPath = join(dir, 'logo.png')
  writeFileSync(pngPath, makeValidPng())
  const deckForEdit = await buildDeckAsync({
    title: 'Edit Guards Test',
    theme: 'consulting',
    outputDir: dir,
    fileName: 'edit-guards',
    overwrite: true,
    smartLayout: false,
    autoUpgrade: false,
    brand: { primaryColor: '#1E3A8A', fontFamily: 'Microsoft YaHei', logo: pngPath, footer: 'Internal' },
    slides: [
      { layout: 'cover', title: 'Cover', subtitle: 'Sub' },
      {
        layout: 'cards',
        title: 'Three Pillars',
        items: [
          { tag: '01', title: 'Pillar A', text: 'Alpha' },
          { tag: '02', title: 'Pillar B', text: 'Beta' },
        ],
      },
      { layout: 'gantt', title: 'Roadmap', columns: ['Q1', 'Q2', 'Q3', 'Q4'], items: [{ tag: 'T1', title: 'Build', start: 0, span: 2 }] },
    ],
  })

  // Edit bullets on cards slide without touching items -> items must NOT be wiped; also allow start/span and clear brand fields via null
  const edited = await editDeck({
    deckPath: deckForEdit.jsonPath,
    expectedRevision: deckForEdit.revision,
    edits: [
      { slide: 2, patch: { bullets: ['Supporting context note'] } },
      { slide: 3, patch: { start: 1, span: 2 } },
    ],
    brand: { primaryColor: null, fontFamily: null, logo: null, footer: '' },
  })
  assert.equal(edited.ok, true)
  const after = readDeckProject({ deckPath: deckForEdit.jsonPath }).manifest
  assert.equal(after.slides[1].items?.length, 2, 'cards items preserved when bullets patched without layout change')
  assert.equal(after.brand, undefined, 'explicit null/empty brand fields cleared cleanly instead of resurrecting')
}))

test('P1-5 & P2-1: WebP safe PPTX fallback PNG + identical brand logo deduplication in ppt/media/', () => inTmp(async (dir) => {
  const logoPath = join(dir, 'brand-logo.png')
  const webpPath = join(dir, 'sample.webp')
  writeFileSync(logoPath, makeValidPng(10, 10))
  writeFileSync(webpPath, makeTinyWebp())

  const built = await buildDeckAsync({
    title: 'Media Dedup & WebP Test',
    theme: 'consulting',
    outputDir: dir,
    fileName: 'media-opt',
    overwrite: true,
    smartLayout: false,
    autoUpgrade: false,
    brand: { name: 'Audit Co', logo: logoPath },
    slides: [
      { layout: 'cover', title: 'Cover', subtitle: 'Sub' },
      { layout: 'bullets', title: 'Slide 2', bullets: ['One', 'Two'] },
      { layout: 'bullets', title: 'Slide 3', bullets: ['Three', 'Four'] },
      { layout: 'image-right', title: 'WebP Visual', image: webpPath, bullets: ['WebP bullet'] },
      { layout: 'closing', title: 'Thanks', subtitle: 'Q&A' },
    ],
  })

  const pptxBuf = readFileSync(built.pptxPath)
  const entries = unzipSync(new Uint8Array(pptxBuf))
  const mediaParts = Object.keys(entries).filter((k) => /^ppt\/media\//.test(k))
  assert.ok(!mediaParts.some((m) => m.endsWith('.webp')), 'no raw .webp parts emitted into PPTX')
  assert.equal(mediaParts.length, 2, `expected 2 deduplicated media parts (1 shared logo + 1 WebP fallback PNG), got ${mediaParts.join(', ')}`)

  // Verify HTML keeps original WebP data URI
  const html = readFileSync(built.htmlPath, 'utf8')
  assert.ok(html.includes('data:image/webp;base64,'), 'HTML preserves original WebP image')

  // Verify deduplicated PPTX still passes @office-kit/pptx validatePresentation with 0 errors
  const pres = await officeKit.loadPresentation(pptxBuf)
  const errs = officeKit.validatePresentation(pres).filter((i) => i.severity === 'error')
  assert.deepEqual(errs, [])
}))

test('P1-5, P0-4 & #127-2: reverse .docx tblGrid/Normal/code/mermaid/notes, handout/onepager code, HUD auto-hide, and compilable Remotion bundle', () => inTmp(async (dir) => {
  const pngPath = join(dir, 'shot.png')
  writeFileSync(pngPath, makeValidPng())
  const manifest = {
    title: 'Full Export Audit',
    theme: 'consulting',
    language: 'en',
    slides: [
      { layout: 'cover', title: 'Full Export Audit', subtitle: 'Q4', notes: 'Cover speaker note.' },
      { layout: 'table', title: 'Regional Table', rows: [['Region', 'Rev'], ['APAC', '120'], ['EMEA', '95']], notes: 'Table speaker note.' },
      { layout: 'code', title: 'Pipeline Code', language: 'ts', code: 'export const run = (n: number) => n * 2;', notes: 'Code speaker note.' },
      { layout: 'mermaid', title: 'Flow Diagram', mermaid: 'flowchart LR\n  A[Client] --> B[Engine]', notes: 'Mermaid note.' },
      { layout: 'callout', variant: 'formula', title: 'Loss', formula: 'L = \\frac{1}{N} \\sum y_i', notes: 'Formula note.' },
      { layout: 'image-left', title: 'Screenshot', image: { src: `data:image/png;base64,${makeValidPng().toString('base64')}`, alt: 'UI' }, bullets: ['Fast'] },
    ],
  }

  // 1) Reverse .docx
  const docxBuf = renderDeckReportDocx(manifest, 'en')
  const docxEntries = unzipSync(new Uint8Array(docxBuf))
  const docXml = strFromU8(docxEntries['word/document.xml'])
  const stylesXml = strFromU8(docxEntries['word/styles.xml'])
  assert.ok(docXml.includes('<w:tblW '), '.docx table includes <w:tblW>')
  assert.ok(docXml.includes('<w:tblGrid><w:gridCol '), '.docx table includes required <w:tblGrid>')
  assert.ok(stylesXml.includes('w:default="1" w:styleId="Normal"'), '.docx styles.xml includes default Normal style')
  assert.ok(docXml.includes('export const run'), '.docx includes code slide content')
  assert.ok(docXml.includes('flowchart LR'), '.docx includes mermaid content')
  assert.ok(docXml.includes('Cover speaker note') && docXml.includes('Table speaker note'), '.docx includes speaker notes')

  // 2) Handout MD, One-Pager HTML, and Delivery HUD auto-hide CSS
  const handout = renderHandoutMarkdown(manifest, 'en')
  assert.ok(handout.includes('export const run'), 'handout.md includes code slide')
  const onePager = renderOnePagerHtml(manifest, 'en')
  assert.ok(onePager.includes('export const run'), 'onepager.html includes code card')
  assert.ok(onePager.includes('data-mermaid-kind="FLOWCHART"'), 'onepager.html includes mermaid card')
  const delivery = renderDelivery(manifest, { pptx: 'x.pptx', json: 'x.json' }, 'en')
  assert.match(delivery.css, /#delivery-bar\{[^}]*opacity:0;[^}]*pointer-events:none/)
  assert.match(delivery.css, /#hud\{[^}]*opacity:0;[^}]*pointer-events:none/)
  assert.match(delivery.css, /dsh-chrome-top/)

  // 3) Remotion bundle structure + TypeScript syntax check
  const rem = buildRemotionBundleFiles(manifest, { fps: 30, format: 'landscape' })
  assert.ok(rem.files['src/index.tsx'], 'emits src/index.tsx')
  assert.ok(rem.files['src/Root.tsx'], 'emits src/Root.tsx')
  assert.ok(rem.files['src/index.ts'], 'keeps JSX-free src/index.ts')
  assert.ok(!rem.files['src/index.ts'].includes('<Composition'), 'src/index.ts contains zero JSX')
  assert.ok(rem.files['tsconfig.json'], 'emits tsconfig.json')
  const pkg = JSON.parse(rem.files['package.json'])
  assert.ok(pkg.scripts.preview.includes('src/index.tsx'))
  assert.ok(pkg.scripts.render.includes('src/index.tsx'))

  const deckVideo = rem.files['src/DeckVideo.tsx']
  assert.ok(deckVideo.includes('scene.rows.length'), 'DeckVideo renders tables')
  assert.ok(deckVideo.includes('scene.code'), 'DeckVideo renders code')
  assert.ok(deckVideo.includes('scene.mermaid'), 'DeckVideo renders mermaid')
  assert.ok(deckVideo.includes('scene.formula'), 'DeckVideo renders formula')
  assert.ok(deckVideo.includes('scene.image'), 'DeckVideo renders image')

  // Write Remotion files to temp dir and verify tsc finds ZERO TS1005 JSX-in-.ts syntax errors
  const remDir = join(dir, 'remotion-out')
  for (const [rel, content] of Object.entries(rem.files)) {
    const abs = join(remDir, rel)
    mkdirSync(join(abs, '..'), { recursive: true })
    writeFileSync(abs, content, 'utf8')
  }
  const tsc = spawnSync(
    process.execPath,
    [join(process.cwd(), 'node_modules', 'typescript', 'bin', 'tsc'), '--noEmit', '-p', join(remDir, 'tsconfig.json')],
    { encoding: 'utf8', windowsHide: true }
  )
  const tscOut = `${tsc.stdout || ''}\n${tsc.stderr || ''}`
  assert.ok(!/error TS1005\b/.test(tscOut), `Remotion bundle must have zero TS1005 JSX syntax errors, got:\n${tscOut}`)
  assert.ok(!/src\/index\.ts\(\d+,\d+\): error TS1/.test(tscOut), `src/index.ts must parse cleanly, got:\n${tscOut}`)
}))

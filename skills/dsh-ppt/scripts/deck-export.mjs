/**
 * deck-export.mjs —— 双向 Office 逆向导出引擎（零新增运行时依赖）：
 *   1. `renderDeckWorkbookXlsx(manifest)` —— 生成标准 OOXML `.xlsx` 工作簿（总览页 + 每页图表/表格/KPI 数据工作表，真数值单元格 `<c t="n">`）
 *   2. `renderDeckReportDocx(manifest, lang)` —— 生成标准 OOXML `.docx` Word 正式汇报文档（标题层级、正文段落、原生 `<w:tbl>` 表格与 `[E1..En]` 溯源附录）
 *   3. `renderDeckMemoMarkdown(manifest, lang)` —— 生成高管散文体备忘录 `.memo.md`（Amazon 6-Page 叙事风格）
 *   4. `renderQaPrepMarkdown(manifest, lang)` —— 生成会前高管质询与答辩预案 `.qa-prep.md`（基于真实指标、超预算页、冲突/估算/预测证据自动出题与给答法）
 */

import { deflateRawSync } from 'node:zlib'
import { stripInlineMarkdown } from './deck-layouts.mjs'
import { computePaceBudget } from './deck-delivery.mjs'
import { renderEvidenceHandoutSection } from './deck-evidence.mjs'

let CRC_TABLE = null
function crc32(buffer) {
  if (CRC_TABLE === null) {
    CRC_TABLE = new Int32Array(256)
    for (let n = 0; n < 256; n += 1) {
      let c = n
      for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
      CRC_TABLE[n] = c
    }
  }
  let crc = 0xffffffff
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function createZipBuffer(entries) {
  const chunks = []
  const central = []
  let offset = 0

  for (const entry of entries) {
    const entryOffset = offset
    const name = Buffer.from(entry.name, 'utf8')
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(String(entry.data), 'utf8')
    const crc = crc32(data)
    const compressed = deflateRawSync(data)
    const method = 8
    const nameLen = name.length

    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(0x0800, 6)
    localHeader.writeUInt16LE(method, 8)
    localHeader.writeUInt16LE(0, 10)
    localHeader.writeUInt16LE(0x21, 12)
    localHeader.writeUInt32LE(crc, 14)
    localHeader.writeUInt32LE(compressed.length, 18)
    localHeader.writeUInt32LE(data.length, 22)
    localHeader.writeUInt16LE(nameLen, 26)
    localHeader.writeUInt16LE(0, 28)

    chunks.push(localHeader, name, compressed)
    offset += 30 + nameLen + compressed.length

    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0)
    centralHeader.writeUInt16LE(20, 4)
    centralHeader.writeUInt16LE(20, 6)
    centralHeader.writeUInt16LE(0x0800, 8)
    centralHeader.writeUInt16LE(method, 10)
    centralHeader.writeUInt16LE(0, 12)
    centralHeader.writeUInt16LE(0x21, 14)
    centralHeader.writeUInt32LE(crc, 16)
    centralHeader.writeUInt32LE(compressed.length, 20)
    centralHeader.writeUInt32LE(data.length, 24)
    centralHeader.writeUInt16LE(nameLen, 28)
    centralHeader.writeUInt16LE(0, 30)
    centralHeader.writeUInt16LE(0, 32)
    centralHeader.writeUInt16LE(0, 34)
    centralHeader.writeUInt16LE(0, 36)
    centralHeader.writeUInt32LE(0, 38)
    centralHeader.writeUInt32LE(entryOffset, 42)
    central.push(centralHeader, name)
  }

  const centralOffset = offset
  const centralSize = central.reduce((sum, part) => sum + part.length, 0)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralSize, 12)
  end.writeUInt32LE(centralOffset, 16)
  end.writeUInt16LE(0, 20)

  chunks.push(...central, end)
  return Buffer.concat(chunks)
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function cleanText(value, maxLen = 4000) {
  return stripInlineMarkdown(String(value ?? '')).replace(/\s+/g, ' ').trim().slice(0, maxLen)
}

function colIndexToLetters(idx) {
  let n = idx + 1
  let out = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    out = String.fromCharCode(65 + rem) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

function sanitizeSheetName(raw, usedNames) {
  let base = cleanText(raw, 28).replace(/[\[\]:*?\/\\']/g, '').trim() || 'Sheet'
  base = base.slice(0, 28)
  let candidate = base
  let seq = 2
  while (usedNames.has(candidate.toLowerCase())) {
    const suffix = `_${seq}`
    candidate = base.slice(0, 31 - suffix.length) + suffix
    seq += 1
  }
  usedNames.add(candidate.toLowerCase())
  return candidate
}

function parseStrictNumeric(val) {
  if (typeof val === 'number' && Number.isFinite(val)) return val
  if (typeof val !== 'string') return null
  const s = val.trim()
  if (/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(s)) {
    const n = Number(s)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function buildWorksheetXml(rows) {
  const rowXmls = []
  for (let r = 0; r < rows.length; r += 1) {
    const row = Array.isArray(rows[r]) ? rows[r] : [rows[r]]
    const cells = []
    for (let c = 0; c < row.length; c += 1) {
      const ref = `${colIndexToLetters(c)}${r + 1}`
      const raw = row[c]
      const num = r === 0 ? null : parseStrictNumeric(raw)
      const styleAttr = r === 0 ? ' s="1"' : ''
      if (num !== null) {
        cells.push(`<c r="${ref}" t="n"><v>${num}</v></c>`)
      } else {
        const text = escapeXml(cleanText(raw ?? '', 2000))
        cells.push(`<c r="${ref}"${styleAttr} t="inlineStr"><is><t>${text}</t></is></c>`)
      }
    }
    rowXmls.push(`<row r="${r + 1}">${cells.join('')}</row>`)
  }
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetData>' + rowXmls.join('') + '</sheetData>' +
    '</worksheet>'
}

/**
 * 逆向导出标准 `.xlsx` Excel 数据工作簿：
 * - Sheet 1：演示文稿结构总览（页码 / 版式 / 标题 / 核心结论 / 出处）；
 * - 后续每个包含图表、表格、KPI、Treemap、Gauge、Pricing 或证据账本的页面均生成独立可运算数据工作表。
 * @param {object} manifest
 * @returns {Buffer}
 */
export function renderDeckWorkbookXlsx(manifest) {
  const slides = Array.isArray(manifest?.slides) ? manifest.slides : []
  const en = (manifest?.language || 'zh') === 'en'
  const usedNames = new Set()
  const sheets = []

  const summaryRows = [
    en
      ? ['Slide', 'Layout', 'Kicker', 'Title', 'Takeaway', 'Source']
      : ['页码', '版式', '章节标签', '页面标题', '核心结论', '数据出处'],
    ...slides.map((s, idx) => [
      idx + 1,
      s.variant ? `${s.layout}[${s.variant}]` : (s.layout || 'bullets'),
      cleanText(s.kicker || ''),
      cleanText(s.title || ''),
      cleanText(s.takeaway || ''),
      cleanText(s.source || ''),
    ]),
  ]
  sheets.push({
    name: sanitizeSheetName(en ? 'Summary' : '演示总览', usedNames),
    rows: summaryRows,
  })

  slides.forEach((s, idx) => {
    const prefix = `P${idx + 1}_${cleanText(s.kicker || s.title || s.layout, 18)}`
    if (s.chart && Array.isArray(s.chart.series) && s.chart.series.length > 0) {
      const cats = Array.isArray(s.chart.categories) ? s.chart.categories : []
      const header = [en ? 'Category' : '类别', ...s.chart.series.map(ser => cleanText(ser.name || 'Series'))]
      const maxLen = Math.max(cats.length, ...s.chart.series.map(ser => (ser.values || []).length))
      const dataRows = []
      for (let i = 0; i < maxLen; i += 1) {
        dataRows.push([
          cleanText(cats[i] ?? `#${i + 1}`),
          ...s.chart.series.map(ser => {
            const v = ser.values?.[i]
            return typeof v === 'number' && Number.isFinite(v) ? v : cleanText(v ?? '')
          }),
        ])
      }
      sheets.push({ name: sanitizeSheetName(prefix, usedNames), rows: [header, ...dataRows] })
    } else if (Array.isArray(s.rows) && s.rows.length >= 2) {
      sheets.push({
        name: sanitizeSheetName(prefix, usedNames),
        rows: s.rows.map(r => (Array.isArray(r) ? r.map(c => cleanText(c)) : [cleanText(r)])),
      })
    } else if (['kpi', 'treemap', 'gauge', 'pricing', 'sankey'].includes(s.layout) && Array.isArray(s.items) && s.items.length > 0) {
      const header = s.layout === 'gauge'
        ? (en ? ['Metric', 'Actual', 'Target', 'Max', 'Unit', 'Delta'] : ['指标名称', '当前值', '目标值', '上限', '单位', '变动'])
        : (en ? ['Tag', 'Title', 'Value', 'Unit', 'Delta', 'Detail'] : ['标签', '名称', '数值', '单位', '变动', '说明'])
      const dataRows = s.items.map((it) => {
        if (s.layout === 'gauge') {
          return [
            cleanText(it.title || it.tag || ''),
            it.value ?? it.actual ?? '',
            it.target ?? it.before ?? '',
            it.max ?? '',
            cleanText(it.unit || ''),
            cleanText(it.delta || ''),
          ]
        }
        return [
          cleanText(it.tag || ''),
          cleanText(it.title || ''),
          it.value ?? '',
          cleanText(it.unit || ''),
          cleanText(it.delta || ''),
          cleanText(it.text || (Array.isArray(it.bullets) ? it.bullets.join('; ') : '')),
        ]
      })
      sheets.push({ name: sanitizeSheetName(prefix, usedNames), rows: [header, ...dataRows] })
    }
  })

  if (Array.isArray(manifest?.evidence) && manifest.evidence.length > 0) {
    const evRows = [
      en
        ? ['ID', 'Origin', 'Tier', 'Claim', 'Source', 'Date', 'Scope', 'Confidence', 'URL']
        : ['编号', '来源类别', '权威等级', '核验事实', '一手出处', '年份', '口径', '核验状态', '链接'],
      ...manifest.evidence.map((e) => [
        cleanText(e.id),
        cleanText(e.origin || ''),
        e.tier ? `T${e.tier}` : '',
        cleanText(e.claim),
        cleanText(e.source),
        cleanText(e.date || ''),
        cleanText(e.scope || ''),
        cleanText(e.confidence || ''),
        cleanText(e.url || ''),
      ]),
    ]
    sheets.push({
      name: sanitizeSheetName(en ? 'Evidence_Ledger' : '事实溯源台账', usedNames),
      rows: evRows,
    })
  }

  const sheetOverrides = sheets.map((_, i) =>
    `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  ).join('')
  const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    sheetOverrides +
    '</Types>'

  const rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>'

  const workbookSheetsXml = sheets.map((sh, i) =>
    `<sheet name="${escapeXml(sh.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
  ).join('')
  const workbookXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets>${workbookSheetsXml}</sheets>` +
    '</workbook>'

  const wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    sheets.map((_, i) =>
      `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
    ).join('') +
    `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    '</Relationships>'

  const stylesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="2">' +
    '<font><sz val="11"/><name val="Calibri"/></font>' +
    '<font><b/><sz val="11"/><color rgb="FF0F172A"/><name val="Calibri"/></font>' +
    '</fonts>' +
    '<fills count="3">' +
    '<fill><patternFill patternType="none"/></fill>' +
    '<fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/></patternFill></fill>' +
    '</fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="2">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
    '</cellXfs>' +
    '</styleSheet>'

  return createZipBuffer([
    { name: '[Content_Types].xml', data: contentTypes },
    { name: '_rels/.rels', data: rootRels },
    { name: 'xl/workbook.xml', data: workbookXml },
    { name: 'xl/_rels/workbook.xml.rels', data: wbRels },
    { name: 'xl/styles.xml', data: stylesXml },
    ...sheets.map((sh, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: buildWorksheetXml(sh.rows),
    })),
  ])
}

// ---------------------------------------------------------------------------
// Reverse Word (.docx) Formal Report Export
// ---------------------------------------------------------------------------

function docxPara(text, style = '', bold = false) {
  const pPr = style ? `<w:pPr><w:pStyle w:val="${escapeXml(style)}"/></w:pPr>` : ''
  const rPr = bold ? '<w:rPr><w:b/></w:rPr>' : ''
  return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`
}

function docxTable(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return ''
  const colCount = Math.max(1, ...rows.map(r => (Array.isArray(r) ? r.length : 1)))
  const tblPr = '<w:tblPr><w:tblBorders>' +
    '<w:top w:val="single" w:sz="6" w:color="334155"/>' +
    '<w:bottom w:val="single" w:sz="6" w:color="334155"/>' +
    '<w:insideH w:val="single" w:sz="4" w:color="CBD5E1"/>' +
    '<w:left w:val="none"/><w:right w:val="none"/><w:insideV w:val="none"/>' +
    '</w:tblBorders></w:tblPr>'
  const trs = rows.map((row, rIdx) => {
    const arr = Array.isArray(row) ? row : [row]
    const cells = Array.from({ length: colCount }, (_, ci) => {
      const txt = cleanText(arr[ci] ?? '')
      const shd = rIdx === 0 ? '<w:tcPr><w:shd w:val="clear" w:fill="EEF2F7"/></w:tcPr>' : ''
      return `<w:tc>${shd}${docxPara(txt, '', rIdx === 0)}</w:tc>`
    }).join('')
    return `<w:tr>${cells}</w:tr>`
  }).join('')
  return `<w:tbl>${tblPr}${trs}</w:tbl>`
}

/**
 * 逆向导出标准 `.docx` Word 正式汇报文档（支持 Word 直接编辑与二次导入闭环）。
 * @param {object} manifest
 * @param {string} [language]
 * @returns {Buffer}
 */
export function renderDeckReportDocx(manifest, language) {
  const en = (language || manifest?.language || 'zh') === 'en'
  const slides = Array.isArray(manifest?.slides) ? manifest.slides : []
  const title = cleanText(manifest?.title || (en ? 'Executive Report' : '汇报文档'))
  const cover = slides.find(s => s.layout === 'cover')
  const bodyBlocks = []

  bodyBlocks.push(docxPara(title, 'Title'))
  if (cover?.subtitle) bodyBlocks.push(docxPara(cleanText(cover.subtitle), 'Subtitle'))
  bodyBlocks.push(docxPara(
    en
      ? `Theme: ${manifest?.theme || 'consulting'} · Slides: ${slides.length} · Generated by dsh-ppt`
      : `主题风格：${manifest?.theme || 'consulting'} ｜ 共 ${slides.length} 页 ｜ 由 dsh-ppt 自动转为正式 Word 文档`,
  ))

  let secIdx = 0
  for (const s of slides) {
    if (s.layout === 'cover') continue
    secIdx += 1
    const headingStyle = s.layout === 'section' ? 'Heading1' : 'Heading2'
    const secTitle = cleanText(s.title || (en ? `Section ${secIdx}` : `第 ${secIdx} 节`))
    bodyBlocks.push(docxPara(`${secIdx}. ${secTitle}`, headingStyle))

    if (s.subtitle) bodyBlocks.push(docxPara(cleanText(s.subtitle)))
    if (s.text) bodyBlocks.push(docxPara(cleanText(s.text)))
    if (s.formula) bodyBlocks.push(docxPara(`$${String(s.formula).trim()}$`))

    if (Array.isArray(s.bullets) && s.bullets.length > 0) {
      for (const b of s.bullets) {
        const line = cleanText(b)
        if (line) bodyBlocks.push(docxPara(`• ${line}`, 'ListParagraph'))
      }
    }

    if (Array.isArray(s.items) && s.items.length > 0) {
      if (['kpi', 'gauge', 'treemap', 'pricing', 'sankey'].includes(s.layout)) {
        const tblRows = [
          en ? ['Tag', 'Item', 'Value', 'Delta / Note'] : ['标签', '核心项', '关键数值', '变化 / 说明'],
          ...s.items.map(it => [
            cleanText(it.tag || ''),
            cleanText(it.title || ''),
            cleanText(`${it.value ?? ''}${it.unit ?? ''}`),
            cleanText([it.delta, it.text, ...(Array.isArray(it.bullets) ? it.bullets : [])].filter(Boolean).join('；')),
          ]),
        ]
        bodyBlocks.push(docxTable(tblRows))
      } else {
        for (const it of s.items) {
          const head = [cleanText(it.tag), cleanText(it.title)].filter(Boolean).join(' · ')
          const body = [cleanText(it.value), cleanText(it.delta), cleanText(it.text), ...(Array.isArray(it.bullets) ? it.bullets.map(cleanText) : [])].filter(Boolean).join(' — ')
          const line = [head, body].filter(Boolean).join('：')
          if (line) bodyBlocks.push(docxPara(`• ${line}`, 'ListParagraph'))
        }
      }
    }

    if (Array.isArray(s.rows) && s.rows.length >= 2) bodyBlocks.push(docxTable(s.rows))

    if (s.chart && Array.isArray(s.chart.series) && s.chart.series.length > 0) {
      const cats = Array.isArray(s.chart.categories) ? s.chart.categories : []
      const header = [en ? 'Category' : '类别', ...s.chart.series.map(ser => cleanText(ser.name || 'Series'))]
      const rows = [header]
      const maxLen = Math.max(cats.length, ...s.chart.series.map(ser => (ser.values || []).length))
      for (let i = 0; i < maxLen; i += 1) {
        rows.push([cleanText(cats[i] ?? `#${i + 1}`), ...s.chart.series.map(ser => String(ser.values?.[i] ?? ''))])
      }
      bodyBlocks.push(docxTable(rows))
    }

    if (s.takeaway) bodyBlocks.push(docxPara((en ? 'Key Takeaway: ' : '核心结论：') + cleanText(s.takeaway), '', true))
    if (s.source) bodyBlocks.push(docxPara((en ? 'Source: ' : '数据来源：') + cleanText(s.source)))
  }

  if (Array.isArray(manifest?.evidence) && manifest.evidence.length > 0) {
    bodyBlocks.push(docxPara(en ? 'Verified Evidence Ledger & Sources' : '事实核验与证据溯源清单', 'Heading1'))
    const evTbl = [
      en ? ['ID', 'Origin', 'Verified Claim', 'Primary Source & Date', 'Status'] : ['编号', '来源类别', '核验事实', '一手出处与年份', '状态'],
      ...manifest.evidence.map(e => [
        cleanText(e.id),
        cleanText(e.origin === 'local-file' ? (en ? 'Internal' : '内部资料') : (e.tier ? `T${e.tier}` : (en ? 'External' : '权威外源'))),
        cleanText(e.claim),
        cleanText(`${e.source}${e.date ? ` (${e.date})` : ''}`),
        cleanText(e.confidence || 'verified'),
      ]),
    ]
    bodyBlocks.push(docxTable(evTbl))
  }

  const documentXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:body>' + bodyBlocks.join('') +
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>' +
    '</w:body></w:document>'

  const stylesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="44"/></w:rPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:rPr><w:color w:val="475569"/><w:sz w:val="26"/></w:rPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:rPr><w:b/><w:color w:val="0F172A"/><w:sz w:val="32"/></w:rPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:rPr><w:b/><w:color w:val="1E3A8A"/><w:sz w:val="26"/></w:rPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:pPr><w:ind w:left="360"/></w:pPr></w:style>' +
    '</w:styles>'

  const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
    '</Types>'

  const rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>'

  const docRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    '</Relationships>'

  return createZipBuffer([
    { name: '[Content_Types].xml', data: contentTypes },
    { name: '_rels/.rels', data: rootRels },
    { name: 'word/document.xml', data: documentXml },
    { name: 'word/styles.xml', data: stylesXml },
    { name: 'word/_rels/document.xml.rels', data: docRels },
  ])
}

/**
 * 导出高管散文体阅读备忘录（`.memo.md`，Amazon Narrative Memo 风格）。
 */
export function renderDeckMemoMarkdown(manifest, language) {
  const en = (language || manifest?.language || 'zh') === 'en'
  const slides = Array.isArray(manifest?.slides) ? manifest.slides : []
  const title = cleanText(manifest?.title || (en ? 'Executive Memo' : '高管阅读备忘录'))
  const cover = slides.find(s => s.layout === 'cover')
  const takeaways = slides.map(s => cleanText(s.takeaway)).filter(Boolean)

  const lines = [
    `# ${title} — ${en ? 'Executive Narrative Memo' : '高管会前阅读备忘录'}`,
    '',
    `> **${en ? 'Core Thesis' : '核心论点'}**：${cleanText(cover?.subtitle || takeaways[0] || title)}`,
    '',
    `## ${en ? '1. Executive Summary' : '一、核心结论摘要'}`,
    '',
    ...(takeaways.length > 0
      ? takeaways.slice(0, 6).map((tk, i) => `${i + 1}. ${tk}`)
      : slides.filter(s => !['cover', 'closing', 'section', 'agenda'].includes(s.layout)).slice(0, 6).map((s, i) => `${i + 1}. **${cleanText(s.title)}**`)),
    '',
    `## ${en ? '2. Detailed Argumentation' : '二、分章论证与关键事实'}`,
    '',
  ]

  let part = 0
  for (const s of slides) {
    if (['cover', 'agenda'].includes(s.layout)) continue
    part += 1
    lines.push(`### ${part}. ${cleanText(s.title)}`)
    const paraParts = []
    if (s.subtitle) paraParts.push(cleanText(s.subtitle))
    if (s.text) paraParts.push(cleanText(s.text))
    if (Array.isArray(s.bullets) && s.bullets.length) paraParts.push(s.bullets.map(cleanText).join(en ? ' ' : '；'))
    if (Array.isArray(s.items) && s.items.length) {
      paraParts.push(s.items.map(it => {
        const val = it.value !== undefined && it.value !== '' ? `（${cleanText(it.value)}${cleanText(it.unit || '')}${it.delta ? '，' + cleanText(it.delta) : ''}）` : ''
        return `${cleanText(it.title || it.tag || '')}${val}${it.text ? '：' + cleanText(it.text) : ''}`
      }).join(en ? '; ' : '；'))
    }
    if (paraParts.length) {
      lines.push('')
      lines.push(paraParts.join(en ? ' ' : '。') + (en ? '' : '。'))
    }
    if (s.takeaway) {
      lines.push('')
      lines.push(`**${en ? 'Implication' : '决策含义'}**：${cleanText(s.takeaway)}`)
    }
    if (s.source) lines.push(`_${en ? 'Source' : '依据'}：${cleanText(s.source)}_`)
    lines.push('')
  }

  const evSec = renderEvidenceHandoutSection(manifest, en ? 'en' : 'zh')
  if (evSec) lines.push(evSec)
  return lines.join('\n')
}

/**
 * 确定性会前高管质询与答辩预案（`.qa-prep.md`）。
 */
export function renderQaPrepMarkdown(manifest, language) {
  const en = (language || manifest?.language || 'zh') === 'en'
  const slides = Array.isArray(manifest?.slides) ? manifest.slides : []
  const ledger = Array.isArray(manifest?.evidence) ? manifest.evidence : []
  const pace = computePaceBudget(manifest)
  const title = cleanText(manifest?.title || (en ? 'Presentation' : '汇报材料'))

  const kpiClaims = []
  slides.forEach((s, idx) => {
    if (s.layout === 'kpi' && Array.isArray(s.items)) {
      for (const it of s.items.slice(0, 4)) {
        if (it.value) kpiClaims.push({ slide: idx + 1, label: cleanText(it.title || it.tag || ''), value: `${cleanText(it.value)}${cleanText(it.unit || '')}`, delta: cleanText(it.delta || ''), source: cleanText(s.source || '') })
      }
    }
  })

  const riskyEvidence = ledger.filter(e =>
    e.confidence === 'conflicting' ||
    e.confidence === 'estimated' ||
    e.confidence === 'unverified' ||
    e.claimType === 'forecast' ||
    e.tier === 3
  )

  const lines = [
    `# ${title} — ${en ? 'Executive Q&A & Tough-Question Prep Sheet' : '会前高管质询与答辩预案（Q&A Prep）'}`,
    '',
    `- **${en ? 'Total Slides & Pace' : '页数与演讲配速'}**：${slides.length} ${en ? 'slides' : '页'} · ${en ? 'Est.' : '预计'} ${pace.estimatedMinutes} ${en ? 'min' : '分钟'}`,
    `- **${en ? 'High-Scrutiny Evidence Items' : '高风险/待解释证据条目'}**：${riskyEvidence.length} ${en ? 'item(s)' : '项'}`,
    `- **${en ? 'Over-Budget Slides' : '节奏超预算预警页'}**：${pace.overBudgetSlides.length > 0 ? pace.overBudgetSlides.map(n => `P${n}`).join(', ') : (en ? 'None' : '无')}`,
    '',
    `## ${en ? '1. Data & Evidence Challenge Defense' : '一、数据口径与事实证据质询预案'}`,
    '',
  ]

  if (riskyEvidence.length > 0) {
    riskyEvidence.forEach((e, idx) => {
      const reason = e.confidence === 'conflicting'
        ? (en ? 'Conflicting agency estimates' : '不同权威机构口径存在分歧')
        : e.claimType === 'forecast'
          ? (en ? 'Forward-looking forecast assumption' : '属于前瞻预测值而非历史实绩')
          : e.tier === 3
            ? (en ? 'Tier 3 / secondary relay source' : '属于三级/媒体转引信源')
            : (en ? `Status: ${e.confidence}` : `核验状态：${e.confidence}`)
      lines.push(`### Q${idx + 1} [${e.id}] · ${reason}`)
      lines.push(`- **${en ? 'Likely Executive Pushback' : '高管可能追问'}**：${en ? `"How solid is '${cleanText(e.claim)}' from ${cleanText(e.source)}? What if downside materializes?"` : `“关于「${cleanText(e.claim)}」（出处：${cleanText(e.source)}），这个口径够扎实吗？如果按保守口径算结论还成立吗？”`}`)
      lines.push(`- **${en ? 'Recommended Defense' : '建议答复口径'}**：${en ? `State period/scope (${[e.date, e.scope].filter(Boolean).join(' · ') || 'specify scope'}). ${e.note || 'Frame as a bounded range and highlight downside resilience.'}` : `先明确时间与统计口径（${[e.date, e.scope].filter(Boolean).join(' · ') || '补充说明口径'}），${e.note || '用保守/中性/乐观三档区间回应，并强调在保守下限下核心决策依然成立。'}`}`)
      lines.push('')
    })
  } else {
    lines.push(en
      ? '- All indexed evidence items are verified (internal files or Tier 1/2 sources). Keep raw dates and scopes handy in speaker notes (`P` Presenter Console).'
      : '- 当前证据账本条目均已标为已核验（含内部原始文件或 T1/T2 权威外源）；答辩时可直接打开 HTML 按 `P` 键在提词台备查每页原文链接与年份口径。')
    lines.push('')
  }

  lines.push(`## ${en ? '2. Headline KPI & ROI Interrogation' : '二、核心 KPI 与投入产出（ROI）追问准备'}`)
  lines.push('')
  if (kpiClaims.length > 0) {
    kpiClaims.slice(0, 5).forEach((k) => {
      lines.push(`- **P${k.slide} · ${k.label} = ${k.value}${k.delta ? ` (${k.delta})` : ''}**：${en ? `Be ready to break down denominator, baseline period, and source (${k.source || 'internal ledger'}).` : `提前准备该指标的分母定义、对比基期与拆分结构（依据：${k.source || '见演讲备注'}）。`}`)
    })
  } else {
    lines.push(en
      ? '- Prepare 2–3 quantitative guardrails (investment cap, breakeven timeline, primary downside risk).'
      : '- 建议提前备好 3 组兜底数字：总投入预算上限、盈亏平衡/里程碑节点、最大下行风险的止损阈值。')
  }
  lines.push('')

  lines.push(`## ${en ? '3. Pacing & Delivery Risk Checks' : '三、演讲节奏与删减预案'}`)
  lines.push('')
  if (pace.overBudgetSlides.length > 0) {
    lines.push(en
      ? `- Slides **${pace.overBudgetSlides.map(n => `P${n}`).join(', ')}** exceed time budget. If cut short, speak only Action Title + Takeaway.`
      : `- 第 **${pace.overBudgetSlides.map(n => `P${n}`).join('、')}** 页信息密度偏高/超预算；若现场时间被压缩，直接口述该页顶部 Action Title 与底部 Takeaway，细节留给问答环节。`)
  } else {
    lines.push(en
      ? `- Pacing is balanced (~${pace.estimatedMinutes} min across ${slides.length} slides). Use \`ppt_edit({ remixPreset: "exec-5min" })\` for a 5-min executive flash brief.`
      : `- 全篇节奏均衡（共 ${slides.length} 页，预计 ${pace.estimatedMinutes} 分钟）；若临时被压缩成 5 分钟电梯汇报，可一键调用 \`ppt_edit({ remixPreset: "exec-5min" })\` 生成无损精简版。`)
  }
  lines.push('')

  return lines.join('\n')
}

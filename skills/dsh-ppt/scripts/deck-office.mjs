/**
 * deck-office.mjs —— 零新增依赖的 .xlsx / .csv / .tsv / .docx 直接吞吐解析器与数据视觉画像引擎。
 *
 * 能力边界：
 *   1. 使用 Node 内置 `node:zlib` (`inflateRawSync`) 实现轻量 ZIP 中央目录读取器，零新增第三方依赖。
 *   2. 解析 .xlsx（workbook.xml / sharedStrings.xml / styles.xml / sheet*.xml，支持共享字符串、内联串、数值与 Excel 日期序列号）
 *      及 .csv / .tsv（按需懒加载已有依赖 csv-parse/sync）。
 *   3. 确定性数据视觉画像（Data-to-Visual Profiler）：
 *      - [Source, Target, Amount] 3 列流向表 -> sankey 桑基图页
 *      - Task + Start/End 或 Q1..Q4 / 月份排期列 -> gantt 甘特图页
 *      - 市场规模权重 + 竞品份额 % 列 -> marimekko 市场地图页
 *      - 基线/上期 .. +/- 变动 .. 期末/合计 -> waterfall 瀑布桥页
 *      - 双数值列量纲比 > 10x -> combo 双轴复合图页
 *      - 通用数值表 -> chart-split（highlight: 'max' + 自动 Top/Min/Avg 洞察卡）+ table 明细附录页
 *   4. 解析 .docx Word 报告（document.xml / _rels / media/*）：提取标题、H1/H2 及中文编号标题、加粗导语、
 *      Word 表格（<w:tbl>）、PNG/JPEG/WebP 嵌入图片、Mermaid 流程图/时序图与 $...$ 公式，
 *      经智能导演 + smartLayout 生成 5–20 页高品味演示文稿。
 */

import { lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, extname, join, posix, resolve } from 'node:path'
import { inflateRawSync, inflateSync } from 'node:zlib'
import { promoteMarkdownSlides, inferThemeFromContent } from './deck-director.mjs'
import { buildHybridEnrichmentPlan, mergeHybridEvidence } from './deck-evidence.mjs'
import { loadWorkspaceBrandKit } from './deck-brand-kit.mjs'

const MAX_OFFICE_BYTES = 32 * 1024 * 1024
const MAX_ENTRY_BYTES = 32 * 1024 * 1024
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const require = createRequire(import.meta.url)

function fail(zh, en) {
  throw new Error('dsh-ppt：' + zh + (en ? ' / ' + en : ''))
}

function abort(signal) {
  signal?.throwIfAborted?.()
}

function decodeXml(str) {
  return String(str ?? '')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = Number.parseInt(hex, 16)
      return Number.isFinite(code) ? String.fromCodePoint(code) : ''
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number.parseInt(dec, 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : ''
    })
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function cleanLine(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function csvParser() {
  try {
    return require('csv-parse/sync')
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      fail('CSV/TSV 解析需安装技能目录依赖：npm install --ignore-scripts', 'CSV/TSV parsing requires skill dependencies: npm install --ignore-scripts')
    }
    throw error
  }
}

// ---------------------------------------------------------------------------
// Zero-dep ZIP Central Directory Reader (node:zlib inflateRawSync)
// ---------------------------------------------------------------------------

function openZipArchive(bytes) {
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)
  if (buf.length < 22 || buf[0] !== 0x50 || buf[1] !== 0x4b) {
    fail('无效的 Office 压缩包文件头（非标准 .xlsx / .docx ZIP）', 'Invalid Office ZIP archive header')
  }

  let eocdOffset = -1
  const minScan = Math.max(0, buf.length - 65557)
  for (let i = buf.length - 22; i >= minScan; i -= 1) {
    if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x05 && buf[i + 3] === 0x06) {
      eocdOffset = i
      break
    }
  }
  if (eocdOffset < 0) {
    fail('Office 文件 ZIP 中央目录缺失或已损坏', 'Missing ZIP End of Central Directory')
  }

  const totalEntries = buf.readUInt16LE(eocdOffset + 10)
  const cdSize = buf.readUInt32LE(eocdOffset + 12)
  const cdOffset = buf.readUInt32LE(eocdOffset + 16)
  if (cdOffset + cdSize > buf.length) {
    fail('Office 文件 ZIP 中央目录越界', 'ZIP Central Directory out of bounds')
  }

  const entries = new Map()
  const lowerMap = new Map()
  let pos = cdOffset
  for (let i = 0; i < totalEntries && pos + 46 <= buf.length; i += 1) {
    if (buf.readUInt32LE(pos) !== 0x02014b50) break
    const method = buf.readUInt16LE(pos + 10)
    const compSize = buf.readUInt32LE(pos + 20)
    const uncompSize = buf.readUInt32LE(pos + 24)
    const nameLen = buf.readUInt16LE(pos + 28)
    const extraLen = buf.readUInt16LE(pos + 30)
    const commentLen = buf.readUInt16LE(pos + 32)
    const localOffset = buf.readUInt32LE(pos + 42)
    const rawName = buf.toString('utf8', pos + 46, pos + 46 + nameLen)
    const normName = rawName.replace(/\\/g, '/').replace(/^\/+/, '')
    if (!normName.includes('..') && uncompSize <= MAX_ENTRY_BYTES) {
      const meta = { name: normName, method, compSize, uncompSize, localOffset }
      entries.set(normName, meta)
      lowerMap.set(normName.toLowerCase(), meta)
    }
    pos += 46 + nameLen + extraLen + commentLen
  }

  const getMeta = (name) => {
    const clean = String(name ?? '').replace(/\\/g, '/').replace(/^\/+/, '')
    return entries.get(clean) || lowerMap.get(clean.toLowerCase()) || null
  }

  const readBuffer = (name) => {
    const meta = getMeta(name)
    if (!meta) return null
    const lh = meta.localOffset
    if (lh + 30 > buf.length || buf.readUInt32LE(lh) !== 0x04034b50) {
      fail('Office ZIP 本地文件头损坏：' + meta.name, 'Corrupt ZIP local header: ' + meta.name)
    }
    const lfnLen = buf.readUInt16LE(lh + 26)
    const lexLen = buf.readUInt16LE(lh + 28)
    const dataStart = lh + 30 + lfnLen + lexLen
    const dataEnd = dataStart + meta.compSize
    if (dataEnd > buf.length) {
      fail('Office ZIP 条目数据截断：' + meta.name, 'Truncated ZIP entry: ' + meta.name)
    }
    const slice = buf.subarray(dataStart, dataEnd)
    if (meta.method === 0) return Buffer.from(slice)
    if (meta.method === 8) {
      try {
        return inflateRawSync(slice, { maxOutputLength: MAX_ENTRY_BYTES })
      } catch (err) {
        fail('Office ZIP 解压失败（' + meta.name + '）：' + err.message)
      }
    }
    fail('不支持的 Office ZIP 压缩方式：' + meta.method)
  }

  const readText = (name) => {
    const b = readBuffer(name)
    return b ? b.toString('utf8') : ''
  }

  return {
    has: (name) => Boolean(getMeta(name)),
    list: (prefix = '') => {
      const p = String(prefix).replace(/^\/+/, '').toLowerCase()
      return [...entries.keys()].filter(k => !p || k.toLowerCase().startsWith(p))
    },
    readBuffer,
    readText,
  }
}

function readOfficeInput(options = {}) {
  let bytes
  let sourceName = cleanLine(options.fileName || '')
  let resolvedPath = ''

  if (options.bytes !== undefined && options.bytes !== null) {
    if (typeof options.bytes === 'string') {
      const stripped = options.bytes.replace(/^data:[^;]+;base64,/, '').trim()
      bytes = Buffer.from(stripped, 'base64')
    } else if (Buffer.isBuffer(options.bytes) || options.bytes instanceof Uint8Array) {
      bytes = Buffer.from(options.bytes)
    } else {
      fail('bytes 必须为 Buffer、Uint8Array 或 Base64 字符串')
    }
    if (!sourceName) sourceName = options.format ? `upload.${options.format}` : 'upload.xlsx'
  } else {
    const rawPath = String(options.filePath ?? options.path ?? '').trim()
    if (!rawPath) fail('请提供有效的 .xlsx / .csv / .tsv / .docx 文件路径', 'Provide a valid .xlsx / .csv / .tsv / .docx filePath')
    resolvedPath = resolve(String(options.cwd ?? '.'), rawPath)
    let stat
    try {
      stat = lstatSync(resolvedPath)
    } catch {
      fail('找不到 Office 文件：' + resolvedPath, 'Office file not found: ' + resolvedPath)
    }
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_OFFICE_BYTES) {
      fail('Office 文件需为 32 MiB 内的普通文件：' + resolvedPath)
    }
    bytes = readFileSync(resolvedPath)
    if (!sourceName) sourceName = basename(resolvedPath)
  }

  if (bytes.length === 0 || bytes.length > MAX_OFFICE_BYTES) {
    fail('Office 文件为空或超过 32 MiB 限制')
  }

  const rawExt = (
    options.format ||
    extname(sourceName).slice(1) ||
    extname(resolvedPath).slice(1)
  ).toLowerCase().trim()
  if (!['xlsx', 'csv', 'tsv', 'docx', 'pdf'].includes(rawExt)) {
    fail('仅支持导入 .xlsx、.csv、.tsv、.docx 或 .pdf 文件，当前格式：' + (rawExt || '未知'))
  }

  return {
    bytes,
    format: rawExt,
    fileName: (extname(sourceName) ? sourceName : basename(resolvedPath)) || `office.${rawExt}`,
    resolvedPath: resolvedPath || sourceName,
  }
}

// ---------------------------------------------------------------------------
// .xlsx Workbook Parser
// ---------------------------------------------------------------------------

function parseRelationshipsMap(relsXml) {
  const map = new Map()
  if (!relsXml) return map
  for (const m of relsXml.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const attrs = m[1]
    const id = /\bId=["']([^"']+)["']/.exec(attrs)?.[1]
    const target = /\bTarget=["']([^"']+)["']/.exec(attrs)?.[1]
    const mode = /\bTargetMode=["']([^"']+)["']/.exec(attrs)?.[1] || ''
    if (id && target && mode.toLowerCase() !== 'external') {
      map.set(id, target)
    }
  }
  return map
}

function resolveZipTarget(basePart, target) {
  const clean = String(target ?? '').replace(/\\/g, '/').trim()
  if (!clean) return ''
  if (clean.startsWith('/')) return clean.replace(/^\/+/, '')
  const dir = posix.dirname(basePart)
  return posix.normalize(dir === '.' ? clean : posix.join(dir, clean)).replace(/^\/+/, '')
}

function colRefToIndex(ref) {
  const letters = /^([A-Za-z]+)/.exec(String(ref ?? ''))?.[1]
  if (!letters) return -1
  let idx = 0
  for (const ch of letters.toUpperCase()) {
    idx = idx * 26 + (ch.charCodeAt(0) - 64)
  }
  return idx - 1
}

function parseSharedStrings(xml) {
  if (!xml) return []
  const out = []
  for (const siMatch of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    const inner = siMatch[1].replace(/<rPh\b[^>]*>[\s\S]*?<\/rPh>/g, '')
    const parts = []
    for (const tMatch of inner.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)) {
      parts.push(decodeXml(tMatch[1]))
    }
    out.push(parts.join(''))
  }
  return out
}

const BUILTIN_DATE_FMT_IDS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47])

function isDateFormatCode(code) {
  if (!code) return false
  const stripped = String(code).replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, '')
  if (/[%#0?]/.test(stripped) && !/[ymd]/i.test(stripped)) return false
  return /[ymdh]/i.test(stripped) && /[ymd]/i.test(stripped)
}

function parseDateStyleSet(stylesXml) {
  const dateStyles = new Set()
  if (!stylesXml) return dateStyles
  const customDateFmts = new Set()
  for (const m of stylesXml.matchAll(/<numFmt\b([^>]*)\/?>/g)) {
    const attrs = m[1]
    const id = Number(/\bnumFmtId=["'](\d+)["']/.exec(attrs)?.[1])
    const code = /\bformatCode=["']([^"']*)["']/.exec(attrs)?.[1] || ''
    if (Number.isFinite(id) && isDateFormatCode(decodeXml(code))) {
      customDateFmts.add(id)
    }
  }
  const cellXfsBlock = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(stylesXml)?.[1] || ''
  let xfIndex = 0
  for (const m of cellXfsBlock.matchAll(/<xf\b([^>]*)(?:\/>|>[\s\S]*?<\/xf>)/g)) {
    const numFmtId = Number(/\bnumFmtId=["'](\d+)["']/.exec(m[1])?.[1])
    const applyNumFmt = /\bapplyNumberFormat=["']([^"']+)["']/.exec(m[1])?.[1]
    if ((applyNumFmt !== '0') && (BUILTIN_DATE_FMT_IDS.has(numFmtId) || customDateFmts.has(numFmtId))) {
      dateStyles.add(xfIndex)
    }
    xfIndex += 1
  }
  return dateStyles
}

function excelSerialToIsoDate(serial) {
  if (!Number.isFinite(serial) || serial < 1 || serial > 2958465) return null
  const wholeDays = Math.floor(serial)
  // Excel 1900 leap-year bug adjustment: serial >= 60 is shifted by 1 day after Feb 28 1900
  const adjusted = wholeDays > 59 ? wholeDays - 1 : wholeDays
  const epochMs = Date.UTC(1899, 11, 31) + adjusted * 86400000
  const d = new Date(epochMs)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseWorksheetRows(sheetXml, sharedStrings, dateStyles) {
  const rowList = []
  let maxCols = 0

  for (const rowMatch of sheetXml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const rowInner = rowMatch[1]
    const cells = []
    let seqCol = 0

    for (const cMatch of rowInner.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cMatch[1]
      const body = cMatch[2] || ''
      const ref = /\br=["']([^"']+)["']/.exec(attrs)?.[1]
      const colIdx = ref ? colRefToIndex(ref) : seqCol
      const targetCol = colIdx >= 0 ? colIdx : seqCol
      seqCol = targetCol + 1

      const type = /\bt=["']([^"']+)["']/.exec(attrs)?.[1] || 'n'
      const styleIdx = Number(/\bs=["'](\d+)["']/.exec(attrs)?.[1] ?? -1)
      let value = ''

      if (type === 'inlineStr') {
        const isBlock = /<is\b[^>]*>([\s\S]*?)<\/is>/.exec(body)?.[1] || body
        const parts = []
        for (const tm of isBlock.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)) {
          parts.push(decodeXml(tm[1]))
        }
        value = parts.join('')
      } else {
        const vRaw = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(body)?.[1]
        if (vRaw !== undefined) {
          const decoded = decodeXml(vRaw).trim()
          if (type === 's') {
            const idx = Number.parseInt(decoded, 10)
            value = Number.isInteger(idx) && sharedStrings[idx] !== undefined ? sharedStrings[idx] : ''
          } else if (type === 'b') {
            value = decoded === '1' || decoded.toLowerCase() === 'true' ? 'TRUE' : 'FALSE'
          } else if (type === 'str' || type === 'e') {
            value = decoded
          } else {
            const num = Number(decoded)
            if (Number.isFinite(num) && dateStyles.has(styleIdx)) {
              value = excelSerialToIsoDate(num) || decoded
            } else {
              value = decoded
            }
          }
        }
      }

      const clean = cleanLine(value)
      while (cells.length <= targetCol) cells.push('')
      cells[targetCol] = clean
    }

    if (cells.some(c => c !== '')) {
      maxCols = Math.max(maxCols, cells.length)
      rowList.push(cells)
    }
  }

  if (rowList.length === 0 || maxCols === 0) return []
  return rowList.map(r => {
    const out = r.slice(0, maxCols)
    while (out.length < maxCols) out.push('')
    return out
  })
}

function parseXlsxArchive(bytes) {
  const zip = openZipArchive(bytes)
  const workbookXml = zip.readText('xl/workbook.xml')
  const relsMap = parseRelationshipsMap(zip.readText('xl/_rels/workbook.xml.rels'))
  const sharedStrings = parseSharedStrings(zip.readText('xl/sharedStrings.xml'))
  const dateStyles = parseDateStyleSet(zip.readText('xl/styles.xml'))

  const sheetSpecs = []
  if (workbookXml) {
    for (const m of workbookXml.matchAll(/<sheet\b([^>]*)\/?>/g)) {
      const attrs = m[1]
      const name = decodeXml(/\bname=["']([^"']+)["']/.exec(attrs)?.[1] || '')
      const rid = /\b(?:r:)?id=["']([^"']+)["']/.exec(attrs)?.[1] || ''
      const state = /\bstate=["']([^"']+)["']/.exec(attrs)?.[1] || ''
      if (state === 'hidden' || state === 'veryHidden') continue
      const target = relsMap.get(rid)
      const partPath = target ? resolveZipTarget('xl/workbook.xml', target) : ''
      if (partPath && zip.has(partPath)) {
        sheetSpecs.push({ name: name || `Sheet ${sheetSpecs.length + 1}`, path: partPath })
      }
    }
  }

  if (sheetSpecs.length === 0) {
    const fallbackPaths = zip.list('xl/worksheets/sheet')
      .filter(p => /\.xml$/i.test(p))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    fallbackPaths.forEach((p, idx) => sheetSpecs.push({ name: `Sheet ${idx + 1}`, path: p }))
  }

  if (sheetSpecs.length === 0) {
    fail('Excel 工作簿中未找到有效工作表', 'No valid worksheets found in .xlsx workbook')
  }

  const sheets = []
  for (const spec of sheetSpecs) {
    const xml = zip.readText(spec.path)
    let rows = parseWorksheetRows(xml, sharedStrings, dateStyles)
    let bannerTitle = ''
    if (rows.length >= 3) {
      const nonEmpty0 = rows[0].filter(Boolean)
      const nonEmpty1 = rows[1].filter(Boolean)
      if (nonEmpty0.length === 1 && nonEmpty1.length >= 2) {
        bannerTitle = nonEmpty0[0]
        rows = rows.slice(1)
      }
    }
    if (rows.length >= 2) {
      sheets.push({ name: spec.name, bannerTitle, rows })
    }
  }

  if (sheets.length === 0) {
    fail('Excel 工作簿中没有包含有效数据的表格工作表', 'No populated tables found in .xlsx workbook')
  }

  return { sheets }
}

// ---------------------------------------------------------------------------
// .csv / .tsv Parser & Tabular Data-to-Visual Profiler
// ---------------------------------------------------------------------------

function parseDelimitedText(bytes, format) {
  const text = bytes.toString('utf8')
  const parsed = csvParser().parse(text, {
    bom: true,
    delimiter: format === 'tsv' ? '\t' : ',',
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
    max_record_size: 200000,
  })
  const rows = parsed
    .map(r => (Array.isArray(r) ? r.map(c => cleanLine(c)) : [cleanLine(r)]))
    .filter(r => r.some(Boolean))
  if (rows.length < 2) {
    fail('CSV/TSV 文件至少需要包含表头与一行数据', 'CSV/TSV requires at least a header row and one data row')
  }
  const maxCols = Math.max(...rows.map(r => r.length))
  const rect = rows.map(r => {
    const copy = r.slice(0, maxCols)
    while (copy.length < maxCols) copy.push('')
    return copy
  })
  return rect
}

function parseCellNumber(raw) {
  const s = cleanLine(raw)
  if (!s) return { ok: false, num: NaN, isPercent: false, unit: '', raw: '' }
  const isPercent = /[%％]$/.test(s)
  const currency = /^[¥$€£]/.exec(s)?.[0] || ''
  const unitMatch = /([万亿千百kKmMbB]+|亿元|亿美元|万元|美元|元|人|次|家|个|件|ms|s|天|小时)$/.exec(s)
  let unit = isPercent ? '%' : (unitMatch?.[1] || currency)
  const cleaned = s
    .replace(/^[¥$€£]\s*/, '')
    .replace(/[%％]$/, '')
    .replace(/(?:亿元|亿美元|万元|美元|元|[万亿千百kKmMbB]|人|次|家|个|件|ms|s|天|小时)$/i, '')
    .replace(/,/g, '')
    .trim()
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(cleaned)) {
    return { ok: false, num: NaN, isPercent: false, unit: '', raw: s }
  }
  const num = Number(cleaned)
  if (!Number.isFinite(num)) return { ok: false, num: NaN, isPercent: false, unit: '', raw: s }
  return { ok: true, num, isPercent, unit, raw: s }
}

function formatNumCompact(num, unit = '') {
  if (!Number.isFinite(num)) return String(num)
  const abs = Math.abs(num)
  let str
  if (abs >= 1000) str = Math.round(num).toLocaleString('en-US')
  else if (Number.isInteger(num)) str = String(num)
  else str = Number(num.toFixed(2)).toString()
  if (unit === '%' && !str.endsWith('%')) return str + '%'
  if (['¥', '$', '€', '£'].includes(unit)) return unit + str
  return unit ? `${str}${unit}` : str
}

function profileColumns(rows) {
  const headers = rows[0]
  const data = rows.slice(1)
  return headers.map((header, colIdx) => {
    const vals = data.map(r => r[colIdx] ?? '')
    const nonEmpty = vals.filter(v => v !== '')
    const parsed = vals.map(parseCellNumber)
    const numericHits = parsed.filter(p => p.ok)
    const isNumeric = nonEmpty.length > 0 && (numericHits.length / nonEmpty.length) >= 0.65
    const pctHits = numericHits.filter(p => p.isPercent).length
    const unit = numericHits.find(p => p.unit)?.unit || ''
    return {
      index: colIdx,
      header: header || `Col ${colIdx + 1}`,
      values: vals,
      parsed,
      isNumeric,
      isPercentCol: isNumeric && pctHits >= Math.max(1, numericHits.length * 0.6),
      unit,
    }
  })
}

function isSankeySheet(headers, dataRows, cols) {
  if (cols.length < 3 || cols.length > 5 || dataRows.length < 2) return false
  if (cols[0].isNumeric || cols[1].isNumeric || !cols[2].isNumeric) return false
  const posCount = cols[2].parsed.filter(p => p.ok && p.num > 0).length
  if (posCount < Math.max(2, dataRows.length * 0.7)) return false
  const h0 = headers[0] || ''
  const h1 = headers[1] || ''
  const explicitFlowHeaders = /(?:source|from|origin|来源|起点|上游|流出方|一级)/i.test(h0) &&
    /(?:target|to|dest|destination|去向|终点|下游|流入方|二级)/i.test(h1)
  if (explicitFlowHeaders) return true
  const srcSet = new Set(cols[0].values.filter(Boolean))
  const dstSet = new Set(cols[1].values.filter(Boolean))
  const hasChaining = [...srcSet].some(s => dstSet.has(s))
  const hasFanOut = srcSet.size < dataRows.length
  return hasChaining || (hasFanOut && cols.length === 3)
}

const PERIOD_HEADER_RE = /^(?:Q[1-4](?:\s*\d{2,4})?|\d{2,4}Q[1-4]|M\d{1,2}|W\d{1,2}|[1-9]|1[0-2]月|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4}[-/]\d{1,2})$/i
const GANTT_ACTIVE_RE = /^(?:1|x|✓|✔|●|true|yes|active|done|wip|进行中|已完成|计划)$/i

function parseQuarterOrMonthIndex(val, colCount) {
  const s = cleanLine(val)
  const qm = /Q([1-4])/i.exec(s)
  if (qm) return Number(qm[1]) - 1
  const mm = /(?:^M|^第?)(\d{1,2})/i.exec(s)
  if (mm) return Math.max(0, Math.min(colCount - 1, Number(mm[1]) - 1))
  const n = Number(s)
  if (Number.isFinite(n)) return Math.max(0, Math.min(colCount - 1, Math.round(n) - (n >= 1 ? 1 : 0)))
  return 0
}

function tryBuildGanttSlide(sheetName, headers, dataRows, cols, en) {
  if (dataRows.length < 2) return null
  const taskColIdx = Math.max(0, cols.findIndex(c => !c.isNumeric))

  // Pattern A: Task + Start + End columns
  const startIdx = headers.findIndex(h => /^(?:start|begin|from|开始|起始|启动)/i.test(h))
  const endIdx = headers.findIndex(h => /^(?:end|finish|to|duration|span|结束|截止|周期|耗时|跨度|时长|工期)/i.test(h))
  if (startIdx >= 0 && endIdx >= 0 && startIdx !== endIdx) {
    const rawStarts = dataRows.map(r => r[startIdx])
    const rawEnds = dataRows.map(r => r[endIdx])
    const hasQuarters = [...rawStarts, ...rawEnds].some(v => /Q[1-4]/i.test(v)) || /季度|quarter/i.test(headers[startIdx] + ' ' + headers[endIdx])
    const columns = hasQuarters ? ['Q1', 'Q2', 'Q3', 'Q4'] : ['M1', 'M2', 'M3', 'M4', 'M5', 'M6']
    const items = dataRows.slice(0, 7).map((r, idx) => {
      const title = r[taskColIdx] || `Task ${idx + 1}`
      const rawStartNum = Number(parseCellNumber(r[startIdx]).num)
      const isZeroBasedQuarter = hasQuarters && !/Q[1-4]/i.test(r[startIdx]) && Number.isFinite(rawStartNum) && rawStartNum >= 0 && rawStartNum < columns.length && rawStarts.some(v => Number(parseCellNumber(v).num) === 0)
      const st = isZeroBasedQuarter
        ? Math.max(0, Math.min(columns.length - 1, Math.floor(rawStartNum)))
        : parseQuarterOrMonthIndex(r[startIdx], columns.length)
      const enRaw = cleanLine(r[endIdx])
      const isDuration = /duration|span|耗时|周期|跨度|时长|工期/i.test(headers[endIdx])
      const span = isDuration
        ? Math.max(1, Math.min(columns.length - st, Math.round(Number(parseCellNumber(enRaw).num) || 1)))
        : Math.max(1, Math.min(columns.length - st, parseQuarterOrMonthIndex(enRaw, columns.length) - st + 1))
      const isMilestone = /里程碑|milestone|上线|发布|launch/i.test(title)
      return {
        tag: `T${idx + 1}`,
        title,
        text: isDuration ? `${columns[st]}–${columns[Math.min(columns.length - 1, st + span - 1)]}` : `${r[startIdx]} → ${r[endIdx]}`,
        start: st,
        span: isMilestone && span <= 1 ? 0 : span,
        ...(isMilestone ? { milestone: true, status: 'warning' } : (idx === 0 ? { status: 'accent' } : {})),
      }
    })
    return {
      layout: 'gantt',
      variant: hasQuarters ? 'quarters' : 'months',
      kicker: sheetName,
      title: en
        ? `${sheetName}: ${items.length}-workstream execution roadmap spans ${columns[0]}–${columns[columns.length - 1]}`
        : `${sheetName}：${items.length} 项核心任务覆盖 ${columns[0]}–${columns[columns.length - 1]} 交付节奏`,
      columns,
      items,
      takeaway: en
        ? `Roadmap coordinates ${items.length} parallel tasks across ${columns.length} phases.`
        : `全周期统筹推进 ${items.length} 项关键任务，明确阶段里程碑与交付窗口。`,
      source: en ? `Source: Sheet "${sheetName}"` : `数据来源：工作表「${sheetName}」`,
    }
  }

  // Pattern B: Task + Period columns (Q1..Q4 / M1..M6 / Months)
  const periodCols = cols.filter((c, i) => i !== taskColIdx && PERIOD_HEADER_RE.test(c.header))
  if (periodCols.length >= 3) {
    const usedPeriods = periodCols.slice(0, 8)
    const columns = usedPeriods.map(c => c.header)
    const activeHits = dataRows.reduce((cnt, r) => cnt + usedPeriods.filter(pc => GANTT_ACTIVE_RE.test(cleanLine(r[pc.index]))).length, 0)
    if (activeHits >= dataRows.length) {
      const items = dataRows.slice(0, 7).map((r, idx) => {
        const flags = usedPeriods.map(pc => GANTT_ACTIVE_RE.test(cleanLine(r[pc.index])))
        const first = flags.indexOf(true)
        const last = flags.lastIndexOf(true)
        const start = first >= 0 ? first : idx % columns.length
        const span = first >= 0 ? Math.max(1, last - first + 1) : 1
        const title = r[taskColIdx] || `Task ${idx + 1}`
        return {
          tag: `T${idx + 1}`,
          title,
          text: `${columns[start]}–${columns[Math.min(columns.length - 1, start + span - 1)]}`,
          start,
          span,
          ...(idx === 0 ? { status: 'accent' } : {}),
        }
      })
      const variant = columns.every(c => /^Q[1-4]/i.test(c)) ? 'quarters' : columns.every(c => /^W\d/i.test(c)) ? 'weeks' : 'months'
      return {
        layout: 'gantt',
        variant,
        kicker: sheetName,
        title: en
          ? `${sheetName}: Schedule spans ${columns[0]} through ${columns[columns.length - 1]} across ${items.length} tasks`
          : `${sheetName}：${items.length} 项任务排期横跨 ${columns[0]} 至 ${columns[columns.length - 1]}`,
        columns,
        items,
        source: en ? `Source: Sheet "${sheetName}"` : `数据来源：工作表「${sheetName}」`,
      }
    }
  }

  return null
}

function tryBuildMarimekkoSlide(sheetName, headers, dataRows, cols, en) {
  if (cols.length < 3 || dataRows.length < 2) return null

  // Pattern A: Long format -> [Segment, Size/Weight, Share1%, Share2%, ...]
  const sizeCol = cols[1]
  const shareCols = cols.slice(2).filter(c => c.isNumeric)
  const shareLooksPct = shareCols.length >= 2 && shareCols.some(c => c.isPercentCol || /份额|占比|share|pct|%/i.test(c.header))
  const sizeHeaderMatch = /规模|容量|体量|权重|总额|size|weight|tam|market|volume/i.test(sizeCol.header)
  if (!cols[0].isNumeric && sizeCol.isNumeric && !sizeCol.isPercentCol && (shareLooksPct || sizeHeaderMatch)) {
    const segRows = dataRows.slice(0, 6)
    const headerOut = [headers[0] || 'Segment', ...segRows.map((r, idx) => {
      const segName = r[0] || `Seg ${idx + 1}`
      const sz = r[1] || ''
      return `${segName} (${sz})`
    })]
    const competitorRows = shareCols.slice(0, 6).map(sc => [
      sc.header.replace(/[%％()（）]/g, '').trim() || sc.header,
      ...segRows.map(r => {
        const p = sc.parsed[dataRows.indexOf(r)]
        if (!p?.ok) return '0%'
        const val = p.isPercent ? p.num : (p.num <= 1 ? p.num * 100 : p.num)
        return `${Number(val.toFixed(1))}%`
      }),
    ])
    const totalSize = segRows.reduce((sum, r) => sum + (parseCellNumber(r[1]).num || 0), 0)
    const topSeg = segRows.reduce((best, r) => (parseCellNumber(r[1]).num > parseCellNumber(best[1]).num ? r : best), segRows[0])
    return {
      layout: 'marimekko',
      kicker: sheetName,
      title: en
        ? `${sheetName}: ${topSeg[0]} leads ${formatNumCompact(totalSize, sizeCol.unit)} addressable landscape`
        : `${sheetName}：${topSeg[0]} 领跑 ${formatNumCompact(totalSize, sizeCol.unit)} 细分市场格局`,
      rows: [headerOut, ...competitorRows],
      takeaway: en
        ? `Largest segment is ${topSeg[0]} (${topSeg[1]}); ${competitorRows.length} competitors mapped across ${segRows.length} segments.`
        : `最大细分赛道为「${topSeg[0]}」（${topSeg[1]}），覆盖 ${competitorRows.length} 家竞争方份额分布。`,
      source: en ? `Source: Sheet "${sheetName}"` : `数据来源：工作表「${sheetName}」`,
    }
  }

  // Pattern B: Wide Marimekko -> headers carry weights or row 1 is Weight/Size + % rows
  const pctRowCount = dataRows.filter(r => r.slice(1).some(c => /[%％]/.test(c))).length
  const hasWeightHeader = headers.slice(1).some(h => /\(\s*\d/.test(h) || /（\s*\d/.test(h))
  const hasWeightRow = dataRows.length >= 2 && /规模|容量|体量|权重|size|weight|tam/i.test(dataRows[0][0] || '')
  if (pctRowCount >= 2 && (hasWeightHeader || hasWeightRow)) {
    return {
      layout: 'marimekko',
      kicker: sheetName,
      title: en ? `${sheetName}: Segment sizing & competitive share Marimekko` : `${sheetName}：细分市场规模与份额 Marimekko 格局`,
      rows: [headers, ...dataRows].slice(0, 8),
      source: en ? `Source: Sheet "${sheetName}"` : `数据来源：工作表「${sheetName}」`,
    }
  }

  return null
}

function tryBuildWaterfallSlide(sheetName, headers, dataRows, cols, en) {
  if (cols.length < 2 || cols.length > 3 || dataRows.length < 3 || dataRows.length > 12) return null
  if (cols[0].isNumeric || !cols[1].isNumeric) return null
  const cats = dataRows.map(r => r[0] || '')
  const nums = cols[1].parsed.map(p => (p.ok ? p.num : 0))
  const firstLabel = cats[0] || ''
  const lastLabel = cats[cats.length - 1] || ''
  const hasBridgeEnds = /(?:基线|期初|上期|起始|初始|base|start|begin|opening|q[1-4]\s*base)/i.test(firstLabel) ||
    /(?:期末|合计|总计|净额|最终|end|total|final|net|closing)/i.test(lastLabel)
  const hasMixedSigns = nums.slice(1, -1).some(v => v < 0) && nums.slice(1, -1).some(v => v > 0)
  if (!hasBridgeEnds && !hasMixedSigns) return null

  const totalIndices = [0]
  if (/(?:期末|合计|总计|净额|最终|end|total|final|net|closing)/i.test(lastLabel)) {
    totalIndices.push(cats.length - 1)
  }
  const unit = cols[1].unit
  const startVal = nums[0]
  const endVal = totalIndices.includes(cats.length - 1) ? nums[nums.length - 1] : nums.reduce((a, b) => a + b, 0)
  const midSteps = cats.slice(1, totalIndices.includes(cats.length - 1) ? -1 : undefined).map((c, idx) => ({ name: c, val: nums[idx + 1] }))
  const topDriver = midSteps.reduce((b, cur) => (cur.val > b.val ? cur : b), midSteps[0] || { name: '-', val: 0 })
  const topDrag = midSteps.reduce((b, cur) => (cur.val < b.val ? cur : b), midSteps[0] || { name: '-', val: 0 })

  return {
    layout: 'chart-split',
    variant: 'chart-left',
    kicker: sheetName,
    title: en
      ? `${sheetName}: Net bridge moves from ${formatNumCompact(startVal, unit)} to ${formatNumCompact(endVal, unit)}`
      : `${sheetName}：核心指标由 ${formatNumCompact(startVal, unit)} 桥接至 ${formatNumCompact(endVal, unit)}`,
    chart: {
      kind: 'waterfall',
      categories: cats,
      series: [{ name: headers[1] || 'Bridge', values: nums }],
      totalIndices,
      unit,
      showValues: true,
    },
    items: [
      { tag: en ? 'TOP DRIVER' : '最大正向拉动', title: topDriver.name, text: `${topDriver.val >= 0 ? '+' : ''}${formatNumCompact(topDriver.val, unit)}` },
      ...(topDrag.val < 0 ? [{ tag: en ? 'TOP DRAG' : '主要负向拖累', title: topDrag.name, text: formatNumCompact(topDrag.val, unit) }] : []),
      { tag: en ? 'NET CHANGE' : '净变动幅度', title: `${endVal >= startVal ? '+' : ''}${formatNumCompact(endVal - startVal, unit)}`, text: startVal !== 0 ? `${(((endVal - startVal) / Math.abs(startVal)) * 100).toFixed(1)}%` : '' },
    ],
    takeaway: en
      ? `Primary upside comes from ${topDriver.name} (${topDriver.val >= 0 ? '+' : ''}${formatNumCompact(topDriver.val, unit)}).`
      : `核心增量来自「${topDriver.name}」（${topDriver.val >= 0 ? '+' : ''}${formatNumCompact(topDriver.val, unit)}）。`,
    source: en ? `Source: Sheet "${sheetName}"` : `数据来源：工作表「${sheetName}」`,
  }
}

function buildNumericSheetSlides(sheet, en) {
  const { name: sheetName, bannerTitle, rows } = sheet
  const headers = rows[0]
  const dataRows = rows.slice(1)
  const cols = profileColumns(rows)
  const out = []

  // 1) Sankey
  if (isSankeySheet(headers, dataRows, cols)) {
    const unit = cols[2].unit
    const items = dataRows.slice(0, 12).map((r, idx) => {
      const p = cols[2].parsed[idx]
      const valStr = p.ok ? formatNumCompact(p.num, p.unit || unit) : cleanLine(r[2])
      return {
        tag: r[0],
        title: r[1],
        value: valStr,
        ...(r[3] ? { delta: r[3] } : {}),
      }
    })
    const targetNames = new Set(dataRows.map(r => cleanLine(r[1])).filter(Boolean))
    const rootOutSum = dataRows.reduce((s, r, idx) => {
      const src = cleanLine(r[0])
      const p = cols[2].parsed[idx]
      return (!targetNames.has(src) && p?.ok) ? s + p.num : s
    }, 0)
    const allOutSum = cols[2].parsed.reduce((s, p) => s + (p.ok ? p.num : 0), 0)
    const totalFlow = rootOutSum > 0 ? rootOutSum : allOutSum
    const maxRowIdx = cols[2].parsed.reduce((bi, p, idx, arr) => (p.ok && p.num > (arr[bi]?.num ?? -Infinity) ? idx : bi), 0)
    const maxRow = dataRows[maxRowIdx] || dataRows[0]
    out.push({
      layout: 'sankey',
      kicker: sheetName,
      title: en
        ? `${sheetName}: ${maxRow[0]} → ${maxRow[1]} leads ${formatNumCompact(totalFlow, unit)} total flow`
        : `${sheetName}：「${maxRow[0]} → ${maxRow[1]}」主导 ${formatNumCompact(totalFlow, unit)} 核心流向`,
      items,
      takeaway: en
        ? `Top flow path is ${maxRow[0]} → ${maxRow[1]} (${maxRow[2]}).`
        : `最大流量路径为「${maxRow[0]} → ${maxRow[1]}」（${maxRow[2]}）。`,
      source: en ? `Source: Sheet "${sheetName}"` : `数据来源：工作表「${sheetName}」`,
    })
    return { slides: out, kpiSummary: { label: sheetName, value: formatNumCompact(totalFlow, unit), note: `${maxRow[0]} → ${maxRow[1]}` } }
  }

  // 2) Gantt
  const ganttSlide = tryBuildGanttSlide(sheetName, headers, dataRows, cols, en)
  if (ganttSlide) {
    out.push(ganttSlide)
    return { slides: out, kpiSummary: { label: sheetName, value: String(ganttSlide.items.length), unit: en ? 'tasks' : '项任务', note: ganttSlide.columns.join('·') } }
  }

  // 3) Marimekko
  const mekkoSlide = tryBuildMarimekkoSlide(sheetName, headers, dataRows, cols, en)
  if (mekkoSlide) {
    out.push(mekkoSlide)
    return { slides: out, kpiSummary: null }
  }

  // 4) Waterfall
  const waterfallSlide = tryBuildWaterfallSlide(sheetName, headers, dataRows, cols, en)
  if (waterfallSlide) {
    out.push(waterfallSlide)
    const lastVal = cols[1].parsed[cols[1].parsed.length - 1]?.num ?? 0
    return { slides: out, kpiSummary: { label: sheetName, value: formatNumCompact(lastVal, cols[1].unit), note: waterfallSlide.takeaway } }
  }

  // 5) Numeric chart-split (Combo >10x scale ratio OR general column/bar/line) + Table appendix
  const catCol = cols.find(c => !c.isNumeric) || cols[0]
  const numCols = cols.filter(c => c.isNumeric && c.index !== catCol.index)

  if (numCols.length >= 1) {
    const chartRows = dataRows.slice(0, 12)
    const categories = chartRows.map((r, idx) => r[catCol.index] || `#${idx + 1}`)
    const primary = numCols[0]
    const primaryVals = chartRows.map((_, idx) => (primary.parsed[idx]?.ok ? primary.parsed[idx].num : 0))

    // Check 2+ numeric series with >10x scale ratio -> Combo dual-axis chart-split
    let chartSpec
    let kpiDelta = ''
    if (numCols.length >= 2) {
      const s0 = numCols[0]
      const s1 = numCols[1]
      const v0 = chartRows.map((_, idx) => (s0.parsed[idx]?.ok ? s0.parsed[idx].num : 0))
      const v1 = chartRows.map((_, idx) => (s1.parsed[idx]?.ok ? s1.parsed[idx].num : 0))
      const max0 = Math.max(1e-9, ...v0.map(Math.abs))
      const max1 = Math.max(1e-9, ...v1.map(Math.abs))
      const ratio = Math.max(max0 / max1, max1 / max0)
      if (ratio > 10 || s0.isPercentCol !== s1.isPercentCol) {
        const primaryIdx = max0 >= max1 ? 0 : 1
        const majorCol = numCols[primaryIdx]
        const minorCol = numCols[1 - primaryIdx]
        const majorVals = primaryIdx === 0 ? v0 : v1
        const minorVals = primaryIdx === 0 ? v1 : v0
        chartSpec = {
          kind: 'combo',
          categories,
          series: [
            { name: majorCol.header, values: majorVals, chartKind: 'column' },
            { name: minorCol.header, values: minorVals, chartKind: 'line', secondaryAxis: true },
          ],
          unit: majorCol.unit,
          showValues: categories.length <= 8,
        }
        const minorLast = minorVals[minorVals.length - 1]
        kpiDelta = `${minorCol.header}: ${formatNumCompact(minorLast, minorCol.unit)}`
      }
    }

    if (!chartSpec) {
      const usedCols = numCols.slice(0, 3)
      const isTime = categories.length >= 4 && categories.every(c => /^(?:20\d{2}|Q[1-4]|M\d{1,2}|\d{4}[-/]\d{1,2}|\d{1,2}月|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(c))
      const longLabels = categories.length > 7 || categories.some(c => c.length > 10)
      const kind = isTime ? 'line' : (longLabels ? 'bar' : 'column')
      chartSpec = {
        kind,
        categories,
        series: usedCols.map(nc => ({
          name: nc.header,
          values: chartRows.map((_, idx) => (nc.parsed[idx]?.ok ? nc.parsed[idx].num : 0)),
        })),
        ...(usedCols.length === 1 ? { highlight: 'max' } : {}),
        unit: primary.unit,
        showValues: categories.length <= 8 && usedCols.length <= 2,
      }
    }

    // Compute Top / Min / Average insight cards on primary series
    const mainSeries = chartSpec.series[0]
    const mainVals = mainSeries.values
    const maxIdx = mainVals.reduce((bi, v, i, a) => (v > a[bi] ? i : bi), 0)
    const minIdx = mainVals.reduce((bi, v, i, a) => (v < a[bi] ? i : bi), 0)
    const sum = mainVals.reduce((a, b) => a + b, 0)
    const avg = sum / Math.max(1, mainVals.length)
    const firstVal = mainVals[0]
    const lastVal = mainVals[mainVals.length - 1]
    const growthPct = mainVals.length >= 2 && firstVal !== 0
      ? ((lastVal - firstVal) / Math.abs(firstVal)) * 100
      : null

    if (!kpiDelta && growthPct !== null && Number.isFinite(growthPct)) {
      kpiDelta = `${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}%`
    }

    const pUnit = primary.unit || chartSpec.unit || ''
    const titlePrefix = bannerTitle || sheetName
    out.push({
      layout: 'chart-split',
      variant: 'chart-left',
      kicker: sheetName,
      title: en
        ? `${titlePrefix}: ${categories[maxIdx]} peaks at ${formatNumCompact(mainVals[maxIdx], pUnit)} (avg ${formatNumCompact(avg, pUnit)})`
        : `${titlePrefix}：「${categories[maxIdx]}」以 ${formatNumCompact(mainVals[maxIdx], pUnit)} 领跑（均值 ${formatNumCompact(avg, pUnit)}）`,
      chart: chartSpec,
      items: [
        { tag: en ? 'PEAK' : '最高峰值', title: categories[maxIdx], text: `${mainSeries.name}: **${formatNumCompact(mainVals[maxIdx], pUnit)}**` },
        { tag: en ? 'LOWEST' : '最低谷值', title: categories[minIdx], text: `${mainSeries.name}: ${formatNumCompact(mainVals[minIdx], pUnit)}` },
        { tag: en ? 'AVERAGE' : '均值基准', title: formatNumCompact(avg, pUnit), text: growthPct !== null ? `${en ? 'Period change' : '首末变动'} ${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}%` : `${mainVals.length} ${en ? 'items' : '项统计'}` },
      ],
      takeaway: en
        ? `${categories[maxIdx]} outperforms ${categories[minIdx]} by ${formatNumCompact(mainVals[maxIdx] - mainVals[minIdx], pUnit)}.`
        : `最高项「${categories[maxIdx]}」高出最低项「${categories[minIdx]}」达 ${formatNumCompact(mainVals[maxIdx] - mainVals[minIdx], pUnit)}。`,
      source: en ? `Source: Sheet "${sheetName}" (${dataRows.length} rows)` : `数据来源：工作表「${sheetName}」（共 ${dataRows.length} 行）`,
    })

    // Append full data table appendix (capped at 14 rows = max 2 paginated slides)
    const tableColsCount = Math.min(6, headers.length)
    const tableRows = [headers.slice(0, tableColsCount), ...dataRows.slice(0, 14).map(r => r.slice(0, tableColsCount))]
    out.push({
      layout: 'table',
      tableStyle: 'consulting',
      kicker: en ? `${sheetName} · Appendix` : `${sheetName} · 数据明细`,
      title: en ? `${sheetName}: Complete metric breakdown (${dataRows.length} records)` : `${sheetName}：完整结构化明细数据（共 ${dataRows.length} 条）`,
      rows: tableRows,
      source: en ? `Source: Sheet "${sheetName}"` : `数据来源：工作表「${sheetName}」`,
    })

    const topTotal = primary.isPercentCol ? avg : sum
    return {
      slides: out,
      kpiSummary: {
        label: `${sheetName} · ${mainSeries.name}`,
        value: formatNumCompact(topTotal, pUnit),
        delta: kpiDelta,
        note: `${en ? 'Peak' : '峰值'}: ${categories[maxIdx]} (${formatNumCompact(mainVals[maxIdx], pUnit)})`,
      },
    }
  }

  // Fallback for purely textual tables
  const tableRows = [headers.slice(0, 6), ...dataRows.slice(0, 14).map(r => r.slice(0, 6))]
  out.push({
    layout: 'table',
    tableStyle: 'consulting',
    kicker: sheetName,
    title: en ? `${sheetName}: Structured summary (${dataRows.length} entries)` : `${sheetName}：结构化台账总览（共 ${dataRows.length} 条）`,
    rows: tableRows,
    source: en ? `Source: Sheet "${sheetName}"` : `数据来源：工作表「${sheetName}」`,
  })
  return { slides: out, kpiSummary: null }
}

function profileTabularWorkbook(sheets, fileName, en) {
  const baseTitle = cleanLine(fileName.replace(/\.[^.]+$/, '')) || (en ? 'Data Executive Report' : '数据洞察专项汇报')
  const sheetNames = sheets.map(s => s.name)
  const totalRows = sheets.reduce((s, sh) => s + Math.max(0, sh.rows.length - 1), 0)

  const bodySlides = []
  const kpiItems = []

  for (const sheet of sheets) {
    const profiled = buildNumericSheetSlides(sheet, en)
    bodySlides.push(...profiled.slides)
    if (profiled.kpiSummary && kpiItems.length < 4) {
      kpiItems.push(profiled.kpiSummary)
    }
  }

  if (kpiItems.length < 2) {
    kpiItems.unshift(
      { label: en ? 'Sheets Analyzed' : '分析工作表数', value: String(sheets.length), unit: en ? 'sheets' : '张', note: sheetNames.slice(0, 3).join(' · ') },
      { label: en ? 'Data Records' : '总计数据记录', value: String(totalRows), unit: en ? 'rows' : '行', note: fileName },
    )
  }

  const cover = {
    layout: 'cover',
    kicker: en ? 'OFFICE DATA INTELLIGENCE' : 'Excel / CSV 智能数据战报',
    title: baseTitle,
    subtitle: en
      ? `${sheets.length} sheet(s) · ${totalRows} data records automatically profiled`
      : `自动解析 ${sheets.length} 张工作表 · 共 ${totalRows} 条业务数据记录`,
  }

  const execKpi = {
    layout: 'kpi',
    variant: 'grid',
    kicker: en ? '01 · Executive Summary' : '01 · 核心指标总览',
    title: en
      ? `Key highlights across ${sheets.length} dataset(s) and ${totalRows} records`
      : `核心业务指标汇总（覆盖 ${sheets.length} 张表 / ${totalRows} 条记录）`,
    items: kpiItems.slice(0, 4).map(k => ({
      tag: k.label,
      title: k.label,
      value: k.value,
      ...(k.unit ? { unit: k.unit } : {}),
      ...(k.delta ? { delta: k.delta, status: k.delta.startsWith('-') ? 'negative' : 'positive' } : {}),
      ...(k.note ? { text: k.note } : {}),
    })),
    source: en ? `Source: ${fileName}` : `数据来源：${fileName}`,
  }

  const closing = {
    layout: 'closing',
    variant: 'cta-cards',
    kicker: en ? 'NEXT ACTIONS' : '下一步行动建议',
    title: en ? 'Review key anomalies and lock next-cycle targets' : '复核核心峰值异动，明确下阶段行动项',
    subtitle: en ? `Generated directly from ${fileName}` : `基于 ${fileName} 原始数据自动生成`,
    items: [
      { tag: '01', title: en ? 'Verify Peak Drivers' : '复盘峰值动因', text: en ? 'Replicate top-performing segment mechanics' : '提炼领跑分项成功经验并横向复制' },
      { tag: '02', title: en ? 'Address Bottlenecks' : '跟进短板整改', text: en ? 'Inspect trailing rows in appendix tables' : '结合明细附录排查落后项与风险点' },
    ],
  }

  const slides = [cover, execKpi, ...bodySlides, closing]
  return {
    title: baseTitle,
    language: en ? 'en' : 'zh',
    slides,
    _sheets: sheets,
    stats: {
      sourceFormat: extname(fileName).slice(1).toLowerCase() || 'xlsx',
      sheetCount: sheets.length,
      totalRows,
      slideCount: slides.length,
    },
  }
}

// ---------------------------------------------------------------------------
// .docx Word Report Parser
// ---------------------------------------------------------------------------

function detectImageMime(bytes) {
  if (!bytes || bytes.length < 12) return null
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png'
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg'
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  return null
}

function extractParagraphRunsMarkdown(pXml) {
  const runs = []
  for (const rMatch of pXml.matchAll(/<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g)) {
    const rInner = rMatch[1]
    const rPr = /<w:rPr\b[^>]*>([\s\S]*?)<\/w:rPr>/.exec(rInner)?.[1] || ''
    const isBold = /<w:b\b(?![^>]*w:val=["'](?:0|false)["'])[^>]*\/?>/.test(rPr)
    const parts = []
    for (const tok of rInner.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/?>|<w:br\b[^>]*\/?>/g)) {
      if (tok[0].startsWith('<w:tab')) parts.push(' ')
      else if (tok[0].startsWith('<w:br')) parts.push('\n')
      else parts.push(decodeXml(tok[1]))
    }
    const text = parts.join('')
    if (text) runs.push({ text, bold: isBold })
  }
  const merged = []
  for (const r of runs) {
    const last = merged[merged.length - 1]
    if (last && last.bold === r.bold) last.text += r.text
    else merged.push({ ...r })
  }
  const plain = merged.map(r => r.text).join('').replace(/[ \t]+/g, ' ').trim()
  if (!plain) return { plain: '', markdown: '', isAllBold: false }
  const hasBold = merged.some(r => r.bold && r.text.trim())
  const hasNonBold = merged.some(r => !r.bold && r.text.trim())
  if (!hasBold || !hasNonBold) {
    return { plain, markdown: plain, isAllBold: hasBold && !hasNonBold }
  }
  const md = merged.map(seg => {
    if (!seg.bold) return seg.text
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(seg.text)
    return m && m[2] ? `${m[1]}**${m[2]}**${m[3]}` : seg.text
  }).join('').replace(/\*\*\s*\*\*/g, '').replace(/[ \t]+/g, ' ').trim()
  return { plain, markdown: md, isAllBold: false }
}

function splitBodyTopLevelBlocks(bodyXml) {
  const blocks = []
  let i = 0
  while (i < bodyXml.length) {
    const nextP = bodyXml.indexOf('<w:p', i)
    const nextTbl = bodyXml.indexOf('<w:tbl', i)
    if (nextP < 0 && nextTbl < 0) break
    const isTbl = nextTbl >= 0 && (nextP < 0 || nextTbl < nextP)
    const start = isTbl ? nextTbl : nextP
    const tag = isTbl ? 'w:tbl' : 'w:p'
    // Verify tag boundary
    const afterTag = bodyXml[start + tag.length + 1]
    if (afterTag !== '>' && afterTag !== ' ' && afterTag !== '/') {
      i = start + tag.length + 1
      continue
    }
    if (bodyXml[start + tag.length + 1] === '/' && bodyXml[start + tag.length + 2] === '>') {
      i = start + tag.length + 3
      continue
    }
    // Depth-aware close tag search for nested tables/paragraphs
    let depth = 0
    let cursor = start
    let end = -1
    const openRe = new RegExp(`<${tag}(?:\\s[^>]*)?>|<\\/${tag}>`, 'g')
    openRe.lastIndex = start
    let m
    while ((m = openRe.exec(bodyXml)) !== null) {
      if (m[0].startsWith(`</${tag}`)) {
        depth -= 1
        if (depth === 0) {
          end = openRe.lastIndex
          break
        }
      } else if (!m[0].endsWith('/>')) {
        depth += 1
      }
      cursor = openRe.lastIndex
    }
    if (end < 0) break
    blocks.push({ kind: isTbl ? 'tbl' : 'p', xml: bodyXml.slice(start, end) })
    i = end
  }
  return blocks
}

function parseDocxTable(tblXml) {
  const rows = []
  for (const trMatch of tblXml.matchAll(/<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g)) {
    const row = []
    for (const tcMatch of trMatch[1].matchAll(/<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g)) {
      const cellParas = []
      for (const pMatch of tcMatch[1].matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g)) {
        const { markdown } = extractParagraphRunsMarkdown(pMatch[0])
        if (markdown) cellParas.push(markdown)
      }
      row.push(cleanLine(cellParas.join(' ')))
    }
    if (row.some(Boolean)) rows.push(row)
  }
  if (rows.length < 2) return null
  const maxCols = Math.min(6, Math.max(...rows.map(r => r.length)))
  return rows.map(r => {
    const out = r.slice(0, maxCols)
    while (out.length < maxCols) out.push('')
    return out
  })
}

function parseDocxArchive(bytes, fileName) {
  const zip = openZipArchive(bytes)
  const docXml = zip.readText('word/document.xml')
  if (!docXml) {
    fail('Word 文档缺失 word/document.xml', 'Invalid .docx: missing word/document.xml')
  }

  const relsMap = parseRelationshipsMap(zip.readText('word/_rels/document.xml.rels'))
  const mediaDataUris = new Map()
  for (const [rid, target] of relsMap.entries()) {
    const part = resolveZipTarget('word/document.xml', target)
    if (!part) continue
    const imgBytes = zip.readBuffer(part)
    if (!imgBytes || imgBytes.length > MAX_IMAGE_BYTES) continue
    const mime = detectImageMime(imgBytes)
    if (mime) {
      mediaDataUris.set(rid, {
        dataUri: `data:${mime};base64,${imgBytes.toString('base64')}`,
        name: basename(part),
      })
    }
  }

  const bodyXml = /<w:body\b[^>]*>([\s\S]*?)<\/w:body>/.exec(docXml)?.[1] || docXml
  const blocks = splitBodyTopLevelBlocks(bodyXml)

  let docTitle = ''
  let docSubtitle = ''
  const items = []
  let inMermaidFence = false
  let mermaidBuf = []

  for (const blk of blocks) {
    if (blk.kind === 'tbl') {
      const rows = parseDocxTable(blk.xml)
      if (rows) items.push({ kind: 'table', rows })
      continue
    }

    const pXml = blk.xml
    const pStyle = /<w:pStyle\b[^>]*w:val=["']([^"']+)["']/.exec(pXml)?.[1] || ''
    const hasListNum = /<w:numPr\b/.test(pXml) || /List/i.test(pStyle)
    const { plain, markdown, isAllBold } = extractParagraphRunsMarkdown(pXml)

    const embedIds = []
    for (const em of pXml.matchAll(/(?:r:embed|r:id)=["']([^"']+)["']/g)) {
      if (mediaDataUris.has(em[1])) embedIds.push(mediaDataUris.get(em[1]))
    }

    if (inMermaidFence) {
      if (/^```/.test(plain)) {
        const code = mermaidBuf.join('\n').trim()
        if (code) items.push({ kind: 'mermaid', code })
        inMermaidFence = false
        mermaidBuf = []
      } else if (plain) {
        mermaidBuf.push(plain)
      }
      continue
    }

    if (/^```mermaid\b/i.test(plain)) {
      const rest = plain.replace(/^```mermaid\b/i, '').trim()
      if (rest.endsWith('```')) {
        const code = rest.slice(0, -3).trim()
        if (code) items.push({ kind: 'mermaid', code })
      } else {
        inMermaidFence = true
        mermaidBuf = rest ? [rest] : []
      }
      continue
    }

    if (/^(?:Title|标题)$/i.test(pStyle) && plain) {
      if (!docTitle) docTitle = plain
      continue
    }
    if (/^(?:Subtitle|副标题)$/i.test(pStyle) && plain) {
      if (!docSubtitle) docSubtitle = plain
      continue
    }

    const isH1 = /^(?:Heading\s*1|1|标题\s*1)$/i.test(pStyle) ||
      (/^[一二三四五六七八九十]+、\S+/.test(plain) && plain.length <= 42) ||
      (/^第[一二三四五六七八九十\d]+[章节部分]\s*\S+/.test(plain) && plain.length <= 42)
    const isH2 = /^(?:Heading\s*[23]|[23]|标题\s*[23])$/i.test(pStyle) ||
      (/^（[一二三四五六七八九十]+）\S+/.test(plain) && plain.length <= 44) ||
      (/^\d+(?:\.\d+)?[.、]\s+\S+/.test(plain) && plain.length <= 44 && (isAllBold || !hasListNum))

    if (isH1 && plain) {
      if (!docTitle && items.length === 0) {
        docTitle = plain
      } else {
        items.push({ kind: 'h1', text: plain })
      }
    } else if (isH2 && plain) {
      items.push({ kind: 'h2', text: plain })
    } else if (plain) {
      // Check standalone display formula $$...$$ or $...$
      const dispFormula = /^\$\$([\s\S]+)\$\$$/.exec(plain) || /^\$([^$]+)\$$/.exec(plain)
      if (dispFormula) {
        items.push({ kind: 'formula', formula: dispFormula[1].trim() })
      } else if (/^(?:flowchart|graph)\s+(?:TD|TB|LR|RL)\b|^sequenceDiagram\b/i.test(plain) && /(?:-->|-.->|->>|-->>)/.test(plain)) {
        items.push({ kind: 'mermaid', code: plain })
      } else {
        items.push({ kind: 'para', plain, markdown, isBullet: hasListNum })
      }
    }

    for (const img of embedIds) {
      items.push({ kind: 'image', src: img.dataUri, alt: img.name })
    }
  }

  if (inMermaidFence && mermaidBuf.length) {
    items.push({ kind: 'mermaid', code: mermaidBuf.join('\n').trim() })
  }

  const fallbackTitle = cleanLine(fileName.replace(/\.[^.]+$/, '')) || 'Word Report'
  const title = docTitle || fallbackTitle
  const sampleText = [title, docSubtitle, ...items.map(it => it.text || it.plain || '')].join(' ')
  const en = (sampleText.match(/[\u3400-\u9fff]/g) || []).length < 6

  // Convert linear document items into cohesive structured slides (5-20 slides)
  const sections = []
  let cur = null
  const ensureSection = (heading, level = 2) => {
    if (!cur) {
      cur = { title: heading || title, level, bullets: [], tables: [], images: [], mermaids: [], formulas: [] }
    }
    return cur
  }
  const flushSection = () => {
    if (cur && (cur.bullets.length || cur.tables.length || cur.images.length || cur.mermaids.length || cur.formulas.length || cur.title !== title)) {
      sections.push(cur)
    }
    cur = null
  }

  for (const it of items) {
    if (it.kind === 'h1' || it.kind === 'h2') {
      flushSection()
      cur = { title: it.text, level: it.kind === 'h1' ? 1 : 2, bullets: [], tables: [], images: [], mermaids: [], formulas: [] }
    } else if (it.kind === 'para') {
      ensureSection(title)
      // Extract inline $...$ formula if embedded in paragraph
      const inlineF = /\$([^$\n]{2,120})\$/.exec(it.plain)
      if (inlineF && !cur.formulas.length) cur.formulas.push(inlineF[1].trim())
      cur.bullets.push(it.markdown)
    } else if (it.kind === 'table') {
      ensureSection(title)
      cur.tables.push(it.rows)
    } else if (it.kind === 'image') {
      ensureSection(title)
      cur.images.push({ src: it.src, alt: it.alt })
    } else if (it.kind === 'mermaid') {
      ensureSection(title)
      cur.mermaids.push(it.code)
    } else if (it.kind === 'formula') {
      ensureSection(title)
      cur.formulas.push(it.formula)
    }
  }
  flushSection()

  const slides = []
  slides.push({
    layout: 'cover',
    kicker: en ? 'WORD DOCUMENT BRIEF' : 'Word 报告智能成稿',
    title,
    subtitle: docSubtitle || (en ? `Synthesized from ${fileName}` : `由 ${fileName} 自动提炼并排版成稿`),
  })

  if (sections.length >= 4) {
    slides.push({
      layout: 'agenda',
      variant: 'cards',
      kicker: en ? 'AGENDA' : '报告目录',
      title: en ? 'Report structure and key chapters' : '汇报核心章节与论证脉络',
      bullets: sections.slice(0, 6).map(s => s.title),
    })
  }

  let sectionNum = 0
  for (const sec of sections) {
    if (slides.length >= 19) break
    sectionNum += 1
    const kicker = `${String(sectionNum).padStart(2, '0')} · ${sec.title.slice(0, 18)}`

    // Formulas -> callout(formula)
    if (sec.formulas.length > 0 && slides.length < 19) {
      slides.push({
        layout: 'callout',
        variant: 'formula',
        kicker,
        title: sec.title,
        formula: sec.formulas[0],
        bullets: sec.bullets.slice(0, 3),
      })
    }

    // Mermaid blocks -> layout: 'mermaid'
    for (const code of sec.mermaids) {
      if (slides.length >= 19) break
      slides.push({
        layout: 'mermaid',
        kicker,
        title: sec.title,
        mermaid: code,
      })
    }

    // Embedded images -> image-right with paired bullets
    if (sec.images.length > 0 && slides.length < 19) {
      slides.push({
        layout: 'image-right',
        variant: 'framed',
        kicker,
        title: sec.title,
        image: { src: sec.images[0].src, alt: sec.images[0].alt || sec.title, fit: 'contain' },
        bullets: sec.bullets.slice(0, 4),
      })
    } else if (sec.bullets.length > 0 && sec.formulas.length === 0) {
      // Chunk bullets cleanly (<= 5 per slide)
      for (let i = 0; i < sec.bullets.length && slides.length < 19; i += 5) {
        const chunk = sec.bullets.slice(i, i + 5)
        slides.push({
          layout: 'bullets',
          kicker,
          title: i === 0 ? sec.title : `${sec.title} (${Math.floor(i / 5) + 1})`,
          bullets: chunk,
        })
      }
    }

    // Tables -> table slide
    for (const tbl of sec.tables) {
      if (slides.length >= 19) break
      slides.push({
        layout: 'table',
        tableStyle: 'consulting',
        kicker,
        title: sec.title,
        rows: tbl.slice(0, 8),
      })
    }
  }

  // Ensure at least 5 slides for cohesive deck rhythm if document was short
  if (slides.length < 4 && sections.length === 0) {
    slides.push({
      layout: 'statement',
      kicker: '01',
      title,
      subtitle: docSubtitle || fileName,
    })
  }

  slides.push({
    layout: 'closing',
    variant: 'cta-cards',
    kicker: en ? 'NEXT STEPS' : '总结与后续行动',
    title: en ? 'Key conclusions and recommended next actions' : '核心结论确认与下一步推进计划',
    subtitle: en ? `Source document: ${fileName}` : `原始文档：${fileName}`,
    items: sections.slice(0, 3).map((s, idx) => ({
      tag: `0${idx + 1}`,
      title: s.title,
      text: s.bullets[0] ? cleanLine(s.bullets[0].replace(/\*\*/g, '')).slice(0, 60) : '',
    })),
  })

  const promoted = promoteMarkdownSlides(slides, { explicitSmartLayout: true })
  return {
    title,
    language: en ? 'en' : 'zh',
    slides: promoted,
    _rawSections: sections,
    _embeddedMedia: [...mediaDataUris.values()],
    stats: {
      sourceFormat: 'docx',
      sectionCount: sections.length,
      tableCount: items.filter(i => i.kind === 'table').length,
      imageCount: mediaDataUris.size,
      mermaidCount: items.filter(i => i.kind === 'mermaid').length,
      slideCount: promoted.length,
    },
  }
}

// ---------------------------------------------------------------------------
// Zero-dep Pure-Node .pdf Text & Section Extractor (FlateDecode + BT/ET + UTF-16BE)
// ---------------------------------------------------------------------------

function decodeUtf16BeBytes(bytes) {
  let out = ''
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    out += String.fromCharCode((bytes[i] << 8) | bytes[i + 1])
  }
  return out
}

function decodePdfLiteralString(raw) {
  const bytes = []
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i]
    if (ch === '\\' && i + 1 < raw.length) {
      const next = raw[i + 1]
      if (next === 'n') { bytes.push(0x0a); i += 1 }
      else if (next === 'r') { bytes.push(0x0d); i += 1 }
      else if (next === 't') { bytes.push(0x09); i += 1 }
      else if (next === 'b') { bytes.push(0x08); i += 1 }
      else if (next === 'f') { bytes.push(0x0c); i += 1 }
      else if (next === '\r' || next === '\n') {
        i += 1
        if (next === '\r' && raw[i + 1] === '\n') i += 1
      } else if (next >= '0' && next <= '7') {
        let oct = next
        if (raw[i + 2] >= '0' && raw[i + 2] <= '7') {
          oct += raw[i + 2]
          if (raw[i + 3] >= '0' && raw[i + 3] <= '7') oct += raw[i + 3]
        }
        bytes.push(Number.parseInt(oct, 8) & 0xff)
        i += oct.length
      } else {
        bytes.push(next.charCodeAt(0) & 0xff)
        i += 1
      }
    } else {
      bytes.push(ch.charCodeAt(0) & 0xff)
    }
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return decodeUtf16BeBytes(bytes.slice(2))
  }
  const buf = Buffer.from(bytes)
  const utf8 = buf.toString('utf8')
  return utf8.includes('\uFFFD') ? buf.toString('latin1') : utf8
}

function decodePdfHexString(hexRaw, cmap) {
  const cleanHex = String(hexRaw ?? '').replace(/[^0-9A-Fa-f]/g, '')
  if (!cleanHex) return ''
  const padded = cleanHex.length % 2 === 1 ? cleanHex + '0' : cleanHex
  const bytes = []
  for (let i = 0; i < padded.length; i += 2) {
    bytes.push(Number.parseInt(padded.slice(i, i + 2), 16))
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return decodeUtf16BeBytes(bytes.slice(2))
  }
  if (cmap && cmap.size > 0) {
    let mapped = ''
    let hits = 0
    if (padded.length % 4 === 0) {
      for (let i = 0; i < padded.length; i += 4) {
        const key = padded.slice(i, i + 4).toUpperCase()
        if (cmap.has(key)) { mapped += cmap.get(key); hits += 1 }
      }
      if (hits > 0) return mapped
    }
    for (let i = 0; i < padded.length; i += 2) {
      const key = padded.slice(i, i + 2).toUpperCase()
      if (cmap.has(key)) { mapped += cmap.get(key); hits += 1 }
    }
    if (hits > 0) return mapped
  }
  if (bytes.length >= 2 && bytes.length % 2 === 0 && bytes.some((b, idx) => idx % 2 === 0 && b >= 0x4e && b <= 0x9f)) {
    return decodeUtf16BeBytes(bytes)
  }
  const buf = Buffer.from(bytes)
  const utf8 = buf.toString('utf8')
  return utf8.includes('\uFFFD') ? buf.toString('latin1') : utf8
}

function parseToUnicodeCmap(text, cmap) {
  for (const m of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const pair of m[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      const src = pair[1].toUpperCase()
      const dst = decodePdfHexString('FEFF' + pair[2], null)
      if (dst) cmap.set(src, dst)
    }
  }
  for (const m of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const rng of m[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      const start = Number.parseInt(rng[1], 16)
      const end = Number.parseInt(rng[2], 16)
      const dstStart = Number.parseInt(rng[3], 16)
      const width = rng[1].length
      if (Number.isFinite(start) && Number.isFinite(end) && end >= start && end - start <= 256) {
        for (let code = start; code <= end; code += 1) {
          const key = code.toString(16).toUpperCase().padStart(width, '0')
          cmap.set(key, String.fromCodePoint(dstStart + (code - start)))
        }
      }
    }
  }
}

function extractLinesFromPdfContent(contentStr, cmap) {
  const lines = []
  let current = ''
  const flush = () => {
    const cleaned = current.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]+/g, ' ').replace(/\s+/g, ' ').trim()
    if (cleaned.length >= 2) lines.push(cleaned)
    current = ''
  }

  const btBlocks = [...contentStr.matchAll(/BT\b([\s\S]*?)\bET\b/g)].map(m => m[1])
  const targets = btBlocks.length > 0 ? btBlocks : [contentStr]

  for (const block of targets) {
    let i = 0
    while (i < block.length) {
      const ch = block[i]
      if (ch === '(') {
        // Parse balanced literal string
        let depth = 1
        let start = i + 1
        i += 1
        while (i < block.length && depth > 0) {
          if (block[i] === '\\') { i += 2; continue }
          if (block[i] === '(') depth += 1
          else if (block[i] === ')') depth -= 1
          i += 1
        }
        const literal = block.slice(start, i - 1)
        const after = block.slice(i, i + 12)
        if (/^\s*(?:Tj|'|")/.test(after)) {
          current += decodePdfLiteralString(literal)
          if (/^\s*(?:'|")/.test(after)) flush()
        }
      } else if (ch === '<' && block[i + 1] !== '<') {
        const end = block.indexOf('>', i + 1)
        if (end > i) {
          const hex = block.slice(i + 1, end)
          const after = block.slice(end + 1, end + 12)
          if (/^\s*(?:Tj|'|")/.test(after)) {
            current += decodePdfHexString(hex, cmap)
          }
          i = end + 1
          continue
        }
        i += 1
      } else if (ch === '[') {
        // Parse TJ array
        let j = i + 1
        let chunk = ''
        while (j < block.length && block[j] !== ']') {
          if (block[j] === '(') {
            let depth = 1
            const sStart = j + 1
            j += 1
            while (j < block.length && depth > 0) {
              if (block[j] === '\\') { j += 2; continue }
              if (block[j] === '(') depth += 1
              else if (block[j] === ')') depth -= 1
              j += 1
            }
            chunk += decodePdfLiteralString(block.slice(sStart, j - 1))
          } else if (block[j] === '<' && block[j + 1] !== '<') {
            const hEnd = block.indexOf('>', j + 1)
            if (hEnd > j) {
              chunk += decodePdfHexString(block.slice(j + 1, hEnd), cmap)
              j = hEnd + 1
            } else j += 1
          } else if (block[j] === '-' || (block[j] >= '0' && block[j] <= '9')) {
            const numMatch = /^-?\d+(?:\.\d+)?/.exec(block.slice(j))
            if (numMatch) {
              if (Number(numMatch[0]) <= -180 && chunk && !chunk.endsWith(' ')) chunk += ' '
              j += numMatch[0].length
            } else j += 1
          } else {
            j += 1
          }
        }
        const after = block.slice(j + 1, j + 10)
        if (/^\s*TJ\b/.test(after)) {
          current += chunk
        }
        i = j + 1
      } else {
        // Detect line-break operators T*, Td, TD, Tm
        if ((ch === 'T' && (block[i + 1] === '*' || block[i + 1] === 'd' || block[i + 1] === 'D' || block[i + 1] === 'm'))
            && (i === 0 || /\s/.test(block[i - 1]))
            && (i + 2 >= block.length || /\s/.test(block[i + 2]))) {
          if (current.trim()) flush()
          i += 2
          continue
        }
        i += 1
      }
    }
    flush()
  }
  return lines
}

export function extractPdfText(bytes) {
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)
  const head = buf.subarray(0, Math.min(1024, buf.length)).toString('latin1')
  if (!head.includes('%PDF-')) {
    fail('无效的 PDF 文件头（缺少 %PDF- 标识）', 'Invalid PDF header')
  }
  const latin = buf.toString('latin1')
  if (/\/Encrypt\b/.test(latin)) {
    fail('当前 PDF 已加密，暂不支持直接解析加密 PDF，请先解除密码保护后重试', 'Encrypted PDF is not supported')
  }

  let docTitle = ''
  const titleLit = /\/Title\s*\(([^()]{1,240})\)/.exec(latin)
  const titleHex = /\/Title\s*<([0-9A-Fa-f]{4,480})>/.exec(latin)
  if (titleLit) docTitle = cleanLine(decodePdfLiteralString(titleLit[1]))
  else if (titleHex) docTitle = cleanLine(decodePdfHexString(titleHex[1], null))

  const decodedStreams = []
  const cmap = new Map()
  const streamToken = Buffer.from('stream')
  const endstreamToken = Buffer.from('endstream')

  let pos = 0
  while (pos < buf.length) {
    const sIdx = buf.indexOf(streamToken, pos)
    if (sIdx < 0) break
    // Ensure "stream" is followed by \r\n or \n (not "endstream")
    const prevByte = sIdx > 0 ? buf[sIdx - 1] : 0x20
    if (prevByte === 0x64 /* 'd' in endstream */) {
      pos = sIdx + 6
      continue
    }
    let dataStart = sIdx + 6
    if (buf[dataStart] === 0x0d && buf[dataStart + 1] === 0x0a) dataStart += 2
    else if (buf[dataStart] === 0x0a) dataStart += 1
    else { pos = sIdx + 6; continue }

    const eIdx = buf.indexOf(endstreamToken, dataStart)
    if (eIdx < 0) break
    let dataEnd = eIdx
    while (dataEnd > dataStart && (buf[dataEnd - 1] === 0x0a || buf[dataEnd - 1] === 0x0d)) dataEnd -= 1

    const dictWindow = buf.subarray(Math.max(0, sIdx - 420), sIdx).toString('latin1')
    const isImage = /\/Subtype\s*\/Image\b/.test(dictWindow)
    const isFlate = /\/FlateDecode\b/.test(dictWindow)
    if (!isImage && dataEnd > dataStart && dataEnd - dataStart <= MAX_ENTRY_BYTES) {
      const rawSlice = buf.subarray(dataStart, dataEnd)
      let outBuf = rawSlice
      if (isFlate) {
        try {
          outBuf = inflateSync(rawSlice, { maxOutputLength: MAX_ENTRY_BYTES })
        } catch {
          try {
            outBuf = inflateRawSync(rawSlice, { maxOutputLength: MAX_ENTRY_BYTES })
          } catch {
            outBuf = null
          }
        }
      }
      if (outBuf && outBuf.length > 0) {
        const textStr = outBuf.toString('latin1')
        if (textStr.includes('beginbfchar') || textStr.includes('beginbfrange')) {
          parseToUnicodeCmap(textStr, cmap)
        } else if (textStr.includes('BT') || textStr.includes('Tj') || textStr.includes('TJ')) {
          decodedStreams.push(textStr)
        }
      }
    }
    pos = eIdx + 9
  }

  const allLines = []
  for (const s of decodedStreams) {
    allLines.push(...extractLinesFromPdfContent(s, cmap))
  }
  // Deduplicate adjacent identical lines while preserving reading order
  const deduped = []
  for (const line of allLines) {
    if (!line || (deduped.length > 0 && deduped[deduped.length - 1] === line)) continue
    deduped.push(line)
  }

  return {
    title: docTitle,
    lines: deduped,
    streamCount: decodedStreams.length,
  }
}

function isLikelyPdfHeading(line, prevBlankOrStart) {
  const s = cleanLine(line)
  if (s.length < 3 || s.length > 52) return false
  if (/[。！？.!?；;]$/.test(s)) return false
  if (/^(?:[一二三四五六七八九十]+[、.．]|第[一二三四五六七八九十\d]+[章节部分]|\d+(?:\.\d+)?[\s、.．]|Chapter\s+\d+|Section\s+\d+|Part\s+\d+)/i.test(s)) {
    return true
  }
  if (prevBlankOrStart && s.length <= 32 && !/[,，:：]/.test(s)) return true
  return false
}

function parsePdfDocument(bytes, fileName, langHint) {
  const { title: metaTitle, lines } = extractPdfText(bytes)
  if (lines.length === 0) {
    fail('未在 PDF 中检测到可提取文本（可能为纯扫描图片 PDF，请先 OCR 转换为文本或 Word/Markdown 后再导入）', 'No extractable text found in PDF (likely scanned image PDF)')
  }

  const sample = [metaTitle, ...lines.slice(0, 30)].join(' ')
  const en = langHint ? langHint === 'en' : (sample.match(/[\u3400-\u9fff]/g) || []).length < 4
  const fallbackTitle = cleanLine(fileName.replace(/\.[^.]+$/, '')) || (en ? 'PDF Presentation' : 'PDF 报告汇报')
  const firstLine = lines[0] || ''
  const title = (metaTitle && metaTitle.length >= 2 && metaTitle.length <= 80)
    ? metaTitle
    : (firstLine.length >= 4 && firstLine.length <= 56 && !/[。！？.!?]$/.test(firstLine) ? firstLine : fallbackTitle)

  const bodyLines = title === firstLine ? lines.slice(1) : lines
  const sections = []
  let current = null

  for (let i = 0; i < bodyLines.length; i += 1) {
    const line = bodyLines[i]
    if (isLikelyPdfHeading(line, i === 0 || (current && current.bullets.length >= 4))) {
      if (current && current.bullets.length > 0) sections.push(current)
      current = { title: line, bullets: [] }
    } else {
      if (!current) {
        current = { title: en ? 'Executive Highlights' : '核心要点提炼', bullets: [] }
      }
      current.bullets.push(line)
      if (current.bullets.length >= 6 && i + 1 < bodyLines.length) {
        sections.push(current)
        current = null
      }
    }
  }
  if (current && current.bullets.length > 0) sections.push(current)

  const slides = []
  slides.push({
    layout: 'cover',
    kicker: en ? 'PDF BRIEFING' : 'PDF 报告拆解',
    title,
    subtitle: en
      ? `Synthesized from ${fileName} (${sections.length} key sections)`
      : `自动提取自 ${fileName}（共提炼 ${sections.length} 组核心章节）`,
  })

  if (sections.length >= 3) {
    slides.push({
      layout: 'agenda',
      kicker: en ? 'AGENDA' : '内容结构',
      title: en ? 'Report Structure & Key Findings' : '文档核心章节与脉络总览',
      items: sections.slice(0, 6).map((sec, idx) => ({
        tag: String(idx + 1).padStart(2, '0'),
        title: sec.title.slice(0, 40),
        text: sec.bullets[0] ? sec.bullets[0].slice(0, 56) : '',
      })),
    })
  }

  for (let idx = 0; idx < sections.length && slides.length < 18; idx += 1) {
    const sec = sections[idx]
    slides.push({
      layout: 'bullets',
      kicker: String(idx + 1).padStart(2, '0'),
      title: sec.title,
      bullets: sec.bullets.slice(0, 5),
      source: fileName,
    })
  }

  slides.push({
    layout: 'closing',
    variant: 'cta-cards',
    kicker: en ? 'SUMMARY' : '核心结论与行动',
    title: en ? 'Key conclusions and recommended next actions' : '核心结论复盘与下一步推进计划',
    subtitle: en ? `Source PDF: ${fileName}` : `原始 PDF 文档：${fileName}`,
    items: sections.slice(0, 3).map((s, idx) => ({
      tag: `0${idx + 1}`,
      title: s.title.slice(0, 36),
      text: s.bullets[0] ? s.bullets[0].slice(0, 56) : '',
    })),
  })

  const promoted = promoteMarkdownSlides(slides, { explicitSmartLayout: true })
  return {
    title,
    language: en ? 'en' : 'zh',
    slides: promoted,
    _rawSections: sections,
    stats: {
      sourceFormat: 'pdf',
      lineCount: lines.length,
      sectionCount: sections.length,
      slideCount: promoted.length,
    },
  }
}

// ---------------------------------------------------------------------------
// Zero-dep Local Image Inspector (PNG / JPEG / WebP header parser + Smart Photo Role)
// ---------------------------------------------------------------------------

const PORTRAIT_HINT_RE = /(?:team|founder|ceo|cto|people|person|portrait|avatar|staff|speaker|headshot|团队|合影|人像|人物|头像|嘉宾|讲师|员工|领导)/i
const COVER_HINT_RE = /(?:cover|hero|banner|keynote|title|overview|封面|主图|全景|头图|开场)/i
const MOBILE_HINT_RE = /(?:mobile|phone|ios|android|app|wechat|miniapp|手机|移动端|小程序|竖屏)/i
const BROWSER_HINT_RE = /(?:ui|screen|screenshot|dashboard|web|browser|demo|console|admin|portal|界面|截图|看板|系统|后台|工作台|网页|演示)/i

function parseImageDimensions(bytes) {
  if (!bytes || bytes.length < 16) return null
  // PNG: IHDR width/height at offsets 16..23
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes.length >= 24) {
    return { mime: 'image/png', width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
  }
  // JPEG: scan SOF0/1/2/3/5/6/7/9/10/11/13/14/15 markers
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2
    while (offset + 4 < bytes.length) {
      if (bytes[offset] !== 0xff) break
      while (offset < bytes.length && bytes[offset] === 0xff) offset += 1
      const marker = bytes[offset]
      offset += 1
      if (marker === 0xd9 || marker === 0xda) break
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
      if (offset + 2 > bytes.length) break
      const len = bytes.readUInt16BE(offset)
      if (len < 2 || offset + len > bytes.length) break
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && len >= 7) {
        return { mime: 'image/jpeg', height: bytes.readUInt16BE(offset + 3), width: bytes.readUInt16BE(offset + 5) }
      }
      offset += len
    }
    return { mime: 'image/jpeg', width: 0, height: 0 }
  }
  // WebP: VP8 / VP8L / VP8X
  if (bytes.length >= 30 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = bytes.toString('ascii', 12, 16)
    if (chunk === 'VP8 ') {
      return { mime: 'image/webp', width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff }
    }
    if (chunk === 'VP8L') {
      const bits = bytes.readUInt32LE(21)
      return { mime: 'image/webp', width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
    }
    if (chunk === 'VP8X') {
      const w = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16))
      const h = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16))
      return { mime: 'image/webp', width: w, height: h }
    }
  }
  return null
}

export function inspectImageBytes(bytes, fileName = 'image.png') {
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)
  const dims = parseImageDimensions(buf)
  const width = dims?.width || 0
  const height = dims?.height || 0
  const aspectRatio = width > 0 && height > 0 ? Math.round((width / height) * 100) / 100 : 1
  const orientation = width > 0 && height > 0
    ? (aspectRatio >= 1.15 ? 'landscape' : (aspectRatio <= 0.85 ? 'portrait' : 'square'))
    : 'unknown'
  const baseName = cleanLine(fileName.replace(/\.[^.]+$/, ''))
  const isPortraitSubject = orientation === 'portrait' || PORTRAIT_HINT_RE.test(baseName)
  const recommendedFocalPoint = isPortraitSubject ? 'top' : 'center'

  let recommendedRole = 'section'
  let recommendedLayout = 'image-right'
  if (COVER_HINT_RE.test(baseName) && orientation !== 'portrait') {
    recommendedRole = 'cover'
    recommendedLayout = 'cover'
  } else if (MOBILE_HINT_RE.test(baseName) || (orientation === 'portrait' && aspectRatio <= 0.68)) {
    recommendedRole = 'mockup-mobile'
    recommendedLayout = 'mockup[mobile]'
  } else if (BROWSER_HINT_RE.test(baseName)) {
    recommendedRole = 'mockup-browser'
    recommendedLayout = 'mockup[browser]'
  } else if (orientation === 'landscape' && width >= 1200 && height >= 650) {
    recommendedRole = 'section'
    recommendedLayout = 'image-right'
  }

  return {
    fileName,
    label: baseName || fileName,
    mime: dims?.mime || detectImageMime(buf) || 'image/png',
    sizeBytes: buf.length,
    width,
    height,
    aspectRatio,
    orientation,
    recommendedRole,
    recommendedLayout,
    recommendedFocalPoint,
  }
}

export function inspectLocalImage(filePath, cwd = '.') {
  const full = resolve(String(cwd || '.'), String(filePath || '').trim())
  const stat = lstatSync(full)
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_IMAGE_BYTES) {
    fail('图片需为 5 MiB 内的普通文件：' + full)
  }
  const bytes = readFileSync(full)
  return {
    path: full,
    ...inspectImageBytes(bytes, basename(full)),
  }
}

// ---------------------------------------------------------------------------
// Natural-Language Instructions Parser & Smart Filter Helpers
// ---------------------------------------------------------------------------

function parseUserInstructions(rawInstructions = '') {
  const text = cleanLine(rawInstructions)
  if (!text) return { raw: '', targetSlides: null, skipAgenda: false, focusTerms: [], coverHints: [], mockupHints: [] }

  const slideMatch = /(?:约|大概|控制[在为]?|一共|总共|做|生成)?\s*(\d{1,2})\s*(?:页|张|slides?|pages?)/i.exec(text)
  const parsedCount = slideMatch ? Number(slideMatch[1]) : null
  const targetSlides = Number.isInteger(parsedCount) && parsedCount >= 3 && parsedCount <= 40 ? parsedCount : null
  const skipAgenda = /不要目录|跳过目录|无需目录|no\s+agenda|skip\s+agenda/i.test(text)

  const coverHints = []
  const mockupHints = []
  for (const m of text.matchAll(/([A-Za-z0-9_\u4e00-\u9fa5-]+\.(?:png|jpe?g|webp))\s*(?:放|做|当|作为|用于|in|as|on)?\s*(封面|cover|主图|hero|样机|mockup|手机|浏览器|截图)/gi)) {
    const fn = m[1].toLowerCase()
    if (/封面|cover|主图|hero/i.test(m[2])) coverHints.push(fn)
    else mockupHints.push(fn)
  }

  const focusTerms = text
    .replace(/[，。；：、,.!！?？()（）【】[\]「」"'`]/g, ' ')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2 && !/^(?:帮我|请把|生成|制作|一个|一份|按照|要求|控制|左右|不要|跳过|封面|目录|ppt|deck|slides?|pages?|with|from|the|and|for)$/i.test(t))
    .slice(0, 14)

  return { raw: text, targetSlides, skipAgenda, focusTerms, coverHints, mockupHints }
}

function filterSheetsByInclude(sheets, includeSheets) {
  if (!Array.isArray(includeSheets) || includeSheets.length === 0) return sheets
  const needles = includeSheets.map(s => String(s ?? '').trim().toLowerCase()).filter(Boolean)
  if (needles.length === 0) return sheets
  const filtered = sheets.filter(sh => {
    const name = String(sh.name || '').toLowerCase()
    return needles.some(n => name === n || name.includes(n))
  })
  return filtered.length > 0 ? filtered : sheets
}

function applyMaxSlidesBudget(slides, maxSlides, focusTerms = []) {
  if (!Number.isInteger(maxSlides) || maxSlides < 3 || slides.length <= maxSlides) return slides
  const first = slides[0]
  const last = slides[slides.length - 1]
  const hasCover = first?.layout === 'cover'
  const hasClosing = last?.layout === 'closing'
  const middle = slides.slice(hasCover ? 1 : 0, hasClosing ? -1 : undefined)
  const keepBudget = Math.max(1, maxSlides - (hasCover ? 1 : 0) - (hasClosing ? 1 : 0))
  if (middle.length <= keepBudget) return slides

  const scored = middle.map((slide, origIdx) => {
    const hay = [slide.kicker, slide.title, slide.subtitle, slide.takeaway, ...(slide.bullets || [])].filter(Boolean).join(' ').toLowerCase()
    let score = 0
    if (slide.layout === 'kpi') score += 5
    if (slide.layout === 'chart-split' || slide.layout === 'sankey' || slide.layout === 'gantt' || slide.layout === 'marimekko') score += 4
    if (slide.layout === 'mockup' || slide.layout === 'image-right' || slide.layout === 'image-left') score += 3.5
    if (slide.layout === 'table' && /附录|Appendix|明细/i.test(`${slide.kicker || ''} ${slide.title || ''}`)) score -= 2.5
    if (slide.layout === 'agenda') score -= 1.5
    for (const term of focusTerms) {
      if (hay.includes(term.toLowerCase())) score += 3
    }
    return { slide, origIdx, score }
  })

  const chosen = [...scored]
    .sort((a, b) => b.score - a.score || a.origIdx - b.origIdx)
    .slice(0, keepBudget)
    .sort((a, b) => a.origIdx - b.origIdx)
    .map(x => x.slide)

  return [
    ...(hasCover ? [first] : []),
    ...chosen,
    ...(hasClosing ? [last] : []),
  ]
}

// ---------------------------------------------------------------------------
// Live Excel-to-dataModel Binder (bindDataModel: true)
// ---------------------------------------------------------------------------

function buildAutoDataModelFromSheets(sheetEntries = []) {
  if (!Array.isArray(sheetEntries) || sheetEntries.length === 0) return null
  const sources = []
  const metrics = []
  const bindingsBySheet = new Map()

  for (let sIdx = 0; sIdx < sheetEntries.length && sources.length < 6; sIdx += 1) {
    const entry = sheetEntries[sIdx]
    const rows = entry?.rows
    if (!Array.isArray(rows) || rows.length < 2) continue
    const headers = rows[0].slice(0, 12)
    const dataRows = rows.slice(1, 30)
    const cols = profileColumns([headers, ...dataRows])
    const numCols = cols.filter(c => c.isNumeric)
    if (numCols.length === 0) continue

    const sourceId = `sheet${sources.length + 1}`
    const cleanRows = [
      headers.map(h => cleanLine(h) || 'Col'),
      ...dataRows.map(r => headers.map((_, ci) => {
        const p = parseCellNumber(r[ci])
        if (cols[ci]?.isNumeric && p.ok) {
          return p.isPercent ? `${p.num}%` : p.num
        }
        return cleanLine(r[ci] ?? '')
      })),
    ]
    sources.push({
      id: sourceId,
      name: cleanLine(entry.name || sourceId).slice(0, 100),
      kind: 'table',
      rows: cleanRows,
    })

    const primaryCol = numCols[0]
    const colLetter = String.fromCharCode(65 + primaryCol.index)
    const catCol = cols.find(c => !c.isNumeric) || cols[0]
    const boundCells = []
    for (let rIdx = 0; rIdx < dataRows.length && metrics.length < 48; rIdx += 1) {
      const p = primaryCol.parsed[rIdx]
      if (!p?.ok) continue
      const cellAddr = `${colLetter}${rIdx + 2}`
      const metricId = `${sourceId}r${rIdx + 2}c${primaryCol.index + 1}`
      const rowLabel = cleanLine(dataRows[rIdx][catCol.index] || `Row${rIdx + 1}`)
      metrics.push({
        id: metricId,
        label: `${entry.name} · ${rowLabel} (${primaryCol.header})`.slice(0, 110),
        kind: 'source',
        source: { sourceId, cell: cellAddr },
        format: {
          style: primaryCol.isPercentCol ? 'percent' : 'number',
          digits: primaryCol.isPercentCol ? 1 : (Number.isInteger(p.num) ? 0 : 1),
          ...(!primaryCol.isPercentCol && primaryCol.unit ? { unit: primaryCol.unit.slice(0, 20) } : {}),
        },
      })
      boundCells.push({ rowIndex: rIdx, metricId, value: p.num, label: rowLabel })
    }
    if (boundCells.length > 0) {
      bindingsBySheet.set(entry.name, { sourceId, primaryCol, boundCells })
    }
  }

  if (sources.length === 0 || metrics.length === 0) return null
  return {
    dataModel: { schemaVersion: 1, sources, metrics },
    bindingsBySheet,
  }
}

function bindSlidesWithAutoDataModel(slides, autoBound) {
  if (!autoBound || !autoBound.bindingsBySheet?.size) return slides
  const usedMetrics = new Set()
  return slides.map((slide) => {
    // Bind first matching chart-split single-series primary values to {{metricId}}
    if ((slide.layout === 'chart-split' || slide.layout === 'chart') && slide.chart && Array.isArray(slide.chart.series) && slide.chart.series.length > 0) {
      const binding = autoBound.bindingsBySheet.get(slide.kicker)
      if (binding && slide.chart.kind !== 'waterfall') {
        const s0 = slide.chart.series[0]
        if (Array.isArray(s0.values) && s0.values.length === binding.boundCells.length) {
          const nextSeries = slide.chart.series.map((ser, idx) => {
            if (idx !== 0) return ser
            return {
              ...ser,
              values: binding.boundCells.map((bc) => {
                usedMetrics.add(bc.metricId)
                return `{{${bc.metricId}}}`
              }),
            }
          })
          return { ...slide, chart: { ...slide.chart, series: nextSeries } }
        }
      }
    }
    // Bind peak KPI item on Executive Summary KPI slide when available
    if (slide.layout === 'kpi' && Array.isArray(slide.items) && slide.items.length > 0) {
      const nextItems = slide.items.map((it) => {
        for (const [sheetName, binding] of autoBound.bindingsBySheet.entries()) {
          if (String(it.title || it.tag || '').includes(sheetName) && binding.boundCells.length > 0) {
            const peak = binding.boundCells.reduce((b, c) => (c.value > b.value ? c : b), binding.boundCells[0])
            usedMetrics.add(peak.metricId)
            const { unit: _dropUnit, ...restItem } = it
            return {
              ...restItem,
              value: `{{${peak.metricId}}}`,
            }
          }
        }
        return it
      })
      return { ...slide, items: nextItems }
    }
    return slide
  })
}

// ---------------------------------------------------------------------------
// Multi-Source Pack Ingestion (Directory or Mixed filePaths[] -> 1 Deck + Evidence Ledger)
// ---------------------------------------------------------------------------

const PACK_DOC_EXTS = new Set(['.docx', '.pdf'])
const PACK_DATA_EXTS = new Set(['.xlsx', '.csv', '.tsv'])
const PACK_IMG_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp'])
const MAX_PACK_FILES = 12

function packFilePriority(filePath) {
  const ext = extname(filePath).toLowerCase()
  if (PACK_DOC_EXTS.has(ext)) return 0
  if (PACK_DATA_EXTS.has(ext)) return 1
  if (PACK_IMG_EXTS.has(ext)) return 2
  return 9
}

function readImageAsDataUri(resolvedFile) {
  const stat = lstatSync(resolvedFile)
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_IMAGE_BYTES) return null
  const ext = extname(resolvedFile).toLowerCase()
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
  const buf = readFileSync(resolvedFile)
  return `data:${mime};base64,${buf.toString('base64')}`
}

function collectPackFiles(rawFilePaths, cwd, signal) {
  const resolvedFiles = []
  for (const fp of rawFilePaths) {
    abort(signal)
    const full = resolve(cwd, String(fp ?? '').trim())
    let st
    try { st = lstatSync(full) } catch { fail('找不到素材路径：' + full, 'Source path not found: ' + full) }
    if (st.isSymbolicLink()) continue
    if (st.isDirectory()) {
      const names = readdirSync(full).filter(n => !n.startsWith('.')).sort((a, b) => a.localeCompare(b))
      for (const n of names) {
        const child = join(full, n)
        try {
          const cst = lstatSync(child)
          if (!cst.isFile() || cst.isSymbolicLink()) continue
          const ext = extname(child).toLowerCase()
          if (PACK_DOC_EXTS.has(ext) || PACK_DATA_EXTS.has(ext) || PACK_IMG_EXTS.has(ext)) {
            resolvedFiles.push(child)
          }
        } catch { /* ignore unreadable child */ }
      }
    } else if (st.isFile()) {
      const ext = extname(full).toLowerCase()
      if (PACK_DOC_EXTS.has(ext) || PACK_DATA_EXTS.has(ext) || PACK_IMG_EXTS.has(ext)) {
        resolvedFiles.push(full)
      } else {
        fail('多源融合暂不支持该文件格式：' + basename(full))
      }
    }
  }
  const uniqueFiles = [...new Set(resolvedFiles)]
    .sort((a, b) => packFilePriority(a) - packFilePriority(b) || basename(a).localeCompare(basename(b)))
    .slice(0, MAX_PACK_FILES)
  if (uniqueFiles.length === 0) {
    fail('目录中未找到可导入的素材文件（支持 .xlsx / .csv / .tsv / .docx / .pdf / .png / .jpg / .webp）', 'No supported source files found')
  }
  return uniqueFiles
}

function resolvePhotoRole(photoMeta, explicitRoles = {}, parsedInstr = null) {
  const fnameLower = photoMeta.fileName.toLowerCase()
  const stemLower = photoMeta.label.toLowerCase()
  for (const [k, v] of Object.entries(explicitRoles || {})) {
    const kl = String(k).toLowerCase()
    if (kl === fnameLower || kl === stemLower || fnameLower.includes(kl)) {
      const role = String(v || '').trim().toLowerCase()
      if (['cover', 'mockup', 'mockup-mobile', 'mockup-browser', 'gallery', 'full-bleed', 'section'].includes(role)) {
        return role
      }
    }
  }
  if (parsedInstr?.coverHints?.some(h => h === fnameLower || fnameLower.includes(h))) return 'cover'
  if (parsedInstr?.mockupHints?.some(h => h === fnameLower || fnameLower.includes(h))) {
    return photoMeta.orientation === 'portrait' ? 'mockup-mobile' : 'mockup-browser'
  }
  return photoMeta.recommendedRole
}

/**
 * 精炼素材包体检模式（`inspectOnly: true`）：
 * 零耗 Token 防爆：只输出结构化摘要（Excel 统计极值+推荐图型+前5行预览、Word/PDF 章节摘要+表格维度+内嵌图尺寸、
 * 照片像素/比例/防裁歪建议、本地 `[E1..Ek]` 证据台账，以及 Mode C 外部权威检索补充计划），供 AI 按用户要求精准编排 PPT。
 */
export async function inspectOfficePack(options = {}) {
  abort(options.signal)
  const cwd = resolve(String(options.cwd ?? '.'))
  const rawList = Array.isArray(options.filePaths) && options.filePaths.length > 0
    ? options.filePaths
    : [options.filePath ?? options.path].filter(Boolean)
  if (rawList.length === 0) {
    fail('inspectOfficePack 需提供 filePath 或 filePaths')
  }

  const uniqueFiles = collectPackFiles(rawList, cwd, options.signal)
  const todayYm = new Date().toISOString().slice(0, 7)
  const sources = []
  const excelSheets = []
  const docSections = []
  const photos = []
  const localEvidence = []
  let cjkHits = 0
  let primaryTopic = cleanLine(options.title || '')

  for (let idx = 0; idx < uniqueFiles.length; idx += 1) {
    abort(options.signal)
    const file = uniqueFiles[idx]
    const fname = basename(file)
    const ext = extname(file).toLowerCase()
    const stat = lstatSync(file)
    const evId = `E${idx + 1}`

    sources.push({ fileName: fname, path: file, format: ext.slice(1), sizeBytes: stat.size })

    if (PACK_IMG_EXTS.has(ext)) {
      const meta = inspectLocalImage(file, cwd)
      cjkHits += (meta.label.match(/[\u3400-\u9fff]/g) || []).length
      photos.push({ ...meta, evidenceId: evId })
      localEvidence.push({
        id: evId,
        origin: 'local-file',
        claim: `本地视觉素材「${meta.label}」（${meta.width}×${meta.height}, ${meta.orientation}）`,
        source: fname,
        date: todayYm,
        confidence: 'verified',
      })
      continue
    }

    const single = await extractSingleOfficeFile({ ...options, filePath: file, filePaths: undefined })
    if (!primaryTopic && single.title) primaryTopic = single.title
    const sample = [single.title, ...(single.slides || []).slice(0, 4).map(s => s.title || '')].join(' ')
    cjkHits += (sample.match(/[\u3400-\u9fff]/g) || []).length

    if (PACK_DATA_EXTS.has(ext)) {
      const rawSheets = single._sheets || []
      for (const sh of rawSheets) {
        const headers = sh.rows[0] || []
        const dataRows = sh.rows.slice(1)
        const cols = profileColumns(sh.rows)
        const numCols = cols.filter(c => c.isNumeric)
        const catCol = cols.find(c => !c.isNumeric) || cols[0]
        const profiled = buildNumericSheetSlides(sh, options.lang === 'en')
        const firstSlide = profiled.slides[0]
        const topMetrics = numCols.slice(0, 3).map(nc => {
          const vals = nc.parsed.filter(p => p.ok).map(p => p.num)
          const sum = vals.reduce((a, b) => a + b, 0)
          const max = vals.length ? Math.max(...vals) : 0
          const min = vals.length ? Math.min(...vals) : 0
          const avg = vals.length ? sum / vals.length : 0
          const maxRowIdx = nc.parsed.findIndex(p => p.ok && p.num === max)
          return {
            column: nc.header,
            unit: nc.unit,
            isPercent: nc.isPercentCol,
            sum: Number(sum.toFixed(2)),
            avg: Number(avg.toFixed(2)),
            min: Number(min.toFixed(2)),
            max: Number(max.toFixed(2)),
            peakCategory: maxRowIdx >= 0 ? (dataRows[maxRowIdx]?.[catCol.index] || '') : '',
          }
        })
        excelSheets.push({
          sourceFile: fname,
          evidenceId: evId,
          sheetName: sh.name,
          bannerTitle: sh.bannerTitle || '',
          rowCount: dataRows.length,
          colCount: headers.length,
          headers,
          topMetrics,
          recommendedLayout: firstSlide?.layout || 'table',
          recommendedChartKind: firstSlide?.chart?.kind || firstSlide?.layout || 'table',
          ...(firstSlide?.chart ? { chartSpec: firstSlide.chart } : {}),
          rowsPreview: sh.rows.slice(0, 6),
        })
      }
      localEvidence.push({
        id: evId,
        origin: 'local-file',
        claim: `${fname} 数据工作簿（${rawSheets.length} 张表，${single.stats?.totalRows ?? 0} 条记录）`,
        source: fname,
        date: todayYm,
        confidence: 'verified',
      })
    } else {
      // .docx or .pdf
      const rawSecs = single._rawSections || []
      const embeddedMedia = Array.isArray(single._embeddedMedia) ? single._embeddedMedia : []
      let cachedImgMap = new Map()
      if (embeddedMedia.length > 0) {
        try {
          const cacheDir = join(cwd, '.dsh-ppt', 'office-media-cache')
          mkdirSync(cacheDir, { recursive: true })
          for (let mIdx = 0; mIdx < embeddedMedia.length; mIdx += 1) {
            const em = embeddedMedia[mIdx]
            const b64 = String(em.dataUri || '').split(',')[1]
            if (!b64) continue
            const buf = Buffer.from(b64, 'base64')
            const meta = inspectImageBytes(buf, em.name || `docx-img-${mIdx + 1}.png`)
            const safeName = `${basename(fname, extname(fname)).replace(/[^A-Za-z0-9_-]/g, '_')}-${mIdx + 1}-${basename(em.name || 'img.png').replace(/[^A-Za-z0-9._-]/g, '_')}`
            const outPath = join(cacheDir, safeName)
            writeFileSync(outPath, buf)
            cachedImgMap.set(em.dataUri, { ...meta, path: outPath })
          }
        } catch { /* read-only cwd: fall back to metadata only */ }
      }
      for (const sec of rawSecs.slice(0, 20)) {
        const secImages = (sec.images || []).map((im) => {
          const cached = cachedImgMap.get(im.src)
          return cached
            ? { fileName: cached.fileName, path: cached.path, width: cached.width, height: cached.height, orientation: cached.orientation, recommendedFocalPoint: cached.recommendedFocalPoint }
            : { fileName: im.alt || 'embedded.png' }
        })
        docSections.push({
          sourceFile: fname,
          evidenceId: evId,
          heading: sec.title,
          level: sec.level || 2,
          bulletCount: sec.bullets?.length || 0,
          summaryBullets: (sec.bullets || []).slice(0, 4).map(b => cleanLine(b).slice(0, 110)),
          tableCount: sec.tables?.length || 0,
          tableDims: (sec.tables || []).map(t => `${t.length}x${t[0]?.length || 0}`),
          hasMermaid: (sec.mermaids?.length || 0) > 0,
          hasFormula: (sec.formulas?.length || 0) > 0,
          ...(secImages.length > 0 ? { embeddedImages: secImages } : {}),
        })
      }
      localEvidence.push({
        id: evId,
        origin: 'local-file',
        claim: cleanLine(`${single.title}（${rawSecs.length} 组章节）`).slice(0, 120),
        source: fname,
        date: todayYm,
        confidence: 'verified',
      })
    }
  }

  const en = options.lang ? options.lang === 'en' : cjkHits < 4
  const topic = primaryTopic || (en ? 'Material Pack Presentation' : '多源素材汇报')
  const brandKit = loadWorkspaceBrandKit(cwd)

  const enrichmentPlan = buildHybridEnrichmentPlan({
    topic,
    instructions: options.instructions || '',
    localAssets: { excelSheets, docSections, photos },
    localEvidence,
    lang: en ? 'en' : 'zh',
    preferredSources: brandKit?.preferredSources,
    blockedDomains: brandKit?.blockedDomains,
  })

  const mdLines = [
    `# ${en ? 'Material Pack Dossier' : '本地素材包精炼档案'}：${topic}`,
    '',
    `- **${en ? 'Files' : '文件清单'}**：${sources.map(s => `${s.fileName} (${s.format})`).join(' · ')}`,
    ...(excelSheets.length ? [
      '',
      `## ${en ? 'Excel / Tabular Sheets' : '数据表画像'} (${excelSheets.length})`,
      ...excelSheets.map(sh => `- **${sh.sheetName}** (${sh.rowCount}×${sh.colCount}, [${sh.evidenceId}]) → 推荐 \`${sh.recommendedLayout}\` / \`${sh.recommendedChartKind}\`；核心指标：${sh.topMetrics.map(m => `${m.column} 峰值 ${m.peakCategory}=${m.max}${m.unit}`).join('，') || sh.headers.join('/')}`),
    ] : []),
    ...(docSections.length ? [
      '',
      `## ${en ? 'Word / PDF Sections' : '文档核心章节'} (${docSections.length})`,
      ...docSections.slice(0, 12).map(d => `- **${d.heading}** ([${d.evidenceId}], ${d.bulletCount} 条要点${d.tableCount ? `, ${d.tableCount} 表格` : ''}${d.embeddedImages?.length ? `, ${d.embeddedImages.length} 内嵌图` : ''})：${d.summaryBullets[0] || ''}`),
    ] : []),
    ...(photos.length ? [
      '',
      `## ${en ? 'Photos & Visual Assets' : '本地图片与配图体检'} (${photos.length})`,
      ...photos.map(p => `- **${p.fileName}** (${p.width}×${p.height} · ${p.orientation}, [${p.evidenceId}]) → 建议角色 \`${p.recommendedRole}\` / 版式 \`${p.recommendedLayout}\` / 焦点 \`focalPoint: "${p.recommendedFocalPoint}"\``),
    ] : []),
    '',
    enrichmentPlan.planMarkdown,
  ]

  return {
    ok: true,
    inspectOnly: true,
    topic,
    language: en ? 'en' : 'zh',
    sources,
    excelSheets,
    docSections,
    photos,
    localEvidence,
    enrichmentPlan,
    dossierMarkdown: mdLines.join('\n'),
  }
}

async function extractMultiSourcePack(rawFilePaths, options = {}) {
  const cwd = resolve(String(options.cwd ?? '.'))
  const uniqueFiles = collectPackFiles(rawFilePaths, cwd, options.signal)
  const parsedInstr = parseUserInstructions(options.instructions || '')
  const explicitPhotoRoles = options.photoRoles && typeof options.photoRoles === 'object' ? options.photoRoles : {}

  const todayYm = new Date().toISOString().slice(0, 7)
  const evidence = []
  const bodySlides = []
  const sourceSummaries = []
  const collectedSheets = []
  const pendingPhotos = []
  const formatCounts = { docs: 0, tables: 0, images: 0 }
  let detectedEn = options.lang === 'en'
  let cjkHits = 0

  for (let idx = 0; idx < uniqueFiles.length; idx += 1) {
    abort(options.signal)
    const file = uniqueFiles[idx]
    const fname = basename(file)
    const ext = extname(file).toLowerCase()
    const evId = `E${idx + 1}`

    if (PACK_IMG_EXTS.has(ext)) {
      const dataUri = readImageAsDataUri(file)
      if (!dataUri) continue
      const meta = inspectLocalImage(file, cwd)
      const role = resolvePhotoRole(meta, explicitPhotoRoles, parsedInstr)
      formatCounts.images += 1
      cjkHits += (meta.label.match(/[\u3400-\u9fff]/g) || []).length
      evidence.push({
        id: evId,
        origin: 'local-file',
        claim: `视觉素材「${meta.label}」来自本地图片文件`,
        source: fname,
        date: todayYm,
        confidence: 'verified',
      })
      pendingPhotos.push({
        ...meta,
        role,
        dataUri,
        evId,
      })
      sourceSummaries.push({ file: fname, title: meta.label, evId })
      continue
    }

    const single = await extractSingleOfficeFile({ ...options, filePath: file, filePaths: undefined })
    if (PACK_DOC_EXTS.has(ext)) formatCounts.docs += 1
    else {
      formatCounts.tables += 1
      if (Array.isArray(single._sheets)) collectedSheets.push(...single._sheets)
    }

    const innerBody = (single.slides || []).filter(s => !['cover', 'closing', 'agenda'].includes(s.layout))
    const sampleText = [single.title, ...innerBody.slice(0, 3).map(s => s.title || '')].join(' ')
    cjkHits += (sampleText.match(/[\u3400-\u9fff]/g) || []).length

    const summaryClaim = cleanLine(
      `${single.title}${innerBody[0]?.title && innerBody[0].title !== single.title ? '：' + innerBody[0].title : ''}`
    ).slice(0, 96)
    evidence.push({
      id: evId,
      origin: 'local-file',
      claim: summaryClaim || `来自 ${fname} 的业务资料`,
      source: fname,
      date: todayYm,
      confidence: 'verified',
    })
    sourceSummaries.push({ file: fname, title: single.title || fname, evId })

    for (const s of innerBody) {
      if (bodySlides.length >= 26) break
      bodySlides.push({
        ...s,
        source: s.source || fname,
        evidenceIds: [...new Set([...(Array.isArray(s.evidenceIds) ? s.evidenceIds : []), evId])],
      })
    }
  }

  if (!options.lang) detectedEn = cjkHits < 4
  const en = detectedEn

  // Smart Photo Choreography: Cover Hero / Device Mockup / Section Pair / Multi-Photo Gallery
  let coverPhoto = null
  const remainingGallery = []

  for (const ph of pendingPhotos) {
    if (ph.role === 'cover' && !coverPhoto) {
      coverPhoto = ph
      continue
    }
    if (ph.role === 'mockup' || ph.role === 'mockup-mobile' || ph.role === 'mockup-browser') {
      const variant = ph.role === 'mockup-mobile' || (ph.role === 'mockup' && ph.orientation === 'portrait') ? 'mobile' : 'browser'
      bodySlides.push({
        layout: 'mockup',
        variant,
        kicker: `PRODUCT · ${ph.evId}`,
        title: en ? `${ph.label}: Live interface showcase` : `${ph.label}：核心产品界面展示`,
        image: { src: ph.dataUri, alt: ph.label, fit: 'cover', focalPoint: ph.recommendedFocalPoint },
        bullets: [
          en ? `Captured from ${ph.fileName} (${ph.width}×${ph.height})` : `原始界面素材：${ph.fileName}（${ph.width}×${ph.height}）`,
          en ? 'Embedded in crisp device frame with focal crop preserved' : '自动匹配设备画框与焦点裁切，确保界面清晰呈现',
        ],
        source: ph.fileName,
        evidenceIds: [ph.evId],
      })
      continue
    }
    if (ph.role === 'full-bleed') {
      bodySlides.push({
        layout: 'image',
        variant: 'full-bleed',
        kicker: `VISUAL · ${ph.evId}`,
        title: ph.label,
        image: { src: ph.dataUri, alt: ph.label, fit: 'cover', focalPoint: ph.recommendedFocalPoint },
        source: ph.fileName,
        evidenceIds: [ph.evId],
      })
      continue
    }
    if (ph.role === 'gallery') {
      remainingGallery.push(ph)
      continue
    }

    // Try keyword-matching photo to an existing text/bullets slide without chart/image
    const tokens = ph.label.toLowerCase().split(/[\s_-]+/).filter(t => t.length >= 2)
    const matchIdx = tokens.length > 0
      ? bodySlides.findIndex(s =>
          !s.image && !s.images && !s.chart && ['bullets', 'cards', 'callout'].includes(s.layout) &&
          tokens.some(tk => `${s.title || ''} ${s.kicker || ''}`.toLowerCase().includes(tk))
        )
      : -1

    if (matchIdx >= 0) {
      const target = bodySlides[matchIdx]
      const pairedBullets = Array.isArray(target.bullets) && target.bullets.length > 0
        ? target.bullets.slice(0, 4)
        : (Array.isArray(target.items) ? target.items.slice(0, 4).map(it => `**${it.title || it.tag || ''}**：${it.text || ''}`) : [])
      bodySlides[matchIdx] = {
        ...target,
        layout: 'image-right',
        variant: 'framed',
        bullets: pairedBullets,
        items: undefined,
        image: { src: ph.dataUri, alt: ph.label, fit: 'cover', focalPoint: ph.recommendedFocalPoint },
        evidenceIds: [...new Set([...(target.evidenceIds || []), ph.evId])],
      }
    } else {
      remainingGallery.push(ph)
    }
  }

  // Group remaining photos into crisp 2-4 photo gallery slides, or single framed image slide
  if (remainingGallery.length >= 2) {
    for (let g = 0; g < remainingGallery.length; g += 4) {
      const chunk = remainingGallery.slice(g, g + 4)
      if (chunk.length === 1) {
        const ph = chunk[0]
        bodySlides.push({
          layout: 'image',
          variant: 'framed',
          kicker: `VISUAL · ${ph.evId}`,
          title: ph.label,
          image: { src: ph.dataUri, alt: ph.label, fit: 'contain', caption: ph.fileName },
          source: ph.fileName,
          evidenceIds: [ph.evId],
        })
      } else {
        bodySlides.push({
          layout: 'image',
          variant: 'gallery',
          kicker: en ? 'VISUAL GALLERY' : '现场与视觉图集',
          title: en ? `Visual Evidence Showcase (${chunk.length} Assets)` : `核心视觉实景图集（共 ${chunk.length} 组素材）`,
          images: chunk.map(ph => ({
            src: ph.dataUri,
            alt: ph.label,
            fit: 'cover',
            focalPoint: ph.recommendedFocalPoint,
            caption: ph.label,
          })),
          source: chunk.map(ph => ph.fileName).join(' · '),
          evidenceIds: chunk.map(ph => ph.evId),
        })
      }
    }
  } else if (remainingGallery.length === 1) {
    const ph = remainingGallery[0]
    bodySlides.push({
      layout: 'image',
      variant: 'framed',
      kicker: `VISUAL · ${ph.evId}`,
      title: ph.label,
      image: { src: ph.dataUri, alt: ph.label, fit: 'contain', caption: ph.fileName },
      source: ph.fileName,
      evidenceIds: [ph.evId],
    })
  }

  const defaultPackTitle = cleanLine(options.title || '')
    || (options.filePath && lstatSync(resolve(cwd, String(options.filePath))).isDirectory()
      ? basename(resolve(cwd, String(options.filePath)))
      : (sourceSummaries[0]?.title || (en ? 'Multi-Source Executive Briefing' : '多源资料融合汇报')))

  const partsDesc = []
  if (formatCounts.docs > 0) partsDesc.push(en ? `${formatCounts.docs} doc(s)` : `${formatCounts.docs} 份文档/PDF`)
  if (formatCounts.tables > 0) partsDesc.push(en ? `${formatCounts.tables} table(s)` : `${formatCounts.tables} 份数据表`)
  if (formatCounts.images > 0) partsDesc.push(en ? `${formatCounts.images} visual(s)` : `${formatCounts.images} 张视觉素材`)

  const coverSlide = {
    layout: 'cover',
    kicker: en ? 'MULTI-SOURCE BRIEFING' : '多源素材融合汇报',
    title: defaultPackTitle,
    subtitle: en
      ? `Synthesized from ${uniqueFiles.length} local files (${partsDesc.join(' · ')}) with [E1–E${evidence.length}] provenance`
      : `融合 ${uniqueFiles.length} 份本地资料（${partsDesc.join(' · ')}），全篇自动绑定 [E1–E${evidence.length}] 溯源台账`,
    ...(coverPhoto
      ? {
          image: {
            src: coverPhoto.dataUri,
            alt: coverPhoto.label,
            fit: 'cover',
            focalPoint: coverPhoto.recommendedFocalPoint,
          },
          evidenceIds: [coverPhoto.evId],
        }
      : {}),
  }

  const mergedSlides = [coverSlide]

  if (sourceSummaries.length >= 2 && !parsedInstr.skipAgenda) {
    mergedSlides.push({
      layout: 'agenda',
      kicker: en ? 'SOURCE PACK' : '资料目录',
      title: en ? 'Integrated Source Pack & Evidence Index' : '融合资料脉络与证据编号总览',
      items: sourceSummaries.slice(0, 6).map((item) => ({
        tag: item.evId,
        title: item.title.slice(0, 38),
        text: item.file,
      })),
    })
  }

  mergedSlides.push(...bodySlides)
  mergedSlides.push({
    layout: 'closing',
    variant: 'cta-cards',
    kicker: en ? 'NEXT STEPS' : '结论与后续推进',
    title: en ? 'Consolidated Findings & Action Plan' : '跨资料结论汇总与下一步推进计划',
    subtitle: en ? `${uniqueFiles.length} verified local sources indexed` : `共溯源 ${uniqueFiles.length} 份本地原始资料`,
    items: sourceSummaries.slice(0, 3).map((s) => ({
      tag: s.evId,
      title: s.title.slice(0, 36),
      text: s.file,
    })),
  })

  const effectiveMaxSlides = Number.isInteger(options.maxSlides) ? options.maxSlides : parsedInstr.targetSlides
  const budgetedSlides = applyMaxSlidesBudget(mergedSlides, effectiveMaxSlides, parsedInstr.focusTerms)

  return {
    ok: true,
    importedFrom: uniqueFiles.join(', '),
    importedFiles: uniqueFiles,
    title: defaultPackTitle,
    language: en ? 'en' : 'zh',
    slides: budgetedSlides,
    evidence,
    _sheets: collectedSheets,
    stats: {
      sourceFormat: 'multi-source-pack',
      fileCount: uniqueFiles.length,
      docCount: formatCounts.docs,
      tableCount: formatCounts.tables,
      imageCount: formatCounts.images,
      evidenceCount: evidence.length,
      slideCount: budgetedSlides.length,
    },
  }
}

async function extractSingleOfficeFile(options = {}) {
  abort(options.signal)
  const input = readOfficeInput(options)
  const enHint = options.lang === 'en'
  const parsedInstr = parseUserInstructions(options.instructions || '')

  if (input.format === 'xlsx') {
    const parsed = parseXlsxArchive(input.bytes)
    const sheets = filterSheetsByInclude(parsed.sheets, options.includeSheets)
    const sample = sheets.flatMap(s => s.rows.slice(0, 5).flat()).join(' ')
    const en = options.lang ? enHint : (sample.match(/[\u3400-\u9fff]/g) || []).length < 4
    const profiled = profileTabularWorkbook(sheets, input.fileName, en)
    const maxBudget = Number.isInteger(options.maxSlides) ? options.maxSlides : parsedInstr.targetSlides
    const finalSlides = applyMaxSlidesBudget(profiled.slides, maxBudget, parsedInstr.focusTerms)
    return {
      ok: true,
      importedFrom: input.resolvedPath,
      ...profiled,
      slides: finalSlides,
      stats: { ...profiled.stats, slideCount: finalSlides.length },
    }
  }

  if (input.format === 'csv' || input.format === 'tsv') {
    const rows = parseDelimitedText(input.bytes, input.format)
    const sample = rows.slice(0, 6).flat().join(' ')
    const en = options.lang ? enHint : (sample.match(/[\u3400-\u9fff]/g) || []).length < 4
    const sheetTitle = cleanLine(input.fileName.replace(/\.[^.]+$/, '')) || (en ? 'Dataset' : '数据表')
    const profiled = profileTabularWorkbook([{ name: sheetTitle, bannerTitle: '', rows }], input.fileName, en)
    const maxBudget = Number.isInteger(options.maxSlides) ? options.maxSlides : parsedInstr.targetSlides
    const finalSlides = applyMaxSlidesBudget(profiled.slides, maxBudget, parsedInstr.focusTerms)
    return {
      ok: true,
      importedFrom: input.resolvedPath,
      ...profiled,
      slides: finalSlides,
      stats: { ...profiled.stats, slideCount: finalSlides.length },
    }
  }

  if (input.format === 'pdf') {
    const parsedPdf = parsePdfDocument(input.bytes, input.fileName, options.lang)
    let slides = parsedPdf.slides
    if (parsedInstr.skipAgenda) slides = slides.filter(s => s.layout !== 'agenda')
    const maxBudget = Number.isInteger(options.maxSlides) ? options.maxSlides : parsedInstr.targetSlides
    slides = applyMaxSlidesBudget(slides, maxBudget, parsedInstr.focusTerms)
    return {
      ok: true,
      importedFrom: input.resolvedPath,
      ...parsedPdf,
      slides,
      stats: { ...parsedPdf.stats, slideCount: slides.length },
    }
  }

  const parsedDocx = parseDocxArchive(input.bytes, input.fileName)
  let slides = parsedDocx.slides
  if (parsedInstr.skipAgenda) slides = slides.filter(s => s.layout !== 'agenda')
  const maxBudget = Number.isInteger(options.maxSlides) ? options.maxSlides : parsedInstr.targetSlides
  slides = applyMaxSlidesBudget(slides, maxBudget, parsedInstr.focusTerms)
  return {
    ok: true,
    importedFrom: input.resolvedPath,
    ...parsedDocx,
    slides,
    stats: { ...parsedDocx.stats, slideCount: slides.length },
  }
}

// ---------------------------------------------------------------------------
// Public API: extractOfficeSource & importOfficeDeck
// ---------------------------------------------------------------------------

/**
 * Extract structured slides & metadata from `.xlsx`, `.csv`, `.tsv`, `.docx`, `.pdf`,
 * OR a multi-source pack (directory path or `filePaths[]` combining docs + tables + PDF + images).
 * Pass `inspectOnly: true` to return a compact Material Dossier + Hybrid Authoritative Enrichment Plan without building slides.
 */
export async function extractOfficeSource(options = {}) {
  abort(options.signal)
  if (options.inspectOnly === true) {
    return inspectOfficePack(options)
  }
  if (Array.isArray(options.filePaths) && options.filePaths.length > 0) {
    return extractMultiSourcePack(options.filePaths, options)
  }
  const rawPath = String(options.filePath ?? options.path ?? '').trim()
  if (rawPath && options.bytes === undefined) {
    const resolved = resolve(String(options.cwd ?? '.'), rawPath)
    try {
      const st = lstatSync(resolved)
      if (st.isDirectory()) {
        return extractMultiSourcePack([resolved], options)
      }
      if (st.isFile() && PACK_IMG_EXTS.has(extname(resolved).toLowerCase())) {
        return extractMultiSourcePack([resolved], options)
      }
    } catch { /* fall through to readOfficeInput error */ }
  }
  return extractSingleOfficeFile(options)
}

/**
 * Import an Office/PDF document or multi-source folder pack directly into a full dsh-ppt deck
 * (HTML slideshow + 100% native editable PPTX + JSON project + optional live dataModel binding,
 * hybrid external authoritative evidence merge, and reverse exports).
 * When `inspectOnly: true`, returns the compact Material Dossier + Mode C Enrichment Plan without writing files.
 */
export async function importOfficeDeck(options = {}) {
  abort(options.signal)
  if (options.inspectOnly === true) {
    return inspectOfficePack(options)
  }
  const extracted = await extractOfficeSource(options)
  const { buildDeckAsync } = await import('./deck-advanced.mjs')

  const requestedTheme = typeof options.theme === 'string' && options.theme.trim() ? options.theme.trim() : 'auto'
  const persona = typeof options.persona === 'string' && options.persona.trim() ? options.persona.trim() : 'auto'
  const title = (typeof options.title === 'string' && options.title.trim()) || extracted.title
  const lang = options.lang || extracted.language || 'zh'
  const inferred = requestedTheme === 'auto'
    ? inferThemeFromContent({ title, slides: extracted.slides, persona }).theme
    : requestedTheme

  const baseFileName = options.fileName ||
    (extracted.stats?.sourceFormat === 'multi-source-pack'
      ? title
      : cleanLine(basename(extracted.importedFrom || title).replace(/\.[^.]+$/, ''))) ||
    title

  const brand = options.chromeStyle
    ? { ...(options.brand && typeof options.brand === 'object' ? options.brand : {}), chromeStyle: options.chromeStyle }
    : options.brand

  let finalSlides = extracted.slides
  let autoDataModel
  if (options.bindDataModel === true && Array.isArray(extracted._sheets) && extracted._sheets.length > 0) {
    const bound = buildAutoDataModelFromSheets(extracted._sheets)
    if (bound) {
      autoDataModel = bound.dataModel
      finalSlides = bindSlidesWithAutoDataModel(finalSlides, bound)
    }
  }

  // Merge local evidence + optional external authoritative web-research evidence with zero ID collisions
  const localEv = Array.isArray(extracted.evidence) && extracted.evidence.length > 0
    ? extracted.evidence
    : (Array.isArray(options.evidence) && options.evidence.length > 0
        ? [{
            id: 'E1',
            origin: 'local-file',
            claim: cleanLine(`${title} 本地原始资料`),
            source: basename(extracted.importedFrom || title),
            date: new Date().toISOString().slice(0, 7),
            confidence: 'verified',
          }]
        : [])
  let mergedEvidence = localEv
  let hybridMergeInfo
  if (Array.isArray(options.evidence) && options.evidence.length > 0) {
    const cwd = resolve(String(options.cwd ?? '.'))
    const kit = loadWorkspaceBrandKit(cwd)
    const merged = mergeHybridEvidence(localEv, options.evidence, {
      preferredSources: kit?.preferredSources,
      blockedDomains: kit?.blockedDomains,
    })
    mergedEvidence = merged.evidence
    hybridMergeInfo = {
      localCount: merged.localCount,
      externalCount: merged.externalCount,
      remappedIds: merged.remappedIds,
    }
    // Add an authoritative external benchmark synthesis slide if external evidence wasn't already referenced
    const extOnly = merged.evidence.filter(e => e.origin === 'web-research')
    if (extOnly.length > 0) {
      const en = lang === 'en'
      const closingIdx = finalSlides.findIndex(s => s.layout === 'closing')
      const extSlide = {
        layout: 'cards',
        variant: 'pillars',
        kicker: en ? 'EXTERNAL BENCHMARKS' : '权威外部基准对标',
        title: en
          ? `Authoritative External Context Anchors ${extOnly.length} Key Benchmarks`
          : `外部权威基准校准核心判断（共引入 ${extOnly.length} 项权威外源）`,
        items: extOnly.slice(0, 4).map((e) => ({
          tag: `${e.id}${e.tier ? ` · T${e.tier}` : ''}`,
          title: cleanLine(e.source).slice(0, 28),
          text: cleanLine(e.claim).slice(0, 72) + (e.claimType === 'forecast' ? (en ? ' (Forecast)' : '（预计）') : ''),
        })),
        evidenceIds: extOnly.map(e => e.id),
        takeaway: en
          ? 'Internal metrics are benchmarked against verified external Tier 1/2 sources; full provenance is recorded in the Evidence Appendix.'
          : '内部数据已与外部权威基准完成双轨对标，完整出处、年份与原文链接详见附录溯源清单。',
      }
      if (closingIdx >= 0) {
        finalSlides = [...finalSlides.slice(0, closingIdx), extSlide, ...finalSlides.slice(closingIdx)]
      } else {
        finalSlides = [...finalSlides, extSlide]
      }
    }
  }

  const built = await buildDeckAsync({
    title,
    slides: finalSlides,
    theme: inferred,
    persona,
    lang,
    motion: options.motion,
    motionProfile: options.motionProfile,
    brand,
    ...(autoDataModel ? { dataModel: autoDataModel } : {}),
    ...(Array.isArray(mergedEvidence) && mergedEvidence.length > 0
      ? { evidence: mergedEvidence, evidenceAppendix: options.evidenceAppendix !== false }
      : {}),
    outputDir: options.outputDir || options.outDir || '.',
    fileName: baseFileName,
    overwrite: options.overwrite === true,
    smartLayout: false,
    handout: options.handout === true,
    onePager: options.onePager === true,
    ...(Array.isArray(options.exports) && options.exports.length > 0 ? { exports: options.exports } : {}),
    ...(options.targetMinutes !== undefined ? { targetMinutes: options.targetMinutes } : {}),
    cwd: options.cwd,
    signal: options.signal,
  })

  return {
    ...built,
    importedFrom: extracted.importedFrom,
    ...(extracted.importedFiles ? { importedFiles: extracted.importedFiles } : {}),
    ...(autoDataModel ? { dataModelBound: true, boundMetricCount: autoDataModel.metrics.length } : {}),
    ...(hybridMergeInfo ? { hybridEvidence: hybridMergeInfo } : {}),
    officeStats: extracted.stats,
  }
}

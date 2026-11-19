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

import { lstatSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, extname, posix, resolve } from 'node:path'
import { inflateRawSync } from 'node:zlib'
import { promoteMarkdownSlides, inferThemeFromContent } from './deck-director.mjs'

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
  if (!['xlsx', 'csv', 'tsv', 'docx'].includes(rawExt)) {
    fail('仅支持导入 .xlsx、.csv、.tsv 或 .docx 文件，当前格式：' + (rawExt || '未知'))
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
// Public API: extractOfficeSource & importOfficeDeck
// ---------------------------------------------------------------------------

/**
 * Extract structured slides & metadata from `.xlsx`, `.csv`, `.tsv`, or `.docx`.
 * Zero external new dependencies (uses Node zlib inflateRawSync + lazy csv-parse).
 */
export async function extractOfficeSource(options = {}) {
  abort(options.signal)
  const input = readOfficeInput(options)
  const enHint = options.lang === 'en'

  if (input.format === 'xlsx') {
    const { sheets } = parseXlsxArchive(input.bytes)
    const sample = sheets.flatMap(s => s.rows.slice(0, 5).flat()).join(' ')
    const en = options.lang ? enHint : (sample.match(/[\u3400-\u9fff]/g) || []).length < 4
    const profiled = profileTabularWorkbook(sheets, input.fileName, en)
    return {
      ok: true,
      importedFrom: input.resolvedPath,
      ...profiled,
    }
  }

  if (input.format === 'csv' || input.format === 'tsv') {
    const rows = parseDelimitedText(input.bytes, input.format)
    const sample = rows.slice(0, 6).flat().join(' ')
    const en = options.lang ? enHint : (sample.match(/[\u3400-\u9fff]/g) || []).length < 4
    const sheetTitle = cleanLine(input.fileName.replace(/\.[^.]+$/, '')) || (en ? 'Dataset' : '数据表')
    const profiled = profileTabularWorkbook([{ name: sheetTitle, bannerTitle: '', rows }], input.fileName, en)
    return {
      ok: true,
      importedFrom: input.resolvedPath,
      ...profiled,
    }
  }

  const parsedDocx = parseDocxArchive(input.bytes, input.fileName)
  return {
    ok: true,
    importedFrom: input.resolvedPath,
    ...parsedDocx,
  }
}

/**
 * Import an Office document (.xlsx / .csv / .tsv / .docx) directly into a full dsh-ppt deck
 * (HTML slideshow + 100% native editable PPTX + JSON project + optional handout/one-pager).
 */
export async function importOfficeDeck(options = {}) {
  abort(options.signal)
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
    cleanLine(basename(extracted.importedFrom || title).replace(/\.[^.]+$/, '')) ||
    title

  const brand = options.chromeStyle
    ? { ...(options.brand && typeof options.brand === 'object' ? options.brand : {}), chromeStyle: options.chromeStyle }
    : options.brand

  const built = await buildDeckAsync({
    title,
    slides: extracted.slides,
    theme: inferred,
    persona,
    lang,
    motion: options.motion,
    brand,
    outputDir: options.outputDir || options.outDir || '.',
    fileName: baseFileName,
    overwrite: options.overwrite === true,
    smartLayout: false,
    handout: options.handout === true,
    onePager: options.onePager === true,
    ...(options.targetMinutes !== undefined ? { targetMinutes: options.targetMinutes } : {}),
    cwd: options.cwd,
    signal: options.signal,
  })

  return {
    ...built,
    importedFrom: extracted.importedFrom,
    officeStats: extracted.stats,
  }
}

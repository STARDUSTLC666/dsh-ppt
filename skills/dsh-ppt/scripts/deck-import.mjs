/**
 * deck-import.mjs —— 外部 .pptx 全量内容提取与版式映射器（100% @office-kit/pptx + Node 内置模块，零外部依赖）。
 *
 * 提取每页真实内容：
 *   - 标题、Kicker / Eyebrow、副标题、正文段落与要点（保留粗体引导词为 **bold**）
 *   - 表格（<a:tbl> -> 矩形 rows: string[][]）
 *   - 原生图表（ppt/charts/chart*.xml -> { kind, categories, series, caption }，保留可编辑数据）
 *   - 嵌入位图（png / jpeg / webp，安全写入 assetOutDir/imported-sN-M.<ext> 或 data URI）
 *   - 演讲者备注（ppt/notesSlides/notesSlide*.xml -> slide.notes，剥离页码占位符）
 * 并智能映射为最契合的 dsh-ppt 原生版式原型：
 *   cover / section / kpi / cards / comparison / table / chart / chart-split /
 *   image-left / image-right / gallery / closing / bullets
 */

import { lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, posix, resolve, join } from 'node:path'
import { inflateSync } from 'node:zlib'
import { stripInlineMarkdown } from './deck-chrome.mjs'

const MAX_PPTX_BYTES = 64 * 1024 * 1024
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const SUPPORTED_CHART_KINDS = new Set([
  'column', 'bar', 'line', 'area', 'pie', 'doughnut',
  'stacked-column', 'stacked-bar', 'percent-column', 'percent-bar',
  'radar', 'scatter', 'waterfall', 'combo',
])

/**
 * Sanitize imported table rows so they never crash paginateTable (>8 cols or >60-char cells).
 * Preserves truncated cell details and omitted wide columns in `overflowNotes` for slide speaker notes.
 */
export function sanitizeImportedTable(rows, { maxCols = 8, maxCellChars = 60 } = {}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { rows: [], overflowNotes: [], truncatedCells: 0, droppedCols: 0 }
  }
  const rawMaxCols = Math.max(1, ...rows.map((r) => (Array.isArray(r) ? r.length : 1)))
  const keepCols = Math.max(1, Math.min(maxCols, rawMaxCols))
  const droppedCols = Math.max(0, rawMaxCols - keepCols)
  const overflowNotes = []
  let truncatedCells = 0

  const truncateCell = (raw) => {
    const str = String(raw ?? '').replace(/\s+/g, ' ').trim()
    const plain = stripInlineMarkdown(str)
    const plainChars = [...plain]
    if (plainChars.length <= maxCellChars) return str
    truncatedCells += 1
    // Slice cleanly on plain text so markdown tokens never break mid-delimiter
    const cut = plainChars.slice(0, Math.max(1, maxCellChars - 1)).join('').trimEnd() + '…'
    if (overflowNotes.length < 12) {
      overflowNotes.push(plain)
    }
    return cut
  }

  if (droppedCols > 0) {
    const headerRow = Array.isArray(rows[0]) ? rows[0] : [rows[0]]
    const droppedHeaders = headerRow.slice(keepCols).map((c, idx) => String(c ?? '').trim() || `Col ${keepCols + idx + 1}`)
    overflowNotes.push(`Omitted extra table columns (${droppedCols}): ${droppedHeaders.join(', ')}`)
  }

  const sanitized = rows.map((row) => {
    const arr = Array.isArray(row) ? row : [row]
    return Array.from({ length: keepCols }, (_, c) => truncateCell(arr[c] ?? ''))
  })

  return { rows: sanitized, overflowNotes, truncatedCells, droppedCols }
}

const KPI_NUM_RE = /(?:[$¥€£]|\b\d+(?:[.,]\d+)?\s*(?:[%％倍xX万亿千百kKmMbBtT]+|亿元|亿美元|万元|美元|元|家|个|人|次|天|小时|ms|pp|bps)?)/

function fail(zh, en) {
  throw new Error('dsh-ppt：' + zh + (en ? ' / ' + en : ''))
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

function safePartName(name) {
  const s = String(name ?? '').replace(/\\/g, '/').trim()
  if (!s) return ''
  return s.startsWith('/') ? s : '/' + s
}

function resolveRelTarget(basePart, target) {
  const clean = String(target ?? '').replace(/\\/g, '/').trim()
  if (!clean || /^[a-z][a-z0-9+.-]*:/i.test(clean)) return ''
  if (clean.startsWith('/')) return posix.normalize(clean)
  const dir = posix.dirname(safePartName(basePart))
  return posix.normalize(posix.join(dir, clean))
}

function relsPartFor(partName) {
  const p = safePartName(partName)
  const dir = posix.dirname(p)
  const base = posix.basename(p)
  return (dir === '/' ? '' : dir) + '/_rels/' + base + '.rels'
}

function safeReadPartText(lib, pres, partName) {
  if (!partName) return ''
  for (const candidate of [safePartName(partName), safePartName(partName).replace(/^\//, '')]) {
    try {
      const raw = lib.readPackagePart?.(pres, candidate)
      if (raw && raw.byteLength > 0) return Buffer.from(raw).toString('utf8')
    } catch { /* ignore missing part */ }
  }
  return ''
}

function parseRelationships(relsXml) {
  const map = new Map()
  if (!relsXml) return map
  const relRe = /<Relationship\b([^>]*)\/?>/g
  for (const m of relsXml.matchAll(relRe)) {
    const attrs = m[1]
    const id = /\bId=["']([^"']+)["']/.exec(attrs)?.[1]
    const type = /\bType=["']([^"']+)["']/.exec(attrs)?.[1] || ''
    const target = /\bTarget=["']([^"']+)["']/.exec(attrs)?.[1] || ''
    const targetMode = /\bTargetMode=["']([^"']+)["']/.exec(attrs)?.[1] || ''
    if (id && target && targetMode.toLowerCase() !== 'external') {
      map.set(id, { id, type, target })
    }
  }
  return map
}

function extractXmlTextTokens(xmlFragment) {
  const parts = []
  for (const m of String(xmlFragment ?? '').matchAll(/<a:t\b[^>]*>([\s\S]*?)<\/a:t>/g)) {
    parts.push(decodeXml(m[1]))
  }
  return parts.join('')
}

function formatRunsToMarkdown(runs) {
  if (!runs.length) return { plain: '', markdown: '', maxSizePt: 0, hasBoldLead: false }
  const merged = []
  let maxSizePt = 0
  for (const r of runs) {
    if (r.sizePt && r.sizePt > maxSizePt) maxSizePt = r.sizePt
    if (!r.text) continue
    const last = merged[merged.length - 1]
    if (last && last.bold === r.bold) {
      last.text += r.text
    } else {
      merged.push({ text: r.text, bold: Boolean(r.bold) })
    }
  }
  const plain = merged.map((r) => r.text).join('').replace(/\s+/g, ' ').trim()
  if (!plain) return { plain: '', markdown: '', maxSizePt, hasBoldLead: false }

  const hasBold = merged.some((r) => r.bold && r.text.trim().length > 0)
  const hasNonBold = merged.some((r) => !r.bold && r.text.trim().length > 0)
  if (!hasBold || !hasNonBold) {
    return { plain, markdown: plain, maxSizePt, hasBoldLead: false }
  }

  let md = ''
  let hasBoldLead = false
  merged.forEach((seg, idx) => {
    if (!seg.bold) {
      md += seg.text
      return
    }
    const leadMatch = /^(\s*)([\s\S]*?)(\s*)$/.exec(seg.text)
    const pre = leadMatch?.[1] ?? ''
    const core = leadMatch?.[2] ?? ''
    const post = leadMatch?.[3] ?? ''
    if (!core) {
      md += seg.text
      return
    }
    if (idx === 0) hasBoldLead = true
    md += pre + '**' + core + '**' + post
  })
  md = md.replace(/\*\*\s*\*\*/g, '').replace(/[ \t]+/g, ' ').trim()
  return { plain, markdown: md, maxSizePt, hasBoldLead }
}

function extractParagraphsFromTxBody(txBodyXml) {
  if (!txBodyXml) return []
  const paragraphs = []
  const pRe = /<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g
  for (const pm of txBodyXml.matchAll(pRe)) {
    const pInner = pm[1]
    const runs = []
    let pDefaultBold = false
    let pDefaultSize = 0
    let pLevel = 0
    const pPrMatch = /<a:pPr\b([^>]*?)(?:\/>|>([\s\S]*?)<\/a:pPr>)/.exec(pInner)
    if (pPrMatch) {
      const lvlM = /\blvl=["'](\d+)["']/.exec(pPrMatch[1] || '')
      if (lvlM) pLevel = Math.max(0, Math.min(3, Number(lvlM[1]) || 0))
      const defRPr = pPrMatch[2] ? /<a:defRPr\b([^>]*)>/.exec(pPrMatch[2]) : null
      if (defRPr) {
        if (/\bb=["']?(?:1|true)["']?/i.test(defRPr[1])) pDefaultBold = true
        const szM = /\bsz=["'](\d+)["']/.exec(defRPr[1])
        if (szM) pDefaultSize = Number(szM[1]) / 100
      }
    }

    const tokenRe = /<a:r\b[^>]*>([\s\S]*?)<\/a:r>|<a:fld\b([^>]*)>([\s\S]*?)<\/a:fld>|<a:br\b[^>]*\/?>/g
    for (const tm of pInner.matchAll(tokenRe)) {
      if (tm[0].startsWith('<a:br')) {
        runs.push({ text: ' ', bold: false, sizePt: pDefaultSize })
        continue
      }
      if (tm[0].startsWith('<a:fld')) {
        const fldAttrs = tm[2] || ''
        if (/\btype=["']slidenum["']/i.test(fldAttrs)) continue
        const fldInner = tm[3] || ''
        const text = extractXmlTextTokens(fldInner)
        if (text) runs.push({ text, bold: pDefaultBold, sizePt: pDefaultSize })
        continue
      }
      const rInner = tm[1] || ''
      const rPrAttrs = /<a:rPr\b([^>]*?)(?:\/>|>)/.exec(rInner)?.[1] || ''
      const isBold = /\bb=["']?(?:1|true)["']?/i.test(rPrAttrs)
        ? true
        : /\bb=["']?(?:0|false)["']?/i.test(rPrAttrs)
          ? false
          : pDefaultBold
      const szM = /\bsz=["'](\d+)["']/.exec(rPrAttrs)
      const sizePt = szM ? Number(szM[1]) / 100 : pDefaultSize
      const text = extractXmlTextTokens(rInner)
      if (text) runs.push({ text, bold: isBold, sizePt })
    }
    const formatted = formatRunsToMarkdown(runs)
    if (formatted.plain) {
      paragraphs.push({ ...formatted, level: pLevel })
    }
  }
  return paragraphs
}

function extractParagraphsFromShape(lib, shape) {
  try {
    const xml = lib.getShapeXmlString?.(shape)
    if (xml) {
      const txBody = /<p:txBody\b[^>]*>([\s\S]*?)<\/p:txBody>|<a:txBody\b[^>]*>([\s\S]*?)<\/a:txBody>/.exec(xml)
      const inner = txBody?.[1] || txBody?.[2] || ''
      if (inner) {
        const paras = extractParagraphsFromTxBody(inner)
        if (paras.length > 0) return paras
      }
    }
  } catch { /* fallback to run API */ }

  const out = []
  try {
    const pCount = lib.getShapeParagraphCount?.(shape) ?? 0
    for (let p = 0; p < pCount; p += 1) {
      const rCount = lib.getShapeRunCount?.(shape, p) ?? 0
      const runs = []
      let pLevel = 0
      try { pLevel = Math.max(0, Math.min(3, Number(lib.getParagraphLevel?.(shape, p) || 0))) } catch { pLevel = 0 }
      for (let r = 0; r < rCount; r += 1) {
        const text = lib.getShapeRunText?.(shape, p, r) ?? ''
        const fmt = lib.getShapeRunFormat?.(shape, p, r) ?? {}
        runs.push({ text, bold: Boolean(fmt.bold), sizePt: Number(fmt.size || 0) })
      }
      const formatted = formatRunsToMarkdown(runs)
      if (formatted.plain) out.push({ ...formatted, level: pLevel })
    }
  } catch { /* ignore */ }
  if (out.length === 0) {
    try {
      const raw = String(lib.getShapeText?.(shape) ?? '').trim()
      if (raw) {
        for (const line of raw.split(/\r?\n/)) {
          const t = line.trim()
          if (t) out.push({ plain: t, markdown: t, maxSizePt: 0, hasBoldLead: false, level: 0 })
        }
      }
    } catch { /* ignore */ }
  }
  return out
}

function shapeDedupKey(lib, shape) {
  try {
    const id = lib.getShapeId?.(shape)
    if (id !== undefined && id !== null && String(id).trim() !== '') {
      return `id:${String(id).trim()}`
    }
  } catch { /* ignore */ }
  try {
    const xml = lib.getShapeXmlString?.(shape)
    if (typeof xml === 'string' && xml) {
      const m = /<p:cNvPr\b[^>]*\bid=["']([^"']+)["']/.exec(xml)
      if (m?.[1]) return `id:${m[1]}`
    }
  } catch { /* ignore */ }
  return shape
}

function flattenShapes(lib, shapes) {
  const out = []
  const seen = new Set()
  const visit = (list, depth = 0) => {
    if (!Array.isArray(list) || depth > 8) return
    for (const s of list) {
      if (!s) continue
      const key = shapeDedupKey(lib, s)
      if (seen.has(key)) continue
      seen.add(key)
      let children = null
      let isGroup = false
      try {
        if (String(lib.getShapeKind?.(s) ?? '').toLowerCase() === 'group') isGroup = true
      } catch { /* ignore */ }
      try {
        children = lib.getGroupChildren?.(s)
      } catch { /* not a group */ }
      if (Array.isArray(children) && children.length > 0) {
        visit(children, depth + 1)
        continue
      }
      if (isGroup) continue
      out.push(s)
    }
  }
  visit(shapes)
  return out
}

function getBoundsNorm(lib, shape, slideW, slideH) {
  let b = null
  try {
    b = lib.getShapeBoundsResolved?.(shape)
  } catch { /* ignore */ }
  if (!b || !Number.isFinite(b.w)) {
    try { b = lib.getShapeBounds?.(shape) } catch { b = null }
  }
  if (!b || !Number.isFinite(b.w) || !Number.isFinite(b.h)) {
    return { x: 0, y: 0, w: 0, h: 0 }
  }
  return {
    x: (b.x ?? 0) / slideW,
    y: (b.y ?? 0) / slideH,
    w: (b.w ?? 0) / slideW,
    h: (b.h ?? 0) / slideH,
  }
}

// ---------------------------------------------------------------------------
// Notes Extraction (stripping slide number placeholders)
// ---------------------------------------------------------------------------

function extractNotesFromXml(notesXml, slideNumber = 0) {
  if (!notesXml) return ''
  const lines = []
  const spRe = /<p:sp\b[^>]*>([\s\S]*?)<\/p:sp>/g
  for (const sm of notesXml.matchAll(spRe)) {
    const spInner = sm[1]
    const phMatch = /<p:ph\b([^>]*)\/?>/.exec(spInner)
    const phType = phMatch ? (/\btype=["']([^"']+)["']/.exec(phMatch[1])?.[1] || '') : ''
    if (phType === 'sldImg' || phType === 'sldNum' || phType === 'hdr' || phType === 'ftr' || phType === 'dt') {
      continue
    }
    const txBody = /<p:txBody\b[^>]*>([\s\S]*?)<\/p:txBody>/.exec(spInner)?.[1] || ''
    if (!txBody) continue
    for (const p of extractParagraphsFromTxBody(txBody)) {
      if (p.plain) lines.push(p.plain)
    }
  }
  if (lines.length > 1 && slideNumber > 0 && lines[lines.length - 1].trim() === String(slideNumber)) {
    lines.pop()
  }
  return lines.join('\n').trim()
}

function extractSlideNotes(lib, pres, slide, slidePartName, slideRels, slideNumber = 0) {
  for (const rel of slideRels.values()) {
    if (/\/notesSlide$/i.test(rel.type)) {
      const notesPart = resolveRelTarget(slidePartName, rel.target)
      const notesXml = safeReadPartText(lib, pres, notesPart)
      const cleaned = extractNotesFromXml(notesXml, slideNumber)
      if (cleaned) return cleaned
    }
  }
  try {
    const fallback = String(lib.getSlideNotes?.(slide) ?? '').trim()
    if (!fallback) return ''
    return fallback
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l, idx, arr) => l && !(idx === arr.length - 1 && /^\d{1,3}$/.test(l)))
      .join('\n')
      .trim()
  } catch {
    return ''
  }
}

// ---------------------------------------------------------------------------
// Table Extraction (<a:tbl> -> rectangular string[][])
// ---------------------------------------------------------------------------

function extractTablesFromXml(slideXml) {
  if (!slideXml) return []
  const tables = []
  const tblRe = /<a:tbl\b[^>]*>([\s\S]*?)<\/a:tbl>/g
  for (const tm of slideXml.matchAll(tblRe)) {
    const rows = []
    for (const tr of tm[1].matchAll(/<a:tr\b[^>]*>([\s\S]*?)<\/a:tr>/g)) {
      const row = []
      for (const tc of tr[1].matchAll(/<a:tc\b([^>]*)(?:\/>|>([\s\S]*?)<\/a:tc>)/g)) {
        const tcAttrs = tc[1] || ''
        if (/\bhMerge=["'](?:1|true)["']/i.test(tcAttrs)) continue
        const tcInner = tc[2] || ''
        const txBody = /<a:txBody\b[^>]*>([\s\S]*?)<\/a:txBody>/.exec(tcInner)?.[1] || ''
        const cellText = extractParagraphsFromTxBody(txBody).map((p) => p.plain).join(' ').trim()
        row.push(cellText)
        const gridSpan = Number(/\bgridSpan=["'](\d+)["']/.exec(tcAttrs)?.[1] || 1)
        for (let k = 1; k < gridSpan; k += 1) row.push('')
      }
      if (row.length > 0) rows.push(row)
    }
    if (rows.length > 0) {
      const maxCols = Math.max(...rows.map((r) => r.length))
      const rect = rows.map((r) => (r.length < maxCols ? [...r, ...Array(maxCols - r.length).fill('')] : r))
      if (rect.length >= 2 && maxCols >= 1) tables.push(rect)
    }
  }
  return tables
}

function extractSlideTablesNormalized(lib, slide, slideXml) {
  const out = []
  try {
    const kitTables = lib.getSlideTables?.(slide) ?? []
    for (const tbl of kitTables) {
      const sz = lib.getTableSize?.(tbl)
      let rowCount = sz?.rows
      let colCount = sz?.cols
      if (!rowCount || !colCount) {
        const dims = lib.getTableDimensions?.(tbl)
        rowCount = dims?.rows
        colCount = dims?.cols
      }
      if (rowCount > 0 && colCount > 0) {
        const rows = []
        for (let r = 0; r < rowCount; r += 1) {
          const row = []
          for (let c = 0; c < colCount; c += 1) {
            let txt = ''
            try {
              const cell = lib.getTableCell?.(tbl, r, c)
              if (cell) txt = String(lib.getTableCellText?.(cell) ?? '').replace(/\s+/g, ' ').trim()
            } catch { /* ignore */ }
            row.push(txt)
          }
          rows.push(row)
        }
        if (rows.length >= 2) out.push(rows)
      }
    }
  } catch { /* fallback to XML */ }

  if (out.length === 0) {
    out.push(...extractTablesFromXml(slideXml))
  }
  return out
}

// ---------------------------------------------------------------------------
// Chart Extraction (ppt/charts/chart*.xml <c:cat> / <c:val> + @office-kit)
// ---------------------------------------------------------------------------

function extractPointCache(blockXml, asNumber = false) {
  if (!blockXml) return []
  const pts = []
  const ptRe = /<c:pt\b[^>]*\bidx=["'](\d+)["'][^>]*>[\s\S]*?<c:v>([\s\S]*?)<\/c:v>[\s\S]*?<\/c:pt>/g
  for (const m of blockXml.matchAll(ptRe)) {
    const idx = Number(m[1])
    const raw = decodeXml(m[2]).trim()
    pts.push({ idx, raw })
  }
  if (pts.length === 0) {
    // Fallback for multiLvlStrRef or direct <c:v> inside <c:cat>/<c:val>
    const lvlPts = []
    let fallbackIdx = 0
    for (const vm of blockXml.matchAll(/<c:v>([\s\S]*?)<\/c:v>/g)) {
      lvlPts.push({ idx: fallbackIdx++, raw: decodeXml(vm[1]).trim() })
    }
    if (lvlPts.length > 0) {
      return lvlPts.map((p) => (asNumber ? (Number.isFinite(Number(p.raw)) ? Number(p.raw) : 0) : p.raw))
    }
    return []
  }
  pts.sort((a, b) => a.idx - b.idx)
  const maxIdx = pts[pts.length - 1].idx
  const arr = Array(maxIdx + 1).fill(asNumber ? 0 : '')
  for (const p of pts) {
    if (asNumber) {
      const n = Number(p.raw.replace(/,/g, ''))
      arr[p.idx] = Number.isFinite(n) ? n : 0
    } else {
      arr[p.idx] = p.raw
    }
  }
  return arr
}

function resolvePlotTagKind(tagName, plotInner) {
  if (tagName === 'barChart' || tagName === 'bar3DChart') {
    const barDir = /<c:barDir\b[^>]*\bval=["']([^"']+)["']/.exec(plotInner)?.[1] || 'col'
    const grouping = /<c:grouping\b[^>]*\bval=["']([^"']+)["']/.exec(plotInner)?.[1] || 'clustered'
    const horiz = barDir === 'bar'
    if (grouping === 'percentStacked') return horiz ? 'percent-bar' : 'percent-column'
    if (grouping === 'stacked') return horiz ? 'stacked-bar' : 'stacked-column'
    return horiz ? 'bar' : 'column'
  }
  if (tagName === 'lineChart' || tagName === 'line3DChart') return 'line'
  if (tagName === 'areaChart' || tagName === 'area3DChart') return 'area'
  if (tagName === 'doughnutChart') return 'doughnut'
  if (tagName === 'pieChart' || tagName === 'pie3DChart') return 'pie'
  if (tagName === 'radarChart') return 'radar'
  if (tagName === 'scatterChart') return 'scatter'
  return 'column'
}

function parseChartXml(chartXml) {
  if (!chartXml || !/<c:chartSpace\b/.test(chartXml)) return null

  const titleBlock = /<c:title\b[^>]*>([\s\S]*?)<\/c:title>/.exec(chartXml)?.[1] || ''
  const caption = extractXmlTextTokens(titleBlock).replace(/\s+/g, ' ').trim()

  const plotAreaXml = /<c:plotArea\b[^>]*>([\s\S]*?)<\/c:plotArea>/.exec(chartXml)?.[1] || chartXml
  const plotRe = /<c:(barChart|bar3DChart|lineChart|line3DChart|areaChart|area3DChart|pieChart|pie3DChart|doughnutChart|radarChart|scatterChart)\b[^>]*>([\s\S]*?)<\/c:\1>/g
  const plotBlocks = []
  for (const pm of plotAreaXml.matchAll(plotRe)) {
    const blockKind = resolvePlotTagKind(pm[1], pm[2])
    const axIds = [...pm[2].matchAll(/<c:axId\b[^>]*\bval=["']([^"']+)["']/g)].map((m) => m[1])
    plotBlocks.push({ tag: pm[1], kind: blockKind, inner: pm[2], axIds })
  }
  if (plotBlocks.length === 0) {
    plotBlocks.push({ tag: 'unknown', kind: 'column', inner: chartXml, axIds: [] })
  }

  const isCombo = plotBlocks.length >= 2 && new Set(plotBlocks.map((b) => b.kind)).size >= 2
  const primaryAxIds = new Set(plotBlocks[0].axIds)
  let kind = isCombo ? 'combo' : plotBlocks[0].kind

  let categories = []
  const series = []
  const serRe = /<c:ser\b[^>]*>([\s\S]*?)<\/c:ser>/g
  let serIndex = 0
  for (let bIdx = 0; bIdx < plotBlocks.length; bIdx += 1) {
    const blk = plotBlocks[bIdx]
    const subChartKind = ['column', 'bar', 'line', 'area'].includes(blk.kind)
      ? blk.kind
      : blk.kind.includes('bar')
        ? 'bar'
        : 'column'
    const hasSecondaryAxis = bIdx > 0 && (
      (blk.axIds.length > 0 && blk.axIds.some((id) => !primaryAxIds.has(id))) ||
      (subChartKind === 'line' && plotBlocks[0].kind !== 'line')
    )
    for (const sm of blk.inner.matchAll(serRe)) {
      if (series.length >= 6) break
      serIndex += 1
      const serInner = sm[1]
      const txBlock = /<c:tx\b[^>]*>([\s\S]*?)<\/c:tx>/.exec(serInner)?.[1] || ''
      let name = ''
      const directV = /<c:v>([\s\S]*?)<\/c:v>/.exec(txBlock)
      if (directV) name = decodeXml(directV[1]).trim()
      if (!name) name = 'Series ' + serIndex

      const catBlock = /<c:cat\b[^>]*>([\s\S]*?)<\/c:cat>/.exec(serInner)?.[1] ||
        /<c:xVal\b[^>]*>([\s\S]*?)<\/c:xVal>/.exec(serInner)?.[1] || ''
      if (categories.length === 0 && catBlock) {
        categories = extractPointCache(catBlock, false).map((v, i) => String(v || i + 1))
      }

      const valBlock = /<c:val\b[^>]*>([\s\S]*?)<\/c:val>/.exec(serInner)?.[1] ||
        /<c:yVal\b[^>]*>([\s\S]*?)<\/c:yVal>/.exec(serInner)?.[1] || ''
      const values = extractPointCache(valBlock, true)
      if (values.length > 0) {
        series.push({
          name,
          values,
          ...(isCombo ? { chartKind: subChartKind, ...(hasSecondaryAxis ? { secondaryAxis: true } : {}) } : {}),
        })
      }
    }
  }

  if (series.length === 0) return null
  if (isCombo && series.length < 2) kind = plotBlocks[0].kind
  const maxLen = Math.max(categories.length, ...series.map((s) => s.values.length))
  if (maxLen === 0) return null
  if (categories.length < maxLen) {
    for (let i = categories.length; i < maxLen; i += 1) categories.push(String(i + 1))
  }
  const normalizedSeries = series.map((s, idx) => ({
    name: s.name,
    values: categories.map((_, ci) => (Number.isFinite(s.values[ci]) ? s.values[ci] : 0)),
    ...(kind === 'combo' && s.chartKind ? { chartKind: s.chartKind } : {}),
    ...(kind === 'combo' && s.secondaryAxis && idx > 0 ? { secondaryAxis: true } : {}),
  }))

  return {
    kind: SUPPORTED_CHART_KINDS.has(kind) ? kind : 'column',
    categories,
    series: normalizedSeries,
    ...(caption ? { caption } : {}),
  }
}

function extractSlideChartsNormalized(lib, pres, slide, slidePartName, slideRels, slideW, slideH) {
  const out = []

  // 1) Try reading chart XML parts directly from slide relationships (<c:cat>/<c:val> caches)
  for (const rel of slideRels.values()) {
    if (/\/chart$/i.test(rel.type)) {
      const chartPart = resolveRelTarget(slidePartName, rel.target)
      const chartXml = safeReadPartText(lib, pres, chartPart)
      const parsed = parseChartXml(chartXml)
      if (parsed) out.push({ chart: parsed, bounds: null })
    }
  }

  // 2) Cross-check with @office-kit/pptx getSlideCharts for bounding boxes and fallback specs
  try {
    const kitCharts = lib.getSlideCharts?.(slide) ?? []
    kitCharts.forEach((entry, idx) => {
      const bounds = entry.shape ? getBoundsNorm(lib, entry.shape, slideW, slideH) : null
      if (out[idx]) {
        out[idx].bounds = bounds
      } else if (entry.spec && Array.isArray(entry.spec.series) && entry.spec.series.length > 0) {
        const rawKind = String(entry.spec.kind || 'column')
        const kind = SUPPORTED_CHART_KINDS.has(rawKind) ? rawKind : 'column'
        const categories = Array.isArray(entry.spec.categories) && entry.spec.categories.length > 0
          ? entry.spec.categories.map((c) => String(c))
          : entry.spec.series[0].values.map((_, i) => String(i + 1))
        out.push({
          chart: {
            kind,
            categories,
            series: entry.spec.series.map((s, si) => ({
              name: String(s.name || `Series ${si + 1}`),
              values: categories.map((_, ci) => {
                const v = Number(s.values?.[ci])
                return Number.isFinite(v) ? v : 0
              }),
            })),
            ...(entry.spec.title ? { caption: String(entry.spec.title) } : {}),
          },
          bounds,
        })
      }
    })
  } catch { /* ignore */ }

  return out
}

// ---------------------------------------------------------------------------
// Image Extraction (PNG / JPEG / WebP)
// ---------------------------------------------------------------------------

function inspectRasterImage(bytes) {
  if (!bytes || bytes.byteLength < 24 || bytes.byteLength > MAX_IMAGE_BYTES) return null
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)

  // PNG
  if (buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    if (buf.length < 45 || buf.toString('ascii', 12, 16) !== 'IHDR') return null
    const width = buf.readUInt32BE(16)
    const height = buf.readUInt32BE(20)
    if (!width || !height || width > 16000 || height > 16000) return null
    let offset = 8
    let ended = false
    const compressed = []
    while (offset + 12 <= buf.length) {
      const length = buf.readUInt32BE(offset)
      const type = buf.toString('ascii', offset + 4, offset + 8)
      if (offset + length + 12 > buf.length) return null
      if (type === 'IDAT') compressed.push(buf.subarray(offset + 8, offset + 8 + length))
      if (type === 'IEND') { ended = true; break }
      offset += length + 12
    }
    if (!ended || compressed.length === 0) return null
    try { inflateSync(Buffer.concat(compressed), { maxOutputLength: 128 * 1024 * 1024 }) } catch { return null }
    return { width, height, mime: 'image/png', ext: 'png', bytes: buf }
  }

  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2
    let width = 0
    let height = 0
    while (offset + 4 < buf.length) {
      if (buf[offset] !== 0xff) break
      while (offset < buf.length && buf[offset] === 0xff) offset += 1
      if (offset >= buf.length) break
      const marker = buf[offset++]
      if (marker === 0xd9 || marker === 0xda) break
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
      if (offset + 2 > buf.length) return null
      const length = buf.readUInt16BE(offset)
      if (length < 2 || offset + length > buf.length) return null
      if ([0xc0, 0xc1, 0xc2].includes(marker) && length >= 7) {
        height = buf.readUInt16BE(offset + 3)
        width = buf.readUInt16BE(offset + 5)
      }
      offset += length
    }
    if (!buf.subarray(-2).equals(Buffer.from([0xff, 0xd9])) || !width || !height) return null
    return { width, height, mime: 'image/jpeg', ext: 'jpg', bytes: buf }
  }

  // WebP (RIFF....WEBP)
  if (buf.length >= 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = buf.toString('ascii', 12, 16)
    let width = 0
    let height = 0
    if (chunk === 'VP8 ' && buf.length >= 30) {
      width = buf.readUInt16LE(26) & 0x3fff
      height = buf.readUInt16LE(28) & 0x3fff
    } else if (chunk === 'VP8L' && buf.length >= 25) {
      const bits = buf.readUInt32LE(21)
      width = (bits & 0x3fff) + 1
      height = ((bits >> 14) & 0x3fff) + 1
    } else if (chunk === 'VP8X' && buf.length >= 30) {
      width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16))
      height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16))
    }
    if (width > 0 && height > 0 && width <= 16000 && height <= 16000) {
      return { width, height, mime: 'image/webp', ext: 'webp', bytes: buf }
    }
  }

  return null
}

function extractSlideImages(lib, pres, slide, slideIndex, slidePartName, slideRels, slideW, slideH, assetOutDir, extractedAssets) {
  const shapes = flattenShapes(lib, lib.getSlideShapes(slide))
  const seenHashes = new Set()
  const items = []

  const pushImage = (info, bounds, alt) => {
    if (!info || info.width < 8 || info.height < 8) return
    const digest = createHash('sha256').update(info.bytes).digest('hex')
    if (seenHashes.has(digest)) return
    seenHashes.add(digest)

    const imgNum = items.length + 1
    let src
    let writtenPath
    if (assetOutDir) {
      mkdirSync(assetOutDir, { recursive: true })
      const safeName = `imported-s${slideIndex + 1}-${imgNum}.${info.ext}`
      writtenPath = resolve(assetOutDir, safeName)
      writeFileSync(writtenPath, info.bytes)
      src = writtenPath
    } else {
      src = `data:${info.mime};base64,${info.bytes.toString('base64')}`
    }

    const cleanAlt = String(alt || '').trim() || `Slide ${slideIndex + 1} image ${imgNum}`
    items.push({
      src,
      alt: cleanAlt,
      fit: 'contain',
      bounds,
      width: info.width,
      height: info.height,
    })
    extractedAssets.push({
      slide: slideIndex + 1,
      ...(writtenPath ? { path: writtenPath } : {}),
      mime: info.mime,
      width: info.width,
      height: info.height,
    })
  }

  for (const shape of shapes) {
    try {
      if (!lib.hasShapeImage?.(shape)) continue
      const rawBytes = lib.getShapeImageBytes?.(shape)
      const info = inspectRasterImage(rawBytes)
      if (!info) continue
      const bounds = getBoundsNorm(lib, shape, slideW, slideH)
      const alt = lib.getShapeDescription?.(shape) || lib.getShapeAltTitle?.(shape) || lib.getShapeName?.(shape)
      pushImage(info, bounds, alt)
    } catch { /* ignore unreadable shape image */ }
  }

  // Fallback: inspect slide relationship image parts via getMediaParts
  if (items.length === 0) {
    try {
      const mediaParts = lib.getMediaParts?.(pres) ?? []
      const mediaByName = new Map()
      for (const mp of mediaParts) {
        if (mp?.partName && mp?.bytes) mediaByName.set(safePartName(mp.partName), mp.bytes)
      }
      for (const rel of slideRels.values()) {
        if (/\/image$/i.test(rel.type)) {
          const targetPart = safePartName(resolveRelTarget(slidePartName, rel.target))
          const rawBytes = mediaByName.get(targetPart) || (() => {
            try { return lib.readPackagePart?.(pres, targetPart) } catch { return null }
          })()
          const info = inspectRasterImage(rawBytes)
          if (info) pushImage(info, { x: 0.5, y: 0.2, w: 0.4, h: 0.5 }, '')
        }
      }
    } catch { /* ignore */ }
  }

  return items
}

// ---------------------------------------------------------------------------
// Text Shapes & Archetype Inference
// ---------------------------------------------------------------------------

function extractTextShapes(lib, slide, slideW, slideH) {
  const shapes = flattenShapes(lib, lib.getSlideShapes(slide))
  const textShapes = []

  for (const shape of shapes) {
    try {
      if (lib.isTableShape?.(shape) || lib.isChartShape?.(shape) || lib.hasShapeImage?.(shape)) continue
      if (lib.isShapeHidden?.(shape)) continue
    } catch { /* ignore */ }

    let phType = ''
    let shapeName = ''
    try { phType = String(lib.getShapePlaceholderType?.(shape) || '').toLowerCase() } catch { phType = '' }
    try { shapeName = String(lib.getShapeName?.(shape) || '').trim() } catch { shapeName = '' }
    if (phType === 'sldnum' || phType === 'dt' || phType === 'ftr' || phType === 'hdr') continue
    if (/^(?:slide\s*number|brand\s*footer)$/i.test(shapeName)) continue

    const paragraphs = extractParagraphsFromShape(lib, shape)
    if (paragraphs.length === 0) continue

    const bounds = getBoundsNorm(lib, shape, slideW, slideH)
    const plainJoined = paragraphs.map((p) => p.plain).join(' ').trim()
    // Skip corner page-number badges (e.g. "2", "02 / 08", "Page 2")
    if (bounds.y > 0.86 && plainJoined.length <= 16 && /^(?:\d{1,3}(?:\s*\/\s*\d{1,3})?|page\s*\d+|第\s*\d+\s*页)$/i.test(plainJoined)) continue

    const maxSizePt = Math.max(...paragraphs.map((p) => p.maxSizePt || 0), 0)
    textShapes.push({
      phType,
      bounds,
      paragraphs,
      plainJoined,
      maxSizePt,
    })
  }

  return textShapes
}

function shapeToCardItem(shapeObj) {
  const paras = shapeObj.paragraphs
  if (paras.length === 0) return null
  if (paras.length === 1) {
    const p = paras[0]
    const boldColon = /^\*\*([^*]+)\*\*\s*[:：—-]?\s*([\s\S]*)$/.exec(p.markdown)
    if (boldColon) {
      return { title: boldColon[1].trim(), text: boldColon[2].trim(), markdown: p.markdown }
    }
    const colonMatch = /^([^:：]{1,20})[:：]\s*([\s\S]+)$/.exec(p.plain)
    if (colonMatch) {
      return { title: colonMatch[1].trim(), text: colonMatch[2].trim(), markdown: `**${colonMatch[1].trim()}**：${colonMatch[2].trim()}` }
    }
    return { title: p.plain, text: '', markdown: p.markdown }
  }
  const heading = paras[0].plain
  const rest = paras.slice(1).map((p) => p.markdown)
  const restPlain = paras.slice(1).map((p) => p.plain).join(' ').trim()
  const markdown = restPlain ? `**${heading}**：${restPlain}` : paras[0].markdown
  return {
    title: heading,
    text: restPlain,
    bullets: rest.length > 1 ? rest : undefined,
    markdown,
  }
}

function detectKpiItem(card) {
  const combined = `${card.title} ${card.text || ''}`.trim()
  const numMatch = /([-+]?(?:[$¥€£]\s*)?\d+(?:,\d{3})*(?:\.\d+)?\s*(?:[%％倍xX万亿千百kKmMbBtT]+|亿元|亿美元|万元|美元|元|家|个|人|次|天|小时|ms|pp|bps)?)/.exec(combined)
  if (!numMatch) return null
  const value = numMatch[1].replace(/\s+/g, '')
  const label = combined.replace(numMatch[0], '').replace(/^[:：—\-\s]+|[:：—\-\s]+$/g, '').trim()
  return {
    title: label || card.title,
    value,
    ...(card.text && card.text !== value ? { text: card.text } : {}),
  }
}

function classifyAndBuildSlide(raw, slideIndex, totalSlides) {
  const { textShapes, tables, charts, images, notes } = raw
  let titleShape = null
  let kickerShape = null
  let subtitleShape = null

  // 1) Pick Title shape
  titleShape = textShapes.find((s) => s.phType === 'ctrtitle' || s.phType === 'title') || null
  if (!titleShape && textShapes.length > 0) {
    const topCandidates = textShapes
      .filter((s) => s.bounds.y <= 0.45)
      .sort((a, b) => (b.maxSizePt - a.maxSizePt) || (a.bounds.y - b.bounds.y))
    titleShape = topCandidates[0] || textShapes[0]
  }

  // 2) Pick Kicker / Eyebrow above title
  if (titleShape) {
    kickerShape = textShapes.find((s) =>
      s !== titleShape &&
      s.bounds.y + s.bounds.h <= titleShape.bounds.y + 0.04 &&
      s.plainJoined.length <= 42 &&
      (s.maxSizePt === 0 || titleShape.maxSizePt === 0 || s.maxSizePt < titleShape.maxSizePt)
    ) || null
  }

  // 3) Pick Subtitle shape
  subtitleShape = textShapes.find((s) => s !== titleShape && s !== kickerShape && s.phType === 'subtitle') || null
  if (!subtitleShape && titleShape) {
    const titleStr = titleShape.paragraphs.map((p) => p.plain).join(' ').trim()
    const isFramingSlide = tables.length === 0 && charts.length === 0 && images.length === 0
    const isCoverOrEnd = isFramingSlide && (
      slideIndex === 0 ||
      (slideIndex === totalSlides - 1 && totalSlides >= 3 && /谢谢|感谢|Q\s*&\s*A|Thank|Contact|Next\s*Step/i.test(titleStr))
    )
    if (isCoverOrEnd) {
      subtitleShape = textShapes.find((s) =>
        s !== titleShape &&
        s !== kickerShape &&
        s.bounds.y >= titleShape.bounds.y &&
        !s.paragraphs.some((p) => p.hasBoldLead) &&
        (slideIndex === 0 ? s.paragraphs.length <= 2 : s.paragraphs.length === 1)
      ) || null
    } else {
      const remainingCount = textShapes.filter((s) => s !== titleShape && s !== kickerShape).length
      subtitleShape = textShapes.find((s) =>
        s !== titleShape &&
        s !== kickerShape &&
        s.paragraphs.length === 1 &&
        s.bounds.w >= 0.45 &&
        s.bounds.h <= 0.14 &&
        s.bounds.y >= titleShape.bounds.y &&
        s.bounds.y <= titleShape.bounds.y + Math.max(0.16, titleShape.bounds.h + 0.06) &&
        s.plainJoined.length <= 90 &&
        !s.paragraphs.some((p) => p.hasBoldLead) &&
        (remainingCount > 1 || isFramingSlide)
      ) || null
    }
  }

  const usedShapes = new Set([titleShape, kickerShape, subtitleShape].filter(Boolean))
  const bodyShapes = textShapes
    .filter((s) => !usedShapes.has(s))
    .sort((a, b) => (Math.abs(a.bounds.y - b.bounds.y) < 0.08 ? a.bounds.x - b.bounds.x : a.bounds.y - b.bounds.y))

  const title = titleShape ? titleShape.paragraphs.map((p) => p.plain).join(' ').trim() : `Slide ${slideIndex + 1}`
  const kicker = kickerShape ? kickerShape.plainJoined : undefined
  const subtitle = subtitleShape ? subtitleShape.paragraphs.map((p) => p.plain).join(' ').trim() : undefined

  const bullets = []
  for (const s of bodyShapes) {
    if (bodyShapes.length >= 2 && s.paragraphs.length >= 2 && s.paragraphs[0].plain.length <= 36) {
      const card = shapeToCardItem(s)
      if (card) bullets.push(card.markdown)
    } else {
      for (const p of s.paragraphs) {
        const lvl = Number(p.level || 0)
        bullets.push(lvl > 0 ? `${'↳ '.repeat(Math.min(2, lvl))}${p.markdown}` : p.markdown)
      }
    }
  }

  const base = {
    title,
    ...(kicker ? { kicker } : {}),
    ...(subtitle ? { subtitle } : {}),
    ...(notes ? { notes } : {}),
    ...(raw.hidden ? { hidden: true } : {}),
  }

  // Priority 1: Table
  if (tables.length > 0) {
    const takeaway = bullets.length > 0 ? bullets[0] : undefined
    const safeTbl = sanitizeImportedTable(tables[0], { maxCols: 8, maxCellChars: 60 })
    const mergedNotes = [base.notes, ...safeTbl.overflowNotes.map((n) => `[Full Table Data] ${n}`)]
      .filter(Boolean)
      .join('\n')
    return {
      ...base,
      ...(mergedNotes ? { notes: mergedNotes } : {}),
      layout: 'table',
      rows: safeTbl.rows,
      ...(takeaway ? { takeaway } : {}),
    }
  }

  // Priority 2: Chart / Chart-Split
  if (charts.length > 0) {
    const primaryChart = charts[0]
    const hasSplitContent = bullets.length >= 1 || (primaryChart.bounds && primaryChart.bounds.w > 0 && primaryChart.bounds.w < 0.68 && bodyShapes.length > 0)
    if (hasSplitContent && bullets.length > 0) {
      return {
        ...base,
        layout: 'chart-split',
        chart: primaryChart.chart,
        bullets: bullets.slice(0, 5),
      }
    }
    return {
      ...base,
      layout: 'chart',
      chart: primaryChart.chart,
      ...(bullets.length > 0 ? { takeaway: bullets[0] } : {}),
    }
  }

  // Priority 3: Embedded Images (Gallery vs Image-Left / Image-Right)
  if (images.length >= 2) {
    return {
      ...base,
      layout: 'gallery',
      images: images.slice(0, 4).map(({ src, alt, fit }) => ({ src, alt, fit })),
      ...(bullets.length > 0 ? { bullets: bullets.slice(0, 4) } : {}),
    }
  }
  if (images.length === 1) {
    const img = images[0]
    const center = (img.bounds?.x ?? 0.5) + (img.bounds?.w ?? 0.4) / 2
    const layout = center < 0.5 ? 'image-left' : 'image-right'
    return {
      ...base,
      layout,
      image: { src: img.src, alt: img.alt, fit: img.fit },
      ...(bullets.length > 0 ? { bullets: bullets.slice(0, 5) } : {}),
    }
  }

  // Priority 4: Framing slides (Cover / Closing / Section)
  if (slideIndex === 0 && (titleShape?.phType === 'ctrtitle' || (bodyShapes.length <= 1 && bullets.length <= 2))) {
    return {
      ...base,
      layout: 'cover',
      ...(bullets.length > 0 && !base.subtitle ? { subtitle: bullets.join(' · ') } : {}),
    }
  }

  if (
    slideIndex === totalSlides - 1 &&
    totalSlides >= 3 &&
    ((bodyShapes.length <= 1 && bullets.length <= 2) || /谢谢|感谢|Q\s*&\s*A|Thank|Contact|Next\s*Step/i.test(title))
  ) {
    return {
      ...base,
      layout: 'closing',
      ...(bullets.length > 0 ? { bullets } : {}),
    }
  }

  if (slideIndex > 0 && (titleShape?.phType === 'sechdr' || (bodyShapes.length === 0 && bullets.length === 0))) {
    return {
      ...base,
      layout: 'section',
    }
  }

  // Priority 5: Multi-shape structured cards -> KPI / Comparison / Cards
  if (bodyShapes.length >= 2 && bodyShapes.length <= 6) {
    const cards = bodyShapes.map(shapeToCardItem).filter(Boolean)
    const kpiCandidates = cards.map(detectKpiItem)
    const kpiCount = kpiCandidates.filter(Boolean).length

    if (cards.length >= 2 && cards.length <= 4 && kpiCount >= Math.ceil(cards.length * 0.6)) {
      return {
        ...base,
        layout: 'kpi',
        variant: 'grid',
        items: kpiCandidates.map((k, idx) => k || { title: cards[idx].title, value: cards[idx].text || cards[idx].title }),
        bullets,
      }
    }

    if (cards.length === 2) {
      const sideBySide = Math.abs(bodyShapes[0].bounds.x - bodyShapes[1].bounds.x) > 0.18
      if (sideBySide) {
        return {
          ...base,
          layout: 'comparison',
          variant: /问题|痛点|风险|issue|risk/i.test(title) ? 'issue-action' : 'versus',
          items: cards.map((c) => ({
            title: c.title,
            ...(c.text ? { text: c.text } : {}),
            ...(c.bullets ? { bullets: c.bullets } : {}),
          })),
          bullets,
        }
      }
    }

    if (cards.length >= 3 && cards.length <= 6) {
      return {
        ...base,
        layout: 'cards',
        variant: cards.length === 4 ? 'bento' : 'pillars',
        items: cards.map((c) => ({
          title: c.title,
          ...(c.text ? { text: c.text } : {}),
          ...(c.bullets ? { bullets: c.bullets } : {}),
        })),
        bullets,
      }
    }
  }

  // Check bullet-level KPI when single text shape contains 2-4 numeric bullets
  if (bullets.length >= 2 && bullets.length <= 4) {
    const kpis = bullets.map((b) => {
      const plain = b.replace(/\*\*/g, '')
      const colon = /^([^:：]{1,22})[:：]\s*([\s\S]+)$/.exec(plain)
      const num = KPI_NUM_RE.exec(colon ? colon[2] : plain)
      if (!num || !/\d/.test(num[0])) return null
      return {
        title: colon ? colon[1].trim() : plain.replace(num[0], '').trim() || plain,
        value: num[0].trim(),
        ...(colon && colon[2].trim() !== num[0].trim() ? { text: colon[2].trim() } : {}),
      }
    })
    if (kpis.every(Boolean)) {
      return {
        ...base,
        layout: 'kpi',
        variant: 'grid',
        items: kpis,
        bullets,
      }
    }
  }

  // Priority 6: Bullets fallback
  return {
    ...base,
    layout: 'bullets',
    ...(bullets.length > 0 ? { bullets } : {}),
  }
}

/**
 * Extract full structured slide content from an external .pptx file or Buffer.
 * @param {object} options
 * @param {string} [options.pptxPath]
 * @param {Uint8Array} [options.bytes]
 * @param {string} [options.cwd='.']
 * @param {string} [options.assetOutDir]
 * @param {AbortSignal} [options.signal]
 */
export async function extractPptxSlides(options = {}) {
  options.signal?.throwIfAborted()
  const cwd = resolve(String(options.cwd ?? '.'))
  const assetOutDir = options.assetOutDir ? resolve(cwd, String(options.assetOutDir)) : null

  let bytes
  let resolvedPath
  if (options.bytes instanceof Uint8Array) {
    bytes = options.bytes
    if (typeof options.pptxPath === 'string' && options.pptxPath.trim()) {
      resolvedPath = resolve(cwd, options.pptxPath.trim())
    }
  } else {
    if (typeof options.pptxPath !== 'string' || !options.pptxPath.trim()) {
      fail('请提供要导入的 .pptx 文件路径 pptxPath', 'pptxPath is required')
    }
    resolvedPath = resolve(cwd, options.pptxPath.trim())
    let stat
    try {
      stat = lstatSync(resolvedPath)
    } catch {
      fail('找不到要导入的 PPTX 文件：' + resolvedPath, 'PPTX file not found: ' + resolvedPath)
    }
    if (!stat.isFile() || stat.isSymbolicLink()) {
      fail('导入的 PPTX 必须是普通文件（不支持目录或符号链接）', 'PPTX must be a regular file')
    }
    if (stat.size < 22 || stat.size > MAX_PPTX_BYTES) {
      fail('导入的 PPTX 文件大小需在 64 MiB 以内', 'PPTX must be up to 64 MiB')
    }
    bytes = readFileSync(resolvedPath)
  }

  if (!bytes || bytes.byteLength < 22 || bytes.byteLength > MAX_PPTX_BYTES || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    fail('文件不是有效的 .pptx 压缩包', 'Invalid .pptx archive')
  }

  options.signal?.throwIfAborted()
  let lib
  try {
    lib = await import('@office-kit/pptx')
  } catch (error) {
    fail('导入解析 PPTX 需要 @office-kit/pptx@0.21.0。独立技能请在技能目录运行 npm install --ignore-scripts。' + error.message)
  }
  options.signal?.throwIfAborted()

  let pres
  try {
    pres = await lib.loadPresentation(bytes)
  } catch (error) {
    fail('无法解析 PPTX 结构：' + error.message, 'Failed to parse PPTX: ' + error.message)
  }
  options.signal?.throwIfAborted()

  const rawSlides = lib.getSlides(pres) ?? []
  if (rawSlides.length === 0) {
    fail('PPTX 文件中没有任何幻灯片页面', 'PPTX contains no slides')
  }

  const rawSize = lib.getSlideSize(pres)
  const slideW = rawSize?.width ?? 12192000
  const slideH = rawSize?.height ?? 6858000
  const extractedAssets = []
  let chartCount = 0
  let tableCount = 0
  let notesCount = 0

  const rawContents = rawSlides.map((slide, idx) => {
    options.signal?.throwIfAborted()
    const slidePartName = safePartName(lib.getSlidePartName?.(slide) || `/ppt/slides/slide${idx + 1}.xml`)
    const slideXml = (() => {
      try { return lib.getSlideXmlString?.(slide) || safeReadPartText(lib, pres, slidePartName) } catch { return safeReadPartText(lib, pres, slidePartName) }
    })()
    const slideRelsXml = safeReadPartText(lib, pres, relsPartFor(slidePartName))
    const slideRels = parseRelationships(slideRelsXml)

    const textShapes = extractTextShapes(lib, slide, slideW, slideH)
    const tables = extractSlideTablesNormalized(lib, slide, slideXml)
    const charts = extractSlideChartsNormalized(lib, pres, slide, slidePartName, slideRels, slideW, slideH)
    const images = extractSlideImages(lib, pres, slide, idx, slidePartName, slideRels, slideW, slideH, assetOutDir, extractedAssets)
    const notes = extractSlideNotes(lib, pres, slide, slidePartName, slideRels, idx + 1)
    let hidden = false
    try { if (lib.isSlideHidden?.(slide) === true) hidden = true } catch { /* ignore */ }
    if (!hidden && /<p:sld\b[^>]*\bshow=["']0["']/.test(slideXml)) hidden = true

    chartCount += charts.length
    tableCount += tables.length
    if (notes) notesCount += 1

    return { textShapes, tables, charts, images, notes, hidden }
  })

  const slides = rawContents.map((raw, idx) => classifyAndBuildSlide(raw, idx, rawContents.length))

  let coreTitle = ''
  try { coreTitle = String(lib.getCoreProperties?.(pres)?.title || '').trim() } catch { coreTitle = '' }
  const firstTitle = String(slides[0]?.title || '').trim()
  const title = (firstTitle && firstTitle !== 'Slide 1' ? firstTitle : coreTitle) || 'Imported Presentation'

  return {
    ok: true,
    title,
    slideSize: {
      width: Number((slideW / 914400).toFixed(3)),
      height: Number((slideH / 914400).toFixed(3)),
      widthEmu: slideW,
      heightEmu: slideH,
    },
    slides,
    extractedAssets,
    stats: {
      slideCount: slides.length,
      chartCount,
      tableCount,
      imageCount: extractedAssets.length,
      notesCount,
    },
  }
}

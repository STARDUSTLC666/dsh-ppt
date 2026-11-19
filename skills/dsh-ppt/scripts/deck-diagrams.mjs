/**
 * deck-diagrams.mjs —— dsh-ppt 的 10 套重型咨询与工程图示编译器：
 * gantt / architecture / harvey / tam / org / marimekko / sankey / value-chain / swot / process。
 *
 * 零外部运行时依赖，仅使用 Node 内置模块。
 */

import { relativeLuminance, mixHex } from './deck-themes.mjs'
import {
  CANVAS_IN,
  roundRectAdj,
  escapeXml,
  escapeHtml,
  stripInlineMarkdown,
  renderInlineHtml,
  computeTextFit,
  resolveEffectiveItems,
  VALID_STATUS,
  statusPalette,
  isNumericCell,
  ooxmlRichParagraph,
  ooxmlShape,
  ooxmlCustGeomShape,
  ooxmlLine,
  computeBadgePillWidth,
  renderSurfaceCardPptx,
} from './deck-chrome.mjs'

const ZERO_MARGINS = Object.freeze({ l: 0, r: 0, t: 0, b: 0 })

export const DIAGRAM_LAYOUTS = new Set([
  'gantt',
  'architecture',
  'harvey',
  'tam',
  'org',
  'marimekko',
  'sankey',
  'value-chain',
  'swot',
  'process',
])

export function parseHarveyValue(rawCell) {
  const clean = stripInlineMarkdown(String(rawCell ?? '')).trim()
  const lower = clean.toLowerCase()
  if (lower === 'full' || lower === '100%' || clean === '●') return { kind: 'harvey', pct: 100, label: '100%' }
  if (lower === '75%' || clean === '◕') return { kind: 'harvey', pct: 75, label: '75%' }
  if (lower === '50%' || lower === 'half' || clean === '◑') return { kind: 'harvey', pct: 50, label: '50%' }
  if (lower === '25%' || clean === '◔') return { kind: 'harvey', pct: 25, label: '25%' }
  if (lower === '0%' || lower === 'none' || clean === '○') return { kind: 'harvey', pct: 0, label: '0%' }
  if (lower === 'yes' || clean === '✓') return { kind: 'check', ok: true, label: '✓' }
  if (lower === 'no' || clean === '✗') return { kind: 'check', ok: false, label: '✗' }
  return null
}

function findHarveyOursCol(headerRow, cols) {
  const hit = headerRow.findIndex((h) => /ours|本方案|我们|dsh|推荐|self|\bour\b/i.test(stripInlineMarkdown(h)))
  if (hit >= 0) return hit
  return cols >= 3 ? cols - 1 : -1
}

function renderHarveyBallPptx(parsed, cx, cy, sizeIn, isOurs, nextIdFn, theme, langAttr) {
  const tk = theme.tokens
  const x = cx - sizeIn / 2
  const y = cy - sizeIn / 2
  const fillCol = isOurs ? tk.accentPrimary : tk.inkPrimary
  const ringCol = isOurs ? tk.accentPrimary : tk.inkMuted
  const bgCol = isOurs ? tk.accentSoft : tk.canvas
  const shapes = []

  if (parsed.kind === 'check') {
    const badgeFill = parsed.ok ? (isOurs ? tk.accentPrimary : tk.positive) : tk.surface2
    const badgeFg = parsed.ok ? '#FFFFFF' : tk.inkMuted
    shapes.push(ooxmlShape(nextIdFn(), 'Harvey Check', { x, y, w: sizeIn, h: sizeIn }, {
      preset: 'ellipse',
      fill: badgeFill,
      stroke: parsed.ok ? '' : tk.hairline,
      strokePt: 0.75,
      anchor: 'ctr',
      marginsIn: ZERO_MARGINS,
      paragraphs: [ooxmlRichParagraph(parsed.ok ? '✓' : '✗', { sizePt: 11.5, color: badgeFg, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.body, lineHeight: 1.0 })],
    }))
    return shapes.join('')
  }

  if (parsed.pct === 100) {
    shapes.push(ooxmlShape(nextIdFn(), 'Harvey 100', { x, y, w: sizeIn, h: sizeIn }, { preset: 'ellipse', fill: fillCol, stroke: fillCol, strokePt: 1.0 }))
    return shapes.join('')
  }

  // Base empty ring
  shapes.push(ooxmlShape(nextIdFn(), 'Harvey Ring', { x, y, w: sizeIn, h: sizeIn }, { preset: 'ellipse', fill: bgCol, stroke: parsed.pct === 0 ? ringCol : fillCol, strokePt: 1.25 }))

  if (parsed.pct > 0) {
    // 25%: 12 o'clock (270deg) to 3 o'clock (360deg); 50%: 12 to 6 (90deg); 75%: 12 to 9 (180deg)
    const startAng = 16200000
    const endAng = parsed.pct === 25 ? 21600000 : parsed.pct === 50 ? 5400000 : 10800000
    shapes.push(ooxmlShape(nextIdFn(), 'Harvey Slice', { x, y, w: sizeIn, h: sizeIn }, {
      preset: 'pie',
      adjs: { adj1: startAng, adj2: endAng },
      fill: fillCol,
      stroke: '',
    }))
  }

  return shapes.join('')
}

export function renderHarveyMatrixPptx(slide, area, nextIdFn, chromeCfg, theme, langAttr) {
  const tk = theme.tokens
  const items = resolveEffectiveItems(slide)
  const rawRows = Array.isArray(slide.rows) && slide.rows.length > 0
    ? slide.rows
    : items.length > 0
      ? [['评估维度', '行业基线', '本方案 / Ours'], ...items.map((it) => [it.title || '', it.delta || '50%', it.value || (it.status === 'positive' ? 'full' : 'full')])]
      : [['维度', '本方案 / Ours'], ['能力项', 'full']]
  const safeRows = rawRows.slice(0, 9)
  const cols = Math.max(2, ...safeRows.map((r) => r.length))
  const headerRow = Array.from({ length: cols }, (_, c) => String(safeRows[0]?.[c] ?? ''))
  const oursCol = findHarveyOursCol(headerRow, cols)

  // Compute proportional column widths (first col wider for criteria label)
  const firstColW = Math.min(4.6, Math.max(2.8, area.w * (cols <= 3 ? 0.44 : 0.34)))
  const otherW = (area.w - firstColW) / Math.max(1, cols - 1)
  const colXs = []
  const colWs = []
  let cursorX = area.x
  for (let c = 0; c < cols; c += 1) {
    const w = c === 0 ? firstColW : otherW
    colXs.push(cursorX)
    colWs.push(w)
    cursorX += w
  }

  const rowCount = safeRows.length
  const rowH = Math.min(0.62, Math.max(0.40, area.h / Math.max(1, rowCount)))
  const startY = area.y + Math.max(0, (area.h - rowH * rowCount) / 2)
  const shapes = []
  const cellPreset = chromeCfg.cardRadiusPx > 0 ? 'roundRect' : 'rect'

  safeRows.forEach((row, rIdx) => {
    const isHeader = rIdx === 0
    const y = startY + rIdx * rowH
    for (let c = 0; c < cols; c += 1) {
      const cellText = String(row[c] ?? '')
      const isOurs = c === oursCol
      const x = colXs[c]
      const w = colWs[c]
      const cellFill = isHeader
        ? (isOurs ? tk.accentPrimary : tk.surface2)
        : (isOurs ? tk.accentSoft : (rIdx % 2 === 0 ? tk.surface1 : tk.canvas))

      shapes.push(ooxmlShape(nextIdFn(), 'Harvey Cell ' + rIdx + '-' + c, { x, y, w, h: rowH }, { preset: isHeader && c === 0 ? cellPreset : 'rect', adj: 0, fill: cellFill, stroke: isOurs ? tk.accentPrimary : tk.hairline, strokePt: isOurs ? 0.75 : 0.5 }))

      const parsed = !isHeader && c > 0 ? parseHarveyValue(cellText) : null
      if (parsed) {
        const ballSize = Math.min(0.28, rowH * 0.56)
        shapes.push(renderHarveyBallPptx(parsed, x + w / 2, y + rowH / 2, ballSize, isOurs, nextIdFn, theme, langAttr))
      } else {
        shapes.push(ooxmlShape(nextIdFn(), 'Harvey Text ' + rIdx + '-' + c, { x: x + 0.08, y: y + 0.03, w: w - 0.16, h: rowH - 0.06 }, {
          txBox: true,
          anchor: 'ctr',
          marginsIn: { l: 0.04, r: 0.04, t: 0.01, b: 0.01 },
          paragraphs: [
            ooxmlRichParagraph(cellText, {
              sizePt: isHeader ? 13.5 : (cols >= 6 ? 12 : 13.5),
              color: isHeader && isOurs ? tk.inkOnAccent : (isOurs ? tk.accentText : tk.inkPrimary),
              bold: isHeader || isOurs,
              lang: langAttr,
              align: c === 0 ? 'l' : 'ctr',
              font: isHeader ? theme.fonts.heading : theme.fonts.body,
              lineHeight: 1.18,
            }),
          ],
        }))
      }
    }
  })

  return shapes.join('')
}

function monogramLetters(name) {
  const clean = stripInlineMarkdown(String(name ?? ''))
    .replace(/\s*(?:博士|教授|先生|女士|院士|院长|主任|总|Ph\.?D\.?|M\.?D\.?|MBA).*$/i, '')
    .trim()
  if (!clean) return 'T'
  if (/[\u4E00-\u9FFF]/.test(clean)) {
    return clean.replace(/\s+/g, '').slice(0, 1)
  }
  const parts = clean.split(/\s+/).filter(Boolean)
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : clean.slice(0, 2).toUpperCase()
}

// ---------------------------------------------------------------------------
// Phase 4 Pinnacle Layouts 1..4（Marimekko / Sankey / Porter Value Chain / SWOT）
// ---------------------------------------------------------------------------

function extractNumberAndUnit(raw) {
  const s = stripInlineMarkdown(String(raw ?? '')).trim()
  if (!s) return { num: 0, unit: '', raw: '' }
  const parenMatch = /[（(]\s*([¥$€£]?\s*[+-]?\d[\d,.]*)\s*([^)）]*)[)）]/.exec(s)
  if (parenMatch) {
    const num = parseFloat(parenMatch[1].replace(/[¥$€£,\s]/g, ''))
    const prefixSym = /^[¥$€£]/.exec(parenMatch[1].trim())?.[0] ?? ''
    const suffixUnit = parenMatch[2].trim()
    return {
      num: Number.isFinite(num) ? Math.abs(num) : 0,
      unit: suffixUnit || prefixSym,
      prefixSym,
      label: parenMatch[1].trim() + (suffixUnit ? suffixUnit : ''),
      cleanTitle: s.replace(parenMatch[0], '').trim(),
    }
  }
  const direct = /([¥$€£]?\s*[+-]?\d[\d,.]*)\s*([%％万亿元美元BmkMKTb]*)/.exec(s)
  if (direct) {
    const num = parseFloat(direct[1].replace(/[¥$€£,\s]/g, ''))
    const prefixSym = /^[¥$€£]/.exec(direct[1].trim())?.[0] ?? ''
    const suffixUnit = direct[2].trim()
    return {
      num: Number.isFinite(num) ? Math.abs(num) : 0,
      unit: suffixUnit || prefixSym,
      prefixSym,
      label: direct[1].trim() + suffixUnit,
      cleanTitle: s.replace(direct[0], '').replace(/^[·:：\-—\s]+|[·:：\-—\s]+$/g, '').trim() || s,
    }
  }
  return { num: 0, unit: '', prefixSym: '', label: '', cleanTitle: s }
}

const OURS_SERIES_RE = /本方案|我们|ours|dsh|推荐|自有|\bour\b|\bself\b/i

export function computeMarimekkoModel(slide, langOrAttr = 'zh') {
  const isEn = langOrAttr === 'en' || langOrAttr === 'en-US'
  const rawRows = Array.isArray(slide.rows) ? slide.rows.filter((r) => Array.isArray(r) && r.length >= 2) : []

  if (rawRows.length >= 2) {
    const headerRow = rawRows[0].map((c) => stripInlineMarkdown(c))
    const colCount = Math.min(7, headerRow.length - 1)
    const parsedHeaders = Array.from({ length: colCount }, (_, i) => {
      const cell = headerRow[i + 1] ?? ('S' + (i + 1))
      const ext = extractNumberAndUnit(cell)
      return { title: ext.cleanTitle || cell, weight: ext.num, unit: ext.unit, prefixSym: ext.prefixSym || '', sizeLabel: ext.label }
    })

    // 判断第 1 行是否为独立市场规模/权重行
    let seriesStartRow = 1
    if (rawRows.length >= 3) {
      const row1Label = stripInlineMarkdown(rawRows[1][0] ?? '')
      const row1Cells = rawRows[1].slice(1, colCount + 1).map((c) => String(c ?? ''))
      const explicitWeightRow = /规模|容量|体量|权重|总额|size|weight|tam|market|volume/i.test(row1Label)
      const headersLackWeights = parsedHeaders.every((h) => h.weight <= 0)
      const row1NoPct = !row1Cells.some((c) => /[%％]/.test(c))
      const row1Nums = row1Cells.map((c) => extractNumberAndUnit(c))
      const row1Sum = row1Nums.reduce((s, x) => s + x.num, 0)
      if (explicitWeightRow || (headersLackWeights && row1NoPct && row1Sum > 105)) {
        seriesStartRow = 2
        row1Nums.forEach((n, idx) => {
          if (n.num > 0) {
            parsedHeaders[idx].weight = n.num
            parsedHeaders[idx].unit = n.unit || parsedHeaders[idx].unit
            parsedHeaders[idx].prefixSym = n.prefixSym || parsedHeaders[idx].prefixSym
            parsedHeaders[idx].sizeLabel = n.label
          }
        })
      }
    }

    const totalRawWeight = parsedHeaders.reduce((s, h) => s + (h.weight > 0 ? h.weight : 0), 0)
    const effectiveWeights = parsedHeaders.map((h) => (totalRawWeight > 0 ? (h.weight > 0 ? h.weight : totalRawWeight / colCount * 0.35) : 100 / colCount))
    const weightSum = effectiveWeights.reduce((a, b) => a + b, 0) || 1
    const dominantUnit = parsedHeaders.find((h) => h.unit && h.unit !== '%')?.unit ?? ''
    const dominantPrefix = parsedHeaders.find((h) => h.prefixSym)?.prefixSym ?? ''

    const seriesRows = rawRows.slice(seriesStartRow, seriesStartRow + 6)
    const seriesNames = seriesRows.map((r, idx) => stripInlineMarkdown(r[0] || (isEn ? 'Segment ' + (idx + 1) : '竞争方 ' + (idx + 1))))

    let cursorX = 0
    const columns = parsedHeaders.map((h, cIdx) => {
      const widthRatio = effectiveWeights[cIdx] / weightSum
      const colStart = cursorX
      cursorX += widthRatio

      const rawVals = seriesRows.map((r) => {
        const num = extractNumberAndUnit(r[cIdx + 1] ?? '0').num
        return num > 0 ? num : 0
      })
      const colSum = rawVals.reduce((a, b) => a + b, 0) || 1
      let cursorY = 0
      const segments = seriesNames.map((sName, sIdx) => {
        const heightRatio = rawVals[sIdx] / colSum
        const seg = {
          seriesName: sName,
          seriesIndex: sIdx,
          rawVal: rawVals[sIdx],
          heightRatio,
          sharePct: Math.round(heightRatio * 100),
          yRatio: cursorY,
          isOurs: OURS_SERIES_RE.test(sName),
        }
        cursorY += heightRatio
        return seg
      })

      return {
        title: h.title,
        weight: effectiveWeights[cIdx],
        sizeLabel: h.sizeLabel || (Math.round(widthRatio * 100) + '%'),
        widthRatio,
        xRatio: colStart,
        segments,
      }
    })

    const seriesSummary = seriesNames.map((name, sIdx) => {
      const weightedShare = columns.reduce((acc, col) => acc + col.widthRatio * (col.segments[sIdx]?.heightRatio ?? 0), 0)
      return { name, index: sIdx, weightedPct: Math.round(weightedShare * 100), isOurs: OURS_SERIES_RE.test(name) }
    })

    const totalLabel = totalRawWeight > 0
      ? (dominantPrefix + (Number.isInteger(totalRawWeight) ? totalRawWeight.toLocaleString('en-US') : totalRawWeight.toFixed(1)) + (dominantUnit && dominantUnit !== dominantPrefix ? ' ' + dominantUnit : ''))
      : '100%'

    return { columns, seriesSummary, totalLabel, hasExplicitWeights: totalRawWeight > 0 }
  }

  // 从 items[] / bullets[] 归一构建 Marimekko 模型
  const rawItems = resolveEffectiveItems(slide).slice(0, 7)
  const items = rawItems.length > 0
    ? rawItems
    : [
        { title: isEn ? 'Enterprise' : '政企市场', value: '450', unit: isEn ? 'B' : '亿', bullets: [(isEn ? 'Ours: 42%' : '本方案: 42%'), (isEn ? 'Peer B: 33%' : '厂商B: 33%'), (isEn ? 'Others: 25%' : '其他: 25%')] },
        { title: isEn ? 'Finance' : '金融信创', value: '320', unit: isEn ? 'B' : '亿', bullets: [(isEn ? 'Ours: 36%' : '本方案: 36%'), (isEn ? 'Peer B: 39%' : '厂商B: 39%'), (isEn ? 'Others: 25%' : '其他: 25%')] },
      ]

  const seriesOrder = []
  const ensureSeries = (name) => {
    const key = name.trim()
    let idx = seriesOrder.indexOf(key)
    if (idx < 0 && seriesOrder.length < 6) {
      idx = seriesOrder.length
      seriesOrder.push(key)
    }
    return idx
  }

  const parsedCols = items.map((it, idx) => {
    const valInfo = it.value
      ? extractNumberAndUnit(it.value + (it.unit ? it.unit : ''))
      : extractNumberAndUnit(it.title || '')
    const rawSegLines = Array.isArray(it.bullets) && it.bullets.length > 0
      ? it.bullets
      : (it.text ? it.text.split(/\s*[|｜;；]\s*/) : [])
    const segPairs = rawSegLines.map((line, lIdx) => {
      const cleanLine = stripInlineMarkdown(line)
      const kv = /^([^:：]+?)[：:\s]\s*([+-]?\d+(?:\.\d+)?)\s*[%％]?/.exec(cleanLine)
        || /^(.+?)\s+([+-]?\d+(?:\.\d+)?)\s*[%％]$/.exec(cleanLine)
      if (kv) {
        const sName = kv[1].trim()
        ensureSeries(sName)
        return { name: sName, val: Math.max(0, parseFloat(kv[2]) || 0) }
      }
      const fallbackNum = extractNumberAndUnit(cleanLine)
      const sName = fallbackNum.cleanTitle || (isEn ? 'Tier ' + (lIdx + 1) : '份额 ' + (lIdx + 1))
      ensureSeries(sName)
      return { name: sName, val: fallbackNum.num > 0 ? fallbackNum.num : 100 / Math.max(1, rawSegLines.length) }
    })
    if (segPairs.length === 0) {
      const defaultName = isEn ? 'Ours' : '本方案'
      const restName = isEn ? 'Others' : '其他厂商'
      const pVal = valInfo.num > 0 && valInfo.unit === '%' ? Math.min(100, valInfo.num) : 45
      ensureSeries(defaultName)
      ensureSeries(restName)
      segPairs.push({ name: defaultName, val: pVal }, { name: restName, val: Math.max(0, 100 - pVal) })
    }
    return {
      title: (it.value ? (it.title || ('S' + (idx + 1))) : (valInfo.cleanTitle || it.title || ('S' + (idx + 1)))),
      weight: valInfo.unit !== '%' && valInfo.num > 0 ? valInfo.num : 0,
      unit: it.unit || (valInfo.unit !== '%' ? valInfo.unit : ''),
      prefixSym: valInfo.prefixSym || '',
      sizeLabel: it.value ? (it.value + (it.unit || '')) : (valInfo.unit !== '%' ? valInfo.label : ''),
      segPairs,
    }
  })

  const totalRawWeight = parsedCols.reduce((s, c) => s + (c.weight > 0 ? c.weight : 0), 0)
  const effWeights = parsedCols.map((c) => (totalRawWeight > 0 ? (c.weight > 0 ? c.weight : totalRawWeight / parsedCols.length * 0.35) : 100 / parsedCols.length))
  const weightSum = effWeights.reduce((a, b) => a + b, 0) || 1
  const domUnit = parsedCols.find((c) => c.unit)?.unit ?? ''
  const domPrefix = parsedCols.find((c) => c.prefixSym)?.prefixSym ?? ''

  let cursorX = 0
  const columns = parsedCols.map((col, cIdx) => {
    const widthRatio = effWeights[cIdx] / weightSum
    const xRatio = cursorX
    cursorX += widthRatio

    const valBySeries = seriesOrder.map((sName) => {
      const hit = col.segPairs.find((p) => p.name === sName)
      return hit ? hit.val : 0
    })
    const colSum = valBySeries.reduce((a, b) => a + b, 0) || 1
    let cursorY = 0
    const segments = seriesOrder.map((sName, sIdx) => {
      const heightRatio = valBySeries[sIdx] / colSum
      const seg = {
        seriesName: sName,
        seriesIndex: sIdx,
        rawVal: valBySeries[sIdx],
        heightRatio,
        sharePct: Math.round(heightRatio * 100),
        yRatio: cursorY,
        isOurs: OURS_SERIES_RE.test(sName),
      }
      cursorY += heightRatio
      return seg
    })

    return {
      title: col.title,
      weight: effWeights[cIdx],
      sizeLabel: col.sizeLabel || (Math.round(widthRatio * 100) + '%'),
      widthRatio,
      xRatio,
      segments,
    }
  })

  const seriesSummary = seriesOrder.map((name, sIdx) => {
    const weightedShare = columns.reduce((acc, col) => acc + col.widthRatio * (col.segments[sIdx]?.heightRatio ?? 0), 0)
    return { name, index: sIdx, weightedPct: Math.round(weightedShare * 100), isOurs: OURS_SERIES_RE.test(name) }
  })

  const totalLabel = totalRawWeight > 0
    ? (domPrefix + (Number.isInteger(totalRawWeight) ? totalRawWeight.toLocaleString('en-US') : totalRawWeight.toFixed(1)) + (domUnit && domUnit !== domPrefix ? ' ' + domUnit : ''))
    : '100%'

  return { columns, seriesSummary, totalLabel, hasExplicitWeights: totalRawWeight > 0 }
}

function mekkoSeriesPalette(theme, seriesSummary) {
  const tk = theme.tokens
  const baseColors = [
    tk.accentPrimary,
    tk.accentSecondary,
    mixHex(tk.accentPrimary, theme.dark ? '#94A3B8' : '#475569', 0.48),
    mixHex(tk.accentSecondary, theme.dark ? '#334155' : '#CBD5E1', 0.45),
    theme.dark ? '#334155' : '#CBD5E1',
    theme.dark ? '#1E293B' : '#E2E8F0',
  ]
  return seriesSummary.map((s, idx) => {
    const fill = s.isOurs ? tk.accentPrimary : baseColors[(idx + (seriesSummary[0]?.isOurs ? 0 : 1)) % baseColors.length]
    const lum = relativeLuminance(fill)
    const ink = lum < 0.40 ? '#FFFFFF' : '#0F172A'
    return { fill, ink }
  })
}

function renderMarimekkoPptx(slide, area, nextIdFn, chromeCfg, theme, langAttr) {
  const tk = theme.tokens
  const isEn = langAttr === 'en-US'
  const model = computeMarimekkoModel(slide, langAttr)
  const palette = mekkoSeriesPalette(theme, model.seriesSummary)
  const shapes = []

  const legendW = 2.34
  const gapLegend = 0.26
  const plotX = area.x
  const plotW = area.w - legendW - gapLegend
  const headerH = 0.58
  const axisH = 0.38
  const gridY = area.y + headerH + 0.04
  const gridH = Math.max(2.2, area.h - headerH - axisH - 0.08)

  // 1. 顶部列宽市场容量标题 + 不等宽 100% 堆叠矩形网格
  model.columns.forEach((col, cIdx) => {
    const cx = plotX + col.xRatio * plotW
    const cw = Math.max(0.28, col.widthRatio * plotW)

    // 列顶标题 + 规模标签（窄列自动收敛至 8pt 零内边距，确保 5 字区域名如“中东及拉美”单行不折字）
    const isNarrowCol = cw < 0.95
    const headFontPt = cw >= 1.65 ? 11.5 : cw >= 1.15 ? 10 : cw >= 0.95 ? 9 : cw >= 0.60 ? 8 : 7.5
    shapes.push(ooxmlShape(nextIdFn(), 'Mekko Col Header ' + (cIdx + 1), { x: isNarrowCol ? cx : cx + 0.02, y: area.y, w: isNarrowCol ? Math.max(0.28, cw) : Math.max(0.24, cw - 0.04), h: headerH }, {
      txBox: true,
      anchor: 'b',
      marginsIn: { l: isNarrowCol ? 0 : 0.02, r: isNarrowCol ? 0 : 0.02, t: 0, b: 0.03 },
      paragraphs: [
        ooxmlRichParagraph(col.title, { sizePt: headFontPt, color: tk.inkPrimary, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.heading, lineHeight: 1.12, spaceAfterPt: 1 }),
        ooxmlRichParagraph(col.sizeLabel, { sizePt: isNarrowCol ? 7.5 : Math.max(8.5, headFontPt - 1), color: tk.accentText, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.body, lineHeight: 1.08 }),
      ],
    }))

    col.segments.forEach((seg, sIdx) => {
      if (seg.heightRatio <= 0.002) return
      const sy = gridY + seg.yRatio * gridH
      const sh = Math.max(0.04, seg.heightRatio * gridH)
      const pal = palette[sIdx] ?? { fill: tk.surface2, ink: tk.inkPrimary }
      const pctText = seg.sharePct + '%'
      const showTwoLines = sh >= 0.50 && cw >= 1.22
      const showPctOnly = !showTwoLines && sh >= 0.25 && cw >= 0.72

      const paras = showTwoLines
        ? [
            ooxmlRichParagraph(seg.seriesName, { sizePt: cw >= 1.6 ? 11 : 10, color: pal.ink, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.body, lineHeight: 1.1, spaceAfterPt: 1 }),
            ooxmlRichParagraph(pctText, { sizePt: cw >= 1.6 ? 12 : 10.5, color: pal.ink, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.heading, lineHeight: 1.05 }),
          ]
        : showPctOnly
          ? [
              ooxmlRichParagraph(pctText, { sizePt: 10, color: pal.ink, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.heading, lineHeight: 1.0 }),
            ]
          : []

      shapes.push(ooxmlShape(nextIdFn(), 'Mekko Cell ' + (cIdx + 1) + '-' + (sIdx + 1), { x: cx, y: sy, w: cw, h: sh }, {
        preset: 'rect',
        fill: pal.fill,
        stroke: tk.canvas,
        strokePt: 1.5,
        anchor: 'ctr',
        autofit: false,
        marginsIn: { l: 0.04, r: 0.04, t: 0.02, b: 0.02 },
        paragraphs: paras,
      }))
    })
  })

  // 2. 底部 0%..100% 市场宽度累计坐标轴
  const axisY = gridY + gridH + 0.08
  shapes.push(ooxmlLine(nextIdFn(), 'Mekko Width Axis', { x: plotX, y: axisY }, { x: plotX + plotW, y: axisY }, { color: tk.inkMuted, widthPt: 1.0 }))
  ;[0, 25, 50, 75, 100].forEach((tick) => {
    const tx = plotX + (tick / 100) * plotW
    shapes.push(ooxmlLine(nextIdFn(), 'Mekko Tick ' + tick, { x: tx, y: axisY }, { x: tx, y: axisY + 0.06 }, { color: tk.inkMuted, widthPt: 0.75 }))
    const lblW = 0.68
    const lblX = tick === 0 ? tx : tick === 100 ? tx - lblW : tx - lblW / 2
    const algn = tick === 0 ? 'l' : tick === 100 ? 'r' : 'ctr'
    shapes.push(ooxmlShape(nextIdFn(), 'Mekko Tick Label ' + tick, { x: lblX, y: axisY + 0.07, w: lblW, h: 0.24 }, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: ZERO_MARGINS,
      paragraphs: [ooxmlRichParagraph(tick + '%', { sizePt: 9.5, color: tk.inkMuted, lang: langAttr, align: algn, font: theme.fonts.body, lineHeight: 1.0 })],
    }))
  })

  // 3. 右侧总市场规模 + 系列图例卡片
  const legX = plotX + plotW + gapLegend
  const legBox = { x: legX, y: gridY, w: legendW, h: gridH }
  shapes.push(renderSurfaceCardPptx('Mekko Legend Card', legBox, { fill: tk.surface1, focal: false }, nextIdFn, chromeCfg, theme))

  shapes.push(ooxmlShape(nextIdFn(), 'Mekko Total Summary', { x: legX + 0.16, y: gridY + 0.14, w: legendW - 0.32, h: 0.78 }, {
    txBox: true,
    anchor: 't',
    marginsIn: ZERO_MARGINS,
    paragraphs: [
      ooxmlRichParagraph(isEn ? 'TOTAL MARKET' : '总市场规模', { sizePt: 9.5, color: tk.inkMuted, bold: true, lang: langAttr, font: theme.fonts.body, spc: 90, spaceAfterPt: 2 }),
      ooxmlRichParagraph(model.totalLabel, { sizePt: 20, color: tk.accentText, bold: true, lang: langAttr, font: theme.fonts.heading, lineHeight: 1.1 }),
    ],
  }))
  shapes.push(ooxmlLine(nextIdFn(), 'Mekko Legend Rule', { x: legX + 0.16, y: gridY + 0.98 }, { x: legX + legendW - 0.16, y: gridY + 0.98 }, { color: tk.hairline, widthPt: 0.75 }))

  const itemStartY = gridY + 1.12
  const availLegH = Math.max(1.0, gridH - 1.24)
  const itemStepY = Math.min(0.46, availLegH / Math.max(1, model.seriesSummary.length))
  model.seriesSummary.forEach((s, idx) => {
    const iy = itemStartY + idx * itemStepY
    const pal = palette[idx] ?? { fill: tk.surface2 }
    shapes.push(ooxmlShape(nextIdFn(), 'Mekko Swatch ' + (idx + 1), { x: legX + 0.18, y: iy + 0.08, w: 0.18, h: 0.18 }, { preset: 'rect', fill: pal.fill, stroke: tk.hairline, strokePt: 0.5 }))
    shapes.push(ooxmlShape(nextIdFn(), 'Mekko Series Label ' + (idx + 1), { x: legX + 0.44, y: iy, w: legendW - 0.58, h: 0.34 }, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: ZERO_MARGINS,
      paragraphs: [ooxmlRichParagraph(s.name + '  **' + s.weightedPct + '%**', { sizePt: 11, color: s.isOurs ? tk.accentText : tk.inkPrimary, bold: s.isOurs, lang: langAttr, font: theme.fonts.body, lineHeight: 1.15 })],
    }))
  })

  return shapes.join('')
}

function renderMarimekkoHtml(slide, theme, langId) {
  const isEn = langId === 'en'
  const model = computeMarimekkoModel(slide, langId)
  const palette = mekkoSeriesPalette(theme, model.seriesSummary)

  return (
    '<div class="mekko-board">' +
    '<div class="mekko-main">' +
    '<div class="mekko-headers">' +
    model.columns.map((col) =>
      '<div class="mekko-col-head" style="flex:' + col.widthRatio.toFixed(5) + ' 0 0%">' +
      '<strong class="mekko-col-title">' + escapeHtml(col.title) + '</strong>' +
      '<span class="mekko-col-size">' + escapeHtml(col.sizeLabel) + '</span>' +
      '</div>',
    ).join('') +
    '</div>' +
    '<div class="mekko-columns">' +
    model.columns.map((col, cIdx) =>
      '<div class="mekko-col" data-col-index="' + cIdx + '" style="flex:' + col.widthRatio.toFixed(5) + ' 0 0%">' +
      col.segments.filter((s) => s.heightRatio > 0.002).map((seg) => {
        const pal = palette[seg.seriesIndex] ?? { fill: theme.tokens.surface2, ink: theme.tokens.inkPrimary }
        const showFull = seg.heightRatio >= 0.14 && col.widthRatio >= 0.14
        const showPct = seg.heightRatio >= 0.07 && col.widthRatio >= 0.08
        return (
          '<div class="mekko-cell' + (seg.isOurs ? ' is-ours' : '') + '" style="flex:' + seg.heightRatio.toFixed(5) + ' 0 0%;background:' + pal.fill + ';color:' + pal.ink + '">' +
          (showFull ? '<span class="mekko-seg-name">' + escapeHtml(seg.seriesName) + '</span>' : '') +
          (showFull || showPct ? '<strong class="mekko-seg-pct">' + seg.sharePct + '%</strong>' : '') +
          '</div>'
        )
      }).join('') +
      '</div>',
    ).join('') +
    '</div>' +
    '<div class="mekko-axis"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>' +
    '</div>' +
    '<aside class="surface-card mekko-legend">' +
    '<div class="mekko-total"><span class="kicker">' + (isEn ? 'TOTAL MARKET' : '总市场规模') + '</span><strong>' + escapeHtml(model.totalLabel) + '</strong></div>' +
    '<ul class="mekko-legend-list">' +
    model.seriesSummary.map((s, idx) => {
      const pal = palette[idx] ?? { fill: theme.tokens.surface2 }
      return (
        '<li class="' + (s.isOurs ? 'is-ours' : '') + '">' +
        '<span class="mekko-swatch" style="background:' + pal.fill + '"></span>' +
        '<span class="mekko-leg-name">' + escapeHtml(s.name) + '</span>' +
        '<strong class="mekko-leg-pct">' + s.weightedPct + '%</strong>' +
        '</li>'
      )
    }).join('') +
    '</ul></aside></div>'
  )
}

function classifySankeyNodeTone(name, explicitStatus) {
  if (explicitStatus && VALID_STATUS.has(explicitStatus)) return explicitStatus
  const s = String(name ?? '')
  if (/成本|费用|支出|损耗|流失|税|折旧|研发投入|营销|管理费|cost|cogs|opex|expense|tax|loss|churn/i.test(s)) return 'negative'
  if (/净利润|营业利润|毛利润|毛利|净利|盈余|自由现金流|留存|profit|income|ebitda|margin|fcf/i.test(s)) return 'positive'
  return 'accent'
}

export function computeSankeyLayout(slide, areaBox = { x: 0.62, y: 1.88, w: 12.09, h: 4.50 }, langOrAttr = 'zh') {
  const isEn = langOrAttr === 'en' || langOrAttr === 'en-US'
  const rawEdges = []

  const effItems = resolveEffectiveItems(slide)
  if (effItems.length > 0 && effItems.some((it) => it.tag && it.title && !/^\d+$/.test(it.tag))) {
    for (const it of effItems) {
      const src = (it.tag || '').trim()
      const dst = (it.title || '').trim()
      if (!src || !dst || src === dst) continue
      const parsed = extractNumberAndUnit((it.value ?? '') + (it.unit ?? ''))
      const val = parsed.num > 0 ? parsed.num : 10
      const unit = it.unit || parsed.unit || ''
      const valLabel = it.value
        ? (it.value + (it.unit && !String(it.value).endsWith(it.unit) ? it.unit : ''))
        : (parsed.label || String(val))
      rawEdges.push({ source: src, target: dst, value: val, unit, valueLabel: valLabel, delta: it.delta || '', status: it.status })
    }
  } else if (Array.isArray(slide.rows) && slide.rows.length >= 2) {
    const startIdx = isNumericCell(slide.rows[0]?.[2] ?? '') ? 0 : 1
    for (const r of slide.rows.slice(startIdx)) {
      const src = stripInlineMarkdown(r[0] ?? '')
      const dst = stripInlineMarkdown(r[1] ?? '')
      if (!src || !dst || src === dst) continue
      const parsed = extractNumberAndUnit(r[2] ?? '10')
      rawEdges.push({
        source: src,
        target: dst,
        value: parsed.num > 0 ? parsed.num : 10,
        unit: parsed.unit,
        valueLabel: parsed.label || stripInlineMarkdown(r[2] ?? ''),
        delta: stripInlineMarkdown(r[3] ?? ''),
        status: undefined,
      })
    }
  }

  if (rawEdges.length === 0) {
    if (isEn) {
      rawEdges.push(
        { source: 'Total Revenue', target: 'Gross Profit', value: 68.5, unit: 'B', valueLabel: '$68.5B', status: 'positive' },
        { source: 'Total Revenue', target: 'Cost of Revenue', value: 31.5, unit: 'B', valueLabel: '$31.5B', status: 'negative' },
        { source: 'Gross Profit', target: 'Operating Income', value: 34.5, unit: 'B', valueLabel: '$34.5B', status: 'positive' },
        { source: 'Gross Profit', target: 'R&D', value: 22.0, unit: 'B', valueLabel: '$22.0B', status: 'negative' },
        { source: 'Gross Profit', target: 'SG&A', value: 12.0, unit: 'B', valueLabel: '$12.0B', status: 'negative' },
      )
    } else {
      rawEdges.push(
        { source: '总营收', target: '毛利润', value: 68.5, unit: '亿', valueLabel: '68.5亿', status: 'positive' },
        { source: '总营收', target: '营业成本', value: 31.5, unit: '亿', valueLabel: '31.5亿', status: 'negative' },
        { source: '毛利润', target: '营业利润', value: 34.5, unit: '亿', valueLabel: '34.5亿', status: 'positive' },
        { source: '毛利润', target: '研发投入', value: 22.0, unit: '亿', valueLabel: '22.0亿', status: 'negative' },
        { source: '毛利润', target: '营销及管理', value: 12.0, unit: '亿', valueLabel: '12.0亿', status: 'negative' },
      )
    }
  }

  const nodeMap = new Map()
  const getOrCreate = (name) => {
    if (!nodeMap.has(name)) {
      nodeMap.set(name, {
        name,
        inEdges: [],
        outEdges: [],
        inSum: 0,
        outSum: 0,
        layer: 0,
        tone: 'accent',
        unit: '',
        delta: '',
      })
    }
    return nodeMap.get(name)
  }

  const edges = []
  for (const e of rawEdges) {
    const u = getOrCreate(e.source)
    const v = getOrCreate(e.target)
    const edgeObj = { ...e, sourceNode: u, targetNode: v }
    u.outEdges.push(edgeObj)
    v.inEdges.push(edgeObj)
    u.outSum += e.value
    v.inSum += e.value
    if (!v.unit && e.unit) v.unit = e.unit
    if (!u.unit && e.unit) u.unit = e.unit
    if (e.delta && !v.delta) v.delta = e.delta
    if (e.status) v.tone = e.status
    edges.push(edgeObj)
  }

  const nodes = [...nodeMap.values()]
  // 拓扑分层（防环最多迭代 nodes.length 次，最多 4 列）
  for (let pass = 0; pass < nodes.length; pass += 1) {
    let changed = false
    for (const e of edges) {
      if (e.targetNode.layer <= e.sourceNode.layer && e.sourceNode.layer < 3) {
        const nextL = Math.min(3, e.sourceNode.layer + 1)
        if (nextL > e.targetNode.layer) {
          e.targetNode.layer = nextL
          changed = true
        }
      }
    }
    if (!changed) break
  }

  const maxLayer = Math.max(1, ...nodes.map((n) => n.layer))
  const layerCount = maxLayer + 1

  for (const n of nodes) {
    n.val = Math.max(n.inSum, n.outSum, 0.01)
    n.tone = classifySankeyNodeTone(n.name, n.inEdges[0]?.status)
    const formattedNum = Number.isInteger(n.val) ? String(n.val) : n.val.toFixed(1).replace(/\.0$/, '')
    n.displayValue = (n.inEdges.length === 1 && n.outEdges.length === 0 && n.inEdges[0].valueLabel)
      ? n.inEdges[0].valueLabel
      : formattedNum + (n.unit || '')
  }

  const layers = Array.from({ length: layerCount }, (_, l) => nodes.filter((n) => n.layer === l))
  // 预留顶部浮动标签高度 + 左右标签栏宽度
  const leftLabelW = 2.02
  const rightLabelW = 2.62
  const topPad = 0.46
  const botPad = 0.14
  const plotX = areaBox.x + leftLabelW
  const plotW = Math.max(3.6, areaBox.w - leftLabelW - rightLabelW)
  const plotY = areaBox.y + topPad
  const plotH = Math.max(2.0, areaBox.h - topPad - botPad)
  const barW = 0.24
  const nodeGap = 0.30

  // 能量守恒全局比例尺 ky（英寸/单位数值）
  let ky = Infinity
  for (const col of layers) {
    if (col.length === 0) continue
    const valSum = col.reduce((s, n) => s + n.val, 0)
    const avail = Math.max(0.8, plotH * 0.84 - Math.max(0, col.length - 1) * nodeGap)
    ky = Math.min(ky, avail / Math.max(valSum, 1e-6))
  }
  if (!Number.isFinite(ky) || ky <= 0) ky = 0.03

  // 在同层内将正向/主干节点排上方、负向成本节点排下方，减少交叉且符合损益表视觉直觉
  const toneRank = (n) => (n.outEdges.length > 0 ? 0 : n.tone === 'positive' ? 1 : n.tone === 'accent' ? 2 : 3)
  layers[0].sort((a, b) => toneRank(a) - toneRank(b) || b.val - a.val)

  // Layer 0 垂直居中排布
  {
    const col0 = layers[0]
    col0.forEach((n) => {
      n.x = plotX
      n.w = barW
      n.h = Math.max(0.16, n.val * ky)
    })
    const totalH0 = col0.reduce((s, n) => s + n.h, 0) + Math.max(0, col0.length - 1) * nodeGap
    let cy = plotY + Math.max(0, (plotH - totalH0) / 2)
    for (const n of col0) {
      n.y = cy
      cy += n.h + nodeGap
    }
  }

  // 逐层计算父节点出港端口，再用父端口加权重心法定位子层节点 Y（使毛利润拆解保持在上半带、营业成本独占下半带！）
  const assignOutPorts = (col) => {
    for (const u of col) {
      u.outEdges.sort((a, b) => toneRank(a.targetNode) - toneRank(b.targetNode) || a.targetNode.layer - b.targetNode.layer)
      const outTotal = u.outEdges.reduce((s, e) => s + e.value, 0) || u.val
      const scale = u.h / Math.max(outTotal, u.val)
      let py = u.y
      for (const e of u.outEdges) {
        const eh = Math.max(0.03, e.value * scale)
        e.sy0 = py
        e.sy1 = py + eh
        py += eh
      }
    }
  }

  assignOutPorts(layers[0])

  for (let l = 1; l < layerCount; l += 1) {
    const col = layers[l]
    const colX = plotX + (l / Math.max(1, layerCount - 1)) * (plotW - barW)
    for (const n of col) {
      n.x = colX
      n.w = barW
      n.h = Math.max(0.16, n.val * ky)
      if (n.inEdges.length > 0) {
        const wSum = n.inEdges.reduce((s, e) => s + e.value, 0) || 1
        const targetMid = n.inEdges.reduce((s, e) => s + ((e.sy0 + e.sy1) / 2) * e.value, 0) / wSum
        n.idealY = targetMid - n.h / 2
      } else {
        n.idealY = plotY
      }
    }
    col.sort((a, b) => a.idealY - b.idealY || toneRank(a) - toneRank(b))

    // 自顶向下与自底向上碰撞消解，严格守住画布上下界与最小节点间距
    let cursor = plotY
    for (const n of col) {
      n.y = Math.max(cursor, n.idealY)
      cursor = n.y + n.h + nodeGap
    }
    let bottomLimit = plotY + plotH
    for (let i = col.length - 1; i >= 0; i -= 1) {
      const n = col[i]
      if (n.y + n.h > bottomLimit) {
        n.y = Math.max(plotY, bottomLimit - n.h)
      }
      bottomLimit = n.y - nodeGap
    }
    assignOutPorts(col)
  }

  // 计算每个目标节点的入港端口 [ty0, ty1]
  for (const v of nodes) {
    v.inEdges.sort((a, b) => a.sourceNode.y - b.sourceNode.y)
    const inTotal = v.inEdges.reduce((s, e) => s + e.value, 0) || v.val
    const scale = v.h / Math.max(inTotal, v.val)
    let py = v.y
    for (const e of v.inEdges) {
      const eh = Math.max(0.03, e.value * scale)
      e.ty0 = py
      e.ty1 = py + eh
      py += eh
    }
  }

  return { nodes, edges, layers, layerCount, areaBox, plotX, plotW, plotY, plotH, leftLabelW, rightLabelW }
}

function sankeyNodeColor(node, theme) {
  const tk = theme.tokens
  if (node.layer === 0) return tk.accentPrimary
  if (node.tone === 'positive') return tk.positive
  if (node.tone === 'negative') return tk.negative
  if (node.tone === 'warning') return tk.warning
  return tk.accentSecondary
}

function renderSankeyPptx(slide, area, nextIdFn, chromeCfg, theme, langAttr) {
  const tk = theme.tokens
  const model = computeSankeyLayout(slide, area, langAttr)
  const shapes = []

  // 1. 先绘制平滑三次贝塞尔闭合流向丝带 (<a:custGeom>)
  model.edges.forEach((e, idx) => {
    const x0 = e.sourceNode.x + e.sourceNode.w
    const x1 = e.targetNode.x
    const rw = Math.max(0.08, x1 - x0)
    const ry = Math.min(e.sy0, e.ty0)
    const maxBottom = Math.max(e.sy1, e.ty1)
    const rh = Math.max(0.04, maxBottom - ry)

    const W = 10000
    const H = 10000
    const sy0 = Math.round(((e.sy0 - ry) / rh) * H)
    const sy1 = Math.round(((e.sy1 - ry) / rh) * H)
    const ty0 = Math.round(((e.ty0 - ry) / rh) * H)
    const ty1 = Math.round(((e.ty1 - ry) / rh) * H)

    const pathXml =
      '<a:moveTo><a:pt x="0" y="' + sy0 + '"/></a:moveTo>' +
      '<a:cubicBezTo><a:pt x="4600" y="' + sy0 + '"/><a:pt x="5400" y="' + ty0 + '"/><a:pt x="' + W + '" y="' + ty0 + '"/></a:cubicBezTo>' +
      '<a:lnTo><a:pt x="' + W + '" y="' + ty1 + '"/></a:lnTo>' +
      '<a:cubicBezTo><a:pt x="5400" y="' + ty1 + '"/><a:pt x="4600" y="' + sy1 + '"/><a:pt x="0" y="' + sy1 + '"/></a:cubicBezTo>' +
      '<a:close/>'

    const ribbonColor = sankeyNodeColor(e.targetNode, theme)
    shapes.push(ooxmlCustGeomShape(nextIdFn(), 'Sankey Ribbon ' + (idx + 1), { x: x0, y: ry, w: rw, h: rh }, pathXml, { pathW: W, pathH: H, fill: ribbonColor, fillAlpha: theme.dark ? 0.42 : 0.32 }))
  })

  // 2. 绘制守恒节点立柱 + 零碰撞语义数值标签
  model.nodes.forEach((n, idx) => {
    const barColor = sankeyNodeColor(n, theme)
    shapes.push(ooxmlShape(nextIdFn(), 'Sankey Node ' + (idx + 1), { x: n.x, y: n.y, w: n.w, h: n.h }, { preset: chromeCfg.cardRadiusPx > 0 ? 'roundRect' : 'rect', adj: roundRectAdj(n.w, n.h, Math.min(4, chromeCfg.cardRadiusPx)), fill: barColor }))

    const valColor = n.tone === 'positive'
      ? tk.positive
      : n.tone === 'negative'
        ? tk.negative
        : tk.accentText
    const valLine = n.displayValue + (n.delta ? ' (' + n.delta + ')' : '')
    const isLeftRoot = n.layer === 0
    const isLeaf = n.outEdges.length === 0

    if (isLeftRoot) {
      const lblBox = { x: area.x, y: n.y + n.h / 2 - 0.32, w: Math.max(1.2, n.x - area.x - 0.12), h: 0.64 }
      shapes.push(ooxmlShape(nextIdFn(), 'Sankey Label ' + (idx + 1), lblBox, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0.02, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(n.name, { sizePt: 12.5, color: tk.inkPrimary, bold: true, lang: langAttr, align: 'r', font: theme.fonts.heading, lineHeight: 1.12, spaceAfterPt: 1 }),
          ooxmlRichParagraph(valLine, { sizePt: 13.5, color: tk.accentText, bold: true, lang: langAttr, align: 'r', font: theme.fonts.heading, lineHeight: 1.08 }),
        ],
      }))
    } else if (isLeaf) {
      const rightEdge = area.x + area.w
      const lx = n.x + n.w + 0.12
      const maxLeafW = model.layerCount >= 4 && n.layer < model.layerCount - 1 ? 2.02 : 2.6
      const lw = Math.min(maxLeafW, Math.max(1.3, rightEdge - lx))
      const lblBox = { x: lx, y: n.y + n.h / 2 - 0.28, w: lw, h: 0.56 }
      shapes.push(ooxmlShape(nextIdFn(), 'Sankey Label ' + (idx + 1), lblBox, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0.02, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(n.name + '  **' + valLine + '**', {
            sizePt: model.layerCount >= 4 && n.layer < model.layerCount - 1 ? 10.5 : 11.5,
            color: tk.inkPrimary,
            accentColor: valColor,
            bold: false,
            lang: langAttr,
            align: 'l',
            font: theme.fonts.body,
            lineHeight: 1.15,
          }),
        ],
      }))
    } else {
      // 中间枢纽节点（既有入流又有出流）：置于立柱正上方胶囊标签，彻底避开左右两侧流向丝带！
      const pillFontPt = model.layerCount >= 4 ? 10 : 11
      const pillMaxW = model.layerCount >= 4 ? 2.22 : 2.8
      const pillText = n.name + ' · ' + valLine
      const pillW = computeBadgePillWidth(pillText, pillFontPt, pillMaxW, 1.30)
      const pillBox = { x: n.x + n.w / 2 - pillW / 2, y: Math.max(area.y, n.y - 0.40), w: pillW, h: 0.34 }
      shapes.push(ooxmlShape(nextIdFn(), 'Sankey Label ' + (idx + 1), pillBox, {
        preset: chromeCfg.cardRadiusPx > 0 ? 'roundRect' : 'rect',
        adj: roundRectAdj(pillBox.w, pillBox.h, Math.min(8, chromeCfg.cardRadiusPx)),
        fill: tk.surface2,
        stroke: barColor,
        strokePt: 0.75,
        anchor: 'ctr',
        marginsIn: { l: 0.06, r: 0.06, t: 0.02, b: 0.02 },
        paragraphs: [ooxmlRichParagraph(n.name + '  **' + valLine + '**', { sizePt: pillFontPt, color: tk.inkPrimary, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.heading, lineHeight: 1.05 })],
      }))
    }
  })

  return shapes.join('')
}

function renderSankeyHtml(slide, theme, langId) {
  const tk = theme.tokens
  const area = { x: 0, y: 0, w: 12.0, h: 4.5 }
  const model = computeSankeyLayout(slide, area, langId)
  const scale = 100 // 1200 x 450 SVG 视口

  const ribbonsSvg = model.edges.map((e) => {
    const x0 = (e.sourceNode.x + e.sourceNode.w) * scale
    const x1 = e.targetNode.x * scale
    const cx0 = x0 + (x1 - x0) * 0.46
    const cx1 = x0 + (x1 - x0) * 0.54
    const sy0 = e.sy0 * scale
    const sy1 = e.sy1 * scale
    const ty0 = e.ty0 * scale
    const ty1 = e.ty1 * scale
    const d =
      'M ' + x0.toFixed(1) + ' ' + sy0.toFixed(1) +
      ' C ' + cx0.toFixed(1) + ' ' + sy0.toFixed(1) + ', ' + cx1.toFixed(1) + ' ' + ty0.toFixed(1) + ', ' + x1.toFixed(1) + ' ' + ty0.toFixed(1) +
      ' L ' + x1.toFixed(1) + ' ' + ty1.toFixed(1) +
      ' C ' + cx1.toFixed(1) + ' ' + ty1.toFixed(1) + ', ' + cx0.toFixed(1) + ' ' + sy1.toFixed(1) + ', ' + x0.toFixed(1) + ' ' + sy1.toFixed(1) +
      ' Z'
    const fill = sankeyNodeColor(e.targetNode, theme)
    const op = theme.dark ? '0.42' : '0.32'
    return '<path class="sankey-ribbon" d="' + d + '" fill="' + fill + '" fill-opacity="' + op + '"/>'
  }).join('')

  const nodesSvg = model.nodes.map((n) => {
    const barColor = sankeyNodeColor(n, theme)
    const rx = n.x * scale
    const ry = n.y * scale
    const rw = n.w * scale
    const rh = n.h * scale
    const valLine = n.displayValue + (n.delta ? ' (' + n.delta + ')' : '')
    const isLeftRoot = n.layer === 0
    const isLeaf = n.outEdges.length === 0

    let labelSvg = ''
    if (isLeftRoot) {
      const lx = (rx - 12).toFixed(1)
      const ly = (ry + rh / 2).toFixed(1)
      labelSvg =
        '<text x="' + lx + '" y="' + (Number(ly) - 7).toFixed(1) + '" text-anchor="end" fill="' + tk.inkPrimary + '" font-size="15" font-weight="700">' + escapeHtml(n.name) + '</text>' +
        '<text x="' + lx + '" y="' + (Number(ly) + 14).toFixed(1) + '" text-anchor="end" fill="' + tk.accentText + '" font-size="16" font-weight="800">' + escapeHtml(valLine) + '</text>'
    } else if (isLeaf) {
      const lx = (rx + rw + 12).toFixed(1)
      const ly = (ry + rh / 2 + 5).toFixed(1)
      labelSvg =
        '<text x="' + lx + '" y="' + ly + '" text-anchor="start" fill="' + tk.inkPrimary + '" font-size="14" font-weight="600">' +
        escapeHtml(n.name) + ' <tspan fill="' + barColor + '" font-weight="800">' + escapeHtml(valLine) + '</tspan></text>'
    } else {
      const cx = (rx + rw / 2).toFixed(1)
      const cy = Math.max(20, ry - 12).toFixed(1)
      labelSvg =
        '<text x="' + cx + '" y="' + cy + '" text-anchor="middle" fill="' + tk.inkPrimary + '" font-size="14" font-weight="700">' +
        escapeHtml(n.name + ' · ' + valLine) + '</text>'
    }

    return (
      '<g class="sankey-node">' +
      '<rect x="' + rx.toFixed(1) + '" y="' + ry.toFixed(1) + '" width="' + rw.toFixed(1) + '" height="' + rh.toFixed(1) + '" rx="3" fill="' + barColor + '"/>' +
      labelSvg +
      '</g>'
    )
  }).join('')

  return (
    '<div class="sankey-board">' +
    '<svg class="sankey-svg" viewBox="0 0 1200 450" role="img" aria-label="' + escapeHtml(slide.title || 'Sankey Flow') + '">' +
    ribbonsSvg +
    nodesSvg +
    '</svg></div>'
  )
}

const SUPPORT_ACTIVITY_RE = /辅助|支撑|基础|治理|平台|人才|人力|采购|财务|法务|support|infra|hr|talent|procure|governance|admin/i

export function partitionValueChainItems(slide, langOrAttr = 'zh') {
  const isEn = langOrAttr === 'en' || langOrAttr === 'en-US'
  const all = resolveEffectiveItems(slide)

  const taggedSupport = all.filter((it) => SUPPORT_ACTIVITY_RE.test(String(it.tag || '')) || SUPPORT_ACTIVITY_RE.test(String(it.role || '')))
  const taggedPrimary = all.filter((it) => !taggedSupport.includes(it))

  let supportItems = []
  let primaryItems = []

  if (taggedSupport.length >= 1 && taggedPrimary.length >= 2) {
    supportItems = taggedSupport.slice(0, 4)
    primaryItems = taggedPrimary.slice(0, 5)
  } else if (all.length >= 6) {
    const k = Math.min(4, Math.max(2, all.length - 5))
    supportItems = all.slice(0, k)
    primaryItems = all.slice(k, k + 5)
  } else if (Array.isArray(slide.columns) && slide.columns.length >= 1 && all.length >= 2) {
    supportItems = slide.columns.slice(0, 3).map((col, idx) => ({ tag: isEn ? 'SUPPORT ' + (idx + 1) : '辅助 ' + (idx + 1), title: col }))
    primaryItems = all.slice(0, 5)
  } else if (all.length >= 4) {
    // 若用户仅传 4–5 条核心活动，自动保留为底部基本活动并补齐顶部 2 条标准波特辅助支撑横梁
    primaryItems = all.slice(0, 5)
    supportItems = isEn
      ? [
          { tag: 'SUPPORT', title: 'Firm Infrastructure & Governance', text: 'Unified strategy, compliance & financial control' },
          { tag: 'SUPPORT', title: 'Technology R&D & Talent Enablement', text: 'Core platform engineering & organization capability' },
        ]
      : [
          { tag: '辅助活动', title: '企业基础设施与数字化治理', text: '统一战略管控、合规风控与业财一体底座' },
          { tag: '辅助活动', title: '核心技术研发与组织人才支撑', text: '共性平台研发复用与复合型人才梯队赋能' },
        ]
  } else {
    supportItems = all.length >= 3 ? all.slice(0, 1) : [
      { tag: isEn ? 'SUPPORT' : '辅助活动', title: isEn ? 'Platform & Governance' : '平台与治理支撑' },
    ]
    primaryItems = (all.length >= 3 ? all.slice(1) : all).length > 0
      ? (all.length >= 3 ? all.slice(1) : all)
      : [
          { tag: '01', title: isEn ? 'Inbound' : '供给接入' },
          { tag: '02', title: isEn ? 'Operations' : '核心交付' },
          { tag: '03', title: isEn ? 'Distribution' : '渠道触达' },
          { tag: '04', title: isEn ? 'Service' : '持续增值' },
        ]
  }

  const rawMargin = (slide.text && slide.text.trim().length <= 22 ? slide.text.trim() : '')
    || (slide.subtitle && slide.subtitle.trim().length <= 22 ? slide.subtitle.trim() : '')
  const marginLabel = rawMargin || (isEn ? 'MARGIN' : '利润池\nMARGIN')

  return { supportItems, primaryItems, marginLabel }
}

function renderPorterValueChainPptx(slide, area, nextIdFn, chromeCfg, theme, langAttr) {
  const tk = theme.tokens
  const isEn = langAttr === 'en-US'
  const { supportItems, primaryItems, marginLabel } = partitionValueChainItems(slide, langAttr)
  const shapes = []
  const cardPreset = chromeCfg.cardRadiusPx > 0 ? 'roundRect' : 'rect'

  const marginW = 1.66
  const marginGap = 0.14
  const mainW = area.w - marginW - marginGap
  const mainX = area.x

  // 顶部辅助活动横梁区
  const nSup = Math.max(1, supportItems.length)
  const supGap = 0.08
  const supZoneH = Math.min(1.88, Math.max(1.10, area.h * (nSup >= 3 ? 0.42 : 0.34)))
  const beamH = (supZoneH - supGap * (nSup - 1)) / nSup

  // 左侧“辅助活动”竖向标签轨（分行独立居中段落，杜绝单段落换行缩进错位）
  const railW = 0.92
  const railLines = isEn ? ['SUPPORT'] : ['辅助', '活动']
  shapes.push(ooxmlShape(nextIdFn(), 'Porter Support Rail', { x: mainX, y: area.y, w: railW, h: supZoneH }, {
    preset: cardPreset,
    adj: roundRectAdj(railW, supZoneH, Math.min(6, chromeCfg.cardRadiusPx)),
    fill: tk.accentSoft,
    stroke: tk.accentPrimary,
    strokePt: 0.75,
    anchor: 'ctr',
    marginsIn: { l: 0.06, r: 0.06, t: 0.06, b: 0.06 },
    paragraphs: railLines.map((ln) =>
      ooxmlRichParagraph(ln, { sizePt: 11.5, color: tk.accentText, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.heading, lineHeight: 1.16 }),
    ),
  }))

  const beamX = mainX + railW + 0.10
  const beamW = mainW - railW - 0.10
  supportItems.forEach((sup, sIdx) => {
    const by = area.y + sIdx * (beamH + supGap)
    const detail = [sup.text, ...(sup.bullets ?? [])].filter(Boolean).join(' · ')
    const beamCopy = '**' + (sup.title || '') + '**' + (detail ? '  —  ' + detail : '')
    shapes.push(ooxmlShape(nextIdFn(), 'Porter Support Beam ' + (sIdx + 1), { x: beamX, y: by, w: beamW, h: beamH }, {
      preset: cardPreset,
      adj: roundRectAdj(beamW, beamH, Math.min(6, chromeCfg.cardRadiusPx)),
      fill: sIdx % 2 === 0 ? tk.surface2 : tk.surface1,
      stroke: chromeCfg.cardBorderless ? '' : tk.hairline,
      strokePt: 0.75,
      anchor: 'ctr',
      marginsIn: { l: 0.18, r: 0.16, t: 0.03, b: 0.03 },
      paragraphs: [ooxmlRichParagraph(beamCopy, { sizePt: nSup >= 3 ? 11.5 : 12.5, color: tk.inkPrimary, secondaryColor: tk.inkSecondary, lang: langAttr, font: theme.fonts.body, lineHeight: 1.18 })],
    }))
    shapes.push(ooxmlShape(nextIdFn(), 'Porter Support Stripe ' + (sIdx + 1), { x: beamX, y: by, w: 0.06, h: beamH }, { preset: 'rect', fill: tk.accentSecondary }))
  })

  // 底部基本活动互锁 Chevron + 支撑明细卡片
  const primTopY = area.y + supZoneH + 0.16
  const primZoneH = Math.max(1.85, area.y + area.h - primTopY)
  const nPrim = Math.max(1, primaryItems.length)
  const overlap = nPrim > 1 ? 0.07 : 0
  const chevW = (mainW + (nPrim - 1) * overlap) / nPrim
  const chevH = Math.min(0.84, primZoneH * 0.36)
  const detailGap = 0.12
  const colW = (mainW - detailGap * (nPrim - 1)) / nPrim
  const detailY = primTopY + chevH + 0.12
  const detailH = Math.max(0.95, area.y + area.h - detailY)

  primaryItems.forEach((it, idx) => {
    const isFirst = idx === 0
    const isLast = idx === nPrim - 1 && nPrim >= 3
    const cx = mainX + idx * (chevW - overlap)
    const fillHex = isFirst ? tk.accentPrimary : isLast ? tk.accentSecondary : tk.surface2
    const inkHex = isFirst
      ? tk.inkOnAccent
      : isLast
        ? (relativeLuminance(tk.accentSecondary) > 0.38 ? '#0F172A' : '#FFFFFF')
        : tk.inkPrimary
    const stageTag = (it.tag && !SUPPORT_ACTIVITY_RE.test(it.tag)) ? it.tag : String(idx + 1).padStart(2, '0')
    const titleStr = it.title || ''
    const titlePt = titleStr.length >= 7 ? 11 : nPrim >= 5 ? 11.5 : 12.5
    const chevParas = [
      ...(stageTag
        ? [ooxmlRichParagraph(stageTag, { sizePt: 9, color: inkHex, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.heading, lineHeight: 1.05, spaceAfterPt: 1 })]
        : []),
      ooxmlRichParagraph(titleStr, { sizePt: titlePt, color: inkHex, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.heading, lineHeight: 1.12 }),
    ]

    shapes.push(ooxmlShape(nextIdFn(), 'Porter Primary Chevron ' + (idx + 1), { x: cx, y: primTopY, w: chevW, h: chevH }, {
      preset: isFirst ? 'homePlate' : 'chevron',
      adjs: { adj: 18000 },
      fill: fillHex,
      stroke: tk.canvas,
      strokePt: 1.75,
      anchor: 'ctr',
      marginsIn: { l: isFirst ? 0.10 : 0.22, r: 0.18, t: 0.03, b: 0.03 },
      paragraphs: chevParas,
    }))

    const dx = mainX + idx * (colW + detailGap)
    const cardBox = { x: dx, y: detailY, w: colW, h: detailH }
    shapes.push(renderSurfaceCardPptx('Porter Detail Surface ' + (idx + 1), cardBox, { fill: isFirst ? tk.accentSoft : tk.surface1, focal: isFirst }, nextIdFn, chromeCfg, theme))

    const metric = it.conversion || it.delta || (it.value ? it.value + (it.unit ? ' ' + it.unit : '') : '')
    const lines = [
      ...(metric ? ['**' + metric + '**'] : []),
      ...(it.text ? [it.text] : []),
      ...(Array.isArray(it.bullets) ? it.bullets : []),
    ]
    if (lines.length > 0) {
      const innerBox = { x: cardBox.x + 0.12, y: cardBox.y + 0.12, w: cardBox.w - 0.24, h: cardBox.h - 0.22 }
      const fit = computeTextFit(lines, innerBox, 'cardBody', { maxPt: 12.5, minPt: 11 })
      shapes.push(ooxmlShape(nextIdFn(), 'Porter Detail ' + (idx + 1), innerBox, {
        txBox: true,
        anchor: 't',
        marginsIn: ZERO_MARGINS,
        fontScale: fit.fontScale,
        paragraphs: lines.map((line, lIdx) =>
          ooxmlRichParagraph(line, { sizePt: fit.fontPt, color: lIdx === 0 && metric ? tk.accentText : tk.inkSecondary, lang: langAttr, font: theme.fonts.body, lineHeight: 1.3, spaceAfterPt: 3 }),
        ),
      }))
    }
  })

  // 右侧贯通全高的“利润池 / MARGIN”箭头尖楔
  const wedgeBox = { x: mainX + mainW + marginGap, y: area.y, w: marginW, h: area.h }
  shapes.push(ooxmlShape(nextIdFn(), 'Porter Margin Wedge', wedgeBox, {
    preset: 'homePlate',
    adjs: { adj: 28000 },
    fill: tk.accentPrimary,
    stroke: tk.canvas,
    strokePt: 2.0,
    anchor: 'ctr',
    marginsIn: { l: 0.12, r: 0.26, t: 0.16, b: 0.16 },
    paragraphs: String(marginLabel).split('\n').map((ln, lIdx) =>
      ooxmlRichParagraph(ln, { sizePt: lIdx === 0 ? 15.5 : 11.5, color: tk.inkOnAccent, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.heading, lineHeight: 1.2, spaceAfterPt: 2 }),
    ),
  }))

  return shapes.join('')
}

function renderPorterValueChainHtml(slide, langId) {
  const isEn = langId === 'en'
  const { supportItems, primaryItems, marginLabel } = partitionValueChainItems(slide, langId)

  return (
    '<div class="porter-board">' +
    '<div class="porter-main">' +
    '<div class="porter-support-zone">' +
    '<div class="porter-support-rail">' + (isEn ? 'SUPPORT' : '辅助活动') + '</div>' +
    '<div class="porter-support-beams">' +
    supportItems.map((sup) => {
      const detail = [sup.text, ...(sup.bullets ?? [])].filter(Boolean).join(' · ')
      return (
        '<div class="surface-card porter-beam">' +
        '<strong>' + renderInlineHtml(sup.title || '') + '</strong>' +
        (detail ? '<span>' + renderInlineHtml(detail) + '</span>' : '') +
        '</div>'
      )
    }).join('') +
    '</div></div>' +
    '<ol class="layout-grid chevron-board porter-primary-zone cols-' + Math.max(1, primaryItems.length) + '">' +
    primaryItems.map((it, idx) => {
      const isFirst = idx === 0
      const isLast = idx === primaryItems.length - 1 && primaryItems.length >= 3
      const stageTag = (it.tag && !SUPPORT_ACTIVITY_RE.test(it.tag)) ? it.tag : String(idx + 1).padStart(2, '0')
      const metric = it.conversion || it.delta || (it.value ? it.value + (it.unit ? ' ' + it.unit : '') : '')
      const lines = [...(it.text ? [it.text] : []), ...(Array.isArray(it.bullets) ? it.bullets : [])]
      return (
        '<li class="chevron-col" data-item-index="' + idx + '">' +
        '<div class="chevron-arrow' + (isFirst ? ' is-first' : isLast ? ' is-last' : '') + '">' +
        '<span class="chevron-tag">' + escapeHtml(stageTag) + '</span>' +
        '<span class="chevron-title">' + renderInlineHtml(it.title || '') + '</span>' +
        '</div>' +
        '<div class="surface-card chevron-detail' + (isFirst ? ' is-focal' : '') + '">' +
        (metric ? '<span class="funnel-conversion-badge chevron-metric">' + escapeHtml(metric) + '</span>' : '') +
        (lines.length ? '<div class="card-body">' + lines.map((l) => renderInlineHtml(l)).join('<br>') + '</div>' : '') +
        '</div></li>'
      )
    }).join('') +
    '</ol>' +
    '</div>' +
    '<aside class="porter-margin-wedge"><span>' + escapeHtml(marginLabel).replace(/\n/g, '<br>') + '</span></aside>' +
    '</div>'
  )
}

function formatSwotAnchorText(raw, isEn) {
  const cleaned = stripInlineMarkdown(String(raw ?? '')).trim()
  if (!cleaned) return isEn ? 'Strategic\nCore' : '破局核心'
  const rawLines = String(raw ?? '')
    .split(/\n+/)
    .map((ln) => stripInlineMarkdown(ln).trim())
    .filter(Boolean)
  if (rawLines.length >= 2) return rawLines.slice(0, 2).join('\n')

  const sepParts = cleaned.split(/\s*[·｜|／/—\-]\s*/).filter(Boolean)
  if (sepParts.length >= 2) return [sepParts[0], sepParts.slice(1).join('·')].join('\n')

  const hasCjk = /[\u4E00-\u9FFF]/.test(cleaned)
  if (hasCjk) {
    const wsParts = cleaned.split(/\s+/).filter(Boolean)
    if (wsParts.length >= 2) {
      return [wsParts[0], wsParts.slice(1).join('')].join('\n')
    }
    if (cleaned.length > 5) {
      const mid = Math.ceil(cleaned.length / 2)
      return cleaned.slice(0, mid) + '\n' + cleaned.slice(mid)
    }
    return cleaned
  }

  const words = cleaned.split(/\s+/).filter(Boolean)
  if (cleaned.length > 10 && words.length >= 2) {
    let bestIdx = 1
    let bestDiff = Infinity
    for (let i = 1; i < words.length; i += 1) {
      const l1 = words.slice(0, i).join(' ').length
      const l2 = words.slice(i).join(' ').length
      const diff = Math.abs(l1 - l2)
      if (diff < bestDiff) { bestDiff = diff; bestIdx = i }
    }
    return words.slice(0, bestIdx).join(' ') + '\n' + words.slice(bestIdx).join(' ')
  }
  return cleaned
}

export function computeSwotModel(slide, langOrAttr = 'zh') {
  const isEn = langOrAttr === 'en' || langOrAttr === 'en-US'
  const items = resolveEffectiveItems(slide)

  const quadrantMeta = [
    { key: 'S', badge: 'S', header: isEn ? 'S · Core Strengths' : 'S · 核心优势', role: 'positive', match: /^(?:s\b|strength|优势|强项|长板)/i },
    { key: 'W', badge: 'W', header: isEn ? 'W · Key Weaknesses' : 'W · 关键短板', role: 'warning', match: /^(?:w\b|weakness|劣势|短板|不足|痛点)/i },
    { key: 'O', badge: 'O', header: isEn ? 'O · External Opportunities' : 'O · 外部机遇', role: 'accent', match: /^(?:o\b|opportunit|机遇|机会|红利)/i },
    { key: 'T', badge: 'T', header: isEn ? 'T · Potential Threats' : 'T · 潜在威胁', role: 'negative', match: /^(?:t\b|threat|威胁|风险|挑战)/i },
  ]

  const towsMeta = [
    { key: 'SO', label: isEn ? 'SO · Growth Offense' : 'SO · 乘势增长', match: /^so\b/i },
    { key: 'WO', label: isEn ? 'WO · Capability Turnaround' : 'WO · 借势补短', match: /^wo\b/i },
    { key: 'ST', label: isEn ? 'ST · Moat Defense' : 'ST · 壁垒防御', match: /^st\b/i },
    { key: 'WT', label: isEn ? 'WT · Risk Containment' : 'WT · 风险收敛', match: /^wt\b/i },
  ]

  // 提取显式 SO/WO/ST/WT 行动策略项与 S/W/O/T 四象限项
  const towsExplicit = new Map()
  const quadPool = []
  for (const it of items) {
    const probe = ((it.tag || '') + ' ' + (it.title || '')).trim()
    const hitTows = towsMeta.find((tm) => tm.match.test(probe))
    if (hitTows && !towsExplicit.has(hitTows.key)) {
      towsExplicit.set(hitTows.key, it.text || (it.bullets ?? [])[0] || it.title || '')
    } else {
      quadPool.push(it)
    }
  }

  const used = new Set()
  const quadrants = quadrantMeta.map((qm, qIdx) => {
    let hit = quadPool.find((it, idx) => !used.has(idx) && (qm.match.test(it.tag || '') || qm.match.test(it.title || '')))
    if (hit) {
      used.add(quadPool.indexOf(hit))
    } else {
      const nextIdx = quadPool.findIndex((_, idx) => !used.has(idx))
      if (nextIdx >= 0) {
        hit = quadPool[nextIdx]
        used.add(nextIdx)
      }
    }
    const cleanTitle = hit?.title ? hit.title.replace(/^[SWOT]\s*[·:：\-—]\s*/i, '').trim() : ''
    return {
      ...qm,
      title: cleanTitle,
      text: hit?.text || '',
      bullets: hit?.bullets ?? [],
    }
  })

  const rawAnchor = (slide.text && slide.text.trim().length <= 24 ? slide.text.trim() : '')
    || (slide.subtitle && slide.subtitle.trim().length <= 24 ? slide.subtitle.trim() : '')
  const anchorText = formatSwotAnchorText(rawAnchor, isEn)

  // 生成底部 SO / WO / ST / WT 行动策略条（优先采用显式策略或 slide.columns，否则根据四象限标题智能凝练）
  const shortPhrase = (q, fallbackZh, fallbackEn) => {
    const cand = q.title || (q.bullets[0] ? stripInlineMarkdown(q.bullets[0]).split(/[：:，,；;]/)[0] : '') || stripInlineMarkdown(q.text).split(/[：:，,；;]/)[0]
    if (cand && cand.length <= 14) return cand
    if (cand) return cand.slice(0, 12) + '…'
    return isEn ? fallbackEn : fallbackZh
  }
  const sShort = shortPhrase(quadrants[0], '核心壁垒', 'core strength')
  const wShort = shortPhrase(quadrants[1], '关键短板', 'gap')
  const oShort = shortPhrase(quadrants[2], '市场窗口', 'market window')
  const tShort = shortPhrase(quadrants[3], '外部冲击', 'headwinds')

  const synthesizedDefaults = isEn
    ? [
        'Leverage ' + sShort + ' to capture ' + oShort,
        'Use ' + oShort + ' to close ' + wShort,
        'Reinforce ' + sShort + ' against ' + tShort,
        'Hedge ' + wShort + ' & ' + tShort,
      ]
    : [
        '以「' + sShort + '」抢占「' + oShort + '」',
        '借「' + oShort + '」补齐「' + wShort + '」',
        '凭「' + sShort + '」抵御「' + tShort + '」',
        '收敛「' + wShort + '」严防「' + tShort + '」',
      ]

  const strategies = towsMeta.map((tm, idx) => {
    const fromCol = Array.isArray(slide.columns) && slide.columns[idx] ? slide.columns[idx].replace(/^(?:SO|WO|ST|WT)\s*[·:：\-—]\s*/i, '') : ''
    return {
      key: tm.key,
      label: tm.label,
      action: towsExplicit.get(tm.key) || fromCol || synthesizedDefaults[idx],
    }
  })

  return { quadrants, anchorText, strategies }
}

function swotRoleColor(role, tk) {
  if (role === 'positive') return tk.positive
  if (role === 'warning') return tk.warning
  if (role === 'negative') return tk.negative
  return tk.accentPrimary
}

function renderSwotPptx(slide, area, nextIdFn, chromeCfg, theme, langAttr) {
  const tk = theme.tokens
  const model = computeSwotModel(slide, langAttr)
  const shapes = []
  const cardPreset = chromeCfg.cardRadiusPx > 0 ? 'roundRect' : 'rect'

  const stripH = 0.62
  const stripGap = 0.14
  const gridH = Math.max(2.6, area.h - stripH - stripGap)
  const gapX = 0.24
  const gapY = 0.20
  const qW = (area.w - gapX) / 2
  const qH = (gridH - gapY) / 2

  const anchorW = 2.16
  const anchorH = 0.92
  const anchorHalfOverlap = Math.max(0.95, anchorW / 2 - gapX / 2 + 0.10)

  model.quadrants.forEach((q, idx) => {
    const col = idx % 2
    const row = Math.floor(idx / 2)
    const qx = area.x + col * (qW + gapX)
    const qy = area.y + row * (qH + gapY)
    const toneColor = swotRoleColor(q.role, tk)

    shapes.push(ooxmlShape(nextIdFn(), 'SWOT Quadrant ' + q.key, { x: qx, y: qy, w: qW, h: qH }, {
      preset: cardPreset,
      adj: roundRectAdj(qW, qH, chromeCfg.cardRadiusPx),
      fill: idx === 2 ? tk.accentSoft : tk.surface1,
      stroke: chromeCfg.cardBorderless ? '' : (idx === 0 || idx === 2 ? toneColor : tk.hairline),
      strokePt: idx === 0 || idx === 2 ? 1.0 : 0.75,
    }))

    // 象限顶部语义色带标题栏（全部左对齐，下排 O/T 自动避让中央战略锚点）
    const headH = 0.40
    const headLeftIn = row === 1 && col === 1 ? anchorHalfOverlap : 0.18
    const headRightIn = row === 1 && col === 0 ? anchorHalfOverlap : 0.18
    shapes.push(ooxmlShape(nextIdFn(), 'SWOT Header ' + q.key, { x: qx, y: qy, w: qW, h: headH }, {
      preset: 'rect',
      fill: toneColor,
      anchor: 'ctr',
      marginsIn: { l: headLeftIn, r: headRightIn, t: 0.02, b: 0.02 },
      paragraphs: [ooxmlRichParagraph(q.header + (q.title && q.title !== q.header ? '  ·  ' + q.title : ''), { sizePt: 12.5, color: relativeLuminance(toneColor) > 0.42 ? '#0F172A' : '#FFFFFF', bold: true, lang: langAttr, align: 'l', font: theme.fonts.heading, lineHeight: 1.1 })],
    }))

    // 象限内容框（上排顶对齐且左边缘与标题严格对齐；密集多条要点时内侧避让中央锚点）
    const lines = [
      ...(q.text ? [q.text] : []),
      ...(q.bullets ?? []),
    ]
    const needInnerClearance = row === 0 && lines.length >= 4
    const leftPad = needInnerClearance && col === 1 ? anchorHalfOverlap : 0.18
    const rightPad = needInnerClearance && col === 0 ? anchorHalfOverlap : 0.22
    const contentBox = { x: qx + leftPad, y: qy + headH + 0.08, w: Math.max(1.8, qW - leftPad - rightPad), h: Math.max(0.6, qH - headH - 0.14) }
    if (lines.length > 0) {
      const fit = computeTextFit(lines, contentBox, 'cardBody', { maxPt: 13.5, minPt: 11.5 })
      const paras = []
      if (q.text) {
        paras.push(ooxmlRichParagraph(q.text, {
          sizePt: fit.fontPt,
          color: tk.inkPrimary,
          secondaryColor: tk.inkSecondary,
          lang: langAttr,
          font: theme.fonts.body,
          lineHeight: 1.32,
          spaceAfterPt: q.bullets?.length ? 4 : 0,
          autoLeadBold: true,
        }))
      }
      for (const b of q.bullets ?? []) {
        paras.push(ooxmlRichParagraph(b, {
          sizePt: fit.fontPt,
          color: tk.inkPrimary,
          secondaryColor: tk.inkSecondary,
          bullet: true,
          bulletColor: toneColor,
          lang: langAttr,
          font: theme.fonts.body,
          lineHeight: 1.3,
          spaceAfterPt: 3,
          autoLeadBold: true,
        }))
      }
      shapes.push(ooxmlShape(nextIdFn(), 'SWOT Body ' + q.key, contentBox, { txBox: true, anchor: row === 0 ? 't' : 'ctr', marginsIn: ZERO_MARGINS, fontScale: fit.fontScale, paragraphs: paras }))
    }
  })

  // 中央十字交汇“破局核心”八角徽章战略锚点（宽阔内切文本框，4~6 字词组绝不半词折行）
  const midX = area.x + area.w / 2
  const midY = area.y + gridH / 2
  const anchorLines = String(model.anchorText).split('\n').filter(Boolean)
  const maxAnchorLen = Math.max(1, ...anchorLines.map((ln) => ln.length))
  shapes.push(ooxmlShape(nextIdFn(), 'SWOT Strategic Anchor', { x: midX - anchorW / 2, y: midY - anchorH / 2, w: anchorW, h: anchorH }, {
    preset: 'octagon',
    adjs: { adj: 22000 },
    fill: tk.accentPrimary,
    stroke: tk.canvas,
    strokePt: 2.5,
    shadow: true,
    anchor: 'ctr',
    marginsIn: { l: 0.14, r: 0.14, t: 0.06, b: 0.06 },
    paragraphs: anchorLines.map((ln) =>
      ooxmlRichParagraph(ln, { sizePt: maxAnchorLen >= 7 ? 10.5 : 11.5, color: tk.inkOnAccent, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.heading, lineHeight: 1.15 }),
    ),
  }))

  // 底部 SO / WO / ST / WT 四栏可执行策略合成条
  const stripY = area.y + gridH + stripGap
  const stGap = 0.16
  const stW = (area.w - stGap * 3) / 4
  model.strategies.forEach((st, idx) => {
    const sx = area.x + idx * (stW + stGap)
    shapes.push(ooxmlShape(nextIdFn(), 'SWOT Strategy ' + st.key, { x: sx, y: stripY, w: stW, h: stripH }, {
      preset: cardPreset,
      adj: roundRectAdj(stW, stripH, Math.min(8, chromeCfg.cardRadiusPx)),
      fill: idx === 0 ? tk.accentSoft : tk.surface2,
      stroke: idx === 0 ? tk.accentPrimary : tk.hairline,
      strokePt: 0.75,
      anchor: 'ctr',
      marginsIn: { l: 0.12, r: 0.12, t: 0.04, b: 0.04 },
      paragraphs: [ooxmlRichParagraph('**' + st.key + '** · ' + st.action, { sizePt: 11, color: tk.inkPrimary, accentColor: tk.accentText, lang: langAttr, font: theme.fonts.body, lineHeight: 1.2 })],
    }))
  })

  return shapes.join('')
}

function renderSwotHtml(slide, langId) {
  const model = computeSwotModel(slide, langId)

  return (
    '<div class="swot-board">' +
    '<div class="swot-cross">' +
    model.quadrants.map((q, idx) =>
      '<article class="surface-card swot-quad swot-' + q.key.toLowerCase() + ' tone-' + q.role + '" data-item-index="' + idx + '">' +
      '<div class="swot-quad-head">' + escapeHtml(q.header + (q.title && q.title !== q.header ? ' · ' + q.title : '')) + '</div>' +
      '<div class="swot-quad-body">' +
      (q.text ? '<p class="card-body">' + renderInlineHtml(q.text, { autoLeadBold: true }) + '</p>' : '') +
      (q.bullets?.length ? '<ul class="card-bullets">' + q.bullets.map((b) => '<li>' + renderInlineHtml(b, { autoLeadBold: true }) + '</li>').join('') + '</ul>' : '') +
      '</div></article>',
    ).join('') +
    '<div class="swot-anchor"><span>' + escapeHtml(model.anchorText).replace(/\n/g, '<br>') + '</span></div>' +
    '</div>' +
    '<div class="layout-grid cols-4 swot-tows-strip">' +
    model.strategies.map((st) =>
      '<div class="surface-card swot-tows-pill">' +
      '<span class="item-badge">' + escapeHtml(st.key) + '</span>' +
      '<span class="swot-tows-text">' + renderInlineHtml(st.action) + '</span>' +
      '</div>',
    ).join('') +
    '</div></div>'
  )
}

function renderHarveyCellHtml(cellText, isHeader, cIdx, oursCol) {
  const isOurs = cIdx === oursCol
  if (!isHeader && cIdx > 0) {
    const parsed = parseHarveyValue(cellText)
    if (parsed) {
      if (parsed.kind === 'check') {
        return '<td class="harvey-cell' + (isOurs ? ' is-ours' : '') + '"><span class="harvey-check ' + (parsed.ok ? 'is-yes' : 'is-no') + '" aria-label="' + escapeHtml(parsed.label) + '">' + escapeHtml(parsed.label) + '</span></td>'
      }
      return '<td class="harvey-cell' + (isOurs ? ' is-ours' : '') + '"><span class="harvey-ball harvey-' + parsed.pct + '" title="' + escapeHtml(parsed.label) + '" aria-label="' + escapeHtml(parsed.label) + '"></span></td>'
    }
  }
  const tag = isHeader ? 'th' : 'td'
  return '<' + tag + (isOurs ? ' class="is-ours"' : (isNumericCell(cellText) ? ' class="num"' : '')) + '>' + renderInlineHtml(cellText) + '</' + tag + '>'
}

export function renderHarveyTableHtml(slide) {
  const items = resolveEffectiveItems(slide)
  const rows = Array.isArray(slide.rows) && slide.rows.length > 0
    ? slide.rows
    : items.length > 0
      ? [['评估维度', '行业基线', '本方案 / Ours'], ...items.map((it) => [it.title || '', it.delta || '50%', it.value || 'full'])]
      : [['维度', '本方案 / Ours'], ['能力项', 'full']]
  const cols = Math.max(2, ...rows.map((r) => r.length))
  const head = Array.from({ length: cols }, (_, c) => String(rows[0]?.[c] ?? ''))
  const oursCol = findHarveyOursCol(head, cols)
  const body = rows.slice(1)
  return (
    '<table class="deck-table harvey-table"><thead><tr>' +
    head.map((cell, cIdx) => renderHarveyCellHtml(cell, true, cIdx, oursCol)).join('') +
    '</tr></thead><tbody>' +
    body.map((row) => '<tr>' + Array.from({ length: cols }, (_, cIdx) => renderHarveyCellHtml(String(row[cIdx] ?? ''), false, cIdx, oursCol)).join('') + '</tr>').join('') +
    '</tbody></table>'
  )
}

export function renderDiagramSlideBodyPptx(slide, ctx) {
  const { theme, langAttr, chromeCfg, nextId, bodyTopY, bodyBottomY, bodyH, cardPreset } = ctx
  const tk = theme.tokens
  const layout = slide.layout || 'bullets'
  const variant = slide.variant || ''
  const title = slide.title || ''
  const shapes = []

  if (layout === 'harvey') {
    return renderHarveyMatrixPptx(slide, { x: 0.62, y: bodyTopY + 0.06, w: 12.09, h: bodyH - 0.14 }, nextId, chromeCfg, theme, langAttr)
  }
  if (layout === 'marimekko') {
    return renderMarimekkoPptx(slide, { x: 0.62, y: bodyTopY + 0.04, w: 12.09, h: bodyH - 0.10 }, nextId, chromeCfg, theme, langAttr)
  }
  if (layout === 'sankey') {
    return renderSankeyPptx(slide, { x: 0.62, y: bodyTopY + 0.04, w: 12.09, h: bodyH - 0.10 }, nextId, chromeCfg, theme, langAttr)
  }
  if (layout === 'value-chain') {
    return renderPorterValueChainPptx(slide, { x: 0.62, y: bodyTopY + 0.04, w: 12.09, h: bodyH - 0.10 }, nextId, chromeCfg, theme, langAttr)
  }
  if (layout === 'swot' || (layout === 'matrix' && variant === 'swot')) {
    return renderSwotPptx(slide, { x: 0.62, y: bodyTopY + 0.04, w: 12.09, h: bodyH - 0.10 }, nextId, chromeCfg, theme, langAttr)
  }

  if (layout === 'gantt') {
    const defaultCols = variant === 'months'
      ? ['M1', 'M2', 'M3', 'M4', 'M5', 'M6']
      : variant === 'weeks'
        ? ['W1', 'W2', 'W3', 'W4', 'W5', 'W6']
        : ['Q1', 'Q2', 'Q3', 'Q4']
    const cols = Array.isArray(slide.columns) && slide.columns.length > 0 && slide.columns.every((c) => typeof c === 'string')
      ? slide.columns.slice(0, 8)
      : defaultCols
    const colCount = Math.max(2, cols.length)
    const items = resolveEffectiveItems(slide).slice(0, 7)
    const rowCount = Math.max(1, items.length)

    const labelW = 3.72
    const gridX = 0.62 + labelW + 0.14
    const gridW = 12.71 - gridX
    const headH = 0.44
    const rowGap = 0.08
    const availRowH = bodyH - headH - 0.14
    const rowH = Math.min(0.66, Math.max(0.42, (availRowH - rowGap * (rowCount - 1)) / rowCount))
    const colW = gridW / colCount
    const totalH = headH + rowCount * rowH + Math.max(0, rowCount - 1) * rowGap
    const topY = bodyTopY + Math.max(0, (bodyH - totalH) / 2)

    // Left corner header + time column headers
    shapes.push(ooxmlShape(nextId(), 'Gantt Corner', { x: 0.62, y: topY, w: labelW, h: headH }, {
      preset: cardPreset,
      adj: roundRectAdj(labelW, headH, Math.min(6, chromeCfg.cardRadiusPx)),
      fill: tk.surface2,
      stroke: tk.hairline,
      strokePt: 0.5,
      anchor: 'ctr',
      marginsIn: { l: 0.14, r: 0.08, t: 0.02, b: 0.02 },
      paragraphs: [ooxmlRichParagraph(variant === 'swimlane' ? (langAttr === 'en-US' ? 'WORKSTREAM / TASK' : '泳道 / 任务项') : (langAttr === 'en-US' ? 'INITIATIVE / MILESTONE' : '任务里程碑'), { sizePt: 11, color: tk.inkMuted, bold: true, lang: langAttr, font: theme.fonts.body })],
    }))

    cols.forEach((colLabel, cIdx) => {
      const cx = gridX + cIdx * colW
      shapes.push(ooxmlShape(nextId(), 'Gantt Col ' + (cIdx + 1), { x: cx, y: topY, w: colW, h: headH }, {
        preset: 'rect',
        fill: cIdx % 2 === 0 ? tk.surface2 : tk.surface1,
        stroke: tk.hairline,
        strokePt: 0.5,
        anchor: 'ctr',
        marginsIn: { l: 0.04, r: 0.04, t: 0.02, b: 0.02 },
        paragraphs: [ooxmlRichParagraph(colLabel, { sizePt: 12, color: tk.inkPrimary, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.heading })],
      }))
    })

    // Vertical grid lines
    const gridBottomY = topY + totalH
    for (let c = 0; c <= colCount; c += 1) {
      const lx = gridX + c * colW
      shapes.push(ooxmlLine(nextId(), 'Gantt Grid ' + c, { x: lx, y: topY + headH }, { x: lx, y: gridBottomY }, { color: tk.hairline, widthPt: 0.5, dash: c === 0 || c === colCount ? '' : 'dot' }))
    }

    const barPalette = [tk.accentPrimary, tk.accentSecondary, tk.positive, tk.accentPrimary]
    items.forEach((it, idx) => {
      const ry = topY + headH + 0.06 + idx * (rowH + rowGap)
      const st = statusPalette(it.status, tk)
      const barFill = it.status ? st.bar : barPalette[idx % barPalette.length]

      // Row backdrop
      shapes.push(ooxmlShape(nextId(), 'Gantt Track ' + (idx + 1), { x: gridX, y: ry, w: gridW, h: rowH }, { preset: 'rect', fill: idx % 2 === 0 ? tk.surface1 : tk.canvas, stroke: tk.hairline, strokePt: 0.25 }))

      // Left task label card (optional swimlane tag + title)
      shapes.push(ooxmlShape(nextId(), 'Gantt Task BG ' + (idx + 1), { x: 0.62, y: ry, w: labelW, h: rowH }, { preset: cardPreset, adj: roundRectAdj(labelW, rowH, Math.min(6, chromeCfg.cardRadiusPx)), fill: tk.surface1, stroke: chromeCfg.cardBorderless ? '' : tk.hairline, strokePt: 0.5 }))
      if (it.tag) {
        const tagW = computeBadgePillWidth(it.tag, 9.5, 1.18, 0.52)
        shapes.push(ooxmlShape(nextId(), 'Gantt Tag ' + (idx + 1), { x: 0.72, y: ry + (rowH - 0.28) / 2, w: tagW, h: 0.28 }, {
          preset: cardPreset,
          adj: roundRectAdj(tagW, 0.28, Math.min(6, chromeCfg.cardRadiusPx)),
          fill: tk.accentSoft,
          anchor: 'ctr',
          marginsIn: { l: 0.03, r: 0.03, t: 0.01, b: 0.01 },
          paragraphs: [ooxmlRichParagraph(it.tag, { sizePt: 9.5, color: tk.accentText, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.body })],
        }))
        shapes.push(ooxmlShape(nextId(), 'Gantt ' + (idx + 1), { x: 0.72 + tagW + 0.10, y: ry + 0.02, w: labelW - tagW - 0.28, h: rowH - 0.04 }, {
          txBox: true,
          anchor: 'ctr',
          marginsIn: ZERO_MARGINS,
          paragraphs: [ooxmlRichParagraph(it.title || it.text || '', { sizePt: 12.5, color: tk.inkPrimary, bold: true, lang: langAttr, font: theme.fonts.body, lineHeight: 1.15 })],
        }))
      } else {
        shapes.push(ooxmlShape(nextId(), 'Gantt ' + (idx + 1), { x: 0.76, y: ry + 0.02, w: labelW - 0.24, h: rowH - 0.04 }, {
          txBox: true,
          anchor: 'ctr',
          marginsIn: ZERO_MARGINS,
          paragraphs: [ooxmlRichParagraph(it.title || it.text || '', { sizePt: 13, color: tk.inkPrimary, bold: true, lang: langAttr, font: theme.fonts.body, lineHeight: 1.15 })],
        }))
      }

      const startSlot = it.start !== undefined
        ? Math.max(0, Math.min(colCount - 0.25, it.start))
        : Math.min(colCount - 1, idx % colCount)
      const isPureMilestone = it.span === 0 || (Boolean(it.milestone) && it.span === undefined)
      const hasEndMilestone = !isPureMilestone && Boolean(it.milestone)
      if (isPureMilestone) {
        const mCenter = gridX + ((startSlot + 0.5) / colCount) * gridW
        const mSize = Math.min(0.32, rowH * 0.62)
        shapes.push(ooxmlShape(nextId(), 'Gantt Milestone ' + (idx + 1), { x: mCenter - mSize / 2, y: ry + (rowH - mSize) / 2, w: mSize, h: mSize }, { preset: 'diamond', fill: barFill, stroke: tk.canvas, strokePt: 1.0 }))
        const mLabel = it.value || it.delta || it.text || ''
        if (mLabel) {
          const onRight = startSlot < colCount - 1.2
          const lblBox = onRight
            ? { x: mCenter + mSize / 2 + 0.10, y: ry + 0.04, w: Math.max(1.2, gridX + gridW - (mCenter + mSize / 2 + 0.14)), h: rowH - 0.08 }
            : { x: Math.max(gridX + 0.08, mCenter - mSize / 2 - 2.1), y: ry + 0.04, w: 2.0, h: rowH - 0.08 }
          shapes.push(ooxmlShape(nextId(), 'Gantt Milestone Label ' + (idx + 1), lblBox, {
            txBox: true,
            anchor: 'ctr',
            marginsIn: ZERO_MARGINS,
            paragraphs: [ooxmlRichParagraph(mLabel, { sizePt: 11, color: tk.accentText, bold: true, lang: langAttr, align: onRight ? 'l' : 'r', font: theme.fonts.body })],
          }))
        }
      } else {
        const spanSlot = Math.max(0.35, Math.min(colCount - startSlot, it.span !== undefined ? it.span : 1))
        const barX = gridX + (startSlot / colCount) * gridW + 0.04
        const barW = Math.max(0.30, (spanSlot / colCount) * gridW - 0.08)
        const barH = Math.min(0.36, rowH * 0.64)
        const barY = ry + (rowH - barH) / 2
        const barText = it.value || it.delta || ''
        shapes.push(ooxmlShape(nextId(), 'Gantt Bar ' + (idx + 1), { x: barX, y: barY, w: barW, h: barH }, {
          preset: chromeCfg.cardRadiusPx > 0 ? 'roundRect' : 'rect',
          adj: roundRectAdj(barW, barH, Math.min(8, chromeCfg.cardRadiusPx)),
          fill: barFill,
          anchor: 'ctr',
          marginsIn: { l: 0.08, r: 0.08, t: 0.01, b: 0.01 },
          paragraphs: barText
            ? [ooxmlRichParagraph(barText, { sizePt: 11, color: '#FFFFFF', bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.body })]
            : [],
        }))
        if (hasEndMilestone) {
          const endMSize = Math.min(0.28, rowH * 0.56)
          shapes.push(ooxmlShape(nextId(), 'Gantt Milestone ' + (idx + 1), { x: barX + barW - endMSize / 2, y: ry + (rowH - endMSize) / 2, w: endMSize, h: endMSize }, { preset: 'diamond', fill: barFill, stroke: tk.canvas, strokePt: 1.5 }))
        }
      }
    })

    return shapes.join('')
  }

  if (layout === 'architecture') {
    const allItems = resolveEffectiveItems(slide).slice(0, 6)
    const isSidecarItem = (it) =>
      it.status === 'accent' || /^(?:sidecar|governance|security|observability|安全|治理|可观测|监控|合规|运维)$/i.test(String(it.tag || '').trim())
    const candidateSidecars = allItems.filter(isSidecarItem)
    const candidateTiers = allItems.filter((it) => !isSidecarItem(it))
    const hasSidecar = candidateSidecars.length >= 1 && candidateTiers.length >= 2
    const sidecarItems = hasSidecar ? candidateSidecars : []
    const tierItems = hasSidecar ? candidateTiers : allItems
    const nTiers = Math.max(1, tierItems.length)

    const sidecarW = hasSidecar ? 2.38 : 0
    const sidecarGap = hasSidecar ? 0.24 : 0
    const tierAreaW = 12.09 - sidecarW - sidecarGap
    const arrowH = nTiers > 1 ? 0.34 : 0
    const tierH = Math.min(1.32, (bodyH - arrowH * Math.max(0, nTiers - 1)) / nTiers)
    const totalArchH = tierH * nTiers + arrowH * Math.max(0, nTiers - 1)
    const startY = bodyTopY + Math.max(0, (bodyH - totalArchH) / 2)

    tierItems.forEach((it, idx) => {
      const ty = startY + idx * (tierH + arrowH)
      const isTopTier = idx === 0
      shapes.push(renderSurfaceCardPptx('Architecture Tier ' + (idx + 1), { x: 0.62, y: ty, w: tierAreaW, h: tierH }, { fill: isTopTier ? tk.surface2 : tk.surface1, focal: isTopTier }, nextId, chromeCfg, theme))

      // Left tier label block
      const labelW = Math.min(2.65, tierAreaW * 0.27)
      shapes.push(ooxmlShape(nextId(), 'Architecture ' + (idx + 1), { x: 0.78, y: ty + 0.08, w: labelW, h: tierH - 0.16 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0.04, r: 0.06, t: 0.02, b: 0.02 },
        paragraphs: [
          ...(it.tag ? [ooxmlRichParagraph(it.tag.toUpperCase(), { sizePt: 9.5, color: tk.accentText, bold: true, lang: langAttr, font: theme.fonts.body, spc: 100, spaceAfterPt: 2 })] : []),
          ooxmlRichParagraph(it.title || '', { sizePt: 14.5, color: tk.inkPrimary, bold: true, lang: langAttr, font: theme.fonts.heading, lineHeight: 1.18 }),
        ],
      }))

      // Sub-module boxes from bullets[] or text fallback
      const modsX = 0.62 + labelW + 0.22
      const modsW = tierAreaW - labelW - 0.38
      const mods = it.bullets?.length ? it.bullets : (it.text ? [it.text] : [])
      if (mods.length > 0) {
        const modGap = 0.14
        const modW = (modsW - modGap * (mods.length - 1)) / mods.length
        const modH = Math.max(0.46, tierH - 0.28)
        mods.forEach((modText, mIdx) => {
          const mx = modsX + mIdx * (modW + modGap)
          shapes.push(ooxmlShape(nextId(), 'Arch Module ' + (idx + 1) + '-' + (mIdx + 1), { x: mx, y: ty + 0.14, w: modW, h: modH }, {
            preset: cardPreset,
            adj: roundRectAdj(modW, modH, Math.min(8, chromeCfg.cardRadiusPx)),
            fill: tk.canvas,
            stroke: tk.hairline,
            strokePt: 0.75,
            anchor: 'ctr',
            marginsIn: { l: 0.08, r: 0.08, t: 0.04, b: 0.04 },
            paragraphs: [
              ooxmlRichParagraph(modText, {
                sizePt: mods.length >= 4 ? 12 : 13,
                color: tk.inkPrimary,
                secondaryColor: tk.inkSecondary,
                bold: false,
                lang: langAttr,
                align: 'ctr',
                font: theme.fonts.body,
                lineHeight: 1.2,
                autoLeadBold: true,
              }),
            ],
          }))
        })
      }

      // Dataflow arrows between tiers
      if (idx < nTiers - 1) {
        const ay = ty + tierH + 0.02
        const ah = arrowH - 0.04
        const arrowPreset = variant === 'platform' ? 'upDownArrow' : 'downArrow'
        const positions = [0.62 + tierAreaW * 0.36, 0.62 + tierAreaW * 0.68]
        positions.forEach((ax, aIdx) => {
          shapes.push(ooxmlShape(nextId(), 'Arch Arrow ' + (idx + 1) + '-' + (aIdx + 1), { x: ax - 0.09, y: ay, w: 0.18, h: ah }, { preset: arrowPreset, fill: tk.accentPrimary }))
        })
      }
    })

    if (hasSidecar) {
      const sx = 0.62 + tierAreaW + sidecarGap
      const sideCount = sidecarItems.length
      const scGap = 0.16
      const scH = (totalArchH - scGap * (sideCount - 1)) / sideCount
      sidecarItems.forEach((sc, sIdx) => {
        const sy = startY + sIdx * (scH + scGap)
        shapes.push(renderSurfaceCardPptx('Arch Sidecar ' + (sIdx + 1), { x: sx, y: sy, w: sidecarW, h: scH }, { fill: tk.accentSoft, focal: true }, nextId, chromeCfg, theme))
        const scLines = [sc.title || '', sc.text || '', ...(sc.bullets ?? [])].filter(Boolean)
        const scBox = { x: sx + 0.16, y: sy + 0.16, w: sidecarW - 0.32, h: scH - 0.32 }
        const scFit = computeTextFit(scLines, scBox, 'cardBody', { maxPt: 13.5, minPt: 11.5 })
        const scParas = []
        if (sc.tag) {
          scParas.push(ooxmlRichParagraph(sc.tag.toUpperCase(), { sizePt: 9.5, color: tk.accentText, bold: true, lang: langAttr, font: theme.fonts.body, spc: 100, spaceAfterPt: 4 }))
        }
        if (sc.title) {
          scParas.push(ooxmlRichParagraph(sc.title, { sizePt: 14.5, color: tk.inkPrimary, bold: true, lang: langAttr, font: theme.fonts.heading, spaceAfterPt: 6 }))
        }
        if (sc.text) {
          scParas.push(ooxmlRichParagraph(sc.text, { sizePt: scFit.fontPt, color: tk.inkSecondary, lang: langAttr, font: theme.fonts.body, lineHeight: 1.32, spaceAfterPt: 5 }))
        }
        for (const b of sc.bullets ?? []) {
          scParas.push(ooxmlRichParagraph(b, { sizePt: scFit.fontPt, color: tk.inkPrimary, secondaryColor: tk.inkSecondary, bullet: true, bulletColor: tk.accentPrimary, lang: langAttr, font: theme.fonts.body, lineHeight: 1.3, spaceAfterPt: 4, autoLeadBold: true }))
        }
        shapes.push(ooxmlShape(nextId(), 'Architecture Sidecar Text ' + (sIdx + 1), scBox, { txBox: true, anchor: 'ctr', marginsIn: ZERO_MARGINS, fontScale: scFit.fontScale, paragraphs: scParas }))
      })
    }

    return shapes.join('')
  }

  if (layout === 'tam') {
    const rawItems = resolveEffectiveItems(slide).slice(0, 3)
    const defaults = ['TAM', 'SAM', 'SOM']
    const items = Array.from({ length: Math.max(1, rawItems.length) }, (_, idx) => ({
      ...rawItems[idx],
      tag: rawItems[idx]?.tag || defaults[idx] || ('T' + (idx + 1)),
    }))
    const maxDiam = Math.min(4.78, bodyH - 0.12)
    const cx = 3.12
    const bottomY = bodyTopY + (bodyH + maxDiam) / 2
    const ratios = [1.0, 0.68, 0.39]
    const ringFills = [tk.surface1, tk.accentSoft, tk.accentPrimary]
    const ringStrokes = [tk.hairline, tk.accentPrimary, tk.accentPrimary]

    // 3 bottom-tangent nested ellipses (drawn outer-to-inner)
    const ringLabelYs = []
    items.forEach((it, idx) => {
      const d = maxDiam * (ratios[idx] ?? Math.max(0.28, 1 - idx * 0.28))
      const rx = cx - d / 2
      const ry = bottomY - d
      const isInner = idx === items.length - 1
      shapes.push(ooxmlShape(nextId(), 'TAM Circle ' + (idx + 1), { x: rx, y: ry, w: d, h: d }, {
        preset: 'ellipse',
        fill: ringFills[idx] ?? tk.surface2,
        stroke: ringStrokes[idx] ?? tk.accentPrimary,
        strokePt: idx === 0 ? 1.25 : 1.5,
      }))
      const lblY = isInner ? ry + d / 2 - 0.30 : ry + 0.14
      const lblH = isInner ? 0.60 : 0.44
      const lblCenterY = lblY + lblH / 2
      ringLabelYs.push(lblCenterY)
      const halfChord = Math.sqrt(Math.max(0.04, (d / 2) ** 2 - (lblCenterY - (ry + d / 2)) ** 2))
      const lblW = Math.max(0.85, Math.min(d * 0.72, 2 * halfChord - 0.24))
      const ringShortTag = String(it.tag || defaults[idx] || ('T' + (idx + 1))).split(/\s*[·:：\-—|]\s*/)[0].trim() || (defaults[idx] || ('T' + (idx + 1)))
      const ringText = ringShortTag + (it.value ? (isInner ? '\n' : '  ') + it.value + (it.unit ? ' ' + it.unit : '') : '')
      shapes.push(ooxmlShape(nextId(), 'TAM Label ' + (idx + 1), { x: cx - lblW / 2, y: lblY, w: lblW, h: lblH }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: ZERO_MARGINS,
        paragraphs: [ooxmlRichParagraph(ringText, { sizePt: isInner ? 12.5 : 12, color: isInner ? tk.inkOnAccent : tk.accentText, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.heading })],
      }))
    })

    // Right 3 breakdown cards + horizontal leader connectors
    const cardX = 6.26
    const cardW = 6.45
    const cardGap = 0.20
    const nCards = items.length
    const cardH = Math.min(1.52, (bodyH - cardGap * (nCards - 1)) / nCards)
    const cardsStartY = bodyTopY + Math.max(0, (bodyH - (cardH * nCards + cardGap * (nCards - 1))) / 2)

    items.forEach((it, idx) => {
      const cy = cardsStartY + idx * (cardH + cardGap)
      const isInner = idx === nCards - 1
      const d = maxDiam * (ratios[idx] ?? 0.4)
      const circleTopY = bottomY - d
      const dy = (ringLabelYs[idx] ?? (circleTopY + 0.3)) - (circleTopY + d / 2)
      const r = d / 2
      const dx = Math.sqrt(Math.max(0, r * r - dy * dy))
      const lineStartX = Math.min(cardX - 0.14, cx + dx * 0.72)
      const lineY = cy + cardH / 2
      shapes.push(ooxmlLine(nextId(), 'TAM Connector ' + (idx + 1), { x: lineStartX, y: lineY }, { x: cardX, y: lineY }, { color: isInner ? tk.accentPrimary : tk.hairline, widthPt: 1.0, dash: 'dot' }))

      shapes.push(renderSurfaceCardPptx('TAM Card ' + (idx + 1), { x: cardX, y: cy, w: cardW, h: cardH }, { fill: isInner ? tk.accentSoft : tk.surface1, focal: isInner }, nextId, chromeCfg, theme))

      const tagW = computeBadgePillWidth(it.tag, 10.5, 1.85, 0.72)
      shapes.push(ooxmlShape(nextId(), 'TAM Tag ' + (idx + 1), { x: cardX + 0.22, y: cy + 0.22, w: tagW, h: 0.32 }, {
        preset: cardPreset,
        adj: roundRectAdj(tagW, 0.32, Math.min(6, chromeCfg.cardRadiusPx)),
        fill: isInner ? tk.accentPrimary : tk.surface2,
        anchor: 'ctr',
        marginsIn: { l: 0.04, r: 0.04, t: 0.01, b: 0.01 },
        paragraphs: [ooxmlRichParagraph(it.tag, { sizePt: 10.5, color: isInner ? tk.inkOnAccent : tk.accentText, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.heading })],
      }))

      const metaColW = Math.max(1.85, tagW)
      if (it.value) {
        shapes.push(ooxmlShape(nextId(), 'TAM Value ' + (idx + 1), { x: cardX + 0.22, y: cy + 0.62, w: metaColW, h: cardH - 0.76 }, {
          txBox: true,
          anchor: 'ctr',
          marginsIn: ZERO_MARGINS,
          paragraphs: [ooxmlRichParagraph(it.value + (it.unit ? ' ' + it.unit : ''), { sizePt: 20, color: tk.accentText, bold: true, lang: langAttr, font: theme.fonts.heading })],
        }))
      }

      const cardBodyText = [it.text, ...(it.bullets ?? [])].filter(Boolean).join('；')
      const textLeft = it.value ? cardX + 0.22 + metaColW + 0.16 : cardX + 0.22 + tagW + 0.18
      const textBox = { x: textLeft, y: cy + 0.16, w: cardX + cardW - textLeft - 0.18, h: cardH - 0.32 }
      const fit = computeTextFit([it.title || '', cardBodyText], textBox, 'cardBody', { maxPt: 14.5, minPt: 12.5 })
      shapes.push(ooxmlShape(nextId(), 'TAM ' + (idx + 1), textBox, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: ZERO_MARGINS,
        fontScale: fit.fontScale,
        paragraphs: [
          ...(it.title ? [ooxmlRichParagraph(it.title, { sizePt: Math.min(16, fit.fontPt + 1.5), color: tk.inkPrimary, bold: true, lang: langAttr, font: theme.fonts.heading, spaceAfterPt: cardBodyText ? 4 : 0 })] : []),
          ...(cardBodyText ? [ooxmlRichParagraph(cardBodyText, { sizePt: fit.fontPt, color: tk.inkSecondary, lang: langAttr, font: theme.fonts.body, lineHeight: 1.32 })] : []),
        ],
      }))
    })

    return shapes.join('')
  }

  if (layout === 'org') {
    const items = resolveEffectiveItems(slide)
    if (variant === 'team') {
      const members = items.slice(0, 4)
      const n = Math.max(1, members.length)
      const gap = 0.28
      const cardW = (12.09 - gap * (n - 1)) / n
      const cardH = Math.min(4.35, bodyH - 0.16)
      const cardY = bodyTopY + (bodyH - cardH) / 2

      members.forEach((it, idx) => {
        const cx = 0.62 + idx * (cardW + gap)
        shapes.push(renderSurfaceCardPptx('Team Card ' + (idx + 1), { x: cx, y: cardY, w: cardW, h: cardH }, { fill: tk.surface1, focal: idx === 0 }, nextId, chromeCfg, theme))

        const avatarD = 0.78
        const avatarX = cx + (cardW - avatarD) / 2
        const avatarY = cardY + 0.26
        shapes.push(ooxmlShape(nextId(), 'Team Avatar ' + (idx + 1), { x: avatarX, y: avatarY, w: avatarD, h: avatarD }, {
          preset: 'ellipse',
          fill: idx === 0 ? tk.accentPrimary : tk.surface2,
          stroke: tk.accentPrimary,
          strokePt: 1.25,
          anchor: 'ctr',
          marginsIn: ZERO_MARGINS,
          paragraphs: [ooxmlRichParagraph(monogramLetters(it.title || it.tag || 'T'), { sizePt: 18, color: idx === 0 ? tk.inkOnAccent : tk.accentText, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.heading })],
        }))

        const roleText = it.role || it.tag || ''
        if (roleText) {
          const roleW = computeBadgePillWidth(roleText, 10.5, cardW - 0.36, 0.85)
          shapes.push(ooxmlShape(nextId(), 'Team Role ' + (idx + 1), { x: cx + (cardW - roleW) / 2, y: avatarY + avatarD + 0.14, w: roleW, h: 0.28 }, {
            preset: 'roundRect',
            adj: 50000,
            fill: tk.accentSoft,
            anchor: 'ctr',
            marginsIn: { l: 0.04, r: 0.04, t: 0.01, b: 0.01 },
            paragraphs: [ooxmlRichParagraph(roleText, { sizePt: 10.5, color: tk.accentText, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.body })],
          }))
        }

        const innerY = avatarY + avatarD + (roleText ? 0.52 : 0.20)
        const innerBox = { x: cx + 0.20, y: innerY, w: cardW - 0.40, h: Math.max(0.8, cardY + cardH - innerY - 0.16) }
        const bodyLines = [it.text || '', ...(it.bullets ?? [])].filter(Boolean)
        const fit = computeTextFit([it.title || '', ...bodyLines], innerBox, 'cardBody', { maxPt: 14.5, minPt: 12.5 })
        const paras = []
        if (it.title) {
          paras.push(ooxmlRichParagraph(it.title, { sizePt: 16.5, color: tk.inkPrimary, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.heading, spaceAfterPt: 6 }))
        }
        if (it.text) {
          paras.push(ooxmlRichParagraph(it.text, { sizePt: fit.fontPt, color: tk.inkSecondary, lang: langAttr, align: 'ctr', font: theme.fonts.body, lineHeight: 1.36, spaceAfterPt: 4 }))
        }
        for (const b of it.bullets ?? []) {
          paras.push(ooxmlRichParagraph(b, { sizePt: fit.fontPt, color: tk.inkSecondary, bullet: true, bulletColor: tk.accentPrimary, lang: langAttr, font: theme.fonts.body, lineHeight: 1.32, spaceAfterPt: 3 }))
        }
        shapes.push(ooxmlShape(nextId(), 'Team ' + (idx + 1), innerBox, { txBox: true, anchor: 't', marginsIn: ZERO_MARGINS, fontScale: fit.fontScale, paragraphs: paras }))
      })
    } else {
      // 'tree' hierarchy org chart
      const rootItem = items[0] ?? { tag: 'CEO', title: title || '组织架构' }
      const rawChildren = items.length > 1
        ? items.slice(1, 6)
        : (rootItem.bullets ?? []).slice(0, 5).map((b, i) => ({ tag: 'DEPT ' + (i + 1), title: b }))
      const children = rawChildren.length > 0 ? rawChildren : [{ title: '核心业务单元' }]
      const nChild = children.length

      const rootW = 4.4
      const rootH = 1.18
      const rootX = (CANVAS_IN.w - rootW) / 2
      const rootY = bodyTopY + 0.08
      shapes.push(renderSurfaceCardPptx('Org Root', { x: rootX, y: rootY, w: rootW, h: rootH }, { fill: tk.accentSoft, focal: true }, nextId, chromeCfg, theme))
      shapes.push(ooxmlShape(nextId(), 'Org 0', { x: rootX + 0.18, y: rootY + 0.10, w: rootW - 0.36, h: rootH - 0.20 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: ZERO_MARGINS,
        paragraphs: [
          ...((rootItem.role || rootItem.tag) ? [ooxmlRichParagraph((rootItem.role || rootItem.tag).toUpperCase(), { sizePt: 10, color: tk.accentText, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.body, spc: 120, spaceAfterPt: 2 })] : []),
          ooxmlRichParagraph(rootItem.title || '', { sizePt: 16.5, color: tk.inkPrimary, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.heading, spaceAfterPt: rootItem.text ? 2 : 0 }),
          ...(rootItem.text ? [ooxmlRichParagraph(rootItem.text, { sizePt: 12.5, color: tk.inkSecondary, lang: langAttr, align: 'ctr', font: theme.fonts.body })] : []),
        ],
      }))

      const busY = rootY + rootH + 0.38
      const childTopY = busY + 0.36
      const childH = Math.max(1.85, bodyBottomY - childTopY - 0.10)
      const gap = nChild >= 5 ? 0.18 : 0.26
      const childW = (12.09 - gap * (nChild - 1)) / nChild
      const rootCx = CANVAS_IN.w / 2

      // Trunk from root bottom to busY
      shapes.push(ooxmlLine(nextId(), 'Org Trunk', { x: rootCx, y: rootY + rootH }, { x: rootCx, y: busY }, { color: tk.accentPrimary, widthPt: 1.5 }))

      const childCxs = children.map((_, idx) => 0.62 + idx * (childW + gap) + childW / 2)
      if (childCxs.length >= 2) {
        shapes.push(ooxmlLine(nextId(), 'Org Bus', { x: childCxs[0], y: busY }, { x: childCxs[childCxs.length - 1], y: busY }, { color: tk.accentPrimary, widthPt: 1.5 }))
      }

      children.forEach((ch, idx) => {
        const cx = 0.62 + idx * (childW + gap)
        const midX = childCxs[idx]
        shapes.push(ooxmlLine(nextId(), 'Org Branch ' + (idx + 1), { x: midX, y: busY }, { x: midX, y: childTopY }, { color: tk.accentPrimary, widthPt: 1.25 }))
        shapes.push(renderSurfaceCardPptx('Org Child ' + (idx + 1), { x: cx, y: childTopY, w: childW, h: childH }, { fill: tk.surface1, focal: false }, nextId, chromeCfg, theme))

        const roleLabel = ch.role || ch.tag || ''
        if (roleLabel) {
          const rW = computeBadgePillWidth(roleLabel, 10, childW - 0.28, 0.54)
          shapes.push(ooxmlShape(nextId(), 'Org Tag ' + (idx + 1), { x: cx + 0.16, y: childTopY + 0.16, w: rW, h: 0.28 }, {
            preset: cardPreset,
            adj: roundRectAdj(rW, 0.28, Math.min(6, chromeCfg.cardRadiusPx)),
            fill: tk.accentSoft,
            anchor: 'ctr',
            marginsIn: { l: 0.03, r: 0.03, t: 0.01, b: 0.01 },
            paragraphs: [ooxmlRichParagraph(roleLabel, { sizePt: 10, color: tk.accentText, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.body })],
          }))
        }

        const innerTop = childTopY + (roleLabel ? 0.54 : 0.20)
        const innerBox = { x: cx + 0.16, y: innerTop, w: childW - 0.32, h: Math.max(0.8, childTopY + childH - innerTop - 0.14) }
        const bodyLines = [ch.text || '', ...(ch.bullets ?? [])].filter(Boolean)
        const fit = computeTextFit([ch.title || '', ...bodyLines], innerBox, 'cardBody', { maxPt: 14, minPt: 12 })
        const paras = []
        if (ch.title) {
          paras.push(ooxmlRichParagraph(ch.title, { sizePt: Math.min(16, fit.fontPt + 1.5), color: tk.inkPrimary, bold: true, lang: langAttr, font: theme.fonts.heading, spaceAfterPt: bodyLines.length ? 5 : 0 }))
        }
        if (ch.text) {
          paras.push(ooxmlRichParagraph(ch.text, { sizePt: fit.fontPt, color: tk.inkSecondary, lang: langAttr, font: theme.fonts.body, lineHeight: 1.32, spaceAfterPt: 4 }))
        }
        for (const b of ch.bullets ?? []) {
          paras.push(ooxmlRichParagraph(b, { sizePt: fit.fontPt, color: tk.inkSecondary, bullet: true, bulletColor: tk.accentPrimary, lang: langAttr, font: theme.fonts.body, lineHeight: 1.3, spaceAfterPt: 3 }))
        }
        shapes.push(ooxmlShape(nextId(), 'Org ' + (idx + 1), innerBox, { txBox: true, anchor: 't', marginsIn: ZERO_MARGINS, fontScale: fit.fontScale, paragraphs: paras }))
      })
    }
    return shapes.join('')
  }

  if (layout === 'process') {
    const items = resolveEffectiveItems(slide).slice(0, 6)
    const n = Math.max(1, items.length)

    if (variant === 'flywheel') {
      const centerX = CANVAS_IN.w / 2
      const centerY = bodyTopY + bodyH / 2
      const hubD = Math.min(2.28, bodyH * 0.46)
      const ringD = Math.min(4.25, bodyH * 0.86)
      // Subtle circular orbital ring behind flywheel
      shapes.push(ooxmlShape(nextId(), 'Flywheel Orbit', { x: centerX - ringD / 2, y: centerY - ringD / 2, w: ringD, h: ringD }, { preset: 'ellipse', fill: '', stroke: tk.hairline, strokePt: 1.5, dash: 'dash' }))
      // Central hub
      shapes.push(ooxmlShape(nextId(), 'Flywheel Hub', { x: centerX - hubD / 2, y: centerY - hubD / 2, w: hubD, h: hubD }, {
        preset: 'ellipse',
        fill: tk.accentPrimary,
        stroke: tk.canvas,
        strokePt: 2.0,
        anchor: 'ctr',
        marginsIn: { l: 0.16, r: 0.16, t: 0.12, b: 0.12 },
        paragraphs: [
          ooxmlRichParagraph(
            (slide.text && slide.text.trim().length <= 18 ? slide.text.trim() : '')
              || (slide.subtitle && slide.subtitle.trim().length <= 18 ? slide.subtitle.trim() : '')
              || (langAttr === 'en-US' ? 'Growth\nFlywheel' : '增长飞轮'),
            { sizePt: 15, color: tk.inkOnAccent, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.heading, lineHeight: 1.22 },
          ),
        ],
      }))

      // 4-node corner flywheel (or radial ring for 3/5/6 nodes)
      const nodes = items.slice(0, 4)
      const cardW = 4.32
      const cardH = Math.min(1.88, (bodyH - 0.56) / 2)
      const corners = [
        { x: 0.62, y: bodyTopY + 0.08, w: cardW, h: cardH },
        { x: 12.71 - cardW, y: bodyTopY + 0.08, w: cardW, h: cardH },
        { x: 12.71 - cardW, y: bodyBottomY - cardH - 0.08, w: cardW, h: cardH },
        { x: 0.62, y: bodyBottomY - cardH - 0.08, w: cardW, h: cardH },
      ]
      nodes.forEach((it, idx) => {
        const box = corners[idx]
        shapes.push(renderSurfaceCardPptx('Flywheel Surface ' + (idx + 1), box, { fill: idx === 0 ? tk.accentSoft : tk.surface1, focal: idx === 0 }, nextId, chromeCfg, theme))
        const tag = it.tag || String(idx + 1).padStart(2, '0')
        const tagW = computeBadgePillWidth(tag, 10.5, 1.5, 0.48)
        shapes.push(ooxmlShape(nextId(), 'Flywheel Tag ' + (idx + 1), { x: box.x + 0.18, y: box.y + 0.16, w: tagW, h: 0.28 }, {
          preset: cardPreset,
          adj: roundRectAdj(tagW, 0.28, Math.min(6, chromeCfg.cardRadiusPx)),
          fill: tk.accentPrimary,
          anchor: 'ctr',
          marginsIn: { l: 0.03, r: 0.03, t: 0.01, b: 0.01 },
          paragraphs: [ooxmlRichParagraph(tag, { sizePt: 10.5, color: tk.inkOnAccent, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.heading })],
        }))
        if (it.conversion || it.delta) {
          const badge = it.conversion || it.delta
          const bw = computeBadgePillWidth(badge, 10, 1.4, 0.62)
          shapes.push(ooxmlShape(nextId(), 'Flywheel Delta ' + (idx + 1), { x: box.x + box.w - bw - 0.16, y: box.y + 0.16, w: bw, h: 0.28 }, {
            preset: 'roundRect',
            adj: 50000,
            fill: tk.surface2,
            stroke: tk.hairline,
            strokePt: 0.5,
            anchor: 'ctr',
            marginsIn: { l: 0.03, r: 0.03, t: 0.01, b: 0.01 },
            paragraphs: [ooxmlRichParagraph(badge, { sizePt: 10, color: tk.accentText, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.body })],
          }))
        }
        const innerBox = { x: box.x + 0.18, y: box.y + 0.52, w: box.w - 0.36, h: box.h - 0.64 }
        const cardBodyText = [it.text, ...(it.bullets ?? [])].filter(Boolean).join('；')
        const fit = computeTextFit([it.title || '', cardBodyText], innerBox, 'cardBody', { maxPt: 14.5, minPt: 12.5 })
        shapes.push(ooxmlShape(nextId(), 'Flywheel ' + (idx + 1), innerBox, {
          txBox: true,
          anchor: 't',
          marginsIn: ZERO_MARGINS,
          fontScale: fit.fontScale,
          paragraphs: [
            ...(it.title ? [ooxmlRichParagraph(it.title, { sizePt: Math.min(16, fit.fontPt + 1.5), color: tk.inkPrimary, bold: true, lang: langAttr, font: theme.fonts.heading, spaceAfterPt: 4 })] : []),
            ...(cardBodyText ? [ooxmlRichParagraph(cardBodyText, { sizePt: fit.fontPt, color: tk.inkSecondary, lang: langAttr, font: theme.fonts.body, lineHeight: 1.35 })] : []),
          ],
        }))
      })

      // Clockwise directional arrows between the 4 nodes
      shapes.push(ooxmlShape(nextId(), 'Flywheel Arrow Top', { x: centerX - 0.26, y: corners[0].y + cardH / 2 - 0.14, w: 0.52, h: 0.28 }, { preset: 'rightArrow', fill: tk.accentPrimary }))
      shapes.push(ooxmlShape(nextId(), 'Flywheel Arrow Right', { x: corners[1].x + cardW / 2 - 0.14, y: centerY - 0.22, w: 0.28, h: 0.44 }, { preset: 'downArrow', fill: tk.accentPrimary }))
      shapes.push(ooxmlShape(nextId(), 'Flywheel Arrow Bottom', { x: centerX - 0.26, y: corners[2].y + cardH / 2 - 0.14, w: 0.52, h: 0.28 }, { preset: 'leftArrow', fill: tk.accentPrimary }))
      shapes.push(ooxmlShape(nextId(), 'Flywheel Arrow Left', { x: corners[0].x + cardW / 2 - 0.14, y: centerY - 0.22, w: 0.28, h: 0.44 }, { preset: 'upArrow', fill: tk.accentPrimary }))
    } else if (variant === 'chevron') {
      // McKinsey / BCG Interlocking Value-Chain Chevrons + Supporting Detail Cards
      const overlap = n > 1 ? 0.08 : 0
      const chevW = (12.09 + (n - 1) * overlap) / n
      const chevY = bodyTopY + 0.08
      const chevH = 0.88
      const detailGap = 0.16
      const colW = (12.09 - detailGap * (n - 1)) / n
      const detailY = chevY + chevH + 0.20
      const detailH = Math.max(1.55, bodyBottomY - detailY - 0.06)

      items.forEach((it, idx) => {
        const isFirst = idx === 0
        const isLast = idx === n - 1 && n >= 3
        const cx = 0.62 + idx * (chevW - overlap)
        const fillHex = isFirst ? tk.accentPrimary : isLast ? tk.accentSecondary : tk.surface2
        const inkHex = isFirst
          ? tk.inkOnAccent
          : isLast
            ? (relativeLuminance(tk.accentSecondary) > 0.36 ? '#0F172A' : '#FFFFFF')
            : tk.inkPrimary
        const stageTag = it.tag || String(idx + 1).padStart(2, '0')
        const chevLabel = (stageTag ? stageTag + ' · ' : '') + (it.title || '')

        shapes.push(ooxmlShape(nextId(), 'Chevron Stage ' + (idx + 1), { x: cx, y: chevY, w: chevW, h: chevH }, {
          preset: isFirst ? 'homePlate' : 'chevron',
          adjs: { adj: 20000 },
          fill: fillHex,
          stroke: tk.canvas,
          strokePt: 2.0,
          anchor: 'ctr',
          marginsIn: { l: isFirst ? 0.14 : 0.28, r: 0.24, t: 0.06, b: 0.06 },
          paragraphs: [ooxmlRichParagraph(chevLabel, { sizePt: n >= 5 ? 13 : 14.5, color: inkHex, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.heading, lineHeight: 1.18 })],
        }))

        const dx = 0.62 + idx * (colW + detailGap)
        const cardBox = { x: dx, y: detailY, w: colW, h: detailH }
        shapes.push(renderSurfaceCardPptx('Chevron Detail Surface ' + (idx + 1), cardBox, { fill: isFirst ? tk.accentSoft : tk.surface1, focal: isFirst }, nextId, chromeCfg, theme))

        const convNote = it.conversion || it.delta || (it.value ? it.value + (it.unit ? ' ' + it.unit : '') : '')
        const detailLines = [
          ...(convNote ? ['**' + convNote + '**'] : []),
          ...(it.text ? [it.text] : []),
          ...(Array.isArray(it.bullets) ? it.bullets : []),
        ]
        const innerBox = { x: cardBox.x + 0.16, y: cardBox.y + 0.16, w: cardBox.w - 0.32, h: cardBox.h - 0.30 }
        const fit = computeTextFit(detailLines, innerBox, 'cardBody', { maxPt: 14, minPt: 12.5 })
        if (detailLines.length > 0) {
          shapes.push(ooxmlShape(nextId(), 'Chevron Detail ' + (idx + 1), innerBox, {
            txBox: true,
            anchor: 't',
            marginsIn: ZERO_MARGINS,
            fontScale: fit.fontScale,
            paragraphs: detailLines.map((line, lIdx) =>
              ooxmlRichParagraph(line, {
                sizePt: fit.fontPt,
                color: lIdx === 0 && convNote ? tk.accentText : tk.inkSecondary,
                accentColor: tk.accentText,
                lang: langAttr,
                font: theme.fonts.body,
                lineHeight: 1.36,
                spaceAfterPt: 4,
              }),
            ),
          }))
        }
      })
    } else if (variant === 'layers' || variant === 'funnel') {
      const gapY = 0.14
      const rowH = Math.min(0.92, (bodyH - gapY * (n - 1)) / n)
      const startY = bodyTopY + (bodyH - (rowH * n + gapY * (n - 1))) / 2
      const hasConversions = variant === 'funnel' && items.some((it) => it.conversion || it.delta)
      const maxBarW = hasConversions ? 10.2 : 12.09

      items.forEach((it, idx) => {
        const shrink = variant === 'funnel' ? idx * ((maxBarW * 0.34) / Math.max(1, n - 1)) : 0
        const w = maxBarW - shrink
        const x = 0.62 + shrink / 2
        const y = startY + idx * (rowH + gapY)
        const isFirst = idx === 0
        const funnelValue = variant === 'funnel' && it.value ? '  ·  ' + it.value + (it.unit ? ' ' + it.unit : '') : ''

        shapes.push(ooxmlShape(nextId(), 'Layer ' + (idx + 1), { x, y, w, h: rowH }, {
          preset: cardPreset,
          adj: roundRectAdj(w, rowH, chromeCfg.cardRadiusPx),
          fill: isFirst ? tk.accentPrimary : (idx % 2 === 1 ? tk.surface2 : tk.surface1),
          stroke: chromeCfg.cardBorderless ? '' : (isFirst ? tk.accentPrimary : tk.hairline),
          strokePt: 0.75,
          anchor: 'ctr',
          marginsIn: { l: 0.24, r: 0.24, t: 0.06, b: 0.06 },
          paragraphs: [
            ooxmlRichParagraph(
              (it.tag ? it.tag + '  ·  ' : '') + (it.title || '') + funnelValue + (it.text ? '  —  ' + it.text : ''),
              {
                sizePt: 15,
                color: isFirst ? tk.inkOnAccent : tk.inkPrimary,
                secondaryColor: isFirst ? tk.inkOnAccent : tk.inkSecondary,
                bold: isFirst,
                lang: langAttr,
                align: variant === 'funnel' ? 'ctr' : 'l',
                font: theme.fonts.body,
                autoLeadBold: !isFirst,
              },
            ),
          ],
        }))

        const convBadge = variant === 'funnel' ? (it.conversion || it.delta || '') : ''
        if (convBadge) {
          const badgeX = 0.62 + maxBarW + 0.24
          const badgeW = 12.71 - badgeX
          shapes.push(ooxmlShape(nextId(), 'Funnel Conversion ' + (idx + 1), { x: badgeX, y: y + (rowH - 0.38) / 2, w: badgeW, h: 0.38 }, {
            preset: 'roundRect',
            adj: 50000,
            fill: tk.accentSoft,
            stroke: tk.accentPrimary,
            strokePt: 0.75,
            anchor: 'ctr',
            marginsIn: { l: 0.06, r: 0.06, t: 0.02, b: 0.02 },
            paragraphs: [ooxmlRichParagraph('↓ ' + convBadge, { sizePt: 11.5, color: tk.accentText, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.body })],
          }))
        }
      })
    } else if (variant === 'timeline') {
      const spineY = bodyTopY + 0.72
      shapes.push(ooxmlLine(nextId(), 'Timeline axis', { x: 0.85, y: spineY }, { x: 12.48, y: spineY }, { color: tk.accentPrimary, widthPt: 2.0 }))
      const gap = 0.20
      const stepW = (12.09 - gap * (n - 1)) / n
      items.forEach((it, idx) => {
        const x = 0.62 + idx * (stepW + gap)
        const cx = x + stepW / 2
        shapes.push(ooxmlShape(nextId(), 'Timeline Node ' + (idx + 1), { x: cx - 0.15, y: spineY - 0.15, w: 0.30, h: 0.30 }, { preset: 'ellipse', fill: idx === n - 1 ? tk.accentPrimary : tk.surface1, stroke: tk.accentPrimary, strokePt: 2.0 }))
        shapes.push(ooxmlShape(nextId(), 'Timeline Tag ' + (idx + 1), { x, y: bodyTopY + 0.10, w: stepW, h: 0.38 }, {
          txBox: true,
          anchor: 'ctr',
          marginsIn: { l: 0.02, r: 0.02, t: 0, b: 0 },
          paragraphs: [ooxmlRichParagraph(it.tag || ('0' + (idx + 1)), { sizePt: 13, color: tk.accentText, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.heading })],
        }))
        const cardBox = { x, y: spineY + 0.36, w: stepW, h: Math.max(1.8, bodyBottomY - (spineY + 0.42)) }
        const fit = computeTextFit([it.title || '', it.text || ''], cardBox, 'cardBody', { maxPt: 14.5, minPt: 13.5 })
        shapes.push(ooxmlShape(nextId(), 'Step ' + (idx + 1), cardBox, {
          preset: cardPreset,
          adj: roundRectAdj(cardBox.w, cardBox.h, chromeCfg.cardRadiusPx),
          fill: tk.surface1,
          stroke: chromeCfg.cardBorderless ? '' : tk.hairline,
          strokePt: 0.75,
          anchor: 't',
          marginsIn: { l: 0.16, r: 0.16, t: 0.16, b: 0.14 },
          fontScale: fit.fontScale,
          paragraphs: [
            ...(it.title ? [ooxmlRichParagraph(it.title, { sizePt: Math.min(16.5, fit.fontPt + 1.5), color: tk.inkPrimary, bold: true, lang: langAttr, font: theme.fonts.heading, spaceAfterPt: 6 })] : []),
            ...(it.text ? [ooxmlRichParagraph(it.text, { sizePt: fit.fontPt, color: tk.inkSecondary, lang: langAttr, font: theme.fonts.body, lineHeight: 1.4 })] : []),
          ],
        }))
      })
    } else {
      // steps（带箭头连接的横向步骤卡片）
      const arrowGap = n <= 4 ? 0.36 : 0.24
      const cardW = (12.09 - arrowGap * (n - 1)) / n
      const cardH = Math.min(3.55, bodyH - 0.24)
      const cardY = bodyTopY + (bodyH - cardH) / 2

      items.forEach((it, idx) => {
        const x = 0.62 + idx * (cardW + arrowGap)
        const box = { x, y: cardY, w: cardW, h: cardH }
        shapes.push(renderSurfaceCardPptx('Step Surface ' + (idx + 1), box, { fill: tk.surface1, focal: idx === n - 1 }, nextId, chromeCfg, theme))
        const stepTag = it.tag || String(idx + 1).padStart(2, '0')
        if (chromeCfg.useDisplayNumeral) {
          shapes.push(ooxmlShape(nextId(), 'Step Number ' + (idx + 1), { x: x + 0.18, y: cardY + 0.14, w: cardW - 0.36, h: 0.42 }, {
            txBox: true,
            anchor: 'ctr',
            marginsIn: ZERO_MARGINS,
            paragraphs: [ooxmlRichParagraph(stepTag, { sizePt: /^\d+$/.test(stepTag) ? 22 : 12, color: tk.accentText, bold: true, lang: langAttr, font: theme.fonts.heading })],
          }))
        } else {
          const stepBadgeW = computeBadgePillWidth(stepTag, 12, cardW - 0.36, 0.50)
          shapes.push(ooxmlShape(nextId(), 'Step Number ' + (idx + 1), { x: x + 0.18, y: cardY + 0.18, w: stepBadgeW, h: 0.36 }, {
            preset: cardPreset,
            adj: roundRectAdj(stepBadgeW, 0.36, Math.min(6, chromeCfg.cardRadiusPx)),
            fill: tk.accentPrimary,
            anchor: 'ctr',
            marginsIn: { l: 0.04, r: 0.04, t: 0.02, b: 0.02 },
            paragraphs: [ooxmlRichParagraph(stepTag, { sizePt: 12, color: tk.inkOnAccent, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.heading })],
          }))
        }
        const inner = { x: x + 0.18, y: cardY + 0.66, w: cardW - 0.36, h: cardH - 0.84 }
        const fit = computeTextFit([it.title || '', it.text || ''], inner, 'cardBody', { maxPt: 15, minPt: 13.5 })
        shapes.push(ooxmlShape(nextId(), 'Step ' + (idx + 1), inner, {
          txBox: true,
          anchor: 't',
          marginsIn: ZERO_MARGINS,
          fontScale: fit.fontScale,
          paragraphs: [
            ...(it.title ? [ooxmlRichParagraph(it.title, { sizePt: Math.min(17, fit.fontPt + 1.5), color: tk.inkPrimary, bold: true, lang: langAttr, font: theme.fonts.heading, spaceAfterPt: 6 })] : []),
            ...(it.text ? [ooxmlRichParagraph(it.text, { sizePt: fit.fontPt, color: tk.inkSecondary, lang: langAttr, font: theme.fonts.body, lineHeight: 1.42 })] : []),
          ],
        }))

        if (idx < n - 1) {
          shapes.push(ooxmlShape(nextId(), 'Step Connector ' + (idx + 1), { x: x + cardW + arrowGap * 0.18, y: cardY + cardH / 2 - 0.12, w: arrowGap * 0.64, h: 0.24 }, { preset: 'rightArrow', fill: tk.accentPrimary }))
        }
      })
    }
    return shapes.join('')
  }

  return null
}

export function renderDiagramSlideBodyHtml(slide, ctx) {
  const { theme, langId, chromeStyle } = ctx
  const layout = slide.layout || 'bullets'
  const variant = slide.variant || ''
  const title = slide.title || ''
  const subtitle = slide.subtitle || ''
  let inner = ''

  if (layout === 'harvey') {
    return renderHarveyTableHtml(slide)
  }
  if (layout === 'marimekko') {
    return renderMarimekkoHtml(slide, theme, langId)
  }
  if (layout === 'sankey') {
    return renderSankeyHtml(slide, theme, langId)
  }
  if (layout === 'value-chain') {
    return renderPorterValueChainHtml(slide, langId)
  }
  if (layout === 'swot' || (layout === 'matrix' && variant === 'swot')) {
    return renderSwotHtml(slide, langId)
  }

  if (layout === 'gantt') {
    const defaultCols = variant === 'months'
      ? ['M1', 'M2', 'M3', 'M4', 'M5', 'M6']
      : variant === 'weeks'
        ? ['W1', 'W2', 'W3', 'W4', 'W5', 'W6']
        : ['Q1', 'Q2', 'Q3', 'Q4']
    const cols = Array.isArray(slide.columns) && slide.columns.length > 0 && slide.columns.every((c) => typeof c === 'string')
      ? slide.columns.slice(0, 8)
      : defaultCols
    const colCount = Math.max(2, cols.length)
    const items = resolveEffectiveItems(slide).slice(0, 7)
    const cornerLabel = variant === 'swimlane'
      ? (langId === 'en' ? 'WORKSTREAM / TASK' : '泳道 / 任务项')
      : (langId === 'en' ? 'INITIATIVE / MILESTONE' : '任务里程碑')
    inner =
      '' +
      '<div class="gantt-board" style="--gantt-cols:' + colCount + '">' +
      '<div class="gantt-head"><div class="gantt-corner">' + escapeHtml(cornerLabel) + '</div>' +
      '<div class="gantt-col-heads">' + cols.map((c) => '<div class="gantt-col-head">' + escapeHtml(c) + '</div>').join('') + '</div></div>' +
      '<div class="gantt-rows">' +
      items.map((it, idx) => {
        const startSlot = it.start !== undefined ? Math.max(0, Math.min(colCount - 0.25, it.start)) : Math.min(colCount - 1, idx % colCount)
        const isPureMilestone = it.span === 0 || (Boolean(it.milestone) && it.span === undefined)
        const hasEndMilestone = !isPureMilestone && Boolean(it.milestone)
        const spanSlot = isPureMilestone ? 0 : Math.max(0.35, Math.min(colCount - startSlot, it.span !== undefined ? it.span : 1))
        const leftPct = ((startSlot / colCount) * 100).toFixed(2)
        const widthPct = ((spanSlot / colCount) * 100).toFixed(2)
        const mPct = (((startSlot + 0.5) / colCount) * 100).toFixed(2)
        const label = it.value || it.delta || ''
        return (
          '<div class="gantt-row" data-item-index="' + idx + '">' +
          '<div class="gantt-label surface-card">' +
          (it.tag ? '<span class="gantt-tag">' + escapeHtml(it.tag) + '</span>' : '') +
          '<span class="gantt-task" data-item-field="title">' + renderInlineHtml(it.title || it.text || '') + '</span>' +
          '</div>' +
          '<div class="gantt-track">' +
          (isPureMilestone
            ? '<span class="gantt-milestone" style="left:' + mPct + '%"></span>' +
              (label || it.text ? '<span class="gantt-m-label" style="left:' + mPct + '%">' + escapeHtml(label || it.text) + '</span>' : '')
            : '<div class="gantt-bar tone-' + escapeHtml(it.status || 'accent') + '" style="left:' + leftPct + '%;width:' + widthPct + '%">' +
              (label ? '<span>' + escapeHtml(label) + '</span>' : '') +
              (hasEndMilestone ? '<span class="gantt-bar-milestone" aria-hidden="true"></span>' : '') +
              '</div>') +
          '</div></div>'
        )
      }).join('') +
      '</div></div>'
  } else if (layout === 'architecture') {
    const allItems = resolveEffectiveItems(slide).slice(0, 6)
    const isSidecarItem = (it) =>
      it.status === 'accent' || /^(?:sidecar|governance|security|observability|安全|治理|可观测|监控|合规|运维)$/i.test(String(it.tag || '').trim())
    const candidateSidecars = allItems.filter(isSidecarItem)
    const candidateTiers = allItems.filter((it) => !isSidecarItem(it))
    const hasSidecar = candidateSidecars.length >= 1 && candidateTiers.length >= 2
    const sidecarItems = hasSidecar ? candidateSidecars : []
    const tierItems = hasSidecar ? candidateTiers : allItems
    const arrowGlyph = variant === 'platform' ? '↕' : '↓'

    inner =
      '' +
      '<div class="arch-board' + (hasSidecar ? ' has-sidecar' : '') + '">' +
      '<div class="arch-tiers">' +
      tierItems.map((it, idx) => {
        const mods = it.bullets?.length ? it.bullets : (it.text ? [it.text] : [])
        return (
          '<div class="surface-card arch-tier' + (idx === 0 ? ' is-focal' : '') + '" data-item-index="' + allItems.indexOf(it) + '">' +
          '<div class="arch-tier-head">' +
          (it.tag ? '<span class="kicker arch-tag">' + escapeHtml(it.tag) + '</span>' : '') +
          '<div class="card-title" data-item-field="title">' + renderInlineHtml(it.title || '') + '</div>' +
          '</div>' +
          '<div class="arch-modules cols-' + Math.max(1, mods.length) + '">' +
          mods.map((m) => '<div class="arch-module">' + renderInlineHtml(m, { autoLeadBold: true }) + '</div>').join('') +
          '</div></div>' +
          (idx < tierItems.length - 1 ? '<div class="arch-flow-arrows" aria-hidden="true"><span>' + arrowGlyph + '</span><span>' + arrowGlyph + '</span></div>' : '')
        )
      }).join('') +
      '</div>' +
      (hasSidecar
        ? '<aside class="arch-sidecar-col">' +
          sidecarItems.map((sc) =>
            '<div class="surface-card arch-sidecar is-focal" data-item-index="' + allItems.indexOf(sc) + '">' +
            (sc.tag ? '<span class="kicker">' + escapeHtml(sc.tag) + '</span>' : '') +
            '<div class="card-title" data-item-field="title">' + renderInlineHtml(sc.title || '') + '</div>' +
            (sc.text ? '<div class="card-body" data-item-field="text">' + renderInlineHtml(sc.text) + '</div>' : '') +
            (sc.bullets?.length ? '<ul class="card-bullets">' + sc.bullets.map((b) => '<li>' + renderInlineHtml(b, { autoLeadBold: true }) + '</li>').join('') + '</ul>' : '') +
            '</div>',
          ).join('') +
          '</aside>'
        : '') +
      '</div>'
  } else if (layout === 'tam') {
    const rawItems = resolveEffectiveItems(slide).slice(0, 3)
    const defaults = ['TAM', 'SAM', 'SOM']
    const items = Array.from({ length: Math.max(1, rawItems.length) }, (_, idx) => ({
      ...rawItems[idx],
      tag: rawItems[idx]?.tag || defaults[idx] || ('T' + (idx + 1)),
    }))
    inner =
      '' +
      '<div class="tam-board">' +
      '<div class="tam-circles">' +
      items.map((it, idx) => {
        const shortTag = String(it.tag || defaults[idx] || ('T' + (idx + 1))).split(/\s*[·:：\-—|]\s*/)[0].trim() || (defaults[idx] || ('T' + (idx + 1)))
        return (
          '<div class="tam-circle tam-ring-' + idx + (idx === items.length - 1 ? ' is-inner' : '') + '">' +
          '<span class="tam-ring-label">' + escapeHtml(shortTag + (it.value ? ' · ' + it.value + (it.unit ? ' ' + it.unit : '') : '')) + '</span>' +
          '</div>'
        )
      }).join('') +
      '</div>' +
      '<div class="tam-cards">' +
      items.map((it, idx) => {
        const cardBodyText = [it.text, ...(it.bullets ?? [])].filter(Boolean).join('；')
        return (
          '<div class="surface-card tam-card' + (idx === items.length - 1 ? ' is-focal' : '') + '" data-item-index="' + idx + '">' +
          '<div class="tam-card-meta">' +
          '<span class="item-badge">' + escapeHtml(it.tag) + '</span>' +
          (it.value ? '<strong class="tam-card-val" data-item-field="value">' + escapeHtml(it.value + (it.unit ? ' ' + it.unit : '')) + '</strong>' : '') +
          '</div>' +
          '<div class="tam-card-copy">' +
          (it.title ? '<div class="card-title" data-item-field="title">' + renderInlineHtml(it.title) + '</div>' : '') +
          (cardBodyText ? '<div class="card-body" data-item-field="text">' + renderInlineHtml(cardBodyText) + '</div>' : '') +
          '</div></div>'
        )
      }).join('') +
      '</div></div>'
  } else if (layout === 'org') {
    const items = resolveEffectiveItems(slide)
    if (variant === 'team') {
      const members = items.slice(0, 4)
      inner =
        '' +
        '<div class="layout-grid team-grid cols-' + Math.max(1, members.length) + '">' +
        members.map((it, idx) =>
          '<article class="surface-card team-card' + (idx === 0 ? ' is-focal' : '') + '" data-item-index="' + idx + '">' +
          '<div class="team-avatar">' + escapeHtml(monogramLetters(it.title || it.tag || 'T')) + '</div>' +
          ((it.role || it.tag) ? '<span class="team-role">' + escapeHtml(it.role || it.tag) + '</span>' : '') +
          (it.title ? '<h3 class="card-title" data-item-field="title">' + renderInlineHtml(it.title) + '</h3>' : '') +
          (it.text ? '<div class="card-body" data-item-field="text">' + renderInlineHtml(it.text) + '</div>' : '') +
          (it.bullets?.length ? '<ul class="card-bullets">' + it.bullets.map((b) => '<li>' + renderInlineHtml(b, { autoLeadBold: true }) + '</li>').join('') + '</ul>' : '') +
          '</article>',
        ).join('') +
        '</div>'
    } else {
      const rootItem = items[0] ?? { tag: 'CEO', title: title || '组织架构' }
      const rawChildren = items.length > 1
        ? items.slice(1, 6)
        : (rootItem.bullets ?? []).slice(0, 5).map((b, i) => ({ tag: 'DEPT ' + (i + 1), title: b }))
      const children = rawChildren.length > 0 ? rawChildren : [{ title: '核心业务单元' }]
      inner =
        '' +
        '<div class="org-tree">' +
        '<div class="org-root-wrap">' +
        '<div class="surface-card org-root is-focal" data-item-index="0">' +
        ((rootItem.role || rootItem.tag) ? '<span class="kicker">' + escapeHtml(rootItem.role || rootItem.tag) + '</span>' : '') +
        '<div class="card-title" data-item-field="title">' + renderInlineHtml(rootItem.title || '') + '</div>' +
        (rootItem.text ? '<div class="card-body" data-item-field="text">' + renderInlineHtml(rootItem.text) + '</div>' : '') +
        '</div></div>' +
        '<div class="org-trunk" aria-hidden="true"></div>' +
        '<div class="org-children cols-' + Math.max(1, children.length) + '">' +
        children.map((ch, idx) =>
          '<div class="org-branch">' +
          '<div class="surface-card org-child" data-item-index="' + (items.length > 1 ? idx + 1 : idx) + '">' +
          ((ch.role || ch.tag) ? '<span class="item-badge">' + escapeHtml(ch.role || ch.tag) + '</span>' : '') +
          '<div class="card-title" data-item-field="title">' + renderInlineHtml(ch.title || '') + '</div>' +
          (ch.text ? '<div class="card-body" data-item-field="text">' + renderInlineHtml(ch.text) + '</div>' : '') +
          (ch.bullets?.length ? '<ul class="card-bullets">' + ch.bullets.map((b) => '<li>' + renderInlineHtml(b, { autoLeadBold: true }) + '</li>').join('') + '</ul>' : '') +
          '</div></div>',
        ).join('') +
        '</div></div>'
    }
  }
  if (inner !== '') return inner

  if (layout === 'process') {
    const items = resolveEffectiveItems(slide).slice(0, 6)
    const badgeClass = chromeStyle === 'editorial-folio' ? 'item-badge is-editorial-num' : 'item-badge'
    if (variant === 'flywheel') {
      const nodes = items.slice(0, 4)
      const rawHub = (slide.text && slide.text.trim().length <= 18 ? slide.text.trim() : '')
        || (slide.subtitle && slide.subtitle.trim().length <= 18 ? slide.subtitle.trim() : '')
      const hubText = rawHub || (langId === 'en' ? 'Growth Flywheel' : '增长飞轮')
      inner =
        '' +
        '<div class="flywheel-stage">' +
        '<div class="flywheel-hub">' + escapeHtml(hubText) + '</div>' +
        nodes.map((it, idx) => {
          const cardBodyText = [it.text, ...(it.bullets ?? [])].filter(Boolean).join('；')
          return (
            '<div class="surface-card flywheel-node node-' + idx + (idx === 0 ? ' is-focal' : '') + '" data-item-index="' + idx + '">' +
            '<div class="flywheel-node-top">' +
            '<span class="' + badgeClass + '">' + escapeHtml(it.tag || String(idx + 1).padStart(2, '0')) + '</span>' +
            ((it.conversion || it.delta) ? '<span class="funnel-conversion-badge">' + escapeHtml(it.conversion || it.delta) + '</span>' : '') +
            '</div>' +
            (it.title ? '<div class="card-title" data-item-field="title">' + renderInlineHtml(it.title) + '</div>' : '') +
            (cardBodyText ? '<div class="card-body" data-item-field="text">' + renderInlineHtml(cardBodyText) + '</div>' : '') +
            '</div>'
          )
        }).join('') +
        '</div>'
    } else if (variant === 'chevron') {
      inner =
        '' +
        '<ol class="layout-grid chevron-board cols-' + Math.max(1, items.length) + '">' +
        items.map((it, idx) => {
          const isFirst = idx === 0
          const isLast = idx === items.length - 1 && items.length >= 3
          const conv = it.conversion || it.delta || (it.value ? it.value + (it.unit ? ' ' + it.unit : '') : '')
          const bodyLines = [
            ...(it.text ? [it.text] : []),
            ...(Array.isArray(it.bullets) ? it.bullets : []),
          ]
          return (
            '<li class="chevron-col" data-item-index="' + idx + '">' +
            '<div class="chevron-arrow' + (isFirst ? ' is-first' : isLast ? ' is-last' : '') + '">' +
            '<span class="chevron-tag">' + escapeHtml(it.tag || String(idx + 1).padStart(2, '0')) + '</span>' +
            (it.title ? '<span class="chevron-title" data-item-field="title">' + renderInlineHtml(it.title) + '</span>' : '') +
            '</div>' +
            '<div class="surface-card chevron-detail' + (isFirst ? ' is-focal' : '') + '">' +
            (conv ? '<span class="funnel-conversion-badge chevron-metric">' + escapeHtml(conv) + '</span>' : '') +
            (bodyLines.length ? '<div class="card-body" data-item-field="text">' + bodyLines.map((ln) => renderInlineHtml(ln)).join('<br>') + '</div>' : '') +
            '</div>' +
            '</li>'
          )
        }).join('') +
        '</ol>'
    } else {
      const modeClass = variant === 'timeline' ? 'is-timeline' : variant === 'layers' ? 'is-layers' : variant === 'funnel' ? 'is-funnel' : 'is-steps'
      inner =
        '' +
        '<ol class="layout-grid process-grid ' + modeClass + ' cols-' + Math.max(1, items.length) + '">' +
        items.map((it, idx) => {
          const conv = variant === 'funnel' ? (it.conversion || it.delta || '') : ''
          const valSuffix = variant === 'funnel' && it.value ? ' · ' + it.value + (it.unit ? ' ' + it.unit : '') : ''
          return (
            '<li class="surface-card process-step" style="--step:' + idx + ';--total:' + items.length + '" data-item-index="' + idx + '">' +
            '<span class="' + badgeClass + '">' + escapeHtml(it.tag || String(idx + 1).padStart(2, '0')) + '</span>' +
            '<div class="process-copy">' +
            (it.title ? '<div class="card-title" data-item-field="title">' + renderInlineHtml(it.title) + (valSuffix ? '<span class="funnel-val">' + escapeHtml(valSuffix) + '</span>' : '') + '</div>' : '') +
            (it.text ? '<div class="card-body" data-item-field="text">' + renderInlineHtml(it.text) + '</div>' : '') +
            '</div>' +
            (conv ? '<span class="funnel-conversion-badge">↓ ' + escapeHtml(conv) + '</span>' : '') +
            '</li>'
          )
        }).join('') +
        '</ol>'
    }
    return inner
  }

  return null
}

export const DIAGRAMS_CSS = `
.process-grid.is-layers,.process-grid.is-funnel{grid-template-columns:1fr;gap:10px}
.process-grid.is-layers .process-step,.process-grid.is-funnel .process-step{flex-direction:row;align-items:center;padding:12px 20px}
.process-grid.is-funnel .process-step{width:calc(100% - var(--step, 0) * 8%);margin:0 auto;justify-content:center}
.funnel-conversion-badge{margin-left:auto;padding:3px 10px;border-radius:99px;background:var(--accent-soft);border:1px solid var(--accent);color:var(--accent-text);font-size:12px;font-weight:700;white-space:nowrap}
.flywheel-stage{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:clamp(22px,3vw,42px) clamp(120px,14vw,220px);align-items:center;padding:8px 0}
.flywheel-hub{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:clamp(130px,13vw,190px);height:clamp(130px,13vw,190px);border-radius:50%;background:var(--accent);color:var(--ink-on-accent);border:4px solid var(--bg);display:flex;align-items:center;justify-content:center;text-align:center;padding:14px;font-family:var(--font-heading);font-weight:800;font-size:clamp(14px,1.4vw,20px);z-index:2;box-shadow:0 12px 32px rgba(0,0,0,.14)}
.flywheel-node-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
.chevron-board{gap:12px;align-items:stretch}
.chevron-col{display:flex;flex-direction:column;gap:12px;min-width:0;list-style:none}
.chevron-arrow{min-height:68px;padding:12px 24px 12px 28px;background:var(--surface2);color:var(--fg);font-family:var(--font-heading);font-weight:700;font-size:clamp(13px,1.2vw,16px);display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:3px;clip-path:polygon(0 0,calc(100% - 16px) 0,100% 50%,calc(100% - 16px) 100%,0 100%,16px 50%)}
.chevron-arrow.is-first{padding-left:16px;background:var(--accent);color:var(--ink-on-accent);clip-path:polygon(0 0,calc(100% - 16px) 0,100% 50%,calc(100% - 16px) 100%,0 100%)}
.chevron-arrow.is-last{background:var(--accent2);color:#FFF}
.chevron-tag{font-size:11px;opacity:.86;letter-spacing:.06em}
.chevron-detail{flex:1;padding:14px 16px;gap:8px}
.chevron-metric{margin-left:0;align-self:flex-start}
/* 5 Pro Diagrams CSS */
.gantt-board{display:flex;flex-direction:column;gap:8px;width:100%}
.gantt-head,.gantt-row{display:grid;grid-template-columns:minmax(220px,31%) 1fr;gap:12px;align-items:center}
.gantt-corner{background:var(--surface2);border:1px solid var(--hairline);border-radius:calc(var(--radius) * .6);padding:8px 12px;font-size:12px;font-weight:700;color:var(--muted)}
.gantt-col-heads{display:grid;grid-template-columns:repeat(var(--gantt-cols,4),minmax(0,1fr));border:1px solid var(--hairline);overflow:hidden}
.gantt-col-head{background:var(--surface2);padding:8px 6px;text-align:center;font-weight:700;font-size:13px;border-right:1px solid var(--hairline)}
.gantt-col-head:last-child{border-right:0}
.gantt-rows{display:flex;flex-direction:column;gap:8px}
.gantt-label{flex-direction:row;align-items:center;gap:10px;padding:8px 12px}
.gantt-tag{background:var(--accent-soft);color:var(--accent-text);font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;white-space:nowrap}
.gantt-task{font-weight:600;font-size:14px}
.gantt-track{position:relative;height:38px;background:var(--surface1);border:1px solid var(--hairline);overflow:visible;background-image:repeating-linear-gradient(to right,transparent,transparent calc(100% / var(--gantt-cols,4) - 1px),var(--hairline) calc(100% / var(--gantt-cols,4) - 1px),var(--hairline) calc(100% / var(--gantt-cols,4)))}
.gantt-bar{position:absolute;top:6px;bottom:6px;border-radius:calc(var(--radius) * .6);background:var(--accent);color:#FFF;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 8px}
.gantt-bar.tone-positive{background:var(--positive)}.gantt-bar.tone-warning{background:var(--warning)}.gantt-bar.tone-negative{background:var(--negative)}
.gantt-milestone{position:absolute;top:50%;width:16px;height:16px;background:var(--accent);border:2px solid var(--bg);transform:translate(-50%,-50%) rotate(45deg)}
.gantt-bar-milestone{position:absolute;right:-7px;top:50%;width:14px;height:14px;background:var(--accent);border:2px solid var(--bg);transform:translateY(-50%) rotate(45deg);z-index:2}
.gantt-m-label{position:absolute;top:50%;transform:translate(14px,-50%);font-size:12px;font-weight:700;color:var(--accent-text);white-space:nowrap}
.arch-board{display:grid;grid-template-columns:1fr;gap:16px;width:100%}
.arch-board.has-sidecar{grid-template-columns:1fr minmax(210px,22%)}
.arch-tiers{display:flex;flex-direction:column;gap:6px}
.arch-tier{display:grid;grid-template-columns:minmax(160px,24%) 1fr;align-items:center;gap:14px;padding:12px 16px}
.arch-tier-head .kicker{margin-bottom:2px;font-size:11px}
.arch-modules{display:grid;gap:10px}
.arch-module{background:var(--bg);border:1px solid var(--hairline);border-radius:calc(var(--radius) * .6);padding:8px 12px;text-align:center;font-size:14px}
.arch-flow-arrows{display:flex;justify-content:space-around;color:var(--accent-text);font-weight:800;font-size:18px;line-height:1}
.arch-sidecar-col{display:flex;flex-direction:column;gap:12px}
.arch-sidecar{height:100%;justify-content:center}
.harvey-table th.is-ours{background:var(--accent);color:var(--ink-on-accent);border-color:var(--accent)}
.harvey-table td.is-ours{background:var(--accent-soft);font-weight:700}
.harvey-cell{text-align:center}
.harvey-ball{display:inline-block;width:22px;height:22px;border-radius:50%;border:2px solid var(--fg);vertical-align:middle}
.harvey-table td.is-ours .harvey-ball{border-color:var(--accent)}
.harvey-100{background:var(--fg)}.harvey-table td.is-ours .harvey-100{background:var(--accent)}
.harvey-75{background:conic-gradient(var(--fg) 0 270deg,transparent 270deg 360deg)}.harvey-table td.is-ours .harvey-75{background:conic-gradient(var(--accent) 0 270deg,transparent 270deg 360deg)}
.harvey-50{background:conic-gradient(var(--fg) 0 180deg,transparent 180deg 360deg)}.harvey-table td.is-ours .harvey-50{background:conic-gradient(var(--accent) 0 180deg,transparent 180deg 360deg)}
.harvey-25{background:conic-gradient(var(--fg) 0 90deg,transparent 90deg 360deg)}.harvey-table td.is-ours .harvey-25{background:conic-gradient(var(--accent) 0 90deg,transparent 90deg 360deg)}
.harvey-0{background:transparent;border-color:var(--muted)}
.harvey-check{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;font-weight:800;font-size:13px}
.harvey-check.is-yes{background:var(--positive);color:#FFF}
.harvey-check.is-no{background:var(--surface2);color:var(--muted)}
.tam-board{display:grid;grid-template-columns:minmax(280px,43%) 1fr;gap:28px;align-items:center;width:100%}
.tam-circles{position:relative;width:100%;aspect-ratio:1/1;max-height:380px;margin:0 auto}
.tam-circle{position:absolute;left:50%;bottom:0;transform:translateX(-50%);border-radius:50%;border:2px solid var(--accent);display:flex;justify-content:center;padding-top:14px;background:var(--surface1)}
.tam-ring-0{width:94%;height:94%}.tam-ring-1{width:64%;height:64%;background:var(--accent-soft)}.tam-ring-2{width:37%;height:37%;background:var(--accent);color:var(--ink-on-accent);align-items:center;padding-top:0}
.tam-ring-label{font-family:var(--font-heading);font-weight:800;font-size:clamp(12px,1.15vw,15px);color:var(--accent-text);max-width:74%;text-align:center}
.tam-ring-2 .tam-ring-label{color:var(--ink-on-accent)}
.tam-cards{display:flex;flex-direction:column;gap:14px}
.tam-card{flex-direction:row;align-items:center;gap:16px;padding:14px 18px}
.tam-card-meta{display:flex;flex-direction:column;gap:4px;min-width:136px}
.tam-card-val{font-family:var(--font-heading);font-size:clamp(18px,1.8vw,26px);color:var(--accent-text)}
.funnel-val{color:var(--accent-text);font-weight:700}
.process-step:first-child .funnel-val{color:inherit}
.org-tree{display:flex;flex-direction:column;align-items:center;width:100%}
.org-root-wrap{display:flex;justify-content:center;width:100%}
.org-root{min-width:min(380px,60%);text-align:center;align-items:center}
.org-trunk{width:2px;height:24px;background:var(--accent)}
.org-children{display:grid;gap:16px;width:100%;border-top:2px solid var(--accent);padding-top:20px}
.org-branch{position:relative}
.org-branch::before{content:"";position:absolute;top:-20px;left:50%;width:2px;height:20px;background:var(--accent);transform:translateX(-50%)}
.org-child{height:100%}
.team-card{align-items:center;text-align:center}
.team-avatar{width:62px;height:62px;border-radius:50%;background:var(--accent);color:var(--ink-on-accent);display:flex;align-items:center;justify-content:center;font-family:var(--font-heading);font-weight:800;font-size:20px}
.team-role{display:inline-block;padding:3px 12px;border-radius:99px;background:var(--accent-soft);color:var(--accent-text);font-size:12px;font-weight:700}
.mekko-board{display:grid;grid-template-columns:1fr minmax(190px,21%);gap:20px;width:100%;min-height:360px;align-items:stretch}
.mekko-main{display:flex;flex-direction:column;gap:6px;min-width:0}
.mekko-headers{display:flex;width:100%;align-items:flex-end}
.mekko-col-head{display:flex;flex-direction:column;align-items:center;text-align:center;padding:0 4px;min-width:0;overflow:hidden}
.mekko-col-title{font-family:var(--font-heading);font-size:clamp(11px,1.05vw,14px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.mekko-col-size{font-size:11px;font-weight:700;color:var(--accent-text);font-variant-numeric:tabular-nums}
.mekko-columns{display:flex;width:100%;flex:1;min-height:290px;border:1px solid var(--hairline)}
.mekko-col{display:flex;flex-direction:column;min-width:0}
.mekko-cell{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;border:1.5px solid var(--bg);padding:2px 4px;overflow:hidden;font-variant-numeric:tabular-nums}
.mekko-seg-name{font-size:12px;font-weight:600;line-height:1.15;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mekko-seg-pct{font-family:var(--font-heading);font-size:13px;font-weight:800}
.mekko-axis{display:flex;justify-content:space-between;border-top:1.5px solid var(--muted);padding-top:4px;font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums}
.mekko-legend{justify-content:flex-start;gap:14px}
.mekko-total{display:flex;flex-direction:column;gap:4px;padding-bottom:12px;border-bottom:1px solid var(--hairline)}
.mekko-total strong{font-family:var(--font-heading);font-size:clamp(22px,2.3vw,32px);color:var(--accent-text);font-variant-numeric:tabular-nums}
.mekko-legend-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.mekko-legend-list li{display:flex;align-items:center;gap:8px;font-size:13px}
.mekko-legend-list li.is-ours{color:var(--accent-text);font-weight:700}
.mekko-swatch{width:14px;height:14px;border-radius:3px;flex-shrink:0;border:1px solid var(--hairline)}
.mekko-leg-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mekko-leg-pct{font-variant-numeric:tabular-nums}
.sankey-board{width:100%;display:flex;align-items:center;justify-content:center}
.sankey-svg{width:100%;height:auto;max-height:430px;overflow:visible;font-family:var(--font-body)}
.porter-board{display:grid;grid-template-columns:1fr minmax(120px,13.5%);gap:12px;width:100%;align-items:stretch}
.porter-main{display:flex;flex-direction:column;gap:14px;min-width:0}
.porter-support-zone{display:grid;grid-template-columns:84px 1fr;gap:10px;align-items:stretch}
.porter-support-rail{background:var(--accent-soft);border:1px solid var(--accent);border-radius:calc(var(--radius) * .7);color:var(--accent-text);font-family:var(--font-heading);font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;text-align:center;padding:8px}
.porter-support-beams{display:flex;flex-direction:column;gap:8px}
.porter-beam{flex-direction:row;align-items:center;gap:12px;padding:10px 16px;border-left:4px solid var(--accent2)}
.porter-beam strong{font-family:var(--font-heading);font-size:14px;white-space:nowrap}
.porter-beam span{font-size:13px;color:var(--ink-secondary);overflow:hidden;text-overflow:ellipsis}
.porter-margin-wedge{background:var(--accent);color:var(--ink-on-accent);font-family:var(--font-heading);font-weight:800;font-size:clamp(15px,1.5vw,21px);display:flex;align-items:center;justify-content:center;text-align:center;padding:16px 24px 16px 12px;clip-path:polygon(0 0,74% 0,100% 50%,74% 100%,0 100%,14% 50%)}
.swot-board{display:flex;flex-direction:column;gap:14px;width:100%}
.swot-cross{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:16px;width:100%}
.swot-quad{padding:0;overflow:hidden;gap:0}
.swot-quad-head{padding:9px 18px;font-family:var(--font-heading);font-weight:800;font-size:14px;color:#FFF;background:var(--accent)}
.swot-quad.tone-positive .swot-quad-head{background:var(--positive)}
.swot-quad.tone-warning .swot-quad-head{background:var(--warning);color:#0F172A}
.swot-quad.tone-negative .swot-quad-head{background:var(--negative)}
.swot-quad.swot-o .swot-quad-head{padding-right:108px}
.swot-quad.swot-t .swot-quad-head{padding-left:108px}
.swot-quad-body{padding:14px 18px;display:flex;flex-direction:column;gap:6px}
.swot-anchor{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:3;background:var(--accent);color:var(--ink-on-accent);border:4px solid var(--bg);border-radius:999px;padding:10px 24px;min-width:168px;font-family:var(--font-heading);font-weight:800;font-size:14px;line-height:1.25;text-align:center;box-shadow:0 10px 26px rgba(0,0,0,.16)}
.swot-tows-strip{gap:12px}
.swot-tows-pill{flex-direction:row;align-items:center;gap:10px;padding:10px 14px}
.swot-tows-text{font-size:13px;color:var(--fg);font-weight:600}
`

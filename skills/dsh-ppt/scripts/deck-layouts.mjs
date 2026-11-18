/**
 * deck-layouts.mjs —— dsh-ppt 的 16:9 12 列栅格几何求解器、CJK 确定性字号拟合引擎、
 * 无损内联富文本分词器，以及 19 套零依赖核心原生版式（含 5 套专业图示）与 6 套母版骨架同构渲染器。
 *
 * 零外部运行时依赖，仅使用 Node 内置模块。
 */

import { pptxFontName, pptxEastAsianFont, hexToRgba, relativeLuminance, resolveChromeStyle, mixHex } from './deck-themes.mjs'
import {
  containsLatexMath,
  looksLikeRawLatex,
  unwrapOuterMathDelimiters,
  maskMathSpans,
  unmaskMathSpans,
  splitMathSegments,
  parseLatexMath,
  latexToMathMl,
  astToOmml,
  astToOoxmlInlineRuns,
  has2dMathConstruct,
  fitFormulaBoxIn,
} from './deck-math.mjs'

// ---------------------------------------------------------------------------
// 常量与坐标换算（16:9 画布：13.3333" × 7.5" = 12192000 × 6858000 EMU）
// ---------------------------------------------------------------------------

export const CANVAS_IN = Object.freeze({ w: 13.3333333333, h: 7.5 })
export const EMU_PER_IN = 914400
export const EMU_PER_PT = 12700
export const EMU_W = 12192000
export const EMU_H = 6858000

export const CORE_LAYOUTS = new Set([
  'cover',
  'agenda',
  'section',
  'bullets',
  'statement',
  'quote',
  'kpi',
  'cards',
  'comparison',
  'matrix',
  'swot',
  'process',
  'value-chain',
  'marimekko',
  'sankey',
  'callout',
  'gantt',
  'architecture',
  'harvey',
  'tam',
  'org',
  'table',
  'closing',
])

export const LAYOUT_ALIASES = Object.freeze({
  'kpi-grid': { layout: 'kpi', variant: 'grid' },
  scorecard: { layout: 'kpi', variant: 'grid' },
  bento: { layout: 'cards', variant: 'bento' },
  pillars: { layout: 'cards', variant: 'pillars' },
  'exec-summary': { layout: 'cards', variant: 'exec-summary' },
  timeline: { layout: 'process', variant: 'timeline' },
  steps: { layout: 'process', variant: 'steps' },
  layers: { layout: 'process', variant: 'layers' },
  funnel: { layout: 'process', variant: 'funnel' },
  flywheel: { layout: 'process', variant: 'flywheel' },
  chevron: { layout: 'process', variant: 'chevron' },
  porter: { layout: 'value-chain' },
  mekko: { layout: 'marimekko' },
  'swot-matrix': { layout: 'swot' },
  'issue-action': { layout: 'comparison', variant: 'issue-action' },
  'before-after': { layout: 'comparison', variant: 'before-after' },
  'matrix-2x2': { layout: 'matrix', variant: '2x2' },
  'formula-callout': { layout: 'callout', variant: 'formula' },
  takeaways: { layout: 'callout', variant: 'takeaways' },
  roadmap: { layout: 'gantt', variant: 'quarters' },
  swimlane: { layout: 'gantt', variant: 'swimlane' },
  team: { layout: 'org', variant: 'team' },
  gallery: { layout: 'image', variant: 'gallery' },
  'gallery-grid': { layout: 'image', variant: 'gallery' },
  'ablation-compare': { layout: 'chart-split', variant: 'chart-right' },
  waterfall: { layout: 'chart', chartKind: 'waterfall' },
})

export function inToEmu(inches) {
  return Math.round(inches * EMU_PER_IN)
}

export function ptToEmu(pts) {
  return Math.round(pts * EMU_PER_PT)
}

export function boxToEmu(box) {
  return {
    x: inToEmu(box.x),
    y: inToEmu(box.y),
    w: inToEmu(box.w),
    h: inToEmu(box.h),
  }
}

export function boxToCssPct(box) {
  return (
    'left:' + (box.x / CANVAS_IN.w * 100).toFixed(4) + '%;' +
    'top:' + (box.y / CANVAS_IN.h * 100).toFixed(4) + '%;' +
    'width:' + (box.w / CANVAS_IN.w * 100).toFixed(4) + '%;' +
    'height:' + (box.h / CANVAS_IN.h * 100).toFixed(4) + '%'
  )
}

/**
 * 计算 OOXML roundRect 的 adj 参数（0..50000），使物理圆角半径与 HTML border-radius 严格一致。
 */
export function roundRectAdj(wIn, hIn, radiusPx = 8) {
  if (!radiusPx || radiusPx <= 0) return 0
  const rIn = radiusPx / 96
  const minSide = Math.max(0.05, Math.min(wIn, hIn))
  return Math.max(0, Math.min(50000, Math.round((rIn / minSide) * 100000)))
}

// ---------------------------------------------------------------------------
// XML / HTML 转义与无损内联富文本解析
// ---------------------------------------------------------------------------

export function escapeXml(value) {
  return String(value ?? '')
    .replace(/[\u000B\u000C]/g, '\n')
    .replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function stripInlineMarkdown(value) {
  const { masked, stash } = maskMathSpans(String(value ?? ''))
  const stripped = masked
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/_([^_\n]+)_/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return unmaskMathSpans(stripped, stash).replace(/`([^`]*)`/g, '$1')
}

/**
 * 清理不安全标签与链接语法，但保留成对的 **粗体**、*斜体*、`代码` 以及 $...$ / $$...$$ 公式标记。
 * 纯文本输入（无标记）输出与 stripInlineMarkdown 完全一致。
 */
export function cleanRichText(value) {
  const { masked, stash } = maskMathSpans(String(value ?? ''))
  const cleaned = masked
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/__([^_]+)__/g, '**$1**')
    .replace(/\s+/g, ' ')
    .trim()
  return unmaskMathSpans(cleaned, stash)
}

const INLINE_TOKEN_RE = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*?\*)/g

function parseMarkdownRunsOnly(text, options = {}) {
  if (text === '') return []
  const hasExplicitMarkup = /\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*?\*/.test(text)

  if (!hasExplicitMarkup && options.autoLeadBold) {
    const colonMatch = /^([^:：]{2,12}[：:])\s*(.+)$/.exec(text)
    if (colonMatch && !/^https?:/i.test(text)) {
      return [
        { text: colonMatch[1], bold: true, lead: true },
        { text: (colonMatch[1].endsWith(':') ? ' ' : '') + colonMatch[2], secondary: true },
      ]
    }
  }

  if (!hasExplicitMarkup) {
    return [{ text }]
  }

  const runs = []
  let lastIndex = 0
  for (const match of text.matchAll(INLINE_TOKEN_RE)) {
    const idx = match.index ?? 0
    if (idx > lastIndex) {
      runs.push({ text: text.slice(lastIndex, idx) })
    }
    const token = match[0]
    if (token.startsWith('**') && token.endsWith('**')) {
      runs.push({ text: token.slice(2, -2), bold: true })
    } else if (token.startsWith('`') && token.endsWith('`')) {
      runs.push({ text: token.slice(1, -1), code: true })
    } else if (token.startsWith('*') && token.endsWith('*')) {
      runs.push({ text: token.slice(1, -1), italic: true })
    } else {
      runs.push({ text: token })
    }
    lastIndex = idx + token.length
  }
  if (lastIndex < text.length) {
    runs.push({ text: text.slice(lastIndex) })
  }
  return runs.filter((r) => r.text !== '')
}

/**
 * 将单行富文本拆分为结构化 Run 数组，用于 HTML 与 PPTX 多 <a:r> 同构输出。
 * 支持可选 autoLeadBold 与内联 LaTeX 数学符号/上下标编译。
 */
export function parseInlineRuns(input, options = {}) {
  const text = String(input ?? '')
  if (text === '') return []
  if (!containsLatexMath(text)) {
    return parseMarkdownRunsOnly(text, options)
  }

  // 支持跨 $math$ 边界的 **粗体** 包裹（如 "**$Q, K, V$ 查询矩阵**"）
  const out = []
  let inBold = false
  const boldParts = text.split('**')
  const hasBalancedBold = boldParts.length >= 3 && boldParts.length % 2 === 1
  if (hasBalancedBold) {
    boldParts.forEach((chunkText, idx) => {
      const boldActive = idx % 2 === 1
      if (!chunkText) return
      const segs = splitMathSegments(chunkText)
      segs.forEach((seg, sIdx) => {
        if (seg.type === 'math') {
          const mathRuns = astToOoxmlInlineRuns(parseLatexMath(seg.latex))
          out.push(...mathRuns.map((r) => (boldActive ? { ...r, bold: true } : r)))
        } else {
          const mdRuns = parseMarkdownRunsOnly(seg.value, idx === 0 && sIdx === 0 && !boldActive ? options : {})
          out.push(...mdRuns.map((r) => (boldActive ? { ...r, bold: true } : r)))
        }
      })
    })
    return out.filter((r) => r.text !== '')
  }

  const segs = splitMathSegments(text)
  segs.forEach((seg, sIdx) => {
    if (seg.type === 'math') {
      const mathRuns = astToOoxmlInlineRuns(parseLatexMath(seg.latex))
      out.push(...mathRuns.map((r) => (inBold ? { ...r, bold: true } : r)))
    } else {
      const mdRuns = parseMarkdownRunsOnly(seg.value, sIdx === 0 ? options : {})
      out.push(...mdRuns)
    }
  })
  return out.filter((r) => r.text !== '')
}

function renderRunsToHtml(runs) {
  if (runs.length === 1 && !runs[0].bold && !runs[0].italic && !runs[0].code && !runs[0].secondary) {
    return escapeHtml(runs[0].text)
  }
  return runs.map((run) => {
    const escaped = escapeHtml(run.text)
    if (run.code) return '<code class="inline-code">' + escaped + '</code>'
    if (run.bold && run.lead) return '<strong class="lead-in">' + escaped + '</strong>'
    if (run.bold) return '<strong>' + escaped + '</strong>'
    if (run.italic) return '<em>' + escaped + '</em>'
    if (run.secondary) return '<span class="ink-sec">' + escaped + '</span>'
    return escaped
  }).join('')
}

export function renderInlineHtml(input, options = {}) {
  const text = String(input ?? '')
  if (!containsLatexMath(text)) {
    return renderRunsToHtml(parseMarkdownRunsOnly(text, options))
  }
  const boldParts = text.split('**')
  if (boldParts.length >= 3 && boldParts.length % 2 === 1) {
    return boldParts.map((chunkText, idx) => {
      if (!chunkText) return ''
      const innerHtml = splitMathSegments(chunkText).map((seg, sIdx) => {
        if (seg.type === 'math') {
          return latexToMathMl(seg.latex, {
            display: seg.display,
            className: seg.display ? 'deck-math is-block' : 'deck-math is-inline',
          })
        }
        return renderRunsToHtml(parseMarkdownRunsOnly(seg.value, idx === 0 && sIdx === 0 ? options : {}))
      }).join('')
      return idx % 2 === 1 ? '<strong>' + innerHtml + '</strong>' : innerHtml
    }).join('')
  }
  const segs = splitMathSegments(text)
  return segs.map((seg, sIdx) => {
    if (seg.type === 'math') {
      return latexToMathMl(seg.latex, {
        display: seg.display,
        className: seg.display ? 'deck-math is-block' : 'deck-math is-inline',
      })
    }
    return renderRunsToHtml(parseMarkdownRunsOnly(seg.value, sIdx === 0 ? options : {}))
  }).join('')
}

// ---------------------------------------------------------------------------
// CJK + Latin 视觉宽度与确定性字号拟合算法 computeTextFit()
// ---------------------------------------------------------------------------

export function measureEmWidth(input, bold = false) {
  const plain = stripInlineMarkdown(input)
  let total = 0
  for (const ch of plain) {
    const code = ch.codePointAt(0) ?? 0
    if (
      (code >= 0x2E80 && code <= 0x9FFF) ||
      (code >= 0xF900 && code <= 0xFAFF) ||
      (code >= 0xFF00 && code <= 0xFFEF) ||
      (code >= 0x3000 && code <= 0x303F) ||
      code > 0x1F000
    ) {
      total += 1.02
    } else if (ch >= 'A' && ch <= 'Z') {
      total += 0.66
    } else if (ch >= '0' && ch <= '9') {
      total += 0.58
    } else if (ch === ' ' || ch === '.' || ch === ',' || ch === ':' || ch === ';' || ch === '|' || ch === '!' || ch === 'i' || ch === 'l') {
      total += 0.32
    } else {
      total += 0.54
    }
  }
  return bold ? total * 1.06 : total
}

const ROLE_DEFAULTS = {
  coverTitle: { maxPt: 44, minPt: 28, lineHeight: 1.16, spaceAfterPt: 8, bold: true },
  sectionTitle: { maxPt: 38, minPt: 24, lineHeight: 1.18, spaceAfterPt: 6, bold: true },
  slideTitle: { maxPt: 27, minPt: 20, lineHeight: 1.22, spaceAfterPt: 0, bold: true },
  statement: { maxPt: 34, minPt: 22, lineHeight: 1.26, spaceAfterPt: 8, bold: true },
  quote: { maxPt: 28, minPt: 18, lineHeight: 1.32, spaceAfterPt: 8, bold: true },
  body: { maxPt: 18, minPt: 13.5, lineHeight: 1.48, spaceAfterPt: 8, bold: false },
  cardTitle: { maxPt: 17.5, minPt: 14, lineHeight: 1.28, spaceAfterPt: 4, bold: true },
  cardBody: { maxPt: 15, minPt: 13.5, lineHeight: 1.44, spaceAfterPt: 5, bold: false },
  kpiValue: { maxPt: 46, minPt: 26, lineHeight: 1.06, spaceAfterPt: 2, bold: true },
  tableCell: { maxPt: 15, minPt: 11.5, lineHeight: 1.32, spaceAfterPt: 0, bold: false },
}

/**
 * 根据目标框英寸尺寸与文本行数组，确定性求解不溢出的最大字号（硬底线 13.5pt 正文 / 20pt 标题）。
 */
export function computeTextFit(linesInput, boxIn, role = 'body', overrides = {}) {
  const cfg = { ...(ROLE_DEFAULTS[role] ?? ROLE_DEFAULTS.body), ...overrides }
  const paragraphs = (Array.isArray(linesInput) ? linesInput : [linesInput])
    .map((line) => String(line ?? ''))
    .filter((line) => line.trim() !== '')
  if (paragraphs.length === 0) {
    return { fontPt: cfg.maxPt, lineHeight: cfg.lineHeight, lines: 0, fontScale: 100000, overflow: false }
  }

  const padXPt = overrides.padXPt ?? 14
  const padYPt = overrides.padYPt ?? 10
  const innerWPt = Math.max(36, boxIn.w * 72 - padXPt * 2)
  const innerHPt = Math.max(20, boxIn.h * 72 - padYPt * 2)
  const emWidths = paragraphs.map((p) => measureEmWidth(p, cfg.bold))

  const evalAt = (pt) => {
    const lines = emWidths.reduce((sum, em) => sum + Math.max(1, Math.ceil((em * pt) / innerWPt)), 0)
    const totalHPt = lines * pt * cfg.lineHeight + Math.max(0, paragraphs.length - 1) * cfg.spaceAfterPt
    return { lines, totalHPt }
  }

  for (let pt = cfg.maxPt; pt >= cfg.minPt - 1e-6; pt -= 0.5) {
    const roundedPt = Math.round(pt * 2) / 2
    const { lines, totalHPt } = evalAt(roundedPt)
    if (totalHPt <= innerHPt * 0.94) {
      const ratio = totalHPt / innerHPt
      const fontScale = ratio > 0.88 ? 94000 : 100000
      return { fontPt: roundedPt, lineHeight: cfg.lineHeight, lines, fontScale, overflow: false }
    }
  }

  const floorEval = evalAt(cfg.minPt)
  return {
    fontPt: cfg.minPt,
    lineHeight: cfg.lineHeight,
    lines: floorEval.lines,
    fontScale: floorEval.totalHPt > innerHPt ? 90000 : 96000,
    overflow: floorEval.totalHPt > innerHPt * 1.05,
  }
}

// ---------------------------------------------------------------------------
// 结构化子项 items 规范化与从 bullets 自动投影
// ---------------------------------------------------------------------------

const VALID_STATUS = new Set(['positive', 'negative', 'warning', 'neutral', 'accent'])

function parseBulletToItem(rawBullet, index, layout) {
  const clean = cleanRichText(rawBullet)
  const plain = stripInlineMarkdown(clean)

  if (layout === 'kpi') {
    // 识别形如 "+38.4% | 转化率：季度环比提升" 或 "1,280万元 营收（+32% YoY）：华东大区驱动"
    const pipeParts = clean.split(/\s*[|｜]\s*/)
    if (pipeParts.length >= 2) {
      const first = stripInlineMarkdown(pipeParts[0])
      const second = pipeParts.slice(1).join(' · ')
      const colonIdx = second.search(/[：:]/)
      const title = colonIdx > 0 ? stripInlineMarkdown(second.slice(0, colonIdx)) : stripInlineMarkdown(second)
      const text = colonIdx > 0 ? cleanRichText(second.slice(colonIdx + 1)) : ''
      const deltaMatch = /([+-]\d+(?:\.\d+)?\s*[%％]|YoY[^\s)）]*)/i.exec(text + ' ' + pipeParts.join(' '))
      return {
        value: first,
        title: title || ('指标 ' + (index + 1)),
        ...(text ? { text } : {}),
        ...(deltaMatch ? { delta: deltaMatch[1], status: deltaMatch[1].startsWith('-') ? 'negative' : 'positive' } : {}),
      }
    }
    const metricMatch = /^((?:[¥$€]\s*)?[+-]?\d[\d,.]*\s*(?:[%％倍xX]|万|亿|元|万元|亿元|美元|万美元|亿美元|家|个|人|次|台|套|条|项|席|秒|ms|s|h|天|小时|分钟|k|M|B|\+)?)\s*[:：\-—]?\s*(.*)$/i.exec(plain)
    if (metricMatch) {
      const rest = metricMatch[2] || ''
      const colon = rest.search(/[：:]/)
      return {
        value: metricMatch[1].trim(),
        title: colon > 0 ? rest.slice(0, colon).trim() : (rest.trim() || ('指标 ' + (index + 1))),
        ...(colon > 0 ? { text: rest.slice(colon + 1).trim() } : {}),
      }
    }
    // 识别行中显著数值（含货币前缀与中文量词）
    const inlineMetric = /((?:[¥$€]\s*[+-]?\d[\d,.]*(?:\s*(?:[%％倍xX]|万|亿|万元|亿元|美元|万美元|亿美元|家|个|人|次|台|套|条|项|席|秒|ms|天|小时|分钟|k|M|B|\+))?|[+-]?\d[\d,.]*\s*(?:[%％倍xX]|万|亿|万元|亿元|美元|万美元|亿美元|家|个|人|次|台|套|条|项|席|秒|ms|天|小时|分钟|\+)))/.exec(plain)
    if (inlineMetric) {
      const colon = plain.search(/[：:]/)
      return {
        value: inlineMetric[1].trim(),
        title: colon > 0 ? plain.slice(0, colon).trim() : plain.replace(inlineMetric[0], '').trim().slice(0, 18) || ('指标 ' + (index + 1)),
        text: colon > 0 ? plain.slice(colon + 1).trim() : plain,
      }
    }
  }

  if (layout === 'sankey') {
    const flowMatch = /^(.+?)\s*(?:->|→|=>|──>|——>)\s*([^:：|｜]+?)(?:\s*[:：|｜]\s*(.+))?$/.exec(clean)
    if (flowMatch) {
      const srcNode = stripInlineMarkdown(flowMatch[1])
      const dstNode = stripInlineMarkdown(flowMatch[2])
      const rest = stripInlineMarkdown(flowMatch[3] ?? '')
      const statusTag = /\[(positive|negative|warning|accent|neutral)\]/i.exec(rest)
      const cleanedRest = rest.replace(/\[(positive|negative|warning|accent|neutral)\]/gi, '').trim()
      const deltaMatch = /\(([+-][^)]+)\)/.exec(cleanedRest)
      const valMatch = /^([¥$€£]?\s*[+-]?\d[\d,.]*)\s*([^\s(（]*)/.exec(cleanedRest)
      return {
        tag: srcNode,
        title: dstNode,
        ...(valMatch ? { value: valMatch[1].replace(/\s+/g, ''), ...(valMatch[2] ? { unit: valMatch[2] } : {}) } : (cleanedRest ? { value: cleanedRest } : {})),
        ...(deltaMatch ? { delta: deltaMatch[1].trim() } : {}),
        ...(statusTag ? { status: statusTag[1].toLowerCase() } : {}),
      }
    }
  }

  if (layout === 'marimekko') {
    // 识别形如 "华东政务 (450亿)：本方案 42% | 厂商B 33% | 其他 25%"
    const mekkoMatch = /^([^:：]+?)[：:]\s*(.+)$/.exec(clean)
    if (mekkoMatch) {
      const rawHead = stripInlineMarkdown(mekkoMatch[1])
      const sizeInHead = /^(.*?)\s*[（(]\s*([¥$€£]?\s*\d[\d,.]*)\s*([^)）]*)[)）]\s*$/.exec(rawHead)
      const colTitle = sizeInHead ? (sizeInHead[1].trim() || rawHead) : rawHead
      const segs = mekkoMatch[2].split(/\s*[|｜;；,，]\s*/).map((s) => s.trim()).filter(Boolean)
      return {
        title: colTitle,
        ...(sizeInHead ? { value: sizeInHead[2].replace(/\s+/g, ''), ...(sizeInHead[3].trim() ? { unit: sizeInHead[3].trim() } : {}) } : {}),
        ...(segs.length > 0 ? { bullets: segs } : {}),
      }
    }
  }

  if (layout === 'comparison') {
    const arrowMatch = /^(.+?)\s*(?:->|→|=>|──>|——>|vs\.?|VS)\s*(.+)$/.exec(clean)
    if (arrowMatch) {
      return {
        tag: String(index + 1).padStart(2, '0'),
        title: stripInlineMarkdown(arrowMatch[1]),
        text: cleanRichText(arrowMatch[2]),
      }
    }
  }

  const boldLead = /^\*\*([^*]+)\*\*\s*[：:—\-]?\s*(.*)$/.exec(clean)
  if (boldLead) {
    return {
      tag: String(index + 1).padStart(2, '0'),
      title: boldLead[1].trim(),
      ...(boldLead[2].trim() ? { text: boldLead[2].trim() } : {}),
    }
  }

  const colonSplit = /^([^:：]{1,18})[：:]\s*(.+)$/.exec(clean)
  if (colonSplit && !/^https?$/i.test(colonSplit[1])) {
    return {
      tag: String(index + 1).padStart(2, '0'),
      title: stripInlineMarkdown(colonSplit[1]),
      text: colonSplit[2].trim(),
    }
  }

  return {
    tag: String(index + 1).padStart(2, '0'),
    title: plain.length <= 20 ? plain : plain.slice(0, 16) + '…',
    ...(plain.length > 20 ? { text: clean } : {}),
  }
}

const EXTENDED_ITEM_LAYOUTS = new Set(['sankey', 'value-chain', 'marimekko', 'swot'])

export function normalizeSlideItems(rawItems, layout) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) return undefined
  const maxItems = EXTENDED_ITEM_LAYOUTS.has(layout) ? 12 : 8
  const out = rawItems
    .slice(0, maxItems)
    .map((entry, idx) => {
      if (typeof entry === 'string') return parseBulletToItem(entry, idx, layout)
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null
      const tag = stripInlineMarkdown(entry.tag ?? entry.badge ?? entry.step ?? entry.phase ?? entry.source ?? entry.from ?? '')
      const title = stripInlineMarkdown(entry.title ?? entry.label ?? entry.heading ?? entry.name ?? entry.target ?? entry.to ?? '')
      const text = cleanRichText(entry.text ?? entry.body ?? entry.description ?? entry.detail ?? '')
      const value = entry.value !== undefined && entry.value !== null ? stripInlineMarkdown(String(entry.value)) : ''
      const unit = stripInlineMarkdown(entry.unit ?? '')
      const delta = stripInlineMarkdown(entry.delta ?? entry.change ?? '')
      const rawStatus = String(entry.status ?? entry.tone ?? '').trim().toLowerCase()
      const status = VALID_STATUS.has(rawStatus) ? rawStatus : undefined
      const startNum = entry.start !== undefined && entry.start !== null && entry.start !== '' ? Number(entry.start) : NaN
      const start = Number.isFinite(startNum) ? Math.max(0, startNum) : undefined
      const spanNum = entry.span !== undefined && entry.span !== null && entry.span !== '' ? Number(entry.span) : NaN
      const span = Number.isFinite(spanNum) ? Math.max(0, spanNum) : undefined
      const milestone = entry.milestone === true ? true : undefined
      const role = stripInlineMarkdown(entry.role ?? '')
      const conversion = stripInlineMarkdown(entry.conversion ?? '')
      const bullets = Array.isArray(entry.bullets ?? entry.items)
        ? (entry.bullets ?? entry.items).map((b) => cleanRichText(String(b))).filter(Boolean).slice(0, 8)
        : undefined
      if (!title && !text && !value && (!bullets || bullets.length === 0)) return null
      return {
        ...(tag ? { tag } : {}),
        ...(title ? { title } : {}),
        ...(text ? { text } : {}),
        ...(value ? { value } : {}),
        ...(unit ? { unit } : {}),
        ...(delta ? { delta } : {}),
        ...(start !== undefined ? { start } : {}),
        ...(span !== undefined ? { span } : {}),
        ...(milestone ? { milestone } : {}),
        ...(role ? { role } : {}),
        ...(conversion ? { conversion } : {}),
        ...(status ? { status } : {}),
        ...(bullets?.length ? { bullets } : {}),
      }
    })
    .filter(Boolean)
  return out.length > 0 ? out : undefined
}

export function resolveEffectiveItems(slide) {
  if (Array.isArray(slide.items) && slide.items.length > 0) return slide.items
  const maxItems = EXTENDED_ITEM_LAYOUTS.has(slide.layout) ? 12 : 8
  const bullets = Array.isArray(slide.bullets) ? slide.bullets : []
  if (bullets.length > 0) {
    return bullets.slice(0, maxItems).map((b, i) => parseBulletToItem(b, i, slide.layout))
  }
  if (slide.subtitle || slide.text) {
    return [parseBulletToItem(slide.text || slide.subtitle, 0, slide.layout)]
  }
  return []
}

// ---------------------------------------------------------------------------
// OOXML 基础图元构建器（严格遵循 ECMA-376 元素顺序与单页唯一 ID）
// ---------------------------------------------------------------------------

function hex6(color) {
  return String(color ?? '#000000').replace(/^#/, '').slice(0, 6).toUpperCase()
}

export function ooxmlSolidFill(color, alphaFraction = 1) {
  const alphaXml = alphaFraction < 0.999
    ? '<a:alpha val="' + Math.round(Math.max(0, Math.min(1, alphaFraction)) * 100000) + '"/>'
    : ''
  return '<a:solidFill><a:srgbClr val="' + hex6(color) + '">' + alphaXml + '</a:srgbClr></a:solidFill>'
}

export function ooxmlLinearGradientFill(stops, angleDeg = 135) {
  const gsLst = stops.map((s) => {
    const pos = Math.round(Math.max(0, Math.min(1, s.offset)) * 100000)
    const alpha = s.alpha !== undefined && s.alpha < 0.999
      ? '<a:alpha val="' + Math.round(Math.max(0, Math.min(1, s.alpha)) * 100000) + '"/>'
      : ''
    return '<a:gs pos="' + pos + '"><a:srgbClr val="' + hex6(s.color) + '">' + alpha + '</a:srgbClr></a:gs>'
  }).join('')
  const ang = Math.round((((angleDeg % 360) + 360) % 360) * 60000)
  return '<a:gradFill rotWithShape="1"><a:gsLst>' + gsLst + '</a:gsLst><a:lin ang="' + ang + '" scaled="1"/></a:gradFill>'
}

export function ooxmlRichParagraph(textOrRuns, options = {}) {
  const {
    sizePt = 16,
    color = '#0F172A',
    secondaryColor = color,
    accentColor = color,
    codeHighlight = '',
    bold = false,
    italic = false,
    lang = 'zh-CN',
    align = 'l',
    bullet = false,
    bulletChar = '▪',
    bulletColor = '',
    font = 'Segoe UI',
    lineHeight = 1.35,
    spaceBeforePt = 0,
    spaceAfterPt = 0,
    spc = 0,
    autoLeadBold = false,
  } = options

  const latinFont = pptxFontName(font)
  const eaFont = pptxEastAsianFont(font)
  const sz = Math.round(sizePt * 100)
  const runs = Array.isArray(textOrRuns)
    ? textOrRuns
    : parseInlineRuns(String(textOrRuns ?? ''), { autoLeadBold })

  const lnSpcXml = lineHeight > 0
    ? '<a:lnSpc><a:spcPct val="' + Math.round(lineHeight * 100000) + '"/></a:lnSpc>'
    : ''
  const spcBefXml = spaceBeforePt > 0
    ? '<a:spcBef><a:spcPts val="' + Math.round(spaceBeforePt * 100) + '"/></a:spcBef>'
    : ''
  const spcAftXml = spaceAfterPt > 0
    ? '<a:spcAft><a:spcPts val="' + Math.round(spaceAfterPt * 100) + '"/></a:spcAft>'
    : ''
  const bulletXml = bullet
    ? (bulletColor ? '<a:buClr><a:srgbClr val="' + hex6(bulletColor) + '"/></a:buClr>' : '') +
      '<a:buSzPct val="85000"/>' +
      '<a:buFont typeface="' + escapeXml(latinFont) + '"/>' +
      '<a:buChar char="' + escapeXml(bulletChar) + '"/>'
    : '<a:buNone/>'

  const pPrAttrs = (bullet ? ' marL="247650" indent="-247650"' : '') + (align !== 'l' ? ' algn="' + align + '"' : '')
  const pPr = '<a:pPr' + pPrAttrs + '>' + lnSpcXml + spcBefXml + spcAftXml + bulletXml + '</a:pPr>'

  if (runs.length === 0) {
    return '<a:p>' + pPr + '<a:endParaRPr lang="' + lang + '" sz="' + sz + '" dirty="0"/></a:p>'
  }

  const runsXml = runs.map((run) => {
    const runBold = Boolean(bold || run.bold)
    const runItalic = Boolean(italic || run.italic)
    const runColor = run.accent ? accentColor : run.secondary ? secondaryColor : color
    const runSize = run.sizePt ? Math.round(run.sizePt * 100) : sz
    const effSpc = run.spcEm ? Math.round(spc + run.spcEm * (run.sizePt ?? sizePt) * 100) : spc
    const spcAttr = effSpc !== 0 ? ' spc="' + Math.round(effSpc) + '"' : ''
    const baselineAttr = run.baseline ? ' baseline="' + Math.round(run.baseline) + '"' : ''
    const isPureMathNonCjk = Boolean(run.math && !/[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/.test(run.text))
    const runLang = isPureMathNonCjk ? 'en-US' : lang
    const runLatin = isPureMathNonCjk ? 'Georgia' : latinFont
    const hlXml = run.code && codeHighlight
      ? '<a:highlight><a:srgbClr val="' + hex6(codeHighlight) + '"/></a:highlight>'
      : ''
    return (
      '<a:r><a:rPr lang="' + runLang + '" sz="' + runSize + '" b="' + (runBold ? 1 : 0) + '"' +
      (runItalic ? ' i="1"' : '') + baselineAttr + spcAttr + ' dirty="0">' +
      ooxmlSolidFill(runColor) +
      hlXml +
      '<a:latin typeface="' + escapeXml(runLatin) + '"/>' +
      '<a:ea typeface="' + escapeXml(isPureMathNonCjk ? runLatin : eaFont) + '"/>' +
      '</a:rPr><a:t>' + escapeXml(run.text) + '</a:t></a:r>'
    )
  }).join('')

  return '<a:p>' + pPr + runsXml + '</a:p>'
}

export function ooxmlShape(id, name, boxIn, options = {}) {
  const {
    preset = 'rect',
    adj,
    adjs,
    fill = '',
    fillAlpha = 1,
    gradientStops = null,
    gradientAngle = 135,
    stroke = '',
    strokePt = 0.75,
    dash = '',
    shadow = false,
    txBox = false,
    anchor = 't',
    marginsIn = { l: 0.08, r: 0.08, t: 0.05, b: 0.05 },
    fontScale = 100000,
    autofit = true,
    paragraphs = [],
  } = options

  const b = boxToEmu(boxIn)
  const avLst = adjs && typeof adjs === 'object'
    ? '<a:avLst>' + Object.entries(adjs).map(([k, v]) => '<a:gd name="' + escapeXml(k) + '" fmla="val ' + Math.round(v) + '"/>').join('') + '</a:avLst>'
    : adj !== undefined && preset === 'roundRect'
      ? '<a:avLst><a:gd name="adj" fmla="val ' + Math.round(adj) + '"/></a:avLst>'
      : '<a:avLst/>'
  const fillXml = gradientStops
    ? ooxmlLinearGradientFill(gradientStops, gradientAngle)
    : fill
      ? ooxmlSolidFill(fill, fillAlpha)
      : '<a:noFill/>'
  const lnXml = stroke
    ? '<a:ln w="' + ptToEmu(strokePt) + '" cap="flat">' + ooxmlSolidFill(stroke) + (dash ? '<a:prstDash val="' + dash + '"/>' : '') + '</a:ln>'
    : '<a:ln><a:noFill/></a:ln>'
  const effectXml = shadow
    ? '<a:effectLst><a:outerShdw blurRad="152400" dist="38100" dir="5400000" algn="tl" rotWithShape="0"><a:srgbClr val="0F172A"><a:alpha val="9000"/></a:srgbClr></a:outerShdw></a:effectLst>'
    : ''

  const lIns = inToEmu(marginsIn.l ?? 0.08)
  const rIns = inToEmu(marginsIn.r ?? 0.08)
  const tIns = inToEmu(marginsIn.t ?? 0.05)
  const bIns = inToEmu(marginsIn.b ?? 0.05)
  const fitXml = autofit
    ? '<a:normAutofit' + (fontScale < 100000 ? ' fontScale="' + fontScale + '"' : '') + '/>'
    : '<a:noAutofit/>'
  const bodyContent = paragraphs.length > 0 ? paragraphs.join('') : '<a:p/>'

  return (
    '<p:sp>' +
    '<p:nvSpPr><p:cNvPr id="' + id + '" name="' + escapeXml(name) + '"/>' +
    '<p:cNvSpPr' + (txBox ? ' txBox="1"' : '') + '/><p:nvPr/></p:nvSpPr>' +
    '<p:spPr><a:xfrm><a:off x="' + b.x + '" y="' + b.y + '"/><a:ext cx="' + b.w + '" cy="' + b.h + '"/></a:xfrm>' +
    '<a:prstGeom prst="' + preset + '">' + avLst + '</a:prstGeom>' +
    fillXml + lnXml + effectXml + '</p:spPr>' +
    '<p:txBody><a:bodyPr wrap="square" rtlCol="0" lIns="' + lIns + '" tIns="' + tIns + '" rIns="' + rIns + '" bIns="' + bIns + '" anchor="' + anchor + '">' +
    fitXml + '</a:bodyPr><a:lstStyle/>' + bodyContent + '</p:txBody>' +
    '</p:sp>'
  )
}

/**
 * 原生自由矢量路径图元 <a:custGeom>（用于桑基图三次贝塞尔流向丝带等高精度几何绘制）。
 */
export function ooxmlCustGeomShape(id, name, boxIn, pathCommandsXml, options = {}) {
  const {
    pathW = 10000,
    pathH = 10000,
    fill = '',
    fillAlpha = 1,
    gradientStops = null,
    gradientAngle = 0,
    stroke = '',
    strokePt = 0.75,
  } = options
  const b = boxToEmu(boxIn)
  const fillXml = gradientStops
    ? ooxmlLinearGradientFill(gradientStops, gradientAngle)
    : fill
      ? ooxmlSolidFill(fill, fillAlpha)
      : '<a:noFill/>'
  const lnXml = stroke
    ? '<a:ln w="' + ptToEmu(strokePt) + '" cap="flat">' + ooxmlSolidFill(stroke) + '</a:ln>'
    : '<a:ln><a:noFill/></a:ln>'

  return (
    '<p:sp>' +
    '<p:nvSpPr><p:cNvPr id="' + id + '" name="' + escapeXml(name) + '"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>' +
    '<p:spPr>' +
    '<a:xfrm><a:off x="' + b.x + '" y="' + b.y + '"/><a:ext cx="' + Math.max(12700, b.w) + '" cy="' + Math.max(12700, b.h) + '"/></a:xfrm>' +
    '<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="l" t="t" r="r" b="b"/>' +
    '<a:pathLst><a:path w="' + Math.round(pathW) + '" h="' + Math.round(pathH) + '">' +
    pathCommandsXml +
    '</a:path></a:pathLst></a:custGeom>' +
    fillXml + lnXml +
    '</p:spPr>' +
    '<p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>' +
    '</p:sp>'
  )
}

/**
 * 原生 ECMA-376 Office Math (<a14:m><m:oMathPara><m:oMath>) 公式卡片构建器。
 * 为深色主题自动铺设高对比度学术象牙瓷板，确保 LibreOffice StarMath 与 PowerPoint 均呈现 15:1+ 锐利对比且 1:1 自然宽高比无拉伸。
 */
export function ooxmlMathShape(id, name, boxIn, latex, options = {}) {
  const ast = parseLatexMath(latex)
  const fit = fitFormulaBoxIn(ast, boxIn, {
    padXIn: options.padXIn ?? 0.24,
    padYIn: options.padYIn ?? 0.10,
    emIn: options.emIn ?? 0.30,
    align: options.align ?? 'ctr',
  })
  const b = boxToEmu(fit)
  const ommlXml = astToOmml(ast, {
    wrapDrawingMl: true,
    sizePt: options.sizePt ?? 20,
    color: options.color ?? '#0F172A',
  })
  const algn = options.align === 'l' ? 'l' : 'ctr'
  return (
    '<p:sp>' +
    '<p:nvSpPr><p:cNvPr id="' + id + '" name="' + escapeXml(name) + '"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>' +
    '<p:spPr><a:xfrm><a:off x="' + b.x + '" y="' + b.y + '"/><a:ext cx="' + b.w + '" cy="' + b.h + '"/></a:xfrm>' +
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr>' +
    '<p:txBody><a:bodyPr wrap="none" lIns="0" tIns="0" rIns="0" bIns="0" anchor="ctr"><a:noAutofit/></a:bodyPr><a:lstStyle/>' +
    '<a:p><a:pPr algn="' + algn + '"><a:buNone/></a:pPr>' + ommlXml + '</a:p>' +
    '</p:txBody></p:sp>'
  )
}

function renderMathCardPptx(namePrefix, boxIn, latex, nextIdFn, chromeCfg, theme, options = {}) {
  const tk = theme.tokens
  const cardPreset = chromeCfg.cardRadiusPx > 0 ? 'roundRect' : 'rect'
  // 深色主题下使用象牙白学术公式衬板，确保 LibreOffice StarMath 墨色与底板保持 >16:1 对比度
  const plateFill = theme.dark ? '#F8FAFC' : tk.surface2
  const out = [
    ooxmlShape(nextIdFn(), namePrefix + ' Surface', boxIn, {
      preset: cardPreset,
      adj: roundRectAdj(boxIn.w, boxIn.h, chromeCfg.cardRadiusPx),
      fill: plateFill,
      stroke: chromeCfg.cardBorderless ? '' : tk.accentPrimary,
      strokePt: 1.0,
    }),
    ooxmlShape(nextIdFn(), namePrefix + ' Accent Rail', { x: boxIn.x, y: boxIn.y, w: 0.07, h: boxIn.h }, {
      preset: 'rect',
      fill: tk.accentPrimary,
    }),
    ooxmlMathShape(nextIdFn(), namePrefix + ' Equation', boxIn, latex, {
      padXIn: 0.34,
      padYIn: 0.14,
      emIn: options.emIn ?? 0.30,
      sizePt: options.sizePt ?? 20,
      color: '#0F172A',
      align: options.align ?? 'ctr',
    }),
  ]
  return out.join('')
}

export function ooxmlLine(id, name, fromIn, toIn, options = {}) {
  const {
    color = '#CBD5E1',
    widthPt = 1,
    dash = '',
    headArrow = false,
    tailArrow = false,
  } = options
  const x = Math.min(fromIn.x, toIn.x)
  const y = Math.min(fromIn.y, toIn.y)
  const w = Math.max(0.001, Math.abs(toIn.x - fromIn.x))
  const h = Math.max(0.001, Math.abs(toIn.y - fromIn.y))
  const flipH = toIn.x < fromIn.x ? ' flipH="1"' : ''
  const flipV = toIn.y < fromIn.y ? ' flipV="1"' : ''
  const headXml = headArrow ? '<a:headEnd type="triangle" w="med" len="med"/>' : ''
  const tailXml = tailArrow ? '<a:tailEnd type="triangle" w="med" len="med"/>' : ''

  return (
    '<p:cxnSp>' +
    '<p:nvCxnSpPr><p:cNvPr id="' + id + '" name="' + escapeXml(name) + '"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr>' +
    '<p:spPr><a:xfrm' + flipH + flipV + '><a:off x="' + inToEmu(x) + '" y="' + inToEmu(y) + '"/>' +
    '<a:ext cx="' + (Math.abs(toIn.x - fromIn.x) < 0.0005 ? 0 : Math.max(12700, inToEmu(w))) + '" cy="' + (Math.abs(toIn.y - fromIn.y) < 0.0005 ? 0 : inToEmu(h)) + '"/></a:xfrm>' +
    '<a:prstGeom prst="line"><a:avLst/></a:prstGeom>' +
    '<a:ln w="' + ptToEmu(widthPt) + '" cap="rnd">' + ooxmlSolidFill(color) +
    (dash ? '<a:prstDash val="' + dash + '"/>' : '') + headXml + tailXml + '</a:ln>' +
    '</p:spPr></p:cxnSp>'
  )
}

function isNumericCell(cell) {
  const plain = stripInlineMarkdown(cell)
  return /^\s*[+-]?[$¥€£]?\s*(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*(?:[%％xX倍]|万|亿|元|万元|亿元|次|页|个|人|天|小时|分钟|ms|s)?\s*$/.test(plain)
}

/**
 * 原生可编辑 OOXML 表格（支持 consulting / booktabs 学术三线表 / minimal / banded，
 * 智能按内容宽度分配列宽，数值列自动右对齐，支持单元格 **粗体** 高亮）。
 */
export function ooxmlTable(id, name, boxIn, rows, theme, langAttr, tableStyleInput) {
  const tk = theme.tokens
  const style = tableStyleInput || theme.defaultTableStyle || 'consulting'
  const safeRows = Array.isArray(rows) && rows.length > 0 ? rows : [['']]
  const cols = Math.max(1, ...safeRows.map((r) => r.length))
  const fontSizePt = cols <= 5 ? 15 : cols === 6 ? 14 : 12.5

  // 智能按列最大视觉宽度分配列宽（钳制最小占比 9%，最大占比 44%）
  const weights = Array.from({ length: cols }, (_, c) => {
    const maxEm = Math.max(3, ...safeRows.map((r) => measureEmWidth(r[c] ?? '', true)))
    return Math.min(24, Math.max(4, maxEm + 2))
  })
  const weightSum = weights.reduce((a, b) => a + b, 0) || cols
  const totalWEmu = inToEmu(boxIn.w)
  const colWidths = weights.map((w) => Math.floor((w / weightSum) * totalWEmu))
  const remainder = totalWEmu - colWidths.reduce((a, b) => a + b, 0)
  colWidths[0] += remainder
  const gridXml = colWidths.map((w) => '<a:gridCol w="' + w + '"/>').join('')

  // 判断数值列（除表头外 >=60% 非空单元格为数值）
  const numericCols = Array.from({ length: cols }, (_, c) => {
    const bodyCells = safeRows.slice(1).map((r) => String(r[c] ?? '').trim()).filter(Boolean)
    return bodyCells.length > 0 && bodyCells.filter(isNumericCell).length / bodyCells.length >= 0.6
  })

  const rowCount = safeRows.length
  const maxRowHIn = Math.min(0.56, Math.max(0.38, boxIn.h / Math.max(rowCount, 1)))
  const rowHEmu = inToEmu(maxRowHIn)

  const borderXml = (side, ptWidth, colorHex) =>
    colorHex && ptWidth > 0
      ? '<a:' + side + ' w="' + ptToEmu(ptWidth) + '" cap="flat" cmpd="sng" algn="ctr">' + ooxmlSolidFill(colorHex) + '<a:prstDash val="solid"/></a:' + side + '>'
      : '<a:' + side + '><a:noFill/></a:' + side + '>'

  const trsXml = safeRows.map((row, rIdx) => {
    const isHeader = rIdx === 0
    const isLast = rIdx === rowCount - 1
    const padded = Array.from({ length: cols }, (_, c) => String(row[c] ?? ''))

    const cellsXml = padded.map((cellText, cIdx) => {
      const align = (numericCols[cIdx] || (!isHeader && isNumericCell(cellText))) ? 'r' : 'l'
      let fillHex = ''
      let textColor = tk.inkPrimary
      let lnT = ''
      let lnB = ''

      if (style === 'booktabs') {
        // 学术三线表：顶线 1.5pt，表头下线 0.75pt，底线 1.5pt，零底色，零竖线
        fillHex = ''
        textColor = tk.inkPrimary
        lnT = isHeader ? borderXml('lnT', 1.5, tk.inkPrimary) : borderXml('lnT', 0, '')
        lnB = isHeader
          ? borderXml('lnB', 0.75, tk.inkPrimary)
          : isLast
            ? borderXml('lnB', 1.5, tk.inkPrimary)
            : borderXml('lnB', 0, '')
      } else if (style === 'minimal') {
        fillHex = ''
        textColor = isHeader ? tk.accentText : tk.inkPrimary
        lnT = borderXml('lnT', 0, '')
        lnB = isHeader
          ? borderXml('lnB', 1.25, tk.accentPrimary)
          : borderXml('lnB', 0.5, tk.hairline)
      } else if (style === 'banded') {
        fillHex = isHeader ? tk.accentPrimary : (rIdx % 2 === 1 ? tk.surface1 : '')
        textColor = isHeader ? tk.inkOnAccent : tk.inkPrimary
        lnT = borderXml('lnT', 0, '')
        lnB = borderXml('lnB', 0.5, tk.hairline)
      } else {
        // consulting（默认）：表头微表面底色 + 主强调底线，行间细发丝线，隔行微弱衬底
        fillHex = isHeader ? tk.surface2 : (rIdx % 2 === 0 && rIdx > 0 ? tk.surface1 : '')
        textColor = isHeader ? tk.inkPrimary : tk.inkPrimary
        lnT = isHeader ? borderXml('lnT', 1.25, tk.accentPrimary) : borderXml('lnT', 0, '')
        lnB = isHeader
          ? borderXml('lnB', 1.25, tk.accentPrimary)
          : isLast
            ? borderXml('lnB', 1.0, tk.inkMuted)
            : borderXml('lnB', 0.5, tk.hairline)
      }

      const para = ooxmlRichParagraph(cellText, {
        sizePt: fontSizePt,
        color: textColor,
        secondaryColor: tk.inkSecondary,
        accentColor: tk.accentText,
        codeHighlight: tk.surface2,
        bold: isHeader,
        lang: langAttr,
        align,
        font: theme.fonts.body,
        lineHeight: 1.25,
      })

      return (
        '<a:tc>' +
        '<a:txBody><a:bodyPr anchor="ctr"/><a:lstStyle/>' + para + '</a:txBody>' +
        '<a:tcPr marL="109728" marR="109728" marT="54864" marB="54864" anchor="ctr">' +
        borderXml('lnL', 0, '') +
        borderXml('lnR', 0, '') +
        lnT +
        lnB +
        (fillHex ? ooxmlSolidFill(fillHex) : '<a:noFill/>') +
        '</a:tcPr></a:tc>'
      )
    }).join('')

    return '<a:tr h="' + rowHEmu + '">' + cellsXml + '</a:tr>'
  }).join('')

  const totalHEmu = Math.max(1, rowCount) * rowHEmu
  return (
    '<p:graphicFrame>' +
    '<p:nvGraphicFramePr><p:cNvPr id="' + id + '" name="' + escapeXml(name) + '"/>' +
    '<p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr>' +
    '<p:xfrm><a:off x="' + inToEmu(boxIn.x) + '" y="' + inToEmu(boxIn.y) + '"/>' +
    '<a:ext cx="' + totalWEmu + '" cy="' + totalHEmu + '"/></p:xfrm>' +
    '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">' +
    '<a:tbl><a:tblPr firstRow="1" bandRow="' + (style === 'booktabs' || style === 'minimal' ? '0' : '1') + '"/>' +
    '<a:tblGrid>' + gridXml + '</a:tblGrid>' + trsXml + '</a:tbl>' +
    '</a:graphicData></a:graphic></p:graphicFrame>'
  )
}

// ---------------------------------------------------------------------------
// 页眉、底栏结论条（Takeaway）与页脚页码（Folio）共享装饰组件
// ---------------------------------------------------------------------------

function statusPalette(status, tk) {
  if (status === 'positive') return { fg: tk.positive, bg: tk.surface2, bar: tk.positive }
  if (status === 'negative') return { fg: tk.negative, bg: tk.surface2, bar: tk.negative }
  if (status === 'warning') return { fg: tk.warning, bg: tk.surface2, bar: tk.warning }
  if (status === 'accent') return { fg: tk.accentText, bg: tk.accentSoft, bar: tk.accentPrimary }
  return { fg: tk.accentText, bg: tk.surface1, bar: tk.accentPrimary }
}

const SOURCE_PREFIX_RE = /^(?:数据来源|来源|出处|测算口径|实验环境|统计口径|资料来源|Source|Sources|Note|Notes)\s*[:：]/i

export function formatSourceLine(rawSource, langOrAttr = 'zh') {
  const clean = String(rawSource ?? '').trim()
  if (clean === '') return ''
  if (SOURCE_PREFIX_RE.test(clean)) return clean
  const isEn = langOrAttr === 'en' || langOrAttr === 'en-US'
  return (isEn ? 'Source: ' : '数据来源：') + clean
}

export function computeBadgePillWidth(text, sizePt = 11, maxW = 2.8, minW = 0.54) {
  const rawW = measureEmWidth(String(text ?? ''), true) * (sizePt / 72) * 1.24 + 0.38
  return Math.min(Math.max(minW, maxW), Math.max(minW, +rawW.toFixed(4)))
}

export function getChromeConfig(chromeStyle, theme) {
  const chrome = chromeStyle || resolveChromeStyle(theme)
  if (chrome === 'consulting-classic') {
    return {
      chrome,
      cardRadiusPx: 0,
      cardBorderless: false,
      cardStrokePt: 0.75,
      cardTopBar: false,
      cardLeftBar: true,
      headerStyle: 'consulting-tracker',
      bodyTopY: 1.80,
      takeawayStyle: 'top-rule',
      folioPos: 'bottom-right',
      useDisplayNumeral: false,
    }
  }
  if (chrome === 'keynote-spatial') {
    return {
      chrome,
      cardRadiusPx: 21,
      cardBorderless: true,
      cardStrokePt: 0,
      cardTopBar: false,
      cardLeftBar: false,
      headerStyle: 'keynote-clean',
      bodyTopY: 1.76,
      takeawayStyle: 'caption',
      folioPos: 'bottom-right',
      useDisplayNumeral: false,
    }
  }
  if (chrome === 'editorial-folio') {
    return {
      chrome,
      cardRadiusPx: 0,
      cardBorderless: false,
      cardStrokePt: 0.5,
      cardTopBar: false,
      cardLeftBar: false,
      headerStyle: 'editorial-folio',
      bodyTopY: 1.80,
      takeawayStyle: 'editorial-rule',
      folioPos: 'top-right',
      useDisplayNumeral: true,
    }
  }
  if (chrome === 'academic-minimal') {
    return {
      chrome,
      cardRadiusPx: 8,
      cardBorderless: false,
      cardStrokePt: 0.75,
      cardTopBar: false,
      cardLeftBar: false,
      headerStyle: 'beamer-band',
      bodyTopY: 1.54,
      takeawayStyle: 'top-rule',
      folioPos: 'beamer-bar',
      useDisplayNumeral: false,
    }
  }
  if (chrome === 'gov-ceremonial') {
    return {
      chrome,
      cardRadiusPx: 8,
      cardBorderless: false,
      cardStrokePt: 0.75,
      cardTopBar: true,
      cardLeftBar: false,
      headerStyle: 'double-rule',
      bodyTopY: 1.82,
      takeawayStyle: 'pill',
      folioPos: 'bottom-right',
      useDisplayNumeral: false,
    }
  }
  return {
    chrome: 'saas-bento',
    cardRadiusPx: Math.max(10, theme?.radiusPx ?? 13),
    cardBorderless: false,
    cardStrokePt: 0.75,
    cardTopBar: true,
    cardLeftBar: false,
    headerStyle: 'standard',
    bodyTopY: 1.82,
    takeawayStyle: 'pill',
    folioPos: 'bottom-right',
    useDisplayNumeral: false,
  }
}

function renderSurfaceCardPptx(name, box, opts, nextIdFn, chromeCfg, theme) {
  const tk = theme.tokens
  const {
    fill = tk.surface1,
    focal = false,
    stroke,
    accentBarColor = tk.accentPrimary,
    paragraphs = [],
    anchor = 't',
    marginsIn = { l: 0.08, r: 0.08, t: 0.05, b: 0.05 },
    fontScale = 100000,
    txBox = false,
  } = opts
  const radius = chromeCfg.cardRadiusPx
  const preset = radius > 0 ? 'roundRect' : 'rect'
  const resolvedFill = chromeCfg.cardBorderless && focal && fill === tk.surface1 ? tk.surface2 : fill
  const resolvedStroke = stroke !== undefined
    ? stroke
    : chromeCfg.cardBorderless
      ? ''
      : (focal ? tk.accentPrimary : tk.hairline)
  const strokePt = focal ? 1.0 : chromeCfg.cardStrokePt
  const out = [
    ooxmlShape(nextIdFn(), name, box, {
      preset,
      adj: roundRectAdj(box.w, box.h, radius),
      fill: resolvedFill,
      stroke: resolvedStroke,
      strokePt,
      shadow: theme.shadow && !chromeCfg.cardBorderless,
      txBox,
      anchor,
      marginsIn,
      fontScale,
      paragraphs,
    }),
  ]
  if (chromeCfg.cardTopBar) {
    out.push(ooxmlShape(nextIdFn(), name + ' top bar', { x: box.x, y: box.y, w: box.w, h: 0.05 }, {
      preset: 'rect',
      fill: focal ? accentBarColor : tk.hairline,
    }))
  }
  if (chromeCfg.cardLeftBar) {
    out.push(ooxmlShape(nextIdFn(), name + ' left stripe', { x: box.x, y: box.y, w: 0.04, h: box.h }, {
      preset: 'rect',
      fill: focal ? accentBarColor : tk.accentPrimary,
    }))
  }
  return out.join('')
}

function formatGovKicker(kicker) {
  const clean = String(kicker ?? '').trim()
  if (!clean) return ''
  return /^【/.test(clean) ? clean : '【' + clean + '】'
}

export function renderSlideChromePptx(slide, index, total, theme, langAttr, manifest = {}, nextIdFn) {
  const tk = theme.tokens
  const chromeStyle = resolveChromeStyle(theme, slide, manifest.brand)
  const chromeCfg = getChromeConfig(chromeStyle, theme)
  const idBase = (index + 1) * 10
  const shapes = []
  const isFraming = slide.layout === 'cover' || slide.layout === 'closing'
  const hasTakeaway = !isFraming && typeof slide.takeaway === 'string' && slide.takeaway.trim() !== ''
  const isEn = langAttr === 'en-US'

  // Bottom Takeaway Bar (6 Chrome Skeleton differentiated treatment)
  if (hasTakeaway) {
    const barBox = { x: 0.62, y: 6.26, w: 12.09, h: 0.54 }
    const text = slide.takeaway.trim()
    if (chromeCfg.takeawayStyle === 'caption') {
      shapes.push(ooxmlShape(nextIdFn(), 'Takeaway box', barBox, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0.4, r: 0.4, t: 0.02, b: 0.02 },
        paragraphs: [
          ooxmlRichParagraph(text, {
            sizePt: 13.5,
            color: tk.inkSecondary,
            secondaryColor: tk.inkMuted,
            accentColor: tk.accentText,
            bold: false,
            lang: langAttr,
            align: 'ctr',
            font: theme.fonts.body,
            lineHeight: 1.2,
          }),
        ],
      }))
    } else if (chromeCfg.takeawayStyle === 'top-rule' || chromeCfg.takeawayStyle === 'editorial-rule') {
      const prefix = chromeCfg.takeawayStyle === 'editorial-rule'
        ? '**—**  '
        : (isEn ? '**Key Takeaway:** ' : '**核心结论：**')
      shapes.push(ooxmlLine(nextIdFn(), 'Takeaway rule', { x: 0.62, y: 6.22 }, { x: 12.71, y: 6.22 }, {
        color: chromeCfg.takeawayStyle === 'editorial-rule' ? tk.hairline : tk.accentPrimary,
        widthPt: chromeCfg.takeawayStyle === 'editorial-rule' ? 0.75 : 1.0,
      }))
      shapes.push(ooxmlShape(nextIdFn(), 'Takeaway box', { x: 0.62, y: 6.28, w: 12.09, h: 0.50 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0.02, b: 0.02 },
        paragraphs: [
          ooxmlRichParagraph(prefix + text, {
            sizePt: 13.5,
            color: tk.inkPrimary,
            secondaryColor: tk.inkSecondary,
            accentColor: tk.accentText,
            bold: false,
            lang: langAttr,
            font: theme.fonts.body,
            lineHeight: 1.22,
          }),
        ],
      }))
    } else {
      const preset = chromeCfg.cardRadiusPx > 0 ? 'roundRect' : 'rect'
      shapes.push(ooxmlShape(nextIdFn(), 'Takeaway box', barBox, {
        preset,
        adj: roundRectAdj(barBox.w, barBox.h, Math.min(8, chromeCfg.cardRadiusPx)),
        fill: tk.accentSoft,
        stroke: tk.hairline,
        strokePt: 0.75,
        anchor: 'ctr',
        marginsIn: { l: 0.22, r: 0.16, t: 0.04, b: 0.04 },
        paragraphs: [
          ooxmlRichParagraph('▸  ' + text, {
            sizePt: 13.5,
            color: tk.inkPrimary,
            secondaryColor: tk.inkSecondary,
            accentColor: tk.accentText,
            bold: true,
            lang: langAttr,
            font: theme.fonts.body,
            lineHeight: 1.2,
          }),
        ],
      }))
      shapes.push(ooxmlShape(nextIdFn(), 'Takeaway accent', { x: 0.62, y: 6.26, w: 0.06, h: 0.54 }, {
        preset: 'rect',
        fill: tk.accentPrimary,
      }))
    }
  }

  // Footer source + page folio (suppressed on cover & closing)
  if (!isFraming) {
    const folio = String(index + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0')
    if (chromeCfg.folioPos === 'beamer-bar') {
      // 3-zone Beamer academic status bar at bottom edge
      shapes.push(ooxmlShape(nextIdFn(), 'Beamer footer band', { x: 0, y: 7.04, w: CANVAS_IN.w, h: 0.46 }, {
        preset: 'rect',
        fill: tk.surface1,
      }))
      shapes.push(ooxmlLine(nextIdFn(), 'Beamer footer rule', { x: 0, y: 7.04 }, { x: CANVAS_IN.w, y: 7.04 }, {
        color: tk.hairline,
        widthPt: 0.5,
      }))
      const leftText = slide.source
        ? formatSourceLine(slide.source, langAttr)
        : (manifest.brand?.footer || manifest.title || '')
      if (leftText) {
        shapes.push(ooxmlShape(nextIdFn(), slide.source ? 'Footer source' : 'Beamer zone left', { x: 0.62, y: 7.10, w: 4.4, h: 0.32 }, {
          txBox: true,
          anchor: 'ctr',
          marginsIn: { l: 0, r: 0, t: 0, b: 0 },
          paragraphs: [
            ooxmlRichParagraph(leftText, {
              sizePt: 9.5,
              color: tk.inkMuted,
              lang: langAttr,
              align: 'l',
              font: theme.fonts.body,
              lineHeight: 1.15,
            }),
          ],
        }))
      }
      const centerText = (slide.kicker || slide.title || '').trim()
      if (centerText) {
        shapes.push(ooxmlShape(nextIdFn(), 'Beamer zone chapter', { x: 5.1, y: 7.10, w: 3.13, h: 0.32 }, {
          txBox: true,
          anchor: 'ctr',
          marginsIn: { l: 0, r: 0, t: 0, b: 0 },
          paragraphs: [
            ooxmlRichParagraph(centerText, {
              sizePt: 9.5,
              color: tk.inkSecondary,
              bold: true,
              lang: langAttr,
              align: 'ctr',
              font: theme.fonts.body,
              lineHeight: 1.15,
            }),
          ],
        }))
      }
      shapes.push(ooxmlShape(idBase + 9, 'Page number', { x: 10.65, y: 7.10, w: 2.06, h: 0.32 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(folio, {
            sizePt: 9.5,
            color: tk.accentText,
            bold: true,
            lang: langAttr,
            align: 'r',
            font: theme.fonts.body,
            lineHeight: 1.15,
          }),
        ],
      }))
    } else {
      if (slide.source) {
        const hasBrandFooter = Boolean(manifest.brand?.footer)
        const sourceBox = hasBrandFooter
          ? { x: 5.4, y: 6.95, w: 5.0, h: 0.32 }
          : { x: 0.62, y: 6.95, w: 9.2, h: 0.32 }
        shapes.push(ooxmlShape(nextIdFn(), 'Footer source', sourceBox, {
          txBox: true,
          anchor: 'ctr',
          marginsIn: { l: 0, r: 0, t: 0, b: 0 },
          paragraphs: [
            ooxmlRichParagraph(formatSourceLine(slide.source, langAttr), {
              sizePt: 9.5,
              color: tk.inkMuted,
              lang: langAttr,
              align: hasBrandFooter ? 'r' : 'l',
              font: theme.fonts.body,
              lineHeight: 1.15,
            }),
          ],
        }))
      }

      const folioBox = chromeCfg.folioPos === 'top-right'
        ? { x: 10.65, y: 0.24, w: 2.06, h: 0.28 }
        : { x: 10.65, y: 6.95, w: 2.06, h: 0.32 }
      shapes.push(ooxmlShape(idBase + 9, 'Page number', folioBox, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(folio, {
            sizePt: chromeCfg.folioPos === 'top-right' ? 10 : 9.5,
            color: tk.inkMuted,
            lang: langAttr,
            align: 'r',
            font: theme.fonts.body,
            lineHeight: 1.15,
          }),
        ],
      }))
    }
  }

  return shapes.join('')
}

function renderStandardHeaderPptx(slide, idBase, nextIdFn, theme, langAttr, chromeCfg) {
  const tk = theme.tokens
  const kicker = (slide.kicker ?? '').trim()
  const title = (slide.title ?? '').trim()
  const showKicker = kicker !== '' && kicker !== title
  const shapes = []
  const style = chromeCfg?.headerStyle || 'standard'

  if (style === 'beamer-band') {
    // Beamer Metropolis full-width tinted header band + 1.5pt accent bottom rule
    shapes.push(ooxmlShape(nextIdFn(), 'Beamer header band', { x: 0, y: 0, w: CANVAS_IN.w, h: 1.28 }, {
      preset: 'rect',
      fill: tk.surface1,
    }))
    shapes.push(ooxmlLine(nextIdFn(), 'Beamer header rule', { x: 0, y: 1.28 }, { x: CANVAS_IN.w, y: 1.28 }, {
      color: tk.accentPrimary,
      widthPt: 1.5,
    }))
    if (showKicker) {
      shapes.push(ooxmlShape(idBase + 1, 'Kicker', { x: 0.62, y: 0.14, w: 12.09, h: 0.24 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(kicker.toUpperCase(), {
            sizePt: 10,
            color: tk.accentText,
            bold: true,
            lang: langAttr,
            font: theme.fonts.body,
            lineHeight: 1.1,
            spc: 140,
          }),
        ],
      }))
    }
    if (title !== '') {
      const titleBox = { x: 0.62, y: showKicker ? 0.40 : 0.24, w: 12.09, h: 0.78 }
      const fit = computeTextFit(title, titleBox, 'slideTitle', { maxPt: 25, minPt: 20, padXPt: 2, padYPt: 2 })
      shapes.push(ooxmlShape(idBase + 2, 'Title', titleBox, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        fontScale: fit.fontScale,
        paragraphs: [
          ooxmlRichParagraph(title, {
            sizePt: fit.fontPt,
            color: tk.inkPrimary,
            bold: true,
            lang: langAttr,
            font: theme.fonts.heading,
            lineHeight: fit.lineHeight,
          }),
        ],
      }))
    }
    return shapes.join('')
  }

  if (style === 'editorial-folio') {
    // Full-width top 0.5pt magazine running folio bar (Kicker left, Page number top-right handled in chrome)
    if (showKicker) {
      shapes.push(ooxmlShape(idBase + 1, 'Kicker', { x: 0.62, y: 0.24, w: 8.8, h: 0.28 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(kicker.toUpperCase(), {
            sizePt: 10,
            color: tk.accentText,
            bold: true,
            lang: langAttr,
            font: theme.fonts.body,
            lineHeight: 1.1,
            spc: 180,
          }),
        ],
      }))
    }
    shapes.push(ooxmlLine(nextIdFn(), 'Editorial folio rule', { x: 0.62, y: 0.56 }, { x: 12.71, y: 0.56 }, {
      color: tk.hairline,
      widthPt: 0.5,
    }))
    if (title !== '') {
      const titleBox = { x: 0.62, y: 0.70, w: 12.09, h: 0.86 }
      const fit = computeTextFit(title, titleBox, 'slideTitle', { padXPt: 2, padYPt: 2 })
      shapes.push(ooxmlShape(idBase + 2, 'Title', titleBox, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        fontScale: fit.fontScale,
        paragraphs: [
          ooxmlRichParagraph(title, {
            sizePt: fit.fontPt,
            color: tk.inkPrimary,
            bold: true,
            lang: langAttr,
            font: theme.fonts.heading,
            lineHeight: fit.lineHeight,
          }),
        ],
      }))
    }
    shapes.push(ooxmlLine(nextIdFn(), 'Header rule', { x: 0.62, y: 1.64 }, { x: 12.71, y: 1.64 }, {
      color: tk.hairline,
      widthPt: 0.5,
    }))
    return shapes.join('')
  }

  if (style === 'keynote-clean') {
    // Floating eyebrow pill + NO top horizontal divider rule
    if (showKicker) {
      const pillW = computeBadgePillWidth(kicker.toUpperCase(), 10, 4.2, 1.05)
      shapes.push(ooxmlShape(idBase + 1, 'Kicker', { x: 0.62, y: 0.38, w: pillW, h: 0.30 }, {
        preset: 'roundRect',
        adj: 50000,
        fill: tk.accentSoft,
        anchor: 'ctr',
        marginsIn: { l: 0.08, r: 0.08, t: 0.02, b: 0.02 },
        paragraphs: [
          ooxmlRichParagraph(kicker.toUpperCase(), {
            sizePt: 10,
            color: tk.accentText,
            bold: true,
            lang: langAttr,
            align: 'ctr',
            font: theme.fonts.body,
            lineHeight: 1.1,
            spc: 100,
          }),
        ],
      }))
    }
    if (title !== '') {
      const titleBox = { x: 0.62, y: showKicker ? 0.76 : 0.48, w: 12.09, h: 0.88 }
      const fit = computeTextFit(title, titleBox, 'slideTitle', { padXPt: 2, padYPt: 2 })
      shapes.push(ooxmlShape(idBase + 2, 'Title', titleBox, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        fontScale: fit.fontScale,
        paragraphs: [
          ooxmlRichParagraph(title, {
            sizePt: fit.fontPt,
            color: tk.inkPrimary,
            bold: true,
            lang: langAttr,
            font: theme.fonts.heading,
            lineHeight: fit.lineHeight,
          }),
        ],
      }))
    }
    return shapes.join('')
  }

  if (style === 'consulting-tracker') {
    // Top-right section tracker pill + left-aligned title + crisp 0.75pt header rule
    let trackerW = 0
    if (showKicker) {
      trackerW = computeBadgePillWidth(kicker.toUpperCase(), 10, 3.6, 1.15)
      shapes.push(ooxmlShape(idBase + 1, 'Kicker', { x: 12.71 - trackerW, y: 0.44, w: trackerW, h: 0.32 }, {
        preset: 'rect',
        fill: tk.accentSoft,
        stroke: tk.accentPrimary,
        strokePt: 0.75,
        anchor: 'ctr',
        marginsIn: { l: 0.08, r: 0.08, t: 0.02, b: 0.02 },
        paragraphs: [
          ooxmlRichParagraph(kicker.toUpperCase(), {
            sizePt: 10,
            color: tk.accentText,
            bold: true,
            lang: langAttr,
            align: 'ctr',
            font: theme.fonts.body,
            lineHeight: 1.1,
            spc: 80,
          }),
        ],
      }))
    }
    if (title !== '') {
      const titleW = trackerW > 0 ? 12.09 - trackerW - 0.30 : 12.09
      const titleBox = { x: 0.62, y: 0.44, w: titleW, h: 1.06 }
      const fit = computeTextFit(title, titleBox, 'slideTitle', { padXPt: 2, padYPt: 2 })
      shapes.push(ooxmlShape(idBase + 2, 'Title', titleBox, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        fontScale: fit.fontScale,
        paragraphs: [
          ooxmlRichParagraph(title, {
            sizePt: fit.fontPt,
            color: tk.inkPrimary,
            bold: true,
            lang: langAttr,
            font: theme.fonts.heading,
            lineHeight: fit.lineHeight,
          }),
        ],
      }))
    }
    shapes.push(ooxmlLine(nextIdFn(), 'Header rule', { x: 0.62, y: 1.64 }, { x: 12.71, y: 1.64 }, {
      color: tk.hairline,
      widthPt: 0.75,
    }))
    return shapes.join('')
  }

  if (style === 'double-rule') {
    // Dignified gov-ceremonial header: 【kicker】 ribbon tag + 1.5pt primary rule + 0.5pt gold/secondary rule
    if (showKicker) {
      shapes.push(ooxmlShape(idBase + 1, 'Kicker', { x: 0.62, y: 0.36, w: 11.4, h: 0.30 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(formatGovKicker(kicker), {
            sizePt: 11.5,
            color: tk.accentText,
            bold: true,
            lang: langAttr,
            font: theme.fonts.body,
            lineHeight: 1.1,
            spc: 80,
          }),
        ],
      }))
    }
    if (title !== '') {
      const titleBox = { x: 0.62, y: showKicker ? 0.68 : 0.48, w: 12.09, h: 0.84 }
      const fit = computeTextFit(title, titleBox, 'slideTitle', { padXPt: 2, padYPt: 2 })
      shapes.push(ooxmlShape(idBase + 2, 'Title', titleBox, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        fontScale: fit.fontScale,
        paragraphs: [
          ooxmlRichParagraph(title, {
            sizePt: fit.fontPt,
            color: tk.inkPrimary,
            bold: true,
            lang: langAttr,
            font: theme.fonts.heading,
            lineHeight: fit.lineHeight,
          }),
        ],
      }))
    }
    shapes.push(ooxmlLine(nextIdFn(), 'Header rule', { x: 0.62, y: 1.60 }, { x: 12.71, y: 1.60 }, {
      color: tk.accentPrimary,
      widthPt: 1.5,
    }))
    shapes.push(ooxmlLine(nextIdFn(), 'Header secondary rule', { x: 0.62, y: 1.67 }, { x: 12.71, y: 1.67 }, {
      color: tk.accentSecondary,
      widthPt: 0.5,
    }))
    return shapes.join('')
  }

  // standard ('saas-bento')
  if (showKicker) {
    shapes.push(ooxmlShape(idBase + 1, 'Kicker', { x: 0.62, y: 0.42, w: 11.4, h: 0.28 }, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      paragraphs: [
        ooxmlRichParagraph(kicker.toUpperCase(), {
          sizePt: 11,
          color: tk.accentText,
          bold: true,
          lang: langAttr,
          font: theme.fonts.body,
          lineHeight: 1.1,
          spc: 140,
        }),
      ],
    }))
  }

  if (title !== '') {
    const titleBox = { x: 0.62, y: showKicker ? 0.72 : 0.52, w: 12.09, h: 0.86 }
    const fit = computeTextFit(title, titleBox, 'slideTitle', { padXPt: 2, padYPt: 2 })
    shapes.push(ooxmlShape(idBase + 2, 'Title', titleBox, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      fontScale: fit.fontScale,
      paragraphs: [
        ooxmlRichParagraph(title, {
          sizePt: fit.fontPt,
          color: tk.inkPrimary,
          bold: true,
          lang: langAttr,
          font: theme.fonts.heading,
          lineHeight: fit.lineHeight,
        }),
      ],
    }))
  }

  shapes.push(ooxmlLine(nextIdFn(), 'Header rule', { x: 0.62, y: 1.66 }, { x: 12.71, y: 1.66 }, {
    color: tk.hairline,
    widthPt: 0.75,
  }))

  return shapes.join('')
}

// ---------------------------------------------------------------------------
// 19 套零依赖核心原生版式（含 5 套专业图示）OOXML 编译器
// ---------------------------------------------------------------------------

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
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      paragraphs: [
        ooxmlRichParagraph(parsed.ok ? '✓' : '✗', {
          sizePt: 11.5,
          color: badgeFg,
          bold: true,
          lang: langAttr,
          align: 'ctr',
          font: theme.fonts.body,
          lineHeight: 1.0,
        }),
      ],
    }))
    return shapes.join('')
  }

  if (parsed.pct === 100) {
    shapes.push(ooxmlShape(nextIdFn(), 'Harvey 100', { x, y, w: sizeIn, h: sizeIn }, {
      preset: 'ellipse',
      fill: fillCol,
      stroke: fillCol,
      strokePt: 1.0,
    }))
    return shapes.join('')
  }

  // Base empty ring
  shapes.push(ooxmlShape(nextIdFn(), 'Harvey Ring', { x, y, w: sizeIn, h: sizeIn }, {
    preset: 'ellipse',
    fill: bgCol,
    stroke: parsed.pct === 0 ? ringCol : fillCol,
    strokePt: 1.25,
  }))

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

function renderHarveyMatrixPptx(slide, area, nextIdFn, chromeCfg, theme, langAttr) {
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

      shapes.push(ooxmlShape(nextIdFn(), 'Harvey Cell ' + rIdx + '-' + c, { x, y, w, h: rowH }, {
        preset: isHeader && c === 0 ? cellPreset : 'rect',
        adj: 0,
        fill: cellFill,
        stroke: isOurs ? tk.accentPrimary : tk.hairline,
        strokePt: isOurs ? 0.75 : 0.5,
      }))

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
      return {
        title: ext.cleanTitle || cell,
        weight: ext.num,
        unit: ext.unit,
        prefixSym: ext.prefixSym || '',
        sizeLabel: ext.label,
      }
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
      return {
        name,
        index: sIdx,
        weightedPct: Math.round(weightedShare * 100),
        isOurs: OURS_SERIES_RE.test(name),
      }
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
    return {
      name,
      index: sIdx,
      weightedPct: Math.round(weightedShare * 100),
      isOurs: OURS_SERIES_RE.test(name),
    }
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
    shapes.push(ooxmlShape(nextIdFn(), 'Mekko Col Header ' + (cIdx + 1), {
      x: isNarrowCol ? cx : cx + 0.02,
      y: area.y,
      w: isNarrowCol ? Math.max(0.28, cw) : Math.max(0.24, cw - 0.04),
      h: headerH,
    }, {
      txBox: true,
      anchor: 'b',
      marginsIn: { l: isNarrowCol ? 0 : 0.02, r: isNarrowCol ? 0 : 0.02, t: 0, b: 0.03 },
      paragraphs: [
        ooxmlRichParagraph(col.title, {
          sizePt: headFontPt,
          color: tk.inkPrimary,
          bold: true,
          lang: langAttr,
          align: 'ctr',
          font: theme.fonts.heading,
          lineHeight: 1.12,
          spaceAfterPt: 1,
        }),
        ooxmlRichParagraph(col.sizeLabel, {
          sizePt: isNarrowCol ? 7.5 : Math.max(8.5, headFontPt - 1),
          color: tk.accentText,
          bold: true,
          lang: langAttr,
          align: 'ctr',
          font: theme.fonts.body,
          lineHeight: 1.08,
        }),
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
            ooxmlRichParagraph(seg.seriesName, {
              sizePt: cw >= 1.6 ? 11 : 10,
              color: pal.ink,
              bold: true,
              lang: langAttr,
              align: 'ctr',
              font: theme.fonts.body,
              lineHeight: 1.1,
              spaceAfterPt: 1,
            }),
            ooxmlRichParagraph(pctText, {
              sizePt: cw >= 1.6 ? 12 : 10.5,
              color: pal.ink,
              bold: true,
              lang: langAttr,
              align: 'ctr',
              font: theme.fonts.heading,
              lineHeight: 1.05,
            }),
          ]
        : showPctOnly
          ? [
              ooxmlRichParagraph(pctText, {
                sizePt: 10,
                color: pal.ink,
                bold: true,
                lang: langAttr,
                align: 'ctr',
                font: theme.fonts.heading,
                lineHeight: 1.0,
              }),
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
  shapes.push(ooxmlLine(nextIdFn(), 'Mekko Width Axis', { x: plotX, y: axisY }, { x: plotX + plotW, y: axisY }, {
    color: tk.inkMuted,
    widthPt: 1.0,
  }))
  ;[0, 25, 50, 75, 100].forEach((tick) => {
    const tx = plotX + (tick / 100) * plotW
    shapes.push(ooxmlLine(nextIdFn(), 'Mekko Tick ' + tick, { x: tx, y: axisY }, { x: tx, y: axisY + 0.06 }, {
      color: tk.inkMuted,
      widthPt: 0.75,
    }))
    const lblW = 0.68
    const lblX = tick === 0 ? tx : tick === 100 ? tx - lblW : tx - lblW / 2
    const algn = tick === 0 ? 'l' : tick === 100 ? 'r' : 'ctr'
    shapes.push(ooxmlShape(nextIdFn(), 'Mekko Tick Label ' + tick, { x: lblX, y: axisY + 0.07, w: lblW, h: 0.24 }, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      paragraphs: [
        ooxmlRichParagraph(tick + '%', {
          sizePt: 9.5,
          color: tk.inkMuted,
          lang: langAttr,
          align: algn,
          font: theme.fonts.body,
          lineHeight: 1.0,
        }),
      ],
    }))
  })

  // 3. 右侧总市场规模 + 系列图例卡片
  const legX = plotX + plotW + gapLegend
  const legBox = { x: legX, y: gridY, w: legendW, h: gridH }
  shapes.push(renderSurfaceCardPptx('Mekko Legend Card', legBox, {
    fill: tk.surface1,
    focal: false,
  }, nextIdFn, chromeCfg, theme))

  shapes.push(ooxmlShape(nextIdFn(), 'Mekko Total Summary', { x: legX + 0.16, y: gridY + 0.14, w: legendW - 0.32, h: 0.78 }, {
    txBox: true,
    anchor: 't',
    marginsIn: { l: 0, r: 0, t: 0, b: 0 },
    paragraphs: [
      ooxmlRichParagraph(isEn ? 'TOTAL MARKET' : '总市场规模', {
        sizePt: 9.5,
        color: tk.inkMuted,
        bold: true,
        lang: langAttr,
        font: theme.fonts.body,
        spc: 90,
        spaceAfterPt: 2,
      }),
      ooxmlRichParagraph(model.totalLabel, {
        sizePt: 20,
        color: tk.accentText,
        bold: true,
        lang: langAttr,
        font: theme.fonts.heading,
        lineHeight: 1.1,
      }),
    ],
  }))
  shapes.push(ooxmlLine(nextIdFn(), 'Mekko Legend Rule', { x: legX + 0.16, y: gridY + 0.98 }, { x: legX + legendW - 0.16, y: gridY + 0.98 }, {
    color: tk.hairline,
    widthPt: 0.75,
  }))

  const itemStartY = gridY + 1.12
  const availLegH = Math.max(1.0, gridH - 1.24)
  const itemStepY = Math.min(0.46, availLegH / Math.max(1, model.seriesSummary.length))
  model.seriesSummary.forEach((s, idx) => {
    const iy = itemStartY + idx * itemStepY
    const pal = palette[idx] ?? { fill: tk.surface2 }
    shapes.push(ooxmlShape(nextIdFn(), 'Mekko Swatch ' + (idx + 1), { x: legX + 0.18, y: iy + 0.08, w: 0.18, h: 0.18 }, {
      preset: 'rect',
      fill: pal.fill,
      stroke: tk.hairline,
      strokePt: 0.5,
    }))
    shapes.push(ooxmlShape(nextIdFn(), 'Mekko Series Label ' + (idx + 1), { x: legX + 0.44, y: iy, w: legendW - 0.58, h: 0.34 }, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      paragraphs: [
        ooxmlRichParagraph(s.name + '  **' + s.weightedPct + '%**', {
          sizePt: 11,
          color: s.isOurs ? tk.accentText : tk.inkPrimary,
          bold: s.isOurs,
          lang: langAttr,
          font: theme.fonts.body,
          lineHeight: 1.15,
        }),
      ],
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
      rawEdges.push({
        source: src,
        target: dst,
        value: val,
        unit,
        valueLabel: valLabel,
        delta: it.delta || '',
        status: it.status,
      })
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
    shapes.push(ooxmlCustGeomShape(nextIdFn(), 'Sankey Ribbon ' + (idx + 1), { x: x0, y: ry, w: rw, h: rh }, pathXml, {
      pathW: W,
      pathH: H,
      fill: ribbonColor,
      fillAlpha: theme.dark ? 0.42 : 0.32,
    }))
  })

  // 2. 绘制守恒节点立柱 + 零碰撞语义数值标签
  model.nodes.forEach((n, idx) => {
    const barColor = sankeyNodeColor(n, theme)
    shapes.push(ooxmlShape(nextIdFn(), 'Sankey Node ' + (idx + 1), { x: n.x, y: n.y, w: n.w, h: n.h }, {
      preset: chromeCfg.cardRadiusPx > 0 ? 'roundRect' : 'rect',
      adj: roundRectAdj(n.w, n.h, Math.min(4, chromeCfg.cardRadiusPx)),
      fill: barColor,
    }))

    const valColor = n.tone === 'positive'
      ? tk.positive
      : n.tone === 'negative'
        ? tk.negative
        : tk.accentText
    const valLine = n.displayValue + (n.delta ? ' (' + n.delta + ')' : '')
    const isLeftRoot = n.layer === 0
    const isLeaf = n.outEdges.length === 0

    if (isLeftRoot) {
      const lblBox = {
        x: area.x,
        y: n.y + n.h / 2 - 0.32,
        w: Math.max(1.2, n.x - area.x - 0.12),
        h: 0.64,
      }
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
      const lblBox = {
        x: lx,
        y: n.y + n.h / 2 - 0.28,
        w: lw,
        h: 0.56,
      }
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
      const pillBox = {
        x: n.x + n.w / 2 - pillW / 2,
        y: Math.max(area.y, n.y - 0.40),
        w: pillW,
        h: 0.34,
      }
      shapes.push(ooxmlShape(nextIdFn(), 'Sankey Label ' + (idx + 1), pillBox, {
        preset: chromeCfg.cardRadiusPx > 0 ? 'roundRect' : 'rect',
        adj: roundRectAdj(pillBox.w, pillBox.h, Math.min(8, chromeCfg.cardRadiusPx)),
        fill: tk.surface2,
        stroke: barColor,
        strokePt: 0.75,
        anchor: 'ctr',
        marginsIn: { l: 0.06, r: 0.06, t: 0.02, b: 0.02 },
        paragraphs: [
          ooxmlRichParagraph(n.name + '  **' + valLine + '**', {
            sizePt: pillFontPt,
            color: tk.inkPrimary,
            bold: true,
            lang: langAttr,
            align: 'ctr',
            font: theme.fonts.heading,
            lineHeight: 1.05,
          }),
        ],
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
    supportItems = slide.columns.slice(0, 3).map((col, idx) => ({
      tag: isEn ? 'SUPPORT ' + (idx + 1) : '辅助 ' + (idx + 1),
      title: col,
    }))
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
      ooxmlRichParagraph(ln, {
        sizePt: 11.5,
        color: tk.accentText,
        bold: true,
        lang: langAttr,
        align: 'ctr',
        font: theme.fonts.heading,
        lineHeight: 1.16,
      }),
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
      paragraphs: [
        ooxmlRichParagraph(beamCopy, {
          sizePt: nSup >= 3 ? 11.5 : 12.5,
          color: tk.inkPrimary,
          secondaryColor: tk.inkSecondary,
          lang: langAttr,
          font: theme.fonts.body,
          lineHeight: 1.18,
        }),
      ],
    }))
    shapes.push(ooxmlShape(nextIdFn(), 'Porter Support Stripe ' + (sIdx + 1), { x: beamX, y: by, w: 0.06, h: beamH }, {
      preset: 'rect',
      fill: tk.accentSecondary,
    }))
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
        ? [ooxmlRichParagraph(stageTag, {
            sizePt: 9,
            color: inkHex,
            bold: true,
            lang: langAttr,
            align: 'ctr',
            font: theme.fonts.heading,
            lineHeight: 1.05,
            spaceAfterPt: 1,
          })]
        : []),
      ooxmlRichParagraph(titleStr, {
        sizePt: titlePt,
        color: inkHex,
        bold: true,
        lang: langAttr,
        align: 'ctr',
        font: theme.fonts.heading,
        lineHeight: 1.12,
      }),
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
    shapes.push(renderSurfaceCardPptx('Porter Detail Surface ' + (idx + 1), cardBox, {
      fill: isFirst ? tk.accentSoft : tk.surface1,
      focal: isFirst,
    }, nextIdFn, chromeCfg, theme))

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
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        fontScale: fit.fontScale,
        paragraphs: lines.map((line, lIdx) =>
          ooxmlRichParagraph(line, {
            sizePt: fit.fontPt,
            color: lIdx === 0 && metric ? tk.accentText : tk.inkSecondary,
            lang: langAttr,
            font: theme.fonts.body,
            lineHeight: 1.3,
            spaceAfterPt: 3,
          }),
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
      ooxmlRichParagraph(ln, {
        sizePt: lIdx === 0 ? 15.5 : 11.5,
        color: tk.inkOnAccent,
        bold: true,
        lang: langAttr,
        align: 'ctr',
        font: theme.fonts.heading,
        lineHeight: 1.2,
        spaceAfterPt: 2,
      }),
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
      paragraphs: [
        ooxmlRichParagraph(q.header + (q.title && q.title !== q.header ? '  ·  ' + q.title : ''), {
          sizePt: 12.5,
          color: relativeLuminance(toneColor) > 0.42 ? '#0F172A' : '#FFFFFF',
          bold: true,
          lang: langAttr,
          align: 'l',
          font: theme.fonts.heading,
          lineHeight: 1.1,
        }),
      ],
    }))

    // 象限内容框（上排顶对齐且左边缘与标题严格对齐；密集多条要点时内侧避让中央锚点）
    const lines = [
      ...(q.text ? [q.text] : []),
      ...(q.bullets ?? []),
    ]
    const needInnerClearance = row === 0 && lines.length >= 4
    const leftPad = needInnerClearance && col === 1 ? anchorHalfOverlap : 0.18
    const rightPad = needInnerClearance && col === 0 ? anchorHalfOverlap : 0.22
    const contentBox = {
      x: qx + leftPad,
      y: qy + headH + 0.08,
      w: Math.max(1.8, qW - leftPad - rightPad),
      h: Math.max(0.6, qH - headH - 0.14),
    }
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
      shapes.push(ooxmlShape(nextIdFn(), 'SWOT Body ' + q.key, contentBox, {
        txBox: true,
        anchor: row === 0 ? 't' : 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        fontScale: fit.fontScale,
        paragraphs: paras,
      }))
    }
  })

  // 中央十字交汇“破局核心”八角徽章战略锚点（宽阔内切文本框，4~6 字词组绝不半词折行）
  const midX = area.x + area.w / 2
  const midY = area.y + gridH / 2
  const anchorLines = String(model.anchorText).split('\n').filter(Boolean)
  const maxAnchorLen = Math.max(1, ...anchorLines.map((ln) => ln.length))
  shapes.push(ooxmlShape(nextIdFn(), 'SWOT Strategic Anchor', {
    x: midX - anchorW / 2,
    y: midY - anchorH / 2,
    w: anchorW,
    h: anchorH,
  }, {
    preset: 'octagon',
    adjs: { adj: 22000 },
    fill: tk.accentPrimary,
    stroke: tk.canvas,
    strokePt: 2.5,
    shadow: true,
    anchor: 'ctr',
    marginsIn: { l: 0.14, r: 0.14, t: 0.06, b: 0.06 },
    paragraphs: anchorLines.map((ln) =>
      ooxmlRichParagraph(ln, {
        sizePt: maxAnchorLen >= 7 ? 10.5 : 11.5,
        color: tk.inkOnAccent,
        bold: true,
        lang: langAttr,
        align: 'ctr',
        font: theme.fonts.heading,
        lineHeight: 1.15,
      }),
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
      paragraphs: [
        ooxmlRichParagraph('**' + st.key + '** · ' + st.action, {
          sizePt: 11,
          color: tk.inkPrimary,
          accentColor: tk.accentText,
          lang: langAttr,
          font: theme.fonts.body,
          lineHeight: 1.2,
        }),
      ],
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

export function renderCoreSlidePptx(slide, index, total, theme, langAttr, manifest = {}) {
  const tk = theme.tokens
  const chromeStyle = resolveChromeStyle(theme, slide, manifest.brand)
  const chromeCfg = getChromeConfig(chromeStyle, theme)
  const idBase = (index + 1) * 10
  let dynCounter = (index + 1) * 100 + 10
  const nextId = () => { dynCounter += 1; return dynCounter }

  const layout = slide.layout || 'bullets'
  const variant = slide.variant || ''
  const title = slide.title || ''
  const subtitle = slide.subtitle || ''
  const kicker = slide.kicker || ''
  const bullets = Array.isArray(slide.bullets) ? slide.bullets : []
  const hasTakeaway = typeof slide.takeaway === 'string' && slide.takeaway.trim() !== ''
  const bodyBottomY = hasTakeaway ? 6.08 : 6.72
  const bodyTopY = chromeCfg.bodyTopY
  const bodyH = bodyBottomY - bodyTopY
  const cardPreset = chromeCfg.cardRadiusPx > 0 ? 'roundRect' : 'rect'

  const shapes = []

  if (layout === 'cover') {
    const inverted = variant === 'inverted' || (!variant && tk.coverMode === 'inverted-accent')
    const coverFill = inverted ? tk.coverBg : tk.canvas
    const coverDark = relativeLuminance(coverFill) < 0.36
    const fg = inverted ? (coverDark ? '#F8FAFC' : '#0F172A') : tk.inkPrimary
    const subColor = inverted ? (coverDark ? '#E2E8F0' : '#334155') : tk.inkSecondary
    const accentRule = inverted ? (theme.id === 'exec-jilan' || theme.id === 'exec-palace' ? '#D4AF37' : tk.accentSecondary) : tk.accentPrimary
    const kickerColor = inverted ? accentRule : tk.accentText

    if (inverted) {
      shapes.push(ooxmlShape(nextId(), 'Cover backdrop', { x: 0, y: 0, w: CANVAS_IN.w, h: CANVAS_IN.h }, {
        preset: 'rect',
        fill: coverFill,
      }))
    } else if (variant === 'monolith') {
      shapes.push(ooxmlShape(nextId(), 'Cover monolith band', { x: 0, y: 0, w: 0.42, h: CANVAS_IN.h }, {
        preset: 'rect',
        fill: tk.accentPrimary,
      }))
    } else {
      // 精致顶栏结构线与右侧微弱几何装饰块
      shapes.push(ooxmlShape(nextId(), 'Cover top accent', { x: 0, y: 0, w: CANVAS_IN.w, h: 0.08 }, {
        preset: 'rect',
        fill: tk.accentPrimary,
      }))
      shapes.push(ooxmlShape(nextId(), 'Cover architectural panel', { x: 9.65, y: 0.08, w: 3.6833, h: 7.42 }, {
        preset: 'rect',
        fill: tk.surface1,
      }))
      shapes.push(ooxmlLine(nextId(), 'Cover vertical hairline', { x: 9.65, y: 0.08 }, { x: 9.65, y: 7.5 }, {
        color: tk.hairline,
        widthPt: 0.75,
      }))
    }

    // 精确对齐标题 + 副标题总高度的左侧结构竖线（彻底修复旧版红条悬空问题）
    const lockupTop = 1.95
    const lockupHeight = subtitle !== '' ? 3.15 : 2.05
    shapes.push(ooxmlShape(idBase + 1, 'Accent bar', { x: 0.88, y: lockupTop, w: 0.09, h: lockupHeight }, {
      preset: 'rect',
      fill: accentRule,
    }))

    if (kicker !== '') {
      shapes.push(ooxmlShape(idBase + 4, 'Kicker', { x: 1.22, y: 1.42, w: 8.1, h: 0.36 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(kicker.toUpperCase(), {
            sizePt: 12,
            color: kickerColor,
            bold: true,
            lang: langAttr,
            font: theme.fonts.body,
            spc: 180,
          }),
        ],
      }))
    }

    const titleBox = { x: 1.22, y: lockupTop, w: inverted ? 10.6 : 8.1, h: 1.95 }
    const titleFit = computeTextFit(title, titleBox, 'coverTitle', { padXPt: 2, padYPt: 4 })
    shapes.push(ooxmlShape(idBase + 2, 'Title', titleBox, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      fontScale: titleFit.fontScale,
      paragraphs: [
        ooxmlRichParagraph(title, {
          sizePt: titleFit.fontPt,
          color: fg,
          bold: true,
          lang: langAttr,
          font: theme.fonts.heading,
          lineHeight: titleFit.lineHeight,
        }),
      ],
    }))

    if (subtitle !== '') {
      const subBox = { x: 1.22, y: 4.05, w: inverted ? 9.8 : 7.9, h: 1.05 }
      const subFit = computeTextFit(subtitle, subBox, 'body', { maxPt: 20, minPt: 14, padXPt: 2, padYPt: 2 })
      shapes.push(ooxmlShape(idBase + 3, 'Subtitle', subBox, {
        txBox: true,
        anchor: 't',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        fontScale: subFit.fontScale,
        paragraphs: [
          ooxmlRichParagraph(subtitle, {
            sizePt: subFit.fontPt,
            color: subColor,
            lang: langAttr,
            font: theme.fonts.body,
            lineHeight: 1.42,
          }),
        ],
      }))
    }

    // 底部元数据线与页脚说明（绝不印 01 / 01 页码）
    shapes.push(ooxmlLine(nextId(), 'Cover footer rule', { x: 0.88, y: 6.48 }, { x: inverted ? 12.45 : 9.2, y: 6.48 }, {
      color: inverted ? hexToRgbaSafeHex(accentRule, coverFill, 0.45) : tk.hairline,
      widthPt: 0.75,
    }))
    const metaText = [slide.text, slide.source, manifest.brand?.footer].filter(Boolean).join('  ·  ')
    if (metaText) {
      shapes.push(ooxmlShape(nextId(), 'Cover meta', { x: 0.88, y: 6.62, w: 8.3, h: 0.36 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(metaText, {
            sizePt: 11,
            color: subColor,
            lang: langAttr,
            font: theme.fonts.body,
          }),
        ],
      }))
    }
    return shapes.join('')
  }

  if (layout === 'closing') {
    const inverted = variant === 'inverted' || (!variant && tk.coverMode === 'inverted-accent')
    const closeFill = inverted ? tk.coverBg : tk.canvas
    const closeDark = relativeLuminance(closeFill) < 0.36
    const fg = inverted ? (closeDark ? '#F8FAFC' : '#0F172A') : tk.inkPrimary
    const accent = inverted ? (theme.id === 'exec-jilan' || theme.id === 'exec-palace' ? '#D4AF37' : '#F8FAFC') : tk.accentText
    if (inverted) {
      shapes.push(ooxmlShape(nextId(), 'Closing backdrop', { x: 0, y: 0, w: CANVAS_IN.w, h: CANVAS_IN.h }, {
        preset: 'rect',
        fill: closeFill,
      }))
    } else {
      shapes.push(ooxmlShape(nextId(), 'Closing top bar', { x: 0, y: 0, w: CANVAS_IN.w, h: 0.08 }, {
        preset: 'rect',
        fill: tk.accentPrimary,
      }))
    }

    const items = resolveEffectiveItems(slide)
    const hasCards = (variant === 'cta-cards' || items.length >= 2) && (slide.items?.length || bullets.length >= 2)
    const titleY = hasCards ? 1.35 : 2.25
    shapes.push(ooxmlShape(idBase + 2, 'Title', { x: 1.0, y: titleY, w: 11.33, h: 1.45 }, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      paragraphs: [
        ooxmlRichParagraph(title || (langAttr === 'en-US' ? 'Thank You' : '谢谢'), {
          sizePt: hasCards ? 40 : 48,
          color: fg,
          bold: true,
          lang: langAttr,
          align: 'ctr',
          font: theme.fonts.heading,
          lineHeight: 1.15,
        }),
      ],
    }))

    shapes.push(ooxmlShape(nextId(), 'Closing divider', { x: 5.92, y: titleY + 1.56, w: 1.5, h: 0.05 }, {
      preset: 'rect',
      fill: inverted ? accent : tk.accentPrimary,
    }))

    if (subtitle !== '') {
      shapes.push(ooxmlShape(idBase + 3, 'Subtitle', { x: 1.5, y: titleY + 1.78, w: 10.33, h: 0.78 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(subtitle, {
            sizePt: 19,
            color: accent,
            bold: true,
            lang: langAttr,
            align: 'ctr',
            font: theme.fonts.body,
          }),
        ],
      }))
    }

    if (hasCards) {
      const cols = Math.min(3, items.length)
      const gap = 0.26
      const cardW = (10.8 - gap * (cols - 1)) / cols
      const startX = (CANVAS_IN.w - (cardW * cols + gap * (cols - 1))) / 2
      items.slice(0, cols).forEach((it, idx) => {
        const box = { x: startX + idx * (cardW + gap), y: 4.35, w: cardW, h: 1.75 }
        shapes.push(ooxmlShape(nextId(), 'CTA Card ' + (idx + 1), box, {
          preset: cardPreset,
          adj: roundRectAdj(box.w, box.h, theme.radiusPx),
          fill: inverted ? hexToRgbaSafeHex('#FFFFFF', closeFill, 0.1) : tk.surface1,
          stroke: inverted ? hexToRgbaSafeHex('#FFFFFF', closeFill, 0.22) : tk.hairline,
          strokePt: 0.75,
          anchor: 'ctr',
          marginsIn: { l: 0.18, r: 0.18, t: 0.12, b: 0.12 },
          paragraphs: [
            ...(it.title ? [ooxmlRichParagraph(it.title, { sizePt: 15, color: fg, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.heading, spaceAfterPt: 4 })] : []),
            ...(it.text ? [ooxmlRichParagraph(it.text, { sizePt: 13.5, color: inverted ? '#CBD5E1' : tk.inkSecondary, lang: langAttr, align: 'ctr', font: theme.fonts.body })] : []),
          ],
        }))
      })
    }
    return shapes.join('')
  }

  if (layout === 'section') {
    shapes.push(ooxmlShape(nextId(), 'Section side band', { x: 0, y: 0, w: 0.16, h: CANVAS_IN.h }, {
      preset: 'rect',
      fill: tk.accentPrimary,
    }))
    const sectionNum = /^\d+$/.test(kicker.trim()) ? kicker.trim().padStart(2, '0') : kicker
    if (sectionNum !== '' && sectionNum !== title) {
      shapes.push(ooxmlShape(idBase + 1, 'Kicker', { x: 1.05, y: 1.85, w: 10.5, h: 0.75 }, {
        txBox: true,
        anchor: 'b',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(sectionNum.toUpperCase(), {
            sizePt: /^\d+$/.test(sectionNum) ? 36 : 14,
            color: tk.accentText,
            bold: true,
            lang: langAttr,
            font: theme.fonts.heading,
            spc: 140,
          }),
        ],
      }))
    }
    shapes.push(ooxmlShape(nextId(), 'Accent bar', { x: 1.05, y: 2.74, w: 1.45, h: 0.07 }, {
      preset: 'rect',
      fill: tk.accentPrimary,
    }))
    const tBox = { x: 1.05, y: 3.0, w: 10.8, h: 1.55 }
    const tFit = computeTextFit(title, tBox, 'sectionTitle')
    shapes.push(ooxmlShape(idBase + 2, 'Title', tBox, {
      txBox: true,
      anchor: 't',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      fontScale: tFit.fontScale,
      paragraphs: [
        ooxmlRichParagraph(title, {
          sizePt: tFit.fontPt,
          color: tk.inkPrimary,
          bold: true,
          lang: langAttr,
          font: theme.fonts.heading,
          lineHeight: tFit.lineHeight,
        }),
      ],
    }))
    if (subtitle !== '') {
      shapes.push(ooxmlShape(idBase + 3, 'Subtitle', { x: 1.05, y: 4.68, w: 9.8, h: 0.9 }, {
        txBox: true,
        anchor: 't',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(subtitle, {
            sizePt: 18,
            color: tk.inkSecondary,
            lang: langAttr,
            font: theme.fonts.body,
          }),
        ],
      }))
    }
    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
    return shapes.join('')
  }

  if (layout === 'statement') {
    if (kicker !== '') {
      shapes.push(ooxmlShape(idBase + 1, 'Kicker', { x: 1.05, y: 1.35, w: 10.5, h: 0.34 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(kicker.toUpperCase(), {
            sizePt: 12,
            color: tk.accentText,
            bold: true,
            lang: langAttr,
            font: theme.fonts.body,
            spc: 160,
          }),
        ],
      }))
    }
    const stmtText = title || slide.text || ''
    const cardBox = { x: 0.88, y: 1.92, w: 11.57, h: subtitle ? 2.95 : 3.45 }
    shapes.push(ooxmlShape(nextId(), 'Statement surface', cardBox, {
      preset: cardPreset,
      adj: roundRectAdj(cardBox.w, cardBox.h, theme.radiusPx),
      fill: tk.surface1,
      stroke: tk.hairline,
      strokePt: 0.75,
    }))
    shapes.push(ooxmlShape(nextId(), 'Accent bar', { x: 0.88, y: 1.92, w: 0.10, h: cardBox.h }, {
      preset: 'rect',
      fill: tk.accentPrimary,
    }))
    const sBox = { x: 1.32, y: 2.12, w: 10.8, h: cardBox.h - 0.4 }
    const sFit = computeTextFit(stmtText, sBox, 'statement')
    shapes.push(ooxmlShape(idBase + 2, 'Statement', sBox, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      fontScale: sFit.fontScale,
      paragraphs: [
        ooxmlRichParagraph(stmtText, {
          sizePt: sFit.fontPt,
          color: tk.inkPrimary,
          secondaryColor: tk.inkSecondary,
          accentColor: tk.accentText,
          bold: true,
          lang: langAttr,
          font: theme.fonts.heading,
          lineHeight: sFit.lineHeight,
        }),
      ],
    }))
    if (subtitle !== '') {
      shapes.push(ooxmlShape(idBase + 3, 'Subtitle', { x: 1.32, y: 5.12, w: 10.5, h: 0.85 }, {
        txBox: true,
        anchor: 't',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(subtitle, {
            sizePt: 17,
            color: tk.inkSecondary,
            lang: langAttr,
            font: theme.fonts.body,
          }),
        ],
      }))
    }
    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
    return shapes.join('')
  }

  if (layout === 'quote') {
    const quoteText = title || slide.text || ''
    shapes.push(ooxmlShape(nextId(), 'Quote card', { x: 0.88, y: 1.25, w: 11.57, h: 4.85 }, {
      preset: cardPreset,
      adj: roundRectAdj(11.57, 4.85, theme.radiusPx),
      fill: tk.surface1,
      stroke: tk.hairline,
      strokePt: 0.75,
    }))
    shapes.push(ooxmlShape(idBase + 1, 'Quote mark', { x: 1.25, y: 1.38, w: 1.5, h: 1.15 }, {
      txBox: true,
      anchor: 't',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      paragraphs: [
        ooxmlRichParagraph('\u201C', {
          sizePt: 72,
          color: tk.accentPrimary,
          bold: true,
          lang: langAttr,
          font: theme.fonts.heading,
          lineHeight: 0.9,
        }),
      ],
    }))
    const qBox = { x: 1.38, y: 2.38, w: 10.5, h: 2.45 }
    const qFit = computeTextFit(quoteText, qBox, 'quote')
    shapes.push(ooxmlShape(idBase + 2, 'Quote', qBox, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      fontScale: qFit.fontScale,
      paragraphs: [
        ooxmlRichParagraph(quoteText, {
          sizePt: qFit.fontPt,
          color: tk.inkPrimary,
          bold: true,
          lang: langAttr,
          font: theme.fonts.heading,
          lineHeight: qFit.lineHeight,
        }),
      ],
    }))
    if (subtitle !== '') {
      shapes.push(ooxmlLine(nextId(), 'Quote rule', { x: 1.38, y: 5.08 }, { x: 3.2, y: 5.08 }, {
        color: tk.accentPrimary,
        widthPt: 1.25,
      }))
      shapes.push(ooxmlShape(idBase + 3, 'Attribution', { x: 1.38, y: 5.22, w: 9.8, h: 0.55 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph('\u2014\u2014 ' + subtitle, {
            sizePt: 15,
            color: tk.inkMuted,
            bold: true,
            lang: langAttr,
            font: theme.fonts.body,
          }),
        ],
      }))
    }
    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
    return shapes.join('')
  }

  // 所有常规内容版式共享 6 套母版骨架页眉
  shapes.push(renderStandardHeaderPptx(slide, idBase, nextId, theme, langAttr, chromeCfg))

  if (layout === 'harvey') {
    shapes.push(renderHarveyMatrixPptx(slide, { x: 0.62, y: bodyTopY + 0.06, w: 12.09, h: bodyH - 0.14 }, nextId, chromeCfg, theme, langAttr))
    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
    return shapes.join('')
  }

  if (layout === 'table') {
    const rows = Array.isArray(slide.rows) ? slide.rows : [['']]
    const tStyle = slide.tableStyle || slide.visual?.tableStyle
    if (tStyle === 'harvey') {
      shapes.push(renderHarveyMatrixPptx(slide, { x: 0.62, y: bodyTopY + 0.06, w: 12.09, h: bodyH - 0.14 }, nextId, chromeCfg, theme, langAttr))
    } else {
      shapes.push(ooxmlTable(idBase + 3, 'Table', { x: 0.62, y: bodyTopY + 0.08, w: 12.09, h: bodyH - 0.16 }, rows, theme, langAttr, tStyle))
    }
    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
    return shapes.join('')
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
      paragraphs: [
        ooxmlRichParagraph(variant === 'swimlane' ? (langAttr === 'en-US' ? 'WORKSTREAM / TASK' : '泳道 / 任务项') : (langAttr === 'en-US' ? 'INITIATIVE / MILESTONE' : '任务里程碑'), {
          sizePt: 11,
          color: tk.inkMuted,
          bold: true,
          lang: langAttr,
          font: theme.fonts.body,
        }),
      ],
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
        paragraphs: [
          ooxmlRichParagraph(colLabel, {
            sizePt: 12,
            color: tk.inkPrimary,
            bold: true,
            lang: langAttr,
            align: 'ctr',
            font: theme.fonts.heading,
          }),
        ],
      }))
    })

    // Vertical grid lines
    const gridBottomY = topY + totalH
    for (let c = 0; c <= colCount; c += 1) {
      const lx = gridX + c * colW
      shapes.push(ooxmlLine(nextId(), 'Gantt Grid ' + c, { x: lx, y: topY + headH }, { x: lx, y: gridBottomY }, {
        color: tk.hairline,
        widthPt: 0.5,
        dash: c === 0 || c === colCount ? '' : 'dot',
      }))
    }

    const barPalette = [tk.accentPrimary, tk.accentSecondary, tk.positive, tk.accentPrimary]
    items.forEach((it, idx) => {
      const ry = topY + headH + 0.06 + idx * (rowH + rowGap)
      const st = statusPalette(it.status, tk)
      const barFill = it.status ? st.bar : barPalette[idx % barPalette.length]

      // Row backdrop
      shapes.push(ooxmlShape(nextId(), 'Gantt Track ' + (idx + 1), { x: gridX, y: ry, w: gridW, h: rowH }, {
        preset: 'rect',
        fill: idx % 2 === 0 ? tk.surface1 : tk.canvas,
        stroke: tk.hairline,
        strokePt: 0.25,
      }))

      // Left task label card (optional swimlane tag + title)
      shapes.push(ooxmlShape(nextId(), 'Gantt Task BG ' + (idx + 1), { x: 0.62, y: ry, w: labelW, h: rowH }, {
        preset: cardPreset,
        adj: roundRectAdj(labelW, rowH, Math.min(6, chromeCfg.cardRadiusPx)),
        fill: tk.surface1,
        stroke: chromeCfg.cardBorderless ? '' : tk.hairline,
        strokePt: 0.5,
      }))
      if (it.tag) {
        const tagW = computeBadgePillWidth(it.tag, 9.5, 1.18, 0.52)
        shapes.push(ooxmlShape(nextId(), 'Gantt Tag ' + (idx + 1), { x: 0.72, y: ry + (rowH - 0.28) / 2, w: tagW, h: 0.28 }, {
          preset: cardPreset,
          adj: roundRectAdj(tagW, 0.28, Math.min(6, chromeCfg.cardRadiusPx)),
          fill: tk.accentSoft,
          anchor: 'ctr',
          marginsIn: { l: 0.03, r: 0.03, t: 0.01, b: 0.01 },
          paragraphs: [
            ooxmlRichParagraph(it.tag, {
              sizePt: 9.5,
              color: tk.accentText,
              bold: true,
              lang: langAttr,
              align: 'ctr',
              font: theme.fonts.body,
            }),
          ],
        }))
        shapes.push(ooxmlShape(nextId(), 'Gantt ' + (idx + 1), { x: 0.72 + tagW + 0.10, y: ry + 0.02, w: labelW - tagW - 0.28, h: rowH - 0.04 }, {
          txBox: true,
          anchor: 'ctr',
          marginsIn: { l: 0, r: 0, t: 0, b: 0 },
          paragraphs: [
            ooxmlRichParagraph(it.title || it.text || '', {
              sizePt: 12.5,
              color: tk.inkPrimary,
              bold: true,
              lang: langAttr,
              font: theme.fonts.body,
              lineHeight: 1.15,
            }),
          ],
        }))
      } else {
        shapes.push(ooxmlShape(nextId(), 'Gantt ' + (idx + 1), { x: 0.76, y: ry + 0.02, w: labelW - 0.24, h: rowH - 0.04 }, {
          txBox: true,
          anchor: 'ctr',
          marginsIn: { l: 0, r: 0, t: 0, b: 0 },
          paragraphs: [
            ooxmlRichParagraph(it.title || it.text || '', {
              sizePt: 13,
              color: tk.inkPrimary,
              bold: true,
              lang: langAttr,
              font: theme.fonts.body,
              lineHeight: 1.15,
            }),
          ],
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
        shapes.push(ooxmlShape(nextId(), 'Gantt Milestone ' + (idx + 1), {
          x: mCenter - mSize / 2,
          y: ry + (rowH - mSize) / 2,
          w: mSize,
          h: mSize,
        }, {
          preset: 'diamond',
          fill: barFill,
          stroke: tk.canvas,
          strokePt: 1.0,
        }))
        const mLabel = it.value || it.delta || it.text || ''
        if (mLabel) {
          const onRight = startSlot < colCount - 1.2
          const lblBox = onRight
            ? { x: mCenter + mSize / 2 + 0.10, y: ry + 0.04, w: Math.max(1.2, gridX + gridW - (mCenter + mSize / 2 + 0.14)), h: rowH - 0.08 }
            : { x: Math.max(gridX + 0.08, mCenter - mSize / 2 - 2.1), y: ry + 0.04, w: 2.0, h: rowH - 0.08 }
          shapes.push(ooxmlShape(nextId(), 'Gantt Milestone Label ' + (idx + 1), lblBox, {
            txBox: true,
            anchor: 'ctr',
            marginsIn: { l: 0, r: 0, t: 0, b: 0 },
            paragraphs: [
              ooxmlRichParagraph(mLabel, {
                sizePt: 11,
                color: tk.accentText,
                bold: true,
                lang: langAttr,
                align: onRight ? 'l' : 'r',
                font: theme.fonts.body,
              }),
            ],
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
          shapes.push(ooxmlShape(nextId(), 'Gantt Milestone ' + (idx + 1), {
            x: barX + barW - endMSize / 2,
            y: ry + (rowH - endMSize) / 2,
            w: endMSize,
            h: endMSize,
          }, {
            preset: 'diamond',
            fill: barFill,
            stroke: tk.canvas,
            strokePt: 1.5,
          }))
        }
      }
    })

    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
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
      shapes.push(renderSurfaceCardPptx('Architecture Tier ' + (idx + 1), { x: 0.62, y: ty, w: tierAreaW, h: tierH }, {
        fill: isTopTier ? tk.surface2 : tk.surface1,
        focal: isTopTier,
      }, nextId, chromeCfg, theme))

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
          shapes.push(ooxmlShape(nextId(), 'Arch Arrow ' + (idx + 1) + '-' + (aIdx + 1), { x: ax - 0.09, y: ay, w: 0.18, h: ah }, {
            preset: arrowPreset,
            fill: tk.accentPrimary,
          }))
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
        shapes.push(renderSurfaceCardPptx('Arch Sidecar ' + (sIdx + 1), { x: sx, y: sy, w: sidecarW, h: scH }, {
          fill: tk.accentSoft,
          focal: true,
        }, nextId, chromeCfg, theme))
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
        shapes.push(ooxmlShape(nextId(), 'Architecture Sidecar Text ' + (sIdx + 1), scBox, {
          txBox: true,
          anchor: 'ctr',
          marginsIn: { l: 0, r: 0, t: 0, b: 0 },
          fontScale: scFit.fontScale,
          paragraphs: scParas,
        }))
      })
    }

    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
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
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(ringText, {
            sizePt: isInner ? 12.5 : 12,
            color: isInner ? tk.inkOnAccent : tk.accentText,
            bold: true,
            lang: langAttr,
            align: 'ctr',
            font: theme.fonts.heading,
          }),
        ],
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
      shapes.push(ooxmlLine(nextId(), 'TAM Connector ' + (idx + 1), { x: lineStartX, y: lineY }, { x: cardX, y: lineY }, {
        color: isInner ? tk.accentPrimary : tk.hairline,
        widthPt: 1.0,
        dash: 'dot',
      }))

      shapes.push(renderSurfaceCardPptx('TAM Card ' + (idx + 1), { x: cardX, y: cy, w: cardW, h: cardH }, {
        fill: isInner ? tk.accentSoft : tk.surface1,
        focal: isInner,
      }, nextId, chromeCfg, theme))

      const tagW = computeBadgePillWidth(it.tag, 10.5, 1.85, 0.72)
      shapes.push(ooxmlShape(nextId(), 'TAM Tag ' + (idx + 1), { x: cardX + 0.22, y: cy + 0.22, w: tagW, h: 0.32 }, {
        preset: cardPreset,
        adj: roundRectAdj(tagW, 0.32, Math.min(6, chromeCfg.cardRadiusPx)),
        fill: isInner ? tk.accentPrimary : tk.surface2,
        anchor: 'ctr',
        marginsIn: { l: 0.04, r: 0.04, t: 0.01, b: 0.01 },
        paragraphs: [
          ooxmlRichParagraph(it.tag, {
            sizePt: 10.5,
            color: isInner ? tk.inkOnAccent : tk.accentText,
            bold: true,
            lang: langAttr,
            align: 'ctr',
            font: theme.fonts.heading,
          }),
        ],
      }))

      const metaColW = Math.max(1.85, tagW)
      if (it.value) {
        shapes.push(ooxmlShape(nextId(), 'TAM Value ' + (idx + 1), { x: cardX + 0.22, y: cy + 0.62, w: metaColW, h: cardH - 0.76 }, {
          txBox: true,
          anchor: 'ctr',
          marginsIn: { l: 0, r: 0, t: 0, b: 0 },
          paragraphs: [
            ooxmlRichParagraph(it.value + (it.unit ? ' ' + it.unit : ''), {
              sizePt: 20,
              color: tk.accentText,
              bold: true,
              lang: langAttr,
              font: theme.fonts.heading,
            }),
          ],
        }))
      }

      const cardBodyText = [it.text, ...(it.bullets ?? [])].filter(Boolean).join('；')
      const textLeft = it.value ? cardX + 0.22 + metaColW + 0.16 : cardX + 0.22 + tagW + 0.18
      const textBox = { x: textLeft, y: cy + 0.16, w: cardX + cardW - textLeft - 0.18, h: cardH - 0.32 }
      const fit = computeTextFit([it.title || '', cardBodyText], textBox, 'cardBody', { maxPt: 14.5, minPt: 12.5 })
      shapes.push(ooxmlShape(nextId(), 'TAM ' + (idx + 1), textBox, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        fontScale: fit.fontScale,
        paragraphs: [
          ...(it.title ? [ooxmlRichParagraph(it.title, { sizePt: Math.min(16, fit.fontPt + 1.5), color: tk.inkPrimary, bold: true, lang: langAttr, font: theme.fonts.heading, spaceAfterPt: cardBodyText ? 4 : 0 })] : []),
          ...(cardBodyText ? [ooxmlRichParagraph(cardBodyText, { sizePt: fit.fontPt, color: tk.inkSecondary, lang: langAttr, font: theme.fonts.body, lineHeight: 1.32 })] : []),
        ],
      }))
    })

    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
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
        shapes.push(renderSurfaceCardPptx('Team Card ' + (idx + 1), { x: cx, y: cardY, w: cardW, h: cardH }, {
          fill: tk.surface1,
          focal: idx === 0,
        }, nextId, chromeCfg, theme))

        const avatarD = 0.78
        const avatarX = cx + (cardW - avatarD) / 2
        const avatarY = cardY + 0.26
        shapes.push(ooxmlShape(nextId(), 'Team Avatar ' + (idx + 1), { x: avatarX, y: avatarY, w: avatarD, h: avatarD }, {
          preset: 'ellipse',
          fill: idx === 0 ? tk.accentPrimary : tk.surface2,
          stroke: tk.accentPrimary,
          strokePt: 1.25,
          anchor: 'ctr',
          marginsIn: { l: 0, r: 0, t: 0, b: 0 },
          paragraphs: [
            ooxmlRichParagraph(monogramLetters(it.title || it.tag || 'T'), {
              sizePt: 18,
              color: idx === 0 ? tk.inkOnAccent : tk.accentText,
              bold: true,
              lang: langAttr,
              align: 'ctr',
              font: theme.fonts.heading,
            }),
          ],
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
            paragraphs: [
              ooxmlRichParagraph(roleText, { sizePt: 10.5, color: tk.accentText, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.body }),
            ],
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
        shapes.push(ooxmlShape(nextId(), 'Team ' + (idx + 1), innerBox, {
          txBox: true,
          anchor: 't',
          marginsIn: { l: 0, r: 0, t: 0, b: 0 },
          fontScale: fit.fontScale,
          paragraphs: paras,
        }))
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
      shapes.push(renderSurfaceCardPptx('Org Root', { x: rootX, y: rootY, w: rootW, h: rootH }, {
        fill: tk.accentSoft,
        focal: true,
      }, nextId, chromeCfg, theme))
      shapes.push(ooxmlShape(nextId(), 'Org 0', { x: rootX + 0.18, y: rootY + 0.10, w: rootW - 0.36, h: rootH - 0.20 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
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
      shapes.push(ooxmlLine(nextId(), 'Org Trunk', { x: rootCx, y: rootY + rootH }, { x: rootCx, y: busY }, {
        color: tk.accentPrimary,
        widthPt: 1.5,
      }))

      const childCxs = children.map((_, idx) => 0.62 + idx * (childW + gap) + childW / 2)
      if (childCxs.length >= 2) {
        shapes.push(ooxmlLine(nextId(), 'Org Bus', { x: childCxs[0], y: busY }, { x: childCxs[childCxs.length - 1], y: busY }, {
          color: tk.accentPrimary,
          widthPt: 1.5,
        }))
      }

      children.forEach((ch, idx) => {
        const cx = 0.62 + idx * (childW + gap)
        const midX = childCxs[idx]
        shapes.push(ooxmlLine(nextId(), 'Org Branch ' + (idx + 1), { x: midX, y: busY }, { x: midX, y: childTopY }, {
          color: tk.accentPrimary,
          widthPt: 1.25,
        }))
        shapes.push(renderSurfaceCardPptx('Org Child ' + (idx + 1), { x: cx, y: childTopY, w: childW, h: childH }, {
          fill: tk.surface1,
          focal: false,
        }, nextId, chromeCfg, theme))

        const roleLabel = ch.role || ch.tag || ''
        if (roleLabel) {
          const rW = computeBadgePillWidth(roleLabel, 10, childW - 0.28, 0.54)
          shapes.push(ooxmlShape(nextId(), 'Org Tag ' + (idx + 1), { x: cx + 0.16, y: childTopY + 0.16, w: rW, h: 0.28 }, {
            preset: cardPreset,
            adj: roundRectAdj(rW, 0.28, Math.min(6, chromeCfg.cardRadiusPx)),
            fill: tk.accentSoft,
            anchor: 'ctr',
            marginsIn: { l: 0.03, r: 0.03, t: 0.01, b: 0.01 },
            paragraphs: [
              ooxmlRichParagraph(roleLabel, { sizePt: 10, color: tk.accentText, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.body }),
            ],
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
        shapes.push(ooxmlShape(nextId(), 'Org ' + (idx + 1), innerBox, {
          txBox: true,
          anchor: 't',
          marginsIn: { l: 0, r: 0, t: 0, b: 0 },
          fontScale: fit.fontScale,
          paragraphs: paras,
        }))
      })
    }
    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
    return shapes.join('')
  }

  if (layout === 'agenda') {
    const items = resolveEffectiveItems(slide)
    const n = Math.max(1, items.length)
    const twoCol = n > 4
    const cols = twoCol ? 2 : 1
    const rowsPerCol = Math.ceil(n / cols)
    const gapX = 0.34
    const gapY = 0.18
    const colW = (12.09 - gapX * (cols - 1)) / cols
    const rowH = Math.min(0.95, (bodyH - gapY * (rowsPerCol - 1)) / rowsPerCol)
    const startY = bodyTopY + Math.max(0, (bodyH - (rowH * rowsPerCol + gapY * (rowsPerCol - 1))) / 2)

    items.forEach((it, idx) => {
      const col = twoCol ? Math.floor(idx / rowsPerCol) : 0
      const row = twoCol ? idx % rowsPerCol : idx
      const x = 0.62 + col * (colW + gapX)
      const y = startY + row * (rowH + gapY)
      const isActive = slide.activeIndex === idx + 1 || it.status === 'accent'
      const badgeText = it.tag || String(idx + 1).padStart(2, '0')
      const badgeW = chromeCfg.useDisplayNumeral
        ? 0.74
        : computeBadgePillWidth(badgeText, 13.5, Math.min(2.4, colW * 0.38), 0.58)

      shapes.push(renderSurfaceCardPptx('Agenda Card ' + (idx + 1), { x, y, w: colW, h: rowH }, {
        fill: isActive ? tk.accentSoft : tk.surface1,
        focal: isActive,
      }, nextId, chromeCfg, theme))
      if (chromeCfg.useDisplayNumeral) {
        shapes.push(ooxmlShape(nextId(), 'Agenda Badge ' + (idx + 1), { x: x + 0.18, y: y + (rowH - 0.54) / 2, w: badgeW, h: 0.54 }, {
          txBox: true,
          anchor: 'ctr',
          marginsIn: { l: 0, r: 0, t: 0, b: 0 },
          paragraphs: [
            ooxmlRichParagraph(badgeText, {
              sizePt: 22,
              color: tk.accentText,
              bold: true,
              lang: langAttr,
              font: theme.fonts.heading,
            }),
          ],
        }))
      } else {
        shapes.push(ooxmlShape(nextId(), 'Agenda Badge ' + (idx + 1), { x: x + 0.18, y: y + (rowH - 0.44) / 2, w: badgeW, h: 0.44 }, {
          preset: cardPreset,
          adj: roundRectAdj(badgeW, 0.44, Math.min(8, chromeCfg.cardRadiusPx)),
          fill: isActive ? tk.accentPrimary : tk.surface2,
          anchor: 'ctr',
          marginsIn: { l: 0.04, r: 0.04, t: 0.02, b: 0.02 },
          paragraphs: [
            ooxmlRichParagraph(badgeText, {
              sizePt: 13.5,
              color: isActive ? tk.inkOnAccent : tk.accentText,
              bold: true,
              lang: langAttr,
              align: 'ctr',
              font: theme.fonts.heading,
            }),
          ],
        }))
      }
      const textLeftOffset = 0.18 + badgeW + 0.18
      const textBox = { x: x + textLeftOffset, y: y + 0.08, w: Math.max(1.2, colW - textLeftOffset - 0.18), h: rowH - 0.16 }
      shapes.push(ooxmlShape(nextId(), 'Card ' + (idx + 1), textBox, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(it.title || it.text || '', {
            sizePt: 16,
            color: tk.inkPrimary,
            bold: true,
            lang: langAttr,
            font: theme.fonts.heading,
            spaceAfterPt: it.text && it.title ? 2 : 0,
          }),
          ...(it.text && it.title ? [ooxmlRichParagraph(it.text, { sizePt: 13.5, color: tk.inkSecondary, lang: langAttr, font: theme.fonts.body })] : []),
        ],
      }))
    })
    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
    return shapes.join('')
  }

  if (layout === 'kpi') {
    const items = resolveEffectiveItems(slide).slice(0, 4)
    const n = Math.max(1, items.length)
    const gap = 0.28
    const cardW = (12.09 - gap * (n - 1)) / n
    const cardH = Math.min(3.55, bodyH - 0.3)
    const cardY = bodyTopY + (bodyH - cardH) / 2

    items.forEach((it, idx) => {
      const x = 0.62 + idx * (cardW + gap)
      const st = statusPalette(it.status, tk)
      const valText = (it.value || it.title || '—') + (it.unit ? ' ' + it.unit : '')
      const labelText = it.value ? (it.title || '') : ''

      shapes.push(renderSurfaceCardPptx('KPI Surface ' + (idx + 1), { x, y: cardY, w: cardW, h: cardH }, {
        fill: tk.surface1,
        focal: idx === 0,
      }, nextId, chromeCfg, theme))

      if (labelText) {
        shapes.push(ooxmlShape(nextId(), 'KPI Label ' + (idx + 1), { x: x + 0.24, y: cardY + 0.24, w: cardW - 0.48, h: 0.38 }, {
          txBox: true,
          anchor: 'ctr',
          marginsIn: { l: 0, r: 0, t: 0, b: 0 },
          paragraphs: [
            ooxmlRichParagraph(labelText, {
              sizePt: 13.5,
              color: tk.inkMuted,
              bold: true,
              lang: langAttr,
              font: theme.fonts.body,
            }),
          ],
        }))
      }

      const vBox = { x: x + 0.24, y: cardY + 0.72, w: cardW - 0.48, h: 1.15 }
      const vFit = computeTextFit(valText, vBox, 'kpiValue', { maxPt: n >= 4 ? 38 : 46, minPt: 24, padXPt: 2, padYPt: 2 })
      shapes.push(ooxmlShape(nextId(), 'KPI Value ' + (idx + 1), vBox, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        fontScale: vFit.fontScale,
        paragraphs: [
          ooxmlRichParagraph(valText, {
            sizePt: vFit.fontPt,
            color: idx === 0 ? tk.accentText : tk.inkPrimary,
            bold: true,
            lang: langAttr,
            font: theme.fonts.heading,
            lineHeight: 1.05,
          }),
        ],
      }))

      if (it.delta) {
        const pillW = computeBadgePillWidth(it.delta, 12, cardW - 0.48, 1.15)
        shapes.push(ooxmlShape(nextId(), 'KPI Delta ' + (idx + 1), { x: x + 0.24, y: cardY + 1.98, w: pillW, h: 0.36 }, {
          preset: 'roundRect',
          adj: 50000,
          fill: st.bg,
          stroke: chromeCfg.cardBorderless ? '' : tk.hairline,
          strokePt: 0.5,
          anchor: 'ctr',
          marginsIn: { l: 0.05, r: 0.05, t: 0.02, b: 0.02 },
          paragraphs: [
            ooxmlRichParagraph(it.delta, {
              sizePt: 12,
              color: st.fg,
              bold: true,
              lang: langAttr,
              align: 'ctr',
              font: theme.fonts.body,
            }),
          ],
        }))
      }

      if (it.text) {
        const descY = it.delta ? cardY + 2.46 : cardY + 2.02
        const descBox = { x: x + 0.24, y: descY, w: cardW - 0.48, h: Math.max(0.5, cardY + cardH - descY - 0.18) }
        const dFit = computeTextFit(it.text, descBox, 'cardBody', { maxPt: 14.5, minPt: 13.5, padXPt: 2, padYPt: 2 })
        shapes.push(ooxmlShape(nextId(), 'Card ' + (idx + 1), descBox, {
          txBox: true,
          anchor: 't',
          marginsIn: { l: 0, r: 0, t: 0, b: 0 },
          fontScale: dFit.fontScale,
          paragraphs: [
            ooxmlRichParagraph(it.text, {
              sizePt: dFit.fontPt,
              color: tk.inkSecondary,
              lang: langAttr,
              font: theme.fonts.body,
              lineHeight: 1.38,
            }),
          ],
        }))
      }
    })
    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
    return shapes.join('')
  }

  if (layout === 'cards') {
    const items = resolveEffectiveItems(slide)
    const n = Math.max(1, items.length)
    const gap = 0.24
    let topOffset = bodyTopY
    let availH = bodyH

    // exec-summary 变体：顶部通栏核心论断横幅 + 下方支柱卡
    if (variant === 'exec-summary' && (subtitle || slide.text)) {
      const thesisText = slide.text || subtitle
      const bannerBox = { x: 0.62, y: bodyTopY, w: 12.09, h: 0.96 }
      shapes.push(ooxmlShape(nextId(), 'Exec thesis banner', bannerBox, {
        preset: cardPreset,
        adj: roundRectAdj(bannerBox.w, bannerBox.h, chromeCfg.cardRadiusPx),
        fill: tk.accentSoft,
        stroke: chromeCfg.cardBorderless ? '' : tk.accentPrimary,
        strokePt: 0.75,
        anchor: 'ctr',
        marginsIn: { l: 0.22, r: 0.22, t: 0.08, b: 0.08 },
        paragraphs: [
          ooxmlRichParagraph(thesisText, {
            sizePt: 15.5,
            color: tk.inkPrimary,
            bold: true,
            lang: langAttr,
            font: theme.fonts.body,
            lineHeight: 1.35,
          }),
        ],
      }))
      topOffset = bodyTopY + 1.18
      availH = bodyBottomY - topOffset
    }

    // 计算每张卡片的几何坐标（支持 bento 非对称网格与 pillars 等分网格）
    const cardBoxes = computeCardGridBoxes(n, variant, { x: 0.62, y: topOffset, w: 12.09, h: availH }, gap)
    items.slice(0, cardBoxes.length).forEach((it, idx) => {
      const box = cardBoxes[idx]
      const isHero = variant === 'bento' && idx === 0
      shapes.push(renderSurfaceCardPptx('Card Surface ' + (idx + 1), box, {
        fill: isHero ? tk.surface2 : tk.surface1,
        focal: isHero || idx === 0,
      }, nextId, chromeCfg, theme))

      const badge = it.tag || String(idx + 1).padStart(2, '0')
      if (chromeCfg.useDisplayNumeral) {
        shapes.push(ooxmlShape(nextId(), 'Card Badge ' + (idx + 1), { x: box.x + 0.22, y: box.y + 0.16, w: Math.min(2.8, box.w - 0.44), h: 0.44 }, {
          txBox: true,
          anchor: 'ctr',
          marginsIn: { l: 0, r: 0, t: 0, b: 0 },
          paragraphs: [
            ooxmlRichParagraph(badge, {
              sizePt: /^\d+$/.test(badge) ? 24 : 12.5,
              color: tk.accentText,
              bold: true,
              lang: langAttr,
              font: theme.fonts.heading,
              spc: /^\d+$/.test(badge) ? 0 : 120,
            }),
          ],
        }))
      } else {
        const badgeW = computeBadgePillWidth(badge, 11, box.w - 0.44, 0.54)
        shapes.push(ooxmlShape(nextId(), 'Card Badge ' + (idx + 1), { x: box.x + 0.22, y: box.y + 0.20, w: badgeW, h: 0.30 }, {
          preset: cardPreset,
          adj: roundRectAdj(badgeW, 0.30, Math.min(6, chromeCfg.cardRadiusPx)),
          fill: isHero ? tk.accentPrimary : tk.accentSoft,
          anchor: 'ctr',
          marginsIn: { l: 0.04, r: 0.04, t: 0.01, b: 0.01 },
          paragraphs: [
            ooxmlRichParagraph(badge, {
              sizePt: 11,
              color: isHero ? tk.inkOnAccent : tk.accentText,
              bold: true,
              lang: langAttr,
              align: 'ctr',
              font: theme.fonts.body,
            }),
          ],
        }))
      }

      const innerTop = box.y + (chromeCfg.useDisplayNumeral ? 0.66 : 0.58)
      const innerBox = { x: box.x + 0.22, y: innerTop, w: box.w - 0.44, h: Math.max(0.5, box.y + box.h - innerTop - 0.16) }
      const bodyLines = [
        ...(it.text ? [it.text] : []),
        ...(it.bullets ?? []),
      ]
      const fit = computeTextFit([it.title || '', ...bodyLines], innerBox, 'cardBody', { maxPt: 15.5, minPt: 13.5, padXPt: 2, padYPt: 2 })
      const paras = []
      if (it.title) {
        paras.push(ooxmlRichParagraph(it.title, {
          sizePt: Math.min(18, fit.fontPt + 2),
          color: tk.inkPrimary,
          bold: true,
          lang: langAttr,
          font: theme.fonts.heading,
          lineHeight: 1.25,
          spaceAfterPt: bodyLines.length ? 6 : 0,
        }))
      }
      if (it.value) {
        paras.push(ooxmlRichParagraph(it.value + (it.unit ? ' ' + it.unit : ''), {
          sizePt: 24,
          color: tk.accentText,
          bold: true,
          lang: langAttr,
          font: theme.fonts.heading,
          spaceAfterPt: 4,
        }))
      }
      if (it.text) {
        paras.push(ooxmlRichParagraph(it.text, {
          sizePt: fit.fontPt,
          color: tk.inkSecondary,
          accentColor: tk.accentText,
          lang: langAttr,
          font: theme.fonts.body,
          lineHeight: 1.42,
          spaceAfterPt: it.bullets?.length ? 5 : 0,
        }))
      }
      for (const b of it.bullets ?? []) {
        paras.push(ooxmlRichParagraph(b, {
          sizePt: fit.fontPt,
          color: tk.inkSecondary,
          accentColor: tk.accentText,
          bullet: true,
          bulletColor: tk.accentPrimary,
          lang: langAttr,
          font: theme.fonts.body,
          lineHeight: 1.38,
          spaceAfterPt: 4,
          autoLeadBold: true,
        }))
      }
      shapes.push(ooxmlShape(nextId(), 'Card ' + (idx + 1), innerBox, {
        txBox: true,
        anchor: 't',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        fontScale: fit.fontScale,
        paragraphs: paras,
      }))
    })
    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
    return shapes.join('')
  }

  if (layout === 'comparison') {
    const items = resolveEffectiveItems(slide)
    if (variant === 'issue-action') {
      const pairs = items.slice(0, 4)
      const rowCount = Math.max(1, pairs.length)
      const gapY = 0.18
      const rowH = Math.min(1.12, (bodyH - gapY * (rowCount - 1)) / rowCount)
      const startY = bodyTopY + (bodyH - (rowH * rowCount + gapY * (rowCount - 1))) / 2
      const colW = 5.56

      pairs.forEach((it, idx) => {
        const y = startY + idx * (rowH + gapY)
        const leftText = it.title || ''
        const rightText = it.text || (it.bullets ?? []).join('；') || ''

        shapes.push(ooxmlShape(nextId(), 'Issue Card ' + (idx + 1), { x: 0.62, y, w: colW, h: rowH }, {
          preset: cardPreset,
          adj: roundRectAdj(colW, rowH, chromeCfg.cardRadiusPx),
          fill: tk.surface1,
          stroke: chromeCfg.cardBorderless ? '' : tk.hairline,
          strokePt: 0.75,
          anchor: 'ctr',
          marginsIn: { l: 0.22, r: 0.16, t: 0.08, b: 0.08 },
          paragraphs: [
            ooxmlRichParagraph(leftText, {
              sizePt: 15,
              color: tk.inkPrimary,
              bold: true,
              lang: langAttr,
              font: theme.fonts.body,
            }),
          ],
        }))
        shapes.push(ooxmlShape(nextId(), 'Issue Bar ' + (idx + 1), { x: 0.62, y, w: 0.07, h: rowH }, {
          preset: 'rect',
          fill: tk.negative,
        }))

        shapes.push(ooxmlShape(nextId(), 'Bridge Arrow ' + (idx + 1), { x: 6.40, y: y + (rowH - 0.28) / 2, w: 0.52, h: 0.28 }, {
          preset: 'rightArrow',
          fill: tk.accentPrimary,
        }))

        shapes.push(ooxmlShape(nextId(), 'Action Card ' + (idx + 1), { x: 7.15, y, w: colW, h: rowH }, {
          preset: cardPreset,
          adj: roundRectAdj(colW, rowH, chromeCfg.cardRadiusPx),
          fill: tk.accentSoft,
          stroke: chromeCfg.cardBorderless ? '' : tk.accentPrimary,
          strokePt: 0.75,
          anchor: 'ctr',
          marginsIn: { l: 0.22, r: 0.16, t: 0.08, b: 0.08 },
          paragraphs: [
            ooxmlRichParagraph(rightText, {
              sizePt: 15,
              color: tk.inkPrimary,
              secondaryColor: tk.inkSecondary,
              bold: false,
              lang: langAttr,
              font: theme.fonts.body,
              autoLeadBold: true,
            }),
          ],
        }))
      })
    } else {
      // 双栏对比（versus / before-after / do-dont）
      const twoSides = items.length <= 2
        ? items
        : [
            { title: items[0]?.title || '方案 A', bullets: items.slice(0, Math.ceil(items.length / 2)).map((x) => [x.title, x.text].filter(Boolean).join('：')) },
            { title: items[Math.ceil(items.length / 2)]?.title || '方案 B', bullets: items.slice(Math.ceil(items.length / 2)).map((x) => [x.title, x.text].filter(Boolean).join('：')) },
          ]
      const colW = 5.86
      const gap = 0.37
      ;[0, 1].forEach((side) => {
        const it = twoSides[side] ?? { title: side === 0 ? '对照项' : '推荐项', text: '' }
        const x = 0.62 + side * (colW + gap)
        const isDoDont = variant === 'do-dont'
        const headerFill = isDoDont
          ? (side === 0 ? tk.negative : tk.positive)
          : (side === 0 ? tk.surface2 : tk.accentPrimary)
        const headerFg = isDoDont || side === 1 ? '#FFFFFF' : tk.inkPrimary
        const box = { x, y: bodyTopY, w: colW, h: bodyH }

        shapes.push(ooxmlShape(nextId(), 'Comparison Card ' + (side + 1), box, {
          preset: cardPreset,
          adj: roundRectAdj(box.w, box.h, chromeCfg.cardRadiusPx),
          fill: side === 1 && !isDoDont ? tk.accentSoft : tk.surface1,
          stroke: chromeCfg.cardBorderless ? '' : (side === 1 ? tk.accentPrimary : tk.hairline),
          strokePt: side === 1 ? 1.0 : 0.75,
        }))
        shapes.push(ooxmlShape(nextId(), 'Comparison Header ' + (side + 1), { x, y: bodyTopY, w: colW, h: 0.62 }, {
          preset: 'rect',
          fill: headerFill,
          anchor: 'ctr',
          marginsIn: { l: 0.24, r: 0.24, t: 0.04, b: 0.04 },
          paragraphs: [
            ooxmlRichParagraph((isDoDont ? (side === 0 ? '✗  ' : '✓  ') : '') + (it.title || (side === 0 ? '现状 / 对照' : '方案 / 目标')), {
              sizePt: 16.5,
              color: headerFg,
              bold: true,
              lang: langAttr,
              font: theme.fonts.heading,
            }),
          ],
        }))

        const contentBox = { x: x + 0.24, y: bodyTopY + 0.80, w: colW - 0.48, h: bodyH - 1.0 }
        const lines = [...(it.text ? [it.text] : []), ...(it.bullets ?? [])]
        const fit = computeTextFit(lines, contentBox, 'cardBody', { maxPt: 16, minPt: 13.5 })
        const paras = []
        if (it.text) {
          paras.push(ooxmlRichParagraph(it.text, {
            sizePt: fit.fontPt,
            color: tk.inkPrimary,
            secondaryColor: tk.inkSecondary,
            lang: langAttr,
            font: theme.fonts.body,
            lineHeight: 1.44,
            spaceAfterPt: 6,
            autoLeadBold: true,
          }))
        }
        for (const b of it.bullets ?? []) {
          paras.push(ooxmlRichParagraph(b, {
            sizePt: fit.fontPt,
            color: tk.inkPrimary,
            secondaryColor: tk.inkSecondary,
            bullet: true,
            bulletColor: side === 1 ? tk.accentPrimary : tk.inkMuted,
            lang: langAttr,
            font: theme.fonts.body,
            lineHeight: 1.42,
            spaceAfterPt: 6,
            autoLeadBold: true,
          }))
        }
        shapes.push(ooxmlShape(nextId(), 'Comparison ' + (side + 1), contentBox, {
          txBox: true,
          anchor: 't',
          marginsIn: { l: 0, r: 0, t: 0, b: 0 },
          fontScale: fit.fontScale,
          paragraphs: paras,
        }))
      })
    }
    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
    return shapes.join('')
  }

  if (layout === 'marimekko') {
    shapes.push(renderMarimekkoPptx(slide, { x: 0.62, y: bodyTopY + 0.04, w: 12.09, h: bodyH - 0.10 }, nextId, chromeCfg, theme, langAttr))
    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
    return shapes.join('')
  }

  if (layout === 'sankey') {
    shapes.push(renderSankeyPptx(slide, { x: 0.62, y: bodyTopY + 0.04, w: 12.09, h: bodyH - 0.10 }, nextId, chromeCfg, theme, langAttr))
    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
    return shapes.join('')
  }

  if (layout === 'value-chain') {
    shapes.push(renderPorterValueChainPptx(slide, { x: 0.62, y: bodyTopY + 0.04, w: 12.09, h: bodyH - 0.10 }, nextId, chromeCfg, theme, langAttr))
    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
    return shapes.join('')
  }

  if (layout === 'swot' || (layout === 'matrix' && variant === 'swot')) {
    shapes.push(renderSwotPptx(slide, { x: 0.62, y: bodyTopY + 0.04, w: 12.09, h: bodyH - 0.10 }, nextId, chromeCfg, theme, langAttr))
    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
    return shapes.join('')
  }

  if (layout === 'matrix') {
    const items = resolveEffectiveItems(slide).slice(0, 4)
    const plotX = 1.18
    const plotY = bodyTopY + 0.08
    const plotW = 11.45
    const plotH = bodyH - 0.36
    const gap = 0.28
    const qW = (plotW - gap) / 2
    const qH = (plotH - gap) / 2

    // X / Y 坐标轴带箭头
    const midX = plotX + plotW / 2
    const midY = plotY + plotH / 2
    shapes.push(ooxmlLine(nextId(), 'Matrix X axis', { x: plotX - 0.16, y: midY }, { x: plotX + plotW + 0.16, y: midY }, {
      color: tk.inkMuted,
      widthPt: 1.25,
      tailArrow: true,
    }))
    shapes.push(ooxmlLine(nextId(), 'Matrix Y axis', { x: midX, y: plotY + plotH + 0.14 }, { x: midX, y: plotY - 0.14 }, {
      color: tk.inkMuted,
      widthPt: 1.25,
      tailArrow: true,
    }))

    for (let idx = 0; idx < 4; idx += 1) {
      const it = items[idx] ?? { title: '象限 ' + (idx + 1), text: '' }
      const col = idx % 2
      const row = Math.floor(idx / 2)
      const isTarget = idx === 1 // 右上战略核心象限高亮
      const box = {
        x: plotX + col * (qW + gap),
        y: plotY + row * (qH + gap),
        w: qW,
        h: qH,
      }
      shapes.push(ooxmlShape(nextId(), 'Matrix Quadrant ' + (idx + 1), box, {
        preset: cardPreset,
        adj: roundRectAdj(box.w, box.h, chromeCfg.cardRadiusPx),
        fill: isTarget ? tk.accentSoft : tk.surface1,
        stroke: chromeCfg.cardBorderless ? '' : (isTarget ? tk.accentPrimary : tk.hairline),
        strokePt: isTarget ? 1.25 : 0.75,
        anchor: 'ctr',
        marginsIn: { l: 0.22, r: 0.22, t: 0.14, b: 0.14 },
        paragraphs: [
          ...(it.tag ? [ooxmlRichParagraph(it.tag.toUpperCase(), { sizePt: 10.5, color: isTarget ? tk.accentText : tk.inkMuted, bold: true, lang: langAttr, font: theme.fonts.body, spc: 120, spaceAfterPt: 3 })] : []),
          ooxmlRichParagraph(it.title || '', { sizePt: 16, color: tk.inkPrimary, bold: true, lang: langAttr, font: theme.fonts.heading, spaceAfterPt: 4 }),
          ...(it.text ? [ooxmlRichParagraph(it.text, { sizePt: 13.5, color: tk.inkSecondary, lang: langAttr, font: theme.fonts.body, lineHeight: 1.38 })] : []),
          ...(it.bullets ?? []).map((b) => ooxmlRichParagraph(b, { sizePt: 13.5, color: tk.inkSecondary, bullet: true, bulletColor: tk.accentPrimary, lang: langAttr, font: theme.fonts.body, spaceAfterPt: 2 })),
        ],
      }))
    }
    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
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
      shapes.push(ooxmlShape(nextId(), 'Flywheel Orbit', { x: centerX - ringD / 2, y: centerY - ringD / 2, w: ringD, h: ringD }, {
        preset: 'ellipse',
        fill: '',
        stroke: tk.hairline,
        strokePt: 1.5,
        dash: 'dash',
      }))
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
            {
              sizePt: 15,
              color: tk.inkOnAccent,
              bold: true,
              lang: langAttr,
              align: 'ctr',
              font: theme.fonts.heading,
              lineHeight: 1.22,
            },
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
        shapes.push(renderSurfaceCardPptx('Flywheel Surface ' + (idx + 1), box, {
          fill: idx === 0 ? tk.accentSoft : tk.surface1,
          focal: idx === 0,
        }, nextId, chromeCfg, theme))
        const tag = it.tag || String(idx + 1).padStart(2, '0')
        const tagW = computeBadgePillWidth(tag, 10.5, 1.5, 0.48)
        shapes.push(ooxmlShape(nextId(), 'Flywheel Tag ' + (idx + 1), { x: box.x + 0.18, y: box.y + 0.16, w: tagW, h: 0.28 }, {
          preset: cardPreset,
          adj: roundRectAdj(tagW, 0.28, Math.min(6, chromeCfg.cardRadiusPx)),
          fill: tk.accentPrimary,
          anchor: 'ctr',
          marginsIn: { l: 0.03, r: 0.03, t: 0.01, b: 0.01 },
          paragraphs: [
            ooxmlRichParagraph(tag, { sizePt: 10.5, color: tk.inkOnAccent, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.heading }),
          ],
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
            paragraphs: [
              ooxmlRichParagraph(badge, { sizePt: 10, color: tk.accentText, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.body }),
            ],
          }))
        }
        const innerBox = { x: box.x + 0.18, y: box.y + 0.52, w: box.w - 0.36, h: box.h - 0.64 }
        const cardBodyText = [it.text, ...(it.bullets ?? [])].filter(Boolean).join('；')
        const fit = computeTextFit([it.title || '', cardBodyText], innerBox, 'cardBody', { maxPt: 14.5, minPt: 12.5 })
        shapes.push(ooxmlShape(nextId(), 'Flywheel ' + (idx + 1), innerBox, {
          txBox: true,
          anchor: 't',
          marginsIn: { l: 0, r: 0, t: 0, b: 0 },
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
          paragraphs: [
            ooxmlRichParagraph(chevLabel, {
              sizePt: n >= 5 ? 13 : 14.5,
              color: inkHex,
              bold: true,
              lang: langAttr,
              align: 'ctr',
              font: theme.fonts.heading,
              lineHeight: 1.18,
            }),
          ],
        }))

        const dx = 0.62 + idx * (colW + detailGap)
        const cardBox = { x: dx, y: detailY, w: colW, h: detailH }
        shapes.push(renderSurfaceCardPptx('Chevron Detail Surface ' + (idx + 1), cardBox, {
          fill: isFirst ? tk.accentSoft : tk.surface1,
          focal: isFirst,
        }, nextId, chromeCfg, theme))

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
            marginsIn: { l: 0, r: 0, t: 0, b: 0 },
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
            paragraphs: [
              ooxmlRichParagraph('↓ ' + convBadge, {
                sizePt: 11.5,
                color: tk.accentText,
                bold: true,
                lang: langAttr,
                align: 'ctr',
                font: theme.fonts.body,
              }),
            ],
          }))
        }
      })
    } else if (variant === 'timeline') {
      const spineY = bodyTopY + 0.72
      shapes.push(ooxmlLine(nextId(), 'Timeline axis', { x: 0.85, y: spineY }, { x: 12.48, y: spineY }, {
        color: tk.accentPrimary,
        widthPt: 2.0,
      }))
      const gap = 0.20
      const stepW = (12.09 - gap * (n - 1)) / n
      items.forEach((it, idx) => {
        const x = 0.62 + idx * (stepW + gap)
        const cx = x + stepW / 2
        shapes.push(ooxmlShape(nextId(), 'Timeline Node ' + (idx + 1), { x: cx - 0.15, y: spineY - 0.15, w: 0.30, h: 0.30 }, {
          preset: 'ellipse',
          fill: idx === n - 1 ? tk.accentPrimary : tk.surface1,
          stroke: tk.accentPrimary,
          strokePt: 2.0,
        }))
        shapes.push(ooxmlShape(nextId(), 'Timeline Tag ' + (idx + 1), { x, y: bodyTopY + 0.10, w: stepW, h: 0.38 }, {
          txBox: true,
          anchor: 'ctr',
          marginsIn: { l: 0.02, r: 0.02, t: 0, b: 0 },
          paragraphs: [
            ooxmlRichParagraph(it.tag || ('0' + (idx + 1)), {
              sizePt: 13,
              color: tk.accentText,
              bold: true,
              lang: langAttr,
              align: 'ctr',
              font: theme.fonts.heading,
            }),
          ],
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
        shapes.push(renderSurfaceCardPptx('Step Surface ' + (idx + 1), box, {
          fill: tk.surface1,
          focal: idx === n - 1,
        }, nextId, chromeCfg, theme))
        const stepTag = it.tag || String(idx + 1).padStart(2, '0')
        if (chromeCfg.useDisplayNumeral) {
          shapes.push(ooxmlShape(nextId(), 'Step Number ' + (idx + 1), { x: x + 0.18, y: cardY + 0.14, w: cardW - 0.36, h: 0.42 }, {
            txBox: true,
            anchor: 'ctr',
            marginsIn: { l: 0, r: 0, t: 0, b: 0 },
            paragraphs: [
              ooxmlRichParagraph(stepTag, {
                sizePt: /^\d+$/.test(stepTag) ? 22 : 12,
                color: tk.accentText,
                bold: true,
                lang: langAttr,
                font: theme.fonts.heading,
              }),
            ],
          }))
        } else {
          const stepBadgeW = computeBadgePillWidth(stepTag, 12, cardW - 0.36, 0.50)
          shapes.push(ooxmlShape(nextId(), 'Step Number ' + (idx + 1), { x: x + 0.18, y: cardY + 0.18, w: stepBadgeW, h: 0.36 }, {
            preset: cardPreset,
            adj: roundRectAdj(stepBadgeW, 0.36, Math.min(6, chromeCfg.cardRadiusPx)),
            fill: tk.accentPrimary,
            anchor: 'ctr',
            marginsIn: { l: 0.04, r: 0.04, t: 0.02, b: 0.02 },
            paragraphs: [
              ooxmlRichParagraph(stepTag, {
                sizePt: 12,
                color: tk.inkOnAccent,
                bold: true,
                lang: langAttr,
                align: 'ctr',
                font: theme.fonts.heading,
              }),
            ],
          }))
        }
        const inner = { x: x + 0.18, y: cardY + 0.66, w: cardW - 0.36, h: cardH - 0.84 }
        const fit = computeTextFit([it.title || '', it.text || ''], inner, 'cardBody', { maxPt: 15, minPt: 13.5 })
        shapes.push(ooxmlShape(nextId(), 'Step ' + (idx + 1), inner, {
          txBox: true,
          anchor: 't',
          marginsIn: { l: 0, r: 0, t: 0, b: 0 },
          fontScale: fit.fontScale,
          paragraphs: [
            ...(it.title ? [ooxmlRichParagraph(it.title, { sizePt: Math.min(17, fit.fontPt + 1.5), color: tk.inkPrimary, bold: true, lang: langAttr, font: theme.fonts.heading, spaceAfterPt: 6 })] : []),
            ...(it.text ? [ooxmlRichParagraph(it.text, { sizePt: fit.fontPt, color: tk.inkSecondary, lang: langAttr, font: theme.fonts.body, lineHeight: 1.42 })] : []),
          ],
        }))

        if (idx < n - 1) {
          shapes.push(ooxmlShape(nextId(), 'Step Connector ' + (idx + 1), {
            x: x + cardW + arrowGap * 0.18,
            y: cardY + cardH / 2 - 0.12,
            w: arrowGap * 0.64,
            h: 0.24,
          }, {
            preset: 'rightArrow',
            fill: tk.accentPrimary,
          }))
        }
      })
    }
    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
    return shapes.join('')
  }

  if (layout === 'callout') {
    const heroText = slide.text || subtitle || ''
    const explicitFormula = typeof slide.formula === 'string' ? slide.formula.trim() : ''
    const items = resolveEffectiveItems(slide)
    const heroSegs = splitMathSegments(heroText)
    const isSingleMathHero = heroSegs.length === 1 && heroSegs[0].type === 'math'
    const formulaSource = explicitFormula
      || (isSingleMathHero ? heroSegs[0].latex : '')
      || (variant === 'formula' && looksLikeRawLatex(heroText) ? unwrapOuterMathDelimiters(heroText) : '')

    let cursorY = bodyTopY + 0.06
    if (formulaSource !== '') {
      const hasDistinctCaption = explicitFormula !== '' && heroText !== '' && unwrapOuterMathDelimiters(heroText) !== unwrapOuterMathDelimiters(explicitFormula)
      const calloutH = items.length > 0
        ? (hasDistinctCaption ? 1.54 : 1.76)
        : Math.min(3.10, bodyH - (hasDistinctCaption ? 0.68 : 0.16))
      const box = { x: 0.62, y: cursorY, w: 12.09, h: calloutH }
      shapes.push(renderMathCardPptx('Callout Formula', box, formulaSource, nextId, chromeCfg, theme, {
        emIn: items.length > 0 ? 0.28 : 0.34,
        sizePt: 20,
      }))
      cursorY += calloutH + 0.14
      if (hasDistinctCaption) {
        shapes.push(ooxmlShape(nextId(), 'Callout Formula Caption', { x: 0.62, y: cursorY, w: 12.09, h: 0.42 }, {
          txBox: true,
          anchor: 'ctr',
          marginsIn: { l: 0.12, r: 0.12, t: 0.02, b: 0.02 },
          paragraphs: [
            ooxmlRichParagraph(heroText, {
              sizePt: 14.5,
              color: tk.inkSecondary,
              lang: langAttr,
              align: 'ctr',
              font: theme.fonts.body,
            }),
          ],
        }))
        cursorY += 0.50
      }
    } else if (heroText !== '') {
      const calloutH = items.length > 0 ? 1.55 : 2.85
      const box = { x: 0.62, y: cursorY, w: 12.09, h: calloutH }
      shapes.push(ooxmlShape(nextId(), 'Callout surface', box, {
        preset: cardPreset,
        adj: roundRectAdj(box.w, box.h, chromeCfg.cardRadiusPx),
        fill: tk.surface2,
        stroke: chromeCfg.cardBorderless ? '' : tk.accentPrimary,
        strokePt: 1.0,
        anchor: 'ctr',
        marginsIn: { l: 0.32, r: 0.28, t: 0.16, b: 0.16 },
        paragraphs: [
          ooxmlRichParagraph(heroText, {
            sizePt: variant === 'formula' ? 20 : 18,
            color: tk.inkPrimary,
            accentColor: tk.accentText,
            bold: true,
            lang: langAttr,
            align: variant === 'formula' ? 'ctr' : 'l',
            font: variant === 'formula' ? 'Georgia' : theme.fonts.heading,
            lineHeight: 1.38,
          }),
        ],
      }))
      cursorY += calloutH + 0.20
    }

    if (items.length > 0) {
      const listTop = Math.max(cursorY, bodyTopY + 0.08)
      const listBox = { x: 0.62, y: listTop, w: 12.09, h: Math.max(1.0, bodyBottomY - listTop) }
      const normalizeLegendPart = (val) => {
        const s = String(val ?? '').trim()
        if (!s) return ''
        if (variant === 'formula' && looksLikeRawLatex(s) && !containsLatexMath(s)) return '$' + s + '$'
        return s
      }
      const lines = items.map((it, idx) => (it.tag || (idx + 1) + '.') + ' ' + [it.title, it.text].filter(Boolean).join('：'))
      const fit = computeTextFit(lines, listBox, 'body', { maxPt: 16.5, minPt: 13.5 })
      shapes.push(ooxmlShape(nextId(), 'Callout 1', listBox, {
        txBox: true,
        anchor: 't',
        marginsIn: { l: 0.08, r: 0.08, t: 0.04, b: 0.04 },
        fontScale: fit.fontScale,
        paragraphs: items.map((it, idx) => {
          const tagPart = normalizeLegendPart(it.tag || String(idx + 1).padStart(2, '0'))
          const titlePart = normalizeLegendPart(it.title || '')
          return ooxmlRichParagraph(
            '**' + tagPart + (titlePart ? '  ' + titlePart : '') + '**' + (it.text ? '：' + it.text : ''),
            {
              sizePt: fit.fontPt,
              color: tk.inkPrimary,
              secondaryColor: tk.inkSecondary,
              lang: langAttr,
              font: theme.fonts.body,
              lineHeight: 1.44,
              spaceAfterPt: 8,
            },
          )
        }),
      }))
    }
    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
    return shapes.join('')
  }

  // 默认版式：bullets（若带 slide.formula 先渲染顶部原生公式条；保留 idBase + 3 Body 兼容逐条点击动画 spid）
  let bulletsAreaTopY = bodyTopY + 0.06
  if (typeof slide.formula === 'string' && slide.formula.trim() !== '') {
    const fBox = { x: 0.62, y: bulletsAreaTopY, w: 12.09, h: 1.42 }
    shapes.push(renderMathCardPptx('Bullets Formula', fBox, slide.formula.trim(), nextId, chromeCfg, theme, {
      emIn: 0.27,
      sizePt: 19,
    }))
    bulletsAreaTopY += 1.56
  }

  const surfaceBox = { x: 0.62, y: bulletsAreaTopY, w: 12.09, h: Math.max(1.4, bodyBottomY - bulletsAreaTopY - 0.06) }
  shapes.push(ooxmlShape(nextId(), 'Bullets container', surfaceBox, {
    preset: cardPreset,
    adj: roundRectAdj(surfaceBox.w, surfaceBox.h, chromeCfg.cardRadiusPx),
    fill: tk.surface1,
    stroke: chromeCfg.cardBorderless ? '' : tk.hairline,
    strokePt: 0.75,
  }))
  if (chromeCfg.cardLeftBar || chromeCfg.chrome === 'saas-bento' || chromeCfg.chrome === 'gov-ceremonial') {
    shapes.push(ooxmlShape(nextId(), 'Bullets accent rail', { x: 0.62, y: bulletsAreaTopY, w: 0.07, h: surfaceBox.h }, {
      preset: 'rect',
      fill: tk.accentPrimary,
    }))
  }

  const has2dMathBullets = bullets.length > 0 && bullets.some((b) => {
    const segs = splitMathSegments(b)
    return segs.some((s) => s.type === 'math' && (s.display || has2dMathConstruct(parseLatexMath(s.latex))))
  })

  if (has2dMathBullets) {
    const innerTop = bulletsAreaTopY + 0.16
    const innerH = surfaceBox.h - 0.32
    const rowGap = 0.10
    const nRows = Math.min(6, bullets.length)
    const rowH = Math.max(0.52, (innerH - rowGap * (nRows - 1)) / nRows)
    bullets.slice(0, nRows).forEach((b, bIdx) => {
      const ry = innerTop + bIdx * (rowH + rowGap)
      const segs = splitMathSegments(b)
      const firstMathIdx = segs.findIndex((s) => s.type === 'math' && (s.display || has2dMathConstruct(parseLatexMath(s.latex))))
      if (firstMathIdx >= 0) {
        const prefixText = segs.slice(0, firstMathIdx).map((s) => s.type === 'text' ? s.value : ('$' + s.latex + '$')).join('').trim()
        const suffixText = segs.slice(firstMathIdx + 1).map((s) => s.type === 'text' ? s.value : ('$' + s.latex + '$')).join('').trim()
        const mathSeg = segs[firstMathIdx]
        if (!prefixText && !suffixText) {
          const eqBox = { x: 0.98, y: ry, w: 11.42, h: rowH }
          if (theme.dark) {
            shapes.push(ooxmlShape(nextId(), 'Bullet Math Plate ' + (bIdx + 1), eqBox, {
              preset: cardPreset,
              adj: roundRectAdj(eqBox.w, eqBox.h, Math.min(6, chromeCfg.cardRadiusPx)),
              fill: '#F8FAFC',
            }))
          }
          shapes.push(ooxmlMathShape(nextId(), 'Bullet Equation ' + (bIdx + 1), eqBox, mathSeg.latex, {
            emIn: Math.min(0.28, rowH * 0.34),
            sizePt: 18,
            align: 'ctr',
          }))
        } else {
          const labelStr = [prefixText, suffixText].filter(Boolean).join(' ')
          const labelW = Math.min(4.6, Math.max(2.4, measureEmWidth(labelStr, true) * 0.24 + 0.45))
          shapes.push(ooxmlShape(nextId(), 'Bullet Math Label ' + (bIdx + 1), { x: 0.94, y: ry, w: labelW, h: rowH }, {
            txBox: true,
            anchor: 'ctr',
            marginsIn: { l: 0.04, r: 0.06, t: 0.02, b: 0.02 },
            paragraphs: [
              ooxmlRichParagraph(prefixText || labelStr, {
                sizePt: 14.5,
                color: tk.inkPrimary,
                secondaryColor: tk.inkSecondary,
                bullet: true,
                bulletChar: '▪',
                bulletColor: tk.accentPrimary,
                lang: langAttr,
                font: theme.fonts.body,
                autoLeadBold: true,
              }),
            ],
          }))
          const eqBox = { x: 0.94 + labelW + 0.12, y: ry, w: Math.max(2.4, 12.42 - (0.94 + labelW + 0.12)), h: rowH }
          if (theme.dark) {
            const astPreview = parseLatexMath(mathSeg.latex)
            const fittedEq = fitFormulaBoxIn(astPreview, eqBox, {
              padXIn: 0.24,
              padYIn: 0.10,
              emIn: Math.min(0.27, rowH * 0.34),
              align: 'l',
            })
            const plateW = Math.min(eqBox.w, Math.max(2.2, fittedEq.w + 0.48))
            shapes.push(ooxmlShape(nextId(), 'Bullet Math Plate ' + (bIdx + 1), { x: eqBox.x, y: ry + 0.04, w: plateW, h: rowH - 0.08 }, {
              preset: cardPreset,
              adj: roundRectAdj(plateW, rowH - 0.08, Math.min(8, chromeCfg.cardRadiusPx)),
              fill: '#F8FAFC',
              stroke: tk.accentPrimary,
              strokePt: 0.75,
            }))
          }
          shapes.push(ooxmlMathShape(nextId(), 'Bullet Equation ' + (bIdx + 1), eqBox, mathSeg.latex, {
            emIn: Math.min(0.27, rowH * 0.34),
            sizePt: 18,
            align: 'l',
          }))
        }
      } else {
        shapes.push(ooxmlShape(nextId(), 'Bullet Row ' + (bIdx + 1), { x: 0.94, y: ry, w: 11.46, h: rowH }, {
          txBox: true,
          anchor: 'ctr',
          marginsIn: { l: 0.04, r: 0.04, t: 0.02, b: 0.02 },
          paragraphs: [
            ooxmlRichParagraph(b, {
              sizePt: 15.5,
              color: tk.inkPrimary,
              secondaryColor: tk.inkSecondary,
              bullet: true,
              bulletChar: '▪',
              bulletColor: tk.accentPrimary,
              lang: langAttr,
              font: theme.fonts.body,
              autoLeadBold: true,
            }),
          ],
        }))
      }
    })
    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
    return shapes.join('')
  }

  const bodyBox = { x: 0.98, y: bulletsAreaTopY + 0.18, w: 11.42, h: surfaceBox.h - 0.36 }
  const sourceLines = bullets.length > 0 ? bullets : [subtitle || slide.text || '']
  const bodyFit = computeTextFit(sourceLines, bodyBox, 'body', { maxPt: bullets.length <= 4 ? 19 : 17.5, minPt: 13.5 })
  const bodyParagraphs = bullets.length > 0
    ? bullets.map((b) =>
        ooxmlRichParagraph(b, {
          sizePt: bodyFit.fontPt,
          color: tk.inkPrimary,
          secondaryColor: tk.inkSecondary,
          accentColor: tk.accentText,
          codeHighlight: tk.surface2,
          bullet: true,
          bulletChar: '▪',
          bulletColor: tk.accentPrimary,
          lang: langAttr,
          font: theme.fonts.body,
          lineHeight: bodyFit.lineHeight,
          spaceAfterPt: bullets.length <= 4 ? 12 : 7,
          autoLeadBold: true,
        }),
      )
    : [
        ooxmlRichParagraph(subtitle || slide.text || '', {
          sizePt: bodyFit.fontPt,
          color: tk.inkPrimary,
          secondaryColor: tk.inkSecondary,
          lang: langAttr,
          font: theme.fonts.body,
          lineHeight: bodyFit.lineHeight,
        }),
      ]

  shapes.push(ooxmlShape(idBase + 3, 'Body', bodyBox, {
    txBox: true,
    anchor: bullets.length > 0 && bullets.length <= 4 ? 'ctr' : 't',
    marginsIn: { l: 0, r: 0, t: 0, b: 0 },
    fontScale: bodyFit.fontScale,
    paragraphs: bodyParagraphs,
  }))
  shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
  return shapes.join('')
}

function hexToRgbaSafeHex(fgHex, bgHex, alpha) {
  const f = parseInt(hex6(fgHex), 16)
  const b = parseInt(hex6(bgHex), 16)
  const mix = (fc, bc) => Math.round(fc * alpha + bc * (1 - alpha)).toString(16).padStart(2, '0')
  return '#' + mix((f >> 16) & 255, (b >> 16) & 255) + mix((f >> 8) & 255, (b >> 8) & 255) + mix(f & 255, b & 255)
}

function computeCardGridBoxes(count, variant, area, gap) {
  const n = Math.max(1, Math.min(6, count))
  const { x, y, w, h } = area

  if (variant === 'bento' && n === 3) {
    const leftW = w * 0.43 - gap / 2
    const rightW = w - leftW - gap
    const halfH = (h - gap) / 2
    return [
      { x, y, w: leftW, h },
      { x: x + leftW + gap, y, w: rightW, h: halfH },
      { x: x + leftW + gap, y: y + halfH + gap, w: rightW, h: halfH },
    ]
  }
  if (variant === 'bento' && n === 4) {
    const topLeftW = w * 0.58 - gap / 2
    const topRightW = w - topLeftW - gap
    const halfH = (h - gap) / 2
    return [
      { x, y, w: topLeftW, h: halfH },
      { x: x + topLeftW + gap, y, w: topRightW, h: halfH },
      { x, y: y + halfH + gap, w: topRightW, h: halfH },
      { x: x + topRightW + gap, y: y + halfH + gap, w: topLeftW, h: halfH },
    ]
  }
  if (n <= 4 && variant !== 'bento') {
    const cardW = (w - gap * (n - 1)) / n
    return Array.from({ length: n }, (_, i) => ({ x: x + i * (cardW + gap), y, w: cardW, h }))
  }
  // 5 或 6 张卡片：2 行等高排布
  const topCols = Math.ceil(n / 2)
  const botCols = n - topCols
  const rowH = (h - gap) / 2
  const topW = (w - gap * (topCols - 1)) / topCols
  const botW = (w - gap * (Math.max(1, botCols) - 1)) / Math.max(1, botCols)
  return [
    ...Array.from({ length: topCols }, (_, i) => ({ x: x + i * (topW + gap), y, w: topW, h: rowH })),
    ...Array.from({ length: botCols }, (_, i) => ({ x: x + i * (botW + gap), y: y + rowH + gap, w: botW, h: rowH })),
  ]
}

// ---------------------------------------------------------------------------
// HTML 同构渲染器与设计系统级样式表 LAYOUT_CSS
// ---------------------------------------------------------------------------

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

export function renderCoreSlideHtml(slide, index, total, ui, langId, manifest = {}, theme) {
  const layout = slide.layout || 'bullets'
  const variant = slide.variant || ''
  const kicker = slide.kicker || (layout === 'cover' ? ui.coverKicker : '')
  const title = slide.title || ''
  const subtitle = slide.subtitle || ''
  const bullets = Array.isArray(slide.bullets) ? slide.bullets : []
  const isFraming = layout === 'cover' || layout === 'closing'
  const inverted = isFraming && (variant === 'inverted' || (!variant && theme.tokens.coverMode === 'inverted-accent'))
  const chromeStyle = resolveChromeStyle(theme, slide, manifest.brand)
  const folioText = String(index + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0')

  const renderHeader = (fallbackKicker = '') => {
    const k = kicker || fallbackKicker
    const showK = k !== '' && k !== title
    if (chromeStyle === 'editorial-folio') {
      return (
        '<div class="editorial-folio-bar">' +
        (showK ? '<span class="kicker">' + escapeHtml(k) + '</span>' : '<span class="kicker"></span>') +
        (!isFraming ? '<span class="slide-folio">' + folioText + '</span>' : '') +
        '</div>' +
        '<header class="slide-header">' +
        (title !== '' ? '<h2>' + renderInlineHtml(title) + '</h2>' : '') +
        '</header>'
      )
    }
    if (chromeStyle === 'academic-minimal') {
      return (
        '<header class="slide-header beamer-header-band">' +
        (showK ? '<div class="kicker">' + escapeHtml(k) + '</div>' : '') +
        (title !== '' ? '<h2>' + renderInlineHtml(title) + '</h2>' : '') +
        '</header>'
      )
    }
    if (chromeStyle === 'consulting-classic') {
      return (
        '<header class="slide-header consulting-header">' +
        (title !== '' ? '<h2>' + renderInlineHtml(title) + '</h2>' : '') +
        (showK ? '<span class="consulting-tracker kicker">' + escapeHtml(k) + '</span>' : '') +
        '</header>'
      )
    }
    if (chromeStyle === 'gov-ceremonial') {
      return (
        '<header class="slide-header gov-header">' +
        (showK ? '<div class="kicker gov-ribbon">' + escapeHtml(formatGovKicker(k)) + '</div>' : '') +
        (title !== '' ? '<h2>' + renderInlineHtml(title) + '</h2>' : '') +
        '</header>'
      )
    }
    return (
      '<header class="slide-header">' +
      (showK ? '<div class="kicker">' + escapeHtml(k) + '</div>' : '') +
      (title !== '' ? '<h2>' + renderInlineHtml(title) + '</h2>' : '') +
      '</header>'
    )
  }

  let inner = ''

  if (layout === 'cover') {
    const meta = [slide.text, slide.source, !manifest.brand?.footer ? ui.generatedBy : ''].filter(Boolean)[0] || ''
    inner =
      '<div class="cover-shell' + (inverted ? ' is-inverted' : '') + '">' +
      '<div class="cover-lockup">' +
      (kicker !== '' ? '<div class="kicker">' + escapeHtml(kicker) + '</div>' : '') +
      '<h1>' + renderInlineHtml(title) + '</h1>' +
      (subtitle !== '' ? '<div class="subtitle">' + renderInlineHtml(subtitle) + '</div>' : '') +
      '</div>' +
      (meta !== '' ? '<div class="meta">' + escapeHtml(meta) + '</div>' : '') +
      '</div>'
  } else if (layout === 'closing') {
    const items = resolveEffectiveItems(slide)
    const showCtaCards = (variant === 'cta-cards' || items.length >= 2) && (slide.items?.length || bullets.length >= 2)
    inner =
      '<div class="closing-shell' + (inverted ? ' is-inverted' : '') + '">' +
      '<h1>' + renderInlineHtml(title || ui.closingTitle) + '</h1>' +
      '<div class="closing-rule"></div>' +
      (subtitle !== '' ? '<div class="subtitle">' + renderInlineHtml(subtitle) + '</div>' : '') +
      (showCtaCards
        ? '<div class="layout-grid cols-' + Math.min(3, items.length) + ' closing-cards">' +
          items.slice(0, 3).map((it) =>
            '<div class="surface-card"><div class="card-title">' + renderInlineHtml(it.title || '') + '</div>' +
            (it.text ? '<div class="card-body">' + renderInlineHtml(it.text) + '</div>' : '') + '</div>',
          ).join('') +
          '</div>'
        : '') +
      (!manifest.brand?.footer ? '<div class="meta">' + escapeHtml(ui.generatedBy) + '</div>' : '') +
      '</div>'
  } else if (layout === 'section') {
    inner =
      (chromeStyle === 'editorial-folio'
        ? '<div class="editorial-folio-bar"><span class="kicker">' + escapeHtml(kicker || '') + '</span><span class="slide-folio">' + folioText + '</span></div>'
        : '') +
      (kicker !== '' && kicker !== title ? '<div class="kicker section-index">' + escapeHtml(kicker) + '</div>' : '') +
      '<div class="accent-line"></div>' +
      '<h2>' + renderInlineHtml(title) + '</h2>' +
      (subtitle !== '' ? '<div class="subtitle">' + renderInlineHtml(subtitle) + '</div>' : '')
  } else if (layout === 'statement') {
    inner =
      (chromeStyle === 'editorial-folio'
        ? '<div class="editorial-folio-bar"><span class="kicker">' + escapeHtml(kicker || '') + '</span><span class="slide-folio">' + folioText + '</span></div>'
        : (kicker !== '' ? '<div class="kicker">' + escapeHtml(kicker) + '</div>' : '')) +
      '<div class="statement-card"><div class="statement-title">' + renderInlineHtml(title || slide.text || '') + '</div></div>' +
      (subtitle !== '' ? '<div class="subtitle">' + renderInlineHtml(subtitle) + '</div>' : '')
  } else if (layout === 'quote') {
    inner =
      (chromeStyle === 'editorial-folio'
        ? '<div class="editorial-folio-bar"><span class="kicker">' + escapeHtml(kicker || ui.quoteKicker) + '</span><span class="slide-folio">' + folioText + '</span></div>'
        : (kicker !== '' ? '<div class="kicker">' + escapeHtml(kicker || ui.quoteKicker) + '</div>' : '')) +
      '<div class="quote-card">' +
      '<div class="quote-mark" aria-hidden="true">\u201C</div>' +
      '<blockquote class="quote-text">' + escapeHtml(title || slide.text || '') + '</blockquote>' +
      (subtitle !== '' ? '<div class="quote-attr">\u2014\u2014 ' + escapeHtml(subtitle) + '</div>' : '') +
      '</div>'
  } else if (layout === 'harvey' || (layout === 'table' && (slide.tableStyle || slide.visual?.tableStyle) === 'harvey')) {
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
    inner =
      renderHeader(ui.tableKicker) +
      '<table class="deck-table harvey-table"><thead><tr>' +
      head.map((cell, cIdx) => renderHarveyCellHtml(cell, true, cIdx, oursCol)).join('') +
      '</tr></thead><tbody>' +
      body.map((row) => '<tr>' + Array.from({ length: cols }, (_, cIdx) => renderHarveyCellHtml(String(row[cIdx] ?? ''), false, cIdx, oursCol)).join('') + '</tr>').join('') +
      '</tbody></table>'
  } else if (layout === 'table') {
    const rows = Array.isArray(slide.rows) ? slide.rows : []
    const head = rows[0] ?? []
    const body = rows.slice(1)
    inner =
      renderHeader(ui.tableKicker) +
      '<table class="deck-table"><thead><tr>' +
      head.map((cell) => '<th' + (isNumericCell(cell) ? ' class="num"' : '') + '>' + renderInlineHtml(cell) + '</th>').join('') +
      '</tr></thead><tbody>' +
      body.map((row) => '<tr>' + row.map((cell) => '<td' + (isNumericCell(cell) ? ' class="num"' : '') + '>' + renderInlineHtml(cell) + '</td>').join('') + '</tr>').join('') +
      '</tbody></table>'
  } else if (layout === 'gantt') {
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
      renderHeader() +
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
      renderHeader() +
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
      renderHeader() +
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
        renderHeader() +
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
        renderHeader() +
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
  } else if (layout === 'agenda') {
    const items = resolveEffectiveItems(slide)
    const badgeClass = chromeStyle === 'editorial-folio' ? 'item-badge is-editorial-num' : 'item-badge'
    inner =
      renderHeader() +
      '<ol class="layout-grid agenda-grid ' + (items.length > 4 ? 'cols-2' : 'cols-1') + '">' +
      items.map((it, idx) => {
        const active = slide.activeIndex === idx + 1 || it.status === 'accent'
        return (
          '<li class="surface-card agenda-item' + (active ? ' is-active' : '') + '" data-item-index="' + idx + '">' +
          '<span class="' + badgeClass + '">' + escapeHtml(it.tag || String(idx + 1).padStart(2, '0')) + '</span>' +
          '<div class="agenda-copy"><div class="card-title" data-item-field="title">' + renderInlineHtml(it.title || it.text || '') + '</div>' +
          (it.text && it.title ? '<div class="card-body" data-item-field="text">' + renderInlineHtml(it.text) + '</div>' : '') +
          '</div></li>'
        )
      }).join('') +
      '</ol>'
  } else if (layout === 'kpi') {
    const items = resolveEffectiveItems(slide).slice(0, 4)
    inner =
      renderHeader() +
      '<div class="layout-grid kpi-grid cols-' + Math.max(1, items.length) + '">' +
      items.map((it, idx) =>
        '<div class="surface-card kpi-card' + (idx === 0 ? ' is-focal' : '') + '" data-item-index="' + idx + '">' +
        (it.value && it.title ? '<div class="kpi-label" data-item-field="title">' + renderInlineHtml(it.title) + '</div>' : '') +
        '<div class="kpi-value"><span data-item-field="value">' + escapeHtml(it.value || it.title || '—') + '</span>' +
        (it.unit ? '<small class="kpi-unit" data-item-field="unit">' + escapeHtml(it.unit) + '</small>' : '') + '</div>' +
        (it.delta ? '<span class="kpi-delta tone-' + escapeHtml(it.status || 'positive') + '" data-item-field="delta">' + escapeHtml(it.delta) + '</span>' : '') +
        (it.text ? '<div class="card-body" data-item-field="text">' + renderInlineHtml(it.text) + '</div>' : '') +
        '</div>',
      ).join('') +
      '</div>'
  } else if (layout === 'cards') {
    const items = resolveEffectiveItems(slide)
    const thesis = variant === 'exec-summary' && (slide.text || subtitle)
      ? '<div class="exec-thesis">' + renderInlineHtml(slide.text || subtitle) + '</div>'
      : ''
    const gridClass = variant === 'bento'
      ? 'bento-grid bento-' + Math.min(6, Math.max(2, items.length))
      : 'cols-' + Math.min(4, Math.max(2, items.length <= 4 ? items.length : 3))
    const badgeClass = chromeStyle === 'editorial-folio' ? 'item-badge is-editorial-num' : 'item-badge'
    inner =
      renderHeader() +
      thesis +
      '<div class="layout-grid cards-grid ' + gridClass + '">' +
      items.slice(0, 6).map((it, idx) =>
        '<article class="surface-card' + (variant === 'bento' && idx === 0 ? ' is-hero' : '') + '" data-item-index="' + idx + '">' +
        '<span class="' + badgeClass + '">' + escapeHtml(it.tag || String(idx + 1).padStart(2, '0')) + '</span>' +
        (it.title ? '<h3 class="card-title" data-item-field="title">' + renderInlineHtml(it.title) + '</h3>' : '') +
        (it.value ? '<div class="card-stat" data-item-field="value">' + escapeHtml(it.value + (it.unit ? ' ' + it.unit : '')) + '</div>' : '') +
        (it.text ? '<div class="card-body" data-item-field="text">' + renderInlineHtml(it.text) + '</div>' : '') +
        (it.bullets?.length
          ? '<ul class="card-bullets">' + it.bullets.map((b) => '<li>' + renderInlineHtml(b, { autoLeadBold: true }) + '</li>').join('') + '</ul>'
          : '') +
        '</article>',
      ).join('') +
      '</div>'
  } else if (layout === 'comparison') {
    const items = resolveEffectiveItems(slide)
    if (variant === 'issue-action') {
      inner =
        renderHeader() +
        '<div class="layout-grid issue-action-list">' +
        items.slice(0, 4).map((it, idx) =>
          '<div class="issue-action-row" data-item-index="' + idx + '">' +
          '<div class="surface-card issue-box"><span class="card-title" data-item-field="title">' + renderInlineHtml(it.title || '') + '</span></div>' +
          '<span class="bridge-arrow" aria-hidden="true">→</span>' +
          '<div class="surface-card action-box"><span class="card-body" data-item-field="text">' + renderInlineHtml(it.text || (it.bullets ?? []).join('；'), { autoLeadBold: true }) + '</span></div>' +
          '</div>',
        ).join('') +
        '</div>'
    } else {
      const twoSides = items.length <= 2
        ? items
        : [
            { title: items[0]?.title || '方案 A', bullets: items.slice(0, Math.ceil(items.length / 2)).map((x) => [x.title, x.text].filter(Boolean).join('：')) },
            { title: items[Math.ceil(items.length / 2)]?.title || '方案 B', bullets: items.slice(Math.ceil(items.length / 2)).map((x) => [x.title, x.text].filter(Boolean).join('：')) },
          ]
      const isDoDont = variant === 'do-dont'
      inner =
        renderHeader() +
        '<div class="layout-grid cols-2 comparison-grid">' +
        [0, 1].map((side) => {
          const it = twoSides[side] ?? { title: side === 0 ? '对照项' : '推荐项' }
          const headPrefix = isDoDont ? (side === 0 ? '✗ ' : '✓ ') : ''
          return (
            '<div class="surface-card comp-card side-' + side + (isDoDont ? ' is-dodont' : '') + '" data-item-index="' + side + '">' +
            '<div class="comp-head" data-item-field="title">' + escapeHtml(headPrefix) + renderInlineHtml(it.title || '') + '</div>' +
            '<div class="comp-body">' +
            (it.text ? '<p class="card-body" data-item-field="text">' + renderInlineHtml(it.text, { autoLeadBold: true }) + '</p>' : '') +
            (it.bullets?.length ? '<ul class="card-bullets">' + it.bullets.map((b) => '<li>' + renderInlineHtml(b, { autoLeadBold: true }) + '</li>').join('') + '</ul>' : '') +
            '</div></div>'
          )
        }).join('') +
        '</div>'
    }
  } else if (layout === 'marimekko') {
    inner = renderHeader() + renderMarimekkoHtml(slide, theme, langId)
  } else if (layout === 'sankey') {
    inner = renderHeader() + renderSankeyHtml(slide, theme, langId)
  } else if (layout === 'value-chain') {
    inner = renderHeader() + renderPorterValueChainHtml(slide, langId)
  } else if (layout === 'swot' || (layout === 'matrix' && variant === 'swot')) {
    inner = renderHeader() + renderSwotHtml(slide, langId)
  } else if (layout === 'matrix') {
    const items = resolveEffectiveItems(slide).slice(0, 4)
    inner =
      renderHeader() +
      '<div class="layout-grid cols-2 matrix-grid">' +
      Array.from({ length: 4 }, (_, idx) => {
        const it = items[idx] ?? { title: '象限 ' + (idx + 1) }
        return (
          '<div class="surface-card matrix-cell' + (idx === 1 ? ' is-target' : '') + '" data-item-index="' + idx + '">' +
          (it.tag ? '<div class="kicker matrix-tag">' + escapeHtml(it.tag) + '</div>' : '') +
          '<div class="card-title" data-item-field="title">' + renderInlineHtml(it.title || '') + '</div>' +
          (it.text ? '<div class="card-body" data-item-field="text">' + renderInlineHtml(it.text) + '</div>' : '') +
          '</div>'
        )
      }).join('') +
      '</div>'
  } else if (layout === 'process') {
    const items = resolveEffectiveItems(slide).slice(0, 6)
    const badgeClass = chromeStyle === 'editorial-folio' ? 'item-badge is-editorial-num' : 'item-badge'
    if (variant === 'flywheel') {
      const nodes = items.slice(0, 4)
      const rawHub = (slide.text && slide.text.trim().length <= 18 ? slide.text.trim() : '')
        || (slide.subtitle && slide.subtitle.trim().length <= 18 ? slide.subtitle.trim() : '')
      const hubText = rawHub || (langId === 'en' ? 'Growth Flywheel' : '增长飞轮')
      inner =
        renderHeader() +
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
        renderHeader() +
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
        renderHeader() +
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
  } else if (layout === 'callout') {
    const heroText = slide.text || subtitle || ''
    const explicitFormula = typeof slide.formula === 'string' ? slide.formula.trim() : ''
    const heroSegs = splitMathSegments(heroText)
    const isSingleMathHero = heroSegs.length === 1 && heroSegs[0].type === 'math'
    const formulaSource = explicitFormula
      || (isSingleMathHero ? heroSegs[0].latex : '')
      || (variant === 'formula' && looksLikeRawLatex(heroText) ? unwrapOuterMathDelimiters(heroText) : '')
    const hasDistinctCaption = explicitFormula !== '' && heroText !== '' && unwrapOuterMathDelimiters(heroText) !== unwrapOuterMathDelimiters(explicitFormula)
    const items = resolveEffectiveItems(slide)
    const renderLegendBadge = (rawBadge) => {
      if (variant === 'formula' && looksLikeRawLatex(rawBadge) && !containsLatexMath(rawBadge)) {
        return latexToMathMl(rawBadge, { display: false, className: 'deck-math is-inline' })
      }
      return containsLatexMath(rawBadge) ? renderInlineHtml(rawBadge) : escapeHtml(rawBadge)
    }
    inner =
      renderHeader() +
      (formulaSource !== ''
        ? '<div class="callout-hero is-formula is-omath callout-formula formula-plate">' + latexToMathMl(formulaSource, { display: true, className: 'deck-math is-block' }) + '</div>' +
          (hasDistinctCaption ? '<div class="formula-caption">' + renderInlineHtml(heroText) + '</div>' : '')
        : (heroText ? '<div class="callout-hero' + (variant === 'formula' ? ' is-formula callout-formula' : '') + '">' + renderInlineHtml(heroText) + '</div>' : '')) +
      (items.length
        ? '<ul class="layout-grid callout-list">' +
          items.map((it, idx) =>
            '<li class="surface-card callout-row" data-item-index="' + idx + '">' +
            '<span class="item-badge">' + renderLegendBadge(it.tag || String(idx + 1).padStart(2, '0')) + '</span>' +
            '<div class="card-body"><strong data-item-field="title">' + renderInlineHtml(it.title || '') + '</strong>' +
            (it.text ? ' <span data-item-field="text">' + renderInlineHtml(it.text) + '</span>' : '') +
            '</div></li>',
          ).join('') +
          '</ul>'
        : '')
  } else {
    // bullets 默认版式（严格保持 <li style="--i:0">纯文本</li> 无多余包裹，兼容 test/features.test.mjs:202）
    const topFormulaBanner = typeof slide.formula === 'string' && slide.formula.trim() !== ''
      ? '<div class="callout-hero is-formula is-omath callout-formula formula-plate">' + latexToMathMl(slide.formula.trim(), { display: true, className: 'deck-math is-block' }) + '</div>'
      : ''
    inner =
      renderHeader() +
      topFormulaBanner +
      (subtitle !== '' && bullets.length === 0 ? '<div class="subtitle">' + renderInlineHtml(subtitle) + '</div>' : '') +
      (bullets.length > 0
        ? '<ul class="bullets-list' + (variant === 'two-column' ? ' cols-2' : '') + '">' +
          bullets.map((bullet, bulletIndex) => '<li style="--i:' + bulletIndex + '">' + renderInlineHtml(bullet, { autoLeadBold: true }) + '</li>').join('') +
          '</ul>'
        : '')
  }

  const takeawayPrefix = chromeStyle === 'consulting-classic'
    ? '<strong class="takeaway-prefix">' + (langId === 'en' ? 'Key Takeaway:' : '核心结论：') + '</strong>'
    : '<span class="takeaway-arrow" aria-hidden="true">' + (chromeStyle === 'editorial-folio' ? '—' : '▸') + '</span>'
  const takeawayHtml = !isFraming && slide.takeaway
    ? '<div class="slide-takeaway">' + takeawayPrefix + '<span class="takeaway-text">' + renderInlineHtml(slide.takeaway) + '</span></div>'
    : ''

  let footerStrip = ''
  if (!isFraming) {
    const sourceText = slide.source ? formatSourceLine(slide.source, langId) : ''
    if (chromeStyle === 'academic-minimal') {
      const zLeft = sourceText || manifest.brand?.footer || manifest.title || ''
      const zMid = (slide.kicker || slide.title || '').trim()
      footerStrip =
        '<footer class="beamer-status-bar">' +
        '<span class="slide-source beamer-zone-left">' + escapeHtml(zLeft) + '</span>' +
        '<span class="beamer-zone-mid">' + escapeHtml(zMid) + '</span>' +
        '<span class="slide-folio beamer-zone-right">' + folioText + '</span>' +
        '</footer>'
    } else if (chromeStyle === 'editorial-folio') {
      footerStrip = sourceText
        ? '<footer class="slide-footer-strip"><span class="slide-source">' + escapeHtml(sourceText) + '</span></footer>'
        : ''
    } else {
      const folioLeft = sourceText ? '<span class="slide-source">' + escapeHtml(sourceText) + '</span>' : ''
      const folioRight = '<span class="slide-folio">' + folioText + '</span>'
      footerStrip = '<footer class="slide-footer-strip">' + folioLeft + folioRight + '</footer>'
    }
  }

  return inner + takeawayHtml + footerStrip
}

export const LAYOUT_CSS = `
.slide-inner{display:flex;flex-direction:column;justify-content:center;width:100%;max-width:1560px;margin:0 auto;height:100%;gap:clamp(16px,2vw,28px)}
.slide--cover .slide-inner,.slide--closing .slide-inner,.slide--section .slide-inner,.slide--statement .slide-inner,.slide--quote .slide-inner{justify-content:center}
.slide-header{border-bottom:1px solid var(--hairline);padding-bottom:clamp(12px,1.5vw,20px)}
.slide-header .kicker{margin-bottom:8px}
.slide-header h2{font-size:clamp(26px,3.1vw,46px);max-width:34ch;line-height:1.18}
.cover-shell{display:flex;flex-direction:column;justify-content:center;gap:clamp(24px,3.5vw,44px);min-height:72%}
.cover-shell.is-inverted,.closing-shell.is-inverted{
  background:var(--cover-bg);color:#F8FAFC;padding:clamp(36px,5vw,76px);
  border-radius:calc(var(--radius) * 1.4);box-shadow:0 24px 60px rgba(0,0,0,.18);
}
.cover-shell.is-inverted h1,.closing-shell.is-inverted h1{color:#F8FAFC}
.cover-shell.is-inverted .subtitle,.closing-shell.is-inverted .subtitle{color:#E2E8F0}
.cover-shell.is-inverted .kicker{color:#FDE68A}
.cover-shell.is-inverted .meta,.closing-shell.is-inverted .meta{color:#CBD5E1;border-top-color:rgba(255,255,255,.2)}
.cover-lockup{border-left:5px solid var(--accent);padding-left:clamp(20px,2.6vw,38px)}
.cover-shell.is-inverted .cover-lockup{border-left-color:#D4AF37}
.cover-shell .meta{margin-top:auto;padding-top:16px;border-top:1px solid var(--hairline)}
.closing-shell{display:flex;flex-direction:column;align-items:center;text-align:center;gap:18px}
.closing-rule{width:96px;height:4px;background:var(--accent);border-radius:2px}
.closing-cards{width:100%;margin-top:14px;text-align:center}
.section-index{font-size:clamp(22px,3vw,44px);letter-spacing:.08em}
.statement-card,.quote-card{
  background:var(--surface1);border:1px solid var(--hairline);border-left:6px solid var(--accent);
  border-radius:var(--radius);padding:clamp(24px,3.6vw,52px);
}
.statement-card .statement-title{border-left:0;padding-left:0}
.inline-code{background:var(--surface2);border:1px solid var(--hairline);border-radius:5px;padding:.08em .38em;font-size:.9em}
.ink-sec{color:var(--ink-secondary)}
.bullets-list{
  margin:0;padding:clamp(18px,2.4vw,34px) clamp(22px,2.8vw,40px);list-style:none;
  display:grid;gap:clamp(12px,1.5vw,20px);background:var(--surface1);
  border:1px solid var(--hairline);border-left:4px solid var(--accent);border-radius:var(--radius);
}
.bullets-list.cols-2{grid-template-columns:repeat(2,minmax(0,1fr));column-gap:32px}
.bullets-list li{position:relative;padding-left:clamp(22px,2vw,32px);font-size:clamp(17px,1.8vw,26px);line-height:1.48;max-width:52ch}
.bullets-list li::before{
  content:"";position:absolute;left:0;top:.56em;width:.42em;height:.42em;
  background:var(--accent);border-radius:2px;
}
.layout-grid{display:grid;gap:clamp(14px,1.6vw,22px);margin:0;padding:0;list-style:none;width:100%}
.cols-1{grid-template-columns:1fr}
.cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}
.cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}
.cols-4{grid-template-columns:repeat(4,minmax(0,1fr))}
.cols-5{grid-template-columns:repeat(5,minmax(0,1fr))}
.cols-6{grid-template-columns:repeat(6,minmax(0,1fr))}
.surface-card{
  background:var(--surface1);border:1px solid var(--hairline);border-radius:var(--radius);
  padding:clamp(16px,2vw,28px);display:flex;flex-direction:column;gap:10px;min-width:0;
}
.surface-card.is-hero,.surface-card.is-focal,.surface-card.is-target,.surface-card.is-active{
  background:var(--accent-soft);border-color:var(--accent);
}
.item-badge{
  display:inline-flex;align-items:center;justify-content:center;align-self:flex-start;
  min-width:34px;height:26px;padding:0 9px;border-radius:calc(var(--radius) * .6);
  background:var(--accent-soft);color:var(--accent-text);font-weight:700;font-size:13px;
  font-variant-numeric:tabular-nums;
}
.item-badge.is-editorial-num{
  background:transparent;padding:0;min-width:auto;height:auto;border-radius:0;
  font-family:var(--font-heading);font-size:clamp(22px,2.2vw,34px);font-weight:800;line-height:1;
}
.card-title{margin:0;font-family:var(--font-heading);font-size:clamp(17px,1.6vw,23px);font-weight:700;line-height:1.3;color:var(--fg)}
.card-stat{font-family:var(--font-heading);font-size:clamp(24px,2.6vw,38px);font-weight:800;color:var(--accent-text);font-variant-numeric:tabular-nums}
.card-body{margin:0;font-size:clamp(14px,1.35vw,19px);line-height:1.5;color:var(--ink-secondary)}
.card-bullets{margin:4px 0 0;padding-left:1.15em;display:grid;gap:6px;color:var(--ink-secondary);font-size:clamp(14px,1.3vw,18px);line-height:1.45}
.kpi-card{justify-content:space-between}
.kpi-label{font-size:clamp(13px,1.15vw,16px);font-weight:600;color:var(--muted)}
.kpi-value{font-family:var(--font-heading);font-size:clamp(34px,4.4vw,68px);font-weight:800;line-height:1.04;letter-spacing:-.025em;color:var(--fg);font-variant-numeric:tabular-nums}
.kpi-card.is-focal .kpi-value{color:var(--accent-text)}
.kpi-unit{font-size:.42em;font-weight:600;color:var(--muted);margin-left:.22em}
.kpi-delta{display:inline-flex;align-self:flex-start;padding:3px 10px;border-radius:99px;font-size:13px;font-weight:700;background:var(--surface2);border:1px solid var(--hairline);font-variant-numeric:tabular-nums}
.kpi-delta.tone-positive{color:var(--positive)}
.kpi-delta.tone-negative{color:var(--negative)}
.kpi-delta.tone-warning{color:var(--warning)}
.kpi-delta.tone-accent{color:var(--accent-text)}
.bento-grid.bento-3{grid-template-columns:5fr 7fr;grid-template-rows:repeat(2,minmax(0,1fr))}
.bento-grid.bento-3 > :first-child{grid-row:1 / span 2}
.bento-grid.bento-4{grid-template-columns:repeat(12,minmax(0,1fr))}
.bento-grid.bento-4 > :nth-child(1){grid-column:span 7}
.bento-grid.bento-4 > :nth-child(2){grid-column:span 5}
.bento-grid.bento-4 > :nth-child(3){grid-column:span 5}
.bento-grid.bento-4 > :nth-child(4){grid-column:span 7}
.bento-grid.bento-5,.bento-grid.bento-6{grid-template-columns:repeat(3,minmax(0,1fr))}
.exec-thesis{background:var(--accent-soft);border:1px solid var(--accent);border-radius:var(--radius);padding:14px 20px;font-weight:600;font-size:clamp(15px,1.45vw,21px);line-height:1.4}
.agenda-item{flex-direction:row;align-items:center;gap:16px;padding:14px 20px}
.comp-card{padding:0;overflow:hidden}
.comp-head{padding:14px 22px;font-family:var(--font-heading);font-weight:700;font-size:clamp(16px,1.55vw,22px);background:var(--surface2);color:var(--fg)}
.comp-card.side-1 .comp-head{background:var(--accent);color:var(--ink-on-accent)}
.comp-card.is-dodont.side-0 .comp-head{background:var(--negative);color:#FFF}
.comp-card.is-dodont.side-1 .comp-head{background:var(--positive);color:#FFF}
.comp-body{padding:18px 22px;display:flex;flex-direction:column;gap:8px}
.issue-action-row{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:14px}
.issue-box{border-left:4px solid var(--negative)}
.action-box{background:var(--accent-soft);border-color:var(--accent)}
.bridge-arrow{color:var(--accent-text);font-weight:800;font-size:22px}
.matrix-grid{position:relative}
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
.callout-hero{background:var(--surface2);border:1px solid var(--accent);border-left:5px solid var(--accent);border-radius:var(--radius);padding:20px 26px;font-size:clamp(17px,1.8vw,26px);font-weight:700;line-height:1.4}
.callout-hero.is-formula{font-family:Georgia,"Times New Roman",serif;text-align:center}
.callout-row{flex-direction:row;align-items:center;padding:12px 18px}
.slide-takeaway{
  margin-top:auto;background:var(--accent-soft);border:1px solid var(--hairline);border-left:4px solid var(--accent);
  border-radius:calc(var(--radius) * .85);padding:10px 18px;display:flex;align-items:center;gap:10px;
  font-size:clamp(13px,1.25vw,17px);font-weight:600;color:var(--fg);
}
.takeaway-arrow,.takeaway-prefix{color:var(--accent-text)}
.slide-footer-strip{display:flex;justify-content:space-between;align-items:center;gap:16px;font-size:12px;color:var(--muted);padding-top:4px;font-variant-numeric:tabular-nums}
.slide-folio{margin-left:auto}
.slide[data-table-style="booktabs"] .deck-table th{background:transparent;border-top:2px solid var(--fg);border-bottom:1px solid var(--fg)}
.slide[data-table-style="booktabs"] .deck-table td{background:transparent !important;border-bottom:0}
.slide[data-table-style="booktabs"] .deck-table tbody tr:last-child td{border-bottom:2px solid var(--fg)}
.slide[data-table-style="minimal"] .deck-table th{background:transparent;color:var(--accent-text);border-bottom:2px solid var(--accent)}
.slide[data-table-style="minimal"] .deck-table tbody tr:nth-child(even){background:transparent}
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
/* 6 Chrome Skeleton Differentiation */
.slide[data-chrome="consulting-classic"] .consulting-header{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}
.slide[data-chrome="consulting-classic"] .consulting-tracker{border:1px solid var(--accent);background:var(--accent-soft);padding:5px 14px;border-radius:0;margin:0;white-space:nowrap}
.slide[data-chrome="consulting-classic"] .surface-card,.slide[data-chrome="consulting-classic"] .bullets-list,.slide[data-chrome="consulting-classic"] .statement-card,.slide[data-chrome="consulting-classic"] .quote-card{border-radius:0;border-left:3.5px solid var(--accent)}
.slide[data-chrome="consulting-classic"] .slide-takeaway{background:transparent;border:0;border-top:1.5px solid var(--accent);border-radius:0;padding:10px 0 2px}
.slide[data-chrome="keynote-spatial"] .slide-header{border-bottom:0;padding-bottom:4px}
.slide[data-chrome="keynote-spatial"] .slide-header .kicker{display:inline-block;background:var(--accent-soft);padding:4px 14px;border-radius:99px;letter-spacing:.1em}
.slide[data-chrome="keynote-spatial"] .surface-card,.slide[data-chrome="keynote-spatial"] .bullets-list,.slide[data-chrome="keynote-spatial"] .statement-card,.slide[data-chrome="keynote-spatial"] .quote-card{border:0;border-radius:20px;box-shadow:none}
.slide[data-chrome="keynote-spatial"] .slide-takeaway{background:transparent;border:0;justify-content:center;text-align:center;color:var(--ink-secondary);font-weight:500}
.slide[data-chrome="editorial-folio"] .editorial-folio-bar{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--hairline);padding-bottom:8px;margin-bottom:-8px;font-size:12px;color:var(--muted)}
.slide[data-chrome="editorial-folio"] .editorial-folio-bar .kicker{margin-bottom:0}
.slide[data-chrome="editorial-folio"] .slide-header{border-bottom-width:1px}
.slide[data-chrome="editorial-folio"] .surface-card,.slide[data-chrome="editorial-folio"] .bullets-list,.slide[data-chrome="editorial-folio"] .statement-card,.slide[data-chrome="editorial-folio"] .quote-card{border-radius:0}
.slide[data-chrome="editorial-folio"] .slide-takeaway{background:transparent;border:0;border-top:1px solid var(--hairline);border-radius:0;padding:10px 0 2px}
.slide[data-chrome="saas-bento"] .surface-card{border-radius:13px}
.slide[data-chrome="saas-bento"] .surface-card.is-hero,.slide[data-chrome="saas-bento"] .surface-card.is-focal,.slide[data-chrome="saas-bento"] .surface-card.is-active{border-top:3px solid var(--accent)}
.slide[data-chrome="academic-minimal"]:not(.slide--cover):not(.slide--closing):not(.slide--section){padding-top:clamp(108px,13vw,148px);padding-bottom:clamp(46px,5.5vw,66px)}
.slide[data-chrome="academic-minimal"] .beamer-header-band{position:absolute;top:0;left:0;right:0;background:var(--surface1);border-bottom:2.5px solid var(--accent);padding:clamp(14px,1.8vw,22px) clamp(36px,5.4vw,88px)}
.slide[data-chrome="academic-minimal"] .beamer-status-bar{position:absolute;bottom:0;left:0;right:0;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;background:var(--surface1);border-top:1px solid var(--hairline);padding:8px clamp(36px,5.4vw,88px);font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}
.slide[data-chrome="academic-minimal"] .beamer-zone-mid{text-align:center;font-weight:600;color:var(--ink-secondary)}
.slide[data-chrome="academic-minimal"] .beamer-zone-right{text-align:right;color:var(--accent-text);font-weight:700}
.slide[data-chrome="academic-minimal"] .slide-takeaway{background:transparent;border:0;border-top:1px solid var(--accent);border-bottom:1px solid var(--hairline);border-radius:0;padding:8px 0}
.slide[data-chrome="gov-ceremonial"] .gov-header{border-bottom:2px solid var(--accent);box-shadow:0 4px 0 0 var(--bg),0 5.5px 0 0 var(--accent2);padding-bottom:12px;margin-bottom:4px}
.slide[data-chrome="gov-ceremonial"] .gov-ribbon{letter-spacing:.08em}
/* Phase 4 MathML & 4 Pinnacle Consulting Layouts CSS */
math.deck-math{font-family:"Cambria Math","Latin Modern Math",Georgia,serif}
math.deck-math.is-block{display:block;font-size:clamp(20px,2.2vw,32px);margin:4px auto;overflow-x:auto}
math.deck-math.is-inline{font-size:1.06em;vertical-align:middle}
.callout-hero.is-omath{padding:22px 30px;display:flex;align-items:center;justify-content:center}
.formula-caption{text-align:center;color:var(--ink-secondary);font-size:clamp(14px,1.35vw,18px);margin-top:-6px}
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
@media (max-width:900px){
  .cols-3,.cols-4,.cols-5,.cols-6,.bento-grid.bento-3,.bento-grid.bento-4,.bento-grid.bento-5,.bento-grid.bento-6,.tam-board,.arch-board.has-sidecar,.org-children,.flywheel-stage,.mekko-board,.porter-board,.swot-cross{grid-template-columns:1fr}
  .bento-grid.bento-3 > :first-child,.bento-grid.bento-4 > *{grid-row:auto;grid-column:auto}
  .issue-action-row,.gantt-head,.gantt-row,.arch-tier,.porter-support-zone{grid-template-columns:1fr}
  .flywheel-hub,.swot-anchor{position:static;transform:none;margin:0 auto}
}
`

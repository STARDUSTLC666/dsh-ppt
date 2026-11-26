/**
 * deck-chrome.mjs —— dsh-ppt 的 16:9 几何与富文本基元、OOXML 基础图元/附着连接线构建器，
 * 以及 6 套差异化母版骨架（Chrome Skeletons：consulting-classic / keynote-spatial /
 * editorial-folio / academic-minimal / gov-ceremonial / saas-bento）的 OOXML 与 HTML 同构渲染器。
 *
 * 零外部运行时依赖，仅使用 Node 内置模块。
 */

import { pptxFontName, pptxEastAsianFont, resolveChromeStyle } from './deck-themes.mjs'
import {
  containsLatexMath,
  maskMathSpans,
  unmaskMathSpans,
  splitMathSegments,
  parseLatexMath,
  latexToMathMl,
  astToOmml,
  astToOoxmlInlineRuns,
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

function hex6(color) {
  return String(color ?? '#000000').replace(/^#/, '').slice(0, 6).toUpperCase()
}

export function hexToRgbaSafeHex(fgHex, bgHex, alpha) {
  const f = parseInt(hex6(fgHex), 16)
  const b = parseInt(hex6(bgHex), 16)
  const mix = (fc, bc) => Math.round(fc * alpha + bc * (1 - alpha)).toString(16).padStart(2, '0')
  return '#' + mix((f >> 16) & 255, (b >> 16) & 255) + mix((f >> 8) & 255, (b >> 8) & 255) + mix(f & 255, b & 255)
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

const HTML_TAG_STRIP_RE = /<!--[\s\S]*?-->|<\/?(?:a|abbr|address|article|aside|b|bdi|bdo|blockquote|br|button|canvas|caption|cite|code|col|colgroup|data|dd|del|details|dfn|div|dl|dt|em|embed|fieldset|figcaption|figure|footer|form|h[1-6]|head|header|hr|html|i|iframe|img|input|ins|kbd|label|legend|li|link|main|map|mark|math|menu|meta|meter|nav|noscript|object|ol|optgroup|option|output|p|param|picture|pre|progress|q|rp|rt|ruby|s|samp|script|section|select|small|source|span|strong|style|sub|summary|sup|svg|table|tbody|td|template|textarea|tfoot|th|thead|time|title|tr|track|u|ul|var|video|wbr)(?=\s|\/?>)[^>]*>/gi

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
    .replace(HTML_TAG_STRIP_RE, '')
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
    .replace(HTML_TAG_STRIP_RE, '')
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

  const out = []
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
      out.push(...mathRuns)
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
  const hasCjk = paragraphs.some((p) => /[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/.test(p))

  const evalAt = (pt) => {
    const lines = emWidths.reduce((sum, em) => sum + Math.max(1, Math.ceil((em * pt) / innerWPt)), 0)
    // PowerPoint / WPS 对微软雅黑等 CJK 字体的 spcPct 行框实测比西文高 ~7%，多行场景预留安全系数防底边溢出
    const cjkVertSafety = hasCjk && lines >= 3 ? 1.07 : 1.0
    const totalHPt = lines * pt * cfg.lineHeight * cjkVertSafety + Math.max(0, paragraphs.length - 1) * cfg.spaceAfterPt
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

export const VALID_STATUS = new Set(['positive', 'negative', 'warning', 'neutral', 'accent'])

function parseBulletToItem(rawBullet, index, layout) {
  const clean = cleanRichText(rawBullet)
  const plain = stripInlineMarkdown(clean)

  if (layout === 'kpi') {
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
    const metricMatch = /^((?:[¥$€]\s*)?[+-]?\d[\d,.]*\s*(?:[%％倍xX]|万|亿|元|万元|亿元|美元|万美元|亿美元|家|个|人|次|台|套|条|项|席|年|月|周|秒|ms|s|h|天|小时|分钟|k|M|B|\+)?)\s*[:：\-—]?\s*(.*)$/i.exec(plain)
    if (metricMatch) {
      const rest = metricMatch[2] || ''
      const colon = rest.search(/[：:]/)
      return {
        value: metricMatch[1].trim(),
        title: colon > 0 ? rest.slice(0, colon).trim() : (rest.trim() || ('指标 ' + (index + 1))),
        ...(colon > 0 ? { text: rest.slice(colon + 1).trim() } : {}),
      }
    }
    const inlineMetric = /((?:[¥$€]\s*[+-]?\d[\d,.]*(?:\s*(?:[%％倍xX]|万|亿|元|万元|亿元|美元|万美元|亿美元|家|个|人|次|台|套|条|项|席|年|月|周|秒|ms|天|小时|分钟|k|M|B|\+))?|[+-]?\d[\d,.]*\s*(?:[%％倍xX]|万|亿|元|万元|亿元|美元|万美元|亿美元|家|个|人|次|台|套|条|项|席|年|月|周|秒|ms|天|小时|分钟|\+)))/.exec(plain)
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

  if (layout === 'callout') {
    return {
      tag: String(index + 1).padStart(2, '0'),
      title: '',
      text: clean,
    }
  }

  return {
    tag: String(index + 1).padStart(2, '0'),
    title: plain.length <= 20 ? plain : plain.slice(0, 16) + '…',
    ...(plain.length > 20 ? { text: clean } : {}),
  }
}

const EXTENDED_ITEM_LAYOUTS = new Set(['sankey', 'value-chain', 'marimekko', 'swot', 'quadrant', 'radar', 'dumbbell', 'heatmap'])

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
      const icon = stripInlineMarkdown(entry.icon ?? '')
      const avatar = stripInlineMarkdown(entry.avatar ?? '')
      const xNum = entry.x !== undefined && entry.x !== null && entry.x !== '' ? Number(entry.x) : NaN
      const x = Number.isFinite(xNum) ? xNum : undefined
      const yNum = entry.y !== undefined && entry.y !== null && entry.y !== '' ? Number(entry.y) : NaN
      const y = Number.isFinite(yNum) ? yNum : undefined
      const sizeNum = entry.size !== undefined && entry.size !== null && entry.size !== '' ? Number(entry.size) : NaN
      const size = Number.isFinite(sizeNum) ? Math.max(1, sizeNum) : undefined
      const beforeNum = entry.before !== undefined && entry.before !== null && entry.before !== '' ? Number(entry.before) : NaN
      const before = Number.isFinite(beforeNum) ? beforeNum : undefined
      const afterNum = entry.after !== undefined && entry.after !== null && entry.after !== '' ? Number(entry.after) : NaN
      const after = Number.isFinite(afterNum) ? afterNum : undefined
      const actualNum = entry.actual !== undefined && entry.actual !== null && entry.actual !== '' ? Number(entry.actual) : NaN
      const actual = Number.isFinite(actualNum) ? actualNum : undefined
      const targetNum = entry.target !== undefined && entry.target !== null && entry.target !== '' ? Number(entry.target) : NaN
      const target = Number.isFinite(targetNum) ? targetNum : undefined
      const maxNum = entry.max !== undefined && entry.max !== null && entry.max !== '' ? Number(entry.max) : NaN
      const max = Number.isFinite(maxNum) ? maxNum : undefined
      const bullets = Array.isArray(entry.bullets ?? entry.items)
        ? (entry.bullets ?? entry.items).map((b) => cleanRichText(String(b))).filter(Boolean).slice(0, 8)
        : undefined
      if (!title && !text && !value && x === undefined && before === undefined && actual === undefined && (!bullets || bullets.length === 0)) return null
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
        ...(icon ? { icon } : {}),
        ...(avatar ? { avatar } : {}),
        ...(x !== undefined ? { x } : {}),
        ...(y !== undefined ? { y } : {}),
        ...(size !== undefined ? { size } : {}),
        ...(before !== undefined ? { before } : {}),
        ...(after !== undefined ? { after } : {}),
        ...(actual !== undefined ? { actual } : {}),
        ...(target !== undefined ? { target } : {}),
        ...(max !== undefined ? { max } : {}),
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

export function statusPalette(status, tk) {
  if (status === 'positive') return { fg: tk.positive, bg: tk.surface2, bar: tk.positive }
  if (status === 'negative') return { fg: tk.negative, bg: tk.surface2, bar: tk.negative }
  if (status === 'warning') return { fg: tk.warning, bg: tk.surface2, bar: tk.warning }
  if (status === 'accent') return { fg: tk.accentText, bg: tk.accentSoft, bar: tk.accentPrimary }
  return { fg: tk.accentText, bg: tk.surface1, bar: tk.accentPrimary }
}

export function isNumericCell(cell) {
  const plain = stripInlineMarkdown(cell)
  return /^\s*[+-]?[$¥€£]?\s*(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*(?:[%％xX倍]|万|亿|元|万元|亿元|次|页|个|人|年|月|周|天|小时|分钟|ms|s)?\s*$/.test(plain)
}

// ---------------------------------------------------------------------------
// OOXML 基础图元与附着连接线构建器（严格遵循 ECMA-376 元素顺序与单页唯一 ID）
// ---------------------------------------------------------------------------

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

export function ooxmlRadialGradientFill(stops, pathType = 'circle', fillToRect = { l: 50000, t: 50000, r: 50000, b: 50000 }) {
  const gsLst = stops.map((s) => {
    const pos = Math.round(Math.max(0, Math.min(1, s.offset)) * 100000)
    const alpha = s.alpha !== undefined && s.alpha < 0.999
      ? '<a:alpha val="' + Math.round(Math.max(0, Math.min(1, s.alpha)) * 100000) + '"/>'
      : ''
    return '<a:gs pos="' + pos + '"><a:srgbClr val="' + hex6(s.color) + '">' + alpha + '</a:srgbClr></a:gs>'
  }).join('')
  const f = fillToRect || { l: 50000, t: 50000, r: 50000, b: 50000 }
  return (
    '<a:gradFill rotWithShape="1"><a:gsLst>' + gsLst + '</a:gsLst>' +
    '<a:path path="' + escapeXml(pathType) + '"><a:fillToRect l="' + Math.round(f.l) + '" t="' + Math.round(f.t) + '" r="' + Math.round(f.r) + '" b="' + Math.round(f.b) + '"/></a:path></a:gradFill>'
  )
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
    radialGradientStops = null,
    radialFillToRect = null,
    stroke = '',
    strokeAlpha = 1,
    strokePt = 0.75,
    dash = '',
    shadow = false,
    txBox = false,
    anchor = 't',
    marginsIn = { l: 0.08, r: 0.08, t: 0.05, b: 0.05 },
    fontScale = 100000,
    autofit = true,
    rot = 0,
    vert = '',
    paragraphs = [],
  } = options

  const b = boxToEmu(boxIn)
  const avLst = adjs && typeof adjs === 'object'
    ? '<a:avLst>' + Object.entries(adjs).map(([k, v]) => '<a:gd name="' + escapeXml(k) + '" fmla="val ' + Math.round(v) + '"/>').join('') + '</a:avLst>'
    : adj !== undefined && preset === 'roundRect'
      ? '<a:avLst><a:gd name="adj" fmla="val ' + Math.round(adj) + '"/></a:avLst>'
      : '<a:avLst/>'
  const fillXml = radialGradientStops
    ? ooxmlRadialGradientFill(radialGradientStops, 'circle', radialFillToRect)
    : gradientStops
      ? ooxmlLinearGradientFill(gradientStops, gradientAngle)
      : fill
        ? ooxmlSolidFill(fill, fillAlpha)
        : '<a:noFill/>'
  const lnXml = stroke
    ? '<a:ln w="' + ptToEmu(strokePt) + '" cap="flat">' + ooxmlSolidFill(stroke, strokeAlpha) + (dash ? '<a:prstDash val="' + dash + '"/>' : '') + '</a:ln>'
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
    '<p:spPr><a:xfrm' + (rot ? ' rot="' + Math.round(rot) + '"' : '') + '><a:off x="' + b.x + '" y="' + b.y + '"/><a:ext cx="' + b.w + '" cy="' + b.h + '"/></a:xfrm>' +
    '<a:prstGeom prst="' + preset + '">' + avLst + '</a:prstGeom>' +
    fillXml + lnXml + effectXml + '</p:spPr>' +
    '<p:txBody><a:bodyPr wrap="' + (vert ? 'none' : 'square') + '" rtlCol="0"' + (vert ? ' vert="' + escapeXml(vert) + '"' : '') + ' lIns="' + lIns + '" tIns="' + tIns + '" rIns="' + rIns + '" bIns="' + bIns + '" anchor="' + anchor + '">' +
    fitXml + '</a:bodyPr><a:lstStyle/>' + bodyContent + '</p:txBody>' +
    '</p:sp>'
  )
}

export function ooxmlCustGeomShape(id, name, boxIn, pathCommandsXml, options = {}) {
  const {
    pathW = 10000,
    pathH = 10000,
    fill = '',
    fillAlpha = 1,
    gradientStops = null,
    gradientAngle = 0,
    stroke = '',
    strokeAlpha = 1,
    strokePt = 0.75,
  } = options
  const b = boxToEmu(boxIn)
  const fillXml = gradientStops
    ? ooxmlLinearGradientFill(gradientStops, gradientAngle)
    : fill
      ? ooxmlSolidFill(fill, fillAlpha)
      : '<a:noFill/>'
  const lnXml = stroke
    ? '<a:ln w="' + ptToEmu(strokePt) + '" cap="flat">' + ooxmlSolidFill(stroke, strokeAlpha) + '</a:ln>'
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

export function renderMathCardPptx(namePrefix, boxIn, latex, nextIdFn, chromeCfg, theme, options = {}) {
  const tk = theme.tokens
  const cardPreset = chromeCfg.cardRadiusPx > 0 ? 'roundRect' : 'rect'
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

/**
 * 原生可附着连接线构建器（支持 straightConnector1 / bentConnector3 及 <a:stCxn> / <a:endCxn> 锚点绑定）。
 * 锚点编号严格对齐 OOXML 四向连接点：0=top, 1=left, 2=bottom, 3=right。
 */
export function ooxmlConnector(id, name, fromIn, toIn, options = {}) {
  const {
    preset = 'straightConnector1',
    orientation = 'horizontal',
    adj1 = 50000,
    stCxn = null,
    endCxn = null,
    color = '#64748B',
    widthPt = 1.35,
    dash = '',
    headArrow = false,
    tailArrow = true,
    headEndType = 'triangle',
    tailEndType = 'triangle',
  } = options

  const dx = toIn.x - fromIn.x
  const dy = toIn.y - fromIn.y

  let offX = 0
  let offY = 0
  let extCx = 0
  let extCy = 0
  let rotAttr = ''
  let flipHAttr = ''
  let flipVAttr = ''

  if (preset === 'bentConnector3' && orientation === 'vertical') {
    const mx = (fromIn.x + toIn.x) / 2
    const my = (fromIn.y + toIn.y) / 2
    const cwIn = Math.abs(dy)
    const chIn = Math.abs(dx)
    offX = Math.max(0, inToEmu(mx - cwIn / 2))
    offY = Math.max(0, inToEmu(my - chIn / 2))
    extCx = cwIn < 0.0005 ? 0 : Math.max(12700, inToEmu(cwIn))
    extCy = chIn < 0.0005 ? 0 : Math.max(12700, inToEmu(chIn))
    rotAttr = ' rot="5400000"'
    if (dy < -0.0005) flipHAttr = ' flipH="1"'
    if (dx >= -0.0005) flipVAttr = ' flipV="1"'
  } else {
    const x = Math.min(fromIn.x, toIn.x)
    const y = Math.min(fromIn.y, toIn.y)
    const w = Math.abs(dx)
    const h = Math.abs(dy)
    offX = Math.max(0, inToEmu(x))
    offY = Math.max(0, inToEmu(y))
    extCx = w < 0.0005 ? 0 : Math.max(12700, inToEmu(w))
    extCy = h < 0.0005 ? 0 : Math.max(12700, inToEmu(h))
    if (dx < -0.0005) flipHAttr = ' flipH="1"'
    if (dy < -0.0005) flipVAttr = ' flipV="1"'
  }

  const cxnChildren = (stCxn ? '<a:stCxn id="' + Math.trunc(stCxn.id) + '" idx="' + Math.trunc(stCxn.idx) + '"/>' : '') +
    (endCxn ? '<a:endCxn id="' + Math.trunc(endCxn.id) + '" idx="' + Math.trunc(endCxn.idx) + '"/>' : '')
  const cNvCxnXml = cxnChildren ? '<p:cNvCxnSpPr>' + cxnChildren + '</p:cNvCxnSpPr>' : '<p:cNvCxnSpPr/>'
  const avLstXml = preset === 'bentConnector3' && adj1 !== undefined && Math.round(adj1) !== 50000
    ? '<a:avLst><a:gd name="adj1" fmla="val ' + Math.max(10000, Math.min(90000, Math.round(adj1))) + '"/></a:avLst>'
    : '<a:avLst/>'
  const headXml = headArrow ? '<a:headEnd type="' + escapeXml(headEndType) + '" w="med" len="med"/>' : ''
  const tailXml = tailArrow ? '<a:tailEnd type="' + escapeXml(tailEndType) + '" w="med" len="med"/>' : ''

  return (
    '<p:cxnSp>' +
    '<p:nvCxnSpPr><p:cNvPr id="' + id + '" name="' + escapeXml(name) + '"/>' + cNvCxnXml + '<p:nvPr/></p:nvCxnSpPr>' +
    '<p:spPr><a:xfrm' + rotAttr + flipHAttr + flipVAttr + '><a:off x="' + offX + '" y="' + offY + '"/>' +
    '<a:ext cx="' + extCx + '" cy="' + extCy + '"/></a:xfrm>' +
    '<a:prstGeom prst="' + preset + '">' + avLstXml + '</a:prstGeom>' +
    '<a:ln w="' + ptToEmu(widthPt) + '" cap="rnd">' + ooxmlSolidFill(color) +
    (dash ? '<a:prstDash val="' + dash + '"/>' : '') + headXml + tailXml + '</a:ln>' +
    '</p:spPr></p:cxnSp>'
  )
}

// ---------------------------------------------------------------------------
// 6 套母版骨架（Chrome Skeletons）：配置、卡片表面、页眉、底栏结论条与页脚页码
// ---------------------------------------------------------------------------

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
      cardRadiusPx: theme?.radiusPx === 0 ? 0 : Math.min(6, theme?.radiusPx ?? 4),
      cardBorderless: false,
      cardStrokePt: 0.6,
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

export function renderSurfaceCardPptx(name, box, opts, nextIdFn, chromeCfg, theme) {
  const tk = theme.tokens
  const {
    fill = tk.surface1,
    focal = false,
    stroke,
    accentBarColor = tk.accentPrimary,
    cardMaterial = 'solid',
    disableTopBar = false,
    paragraphs = [],
    anchor = 't',
    marginsIn = { l: 0.08, r: 0.08, t: 0.05, b: 0.05 },
    fontScale = 100000,
    txBox = false,
  } = opts
  const radius = chromeCfg.cardRadiusPx
  const preset = radius > 0 ? 'roundRect' : 'rect'

  // 材质 A：无框通透模式（McKinsey / Apple Editorial —— 零底色框，仅顶部强规则线与底部极细发丝线）
  if (cardMaterial === 'frameless') {
    const out = [
      ooxmlLine(nextIdFn(), name + ' top hairline', { x: box.x, y: box.y }, { x: box.x + box.w, y: box.y }, {
        color: focal ? accentBarColor : tk.hairline,
        widthPt: focal ? 2.0 : 0.85,
      }),
      ooxmlLine(nextIdFn(), name + ' bottom hairline', { x: box.x, y: box.y + box.h }, { x: box.x + box.w, y: box.y + box.h }, {
        color: tk.hairline,
        widthPt: 0.5,
      }),
    ]
    if (paragraphs.length > 0) {
      out.push(ooxmlShape(nextIdFn(), name, box, {
        txBox: true,
        anchor,
        marginsIn,
        fontScale,
        paragraphs,
      }))
    }
    return out.join('')
  }

  // 材质 B：出版物双发丝线模式（Monocle / FT / Nature —— 顶部双轨发丝线 + 极克制底衬）
  if (cardMaterial === 'editorial-rule') {
    const out = [
      ooxmlLine(nextIdFn(), name + ' editorial rule 1', { x: box.x, y: box.y }, { x: box.x + box.w, y: box.y }, {
        color: focal ? accentBarColor : tk.inkPrimary,
        widthPt: focal ? 1.75 : 1.0,
      }),
      ooxmlLine(nextIdFn(), name + ' editorial rule 2', { x: box.x, y: box.y + 0.045 }, { x: box.x + box.w, y: box.y + 0.045 }, {
        color: tk.hairline,
        widthPt: 0.5,
      }),
      ooxmlLine(nextIdFn(), name + ' editorial bottom', { x: box.x, y: box.y + box.h }, { x: box.x + box.w, y: box.y + box.h }, {
        color: tk.hairline,
        widthPt: 0.5,
      }),
    ]
    if (paragraphs.length > 0) {
      out.push(ooxmlShape(nextIdFn(), name, box, {
        txBox: true,
        anchor,
        marginsIn,
        fontScale,
        paragraphs,
      }))
    }
    return out.join('')
  }

  // 材质 C：发布会玻璃拟态（Apple Keynote / Linear Craft —— 半透明叠加 + 微亮边缘描边 + 顶部 1px 高光条）
  if (cardMaterial === 'glass') {
    const glassRadius = Math.max(12, radius || 14)
    const glassFill = theme.dark ? (focal ? tk.surface2 : tk.surface1) : tk.surface1
    const glassStroke = stroke !== undefined
      ? stroke
      : (focal ? accentBarColor : (theme.dark ? '#FFFFFF' : tk.hairline))
    const glassStrokeAlpha = focal ? (theme.dark ? 0.65 : 0.85) : (theme.dark ? 0.16 : 0.72)
    const out = [
      ooxmlShape(nextIdFn(), name, box, {
        preset: 'roundRect',
        adj: roundRectAdj(box.w, box.h, glassRadius),
        fill: glassFill,
        fillAlpha: theme.dark ? (focal ? 0.84 : 0.66) : 0.86,
        stroke: glassStroke,
        strokeAlpha: glassStrokeAlpha,
        strokePt: focal ? 1.0 : 0.75,
        shadow: theme.shadow,
        txBox,
        anchor,
        marginsIn,
        fontScale,
        paragraphs,
      }),
      ooxmlLine(nextIdFn(), name + ' glass specular', { x: box.x + 0.16, y: box.y + 0.012 }, { x: box.x + box.w - 0.16, y: box.y + 0.012 }, {
        color: focal ? accentBarColor : (theme.dark ? '#FFFFFF' : accentBarColor),
        widthPt: focal ? 1.25 : 0.6,
      }),
    ]
    return out.join('')
  }

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
  if (chromeCfg.cardTopBar && !disableTopBar) {
    const barInset = radius > 0 ? Math.min(0.18, Math.max(0.11, (radius / 96) * 1.25)) : 0
    out.push(ooxmlShape(nextIdFn(), name + ' top bar', { x: box.x + barInset, y: box.y + (radius > 0 ? 0.008 : 0), w: Math.max(0.2, box.w - barInset * 2), h: 0.042 }, {
      preset: radius > 0 ? 'roundRect' : 'rect',
      adj: radius > 0 ? 50000 : undefined,
      fill: focal ? accentBarColor : tk.hairline,
    }))
  }
  if (chromeCfg.cardLeftBar) {
    const railInset = radius > 0 ? Math.min(0.10, (radius / 96) * 0.9) : 0
    out.push(ooxmlShape(nextIdFn(), name + ' left stripe', { x: box.x + (railInset > 0 ? 0.02 : 0), y: box.y + railInset, w: 0.04, h: Math.max(0.2, box.h - railInset * 2) }, {
      preset: railInset > 0 ? 'roundRect' : 'rect',
      adj: railInset > 0 ? 50000 : undefined,
      fill: focal ? accentBarColor : tk.accentPrimary,
    }))
  }
  return out.join('')
}

export function formatGovKicker(kicker) {
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
      const tkInset = chromeCfg.cardRadiusPx > 0 ? 0.065 : 0
      shapes.push(ooxmlShape(nextIdFn(), 'Takeaway accent', { x: 0.62 + (tkInset > 0 ? 0.025 : 0), y: 6.26 + tkInset, w: 0.055, h: 0.54 - tkInset * 2 }, {
        preset: tkInset > 0 ? 'roundRect' : 'rect',
        adj: tkInset > 0 ? 50000 : undefined,
        fill: tk.accentPrimary,
      }))
    }
  }

  if (!isFraming) {
    const tm = manifest?.brand?.templateMaster?.enabled === true ? manifest.brand.templateMaster : null
    const tmRole = slide?.layout === 'cover' ? 'cover' : slide?.layout === 'section' ? 'section' : slide?.layout === 'closing' ? 'closing' : 'content'
    const tmRoleSpec = tm?.roles?.[tmRole] || tm?.roles?.content || null
    const tmYieldChrome = Boolean(tm && tm.yieldChrome !== false)
    const tmYieldFooter = Boolean(tm && (tm.yieldFooter || tmRoleSpec?.hasFooter))
    const tmYieldSlideNum = Boolean(tm && tm.mode === 'native-master' && tm.nativePackage?.layouts?.length && (tm.yieldSlideNumber || tmRoleSpec?.hasSlideNumber))
    const folio = String(index + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0')
    if (chromeCfg.folioPos === 'beamer-bar') {
      if (!tmYieldChrome) {
        shapes.push(ooxmlShape(nextIdFn(), 'Beamer footer band', { x: 0, y: 7.04, w: CANVAS_IN.w, h: 0.46 }, {
          preset: 'rect',
          fill: tk.surface1,
        }))
        shapes.push(ooxmlLine(nextIdFn(), 'Beamer footer rule', { x: 0, y: 7.04 }, { x: CANVAS_IN.w, y: 7.04 }, {
          color: tk.hairline,
          widthPt: 0.5,
        }))
      }
      const leftText = slide.source
        ? formatSourceLine(slide.source, langAttr)
        : (tmYieldFooter ? '' : (manifest.brand?.footer || manifest.title || ''))
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
      const centerText = !tmYieldChrome ? (slide.kicker || slide.title || '').trim() : ''
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
      if (!tmYieldSlideNum) {
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
      }
    } else {
      if (slide.source) {
        const hasBrandFooter = Boolean(manifest.brand?.footer) && !tmYieldFooter
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

      if (!tmYieldSlideNum) {
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

    const watermarkText = typeof manifest?.brand?.watermark === 'string' ? manifest.brand.watermark.trim() : ''
    if (watermarkText) {
      const hasLogo = Boolean(manifest?.brand?.logoAssetId)
      const wmW = computeBadgePillWidth(watermarkText.toUpperCase(), 8.5, 4.1, 1.3)
      const wmRight = chromeCfg.folioPos === 'top-right'
        ? (hasLogo ? 9.85 : 10.45)
        : (hasLogo ? 11.35 : 12.71)
      const wmY = chromeCfg.folioPos === 'top-right'
        ? 0.24
        : (chromeCfg.folioPos === 'beamer-bar' ? 0.14 : 0.10)
      shapes.push(ooxmlShape(nextIdFn(), 'Brand watermark', { x: +(wmRight - wmW).toFixed(3), y: wmY, w: wmW, h: 0.23 }, {
        preset: 'roundRect',
        adj: 22000,
        fill: tk.surface1,
        stroke: tk.hairline,
        strokePt: 0.5,
        anchor: 'ctr',
        marginsIn: { l: 0.06, r: 0.06, t: 0.01, b: 0.01 },
        paragraphs: [
          ooxmlRichParagraph(watermarkText.toUpperCase(), {
            sizePt: 8.5,
            color: tk.inkMuted,
            bold: true,
            lang: langAttr,
            align: 'ctr',
            font: theme.fonts.body,
            lineHeight: 1.05,
            spc: 110,
          }),
        ],
      }))
    }
  }

  return shapes.join('')
}

export function renderStandardHeaderPptx(slide, idBase, nextIdFn, theme, langAttr, chromeCfg, opts = {}) {
  const tk = theme.tokens
  const kicker = (slide.kicker ?? '').trim()
  const title = (slide.title ?? '').trim()
  const showKicker = kicker !== '' && kicker !== title
  const shapes = []
  const style = chromeCfg?.headerStyle || 'standard'
  const yieldBeamerBand = Boolean(opts?.yieldChrome)

  if (style === 'beamer-band') {
    if (!yieldBeamerBand) {
      shapes.push(ooxmlShape(nextIdFn(), 'Beamer header band', { x: 0, y: 0, w: CANVAS_IN.w, h: 1.28 }, {
        preset: 'rect',
        fill: tk.surface1,
      }))
    }
    shapes.push(ooxmlLine(nextIdFn(), 'Beamer header rule', { x: yieldBeamerBand ? 0.62 : 0, y: 1.28 }, { x: yieldBeamerBand ? 12.71 : CANVAS_IN.w, y: 1.28 }, {
      color: yieldBeamerBand ? tk.hairline : tk.accentPrimary,
      widthPt: yieldBeamerBand ? 0.75 : 1.5,
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

export function renderSlideHeaderHtml(slide, chromeStyle, folioText, isFraming, fallbackKicker = '') {
  const title = slide.title || ''
  const k = (slide.kicker || fallbackKicker || '').trim()
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

export function renderSlideChromeHtml(slide, chromeStyle, folioText, langId, manifest = {}, isFraming = false) {
  const takeawayPrefix = chromeStyle === 'consulting-classic'
    ? '<strong class="takeaway-prefix">' + (langId === 'en' ? 'Key Takeaway:' : '核心结论：') + '</strong>'
    : '<span class="takeaway-arrow" aria-hidden="true">' + (chromeStyle === 'editorial-folio' ? '—' : '▸') + '</span>'
  const takeawayHtml = !isFraming && slide.takeaway
    ? '<div class="slide-takeaway">' + takeawayPrefix + '<span class="takeaway-text">' + renderInlineHtml(slide.takeaway) + '</span></div>'
    : ''

  let footerStrip = ''
  if (!isFraming) {
    const tm = manifest?.brand?.templateMaster?.enabled === true ? manifest.brand.templateMaster : null
    const tmRole = slide?.layout === 'cover' ? 'cover' : slide?.layout === 'section' ? 'section' : slide?.layout === 'closing' ? 'closing' : 'content'
    const tmYieldFooter = Boolean(tm && (tm.yieldFooter || tm.roles?.[tmRole]?.hasFooter))
    const sourceText = slide.source ? formatSourceLine(slide.source, langId) : ''
    const brandFooterText = !tmYieldFooter && typeof manifest.brand?.footer === 'string' ? manifest.brand.footer.trim() : ''
    const brandHtml = brandFooterText ? '<span class="brand-footer">' + escapeHtml(brandFooterText) + '</span>' : ''
    if (chromeStyle === 'academic-minimal') {
      const zLeft = sourceText || brandFooterText || (tmYieldFooter ? '' : (manifest.title || ''))
      const zMid = tm?.yieldChrome !== false && tm ? '' : (slide.kicker || slide.title || '').trim()
      footerStrip =
        '<footer class="beamer-status-bar">' +
        '<span class="slide-source beamer-zone-left">' + escapeHtml(zLeft) + '</span>' +
        '<span class="beamer-zone-mid">' + escapeHtml(zMid) + '</span>' +
        '<span class="slide-folio beamer-zone-right">' + folioText + '</span>' +
        '</footer>'
    } else if (chromeStyle === 'editorial-folio') {
      const srcHtml = sourceText ? '<span class="slide-source">' + escapeHtml(sourceText) + '</span>' : ''
      footerStrip = (brandHtml || srcHtml)
        ? '<footer class="slide-footer-strip">' + brandHtml + srcHtml + '</footer>'
        : ''
    } else {
      const folioLeft = sourceText ? '<span class="slide-source">' + escapeHtml(sourceText) + '</span>' : ''
      const folioRight = '<span class="slide-folio">' + folioText + '</span>'
      footerStrip = '<footer class="slide-footer-strip">' + brandHtml + folioLeft + folioRight + '</footer>'
    }
  }

  return takeawayHtml + footerStrip
}

export function resolveDoDontPolarity(twoSides) {
  const posRe = /^(?:do\b|✓|✔|推荐|建议|应该|正确|优|正面|最佳实践)/i
  const negRe = /^(?:don['’]?t\b|✗|✘|避免|禁止|错误|不要|误区|反面|痛点|旧)/i
  const t0 = stripInlineMarkdown(twoSides[0]?.title || '').trim()
  const t1 = stripInlineMarkdown(twoSides[1]?.title || '').trim()
  return Boolean(
    twoSides[0]?.status === 'positive' ||
    twoSides[1]?.status === 'negative' ||
    (posRe.test(t0) && !posRe.test(t1)) ||
    (negRe.test(t1) && !negRe.test(t0)),
  )
}

export function renderBullet2dMathRowPptx({ prefixText, suffixText, mathLatex, ry, rowH, bIdx, tk, theme, langAttr, chromeCfg, cardPreset, nextId }) {
  const shapes = []
  const totalRowW = 11.48
  const emIn = Math.min(0.26, rowH * 0.34)
  const astPreview = parseLatexMath(mathLatex)
  const hasPrefix = prefixText !== ''
  const hasSuffix = suffixText !== ''
  const prefixW = hasPrefix
    ? (hasSuffix
        ? Math.min(3.9, Math.max(1.75, measureEmWidth(prefixText, true) * 0.21 + 0.42))
        : Math.min(4.8, Math.max(2.2, measureEmWidth(prefixText, true) * 0.23 + 0.45)))
    : 0
  const suffixEstW = hasSuffix ? Math.min(4.2, Math.max(1.85, measureEmWidth(suffixText, false) * 0.19 + 0.32)) : 0
  const maxEqW = Math.max(2.2, totalRowW - (hasPrefix ? prefixW + 0.10 : 0) - (hasSuffix ? suffixEstW + 0.10 : 0))
  const fittedEq = fitFormulaBoxIn(astPreview, { x: 0, y: ry, w: maxEqW, h: rowH }, { padXIn: 0.20, padYIn: 0.08, emIn, align: 'l' })
  const eqW = hasSuffix ? Math.min(maxEqW, Math.max(1.85, fittedEq.w + 0.44)) : Math.max(2.4, totalRowW - (hasPrefix ? prefixW + 0.10 : 0))

  let cursorX = 0.94
  if (hasPrefix) {
    shapes.push(ooxmlShape(nextId(), 'Bullet Math Label ' + (bIdx + 1), { x: cursorX, y: ry, w: prefixW, h: rowH }, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0.04, r: 0.06, t: 0.02, b: 0.02 },
      paragraphs: [ooxmlRichParagraph(prefixText, { sizePt: 14.5, color: tk.inkPrimary, secondaryColor: tk.inkSecondary, bullet: true, bulletChar: '▪', bulletColor: tk.accentPrimary, lang: langAttr, font: theme.fonts.body, autoLeadBold: true })],
    }))
    cursorX += prefixW + 0.10
  }
  const eqBox = { x: cursorX, y: ry, w: eqW, h: rowH }
  if (theme.dark) {
    const plateW = Math.min(eqBox.w, Math.max(1.75, fittedEq.w + 0.40))
    shapes.push(ooxmlShape(nextId(), 'Bullet Math Plate ' + (bIdx + 1), { x: eqBox.x, y: ry + 0.04, w: plateW, h: rowH - 0.08 }, {
      preset: cardPreset,
      adj: roundRectAdj(plateW, rowH - 0.08, Math.min(8, chromeCfg.cardRadiusPx)),
      fill: '#F8FAFC',
      stroke: tk.accentPrimary,
      strokePt: 0.75,
    }))
  }
  shapes.push(ooxmlMathShape(nextId(), 'Bullet Equation ' + (bIdx + 1), eqBox, mathLatex, { emIn, sizePt: 18, align: 'l' }))
  if (hasSuffix) {
    const sufX = eqBox.x + eqBox.w + 0.10
    shapes.push(ooxmlShape(nextId(), 'Bullet Math Suffix ' + (bIdx + 1), { x: sufX, y: ry, w: Math.max(1.6, 12.42 - sufX), h: rowH }, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0.04, r: 0.04, t: 0.02, b: 0.02 },
      paragraphs: [ooxmlRichParagraph(suffixText, { sizePt: 14.5, color: tk.inkPrimary, secondaryColor: tk.inkSecondary, bullet: !hasPrefix, bulletChar: '▪', bulletColor: tk.accentPrimary, lang: langAttr, font: theme.fonts.body })],
    }))
  }
  return shapes
}

export const CHROME_CSS = `
.slide-takeaway{
  margin-top:auto;background:var(--accent-soft);border:1px solid var(--hairline);border-left:4px solid var(--accent);
  border-radius:calc(var(--radius) * .85);padding:10px 18px;display:flex;align-items:center;gap:10px;
  font-size:clamp(13px,1.25vw,17px);font-weight:600;color:var(--fg);
}
.takeaway-arrow,.takeaway-prefix{color:var(--accent-text)}
.slide-footer-strip{display:flex;justify-content:space-between;align-items:center;gap:16px;font-size:12px;color:var(--muted);padding-top:4px;font-variant-numeric:tabular-nums;min-width:0}
.slide-footer-strip .brand-footer{position:static;left:auto;bottom:auto;max-width:44%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:1;font-size:inherit;color:inherit}
.slide-footer-strip .slide-source{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.slide-footer-strip .brand-footer + .slide-source{margin-left:auto;text-align:right}
.slide-folio{margin-left:auto;white-space:nowrap;flex-shrink:0}
.slide-footer-strip .brand-footer + .slide-source + .slide-folio{margin-left:16px}
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
.slide[data-chrome="academic-minimal"]:not(.slide--cover):not(.slide--closing):not(.slide--section):not(.slide--image):not(.slide--image-left):not(.slide--image-right):not(.slide--chart):not(.slide--chart-split){padding-top:clamp(108px,13vw,148px);padding-bottom:clamp(46px,5.5vw,66px)}
.slide[data-chrome="academic-minimal"] .beamer-header-band{position:absolute;top:0;left:0;right:0;background:var(--surface1);border-bottom:2.5px solid var(--accent);padding:clamp(14px,1.8vw,22px) clamp(36px,5.4vw,88px)}
.slide[data-chrome="academic-minimal"] .beamer-status-bar{position:absolute;bottom:0;left:0;right:0;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;background:var(--surface1);border-top:1px solid var(--hairline);padding:8px clamp(36px,5.4vw,88px);font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}
.slide[data-chrome="academic-minimal"] .beamer-zone-mid{text-align:center;font-weight:600;color:var(--ink-secondary)}
.slide[data-chrome="academic-minimal"] .beamer-zone-right{text-align:right;color:var(--accent-text);font-weight:700}
.slide[data-chrome="academic-minimal"] .slide-takeaway{background:transparent;border:0;border-top:1px solid var(--accent);border-bottom:1px solid var(--hairline);border-radius:0;padding:8px 0}
.slide[data-chrome="gov-ceremonial"] .gov-header{border-bottom:2px solid var(--accent);box-shadow:0 4px 0 0 var(--bg),0 5.5px 0 0 var(--accent2);padding-bottom:12px;margin-bottom:4px}
.slide[data-chrome="gov-ceremonial"] .gov-ribbon{letter-spacing:.08em}
.brand-watermark{position:absolute;top:1.35%;right:4.65%;z-index:4;padding:2px 9px;border-radius:4px;border:1px solid var(--hairline);background:var(--surface1);color:var(--muted);font-size:clamp(9px,.82vw,11px);font-weight:700;letter-spacing:.11em;text-transform:uppercase;line-height:1.25;pointer-events:none;white-space:nowrap;opacity:.88}
.slide.has-brand-logo .brand-watermark{right:14.2%}
.slide[data-chrome="editorial-folio"] .brand-watermark{top:3.1%;right:14.8%}
.slide[data-chrome="editorial-folio"].has-brand-logo .brand-watermark{right:21.5%}
.matrix-stage{display:grid;grid-template-columns:1fr;gap:10px;width:100%;align-items:center}
.matrix-stage.has-y-axis{grid-template-columns:28px 1fr}
.matrix-core{display:flex;flex-direction:column;gap:8px;min-width:0}
.matrix-grid{position:relative;gap:22px}
.matrix-cross-h{position:absolute;left:-4px;right:-4px;top:50%;height:2px;background:var(--accent);opacity:.55;transform:translateY(-50%);pointer-events:none;z-index:2}
.matrix-cross-h::after{content:"";position:absolute;right:-2px;top:50%;transform:translateY(-50%);border-left:8px solid var(--accent);border-top:5px solid transparent;border-bottom:5px solid transparent}
.matrix-cross-v{position:absolute;top:-4px;bottom:-4px;left:50%;width:2px;background:var(--accent);opacity:.55;transform:translateX(-50%);pointer-events:none;z-index:2}
.matrix-cross-v::before{content:"";position:absolute;top:-2px;left:50%;transform:translateX(-50%);border-bottom:8px solid var(--accent);border-left:5px solid transparent;border-right:5px solid transparent}
.matrix-axis-label{font-size:12px;font-weight:700;color:var(--ink-secondary);letter-spacing:.04em;text-align:center}
.matrix-axis-label.is-y{writing-mode:vertical-rl;transform:rotate(180deg);white-space:nowrap;align-self:center}
.slide[data-table-style="banded"] .deck-table th{background:var(--accent);color:var(--ink-on-accent,#FFF);border-top:0;border-bottom:0}
.slide[data-table-style="banded"] .deck-table tbody tr:nth-child(odd) td{background:var(--surface1)}
.slide[data-table-style="banded"] .deck-table tbody tr:nth-child(even) td{background:var(--surface2)}
`
